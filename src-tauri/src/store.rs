use serde_json::{json, Value};
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const STORE_FILENAME: &str = "store.json";
const LEGACY_OPENAI_CHAT_URL: &str = "https://api.openai.com/v1/chat/completions";
const OPENAI_BASE_URL: &str = "https://api.openai.com/v1";

fn default_log_directory() -> String {
    String::new()
}

fn default_log_level() -> String {
    "standard".to_string()
}

fn default_provider_id() -> String {
    "provider-default".to_string()
}

fn default_request_mode() -> String {
    "responses".to_string()
}

fn is_removed_builtin_model(model_type: &str) -> bool {
    matches!(model_type, "deepseek" | "deepseek-R1" | "stepfun")
}

// 添加模型配置结构体
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ModelConfig {
    pub auth: String,
    pub api_url: String,
    pub model_name: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProviderConfig {
    pub id: String,
    pub name: String,
    pub auth: String,
    pub api_base_url: String,
    #[serde(default = "default_request_mode")]
    pub request_mode: String,
    pub model_name: String,
}

impl ProviderConfig {
    pub fn to_model_config(&self) -> ModelConfig {
        ModelConfig {
            auth: self.auth.clone(),
            api_url: crate::api_endpoint::resolve_request_endpoint(
                &self.api_base_url,
                &self.request_mode,
            ),
            model_name: self.model_name.clone(),
        }
    }
}

// 添加常用语结构体
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Phrase {
    pub id: i32,
    pub phrase: String,
    pub hotkey: HotkeyConfig,
}

// 新增 HotkeyConfig 结构体
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct HotkeyConfig {
    pub modifiers: Vec<String>,
    pub key: String,
    pub shortcut: String,
}

impl HotkeyConfig {
    // 创建平台特定的快捷键配置
    fn new_platform_specific(key: &str) -> Self {
        #[cfg(target_os = "macos")]
        let (modifier, symbol) = ("Meta", "⌘");
        #[cfg(not(target_os = "macos"))]
        let (modifier, symbol) = ("Alt", "Alt");

        Self {
            modifiers: vec![modifier.to_string()],
            key: key.to_string(),
            shortcut: format!("{}+{}", symbol, key.replace("Key", "").replace("Digit", "")),
        }
    }
}

// 应用设置结构体
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct AppSettings {
    pub trans_hotkey: HotkeyConfig,
    pub translation_from: String,
    pub translation_to: String,
    pub game_scene: String,
    pub translation_mode: String,
    pub daily_mode: bool,
    pub model_type: String,
    #[serde(default)]
    pub custom_model: Option<ModelConfig>,
    #[serde(default = "default_custom_providers")]
    pub custom_providers: Vec<ProviderConfig>,
    #[serde(default = "default_provider_id")]
    pub selected_provider_id: String,
    #[serde(default = "default_log_directory")]
    pub log_directory: String,
    #[serde(default = "default_log_level")]
    pub log_level: String,
    pub phrases: Vec<Phrase>,
}

fn default_provider() -> ProviderConfig {
    ProviderConfig {
        id: default_provider_id(),
        name: "自定义服务商".to_string(),
        auth: String::new(),
        api_base_url: String::new(),
        request_mode: default_request_mode(),
        model_name: String::new(),
    }
}

fn default_custom_providers() -> Vec<ProviderConfig> {
    vec![default_provider()]
}

fn provider_from_model_config(
    model_config: &ModelConfig,
    fallback_name: &str,
    fallback_id: &str,
) -> ProviderConfig {
    ProviderConfig {
        id: fallback_id.to_string(),
        name: fallback_name.to_string(),
        auth: model_config.auth.clone(),
        api_base_url: crate::api_endpoint::normalize_api_base_url(&model_config.api_url),
        request_mode: crate::api_endpoint::infer_request_mode(
            &model_config.api_url,
            &model_config.model_name,
        ),
        model_name: model_config.model_name.clone(),
    }
}

// 初始化默认设置
pub fn initialize_settings(app: &AppHandle) -> Result<(), anyhow::Error> {
    let store = app.store(STORE_FILENAME)?;

    // 检查settings是否已存在
    if let Some(mut settings) = store.get("settings") {
        let should_initialize_log_directory = settings.get("log_directory").is_none();
        let should_initialize_log_level = settings.get("log_level").is_none();
        let should_initialize_custom_providers = settings
            .get("custom_providers")
            .and_then(|value| value.as_array())
            .map(|providers| providers.is_empty())
            .unwrap_or(true);
        let should_initialize_selected_provider = settings
            .get("selected_provider_id")
            .and_then(|value| value.as_str())
            .map(|value| value.trim().is_empty())
            .unwrap_or(true);
        let should_migrate_removed_builtin_model = settings
            .get("model_type")
            .and_then(|value| value.as_str())
            .map(is_removed_builtin_model)
            .unwrap_or(false);
        let should_upgrade_custom_model = settings
            .get("custom_model")
            .and_then(|custom_model| custom_model.as_object())
            .map(|custom_model| {
                custom_model
                    .get("auth")
                    .and_then(|value| value.as_str())
                    .unwrap_or_default()
                    .is_empty()
                    && custom_model
                        .get("api_url")
                        .and_then(|value| value.as_str())
                        .unwrap_or_default()
                        == LEGACY_OPENAI_CHAT_URL
                    && custom_model
                        .get("model_name")
                        .and_then(|value| value.as_str())
                        .unwrap_or_default()
                        == "gpt-3.5-turbo"
            })
            .unwrap_or(false);
        let should_expand_openai_request_url = settings
            .get("custom_model")
            .and_then(|custom_model| custom_model.as_object())
            .map(|custom_model| {
                custom_model
                    .get("api_url")
                    .and_then(|value| value.as_str())
                    .unwrap_or_default()
                    == OPENAI_BASE_URL
            })
            .unwrap_or(false);

        if should_initialize_log_directory {
            settings["log_directory"] = json!(default_log_directory());
        }

        if should_initialize_log_level {
            settings["log_level"] = json!(default_log_level());
        }

        if should_expand_openai_request_url {
            settings["custom_model"]["api_url"] =
                json!(crate::api_endpoint::resolve_request_endpoint(
                    OPENAI_BASE_URL,
                    &default_request_mode()
                ));
        }

        if should_migrate_removed_builtin_model {
            settings["model_type"] = json!("custom");
        }

        if should_upgrade_custom_model {
            settings["custom_model"] = json!({
                "auth": "",
                "api_url": crate::api_endpoint::resolve_request_endpoint(
                    OPENAI_BASE_URL,
                    &default_request_mode()
                ),
                "model_name": ""
            });
        }

        if should_initialize_custom_providers {
            let provider = settings
                .get("custom_model")
                .and_then(|value| serde_json::from_value::<ModelConfig>(value.clone()).ok())
                .map(|model| provider_from_model_config(&model, "自定义服务商", &default_provider_id()))
                .unwrap_or_else(default_provider);

            settings["custom_providers"] = json!([provider]);
        }

        let selected_provider_id = settings
            .get("selected_provider_id")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string();
        let provider_exists = settings
            .get("custom_providers")
            .and_then(|value| value.as_array())
            .map(|providers| {
                providers.iter().any(|provider| {
                    provider
                        .get("id")
                        .and_then(|value| value.as_str())
                        .unwrap_or_default()
                        == selected_provider_id
                })
            })
            .unwrap_or(false);

        if should_initialize_selected_provider || !provider_exists {
            let fallback_provider_id = settings
                .get("custom_providers")
                .and_then(|value| value.as_array())
                .and_then(|providers| providers.first())
                .and_then(|provider| provider.get("id"))
                .and_then(|value| value.as_str())
                .map(|value| value.to_string())
                .unwrap_or_else(default_provider_id);

            settings["selected_provider_id"] = json!(fallback_provider_id);
        }

        if should_initialize_log_directory
            || should_initialize_log_level
            || should_initialize_custom_providers
            || should_initialize_selected_provider
            || should_expand_openai_request_url
            || should_migrate_removed_builtin_model
            || should_upgrade_custom_model
        {
            store.set("settings", settings);
            let _ = store.save();
        }

        store.close_resource();
        return Ok(());
    }

    // 创建默认快捷键配置
    let trans_hotkey = HotkeyConfig::new_platform_specific("KeyT");

    // 创建默认常用语配置
    let phrases: Vec<Phrase> = (1..=8).map(|id| {
        let phrase = match id {
            1 => "已使自身本场比赛的积分得失加倍！",
            2 => "由于挂机行为已经被系统从游戏中踢出...",
            3 => "已经放弃了游戏，这场比赛不计入天梯积分，剩余玩家可以自由退出。",
            4 => "由于长时间没有重连至游戏，系统判定他为逃跑。玩家现在离开该场比赛将不会被判定为放弃！",
            5 => "已经放弃了游戏，系统判定他为逃跑。玩家现在离开该场比赛将不会被判定为放弃。",
            6 => "检测到网络的连接情况非常糟糕，本场比赛将不会计入数据。现在可以安全离开比赛。",
            7 => "已经连续258次预测他们队伍将取得胜利！",
            8 => "经系统检测：玩家XXXXXX存在代练或共享账号嫌疑，遵守社区游戏规范，再次违反将进行封禁处理。",
            _ => unreachable!(),
        };

        Phrase {
            id,
            phrase: phrase.to_string(),
            hotkey: HotkeyConfig::new_platform_specific(&format!("Digit{}", id)),
        }
    }).collect();

    let default_settings = json!({
        "trans_hotkey": trans_hotkey,
        "translation_from": "zh",
        "translation_to": "en",
        "game_scene": "dota2",
        "translation_mode": "toxic",
        "daily_mode": false,
        "model_type": "custom",
        "custom_providers": default_custom_providers(),
        "selected_provider_id": default_provider_id(),
        "log_directory": default_log_directory(),
        "log_level": default_log_level(),
        "phrases": phrases
    });

    store.set("settings", default_settings);
    let _ = store.save();
    store.close_resource();

    Ok(())
}

// 获取设置
pub fn get_settings(app: &AppHandle) -> Result<AppSettings, anyhow::Error> {
    let store = app.store(STORE_FILENAME)?;
    let settings: Value = store
        .get("settings")
        .expect("Failed to get value from store");

    Ok(serde_json::from_value(settings)?)
}

// 更新设置中的特定字段
pub fn update_settings_field<T: serde::Serialize>(
    app: &AppHandle,
    field_updater: impl FnOnce(&mut AppSettings) -> T,
) -> Result<T, anyhow::Error> {
    let store = app.store(STORE_FILENAME)?;
    let mut settings = get_settings(app)?;

    // 更新字段
    let result = field_updater(&mut settings);

    // 保存更新后的设置
    store.set("settings", json!(settings));
    store.save()?;

    Ok(result)
}
