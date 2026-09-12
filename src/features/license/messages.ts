import type { LicenseCommandFailure } from './types.ts'

const messages: Record<string, string> = {
  MISSING: '尚未找到授权码。',
  INVALID_FORMAT: '授权码无效，请检查是否完整复制。',
  INVALID_ENCODING: '授权码无效，请检查是否完整复制。',
  INVALID_PAYLOAD: '授权码无效，请检查是否完整复制。',
  INVALID_SIGNATURE: '授权码无效，请检查是否完整复制。',
  UNSUPPORTED_SCHEMA: '此授权码版本暂不受支持。',
  UNKNOWN_KEY_ID: '无法识别此授权码的签发密钥。',
  WRONG_PRODUCT: '此授权码不属于上岸资料库。',
  UNSUPPORTED_EDITION: '此授权类型暂不受支持。',
  UNSUPPORTED_LICENSE_TYPE: '此授权类型暂不受支持。',
  EXPIRED: '此授权码已过期。',
  STORAGE_ERROR: '授权信息无法写入本机，请稍后重试。',
}

export function licenseErrorMessage(error: unknown): string {
  const failure = asLicenseFailure(error)
  return failure.code && messages[failure.code]
    ? messages[failure.code]
    : '激活未完成，请确认授权码完整后重试。'
}

export function asLicenseFailure(error: unknown): LicenseCommandFailure {
  return typeof error === 'object' && error !== null ? error as LicenseCommandFailure : {}
}
