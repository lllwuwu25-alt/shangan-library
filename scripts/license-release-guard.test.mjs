import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { checkRelease } from './check-license-release.mjs'

test('accepts a version-aligned public-verification-only customer build', () => {
  const root = releaseFixture()
  assert.deepEqual(checkRelease({ root, trackedFiles: [] }), [])
})

test('rejects missing production public key', () => {
  const root = releaseFixture({ keys: 'pub const ACTIVE_PUBLIC_KEYS: &[(&str, [u8; 32])] = &[];' })
  assert.match(checkRelease({ root, trackedFiles: [] }).join('\n'), /primary-2026/)
})

test('rejects client signing capability and tracked secret outputs', () => {
  const root = releaseFixture({ clientSource: 'use ed25519_dalek::SigningKey;' })
  const issues = checkRelease({ root, trackedFiles: ['license-secrets/root.private.key'] }).join('\n')
  assert.match(issues, /signing capability/i)
  assert.match(issues, /secret-like tracked path/i)
})

test('rejects version drift and issuer paths in customer artifacts', () => {
  const root = releaseFixture({ packageVersion: '0.7.1', artifactPath: 'tools/license-issuer/src-tauri/target/release/*' })
  const issues = checkRelease({ root, trackedFiles: [] }).join('\n')
  assert.match(issues, /package.json/)
  assert.match(issues, /issuer path/i)
})

function releaseFixture(options = {}) {
  const root = mkdtempSync(join(tmpdir(), 'shangan-release-guard-'))
  mkdirSync(join(root, 'src-tauri/src/license'), { recursive: true })
  mkdirSync(join(root, 'src-tauri/src'), { recursive: true })
  mkdirSync(join(root, '.github/workflows'), { recursive: true })
  writeFileSync(join(root, 'package.json'), JSON.stringify({ version: options.packageVersion ?? '0.7.0' }))
  writeFileSync(join(root, 'src-tauri/tauri.conf.json'), JSON.stringify({ version: '0.7.0' }))
  writeFileSync(join(root, 'src-tauri/Cargo.toml'), '[package]\nname = "app"\nversion = "0.7.0"\n')
  writeFileSync(
    join(root, 'src-tauri/src/license/keys.rs'),
    options.keys ?? 'pub const ACTIVE_PUBLIC_KEYS: &[(&str, [u8; 32])] = &[("primary-2026", [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])];',
  )
  writeFileSync(join(root, 'src-tauri/src/lib.rs'), options.clientSource ?? 'pub mod license;')
  writeFileSync(
    join(root, '.github/workflows/desktop-build.yml'),
    `run: npm run license:check-release\nartifact-path: ${options.artifactPath ?? 'src-tauri/target/release/bundle/dmg/*.dmg'}\nVITE_DEMO_MODE: "false"\n`,
  )
  writeFileSync(
    join(root, '.github/workflows/pwa-pages.yml'),
    'run: npm run build:web-demo\nVITE_DEMO_MODE: "true"\n',
  )
  return root
}
