export type KeyState = 'missing' | 'ready'

export type PublicKeyExport = {
  schemaVersion: number
  keyId: string
  algorithm: string
  publicKey: string
}

export type IssuerState = {
  keyState: KeyState
  publicKey: PublicKeyExport | null
  createdAt: number | null
  recordCount: number
}

export type IssueLicenseRequest = {
  customerRef: string | null
  channel: string
}

export type IssuanceRecord = {
  licenseId: string
  customerRef: string | null
  channel: string
  issuedAt: number
  edition: string
  licenseType: string
  license: string
}

export type IssuedLicense = {
  license: string
  record: IssuanceRecord
}
