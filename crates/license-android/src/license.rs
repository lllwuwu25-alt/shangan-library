// Compile the desktop implementation directly so keys and verification cannot drift.
#[path = "../../../src-tauri/src/license/error.rs"]
mod error;
#[path = "../../../src-tauri/src/license/keys.rs"]
mod keys;
#[path = "../../../src-tauri/src/license/storage.rs"]
mod storage;
#[path = "../../../src-tauri/src/license/verify.rs"]
mod verify;

pub use error::LicenseError;
pub use keys::{active_public_keys, PublicKeyRegistry, ACTIVE_PUBLIC_KEYS};
pub use storage::{LicenseService, LicenseStore};
pub use verify::verify_license;
