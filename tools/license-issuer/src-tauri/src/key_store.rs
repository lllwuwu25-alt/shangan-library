use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use ed25519_dalek::{SigningKey, VerifyingKey};
use rand_core::OsRng;
use serde::{Deserialize, Serialize};

use crate::IssuerError;

pub const KEY_ID: &str = "primary-2026";
pub const KEY_FILENAME: &str = "license-private.key";
const ALGORITHM: &str = "Ed25519";
const KEY_DOCUMENT_SCHEMA: u8 = 1;
pub const PRIVATE_EXPORT_CONFIRMATION: &str = "EXPORT_PRIVATE_KEY";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PublicKeyExport {
    pub schema_version: u8,
    pub key_id: String,
    pub algorithm: String,
    pub public_key: String,
}

impl PublicKeyExport {
    pub fn public_key_bytes(&self) -> Result<[u8; 32], IssuerError> {
        decode_fixed::<32>(&self.public_key).map_err(|_| IssuerError::InvalidKeyBackup)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct KeyDocument {
    schema_version: u8,
    key_id: String,
    algorithm: String,
    created_at: i64,
    private_key: String,
    public_key: String,
}

pub(crate) struct LoadedKey {
    pub signing_key: SigningKey,
    pub public: PublicKeyExport,
    pub created_at: i64,
}

pub(crate) fn initialize(path: &Path, created_at: i64) -> Result<LoadedKey, IssuerError> {
    if path.exists() {
        return Err(IssuerError::KeyAlreadyExists);
    }
    let signing_key = SigningKey::generate(&mut OsRng);
    let document = document_from_signing_key(&signing_key, created_at);
    let bytes = serde_json::to_vec_pretty(&document).map_err(|_| IssuerError::StorageError)?;
    atomic_write(path, &bytes, true)?;
    loaded_from_document(document)
}

pub(crate) fn load(path: &Path) -> Result<LoadedKey, IssuerError> {
    if !path.exists() {
        return Err(IssuerError::KeyMissing);
    }
    let bytes = fs::read(path).map_err(|_| IssuerError::StorageError)?;
    let document =
        serde_json::from_slice(bytes.as_slice()).map_err(|_| IssuerError::InvalidKeyBackup)?;
    loaded_from_document(document)
}

pub(crate) fn export_private_backup(
    source_path: &Path,
    destination: &Path,
    confirmation: &str,
) -> Result<(), IssuerError> {
    if confirmation != PRIVATE_EXPORT_CONFIRMATION {
        return Err(IssuerError::ConfirmationRequired);
    }
    let loaded = load(source_path)?;
    let document = document_from_signing_key(&loaded.signing_key, loaded.created_at);
    let bytes = serde_json::to_vec_pretty(&document).map_err(|_| IssuerError::StorageError)?;
    atomic_write(destination, &bytes, true)
}

pub(crate) fn restore_backup(
    destination: &Path,
    backup_path: &Path,
) -> Result<LoadedKey, IssuerError> {
    let bytes = fs::read(backup_path).map_err(|_| IssuerError::InvalidKeyBackup)?;
    let document: KeyDocument =
        serde_json::from_slice(&bytes).map_err(|_| IssuerError::InvalidKeyBackup)?;
    let loaded = loaded_from_document(document)?;
    if destination.exists() {
        let existing = load(destination)?;
        if existing.public != loaded.public {
            return Err(IssuerError::KeyMismatch);
        }
    }
    let canonical = document_from_signing_key(&loaded.signing_key, loaded.created_at);
    let canonical_bytes =
        serde_json::to_vec_pretty(&canonical).map_err(|_| IssuerError::StorageError)?;
    atomic_write(destination, &canonical_bytes, true)?;
    load(destination)
}

pub(crate) fn export_public(path: &Path, public: &PublicKeyExport) -> Result<(), IssuerError> {
    let bytes = serde_json::to_vec_pretty(public).map_err(|_| IssuerError::StorageError)?;
    atomic_write(path, &bytes, false)
}

fn document_from_signing_key(signing_key: &SigningKey, created_at: i64) -> KeyDocument {
    KeyDocument {
        schema_version: KEY_DOCUMENT_SCHEMA,
        key_id: KEY_ID.into(),
        algorithm: ALGORITHM.into(),
        created_at,
        private_key: URL_SAFE_NO_PAD.encode(signing_key.to_bytes()),
        public_key: URL_SAFE_NO_PAD.encode(signing_key.verifying_key().to_bytes()),
    }
}

fn loaded_from_document(document: KeyDocument) -> Result<LoadedKey, IssuerError> {
    if document.schema_version != KEY_DOCUMENT_SCHEMA
        || document.key_id != KEY_ID
        || document.algorithm != ALGORITHM
    {
        return Err(IssuerError::InvalidKeyBackup);
    }
    let private_bytes = decode_fixed::<32>(&document.private_key)?;
    let stored_public = decode_fixed::<32>(&document.public_key)?;
    let signing_key = SigningKey::from_bytes(&private_bytes);
    let derived_public: VerifyingKey = signing_key.verifying_key();
    if derived_public.to_bytes() != stored_public {
        return Err(IssuerError::InvalidKeyBackup);
    }
    Ok(LoadedKey {
        public: PublicKeyExport {
            schema_version: KEY_DOCUMENT_SCHEMA,
            key_id: document.key_id,
            algorithm: document.algorithm,
            public_key: document.public_key,
        },
        signing_key,
        created_at: document.created_at,
    })
}

fn decode_fixed<const N: usize>(value: &str) -> Result<[u8; N], IssuerError> {
    URL_SAFE_NO_PAD
        .decode(value)
        .map_err(|_| IssuerError::InvalidKeyBackup)?
        .try_into()
        .map_err(|_| IssuerError::InvalidKeyBackup)
}

pub(crate) fn atomic_write(path: &Path, bytes: &[u8], private: bool) -> Result<(), IssuerError> {
    let parent = path.parent().ok_or(IssuerError::StorageError)?;
    fs::create_dir_all(parent).map_err(|_| IssuerError::StorageError)?;
    let temporary = temporary_path(path);
    let mut file = OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(&temporary)
        .map_err(|_| IssuerError::StorageError)?;
    file.write_all(bytes)
        .map_err(|_| IssuerError::StorageError)?;
    file.sync_all().map_err(|_| IssuerError::StorageError)?;
    if private {
        restrict_private_permissions(&temporary)?;
    }
    drop(file);

    if path.exists() {
        replace_existing(path, &temporary)?;
    } else {
        fs::rename(&temporary, path).map_err(|_| IssuerError::StorageError)?;
    }
    if private {
        restrict_private_permissions(path)?;
    }
    Ok(())
}

fn temporary_path(path: &Path) -> PathBuf {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    path.with_extension(format!("tmp-{}-{nonce}", std::process::id()))
}

#[cfg(unix)]
fn restrict_private_permissions(path: &Path) -> Result<(), IssuerError> {
    use std::os::unix::fs::PermissionsExt;

    fs::set_permissions(path, fs::Permissions::from_mode(0o600))
        .map_err(|_| IssuerError::StorageError)
}

#[cfg(not(unix))]
fn restrict_private_permissions(_path: &Path) -> Result<(), IssuerError> {
    Ok(())
}

#[cfg(not(windows))]
fn replace_existing(path: &Path, temporary: &Path) -> Result<(), IssuerError> {
    fs::rename(temporary, path).map_err(|_| IssuerError::StorageError)
}

#[cfg(windows)]
fn replace_existing(path: &Path, temporary: &Path) -> Result<(), IssuerError> {
    let previous = path.with_extension("previous");
    if previous.exists() {
        fs::remove_file(&previous).map_err(|_| IssuerError::StorageError)?;
    }
    fs::rename(path, &previous).map_err(|_| IssuerError::StorageError)?;
    if fs::rename(temporary, path).is_err() {
        let _ = fs::rename(&previous, path);
        return Err(IssuerError::StorageError);
    }
    let _ = fs::remove_file(previous);
    Ok(())
}
