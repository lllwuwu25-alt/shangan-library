import { create } from 'zustand'
import { AI_STORAGE_KEY, readAIConfig, serializeAIConfig, type AIConfig } from './config'
export const useAIStore = create<{ config: AIConfig; setConfig: (patch: Partial<AIConfig>) => void }>((set, get) => ({
  config: readAIConfig(),
  setConfig: (patch) => {
    const config = { ...get().config, ...patch }
    // Persist before publishing so storage failure cannot appear to have saved.
    localStorage.setItem(AI_STORAGE_KEY, serializeAIConfig(config))
    set({ config })
  },
}))
