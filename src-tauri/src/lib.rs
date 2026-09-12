pub mod license;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let license_path = app.path().app_config_dir()?.join("license.dat");
            let public_keys = license::active_public_keys()
                .map_err(|error| std::io::Error::other(error.to_string()))?;
            app.manage(license::LicenseRuntime::new(license::LicenseService::new(
                license::LicenseStore::new(license_path),
                public_keys,
            )));
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            license::commands::activate_license,
            license::commands::get_license_status,
            license::commands::deactivate_license,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
