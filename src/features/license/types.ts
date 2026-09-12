export type LicenseStateKind = 'missing' | 'valid' | 'invalid'

export type LicenseStatus = {
  state: LicenseStateKind
  valid: boolean
  edition: string | null
  licenseType: string | null
  licenseId: string | null
  issuedAt: number | null
  expiresAt: number | null
  features: string[]
}

export type LicenseSurface = 'checking' | 'unlocked' | 'activation' | 'desktop-only'

export type LicenseCommandFailure = {
  code?: string
  message?: string
}

