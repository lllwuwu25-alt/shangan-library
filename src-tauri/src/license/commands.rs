use std::time::{SystemTime, UNIX_EPOCH};

use license_protocol::LicenseStatus;
use serde::Serialize;
use tauri::State;

use super::{LicenseError, LicenseService};

pub struct LicenseRuntime {
    service: LicenseService,
}

impl LicenseRuntime {
    pub fn new(service: LicenseService) -> Self {
        Self { service }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseCommandError {
    pub code: String,
    pub message: String,
}

impl From<LicenseError> for LicenseCommandError {
    fn from(error: LicenseError) -> Self {
        Self {
            code: error.code().to_owned(),
            message: public_message(&error).to_owned(),
        }
    }
}

#[tauri::command]
pub fn get_license_status(
    runtime: State<'_, LicenseRuntime>,
) -> Result<LicenseStatus, LicenseCommandError> {
    runtime.service.status(now_unix()?).map_err(Into::into)
}

#[tauri::command]
pub fn activate_license(
    license: String,
    runtime: State<'_, LicenseRuntime>,
) -> Result<LicenseStatus, LicenseCommandError> {
    runtime
        .service
        .activate(&license, now_unix()?)
        .map_err(Into::into)
}

#[tauri::command]
pub fn deactivate_license(
    runtime: State<'_, LicenseRuntime>,
) -> Result<LicenseStatus, LicenseCommandError> {
    runtime.service.deactivate().map_err(Into::into)
}

fn now_unix() -> Result<i64, LicenseCommandError> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .map_err(|_| LicenseError::StorageError.into())
}

fn public_message(error: &LicenseError) -> &'static str {
    match error {
        LicenseError::Missing => "尚未找到授权码。",
        LicenseError::InvalidFormat
        | LicenseError::InvalidEncoding
        | LicenseError::InvalidPayload
        | LicenseError::InvalidSignature => "授权码无效，请检查是否完整复制。",
        LicenseError::UnsupportedSchema => "此授权码版本暂不受支持。",
        LicenseError::UnknownKeyId => "无法识别此授权码的签发密钥。",
        LicenseError::WrongProduct => "此授权码不属于上岸资料库。",
        LicenseError::UnsupportedEdition | LicenseError::UnsupportedLicenseType => {
            "此授权类型暂不受支持。"
        }
        LicenseError::Expired => "此授权码已过期。",
        LicenseError::StorageError => "授权信息无法写入本机，请稍后重试。",
    }
}
