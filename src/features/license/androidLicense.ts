import { Capacitor, registerPlugin } from '@capacitor/core'
import type { LicenseStatus } from './types.ts'

export function isAndroidRuntime() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

export const androidLicense = registerPlugin<{
  getLicenseStatus(): Promise<LicenseStatus>
  activateLicense(options: { license: string }): Promise<LicenseStatus>
  deactivateLicense(): Promise<LicenseStatus>
}>('ShanganLicense')
