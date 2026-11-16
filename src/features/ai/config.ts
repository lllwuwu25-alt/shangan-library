export type AIConfig = { enabled: boolean; baseUrl: string; apiKey: string; model: string; rememberKey: boolean }
export const AI_STORAGE_KEY = 'shangan-library-ai-settings'
export const defaultAIConfig: AIConfig = { enabled: false, baseUrl: 'https://api.deepseek.com', apiKey: '', model: 'deepseek-flash', rememberKey: false }
export const serializeAIConfig = (config: AIConfig) => JSON.stringify({ ...config, apiKey: config.rememberKey ? config.apiKey : '' })
export function normalizeAIConfig(raw: unknown): AIConfig {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const unusedLegacy = value.baseUrl === 'https://api.openai.com/v1' && !value.model && !value.apiKey
  return {
    enabled: value.enabled === true,
    baseUrl: unusedLegacy || typeof value.baseUrl !== 'string' ? defaultAIConfig.baseUrl : value.baseUrl,
    apiKey: value.rememberKey === true && typeof value.apiKey === 'string' ? value.apiKey : '',
    model: unusedLegacy || typeof value.model !== 'string' ? defaultAIConfig.model : value.model,
    rememberKey: value.rememberKey === true,
  }
}
export function deepseekPreset(config: AIConfig): AIConfig {
  let sameProvider = false
  try { sameProvider = new URL(config.baseUrl).origin === defaultAIConfig.baseUrl } catch { /* Invalid addresses carry no credentials across providers. */ }
  return { ...config, baseUrl: defaultAIConfig.baseUrl, model: defaultAIConfig.model, apiKey: sameProvider ? config.apiKey : '', rememberKey: sameProvider && config.rememberKey }
}
export function readAIConfig(): AIConfig {
  try {
    return normalizeAIConfig(JSON.parse(localStorage.getItem(AI_STORAGE_KEY) || '{}'))
  } catch { return { ...defaultAIConfig } }
}
