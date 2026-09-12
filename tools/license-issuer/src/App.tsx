import { open, save } from '@tauri-apps/plugin-dialog'
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Copy,
  Database,
  Download,
  RotateCcw,
  Search,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  exportPrivateKeyBackup,
  exportPublicKey,
  getIssuerState,
  initializeKeySystem,
  issueLicense,
  restorePrivateKeyBackup,
  searchRecords,
} from './api.ts'
import { canInitializeNewSystem, issuerErrorMessage } from './policy.ts'
import type { IssuanceRecord, IssuedLicense, IssuerState } from './types.ts'

const INITIALIZE_PHRASE = '创建新的授权体系'
const RESTORE_PHRASE = '恢复已有私钥'
const BACKUP_PHRASE = '我已知晓私钥风险'

export function App() {
  const [state, setState] = useState<IssuerState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [backupDue, setBackupDue] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setState(await getIssuerState())
    } catch (nextError) {
      setError(issuerErrorMessage(nextError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    void getIssuerState()
      .then((nextState) => { if (active) setState(nextState) })
      .catch((nextError) => { if (active) setError(issuerErrorMessage(nextError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  if (loading && !state) return <LoadingScreen />

  if (!state || state.keyState === 'missing') {
    return (
      <KeySetup
        error={error}
        onInitialized={async () => {
          setBackupDue(true)
          await refresh()
        }}
        onRestored={refresh}
      />
    )
  }

  return (
    <WorkspaceHeader state={state}>
      {backupDue && (
        <Notice tone="warning" title="根密钥已创建，请立即备份">
          先在下方“密钥管理”中导出私钥备份，并保存到安全的离线位置，再开始正式签发。
        </Notice>
      )}
      <IssuerWorkspace
        state={state}
        onStateChanged={async () => {
          await refresh()
        }}
      />
    </WorkspaceHeader>
  )
}

function LoadingScreen() {
  return (
    <main className="loading-screen" aria-live="polite">
      <div className="loading-mark"><ShieldCheck size={24} /></div>
      <h1>正在检查根密钥</h1>
      <p>签发工具只读取当前设备的本地配置。</p>
    </main>
  )
}

function WorkspaceHeader({ state, children }: { state: IssuerState; children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark"><BookOpen size={22} /></span>
          <span>
            <strong>上岸资料库</strong>
            <small>授权签发中心</small>
          </span>
        </div>
        <div className="key-status" title={state.publicKey?.keyId}>
          <span className="status-dot" /> 根密钥就绪
          <span className="key-id">{state.publicKey?.keyId}</span>
        </div>
      </header>
      <main className="workspace">{children}</main>
    </div>
  )
}

function KeySetup({
  error,
  onInitialized,
  onRestored,
}: {
  error: string
  onInitialized: () => Promise<void>
  onRestored: () => Promise<void>
}) {
  const [showInitialize, setShowInitialize] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(error)

  const restore = async () => {
    const path = await open({
      multiple: false,
      filters: [{ name: '根密钥备份', extensions: ['key'] }],
    })
    if (!path || Array.isArray(path)) return
    setBusy(true)
    setMessage('')
    try {
      await restorePrivateKeyBackup(path)
      await onRestored()
    } catch (nextError) {
      setMessage(issuerErrorMessage(nextError))
    } finally {
      setBusy(false)
    }
  }

  const initialize = async () => {
    setBusy(true)
    setMessage('')
    try {
      await initializeKeySystem()
      await onInitialized()
    } catch (nextError) {
      setMessage(issuerErrorMessage(nextError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="setup-page">
      <section className="setup-intro">
        <div className="setup-logo"><ShieldCheck size={26} /></div>
        <p className="product-name">上岸资料库</p>
        <h1>授权签发工具尚未连接根密钥</h1>
        <p>恢复已有备份可继续原授权体系。只有第一次建立正式授权体系时，才创建一套新的根密钥。</p>
      </section>

      <section className="setup-actions" aria-busy={busy}>
        <div className="setup-choice primary-choice">
          <div className="choice-icon"><Upload size={20} /></div>
          <div>
            <h2>恢复已有私钥</h2>
            <p>从离线备份恢复，继续签发现有客户程序可以验证的授权。</p>
          </div>
          <button className="button primary" disabled={busy} onClick={() => void restore()}>
            <Upload size={16} /> 选择备份文件
          </button>
        </div>

        <div className="setup-divider"><span>或</span></div>

        <div className="setup-choice">
          <div className="choice-icon neutral"><RotateCcw size={20} /></div>
          <div>
            <h2>初始化新的授权体系</h2>
            <p>会创建全新的 Ed25519 根密钥。已有客户程序无法识别另一套未同步的公钥。</p>
          </div>
          {!showInitialize ? (
            <button className="button secondary" disabled={busy} onClick={() => setShowInitialize(true)}>
              查看风险并继续
            </button>
          ) : (
            <div className="guarded-action">
              <div className="risk-copy">
                <strong>私钥是整个授权系统的根。</strong>
                <span>丢失后无法继续签发兼容授权；泄露后他人可以伪造合法授权。创建后必须立即做离线备份。</span>
              </div>
              <label>
                输入“{INITIALIZE_PHRASE}”确认
                <input
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="off"
                  placeholder={INITIALIZE_PHRASE}
                />
              </label>
              <div className="button-row">
                <button className="button quiet" onClick={() => { setShowInitialize(false); setConfirmation('') }}>
                  取消
                </button>
                <button
                  className="button danger"
                  disabled={busy || !canInitializeNewSystem(confirmation)}
                  onClick={() => void initialize()}
                >
                  明确创建新体系
                </button>
              </div>
            </div>
          )}
        </div>
        {message && <p className="form-error" role="alert">{message}</p>}
      </section>
    </main>
  )
}

function IssuerWorkspace({ state, onStateChanged }: { state: IssuerState; onStateChanged: () => Promise<void> }) {
  const [latest, setLatest] = useState<IssuedLicense | null>(null)
  const [historyVersion, setHistoryVersion] = useState(0)

  return (
    <>
      <section className="page-heading">
        <div>
          <h1>授权签发中心</h1>
          <p>生成完全离线的永久 Pro 授权。订单备注只填写非敏感的内部编号。</p>
        </div>
        <div className="record-count"><Database size={16} /> 已签发 {state.recordCount} 条</div>
      </section>

      <div className="issuance-grid">
        <IssueForm onIssued={(issued) => { setLatest(issued); setHistoryVersion((value) => value + 1); void onStateChanged() }} />
        <LicenseResult issued={latest} />
      </div>

      <History key={historyVersion} />
      <KeyManagement state={state} onStateChanged={onStateChanged} />
    </>
  )
}

function IssueForm({ onIssued }: { onIssued: (issued: IssuedLicense) => void }) {
  const [customerRef, setCustomerRef] = useState('')
  const [channel, setChannel] = useState('微信')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const issued = await issueLicense({ customerRef: customerRef.trim() || null, channel })
      onIssued(issued)
      setCustomerRef('')
    } catch (nextError) {
      setError(issuerErrorMessage(nextError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel issue-panel">
      <PanelHeading title="生成授权" caption="授权参数固定为上岸资料库 Pro 永久版。" icon={<ShieldCheck size={18} />} />
      <form onSubmit={(event) => void submit(event)}>
        <div className="fixed-license">
          <span>授权类型</span>
          <strong>永久 Pro</strong>
          <span className="verified-label"><CheckCircle2 size={15} /> 固定产品配置</span>
        </div>
        <label className="field">
          <span>订单备注 <small>选填，最多 80 字</small></span>
          <input
            value={customerRef}
            onChange={(event) => setCustomerRef(event.target.value)}
            maxLength={80}
            placeholder="例如 ORDER-20260912-001"
            autoComplete="off"
          />
        </label>
        <fieldset className="field">
          <legend>销售渠道</legend>
          <div className="segment-control">
            {['微信', '小红书', '其他'].map((item) => (
              <label key={item}>
                <input type="radio" name="channel" value={item} checked={channel === item} onChange={() => setChannel(item)} />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button primary submit-button" disabled={busy} type="submit">
          <ShieldCheck size={17} /> {busy ? '正在本地签名…' : '生成授权'}
        </button>
      </form>
    </section>
  )
}

function LicenseResult({ issued }: { issued: IssuedLicense | null }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (!issued) return
    await navigator.clipboard.writeText(issued.license)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <section className="panel result-panel">
      <PanelHeading title="签发结果" caption="复制完整授权码发送给对应客户。" icon={<CheckCircle2 size={18} />} />
      {!issued ? (
        <div className="empty-result">
          <ShieldCheck size={28} />
          <strong>等待生成授权</strong>
          <span>完成左侧表单后，结果会显示在这里。</span>
        </div>
      ) : (
        <div className="result-content" aria-live="polite">
          <div className="success-line"><CheckCircle2 size={18} /> 授权已生成</div>
          <InfoLine label="License ID" value={issued.record.licenseId} mono />
          <InfoLine label="生成时间" value={formatTime(issued.record.issuedAt)} />
          <div className="license-block">
            <div className="license-label">授权码</div>
            <code>{issued.license}</code>
          </div>
          <button className="button primary" onClick={() => void copy()}>
            {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
            {copied ? '已复制授权码' : '复制授权码'}
          </button>
        </div>
      )}
    </section>
  )
}

function History() {
  const [query, setQuery] = useState('')
  const [records, setRecords] = useState<IssuanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      setLoading(true)
      void searchRecords(query)
        .then((items) => { if (active) setRecords(items) })
        .catch((error) => { if (active) setMessage(issuerErrorMessage(error)) })
        .finally(() => { if (active) setLoading(false) })
    }, 120)
    return () => { active = false; window.clearTimeout(timer) }
  }, [query])

  const copyRecord = async (record: IssuanceRecord) => {
    await navigator.clipboard.writeText(record.license)
    setMessage(`已复制 ${record.licenseId} 的授权码。`)
  }

  return (
    <section className="panel history-panel">
      <div className="history-heading">
        <PanelHeading title="签发记录" caption="按 License ID、订单备注或销售渠道搜索。" icon={<Database size={18} />} />
        <label className="search-field">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索签发记录" />
        </label>
      </div>
      {loading ? (
        <p className="history-status">正在读取本地记录…</p>
      ) : records.length === 0 ? (
        <p className="history-status">{query ? '没有匹配的签发记录。' : '还没有签发记录，生成第一条授权后会显示在这里。'}</p>
      ) : (
        <div className="record-list">
          {records.map((record) => (
            <article className="record-row" key={record.licenseId}>
              <div className="record-main">
                <strong>{record.customerRef || '未填写订单备注'}</strong>
                <code>{record.licenseId}</code>
              </div>
              <span className="channel-tag">{record.channel}</span>
              <span className="record-time"><Clock3 size={14} /> {formatTime(record.issuedAt)}</span>
              <button className="icon-text-button" onClick={() => void copyRecord(record)} title="复制原授权码">
                <Copy size={15} /> 复制
              </button>
            </article>
          ))}
        </div>
      )}
      {message && <p className="inline-message" aria-live="polite">{message}</p>}
    </section>
  )
}

function KeyManagement({ state, onStateChanged }: { state: IssuerState; onStateChanged: () => Promise<void> }) {
  const [backupConfirmation, setBackupConfirmation] = useState('')
  const [restoreConfirmation, setRestoreConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (operation: () => Promise<string>) => {
    setBusy(true)
    setMessage('')
    setError('')
    try {
      setMessage(await operation())
    } catch (nextError) {
      setError(issuerErrorMessage(nextError))
    } finally {
      setBusy(false)
    }
  }

  const savePublic = async () => {
    const path = await save({ defaultPath: 'shangan-public-key.json', filters: [{ name: 'JSON', extensions: ['json'] }] })
    if (!path) return
    await run(async () => { await exportPublicKey(path); return '公钥文件已导出，可安全用于客户应用构建。' })
  }

  const savePrivate = async () => {
    const path = await save({ defaultPath: 'shangan-root-key-backup.private.key', filters: [{ name: '根密钥备份', extensions: ['key'] }] })
    if (!path) return
    await run(async () => { await exportPrivateKeyBackup(path); setBackupConfirmation(''); return '私钥备份已导出。请将它保存到安全的离线位置。' })
  }

  const restore = async () => {
    const before = state.publicKey?.publicKey
    const path = await open({ multiple: false, filters: [{ name: '根密钥备份', extensions: ['key'] }] })
    if (!path || Array.isArray(path)) return
    await run(async () => {
      const restored = await restorePrivateKeyBackup(path)
      setRestoreConfirmation('')
      await onStateChanged()
      return restored.publicKey === before
        ? '恢复完成，备份公钥与当前授权体系一致。'
        : '恢复完成，请重新核对客户应用中的公钥。'
    })
  }

  return (
    <section className="panel key-panel">
      <PanelHeading title="密钥管理" caption="公钥用于构建客户应用；私钥只做离线备份，禁止发送或上传。" icon={<ShieldCheck size={18} />} />
      <div className="key-summary">
        <InfoLine label="Key ID" value={state.publicKey?.keyId || '—'} mono />
        <InfoLine label="算法" value={state.publicKey?.algorithm || '—'} />
        <InfoLine label="创建时间" value={state.createdAt ? formatTime(state.createdAt) : '—'} />
      </div>
      <div className="key-actions">
        <div className="key-action-row">
          <div><strong>导出公钥</strong><span>可以提交到客户端源码，不包含任何签名能力。</span></div>
          <button className="button secondary" disabled={busy} onClick={() => void savePublic()}><Download size={16} /> 导出</button>
        </div>
        <div className="key-action-row guarded-row">
          <div><strong>备份根私钥</strong><span>输入“{BACKUP_PHRASE}”后，导出到你选择的安全位置。</span></div>
          <input value={backupConfirmation} onChange={(event) => setBackupConfirmation(event.target.value)} placeholder={BACKUP_PHRASE} />
          <button className="button warning" disabled={busy || backupConfirmation.trim() !== BACKUP_PHRASE} onClick={() => void savePrivate()}><Download size={16} /> 备份</button>
        </div>
        <div className="key-action-row guarded-row">
          <div><strong>恢复已有私钥</strong><span>只接受与当前公钥一致的备份，避免误覆盖授权体系。</span></div>
          <input value={restoreConfirmation} onChange={(event) => setRestoreConfirmation(event.target.value)} placeholder={RESTORE_PHRASE} />
          <button className="button secondary" disabled={busy || restoreConfirmation.trim() !== RESTORE_PHRASE} onClick={() => void restore()}><Upload size={16} /> 恢复</button>
        </div>
      </div>
      {message && <p className="inline-message success" aria-live="polite">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  )
}

function PanelHeading({ title, caption, icon }: { title: string; caption: string; icon: ReactNode }) {
  return (
    <div className="panel-heading">
      <span className="panel-icon">{icon}</span>
      <div><h2>{title}</h2><p>{caption}</p></div>
    </div>
  )
}

function InfoLine({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="info-line">
      <span>{label}</span>
      <strong className={mono ? 'mono' : undefined}>{value}</strong>
    </div>
  )
}

function Notice({ title, children, tone }: { title: string; children: ReactNode; tone: 'warning' }) {
  return (
    <div className={`notice ${tone}`} role="status">
      <ShieldCheck size={20} />
      <div><strong>{title}</strong><p>{children}</p></div>
    </div>
  )
}

function formatTime(unixSeconds: number) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(unixSeconds * 1000))
}
