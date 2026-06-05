import { useState, useEffect } from 'react'

// ─── パスワードゲート ───────────────────────────────
const CORRECT_PASSWORD = import.meta.env.VITE_ACCESS_PASSWORD ?? ''

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (CORRECT_PASSWORD && input === CORRECT_PASSWORD) {
      onUnlock()
    } else {
      setError(true)
      setInput('')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-app)' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}
           className="p-10 w-full max-w-sm text-center">
        <h1 className="font-brand text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>Paigner</h1>
        <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>パスワードを入力してください</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={input}
            onChange={e => { setInput(e.target.value); setError(false) }}
            placeholder="パスワード"
            autoFocus
            className="input-dark w-full"
          />
          {error && <p className="text-xs" style={{ color: 'var(--negative)' }}>パスワードが違います</p>}
          <button type="submit" className="btn-primary w-full">ログイン</button>
        </form>
      </div>
    </div>
  )
}
// ────────────────────────────────────────────────────

import { PointSettings } from './tabs/PointSettings'
import { PerformerSettings } from './tabs/PerformerSettings'
import { SalesSimulator } from './tabs/SalesSimulator'
import { CohortForecast } from './tabs/CohortForecast'
import { AgencyROI } from './tabs/AgencyROI'
import { IncomeCalculator } from './tabs/IncomeCalculator'
import { useAppContext } from './context/AppContext'
import { ReportGenerator } from './tabs/ReportGenerator'
import { CampaignPlanner } from './tabs/CampaignPlanner'
import { BannerManager } from './tabs/BannerManager'

const TABS = [
  { id: 'point',     label: 'ポイント設定',        icon: '◈', sub: 'Point Config' },
  { id: 'performer', label: 'パフォーマー設定',     icon: '◉', sub: 'Performer' },
  { id: 'simulator', label: '売上シミュレーター',   icon: '◐', sub: 'Sales Sim' },
  { id: 'cohort',    label: 'コホート予測',         icon: '◑', sub: 'Cohort' },
  { id: 'agency',    label: '代理店回収率',         icon: '◒', sub: 'Agency ROI' },
  { id: 'income',    label: '目標月収逆算',         icon: '◓', sub: 'Income Calc' },
  { id: 'report',    label: '結果報告書',           icon: '▣', sub: 'Report' },
  { id: 'campaign',  label: 'キャンペーン企画',     icon: '▦', sub: 'Campaign' },
  { id: 'banner',    label: 'バナー管理',           icon: '▤', sub: 'Banner' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('point')
  const [unlocked, setUnlocked] = useState(!CORRECT_PASSWORD)
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    (localStorage.getItem('paigner-theme') as 'dark' | 'light') ?? 'dark'
  )
  const { data, setData, resetToInitial } = useAppContext()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('paigner-theme', theme)
  }, [theme])

  // 現在の全設定をクリップボードにコピー（AIに貼って質問できる）
  const exportData = async () => {
    const json = JSON.stringify(data)
    try {
      await navigator.clipboard.writeText(json)
      alert('現在の全設定をクリップボードにコピーしました。\nそのままチャットに貼り付けて質問できます。')
    } catch {
      // クリップボード不可時はダウンロード
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'paigner-data.json'; a.click()
      URL.revokeObjectURL(url)
    }
  }

  // JSONを貼り付けて設定を復元
  const importData = () => {
    const text = prompt('エクスポートしたJSONを貼り付けてください')
    if (!text) return
    try {
      const parsed = JSON.parse(text)
      setData(parsed)
      alert('設定を読み込みました。')
    } catch {
      alert('JSONの形式が正しくありません。')
    }
  }

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />

  const activeTabInfo = TABS.find(t => t.id === activeTab)

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-app)' }}>

      {/* ── Sidebar ── */}
      <aside
        className="shrink-0 flex flex-col min-h-screen sticky top-0 h-screen"
        style={{
          width: 220,
          background: 'var(--bg-card)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Brand */}
        <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'linear-gradient(135deg, var(--accent) 0%, #a78bfa 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: '#fff', fontWeight: 700,
              fontFamily: 'Sora, sans-serif',
              flexShrink: 0,
            }}>P</div>
            <div>
              <div className="font-brand font-bold text-sm tracking-wide" style={{ color: 'var(--text-primary)' }}>
                Paigner
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                CAMPAIGN ANALYTICS
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="w-full text-left transition-all duration-150"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 16px',
                  borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                  background: isActive ? 'var(--accent-dim)' : 'transparent',
                  color: isActive ? 'var(--accent-light)' : 'var(--text-muted)',
                  fontSize: 13,
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                  }
                }}
              >
                <span style={{ fontSize: 14, opacity: 0.7 }}>{tab.icon}</span>
                <span style={{ fontWeight: isActive ? 500 : 400 }}>{tab.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
          {/* Theme toggle */}
          <button
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '5px 8px', borderRadius: 6,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
          >
            <span style={{ fontSize: 14 }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span>{theme === 'dark' ? 'ライトモード' : 'ダークモード'}</span>
          </button>
          <div className="flex gap-2">
            <button
              onClick={exportData}
              style={{ flex: 1, fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', padding: '5px 6px' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-light)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
              title="現在の全設定をコピー（AIに貼って質問できます）"
            >📋 コピー</button>
            <button
              onClick={importData}
              style={{ flex: 1, fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', padding: '5px 6px' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-light)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
              title="JSONを貼り付けて設定を復元"
            >📥 読込</button>
          </div>
          <button
            onClick={() => { if (confirm('全設定を初期値にリセットしますか？')) resetToInitial() }}
            style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--negative)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            ↺ 初期値にリセット
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-x-auto" style={{ minWidth: 0 }}>
        {/* Top bar */}
        <div
          className="sticky top-0 z-10 px-8 py-3 flex items-center gap-3"
          style={{
            background: 'rgba(13,17,23,0.85)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span style={{ fontSize: 16, color: 'var(--accent-light)', opacity: 0.7 }}>{activeTabInfo?.icon}</span>
          <span className="font-brand font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            {activeTabInfo?.label}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
            {activeTabInfo?.sub}
          </span>
        </div>

        <div className="p-8">
          {activeTab === 'point'     && <PointSettings />}
          {activeTab === 'performer' && <PerformerSettings />}
          {activeTab === 'simulator' && <SalesSimulator />}
          {activeTab === 'cohort'    && <CohortForecast />}
          {activeTab === 'agency'    && <AgencyROI />}
          {activeTab === 'income'    && <IncomeCalculator />}
          {activeTab === 'report'    && <ReportGenerator />}
          {activeTab === 'campaign'  && <CampaignPlanner />}
          {activeTab === 'banner'    && <BannerManager />}
        </div>
      </main>
    </div>
  )
}
