use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use thiserror::Error;

use crate::LicensePayload;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LicenseEnvelope {
    pub payload: LicensePayload,
    pub payload_bytes: Vec<u8>,
    pub signature: [u8; 64],
}

#[derive(Debug, Clone, Error, PartialEq, Eq)]
pub enum ProtocolError {
    #[error("invalid license format")]
    InvalidFormat,
    #[error("invalid base64url encoding")]
    InvalidEncoding,
    #[error("invalid license payload")]
    InvalidPayload,
}

pub fn encode_payload(payload: &LicensePayload) -> Result<Vec<u8>, ProtocolError> {
    serde_json::to_vec(payload).map_err(|_| ProtocolError::InvalidPayload)
}

pub fn encode_license(payload_bytes: &[u8], signature: &[u8; 64]) -> String {
    format!(
        "SL1.{}.{}",
        URL_SAFE_NO_PAD.encode(payload_bytes),
        URL_SAFE_NO_PAD.encode(signature),
    )
}

pub fn decode_license(raw: &str) -> Result<LicenseEnvelope, ProtocolError> {
    let mut segments = raw.trim().split('.');
    let prefix = segments.next().ok_or(ProtocolError::InvalidFormat)?;
    let payload_segment = segments.next().ok_or(ProtocolError::InvalidFormat)?;
    let signature_segment = segments.next().ok_or(ProtocolError::InvalidFormat)?;

    if prefix != "SL1"
        || payload_segment.is_empty()
        || signature_segment.is_empty()
        || segments.next().is_some()
    {
        return Err(ProtocolError::InvalidFormat);
    }

    let payload_bytes = URL_SAFE_NO_PAD
        .decode(payload_segment)
        .map_err(|_| ProtocolError::InvalidEncoding)?;
    let signature_bytes = URL_SAFE_NO_PAD
        .decode(signature_segment)
        .map_err(|_| ProtocolError::InvalidEncoding)?;
    let signature = signature_bytes
        .try_into()
        .map_err(|_| ProtocolError::InvalidEncoding)?;
    let payload =
        serde_json::from_slice(&payload_bytes).map_err(|_| ProtocolError::InvalidPayload)?;

    Ok(LicenseEnvelope {
        payload,
        payload_bytes,
        signature,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{EDITION, FEATURE_FULL_ACCESS, LICENSE_TYPE, PRODUCT_ID, SCHEMA_VERSION};

    fn payload() -> LicensePayload {
        LicensePayload {
            schema_version: SCHEMA_VERSION,
            key_id: "primary-2026".into(),
            license_id: "0199-test-license".into(),
            product_id: PRODUCT_ID.into(),
            edition: EDITION.into(),
            license_type: LICENSE_TYPE.into(),
            issued_at: 1_789_200_000,
            expires_at: None,
            customer_ref: Some("ORDER-001".into()),
            features: vec![FEATURE_FULL_ACCESS.into()],
        }
    }

    #[test]
    fn round_trips_schema_one_envelope() {
        let payload_bytes = encode_payload(&payload()).unwrap();
        let signature = [7_u8; 64];
        let raw = encode_license(&payload_bytes, &signature);
        let decoded = decode_license(&raw).unwrap();

        assert!(raw.starts_with("SL1."));
        assert!(!raw.contains('='));
        assert_eq!(decoded.payload, payload());
        assert_eq!(decoded.payload_bytes, payload_bytes);
        assert_eq!(decoded.signature, signature);
    }

    #[test]
    fn rejects_empty_and_structurally_invalid_values() {
        assert_eq!(decode_license(""), Err(ProtocolError::InvalidFormat));
        assert_eq!(
            decode_license("SL1.only-two"),
            Err(ProtocolError::InvalidFormat)
        );
        assert_eq!(decode_license("SL2.a.b"), Err(ProtocolError::InvalidFormat));
        assert_eq!(
            decode_license("SL1.a.b.extra"),
            Err(ProtocolError::InvalidFormat)
        );
    }

    #[test]
    fn rejects_padding_and_malformed_base64url() {
        assert_eq!(
            decode_license("SL1.e30=.AAAA"),
            Err(ProtocolError::InvalidEncoding)
        );
        assert_eq!(
            decode_license("SL1.e30.A+AA"),
            Err(ProtocolError::InvalidEncoding)
        );
    }

    #[test]
    fn rejects_malformed_json_and_wrong_signature_length() {
        let malformed_json = format!("SL1.bm90LWpzb24.{}", URL_SAFE_NO_PAD.encode([0_u8; 64]),);
        assert_eq!(
            decode_license(&malformed_json),
            Err(ProtocolError::InvalidPayload)
        );

        let payload_bytes = encode_payload(&payload()).unwrap();
        let short_signature = [1_u8; 63];
        let raw = format!(
            "SL1.{}.{}",
            base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(payload_bytes),
            base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(short_signature),
        );
        assert_eq!(decode_license(&raw), Err(ProtocolError::InvalidEncoding));
    }
}
