pub mod license;

use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use jni::objects::{JClass, JString};
use jni::sys::jstring;
use jni::JNIEnv;
use license::{active_public_keys, LicenseError, LicenseService, LicenseStore};
use license_protocol::LicenseStatus;
use serde_json::json;

fn run_command(
    service: &LicenseService,
    command: &str,
    raw: &str,
    now: i64,
) -> Result<LicenseStatus, LicenseError> {
    match command {
        "get_license_status" => service.status(now),
        "activate_license" => service.activate(raw, now),
        "deactivate_license" => service.deactivate(),
        _ => Err(LicenseError::StorageError),
    }
}

pub fn execute(command: &str, raw: &str, directory: &Path, now: i64) -> String {
    let result = active_public_keys().and_then(|keys| {
        let service = LicenseService::new(LicenseStore::new(directory.join("license.dat")), keys);
        run_command(&service, command, raw, now)
    });
    match result {
        Ok(status) => json!({ "status": status }).to_string(),
        Err(error) => json!({ "error": { "code": error.code() } }).to_string(),
    }
}

#[no_mangle]
pub extern "system" fn Java_com_shangan_library_license_LicensePlugin_nativeCommand(
    mut env: JNIEnv,
    _class: JClass,
    command: JString,
    raw: JString,
    directory: JString,
) -> jstring {
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let command: String = env.get_string(&command)?.into();
        let raw: String = env.get_string(&raw)?.into();
        let directory: String = env.get_string(&directory)?.into();
        let response = match SystemTime::now().duration_since(UNIX_EPOCH) {
            Ok(time) => execute(&command, &raw, Path::new(&directory), time.as_secs() as i64),
            Err(_) => json!({ "error": { "code": "STORAGE_ERROR" } }).to_string(),
        };
        env.new_string(response).map(|value| value.into_raw())
    }));
    match result {
        Ok(Ok(value)) => value,
        _ => {
            let _ = env.throw_new(
                "java/lang/IllegalStateException",
                "Local license operation failed",
            );
            std::ptr::null_mut()
        }
    }
}
