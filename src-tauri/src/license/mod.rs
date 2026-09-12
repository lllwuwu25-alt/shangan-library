pub mod commands;
mod error;
mod keys;
mod storage;
mod verify;

pub use commands::{
    activate_license, deactivate_license, get_license_status, LicenseCommandError, LicenseRuntime,
};
pub use error::LicenseError;
pub use keys::{active_public_keys, PublicKeyRegistry, ACTIVE_PUBLIC_KEYS};
pub use storage::{LicenseService, LicenseStore};
pub use verify::verify_license;
