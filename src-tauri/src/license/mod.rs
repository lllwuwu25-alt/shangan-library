mod error;
mod keys;
mod verify;

pub use error::LicenseError;
pub use keys::{active_public_keys, PublicKeyRegistry, ACTIVE_PUBLIC_KEYS};
pub use verify::verify_license;

