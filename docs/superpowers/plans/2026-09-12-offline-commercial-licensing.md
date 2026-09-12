# Offline Commercial Licensing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `v0.7.0` of 上岸资料库 with a fully offline Ed25519 desktop license gate and a separate local-only license issuer application.

**Architecture:** A small Rust `license-protocol` crate owns the versioned payload and SL1 encoding without signing capabilities. The customer Tauri app owns public-key verification, license-file storage, and commands; a separate Tauri issuer owns private-key generation and signing. React renders the desktop gate and authorization status while the non-Tauri GitHub Pages build remains an explicitly marked demo.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Zustand 5, Tauri 2.11.3, Rust 2021, ed25519-dalek, base64, serde_json, thiserror, uuid v7, chrono.

**Spec:** `docs/superpowers/specs/2026-09-12-offline-commercial-licensing-design.md`

## Global Constraints

- Product name remains `上岸资料库` and Bundle ID remains `com.shangan.library`.
- First commercial release version is `0.7.0`.
- Desktop authorization is always decided by Rust verification of the raw license; no localStorage boolean is an authority.
- GitHub Pages is usable only when `VITE_DEMO_MODE=true` and the runtime is not Tauri.
- Client source, customer installers, CI, logs, and public releases contain no private key or signing API.
- License storage is isolated from all business data, backup, restore, and clear-data operations.
- V1 is lifetime Pro, completely offline, cross-platform, and has no hardware binding, subscription, revocation, or time-tamper feature.
- Official key generation happens only after tests pass and requires an explicit developer action in the local issuer.

---

### Task 1: Precheck, Versioning, and Shared License Protocol

**Files:**
- Create: `docs/LICENSE_PRECHECK.md`
- Create: `crates/license-protocol/Cargo.toml`
- Create: `crates/license-protocol/src/lib.rs`
- Create: `crates/license-protocol/src/model.rs`
- Create: `crates/license-protocol/src/encoding.rs`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/tauri.conf.json`

**Interfaces:**
- Produces: `LicensePayload`, `LicenseStatus`, `LicenseStateKind`, `LicenseEnvelope`, `ProtocolError`, `encode_payload`, `decode_license`, and constants `SCHEMA_VERSION`, `PRODUCT_ID`, `EDITION`, `LICENSE_TYPE`, `FEATURE_FULL_ACCESS`.
- License envelope signature covers the exact Base64URL-decoded JSON payload bytes.

- [x] **Step 1: Write protocol tests before implementation**

Add unit tests in `crates/license-protocol/src/encoding.rs` asserting that a schema-1 payload round-trips through `SL1.<payload>.<signature>`, padding characters are rejected, an empty string returns `InvalidFormat`, malformed Base64URL returns `InvalidEncoding`, malformed JSON returns `InvalidPayload`, and signatures must decode to exactly 64 bytes.

- [x] **Step 2: Run the protocol tests and confirm failure**

Run: `cargo test --manifest-path crates/license-protocol/Cargo.toml`

Expected: FAIL because the crate and public interfaces do not yet exist.

- [x] **Step 3: Implement the minimal shared protocol**

Define the payload exactly as:

```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LicensePayload {
    pub schema_version: u8,
    pub key_id: String,
    pub license_id: String,
    pub product_id: String,
    pub edition: String,
    pub license_type: String,
    pub issued_at: i64,
    pub expires_at: Option<i64>,
    pub customer_ref: Option<String>,
    pub features: Vec<String>,
}
```

`decode_license` splits into exactly three non-empty segments, requires prefix `SL1`, uses `base64::engine::general_purpose::URL_SAFE_NO_PAD`, retains the original payload bytes for signature verification, and parses JSON only into `LicensePayload`. The crate must not depend on `ed25519-dalek`.

- [x] **Step 4: Record the source audit and bump the app version**

Write the actual React/Zustand/Tauri/localStorage/IndexedDB/plugin/build findings to `docs/LICENSE_PRECHECK.md`. Change all product version fields from `0.6.1` to `0.7.0` without changing the application name, identifier, data keys, or directory strategy.

- [x] **Step 5: Run protocol and frontend checks**

Run: `cargo test --manifest-path crates/license-protocol/Cargo.toml`

Expected: all protocol tests PASS.

Run: `npm run build`

Expected: TypeScript and Vite build PASS with version `0.7.0`.

- [x] **Step 6: Commit**

```bash
git add docs/LICENSE_PRECHECK.md crates/license-protocol package.json package-lock.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "feat: define offline license protocol"
```

### Task 2: Customer Rust Verifier and Stable Error Model

**Files:**
- Create: `src-tauri/src/license/mod.rs`
- Create: `src-tauri/src/license/error.rs`
- Create: `src-tauri/src/license/keys.rs`
- Create: `src-tauri/src/license/verify.rs`
- Create: `src-tauri/tests/license_verification.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/Cargo.toml`

**Interfaces:**
- Consumes: `license_protocol::decode_license` and `LicensePayload`.
- Produces: `verify_license(raw: &str, keys: &PublicKeyRegistry, now: i64) -> Result<LicenseStatus, LicenseError>` and `PublicKeyRegistry::from_entries`.
- `LicenseError` serializes stable codes: `MISSING`, `INVALID_FORMAT`, `INVALID_ENCODING`, `INVALID_PAYLOAD`, `INVALID_SIGNATURE`, `UNSUPPORTED_SCHEMA`, `UNKNOWN_KEY_ID`, `WRONG_PRODUCT`, `UNSUPPORTED_EDITION`, `UNSUPPORTED_LICENSE_TYPE`, `EXPIRED`, `STORAGE_ERROR`.

- [x] **Step 1: Write failing verifier tests with generated in-memory keys**

Use `ed25519_dalek::SigningKey::generate(&mut OsRng)` only inside `src-tauri/tests`. Generate signed envelopes at test runtime and assert PASS for a valid license plus FAIL for modified payload bytes, edition, product ID, License ID, signature, random text, empty input, malformed Base64URL, unknown schema, unknown key ID, wrong product, wrong edition/type, and expired payload.

- [x] **Step 2: Run the verifier test and confirm failure**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --test license_verification`

Expected: FAIL because the client license module is absent.

- [x] **Step 3: Implement public-key-only verification**

Implement a registry keyed by `key_id`. Parse enough payload to select the public key, verify the signature over the untouched payload bytes, and only then apply semantic checks. Production `ACTIVE_PUBLIC_KEYS` starts empty until the formal public-key sync; tests inject their runtime public key and never write a private key to disk.

- [x] **Step 4: Register the module without exposing signing**

Add `mod license;` to `src-tauri/src/lib.rs`. Ensure non-test client dependencies enable only Ed25519 verification APIs and no source under `src-tauri/src` imports `SigningKey`.

- [x] **Step 5: Run tests and client-source security search**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --test license_verification`

Expected: all cases PASS.

Run: `rg -n "SigningKey|private_key|sign_license|generate_license|generate_keypair" src-tauri/src`

Expected: no matches.

- [x] **Step 6: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/src src-tauri/tests/license_verification.rs
git commit -m "feat: verify customer licenses in Rust"
```

### Task 3: License Storage, Runtime State, and Tauri Commands

**Files:**
- Create: `src-tauri/src/license/storage.rs`
- Create: `src-tauri/src/license/commands.rs`
- Create: `src-tauri/tests/license_storage.rs`
- Modify: `src-tauri/src/license/mod.rs`
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Produces: `LicenseStore::new(PathBuf)`, `read_raw`, `write_raw_atomic`, `remove`; Tauri commands `activate_license`, `get_license_status`, `deactivate_license`.
- Commands return `LicenseStatus` or a serializable `LicenseCommandError { code, message }` and never return public keys, signatures, raw licenses, or storage paths.

- [x] **Step 1: Write failing storage lifecycle tests**

Use a temporary directory and injected verifier registry. Assert Missing on first read, Valid after activation, Valid after reconstructing runtime state to simulate restart, Invalid after mutating `license.dat`, Missing after deletion, and unchanged sentinel business-data files throughout.

- [x] **Step 2: Run the storage test and confirm failure**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --test license_storage`

Expected: FAIL because storage and commands do not exist.

- [x] **Step 3: Implement isolated atomic storage**

Resolve `app.path().app_config_dir()?.join("license.dat")`, create only that parent directory, write to a temporary sibling, flush, and rename. Trim surrounding whitespace on activation but preserve the complete SL1 string. `deactivate_license` removes only `license.dat`; a missing file is success.

- [x] **Step 4: Register commands and startup state**

Register all three commands using `tauri::generate_handler!`. Runtime state may cache a verified status for the current process, but `get_license_status` on startup must read and verify the raw file before reporting Valid.

- [x] **Step 5: Run all Rust client tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`

Expected: protocol, verifier, storage, and command-domain tests PASS.

- [x] **Step 6: Commit**

```bash
git add src-tauri/src src-tauri/tests
git commit -m "feat: persist and expose offline license status"
```

### Task 4: React License Gate and Authorization UI

**Files:**
- Create: `src/features/license/types.ts`
- Create: `src/features/license/runtime.ts`
- Create: `src/features/license/messages.ts`
- Create: `src/features/license/licenseClient.ts`
- Create: `src/features/license/LicenseGate.tsx`
- Create: `src/features/license/LicenseActivation.tsx`
- Create: `src/features/license/LicenseStatusPanel.tsx`
- Create: `src/features/license/license.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/pages/Settings.tsx`
- Modify: `src/components/Layout.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Produces: `isTauriRuntime()`, `getLicenseStatus()`, `activateLicense(raw)`, `deactivateLicense()`, and `LicenseGate`.
- `LicenseGate` accepts `children: ReactNode`; Tauri Missing/Invalid renders activation, Valid renders children, non-Tauri demo renders children with a demo marker, and non-demo Web renders a desktop-only message.

- [x] **Step 1: Write failing policy and message tests**

Test pure runtime-policy resolution for desktop valid/missing/error, Web demo, and accidental non-demo Web builds. Test every Rust error code maps to a human-readable Chinese message and unknown errors map to a generic retry/copy-completeness message.

- [x] **Step 2: Run tests and confirm failure**

Run: `npm test -- src/features/license/license.test.ts`

Expected: FAIL because license frontend modules do not exist.

- [x] **Step 3: Implement Tauri IPC client and gate**

Use dynamic import of `@tauri-apps/api/core` only inside confirmed Tauri runtime paths. Never write license status or raw license to localStorage. Render an initial checking state to avoid flashing the full app before verification.

- [x] **Step 4: Implement activation and success states**

Use a multiline paste field that does not visually truncate long codes, one primary Activate button, local-only privacy copy, loading/disabled states, keyboard-safe focus, and an activation-success state showing Pro/lifetime before the user enters the app.

- [x] **Step 5: Add authorization status to Settings**

Display edition, active state, lifetime type, License ID, app version, copy License ID, and a subdued remove action with confirmation. The remove action calls only the license command and must not call `resetData`, IndexedDB deletion, backup, or restore functions.

- [x] **Step 6: Integrate the Gate above the existing app shell**

Wrap the existing route/page application in `LicenseGate` before `Layout` renders. Add a compact “网页演示版” marker to non-Tauri demo builds and confirm the existing PageTransition behavior remains inside the unlocked app.

- [x] **Step 7: Verify frontend behavior**

Run: `npm test`

Expected: all existing knowledge-tree and license policy tests PASS.

Run: `npm run lint`

Expected: no lint errors.

Run: `npm run build` and `npm run build:web-demo`

Expected: both production and demo builds PASS; only demo mode can open the non-Tauri app.

- [x] **Step 8: Commit**

```bash
git add src/App.tsx src/components/Layout.tsx src/pages/Settings.tsx src/index.css src/features/license
git commit -m "feat: gate desktop app behind offline activation"
```

### Task 5: Independent License Issuer Backend

**Files:**
- Create: `tools/license-issuer/package.json`
- Create: `tools/license-issuer/package-lock.json`
- Create: `tools/license-issuer/src-tauri/Cargo.toml`
- Create: `tools/license-issuer/src-tauri/build.rs`
- Create: `tools/license-issuer/src-tauri/tauri.conf.json`
- Create: `tools/license-issuer/src-tauri/capabilities/default.json`
- Create: `tools/license-issuer/src-tauri/src/main.rs`
- Create: `tools/license-issuer/src-tauri/src/lib.rs`
- Create: `tools/license-issuer/src-tauri/src/key_store.rs`
- Create: `tools/license-issuer/src-tauri/src/issuer.rs`
- Create: `tools/license-issuer/src-tauri/src/records.rs`
- Create: `tools/license-issuer/src-tauri/src/commands.rs`
- Create: `tools/license-issuer/src-tauri/tests/issuer_flow.rs`
- Modify: `.gitignore`

**Interfaces:**
- Produces commands: `get_issuer_state`, `initialize_key_system`, `issue_license`, `search_records`, `export_public_key`, `export_private_key_backup`, `restore_private_key_backup`.
- `issue_license` always emits schema 1, key `primary-2026`, product `com.shangan.library`, edition `pro`, type `lifetime`, feature `full_access`, UUIDv7 license ID, current Unix timestamp, and no expiry.

- [ ] **Step 1: Add secret exclusions before key code**

Ignore `*.private.key`, `private.key`, `license-private.key`, `license-secrets/`, `license-issuer-data/`, `license-exports/`, and issuer-local generated outputs. Confirm no ignored path overlaps source or public-key fixtures.

- [ ] **Step 2: Write failing issuer-domain tests**

Generate keys only in temporary test directories. Assert two issued licenses have unique UUIDv7 IDs and both verify through the client-compatible public verifier; tampering fails; deleting a record does not affect verification; restarting with the same key still signs compatible licenses; a missing key returns `KEY_MISSING` and never regenerates silently; restoring a backup reproduces the same public key.

- [ ] **Step 3: Run issuer tests and confirm failure**

Run: `cargo test --manifest-path tools/license-issuer/src-tauri/Cargo.toml`

Expected: FAIL because issuer modules are absent.

- [ ] **Step 4: Implement private-key storage and permissions**

Store the private key beneath the issuer app config directory, never beneath the repository. Use atomic writes and set Unix file mode `0600`. Store the key ID and public key alongside metadata needed to detect mismatched restores. A missing key must remain missing until the explicit initialize or restore command runs.

- [ ] **Step 5: Implement issuance and local records**

Sign exact shared-protocol payload bytes with Ed25519. Save records atomically in a versioned JSON document and support case-insensitive search by License ID, customer reference, and channel. Validate customer references and channels as short non-sensitive text and never log the raw license.

- [ ] **Step 6: Implement safe key import/export commands**

Private-key backup export requires an explicit confirmation token from the UI and writes only to a developer-chosen path. Restore validates the key length and derived public key before replacement. Public export contains key ID, algorithm, and Base64URL public key only.

- [ ] **Step 7: Run issuer tests and secret scan**

Run: `cargo test --manifest-path tools/license-issuer/src-tauri/Cargo.toml`

Expected: all issuer flow tests PASS.

Run: `git ls-files | rg "private\.key|license-secrets|license-issuer-data|license-exports"`

Expected: no secret or issuer-data file is tracked.

- [ ] **Step 8: Commit**

```bash
git add .gitignore tools/license-issuer/package.json tools/license-issuer/package-lock.json tools/license-issuer/src-tauri
git commit -m "feat: add isolated license issuer backend"
```

### Task 6: License Issuer Desktop UI

**Files:**
- Create: `tools/license-issuer/index.html`
- Create: `tools/license-issuer/tsconfig.json`
- Create: `tools/license-issuer/vite.config.ts`
- Create: `tools/license-issuer/src/main.tsx`
- Create: `tools/license-issuer/src/App.tsx`
- Create: `tools/license-issuer/src/api.ts`
- Create: `tools/license-issuer/src/styles.css`
- Create: `tools/license-issuer/src/types.ts`

**Interfaces:**
- Consumes the Task 5 commands and displays no private-key bytes except during an explicit developer-selected export operation.
- Produces an initialization/recovery screen, issuance form, generated-license result, searchable history, and key-management section.

- [ ] **Step 1: Scaffold the isolated Vite/React frontend**

Configure issuer scripts `dev`, `build`, `tauri`, `desktop:dev`, and `desktop:build`; use its own package lock and Tauri identifier `com.shangan.library.license-issuer`. Do not reference issuer scripts from customer `desktop:build`.

- [ ] **Step 2: Implement the key-missing startup flow**

Show only “恢复已有私钥” and a guarded “初始化新的授权体系”. Initialization requires the developer to retype `创建新的授权体系` and then shows the documented loss/leak warnings plus immediate backup guidance.

- [ ] **Step 3: Implement issuance and result UI**

Provide fixed “永久 Pro”, order note, sales channel choices 微信/小红书/其他, and Generate. The result shows License ID, full wrapping SL1 license string, one-click copy, and generation time with success/error feedback.

- [ ] **Step 4: Implement history and key management**

Add search, copy original license, public-key export, private-key backup, and private-key restore. Destructive key restore requires explicit confirmation and a post-restore public-key comparison result.

- [ ] **Step 5: Build and lint the issuer**

Run: `npm ci --prefix tools/license-issuer`

Run: `npm run build --prefix tools/license-issuer`

Expected: TypeScript and Vite issuer build PASS.

Run: `cargo test --manifest-path tools/license-issuer/src-tauri/Cargo.toml`

Expected: issuer backend tests remain PASS.

- [ ] **Step 6: Commit**

```bash
git add tools/license-issuer
git commit -m "feat: build developer license issuer app"
```

### Task 7: Public-Key Sync, Release Guard, and Operations Documentation

**Files:**
- Create: `scripts/sync-license-public-key.mjs`
- Create: `scripts/check-license-release.mjs`
- Create: `docs/LICENSE_ARCHITECTURE.md`
- Create: `docs/LICENSE_KEY_MANAGEMENT.md`
- Create: `docs/LICENSE_KEY_BACKUP_GUIDE.md`
- Create: `docs/LICENSE_RELEASE_PROCESS.md`
- Modify: `package.json`
- Modify: `.github/workflows/desktop-build.yml`
- Modify: `.github/workflows/pwa-pages.yml`

**Interfaces:**
- Produces npm scripts `license:sync-public-key` and `license:check-release`.
- Sync input is a public export containing exactly key ID `primary-2026`, algorithm `Ed25519`, and one 32-byte Base64URL no-padding public key.

- [ ] **Step 1: Write script tests for public-only sync validation**

Use Node tests with temporary files to assert valid public export is accepted; malformed length, padding, unexpected fields, private-key-looking fields, wrong key ID, and wrong algorithm are rejected without modifying the destination.

- [ ] **Step 2: Implement atomic public-key sync**

Parse JSON structurally, reject any property whose normalized name contains `private`, `secret`, or `signing`, decode exactly 32 bytes, and atomically update only the generated public registry block in `src-tauri/src/license/keys.rs`.

- [ ] **Step 3: Implement the release guard**

Fail customer builds when `ACTIVE_PUBLIC_KEYS` has no `primary-2026` key, when client source contains signing/private-key APIs, when tracked filenames resemble secret outputs, or when package/Tauri/Cargo versions differ from `0.7.0`. Do not print key material or license strings.

- [ ] **Step 4: Harden CI separation**

Run `npm run license:check-release` before all three customer desktop builds. Keep issuer directories out of artifact paths. Keep Pages explicitly on demo mode and document that the demo switch is ignored by Tauri runtime policy.

- [ ] **Step 5: Write operational documentation**

Document architecture, exact client and issuer storage locations by OS, official key initialization, two-copy offline backup, restore rehearsal, public-key sync, first-license generation, customer activation, key rotation, release sequence, old `v0.6.1` limitation, and the limits of an offline unbound license.

- [ ] **Step 6: Run script tests**

Run: `npm test`

Expected: sync guard tests and all existing frontend tests PASS.

- [ ] **Step 7: Commit**

```bash
git add scripts package.json .github/workflows docs/LICENSE_ARCHITECTURE.md docs/LICENSE_KEY_MANAGEMENT.md docs/LICENSE_KEY_BACKUP_GUIDE.md docs/LICENSE_RELEASE_PROCESS.md
git commit -m "chore: secure commercial license release flow"
```

### Task 8: Full Verification, Official Key Ceremony, and Release Readiness

**Files:**
- Create: `docs/LICENSE_TEST_REPORT.md`
- Create: `docs/LICENSE_IMPLEMENTATION_REPORT.md`
- Modify after explicit local initialization: `src-tauri/src/license/keys.rs`

**Interfaces:**
- Consumes the locally exported official public key only; no command reads or copies the official private key into the repository.
- Produces a release-ready customer source tree and local developer issuer installation.

- [ ] **Step 1: Run all pre-key verification**

Run: `npm test`, `npm run lint`, `npm run build`, `npm run build:web-demo`, `cargo test --manifest-path crates/license-protocol/Cargo.toml`, `cargo test --manifest-path src-tauri/Cargo.toml`, `npm run build --prefix tools/license-issuer`, and `cargo test --manifest-path tools/license-issuer/src-tauri/Cargo.toml`.

Expected: all commands PASS; release guard alone reports that the official public key is not yet synchronized.

- [ ] **Step 2: Build and open the local issuer for explicit initialization**

Run the issuer locally and require the developer to click the guarded initialization control. Immediately export an offline private-key backup and a public-key document. Do not automate or simulate this confirmation.

- [ ] **Step 3: Sync only the official public key**

Run: `npm run license:sync-public-key -- --input <developer-selected-public-key-export>`

Expected: only `src-tauri/src/license/keys.rs` changes, and `git status` shows no private key, issuer record, or export directory.

- [ ] **Step 4: Generate and verify the first official license**

Use the issuer UI to create one non-customer acceptance license with a non-sensitive test order reference. Activate a local customer desktop build, restart it, confirm it remains valid, remove authorization, and confirm all pre-existing learning data remains intact.

- [ ] **Step 5: Run final security audit**

Search tracked client source and built customer artifacts for `private_key`, `SigningKey`, `sign_license`, `generate_license`, `generate_keypair`, `isLicensed`, `isPro`, `bypass`, `secret`, raw SL1 test strings, and private-key filenames. Review every match and record evidence without copying sensitive bytes into the report.

- [ ] **Step 6: Run final build matrix available locally**

Run all checks from Step 1, `npm run license:check-release`, and `npm run desktop:build -- --bundles dmg` on macOS. Confirm the app name, version `0.7.0`, identifier, both existing file-management plugins, user-data continuity, activation gate, and DMG creation. Windows x64 is validated through the GitHub Actions matrix after push.

- [ ] **Step 7: Write reports**

`docs/LICENSE_TEST_REPORT.md` records each command, result, platform, integration scenario, and remaining limitation. `docs/LICENSE_IMPLEMENTATION_REPORT.md` records detected stack/storage, changed files, verification flow, non-secret storage locations, issuer startup, first-license procedure, backup procedure, customer activation, build results, and known limitations.

- [ ] **Step 8: Commit the public key and reports**

```bash
git add src-tauri/src/license/keys.rs docs/LICENSE_TEST_REPORT.md docs/LICENSE_IMPLEMENTATION_REPORT.md
git commit -m "release: prepare v0.7.0 commercial licensing"
```

- [ ] **Step 9: Release only after explicit packaging approval**

Remove public `v0.6.1` installer assets, push `main`, create tag `v0.7.0`, and let GitHub Actions publish only the three customer installers. Keep the issuer, private-key backup, issuer database, and acceptance license out of the release.
