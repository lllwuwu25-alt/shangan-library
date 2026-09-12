use app_lib::license::{verify_license, LicenseError, PublicKeyRegistry};
use ed25519_dalek::{Signer, SigningKey};
use license_protocol::{
    encode_license, encode_payload, LicensePayload, EDITION, FEATURE_FULL_ACCESS, LICENSE_TYPE,
    PRODUCT_ID, SCHEMA_VERSION,
};
use rand_core::{OsRng, RngCore};

const NOW: i64 = 1_789_200_100;

fn payload() -> LicensePayload {
    LicensePayload {
        schema_version: SCHEMA_VERSION,
        key_id: "primary-2026".into(),
        license_id: "0199-4f3e-test-license".into(),
        product_id: PRODUCT_ID.into(),
        edition: EDITION.into(),
        license_type: LICENSE_TYPE.into(),
        issued_at: 1_789_200_000,
        expires_at: None,
        customer_ref: Some("ORDER-001".into()),
        features: vec![FEATURE_FULL_ACCESS.into()],
    }
}

fn sign(signing_key: &SigningKey, payload: &LicensePayload) -> String {
    let payload_bytes = encode_payload(payload).unwrap();
    let signature = signing_key.sign(&payload_bytes).to_bytes();
    encode_license(&payload_bytes, &signature)
}

fn registry(signing_key: &SigningKey) -> PublicKeyRegistry {
    PublicKeyRegistry::from_entries([("primary-2026", signing_key.verifying_key().to_bytes())])
        .unwrap()
}

fn signing_key() -> SigningKey {
    let mut bytes = [0_u8; 32];
    OsRng.fill_bytes(&mut bytes);
    SigningKey::from_bytes(&bytes)
}

#[test]
fn accepts_a_valid_lifetime_pro_license() {
    let signing_key = signing_key();
    let status = verify_license(
        &sign(&signing_key, &payload()),
        &registry(&signing_key),
        NOW,
    )
    .unwrap();

    assert!(status.valid);
    assert_eq!(status.license_id.as_deref(), Some("0199-4f3e-test-license"));
    assert_eq!(status.edition.as_deref(), Some(EDITION));
    assert_eq!(status.license_type.as_deref(), Some(LICENSE_TYPE));
    assert_eq!(status.features, vec![FEATURE_FULL_ACCESS]);
}

#[test]
fn rejects_payload_field_tampering() {
    let signing_key = signing_key();
    let original = payload();
    let original_bytes = encode_payload(&original).unwrap();
    let signature = signing_key.sign(&original_bytes).to_bytes();
    let keys = registry(&signing_key);

    let mutations: Vec<LicensePayload> = vec![
        LicensePayload {
            edition: "basic".into(),
            ..original.clone()
        },
        LicensePayload {
            product_id: "com.other.app".into(),
            ..original.clone()
        },
        LicensePayload {
            license_id: "changed".into(),
            ..original.clone()
        },
    ];

    for changed in mutations {
        let changed_bytes = encode_payload(&changed).unwrap();
        let tampered = encode_license(&changed_bytes, &signature);
        assert_eq!(
            verify_license(&tampered, &keys, NOW),
            Err(LicenseError::InvalidSignature)
        );
    }
}

#[test]
fn rejects_signature_tampering_and_unstructured_input() {
    let signing_key = signing_key();
    let payload_bytes = encode_payload(&payload()).unwrap();
    let mut signature = signing_key.sign(&payload_bytes).to_bytes();
    signature[8] ^= 0b0000_0001;
    let keys = registry(&signing_key);

    assert_eq!(
        verify_license(&encode_license(&payload_bytes, &signature), &keys, NOW),
        Err(LicenseError::InvalidSignature)
    );
    assert_eq!(
        verify_license("", &keys, NOW),
        Err(LicenseError::InvalidFormat)
    );
    assert_eq!(
        verify_license("random text", &keys, NOW),
        Err(LicenseError::InvalidFormat)
    );
    assert_eq!(
        verify_license("SL1.e30=.AAAA", &keys, NOW),
        Err(LicenseError::InvalidEncoding)
    );
}

#[test]
fn rejects_signed_but_unsupported_business_rules() {
    let signing_key = signing_key();
    let keys = registry(&signing_key);
    let base = payload();

    let cases = [
        (
            LicensePayload {
                schema_version: 2,
                ..base.clone()
            },
            LicenseError::UnsupportedSchema,
        ),
        (
            LicensePayload {
                product_id: "com.other.app".into(),
                ..base.clone()
            },
            LicenseError::WrongProduct,
        ),
        (
            LicensePayload {
                edition: "basic".into(),
                ..base.clone()
            },
            LicenseError::UnsupportedEdition,
        ),
        (
            LicensePayload {
                license_type: "subscription".into(),
                ..base.clone()
            },
            LicenseError::UnsupportedLicenseType,
        ),
        (
            LicensePayload {
                expires_at: Some(NOW - 1),
                ..base
            },
            LicenseError::Expired,
        ),
    ];

    for (candidate, expected) in cases {
        assert_eq!(
            verify_license(&sign(&signing_key, &candidate), &keys, NOW),
            Err(expected)
        );
    }
}

#[test]
fn rejects_an_unknown_key_before_verification() {
    let signing_key = signing_key();
    let candidate = LicensePayload {
        key_id: "primary-2099".into(),
        ..payload()
    };

    assert_eq!(
        verify_license(
            &sign(&signing_key, &candidate),
            &registry(&signing_key),
            NOW
        ),
        Err(LicenseError::UnknownKeyId),
    );
}
