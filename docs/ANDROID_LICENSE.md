# Android offline licensing

## One licensing standard

Android and desktop accept the existing `SL1` codes issued by `tools/license-issuer`.
No new issuing tool, product ID, license format, or device binding is introduced.
The Android native crate compiles these desktop sources directly:

- `src-tauri/src/license/verify.rs`: strict Ed25519 verification and business rules
- `src-tauri/src/license/keys.rs`: the production public-key registry
- `src-tauri/src/license/error.rs`: stable error codes
- `src-tauri/src/license/storage.rs`: activation, restart verification, removal
- `crates/license-protocol`: original payload bytes and Base64URL decoding

No JSON reserialization takes place before verification. Updating the desktop public
key with the existing sync script updates the Android verifier as well.
Android pins the same Ed25519 and JSON versions as the current desktop lockfile.
Commit `crates/license-android/Cargo.lock`; CI uses `--locked`.

## Runtime

`ShanganLicense` is a locally registered Capacitor plugin. It calls Rust over JNI.
It reads/writes `license.dat` under Android's private `getFilesDir()` directory.
The WebView cannot supply a storage path. Commands are serialized in the plugin.
Only the raw authorization code is stored, not an `activated=true` flag.

Both native runtimes always require authorization, even in a demo build. Browser
demo mode is unchanged. Missing native libraries and storage failures fail closed.
Removing authorization removes only `license.dat`, not IndexedDB or study data.
Existing Android users keep their study data but must activate once after updating.
An app update with the same application ID and signing certificate preserves both
study data and the license. Uninstalling/clearing app storage may remove both.

## Build

Requirements: Node 22, Java 21, Android SDK, NDK `28.2.13676358`, Rust stable.

```sh
rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android
cargo install cargo-ndk --version 4.1.2 --locked
npm ci
npm run android:sync
cd android
./gradlew assembleDebug
```

Gradle's `buildLicenseVerifier` runs before `preBuild`. It compiles native libraries
for ARM64, ARMv7 and x86_64 into a generated build directory, not into tracked source.
Android Actions installs the toolchain, runs tests and the commercial release guard,
disables demo mode, and checks that all three libraries are present in the APK.
No customer key, signing tool or private signing material is needed by this workflow.

## Verification

```sh
npm test
npm run lint
npm run build
npm run license:check-release
cargo test --locked --manifest-path crates/license-android/Cargo.toml
cargo test --locked --manifest-path src-tauri/Cargo.toml
```

Android reuses the desktop verifier and storage test files, including fixed test-key
codes, original payload byte verification, valid, tampered, expired, unsupported and
unknown-key cases. Additional Android command tests cover response fields, corrupt
stored licenses, removal, storage errors and preserving study data.

Before publishing, test the built APK on Android: offline activation with a desktop-
issued customer code, forced restart, invalid replacement, removal, app upgrade, and
verify all personal files remain. Browser bridge tests cover UI routing only and do
not replace JNI/device testing. Do not ship test keys or test data.
