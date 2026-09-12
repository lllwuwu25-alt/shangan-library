const INITIALIZE_CONFIRMATION = '创建新的授权体系'

const ERROR_MESSAGES: Record<string, string> = {
  KEY_MISSING: '签名私钥不存在，请恢复备份或明确创建新的授权体系。',
  KEY_ALREADY_EXISTS: '当前设备已经存在根密钥，已阻止重复初始化。',
  INVALID_KEY_BACKUP: '所选文件不是有效的根密钥备份。',
  KEY_MISMATCH: '所选备份属于另一套授权体系，已阻止覆盖当前根密钥。',
  CONFIRMATION_REQUIRED: '请先确认你已理解私钥导出的风险。',
  INVALID_INPUT: '订单备注或销售渠道格式不正确，请检查后重试。',
  STORAGE_ERROR: '本地文件读写失败，请检查路径权限和可用空间。',
}

export function canInitializeNewSystem(value: string) {
  return value.trim() === INITIALIZE_CONFIRMATION
}

export function issuerErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'code' in error) {
    const code = String((error as { code: unknown }).code)
    return ERROR_MESSAGES[code] ?? '操作未完成，请检查所选文件并重试。'
  }
  return '操作未完成，请检查所选文件并重试。'
}
