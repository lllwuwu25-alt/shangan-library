use client_app::license::{verify_license, LicenseError, PublicKeyRegistry};
use license_issuer::{IssueLicenseRequest, IssuerError, IssuerService, KeyState};
use license_protocol::{decode_license, encode_license, encode_payload};
use tempfile::tempdir;
use uuid::Version;

const NOW: i64 = 1_789_200_000;

#[test]
fn a_missing_key_stays_missing_until_explicit_initialization() {
    let directory = tempdir().unwrap();
    let issuer = IssuerService::new(directory.path());

    assert_eq!(issuer.state().unwrap().key_state, KeyState::Missing);
    assert_eq!(
        issuer.issue_license(request("ORDER-001", "微信"), NOW),
        Err(IssuerError::KeyMissing),
    );
    assert_eq!(issuer.state().unwrap().key_state, KeyState::Missing);
    assert!(!directory.path().join("license-private.key").exists());
}

#[test]
fn issued_licenses_are_unique_client_compatible_and_independent_from_records() {
    let directory = tempdir().unwrap();
    let issuer = IssuerService::new(directory.path());
    let initialized = issuer.initialize_key_system(NOW).unwrap();

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;

        let mode = std::fs::metadata(directory.path().join("license-private.key"))
            .unwrap()
            .permissions()
            .mode()
            & 0o777;
        assert_eq!(mode, 0o600);
    }

    let first = issuer
        .issue_license(request("ORDER-ABC", "Xiaohongshu"), NOW)
        .unwrap();
    let second = issuer
        .issue_license(request("ORDER-DEF", "微信"), NOW + 1)
        .unwrap();

    let first_uuid = uuid::Uuid::parse_str(&first.record.license_id).unwrap();
    let second_uuid = uuid::Uuid::parse_str(&second.record.license_id).unwrap();
    assert_eq!(first_uuid.get_version(), Some(Version::SortRand));
    assert_eq!(second_uuid.get_version(), Some(Version::SortRand));
    assert_ne!(first.record.license_id, second.record.license_id);

    let public_key = initialized.public_key_bytes().unwrap();
    let registry =
        PublicKeyRegistry::from_entries([(initialized.key_id.clone(), public_key)]).unwrap();
    assert!(
        verify_license(&first.license, &registry, NOW)
            .unwrap()
            .valid
    );
    assert!(
        verify_license(&second.license, &registry, NOW)
            .unwrap()
            .valid
    );

    let envelope = decode_license(&first.license).unwrap();
    let mut tampered_payload = envelope.payload;
    tampered_payload.customer_ref = Some("ORDER-TAMPERED".into());
    let tampered = encode_license(
        &encode_payload(&tampered_payload).unwrap(),
        &envelope.signature,
    );
    assert_eq!(
        verify_license(&tampered, &registry, NOW),
        Err(LicenseError::InvalidSignature),
    );

    issuer.delete_record(&first.record.license_id).unwrap();
    assert!(
        verify_license(&first.license, &registry, NOW)
            .unwrap()
            .valid
    );
    assert_eq!(issuer.search_records("order-abc").unwrap(), Vec::new());
    assert_eq!(issuer.search_records("XIAOHONGSHU").unwrap().len(), 0);
    assert_eq!(issuer.search_records("微信").unwrap().len(), 1);

    let restarted = IssuerService::new(directory.path());
    let third = restarted
        .issue_license(request("ORDER-GHI", "其他"), NOW + 2)
        .unwrap();
    assert!(
        verify_license(&third.license, &registry, NOW)
            .unwrap()
            .valid
    );
}

#[test]
fn issuance_rejects_unsafe_or_oversized_operational_notes() {
    let directory = tempdir().unwrap();
    let issuer = IssuerService::new(directory.path());
    issuer.initialize_key_system(NOW).unwrap();

    assert_eq!(
        issuer.issue_license(request("ORDER\n001", "微信"), NOW),
        Err(IssuerError::InvalidInput),
    );
    assert_eq!(
        issuer.issue_license(request("ORDER-001", &"渠道".repeat(50)), NOW),
        Err(IssuerError::InvalidInput),
    );
}

#[test]
fn restoring_a_private_backup_reproduces_the_same_public_key() {
    let source_directory = tempdir().unwrap();
    let source = IssuerService::new(source_directory.path());
    let initialized = source.initialize_key_system(NOW).unwrap();
    let backup_directory = tempdir().unwrap();
    let backup_path = backup_directory.path().join("root-key-backup.private.key");
    source
        .export_private_key_backup(&backup_path, "EXPORT_PRIVATE_KEY")
        .unwrap();

    let restored_directory = tempdir().unwrap();
    let restored = IssuerService::new(restored_directory.path());
    assert_eq!(restored.state().unwrap().key_state, KeyState::Missing);
    let restored_public = restored.restore_private_key_backup(&backup_path).unwrap();

    assert_eq!(restored_public, initialized);
    assert_eq!(restored.state().unwrap().key_state, KeyState::Ready);
}

#[test]
fn restoring_over_an_existing_system_rejects_a_different_root_key() {
    let current_directory = tempdir().unwrap();
    let current = IssuerService::new(current_directory.path());
    let original_public = current.initialize_key_system(NOW).unwrap();

    let other_directory = tempdir().unwrap();
    let other = IssuerService::new(other_directory.path());
    other.initialize_key_system(NOW).unwrap();
    let backup_directory = tempdir().unwrap();
    let backup_path = backup_directory.path().join("other-root.private.key");
    other
        .export_private_key_backup(&backup_path, "EXPORT_PRIVATE_KEY")
        .unwrap();

    assert_eq!(
        current.restore_private_key_backup(&backup_path),
        Err(IssuerError::KeyMismatch),
    );
    assert_eq!(current.state().unwrap().public_key, Some(original_public),);
}

fn request(customer_ref: &str, channel: &str) -> IssueLicenseRequest {
    IssueLicenseRequest {
        customer_ref: Some(customer_ref.into()),
        channel: channel.into(),
    }
}
