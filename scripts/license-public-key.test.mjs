import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { syncPublicKey } from './sync-license-public-key.mjs'

const PUBLIC_KEY = Buffer.alloc(32, 7).toString('base64url')

test('syncs one strict public export into the generated registry block', () => {
  const fixture = createFixture(validExport())

  const result = syncPublicKey(fixture)
  const updated = readFileSync(fixture.destinationPath, 'utf8')

  assert.deepEqual(result, { keyId: 'primary-2026', byteLength: 32 })
  assert.match(updated, /\("primary-2026", \[7, 7, 7/)
  assert.match(updated, /\/\/ LICENSE_PUBLIC_KEYS_START/)
  assert.doesNotMatch(updated, /old-key/)
})

for (const [name, mutate] of [
  ['malformed key length', (value) => ({ ...value, publicKey: Buffer.alloc(31).toString('base64url') })],
  ['base64 padding', (value) => ({ ...value, publicKey: `${value.publicKey}=` })],
  ['unexpected fields', (value) => ({ ...value, note: 'do not accept metadata drift' })],
  ['private-looking fields', (value) => ({ ...value, privateKey: 'must never cross this boundary' })],
  ['wrong key id', (value) => ({ ...value, keyId: 'secondary-2026' })],
  ['wrong algorithm', (value) => ({ ...value, algorithm: 'RSA' })],
]) {
  test(`rejects ${name} without modifying the destination`, () => {
    const fixture = createFixture(mutate(validExport()))
    const before = readFileSync(fixture.destinationPath, 'utf8')

    assert.throws(() => syncPublicKey(fixture))
    assert.equal(readFileSync(fixture.destinationPath, 'utf8'), before)
  })
}

function validExport() {
  return {
    schemaVersion: 1,
    keyId: 'primary-2026',
    algorithm: 'Ed25519',
    publicKey: PUBLIC_KEY,
  }
}

function createFixture(document) {
  const directory = mkdtempSync(join(tmpdir(), 'shangan-public-key-'))
  const inputPath = join(directory, 'public-key.json')
  const destinationPath = join(directory, 'keys.rs')
  writeFileSync(inputPath, JSON.stringify(document), 'utf8')
  writeFileSync(
    destinationPath,
    `before\n// LICENSE_PUBLIC_KEYS_START\npub const ACTIVE_PUBLIC_KEYS: &[(&str, [u8; 32])] = &[("old-key", [0; 32])];\n// LICENSE_PUBLIC_KEYS_END\nafter\n`,
    'utf8',
  )
  return { inputPath, destinationPath }
}
