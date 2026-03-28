use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};

use tauri::AppHandle;

#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
enum LogLevel {
    Error,
    Warn,
    Info,
    Debug,
}

fn unix_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default()
}

pub fn default_log_directory(_app: &AppHandle) -> Result<PathBuf, String> {
    let executable_path =
        std::env::current_exe().map_err(|error| format!("解析应用路径失败: {}", error))?;
    let executable_dir = executable_path
        .parent()
        .ok_or_else(|| "无法解析应用安装目录".to_string())?;

    let mut directory = executable_dir.to_path_buf();
    directory.push("logs");
    Ok(directory)
}

fn configured_log_level(app: &AppHandle) -> LogLevel {
    let log_level = crate::store::get_settings(app)
        .ok()
        .map(|settings| settings.log_level)
        .unwrap_or_else(|| "standard".to_string());

    match log_level.trim().to_ascii_lowercase().as_str() {
        "concise" => LogLevel::Warn,
        "detailed" => LogLevel::Debug,
        _ => LogLevel::Info,
    }
}

fn should_log(app: &AppHandle, level: LogLevel) -> bool {
    level <= configured_log_level(app)
}

pub fn current_log_directory(app: &AppHandle) -> Result<PathBuf, String> {
    if let Ok(settings) = crate::store::get_settings(app) {
        let custom_directory = settings.log_directory.trim();
        if !custom_directory.is_empty() {
            return Ok(PathBuf::from(custom_directory));
        }
    }

    default_log_directory(app)
}

fn resolve_log_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let mut directory = current_log_directory(app)?;
    fs::create_dir_all(&directory).map_err(|error| format!("创建日志目录失败: {}", error))?;
    directory.push("app.log");
    Ok(directory)
}

fn append_log(app: &AppHandle, level: &str, target: &str, message: &str) -> Result<(), String> {
    let log_file = resolve_log_file_path(app)?;
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_file)
        .map_err(|error| format!("打开日志文件失败: {}", error))?;

    writeln!(
        file,
        "[{}][{}][{}] {}",
        unix_timestamp(),
        level,
        target,
        message
    )
    .map_err(|error| format!("写入日志失败: {}", error))
}

pub fn info(app: &AppHandle, target: &str, message: impl AsRef<str>) {
    let message = message.as_ref();
    if !should_log(app, LogLevel::Info) {
        return;
    }
    println!("[{}] {}", target, message);
    if let Err(error) = append_log(app, "INFO", target, message) {
        eprintln!("[logger] {}", error);
    }
}

pub fn warn(app: &AppHandle, target: &str, message: impl AsRef<str>) {
    let message = message.as_ref();
    if !should_log(app, LogLevel::Warn) {
        return;
    }
    eprintln!("[{}] {}", target, message);
    if let Err(error) = append_log(app, "WARN", target, message) {
        eprintln!("[logger] {}", error);
    }
}

pub fn error(app: &AppHandle, target: &str, message: impl AsRef<str>) {
    let message = message.as_ref();
    if !should_log(app, LogLevel::Error) {
        return;
    }
    eprintln!("[{}] {}", target, message);
    if let Err(error) = append_log(app, "ERROR", target, message) {
        eprintln!("[logger] {}", error);
    }
}

pub fn debug(app: &AppHandle, target: &str, message: impl AsRef<str>) {
    let message = message.as_ref();
    if !should_log(app, LogLevel::Debug) {
        return;
    }
    println!("[{}] {}", target, message);
    if let Err(error) = append_log(app, "DEBUG", target, message) {
        eprintln!("[logger] {}", error);
    }
}

pub fn log_path(app: &AppHandle) -> Result<String, String> {
    resolve_log_file_path(app).map(|path| path.to_string_lossy().to_string())
}

pub fn log_directory(app: &AppHandle) -> Result<String, String> {
    current_log_directory(app).map(|path| path.to_string_lossy().to_string())
}

pub fn default_log_directory_string(app: &AppHandle) -> Result<String, String> {
    default_log_directory(app).map(|path| path.to_string_lossy().to_string())
}

pub fn read_recent_logs(app: &AppHandle, max_lines: usize) -> Result<String, String> {
    let log_file = resolve_log_file_path(app)?;
    if !log_file.exists() {
        return Ok(String::new());
    }

    let content =
        fs::read_to_string(&log_file).map_err(|error| format!("读取日志文件失败: {}", error))?;
    let lines: Vec<&str> = content.lines().collect();
    let start_index = lines.len().saturating_sub(max_lines);

    Ok(lines[start_index..].join("\n"))
}
