use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::State;

use crate::{
    IssuanceRecord, IssueLicenseRequest, IssuedLicense, IssuerError, IssuerService, IssuerState,
    PublicKeyExport,
};

pub struct IssuerRuntime(Mutex<IssuerService>);

impl IssuerRuntime {
    pub fn new(service: IssuerService) -> Self {
        Self(Mutex::new(service))
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IssuerCommandError {
    code: &'static str,
    message: String,
}

impl From<IssuerError> for IssuerCommandError {
    fn from(error: IssuerError) -> Self {
        Self {
            code: error.code(),
            message: error.to_string(),
        }
    }
}

#[tauri::command]
pub fn get_issuer_state(
    state: State<'_, IssuerRuntime>,
) -> Result<IssuerState, IssuerCommandError> {
    with_service(&state, IssuerService::state)
}

#[tauri::command]
pub fn initialize_key_system(
    state: State<'_, IssuerRuntime>,
) -> Result<PublicKeyExport, IssuerCommandError> {
    with_service(&state, |service| service.initialize_key_system(now()))
}

#[tauri::command]
pub fn issue_license(
    request: IssueLicenseRequest,
    state: State<'_, IssuerRuntime>,
) -> Result<IssuedLicense, IssuerCommandError> {
    with_service(&state, |service| service.issue_license(request, now()))
}

#[tauri::command]
pub fn search_records(
    query: String,
    state: State<'_, IssuerRuntime>,
) -> Result<Vec<IssuanceRecord>, IssuerCommandError> {
    with_service(&state, |service| service.search_records(&query))
}

#[tauri::command]
pub fn export_public_key(
    path: String,
    state: State<'_, IssuerRuntime>,
) -> Result<PublicKeyExport, IssuerCommandError> {
    with_service(&state, |service| {
        service.export_public_key(PathBuf::from(path))
    })
}

#[tauri::command]
pub fn export_private_key_backup(
    path: String,
    confirmation: String,
    state: State<'_, IssuerRuntime>,
) -> Result<(), IssuerCommandError> {
    with_service(&state, |service| {
        service.export_private_key_backup(PathBuf::from(path), &confirmation)
    })
}

#[tauri::command]
pub fn restore_private_key_backup(
    path: String,
    state: State<'_, IssuerRuntime>,
) -> Result<PublicKeyExport, IssuerCommandError> {
    with_service(&state, |service| {
        service.restore_private_key_backup(PathBuf::from(path))
    })
}

fn with_service<T>(
    state: &State<'_, IssuerRuntime>,
    operation: impl FnOnce(&IssuerService) -> Result<T, IssuerError>,
) -> Result<T, IssuerCommandError> {
    let service = state
        .0
        .lock()
        .map_err(|_| IssuerCommandError::from(IssuerError::StorageError))?;
    operation(&service).map_err(Into::into)
}

fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}
