use std::fs;

use app_lib::license::{LicenseService, LicenseStore, PublicKeyRegistry};
use ed25519_dalek::{Signer, SigningKey};
use license_protocol::{
    encode_license, encode_payload, LicensePayload, LicenseStateKind, EDITION, FEATURE_FULL_ACCESS,
    LICENSE_TYPE, PRODUCT_ID, SCHEMA_VERSION,
};
use rand_core::{OsRng, RngCore};

const NOW: i64 = 1_789_200_100;

fn fixture() -> (SigningKey, PublicKeyRegistry) {
    let mut bytes = [0_u8; 32];
    OsRng.fill_bytes(&mut bytes);
    let signing_key = SigningKey::from_bytes(&bytes);
    let registry =
        PublicKeyRegistry::from_entries([("primary-2026", signing_key.verifying_key().to_bytes())])
            .unwrap();
    (signing_key, registry)
}

fn signed_license(signing_key: &SigningKey) -> String {
    let payload = LicensePayload {
        schema_version: SCHEMA_VERSION,
        key_id: "primary-2026".into(),
        license_id: "0199-storage-test".into(),
        product_id: PRODUCT_ID.into(),
        edition: EDITION.into(),
        license_type: LICENSE_TYPE.into(),
        issued_at: NOW - 100,
        expires_at: None,
        customer_ref: Some("STORAGE-TEST".into()),
        features: vec![FEATURE_FULL_ACCESS.into()],
    };
    let bytes = encode_payload(&payload).unwrap();
    encode_license(&bytes, &signing_key.sign(&bytes).to_bytes())
}

#[test]
fn persists_reverifies_and_removes_only_the_license_file() {
    let temp = tempfile::tempdir().unwrap();
    let config_dir = temp.path().join("config");
    let business_data = temp.path().join("study-data.json");
    fs::write(&business_data, br#"{"tasks":["keep"]}"#).unwrap();

    let (signing_key, registry) = fixture();
    let store = LicenseStore::new(config_dir.join("license.dat"));
    let service = LicenseService::new(store.clone(), registry.clone());

    assert_eq!(
        service.status(NOW).unwrap().state,
        LicenseStateKind::Missing
    );

    let active = service
        .activate(&signed_license(&signing_key), NOW)
        .unwrap();
    assert_eq!(active.state, LicenseStateKind::Valid);
    assert!(active.valid);

    let restarted = LicenseService::new(store.clone(), registry);
    assert_eq!(
        restarted.status(NOW).unwrap().state,
        LicenseStateKind::Valid
    );

    let mut damaged = store.read_raw().unwrap().unwrap();
    damaged.push('x');
    fs::write(store.path(), damaged).unwrap();
    assert_eq!(
        restarted.status(NOW).unwrap().state,
        LicenseStateKind::Invalid
    );

    restarted.deactivate().unwrap();
    assert_eq!(
        restarted.status(NOW).unwrap().state,
        LicenseStateKind::Missing
    );
    assert!(!store.path().exists());
    assert_eq!(
        fs::read_to_string(business_data).unwrap(),
        r#"{"tasks":["keep"]}"#
    );
}
