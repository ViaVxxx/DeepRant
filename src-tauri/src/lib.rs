use crate::store::initialize_settings;
use reqwest::Client;
use serde::Serialize;
use tauri::Manager;
pub mod ai_translator;
pub mod api_endpoint;
pub mod logger;
pub mod shell_helper;
pub mod shortcut;
pub mod store;
pub mod tray;

#[tauri::command]
fn log_to_backend(app_handle: tauri::AppHandle, message: String, level: Option<String>) {
    match level.as_deref() {
        Some("debug") => logger::debug(&app_handle, "frontend", message),
        Some("warn") => logger::warn(&app_handle, "frontend", message),
        Some("error") => logger::error(&app_handle, "frontend", message),
        _ => logger::info(&app_handle, "frontend", message),
    }
}

#[tauri::command]
fn get_log_file_path(app_handle: tauri::AppHandle) -> Result<String, String> {
    logger::log_path(&app_handle)
}

#[derive(Debug, Clone, Serialize)]
struct LogConfigInfo {
    current_dir: String,
    default_dir: String,
    file_path: String,
}

#[tauri::command]
fn get_log_config(app_handle: tauri::AppHandle) -> Result<LogConfigInfo, String> {
    Ok(LogConfigInfo {
        current_dir: logger::log_directory(&app_handle)?,
        default_dir: logger::default_log_directory_string(&app_handle)?,
        file_path: logger::log_path(&app_handle)?,
    })
}

#[tauri::command]
fn read_recent_logs(
    app_handle: tauri::AppHandle,
    max_lines: Option<usize>,
) -> Result<String, String> {
    logger::read_recent_logs(&app_handle, max_lines.unwrap_or(200))
}

#[tauri::command]
fn get_version(app_handle: tauri::AppHandle) -> String {
    app_handle.package_info().version.to_string()
}

#[tauri::command]
fn exit_app(app_handle: tauri::AppHandle) {
    app_handle.exit(0);
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn update_translator_shortcut(
    app_handle: tauri::AppHandle,
    keys: Vec<String>,
) -> Result<(), String> {
    shortcut::update_translator_shortcut(&app_handle, keys)
}

#[tauri::command]
async fn get_settings(app_handle: tauri::AppHandle) -> Result<store::AppSettings, String> {
    store::get_settings(&app_handle).map_err(|e| e.to_string())
}

#[derive(Debug, Clone, Serialize)]
struct CustomModelItem {
    id: String,
    owned_by: Option<String>,
}

#[tauri::command]
async fn fetch_custom_models(
    app_handle: tauri::AppHandle,
    api_url: String,
    auth: String,
) -> Result<Vec<CustomModelItem>, String> {
    let models_endpoint = api_endpoint::build_models_endpoint(&api_url);
    logger::info(
        &app_handle,
        "models",
        format!("开始拉取模型列表: {}", models_endpoint),
    );
    let client = Client::new();

    let response = client
        .get(&models_endpoint)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", auth))
        .send()
        .await
        .map_err(|error| {
            let message = format!("获取模型列表失败: {}", error);
            logger::error(&app_handle, "models", &message);
            message
        })?;

    let json = response
        .json::<serde_json::Value>()
        .await
        .map_err(|error| {
            let message = format!("解析模型列表失败: {}", error);
            logger::error(&app_handle, "models", &message);
            message
        })?;

    if let Some(error_message) = json
        .get("error")
        .and_then(|error| error.get("message"))
        .and_then(|message| message.as_str())
    {
        let message = format!("获取模型列表失败: {}", error_message);
        logger::warn(&app_handle, "models", &message);
        return Err(message);
    }

    if let Some(error_message) = json.get("error_msg").and_then(|message| message.as_str()) {
        let message = format!("获取模型列表失败: {}", error_message);
        logger::warn(&app_handle, "models", &message);
        return Err(message);
    }

    let mut items: Vec<CustomModelItem> = json
        .get("data")
        .and_then(|data| data.as_array())
        .map(|models| {
            models
                .iter()
                .filter_map(|model| {
                    let id = model.get("id").and_then(|value| value.as_str())?;
                    Some(CustomModelItem {
                        id: id.to_string(),
                        owned_by: model
                            .get("owned_by")
                            .and_then(|value| value.as_str())
                            .map(|value| value.to_string()),
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    items.sort_by(|left, right| left.id.cmp(&right.id));

    if items.is_empty() {
        let message = "模型列表为空，服务商未返回可用模型".to_string();
        logger::warn(&app_handle, "models", &message);
        return Err(message);
    }

    logger::info(
        &app_handle,
        "models",
        format!("模型列表拉取成功，共 {} 个模型", items.len()),
    );
    Ok(items)
}

#[tauri::command]
async fn add_phrase(
    app_handle: tauri::AppHandle,
    phrase: String,
    keys: Vec<String>,
) -> Result<store::AppSettings, String> {
    shortcut::add_phrase(&app_handle, phrase, keys)
}

#[tauri::command]
async fn update_phrase(
    app_handle: tauri::AppHandle,
    phrase_id: i32,
    phrase: String,
    keys: Vec<String>,
) -> Result<store::AppSettings, String> {
    shortcut::update_phrase(&app_handle, phrase_id, phrase, keys)
}

#[tauri::command]
async fn delete_phrase(
    app_handle: tauri::AppHandle,
    phrase_id: i32,
) -> Result<store::AppSettings, String> {
    shortcut::delete_phrase(&app_handle, phrase_id)
}

#[tauri::command]
async fn reorder_phrases(
    app_handle: tauri::AppHandle,
    phrase_ids: Vec<i32>,
) -> Result<store::AppSettings, String> {
    shortcut::reorder_phrases(&app_handle, phrase_ids)
}

pub fn run() {
    println!("Starting application...");

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        // 剪贴板插件
        .plugin(tauri_plugin_clipboard_manager::init())
        // opener插件
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            logger::info(&app.app_handle(), "app", "应用启动");
            // 初始化存储
            println!("Initializing...");
            match initialize_settings(&app.app_handle()) {
                Ok(_) => logger::info(&app.app_handle(), "app", "应用设置初始化完成"),
                Err(e) => logger::error(&app.app_handle(), "app", format!("初始化设置失败: {}", e)),
            }

            // 初始化所有快捷键
            println!("正在注册全局快捷键...");
            match shortcut::init_shortcuts(&app.app_handle()) {
                Ok(_) => logger::info(&app.app_handle(), "shortcut", "快捷键设置成功"),
                Err(e) => logger::error(
                    &app.app_handle(),
                    "shortcut",
                    format!("注册全局快捷键失败: {}", e),
                ),
            }

            // 创建AI模型托盘
            match tray::create_tray(&app.app_handle()) {
                Ok(_) => logger::info(&app.app_handle(), "tray", "托盘创建成功"),
                Err(e) => logger::error(&app.app_handle(), "tray", format!("创建托盘失败: {}", e)),
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            update_translator_shortcut,
            log_to_backend,
            get_log_file_path,
            get_log_config,
            read_recent_logs,
            get_settings,
            fetch_custom_models,
            add_phrase,
            update_phrase,
            delete_phrase,
            reorder_phrases,
            get_version
            ,
            exit_app
        ]);

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
