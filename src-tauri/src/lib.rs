mod commands;

// Default greeting command.
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(commands::downloads::DownloadState::default())
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::agent::ask_tapas_ai,
            commands::system::get_system_status,
            commands::system::open_macos_system_settings,
            commands::downloads::start_download,
            commands::downloads::cancel_download,
            commands::browser::close_browser_view,
            commands::browser::resize_browser_view,
            commands::browser::navigate_browser_view,
            commands::browser::create_browser_view,
            commands::browser::browser_action,
            commands::files::list_directory,
            commands::files::create_folder,
            commands::files::create_file,
            commands::files::rename_entry,
            commands::files::delete_entry,
            commands::files::read_file,
            commands::files::get_storage_info,
            commands::files::move_entry,
            commands::files::copy_entry,
            commands::files::empty_trash,
            commands::files::permanently_delete_entry,
            commands::files::restore_entry,
            commands::files::list_trash,
            commands::app_store::install_store_app,
            commands::app_store::list_installed_store_apps,
            commands::app_store::uninstall_store_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
