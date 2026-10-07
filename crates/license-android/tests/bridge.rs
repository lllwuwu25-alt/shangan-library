use license_android::execute;
use serde_json::{json, Value};

const NOW: i64 = 1_789_200_100;

#[test]
fn bridge_reports_missing_and_rejects_invalid_activation_without_touching_study_data() {
    let dir = tempfile::tempdir().unwrap();
    let study_file = dir.path().join("study.json");
    std::fs::write(&study_file, "keep").unwrap();
    let status: Value =
        serde_json::from_str(&execute("get_license_status", "", dir.path(), NOW)).unwrap();
    assert_eq!(status["status"]["state"], "missing");
    assert_eq!(status["status"]["valid"], false);

    let invalid: Value =
        serde_json::from_str(&execute("activate_license", "bad-code", dir.path(), NOW)).unwrap();
    assert_eq!(invalid["error"]["code"], "INVALID_FORMAT");
    assert!(!dir.path().join("license.dat").exists());

    std::fs::write(dir.path().join("license.dat"), "damaged").unwrap();
    let invalid: Value =
        serde_json::from_str(&execute("get_license_status", "", dir.path(), NOW)).unwrap();
    assert_eq!(invalid["status"]["state"], "invalid");
    let removed: Value =
        serde_json::from_str(&execute("deactivate_license", "", dir.path(), NOW)).unwrap();
    assert_eq!(removed["status"]["state"], "missing");
    assert_eq!(std::fs::read_to_string(study_file).unwrap(), "keep");
}

#[test]
fn bridge_does_not_treat_unknown_commands_or_storage_failure_as_activation() {
    let dir = tempfile::tempdir().unwrap();
    let unknown: Value = serde_json::from_str(&execute("unknown", "", dir.path(), NOW)).unwrap();
    assert_eq!(unknown, json!({ "error": { "code": "STORAGE_ERROR" } }));
    let file = dir.path().join("not-a-directory");
    std::fs::write(&file, "keep").unwrap();
    let failure: Value =
        serde_json::from_str(&execute("get_license_status", "", &file, NOW)).unwrap();
    assert_eq!(failure["error"]["code"], "STORAGE_ERROR");
}
