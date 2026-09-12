pub mod commands;
mod error;
mod issuer;
mod key_store;
mod records;

pub use commands::IssuerRuntime;
pub use error::IssuerError;
pub use issuer::{IssueLicenseRequest, IssuedLicense, IssuerService, IssuerState, KeyState};
pub use key_store::PublicKeyExport;
pub use records::IssuanceRecord;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let issuer_directory = app.path().app_config_dir()?.join("license-issuer-data");
            app.manage(IssuerRuntime::new(IssuerService::new(issuer_directory)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_issuer_state,
            commands::initialize_key_system,
            commands::issue_license,
            commands::search_records,
            commands::export_public_key,
            commands::export_private_key_backup,
            commands::restore_private_key_backup,
        ])
        .run(tauri::generate_context!())
        .expect("error while running license issuer");
}
