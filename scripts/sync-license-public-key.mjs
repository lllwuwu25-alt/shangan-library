import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const ROOT = resolve(dirname(SCRIPT_PATH), '..')
const EXPECTED_FIELDS = ['algorithm', 'keyId', 'publicKey', 'schemaVersion']
const START_MARKER = '// LICENSE_PUBLIC_KEYS_START'
const END_MARKER = '// LICENSE_PUBLIC_KEYS_END'

export function syncPublicKey({ inputPath, destinationPath }) {
  const document = JSON.parse(readFileSync(inputPath, 'utf8'))
  const validated = validatePublicExport(document)
  const original = readFileSync(destinationPath, 'utf8')
  const start = original.indexOf(START_MARKER)
  const end = original.indexOf(END_MARKER)
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Public-key registry markers are missing or invalid.')
  }

  const bytes = [...validated.bytes].join(', ')
  const replacement = `${START_MARKER}\npub const ACTIVE_PUBLIC_KEYS: &[(&str, [u8; 32])] = &[("primary-2026", [${bytes}])];\n${END_MARKER}`
  const updated = `${original.slice(0, start)}${replacement}${original.slice(end + END_MARKER.length)}`
  const temporaryPath = resolve(dirname(destinationPath), `.${basename(destinationPath)}.tmp-${process.pid}`)
  writeFileSync(temporaryPath, updated, { encoding: 'utf8', mode: 0o600 })
  renameSync(temporaryPath, destinationPath)
  return { keyId: validated.keyId, byteLength: validated.bytes.length }
}

export function validatePublicExport(value) {
  if (!isPlainObject(value)) throw new Error('Public-key export must be a JSON object.')
  rejectSecretLookingFields(value)
  const fields = Object.keys(value).sort()
  if (fields.length !== EXPECTED_FIELDS.length || fields.some((field, index) => field !== EXPECTED_FIELDS[index])) {
    throw new Error('Public-key export contains unexpected or missing fields.')
  }
  if (value.schemaVersion !== 1) throw new Error('Unsupported public-key schema.')
  if (value.keyId !== 'primary-2026') throw new Error('Unexpected public-key ID.')
  if (value.algorithm !== 'Ed25519') throw new Error('Unexpected public-key algorithm.')
  if (typeof value.publicKey !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value.publicKey)) {
    throw new Error('Public key must use Base64URL without padding.')
  }
  const bytes = Buffer.from(value.publicKey, 'base64url')
  if (bytes.length !== 32 || bytes.toString('base64url') !== value.publicKey) {
    throw new Error('Ed25519 public key must decode to exactly 32 bytes.')
  }
  return { keyId: value.keyId, bytes }
}

function rejectSecretLookingFields(value) {
  if (Array.isArray(value)) {
    value.forEach(rejectSecretLookingFields)
    return
  }
  if (!isPlainObject(value)) return
  for (const [key, nested] of Object.entries(value)) {
    const normalized = key.toLowerCase().replaceAll(/[^a-z]/g, '')
    if (normalized.includes('private') || normalized.includes('secret') || normalized.includes('signing')) {
      throw new Error('Secret-looking fields are forbidden in public-key exports.')
    }
    rejectSecretLookingFields(nested)
  }
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function main() {
  const inputPath = process.argv[2] ? resolve(process.argv[2]) : null
  const destinationPath = process.argv[3]
    ? resolve(process.argv[3])
    : resolve(ROOT, 'src-tauri/src/license/keys.rs')
  if (!inputPath) {
    console.error('Usage: npm run license:sync-public-key -- /path/to/public-key.json')
    process.exitCode = 1
    return
  }
  const result = syncPublicKey({ inputPath, destinationPath })
  console.log(`Public key ${result.keyId} synced to the customer verifier.`)
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) main()
