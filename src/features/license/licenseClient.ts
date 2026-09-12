import { isTauriRuntime } from './runtime.ts'
import type { LicenseStatus } from './types.ts'

async function invokeCommand<T>(command: string, args?: Record<string, unknown>) {
  if (!isTauriRuntime()) throw new Error('Tauri runtime unavailable')
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<T>(command, args)
}

export function getLicenseStatus() {
  return invokeCommand<LicenseStatus>('get_license_status')
}

export function activateLicense(license: string) {
  return invokeCommand<LicenseStatus>('activate_license', { license })
}

export function deactivateLicense() {
  return invokeCommand<LicenseStatus>('deactivate_license')
}

