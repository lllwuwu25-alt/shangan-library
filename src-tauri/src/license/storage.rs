use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
};

use license_protocol::LicenseStatus;

use super::{verify_license, LicenseError, PublicKeyRegistry};

#[derive(Debug, Clone)]
pub struct LicenseStore {
    path: PathBuf,
}

impl LicenseStore {
    pub fn new(path: PathBuf) -> Self {
        Self { path }
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    pub fn read_raw(&self) -> Result<Option<String>, LicenseError> {
        match fs::read_to_string(&self.path) {
            Ok(raw) => Ok(Some(raw)),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(_) => Err(LicenseError::StorageError),
        }
    }

    pub fn write_raw_atomic(&self, raw: &str) -> Result<(), LicenseError> {
        let parent = self.path.parent().ok_or(LicenseError::StorageError)?;
        fs::create_dir_all(parent).map_err(|_| LicenseError::StorageError)?;
        let temporary = self.path.with_extension("dat.tmp");
        let mut file = OpenOptions::new()
            .create(true)
            .truncate(true)
            .write(true)
            .open(&temporary)
            .map_err(|_| LicenseError::StorageError)?;
        file.write_all(raw.as_bytes())
            .and_then(|_| file.sync_all())
            .map_err(|_| LicenseError::StorageError)?;

        #[cfg(windows)]
        if self.path.exists() {
            fs::remove_file(&self.path).map_err(|_| LicenseError::StorageError)?;
        }
        fs::rename(&temporary, &self.path).map_err(|_| LicenseError::StorageError)?;
        Ok(())
    }

    pub fn remove(&self) -> Result<(), LicenseError> {
        match fs::remove_file(&self.path) {
            Ok(()) => Ok(()),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(_) => Err(LicenseError::StorageError),
        }
    }
}

#[derive(Debug, Clone)]
pub struct LicenseService {
    store: LicenseStore,
    keys: PublicKeyRegistry,
}

impl LicenseService {
    pub fn new(store: LicenseStore, keys: PublicKeyRegistry) -> Self {
        Self { store, keys }
    }

    pub fn status(&self, now: i64) -> Result<LicenseStatus, LicenseError> {
        let Some(raw) = self.store.read_raw()? else {
            return Ok(LicenseStatus::missing());
        };

        match verify_license(raw.trim(), &self.keys, now) {
            Ok(status) => Ok(status),
            Err(_) => Ok(LicenseStatus::invalid()),
        }
    }

    pub fn activate(&self, raw: &str, now: i64) -> Result<LicenseStatus, LicenseError> {
        let normalized = raw.trim();
        let _ = verify_license(normalized, &self.keys, now)?;
        self.store.write_raw_atomic(normalized)?;
        let persisted = self.store.read_raw()?.ok_or(LicenseError::StorageError)?;
        verify_license(persisted.trim(), &self.keys, now)
    }

    pub fn deactivate(&self) -> Result<LicenseStatus, LicenseError> {
        self.store.remove()?;
        Ok(LicenseStatus::missing())
    }
}
