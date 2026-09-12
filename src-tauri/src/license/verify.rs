use ed25519_dalek::Signature;
use license_protocol::{
    decode_license, LicenseStateKind, LicenseStatus, EDITION, LICENSE_TYPE, PRODUCT_ID,
    SCHEMA_VERSION,
};

use super::{LicenseError, PublicKeyRegistry};

pub fn verify_license(
    raw: &str,
    keys: &PublicKeyRegistry,
    now: i64,
) -> Result<LicenseStatus, LicenseError> {
    let envelope = decode_license(raw).map_err(LicenseError::from)?;
    let verifying_key = keys
        .get(&envelope.payload.key_id)
        .ok_or(LicenseError::UnknownKeyId)?;
    let signature = Signature::from_bytes(&envelope.signature);

    verifying_key
        .verify_strict(&envelope.payload_bytes, &signature)
        .map_err(|_| LicenseError::InvalidSignature)?;

    let payload = envelope.payload;
    if payload.schema_version != SCHEMA_VERSION {
        return Err(LicenseError::UnsupportedSchema);
    }
    if payload.product_id != PRODUCT_ID {
        return Err(LicenseError::WrongProduct);
    }
    if payload.edition != EDITION {
        return Err(LicenseError::UnsupportedEdition);
    }
    if payload.license_type != LICENSE_TYPE {
        return Err(LicenseError::UnsupportedLicenseType);
    }
    if payload
        .expires_at
        .is_some_and(|expires_at| expires_at <= now)
    {
        return Err(LicenseError::Expired);
    }

    Ok(LicenseStatus {
        state: LicenseStateKind::Valid,
        valid: true,
        edition: Some(payload.edition),
        license_type: Some(payload.license_type),
        license_id: Some(payload.license_id),
        issued_at: Some(payload.issued_at),
        expires_at: payload.expires_at,
        features: payload.features,
    })
}
