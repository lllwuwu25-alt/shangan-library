use std::cmp::Reverse;
use std::path::{Path, PathBuf};

use ed25519_dalek::{Signer, SigningKey};
use license_protocol::{
    encode_license, encode_payload, LicensePayload, EDITION, FEATURE_FULL_ACCESS, LICENSE_TYPE,
    PRODUCT_ID, SCHEMA_VERSION,
};
use serde::{Deserialize, Serialize};
use uuid::{NoContext, Timestamp, Uuid};

use crate::key_store::{self, PublicKeyExport, KEY_FILENAME};
use crate::records::{self, IssuanceRecord};
use crate::IssuerError;

const RECORDS_FILENAME: &str = "issuance-records.json";
const MAX_OPERATIONAL_TEXT_CHARS: usize = 80;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct IssueLicenseRequest {
    pub customer_ref: Option<String>,
    pub channel: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct IssuedLicense {
    pub license: String,
    pub record: IssuanceRecord,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum KeyState {
    Missing,
    Ready,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct IssuerState {
    pub key_state: KeyState,
    pub public_key: Option<PublicKeyExport>,
    pub created_at: Option<i64>,
    pub record_count: usize,
}

#[derive(Debug, Clone)]
pub struct IssuerService {
    directory: PathBuf,
}

impl IssuerService {
    pub fn new(directory: impl AsRef<Path>) -> Self {
        Self {
            directory: directory.as_ref().to_path_buf(),
        }
    }

    pub fn state(&self) -> Result<IssuerState, IssuerError> {
        let records = records::load(&self.records_path())?;
        match key_store::load(&self.key_path()) {
            Ok(key) => Ok(IssuerState {
                key_state: KeyState::Ready,
                public_key: Some(key.public),
                created_at: Some(key.created_at),
                record_count: records.len(),
            }),
            Err(IssuerError::KeyMissing) => Ok(IssuerState {
                key_state: KeyState::Missing,
                public_key: None,
                created_at: None,
                record_count: records.len(),
            }),
            Err(error) => Err(error),
        }
    }

    pub fn initialize_key_system(&self, now: i64) -> Result<PublicKeyExport, IssuerError> {
        Ok(key_store::initialize(&self.key_path(), now)?.public)
    }

    pub fn issue_license(
        &self,
        request: IssueLicenseRequest,
        now: i64,
    ) -> Result<IssuedLicense, IssuerError> {
        let request = validate_request(request)?;
        let key = key_store::load(&self.key_path())?;
        let license_id = new_license_id(now);
        let payload = LicensePayload {
            schema_version: SCHEMA_VERSION,
            key_id: key.public.key_id.clone(),
            license_id: license_id.clone(),
            product_id: PRODUCT_ID.into(),
            edition: EDITION.into(),
            license_type: LICENSE_TYPE.into(),
            issued_at: now,
            expires_at: None,
            customer_ref: request.customer_ref.clone(),
            features: vec![FEATURE_FULL_ACCESS.into()],
        };
        let license = sign_payload(&key.signing_key, &payload)?;
        let record = IssuanceRecord {
            license_id,
            customer_ref: request.customer_ref,
            channel: request.channel,
            issued_at: now,
            edition: EDITION.into(),
            license_type: LICENSE_TYPE.into(),
            license: license.clone(),
        };
        let mut stored = records::load(&self.records_path())?;
        stored.push(record.clone());
        records::save(&self.records_path(), stored)?;
        Ok(IssuedLicense { license, record })
    }

    pub fn search_records(&self, query: &str) -> Result<Vec<IssuanceRecord>, IssuerError> {
        let normalized = query.trim().to_lowercase();
        let mut matches = records::load(&self.records_path())?;
        if !normalized.is_empty() {
            matches.retain(|record| {
                record.license_id.to_lowercase().contains(&normalized)
                    || record
                        .customer_ref
                        .as_deref()
                        .unwrap_or_default()
                        .to_lowercase()
                        .contains(&normalized)
                    || record.channel.to_lowercase().contains(&normalized)
            });
        }
        matches.sort_by_key(|record| Reverse(record.issued_at));
        Ok(matches)
    }

    pub fn delete_record(&self, license_id: &str) -> Result<(), IssuerError> {
        let mut stored = records::load(&self.records_path())?;
        stored.retain(|record| record.license_id != license_id);
        records::save(&self.records_path(), stored)
    }

    pub fn export_public_key(
        &self,
        destination: impl AsRef<Path>,
    ) -> Result<PublicKeyExport, IssuerError> {
        let public = key_store::load(&self.key_path())?.public;
        key_store::export_public(destination.as_ref(), &public)?;
        Ok(public)
    }

    pub fn export_private_key_backup(
        &self,
        destination: impl AsRef<Path>,
        confirmation: &str,
    ) -> Result<(), IssuerError> {
        key_store::export_private_backup(&self.key_path(), destination.as_ref(), confirmation)
    }

    pub fn restore_private_key_backup(
        &self,
        backup_path: impl AsRef<Path>,
    ) -> Result<PublicKeyExport, IssuerError> {
        Ok(key_store::restore_backup(&self.key_path(), backup_path.as_ref())?.public)
    }

    fn key_path(&self) -> PathBuf {
        self.directory.join(KEY_FILENAME)
    }

    fn records_path(&self) -> PathBuf {
        self.directory.join(RECORDS_FILENAME)
    }
}

fn validate_request(mut request: IssueLicenseRequest) -> Result<IssueLicenseRequest, IssuerError> {
    request.channel = validate_text(&request.channel, false)?.ok_or(IssuerError::InvalidInput)?;
    request.customer_ref = match request.customer_ref.as_deref() {
        Some(value) => validate_text(value, true)?,
        None => None,
    };
    Ok(request)
}

fn validate_text(value: &str, allow_empty: bool) -> Result<Option<String>, IssuerError> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return if allow_empty {
            Ok(None)
        } else {
            Err(IssuerError::InvalidInput)
        };
    }
    if trimmed.chars().count() > MAX_OPERATIONAL_TEXT_CHARS || trimmed.chars().any(char::is_control)
    {
        return Err(IssuerError::InvalidInput);
    }
    Ok(Some(trimmed.into()))
}

fn new_license_id(now: i64) -> String {
    Uuid::new_v7(Timestamp::from_unix(NoContext, now.max(0) as u64, 0)).to_string()
}

fn sign_payload(signing_key: &SigningKey, payload: &LicensePayload) -> Result<String, IssuerError> {
    let bytes = encode_payload(payload).map_err(|_| IssuerError::InvalidInput)?;
    let signature = signing_key.sign(&bytes).to_bytes();
    Ok(encode_license(&bytes, &signature))
}
