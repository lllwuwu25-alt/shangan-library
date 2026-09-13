import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const ROOT = resolve(dirname(SCRIPT_PATH), '..')
const EXPECTED_VERSION = '0.7.1'
const FORBIDDEN_CLIENT_PATTERNS = [
  /\bSigningKey\b/,
  /\bed25519_dalek::Signer\b/,
  /\bsign_payload\b/,
  /\bprivate_key\b/,
  /\bprivateKey\b/,
  /\bEXPORT_PRIVATE_KEY\b/,
]

export function checkRelease({ root = ROOT, trackedFiles } = {}) {
  const issues = []
  checkVersions(root, issues)
  checkPublicRegistry(root, issues)
  checkClientSources(root, issues)
  checkTrackedFiles(root, trackedFiles, issues)
  checkWorkflows(root, issues)
  return issues
}

function checkVersions(root, issues) {
  const packageJson = readJson(join(root, 'package.json'), issues, 'package.json')
  const tauriConfig = readJson(join(root, 'src-tauri/tauri.conf.json'), issues, 'src-tauri/tauri.conf.json')
  const cargoPath = join(root, 'src-tauri/Cargo.toml')
  const cargo = safeRead(cargoPath, issues)
  const cargoVersion = cargo?.match(/^version\s*=\s*"([^"]+)"/m)?.[1]
  for (const [label, version] of [
    ['package.json', packageJson?.version],
    ['src-tauri/tauri.conf.json', tauriConfig?.version],
    ['src-tauri/Cargo.toml', cargoVersion],
  ]) {
    if (version !== EXPECTED_VERSION) issues.push(`${label} version must equal ${EXPECTED_VERSION}.`)
  }
}

function checkPublicRegistry(root, issues) {
  const path = join(root, 'src-tauri/src/license/keys.rs')
  const source = safeRead(path, issues)
  if (!source) return
  const keyMatch = source.match(/\("primary-2026",\s*\[([\d,\s]+)\]\)/)
  if (!keyMatch) {
    issues.push('ACTIVE_PUBLIC_KEYS must contain primary-2026 before a customer release.')
    return
  }
  const bytes = keyMatch[1].split(',').map((value) => value.trim()).filter(Boolean).map(Number)
  if (bytes.length !== 32 || bytes.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    issues.push('primary-2026 must contain exactly 32 valid public-key bytes.')
  }
}

function checkClientSources(root, issues) {
  const sourceRoots = ['src', 'src-tauri/src', 'crates/license-protocol/src']
  for (const sourceRoot of sourceRoots) {
    const absoluteRoot = join(root, sourceRoot)
    if (!existsSync(absoluteRoot)) continue
    for (const path of collectFiles(absoluteRoot)) {
      const source = readFileSync(path, 'utf8')
      if (FORBIDDEN_CLIENT_PATTERNS.some((pattern) => pattern.test(source))) {
        issues.push(`Client signing capability detected in ${relative(root, path)}.`)
      }
    }
  }
}

function checkTrackedFiles(root, trackedFiles, issues) {
  const files = trackedFiles ?? execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean)
  const secretPath = /(?:^|\/)(?:[^/]*\.private\.key|private\.key|license-private\.key|license-secrets|license-issuer-data|license-exports)(?:\/|$)/i
  for (const path of files) {
    if (secretPath.test(path)) issues.push(`Secret-like tracked path detected: ${path}.`)
  }
}

function checkWorkflows(root, issues) {
  const desktop = safeRead(join(root, '.github/workflows/desktop-build.yml'), issues)
  const pages = safeRead(join(root, '.github/workflows/pwa-pages.yml'), issues)
  if (desktop) {
    if (!desktop.includes('npm run license:check-release')) {
      issues.push('Desktop workflow must run the license release guard.')
    }
    if (!/VITE_DEMO_MODE:\s*["']?false["']?/.test(desktop)) {
      issues.push('Desktop workflow must explicitly disable demo mode.')
    }
    if (/artifact-path:[^\n]*tools\/license-issuer|tools\/license-issuer[^\n]*(?:dmg|exe|msi|app)/i.test(desktop)) {
      issues.push('Customer artifact paths must not contain an issuer path.')
    }
  }
  if (pages) {
    if (!/VITE_DEMO_MODE:\s*["']?true["']?/.test(pages)) {
      issues.push('Pages workflow must explicitly enable demo mode.')
    }
    if (pages.includes('license:check-release')) {
      issues.push('Pages demo must not depend on the commercial release guard.')
    }
  }
}

function collectFiles(directory) {
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...collectFiles(path))
    else if (/\.(?:rs|ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) files.push(path)
  }
  return files
}

function readJson(path, issues, label) {
  const source = safeRead(path, issues)
  if (!source) return null
  try {
    return JSON.parse(source)
  } catch {
    issues.push(`${label} must contain valid JSON.`)
    return null
  }
}

function safeRead(path, issues) {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    issues.push(`Required release file is missing: ${path}.`)
    return null
  }
}

function main() {
  const issues = checkRelease()
  if (issues.length) {
    console.error('Commercial release guard failed:')
    issues.forEach((issue) => console.error(`- ${issue}`))
    process.exitCode = 1
    return
  }
  console.log(`Commercial release guard passed for v${EXPECTED_VERSION}.`)
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) main()
