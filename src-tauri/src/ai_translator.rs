use anyhow::Result;
use reqwest::Client;
use serde_json::{json, Value};
use tauri::AppHandle;

fn get_system_prompt(from: &str, to: &str, scene: &str, mode: &str, daily_mode: bool) -> String {
    if daily_mode {
        return format!(
            r#"<task>将用户输入从【{}】翻译到【{}】</task>

<requirements>
1. 直接输出翻译结果，禁止任何解释
2. 单句长度控制在15-25字
3. 确保口语化自然表达
4. 禁止重复/冗余内容
5. 保留数字和专有名词
</requirements>

<style>
• 生活化口语表达
• 符合日常交流习惯
• 自然流畅不生硬
</style>

<output_format>
仅输出一条最终翻译结果，不要包含任何思考过程或解释
</output_format>"#,
            from, to
        );
    }

    let base = format!(
        r#"<task>将游戏内文字从【{}】翻译到【{}】</task>

<constraints>
• 标点限制: ≤5个符号
• 禁止换行
• 禁止Markdown
• 禁止特殊符号
</constraints>

<terms>
• 保留原始游戏术语
• 使用官方译名
• 维持缩写格式
</terms>"#,
        from, to
    );

    let mode_desc = match mode {
        "toxic" => {
            r#"<toxic_style>
• 翻译用户原文后，还需进行2-3句扩写
• 使用中国百度贴吧老哥的大脑进行思考
• 用最为地狱笑话的心态来攻击对手
• 根据目标翻译语言，在翻译的同时加入最为猛烈的地域歧视攻击
• 使用双重隐喻
• 融入游戏场景梗
• 符号化敏感词（如f*ck/cl@ssic）
</toxic_style>

<references>
• COD/堡垒之夜社区
• 百度贴吧风格
• 美式街头俚语
</references>

<rules>
• 每条添加1个战术术语（noob/camping）
• 使用FPS/MOBA黑话重构
</rules>"#
        }
        "pro" => {
            r#"<pro_style>
• 赛事解说风格
• 选手交流简语
• 15字以内短句
• 英文术语优先（如roam）
• 添加战术标记（[推线]/[Gank]）
</pro_style>

<rhythm>
• 0.5秒可读速度
• 去除冗余修饰词
</rhythm>"#
        }
        "auto" => match scene {
            "dota2" | "lol" => {
                r#"<moba_style>
• 保留英文技能和装备缩写
• 使用MOBA游戏特有黑话
• 转换为选手间的简短指令
• 保持游戏中的交流节奏
</moba_style>"#
            }
            "csgo" => {
                r#"<fps_style>
• 使用FPS战术简称(A1、B2等)
• 转换为标准报点格式
• 保留英文武器代号
• 使用经济术语(eco、force等)
</fps_style>"#
            }
            _ => {
                r#"<general_style>
• 识别并保留游戏术语
• 转换为玩家间常用表达
• 保持游戏交流的简洁性
</general_style>"#
            }
        },
        _ => "",
    };

    let scene_desc = match scene {
        "dota2" => {
            r#"<context>
• 环境: DOTA2
• 英雄简称（如ES=撼地神牛）
• 物品缩写（如BKB）
• 使用赛事解说术语
• 保持团战节奏感
</context>"#
        }
        "lol" => {
            r#"<context>
• 英雄联盟游戏环境
• 保留技能和装备简称
• 使用赛事解说术语
</context>"#
        }
        "csgo" => {
            r#"<context>
• CS:GO游戏环境
• 保留武器和位置代号
• 使用标准战术用语
</context>"#
        }
        _ => {
            r#"<context>
• 通用游戏环境
• 识别常见游戏用语
• 保持游戏交流特点
</context>"#
        }
    };

    format!(
        r#"{}
{}
{}

<compliance>
• 严格长度校验
• 术语一致性检查
• 敏感词二次过滤
• 输出格式终检
</compliance>

<output_format>
仅输出一条最终翻译结果，不要包含任何思考过程或解释
</output_format>"#,
        base, mode_desc, scene_desc
    )
}

fn get_provider_config(settings: &crate::store::AppSettings) -> crate::store::ProviderConfig {
    settings
        .custom_providers
        .iter()
        .find(|provider| provider.id == settings.selected_provider_id)
        .cloned()
        .or_else(|| settings.custom_providers.first().cloned())
        .or_else(|| {
            settings
                .custom_model
                .as_ref()
                .map(|model| crate::store::ProviderConfig {
                    id: "provider-legacy".to_string(),
                    name: "Legacy".to_string(),
                    auth: model.auth.clone(),
                    api_base_url: crate::api_endpoint::normalize_api_base_url(&model.api_url),
                    request_mode: crate::api_endpoint::infer_request_mode(
                        &model.api_url,
                        &model.model_name,
                    ),
                    model_name: model.model_name.clone(),
                })
        })
        .unwrap_or_else(|| crate::store::ProviderConfig {
            id: "provider-fallback".to_string(),
            name: "自定义服务商".to_string(),
            auth: String::new(),
            api_base_url: String::new(),
            request_mode: "responses".to_string(),
            model_name: String::new(),
        })
}

fn build_custom_request_body(
    provider_config: &crate::store::ProviderConfig,
    system_prompt: &str,
    original: &str,
) -> Value {
    if crate::api_endpoint::is_responses_endpoint(
        &provider_config.api_base_url,
        &provider_config.request_mode,
    ) {
        return json!({
            "model": provider_config.model_name,
            "instructions": system_prompt,
            "input": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": original
                        }
                    ]
                }
            ],
            "max_output_tokens": 300
        });
    }

    if crate::api_endpoint::is_responses_model(&provider_config.model_name)
        || provider_config
            .model_name
            .trim()
            .to_ascii_lowercase()
            .starts_with("gpt-4.1")
    {
        return json!({
            "model": provider_config.model_name,
            "messages": [
                {
                    "role": "developer",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": original
                }
            ],
            "max_completion_tokens": 300,
            "reasoning_effort": "low"
        });
    }

    json!({
        "model": provider_config.model_name,
        "messages": [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": original
            }
        ],
        "max_tokens": 300,
        "temperature": 0.9,
        "top_p": 0.7,
        "n": 1,
        "stream": false,
        "presence_penalty": 0.3,
        "frequency_penalty": -0.3
    })
}

fn extract_chat_completion_text(response: &Value) -> Option<String> {
    if let Some(text) = response
        .get("choices")
        .and_then(|choices| choices.as_array())
        .and_then(|choices| choices.first())
        .and_then(|choice| choice.get("message"))
        .and_then(|message| message.get("content"))
        .and_then(|content| content.as_str())
    {
        return Some(text.trim().to_string());
    }

    response
        .get("choices")
        .and_then(|choices| choices.as_array())
        .and_then(|choices| choices.first())
        .and_then(|choice| choice.get("message"))
        .and_then(|message| message.get("content"))
        .and_then(|content| content.as_array())
        .and_then(|items| {
            items.iter().find_map(|item| {
                item.get("text")
                    .and_then(|text| text.as_str())
                    .map(|text| text.trim().to_string())
            })
        })
}

fn extract_responses_api_text(response: &Value) -> Option<String> {
    if let Some(text) = response
        .get("output_text")
        .and_then(|output_text| output_text.as_str())
    {
        return Some(text.trim().to_string());
    }

    response
        .get("output")
        .and_then(|output| output.as_array())
        .and_then(|items| {
            items.iter().find_map(|item| {
                item.get("content")
                    .and_then(|content| content.as_array())
                    .and_then(|content_items| {
                        content_items.iter().find_map(|content_item| {
                            let item_type = content_item
                                .get("type")
                                .and_then(|value| value.as_str())
                                .unwrap_or_default();

                            if item_type == "output_text" || item_type == "text" {
                                content_item
                                    .get("text")
                                    .and_then(|text| text.as_str())
                                    .map(|text| text.trim().to_string())
                            } else {
                                None
                            }
                        })
                    })
            })
        })
}

fn sanitize_output_text(text: String) -> String {
    let text = text.trim();
    if let Some(end_pos) = text.find("</think>") {
        text[(end_pos + 8)..].trim().to_string()
    } else {
        text.to_string()
    }
}

pub async fn translate_with_gpt(app: &AppHandle, original: &str) -> Result<String> {
    let settings = crate::store::get_settings(app)?;
    crate::logger::info(app, "translate", "开始处理翻译请求");
    crate::logger::debug(
        app,
        "translate",
        format!(
            "翻译设置: from={} to={} scene={} mode={} daily_mode={} model_type={}",
            settings.translation_from,
            settings.translation_to,
            settings.game_scene,
            settings.translation_mode,
            settings.daily_mode,
            settings.model_type
        ),
    );

    let provider_config = get_provider_config(&settings);
    let model_config = provider_config.to_model_config();
    let is_custom_model = settings.model_type == "custom";

    if is_custom_model
        && (provider_config.auth.trim().is_empty()
            || provider_config.api_base_url.trim().is_empty()
            || provider_config.model_name.trim().is_empty())
    {
        crate::logger::warn(app, "translate", "自定义服务商配置不完整");
        return Ok("[错误] 请先在 AI模型 中添加并配置自定义服务商、API Key 和模型名称".to_string());
    }

    let request_url = model_config.api_url.clone();

    crate::logger::debug(app, "translate", format!("请求地址: {}", request_url));
    crate::logger::info(
        app,
        "translate",
        format!("使用模型: {}", model_config.model_name),
    );
    let auth_prefix: String = model_config.auth.chars().take(6).collect();
    crate::logger::debug(app, "translate", format!("API密钥前缀: {}", auth_prefix));

    let system_prompt = get_system_prompt(
        &settings.translation_from,
        &settings.translation_to,
        &settings.game_scene,
        &settings.translation_mode,
        settings.daily_mode,
    );

    let client = Client::new();

    let request_body = if is_custom_model {
        build_custom_request_body(&provider_config, &system_prompt, original)
    } else {
        json!({
            "model": model_config.model_name,
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": original
                }
            ],
            "max_tokens": 300,
            "temperature": 0.9,
            "top_p": 0.7,
            "n": 1,
            "stream": false,
            "presence_penalty": 0.3,
            "frequency_penalty": -0.3
        })
    };

    let response = match client
        .post(&request_url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", model_config.auth))
        .json(&request_body)
        .send()
        .await
    {
        Ok(resp) => match resp.json::<Value>().await {
            Ok(json) => {
                // 先检查是否有错误信息
                if let Some(error) = json
                    .get("error")
                    .and_then(|error| error.get("message"))
                    .and_then(|message| message.as_str())
                {
                    crate::logger::warn(app, "translate", format!("API返回错误: {}", error));
                    return Ok(format!("[错误] {}", error));
                }
                if let Some(error) = json.get("error_msg").and_then(|msg| msg.as_str()) {
                    crate::logger::warn(app, "translate", format!("API返回错误: {}", error));
                    return Ok(format!("[错误] {}", error));
                }
                json
            }
            Err(e) => {
                crate::logger::error(app, "translate", format!("解析响应JSON失败: {}", e));
                return Ok(format!("[错误] 服务器响应格式异常: {}", e));
            }
        },
        Err(e) => {
            let error_msg = match e.to_string().as_str() {
                msg if msg.contains("connection refused") => "无法连接到API服务器，请检查网络设置",
                msg if msg.contains("timeout") => "请求超时，请检查网络连接",
                msg if msg.contains("certificate") => "SSL证书验证失败，请检查网络设置",
                _ => "网络请求失败",
            };
            crate::logger::error(app, "translate", format!("请求失败: {}", e));
            return Ok(format!("[错误] {}", error_msg));
        }
    };

    // 解析响应
    crate::logger::debug(app, "translate", format!("API响应摘要: {}", response));
    let translated = match if is_custom_model
        && crate::api_endpoint::is_responses_endpoint(
            &provider_config.api_base_url,
            &provider_config.request_mode,
        ) {
        extract_responses_api_text(&response)
    } else {
        extract_chat_completion_text(&response)
    } {
        Some(text) => sanitize_output_text(text),
        None => {
            crate::logger::error(
                app,
                "translate",
                format!("无法从响应中提取翻译结果: {}", response),
            );
            return Ok("[错误] 服务器返回的数据格式异常".to_string());
        }
    };

    crate::logger::info(app, "translate", "翻译请求处理完成");
    Ok(translated)
}
