use serde::{Deserialize, Serialize};

pub const SCHEMA_VERSION: u8 = 1;
pub const PRODUCT_ID: &str = "com.shangan.library";
pub const EDITION: &str = "pro";
pub const LICENSE_TYPE: &str = "lifetime";
pub const FEATURE_FULL_ACCESS: &str = "full_access";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LicensePayload {
    pub schema_version: u8,
    pub key_id: String,
    pub license_id: String,
    pub product_id: String,
    pub edition: String,
    pub license_type: String,
    pub issued_at: i64,
    pub expires_at: Option<i64>,
    pub customer_ref: Option<String>,
    pub features: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum LicenseStateKind {
    Missing,
    Valid,
    Invalid,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LicenseStatus {
    pub state: LicenseStateKind,
    pub valid: bool,
    pub edition: Option<String>,
    pub license_type: Option<String>,
    pub license_id: Option<String>,
    pub issued_at: Option<i64>,
    pub expires_at: Option<i64>,
    pub features: Vec<String>,
}

impl LicenseStatus {
    pub fn missing() -> Self {
        Self {
            state: LicenseStateKind::Missing,
            valid: false,
            edition: None,
            license_type: None,
            license_id: None,
            issued_at: None,
            expires_at: None,
            features: Vec::new(),
        }
    }
}

