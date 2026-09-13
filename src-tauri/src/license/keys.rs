use std::collections::HashMap;

use ed25519_dalek::VerifyingKey;

use super::LicenseError;

#[derive(Debug, Clone)]
pub struct PublicKeyRegistry {
    keys: HashMap<String, VerifyingKey>,
}

impl PublicKeyRegistry {
    pub fn from_entries<I, K>(entries: I) -> Result<Self, LicenseError>
    where
        I: IntoIterator<Item = (K, [u8; 32])>,
        K: Into<String>,
    {
        let mut keys = HashMap::new();
        for (key_id, bytes) in entries {
            let key = VerifyingKey::from_bytes(&bytes).map_err(|_| LicenseError::InvalidPayload)?;
            keys.insert(key_id.into(), key);
        }
        Ok(Self { keys })
    }

    pub fn get(&self, key_id: &str) -> Option<&VerifyingKey> {
        self.keys.get(key_id)
    }
}

// LICENSE_PUBLIC_KEYS_START
pub const ACTIVE_PUBLIC_KEYS: &[(&str, [u8; 32])] = &[("primary-2026", [40, 132, 46, 90, 142, 252, 86, 229, 66, 243, 76, 225, 39, 253, 2, 175, 26, 49, 153, 42, 85, 117, 115, 147, 240, 15, 206, 134, 244, 120, 152, 94])];
// LICENSE_PUBLIC_KEYS_END

pub fn active_public_keys() -> Result<PublicKeyRegistry, LicenseError> {
    PublicKeyRegistry::from_entries(ACTIVE_PUBLIC_KEYS.iter().copied())
}
