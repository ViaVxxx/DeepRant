use crate::logger;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Manager};

const CHECK_UPDATE_EVENT: &str = "app://check-update";

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        #[cfg(target_os = "macos")]
        let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);

        if let Err(error) = window.show() {
            logger::warn(app, "tray", format!("显示主窗口失败: {}", error));
        }

        if let Err(error) = window.set_focus() {
            logger::warn(app, "tray", format!("主窗口聚焦失败: {}", error));
        }
    } else {
        logger::warn(app, "tray", "未找到主窗口");
    }
}

pub fn create_tray(app: &AppHandle) -> tauri::Result<()> {
    // let show_icon = Image::from_path("icons/window.png")?;
    // let quit_icon = Image::from_path("icons/quit.png")?;

    let show_i = MenuItem::with_id(app, "show", "打开主页面", true, None::<String>)?;

    // 添加检查更新菜单项
    let check_update_i = MenuItem::with_id(app, "check_update", "检查更新", true, None::<String>)?;

    let quit_i = MenuItem::with_id(app, "quit", "退出", true, None::<String>)?;

    // 在菜单项中添加 check_update_i
    let menu = Menu::with_items(app, &[&show_i, &check_update_i, &quit_i])?;
    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                show_main_window(app);
            }
            "check_update" => {
                logger::info(app, "tray", "托盘触发检查更新");
                show_main_window(app);
                if let Err(error) = app.emit(CHECK_UPDATE_EVENT, ()) {
                    logger::error(app, "tray", format!("派发检查更新事件失败: {}", error));
                }
            }
            "quit" => {
                logger::info(app, "tray", "托盘触发退出应用");
                app.exit(0);
            }
            _ => {
                logger::debug(app, "tray", format!("未处理的托盘菜单项: {:?}", event.id));
            }
        })
        .build(app)?;

    Ok(())
}
