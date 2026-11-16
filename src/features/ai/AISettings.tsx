import { useEffect, useRef, useState } from 'react'
import { Sparkles, Trash2 } from 'lucide-react'
import { Button, Card, GhostButton, SectionTitle, TextInput } from '../../components/ui'
import { useAIStore } from './aiStore'
import { chatEndpoint, testConnection } from './client'
import { deepseekPreset } from './config'

export function AISettings() {
  const { config, setConfig } = useAIStore()
  const [draft, setDraft] = useState(config)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  const save = () => {
    try {
      if (draft.enabled) { chatEndpoint(draft.baseUrl); if (!draft.model.trim()) throw new Error('请填写模型名称。') }
      setConfig({ ...draft, baseUrl: draft.baseUrl.trim(), model: draft.model.trim(), apiKey: draft.apiKey.trim() })
      setMessage('AI 设置已保存。')
    } catch (error) { setMessage(error instanceof Error ? error.message : '保存失败，请检查本地存储空间。') }
  }
  return <Card>
    <SectionTitle title="AI 辅助" caption="已预设 DeepSeek，填写密钥后可开启，也可使用自定义接口。" />
    <div className="space-y-4">
      <label className="flex min-h-11 items-center gap-3 text-sm font-medium"><input type="checkbox" checked={draft.enabled} disabled={busy} onChange={e => {
        const enabled = e.target.checked
        setDraft({ ...draft, enabled })
        if (!enabled) { try { setConfig({ enabled: false }); setMessage('AI 已关闭。') } catch { setMessage('关闭设置未能保存，请检查本地存储。') } }
      }} />开启 AI 辅助</label>
      {draft.enabled && <fieldset disabled={busy} className="grid min-w-0 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><GhostButton type="button" onClick={() => {
          setDraft(deepseekPreset(draft))
          setMessage('已填入 DeepSeek 官方地址和 deepseek-flash 模型，请填写 DeepSeek 密钥并保存。切换服务时不会沿用其他服务的密钥。')
        }}>使用 DeepSeek 预设</GhostButton></div>
        <label className="grid min-w-0 gap-1.5 text-sm sm:col-span-2">API 地址<TextInput value={draft.baseUrl} onChange={e => setDraft({ ...draft, baseUrl: e.target.value })} placeholder="https://你的服务地址/v1" autoComplete="off" /></label>
        <label className="grid min-w-0 gap-1.5 text-sm">API 密钥<TextInput type="password" value={draft.apiKey} onChange={e => setDraft({ ...draft, apiKey: e.target.value })} placeholder="填写你的服务密钥，本机模型可留空" autoComplete="off" /></label>
        <label className="grid min-w-0 gap-1.5 text-sm">模型名称<TextInput value={draft.model} onChange={e => setDraft({ ...draft, model: e.target.value })} placeholder="填写支持图片输入的模型名称" /></label>
        <label className="flex items-start gap-2 text-sm sm:col-span-2"><input className="mt-1" type="checkbox" checked={draft.rememberKey} onChange={e => setDraft({ ...draft, rememberKey: e.target.checked })} />在此设备记住密钥（本地明文保存，共用设备请勿勾选）</label>
        <p className="text-sm leading-6 text-slate-600 sm:col-span-2">识别时，仅将选中的截图发送到此 API 地址，由服务商处理，可能产生费用。支持兼容 OpenAI Chat Completions 的接口；截图识别需要视觉模型。连接测试只发送一条测试文本，不上传资料。</p>
      </fieldset>}
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={save}>保存 AI 设置</Button>
        {draft.enabled && <GhostButton disabled={busy} onClick={async () => {
          setBusy(true); setMessage('正在测试连接…'); const controller = new AbortController(); request.current = controller
          try { await testConnection(draft, controller.signal); setMessage('连接成功。图片识别还取决于模型是否支持图片输入。') }
          catch (error) { setMessage(error instanceof Error ? error.message : '连接失败。') }
          finally { setBusy(false); request.current = null }
        }}><Sparkles size={16} />测试连接</GhostButton>}
        {busy && <GhostButton onClick={() => request.current?.abort()}>停止等待</GhostButton>}
        <GhostButton disabled={busy} onClick={() => {
          try { setConfig({ apiKey: '', rememberKey: false }); setDraft({ ...draft, apiKey: '', rememberKey: false }); setMessage('已移除此设备的 API 密钥。') }
          catch { setMessage('密钥未能移除，请检查本地存储。') }
        }}><Trash2 size={15} />移除密钥</GhostButton>
      </div>
      {message && <p role="status" className="break-words text-sm leading-6 text-slate-700">{message}</p>}
    </div>
  </Card>
}
