use std::fs;
use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::key_store::atomic_write;
use crate::IssuerError;

const RECORDS_SCHEMA: u8 = 1;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct IssuanceRecord {
    pub license_id: String,
    pub customer_ref: Option<String>,
    pub channel: String,
    pub issued_at: i64,
    pub edition: String,
    pub license_type: String,
    pub license: String,
}

#[derive(Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RecordDocument {
    schema_version: u8,
    records: Vec<IssuanceRecord>,
}

pub(crate) fn load(path: &Path) -> Result<Vec<IssuanceRecord>, IssuerError> {
    if !path.exists() {
        return Ok(Vec::new());
    }
    let bytes = fs::read(path).map_err(|_| IssuerError::StorageError)?;
    let document: RecordDocument =
        serde_json::from_slice(&bytes).map_err(|_| IssuerError::StorageError)?;
    if document.schema_version != RECORDS_SCHEMA {
        return Err(IssuerError::StorageError);
    }
    Ok(document.records)
}

pub(crate) fn save(path: &Path, records: Vec<IssuanceRecord>) -> Result<(), IssuerError> {
    let document = RecordDocument {
        schema_version: RECORDS_SCHEMA,
        records,
    };
    let bytes = serde_json::to_vec_pretty(&document).map_err(|_| IssuerError::StorageError)?;
    atomic_write(path, &bytes, true)
}
