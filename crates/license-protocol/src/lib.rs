mod encoding;
mod model;

pub use encoding::{decode_license, encode_license, encode_payload, LicenseEnvelope, ProtocolError};
pub use model::{
    LicensePayload, LicenseStateKind, LicenseStatus, EDITION, FEATURE_FULL_ACCESS, LICENSE_TYPE,
    PRODUCT_ID, SCHEMA_VERSION,
};

