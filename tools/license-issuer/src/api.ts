import { invoke } from '@tauri-apps/api/core'
import type { IssueLicenseRequest, IssuanceRecord, IssuedLicense, IssuerState, PublicKeyExport } from './types.ts'

export const getIssuerState = () => invoke<IssuerState>('get_issuer_state')

export const initializeKeySystem = () => invoke<PublicKeyExport>('initialize_key_system')

export const issueLicense = (request: IssueLicenseRequest) =>
  invoke<IssuedLicense>('issue_license', { request })

export const searchRecords = (query: string) =>
  invoke<IssuanceRecord[]>('search_records', { query })

export const exportPublicKey = (path: string) =>
  invoke<PublicKeyExport>('export_public_key', { path })

export const exportPrivateKeyBackup = (path: string) =>
  invoke<void>('export_private_key_backup', { path, confirmation: 'EXPORT_PRIVATE_KEY' })

export const restorePrivateKeyBackup = (path: string) =>
  invoke<PublicKeyExport>('restore_private_key_backup', { path })
