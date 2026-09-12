use thiserror::Error;

#[derive(Debug, Clone, Error, PartialEq, Eq)]
pub enum IssuerError {
    #[error("signing key is missing")]
    KeyMissing,
    #[error("a signing key is already initialized")]
    KeyAlreadyExists,
    #[error("invalid signing-key backup")]
    InvalidKeyBackup,
    #[error("the backup belongs to a different signing-key system")]
    KeyMismatch,
    #[error("private-key export confirmation is required")]
    ConfirmationRequired,
    #[error("invalid issuer input")]
    InvalidInput,
    #[error("issuer storage failed")]
    StorageError,
}

impl IssuerError {
    pub const fn code(&self) -> &'static str {
        match self {
            Self::KeyMissing => "KEY_MISSING",
            Self::KeyAlreadyExists => "KEY_ALREADY_EXISTS",
            Self::InvalidKeyBackup => "INVALID_KEY_BACKUP",
            Self::KeyMismatch => "KEY_MISMATCH",
            Self::ConfirmationRequired => "CONFIRMATION_REQUIRED",
            Self::InvalidInput => "INVALID_INPUT",
            Self::StorageError => "STORAGE_ERROR",
        }
    }
}
