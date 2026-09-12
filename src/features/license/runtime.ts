import type { LicenseStatus, LicenseSurface } from './types.ts'

export function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function resolveLicenseSurface(input: {
  tauri: boolean
  demo: boolean
  checking: boolean
  status: LicenseStatus | null
}): LicenseSurface {
  if (!input.tauri) return input.demo ? 'unlocked' : 'desktop-only'
  if (input.checking) return 'checking'
  return input.status?.valid && input.status.state === 'valid' ? 'unlocked' : 'activation'
}
