use license_protocol::ProtocolError;
use thiserror::Error;

#[derive(Debug, Clone, Error, PartialEq, Eq)]
pub enum LicenseError {
    #[error("license is missing")]
    Missing,
    #[error("invalid license format")]
    InvalidFormat,
    #[error("invalid base64url encoding")]
    InvalidEncoding,
    #[error("invalid license payload")]
    InvalidPayload,
    #[error("invalid license signature")]
    InvalidSignature,
    #[error("unsupported license schema")]
    UnsupportedSchema,
    #[error("unknown license key")]
    UnknownKeyId,
    #[error("license belongs to another product")]
    WrongProduct,
    #[error("unsupported product edition")]
    UnsupportedEdition,
    #[error("unsupported license type")]
    UnsupportedLicenseType,
    #[error("license has expired")]
    Expired,
    #[error("license storage failed")]
    StorageError,
}

impl LicenseError {
    pub const fn code(&self) -> &'static str {
        match self {
            Self::Missing => "MISSING",
            Self::InvalidFormat => "INVALID_FORMAT",
            Self::InvalidEncoding => "INVALID_ENCODING",
            Self::InvalidPayload => "INVALID_PAYLOAD",
            Self::InvalidSignature => "INVALID_SIGNATURE",
            Self::UnsupportedSchema => "UNSUPPORTED_SCHEMA",
            Self::UnknownKeyId => "UNKNOWN_KEY_ID",
            Self::WrongProduct => "WRONG_PRODUCT",
            Self::UnsupportedEdition => "UNSUPPORTED_EDITION",
            Self::UnsupportedLicenseType => "UNSUPPORTED_LICENSE_TYPE",
            Self::Expired => "EXPIRED",
            Self::StorageError => "STORAGE_ERROR",
        }
    }
}

impl From<ProtocolError> for LicenseError {
    fn from(error: ProtocolError) -> Self {
        match error {
            ProtocolError::InvalidFormat => Self::InvalidFormat,
            ProtocolError::InvalidEncoding => Self::InvalidEncoding,
            ProtocolError::InvalidPayload => Self::InvalidPayload,
        }
    }
}
