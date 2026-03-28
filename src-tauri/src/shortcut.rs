// 导入所需的 Tauri 相关模块
use crate::shell_helper::{send_phrase, trans_and_replace_text};
use crate::store::{get_settings, update_settings_field, AppSettings, HotkeyConfig, Phrase};
use std::collections::{HashMap, HashSet};
use std::str::FromStr;
use std::sync::Arc;
use tauri::AppHandle;
use tauri_plugin_global_shortcut::{
    Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutEvent, ShortcutState,
};

/// 从字符串转换为修饰键
fn parse_modifiers(modifiers: &[String]) -> Modifiers {
    let mut result = Modifiers::empty();
    for modifier in modifiers {
        match modifier.as_str() {
            "Control" | "ControlLeft" | "ControlRight" => result |= Modifiers::CONTROL,
            "Alt" | "AltLeft" | "AltRight" => result |= Modifiers::ALT,
            "Shift" | "ShiftLeft" | "ShiftRight" => result |= Modifiers::SHIFT,
            "Meta" | "MetaLeft" | "MetaRight" => result |= Modifiers::META,
            _ => {}
        }
    }
    result
}

/// 判断是否为修饰键
fn is_modifier_key(key: &str) -> bool {
    key.contains("Control") || key.contains("Alt") || key.contains("Shift") || key.contains("Meta")
}

/// 解析按键数组为修饰键和主键
fn parse_keys(keys: &[String]) -> Result<(Vec<String>, String), String> {
    let has_modifier = keys.iter().any(|key| is_modifier_key(key));
    let has_non_modifier = keys.iter().any(|key| !is_modifier_key(key));

    if !has_modifier || !has_non_modifier || keys.len() < 2 {
        return Err(
            "快捷键必须包含至少一个修饰键(Control/Alt/Shift/Command)和一个其他按键".to_string(),
        );
    }

    let modifiers = keys[..keys.len() - 1]
        .iter()
        .map(|key| key.replace("Left", "").replace("Right", ""))
        .collect();
    let key = keys
        .last()
        .cloned()
        .ok_or_else(|| "快捷键不能为空".to_string())?;

    Ok((modifiers, key))
}

/// 构建可展示的快捷键文本
fn build_shortcut_text(modifiers: &[String], key: &str) -> String {
    format!(
        "{}+{}",
        modifiers
            .iter()
            .map(|modifier| match modifier.as_str() {
                "Control" =>
                    if cfg!(target_os = "macos") {
                        "⌃"
                    } else {
                        "Ctrl"
                    },
                "Alt" =>
                    if cfg!(target_os = "macos") {
                        "⌥"
                    } else {
                        "Alt"
                    },
                "Shift" => "⇧",
                "Meta" =>
                    if cfg!(target_os = "macos") {
                        "⌘"
                    } else {
                        "Win"
                    },
                _ => modifier,
            })
            .collect::<Vec<_>>()
            .join("+"),
        format_key_display(key)
    )
}

/// 根据按键数组创建快捷键配置
fn create_hotkey_config(keys: &[String]) -> Result<HotkeyConfig, String> {
    let (modifiers, key) = parse_keys(keys)?;

    Ok(HotkeyConfig {
        shortcut: build_shortcut_text(&modifiers, &key),
        modifiers,
        key,
    })
}

/// 生成快捷键签名，用于冲突检测
fn hotkey_signature(modifiers: &[String], key: &str) -> String {
    let mut normalized_modifiers: Vec<String> = modifiers
        .iter()
        .map(|modifier| modifier.replace("Left", "").replace("Right", ""))
        .collect();
    normalized_modifiers.sort();

    format!("{}|{}", normalized_modifiers.join("+"), key)
}

/// 检查常用语快捷键冲突
fn validate_phrase_hotkey_conflict(
    settings: &AppSettings,
    hotkey: &HotkeyConfig,
    exclude_phrase_id: Option<i32>,
) -> Result<(), String> {
    let current_signature = hotkey_signature(&hotkey.modifiers, &hotkey.key);
    let translator_signature =
        hotkey_signature(&settings.trans_hotkey.modifiers, &settings.trans_hotkey.key);

    if current_signature == translator_signature {
        return Err("该快捷键与翻译快捷键冲突，请更换其他组合".to_string());
    }

    if let Some(conflict_phrase) = settings.phrases.iter().find(|phrase| {
        Some(phrase.id) != exclude_phrase_id
            && hotkey_signature(&phrase.hotkey.modifiers, &phrase.hotkey.key) == current_signature
    }) {
        return Err(format!(
            "该快捷键与常用语“{}”冲突，请更换其他组合",
            conflict_phrase.phrase
        ));
    }

    Ok(())
}

/// 检查翻译快捷键冲突
fn validate_translator_hotkey_conflict(
    settings: &AppSettings,
    hotkey: &HotkeyConfig,
) -> Result<(), String> {
    let current_signature = hotkey_signature(&hotkey.modifiers, &hotkey.key);

    if let Some(conflict_phrase) = settings.phrases.iter().find(|phrase| {
        hotkey_signature(&phrase.hotkey.modifiers, &phrase.hotkey.key) == current_signature
    }) {
        return Err(format!(
            "该快捷键与常用语“{}”冲突，请更换其他组合",
            conflict_phrase.phrase
        ));
    }

    Ok(())
}

/// 注册单个快捷键
fn register_shortcut<F>(
    app: &AppHandle,
    modifiers: &[String],
    key: &str,
    handler: F,
) -> Result<(), String>
where
    F: Fn(&AppHandle, &Shortcut, ShortcutEvent) + Send + Sync + 'static,
{
    println!("开始注册快捷键...");
    println!("修饰键: {:?}", modifiers);
    println!("主键: {}", key);

    let code = match Code::from_str(key) {
        Ok(c) => {
            println!("成功解析按键代码");
            c
        }
        Err(_) => {
            let err = format!("无效的按键代码: {}", key);
            println!("错误: {}", err);
            return Err(err);
        }
    };

    let parsed_modifiers = parse_modifiers(modifiers);
    println!("解析后的修饰键: {:?}", parsed_modifiers);

    let shortcut = Shortcut::new(Some(parsed_modifiers), code);
    println!("创建快捷键组合: {:?}", shortcut);

    let global_shortcut = app.global_shortcut();
    match global_shortcut.on_shortcut(shortcut, handler) {
        Ok(_) => {
            println!("快捷键注册成功");
            Ok(())
        }
        Err(e) => {
            let err = format!("注册快捷键失败: {}", e);
            println!("错误: {}", err);
            Err(err)
        }
    }
}

/// 注销快捷键
fn unregister_shortcut(app: &AppHandle, modifiers: &[String], key: &str) -> Result<(), String> {
    let code = Code::from_str(key).map_err(|_| format!("无效的按键代码: {}", key))?;
    let shortcut = Shortcut::new(Some(parse_modifiers(modifiers)), code);

    app.global_shortcut()
        .unregister(shortcut)
        .map_err(|e| format!("注销快捷键失败: {}", e))
}

/// 更新快捷键
///
/// # 参数
/// * `app` - Tauri应用句柄
/// * `old_modifiers` - 旧的修饰键列表
/// * `old_key` - 旧的主键
/// * `new_modifiers` - 新的修饰键列表
/// * `new_key` - 新的主键
/// * `handler` - 快捷键触发时的处理函数
///
/// # 返回值
/// * `Result<(), String>` - 成功返回 Ok(()), 失败返回错误信息
fn update_shortcut<F>(
    app: &AppHandle,
    old_modifiers: &[String],
    old_key: &str,
    new_modifiers: &[String],
    new_key: &str,
    handler: F,
) -> Result<(), String>
where
    F: Fn(&AppHandle, &Shortcut, ShortcutEvent) + Send + Sync + 'static,
{
    println!("开始更新快捷键...");
    println!("旧快捷键: 修饰键={:?}, 主键={}", old_modifiers, old_key);
    println!("新快捷键: 修饰键={:?}, 主键={}", new_modifiers, new_key);

    let global_shortcut = app.global_shortcut();

    // 注销旧快捷键
    if let Ok(old_code) = Code::from_str(old_key) {
        println!("正在注销旧快捷键...");
        let old_shortcut = Shortcut::new(Some(parse_modifiers(old_modifiers)), old_code);
        match global_shortcut.unregister(old_shortcut) {
            Ok(_) => println!("成功注销旧快捷键"),
            Err(e) => {
                println!("注销现有快捷键失败: {}", e);
                // 继续执行,因为旧快捷键可能本来就不存在
            }
        }
    } else {
        println!("旧快捷键格式无效,跳过注销步骤");
    }

    // 注册新快捷键
    println!("正在注册新快捷键...");
    match register_shortcut(app, new_modifiers, new_key, handler) {
        Ok(_) => {
            println!("新快捷键注册成功");
            Ok(())
        }
        Err(e) => {
            println!("新快捷键注册失败: {}", e);
            Err(e)
        }
    }
}

/// 创建常用语快捷键处理函数
fn create_phrase_handler(
    app: AppHandle,
    phrase_text: String,
) -> impl Fn(&AppHandle, &Shortcut, ShortcutEvent) + Send + Sync + 'static {
    let app = Arc::new(app);
    let phrase_text = Arc::new(phrase_text);

    move |_app, _shortcut, event| {
        if event.state() == ShortcutState::Pressed {
            let app_handle = Arc::clone(&app);
            let phrase = Arc::clone(&phrase_text);

            tauri::async_runtime::spawn(async move {
                if let Err(e) = send_phrase(app_handle.as_ref(), phrase.as_ref()).await {
                    println!("发送常用语失败: {:?}", e);
                }
            });
        }
    }
}

/// 查找指定常用语
fn find_phrase(settings: &AppSettings, phrase_id: i32) -> Result<Phrase, String> {
    settings
        .phrases
        .iter()
        .find(|phrase| phrase.id == phrase_id)
        .cloned()
        .ok_or_else(|| format!("未找到ID为 {} 的常用语", phrase_id))
}

/// 初始化所有快捷键
pub fn init_shortcuts(app: &AppHandle) -> Result<(), String> {
    let settings = get_settings(app).map_err(|e| e.to_string())?;

    // 注册翻译快捷键
    register_shortcut(
        app,
        &settings.trans_hotkey.modifiers,
        &settings.trans_hotkey.key,
        create_trans_handler(app.clone()),
    )?;

    // 注册常用语快捷键
    for phrase in settings.phrases {
        register_shortcut(
            app,
            &phrase.hotkey.modifiers,
            &phrase.hotkey.key,
            create_phrase_handler(app.clone(), phrase.phrase.clone()),
        )?;
    }

    Ok(())
}

/// 添加常用语
pub fn add_phrase(
    app: &AppHandle,
    phrase_text: String,
    keys: Vec<String>,
) -> Result<AppSettings, String> {
    let phrase_text = phrase_text.trim().to_string();
    if phrase_text.is_empty() {
        return Err("常用语内容不能为空".to_string());
    }

    let settings = get_settings(app).map_err(|e| e.to_string())?;
    let hotkey = create_hotkey_config(&keys)?;
    validate_phrase_hotkey_conflict(&settings, &hotkey, None)?;

    register_shortcut(
        app,
        &hotkey.modifiers,
        &hotkey.key,
        create_phrase_handler(app.clone(), phrase_text.clone()),
    )?;

    let next_id = settings
        .phrases
        .iter()
        .map(|phrase| phrase.id)
        .max()
        .unwrap_or(0)
        + 1;

    update_settings_field(app, |settings| {
        settings.phrases.push(Phrase {
            id: next_id,
            phrase: phrase_text.clone(),
            hotkey: hotkey.clone(),
        });
    })
    .map_err(|e| e.to_string())?;

    get_settings(app).map_err(|e| e.to_string())
}

/// 更新常用语
pub fn update_phrase(
    app: &AppHandle,
    phrase_id: i32,
    phrase_text: String,
    keys: Vec<String>,
) -> Result<AppSettings, String> {
    let phrase_text = phrase_text.trim().to_string();
    if phrase_text.is_empty() {
        return Err("常用语内容不能为空".to_string());
    }

    let settings = get_settings(app).map_err(|e| e.to_string())?;
    let old_phrase = find_phrase(&settings, phrase_id)?;
    let new_hotkey = create_hotkey_config(&keys)?;
    validate_phrase_hotkey_conflict(&settings, &new_hotkey, Some(phrase_id))?;

    update_shortcut(
        app,
        &old_phrase.hotkey.modifiers,
        &old_phrase.hotkey.key,
        &new_hotkey.modifiers,
        &new_hotkey.key,
        create_phrase_handler(app.clone(), phrase_text.clone()),
    )?;

    update_settings_field(app, |settings| {
        if let Some(phrase) = settings
            .phrases
            .iter_mut()
            .find(|item| item.id == phrase_id)
        {
            phrase.phrase = phrase_text.clone();
            phrase.hotkey = new_hotkey.clone();
        }
    })
    .map_err(|e| e.to_string())?;

    get_settings(app).map_err(|e| e.to_string())
}

/// 常用语排序
pub fn reorder_phrases(app: &AppHandle, phrase_ids: Vec<i32>) -> Result<AppSettings, String> {
    let settings = get_settings(app).map_err(|e| e.to_string())?;
    let existing_ids: Vec<i32> = settings.phrases.iter().map(|phrase| phrase.id).collect();

    if phrase_ids.len() != existing_ids.len() {
        return Err("排序数据不完整，请刷新后重试".to_string());
    }

    let existing_id_set: HashSet<i32> = existing_ids.iter().copied().collect();
    let reorder_id_set: HashSet<i32> = phrase_ids.iter().copied().collect();

    if existing_id_set != reorder_id_set {
        return Err("排序数据无效，请刷新后重试".to_string());
    }

    let phrase_map: HashMap<i32, Phrase> = settings
        .phrases
        .into_iter()
        .map(|phrase| (phrase.id, phrase))
        .collect();

    update_settings_field(app, |settings| {
        settings.phrases = phrase_ids
            .iter()
            .filter_map(|phrase_id| phrase_map.get(phrase_id).cloned())
            .collect();
    })
    .map_err(|e| e.to_string())?;

    get_settings(app).map_err(|e| e.to_string())
}

/// 删除常用语
pub fn delete_phrase(app: &AppHandle, phrase_id: i32) -> Result<AppSettings, String> {
    let settings = get_settings(app).map_err(|e| e.to_string())?;
    let phrase = find_phrase(&settings, phrase_id)?;

    if let Err(error) = unregister_shortcut(app, &phrase.hotkey.modifiers, &phrase.hotkey.key) {
        println!("删除常用语时注销快捷键失败: {}", error);
    }

    update_settings_field(app, |settings| {
        settings.phrases.retain(|item| item.id != phrase_id);
    })
    .map_err(|e| e.to_string())?;

    get_settings(app).map_err(|e| e.to_string())
}

/// 更新翻译快捷键
pub fn update_translator_shortcut(
    app: &AppHandle,
    keys: Vec<String>, // 直接接收按键数组
) -> Result<(), String> {
    println!("正在更新翻译快捷键...");
    println!("接收到的按键数组: {:?}", keys);

    let settings = get_settings(app).map_err(|e| {
        println!("获取设置失败: {}", e);
        e.to_string()
    })?;
    let new_hotkey = create_hotkey_config(&keys)?;
    validate_translator_hotkey_conflict(&settings, &new_hotkey)?;

    println!("解析后的按键: {}", new_hotkey.key);
    println!("解析后的修饰键: {:?}", new_hotkey.modifiers);

    // 更新快捷键
    let result = update_shortcut(
        app,
        &settings.trans_hotkey.modifiers,
        &settings.trans_hotkey.key,
        &new_hotkey.modifiers,
        &new_hotkey.key,
        create_trans_handler(app.clone()),
    );

    // 如果快捷键更新成功，则更新存储
    if result.is_ok() {
        // 更新存储
        if let Err(e) = update_settings_field(app, |settings| {
            settings.trans_hotkey = new_hotkey.clone();
        }) {
            println!("保存设置失败: {}", e);
            return Err(format!("快捷键已更新，但保存设置失败: {}", e));
        }
        println!("快捷键设置已保存到存储");
    }

    match &result {
        Ok(_) => println!("翻译快捷键更新成功"),
        Err(e) => println!("翻译快捷键更新失败: {}", e),
    }

    result
}

/// 创建翻译快捷键处理函数
fn create_trans_handler(
    app: AppHandle,
) -> impl Fn(&AppHandle, &Shortcut, ShortcutEvent) + Send + Sync + 'static {
    let app = Arc::new(app);
    move |_app, _shortcut, event| {
        if event.state() == ShortcutState::Pressed {
            let app_clone = Arc::clone(&app);
            tauri::async_runtime::spawn(async move {
                if let Err(e) = trans_and_replace_text(app_clone.as_ref()).await {
                    println!("翻译替换失败: {:?}", e);
                }
            });
        }
    }
}

/// 格式化键盘代码为用户友好的显示文本
fn format_key_display(key: &str) -> String {
    if key.starts_with("Key") {
        key[3..].to_string()
    } else if key.starts_with("Digit") {
        key[5..].to_string()
    } else if key.starts_with("Arrow") {
        match key {
            "ArrowUp" => "↑".to_string(),
            "ArrowDown" => "↓".to_string(),
            "ArrowLeft" => "←".to_string(),
            "ArrowRight" => "→".to_string(),
            _ => key.to_string(),
        }
    } else {
        match key {
            "Space" => "空格".to_string(),
            "Tab" => "Tab".to_string(),
            "Enter" => "↵".to_string(),
            "Backspace" => "⌫".to_string(),
            "Delete" => "Del".to_string(),
            "Escape" => "Esc".to_string(),
            "CapsLock" => "⇪".to_string(),
            _ => key.to_string(),
        }
    }
}
