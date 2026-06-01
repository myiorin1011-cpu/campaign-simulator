import { useState } from 'react'

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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white border border-gray-200 p-10 w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Paigner</h1>
        <p className="text-sm text-gray-500 mb-6">パスワードを入力してください</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={input}
            onChange={e => { setInput(e.target.value); setError(false) }}
            placeholder="パスワード"
            autoFocus
            className="w-full border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:border-gray-900"
          />
          {error && <p className="text-red-500 text-xs">パスワードが違います</p>}
          <button
            type="submit"
            className="w-full bg-gray-900 text-white py-2 text-sm font-medium hover:bg-gray-700"
          >
            ログイン
          </button>
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
  { id: 'point',     label: '① ポイント設定' },
  { id: 'performer', label: '② パフォーマー設定' },
  { id: 'simulator', label: '③ 売上シミュレーター' },
  { id: 'cohort',    label: '④ コホート予測' },
  { id: 'agency',    label: '⑤ 代理店回収率' },
  { id: 'income',    label: '⑥ 目標月収逆算' },
  { id: 'report',    label: '⑦ 結果報告書' },
  { id: 'campaign',  label: '⑧ キャンペーン企画' },
  { id: 'banner',    label: '⑨ バナー管理' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('point')
  const [unlocked, setUnlocked] = useState(!CORRECT_PASSWORD)
  const { resetToInitial } = useAppContext()

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* 左サイドバー（縦ナビ・フラット） */}
      <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col min-h-screen sticky top-0 h-screen">
        <div className="px-5 py-4 border-b border-gray-200">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Paigner</h1>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-5 py-2.5 text-sm border-l-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-gray-900 bg-gray-100 text-gray-900 font-medium'
                  : 'border-transparent text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="px-5 py-3 border-t border-gray-200">
          <button
            onClick={() => { if (confirm('全設定を初期値にリセットしますか？')) resetToInitial() }}
            className="text-xs text-gray-400 hover:text-gray-700"
          >
            初期値にリセット
          </button>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className="flex-1 p-8 overflow-x-auto">
        {activeTab === 'point'     && <PointSettings />}
        {activeTab === 'performer' && <PerformerSettings />}
        {activeTab === 'simulator' && <SalesSimulator />}
        {activeTab === 'cohort'    && <CohortForecast />}
        {activeTab === 'agency'    && <AgencyROI />}
        {activeTab === 'income'    && <IncomeCalculator />}
        {activeTab === 'report'    && <ReportGenerator />}
        {activeTab === 'campaign'  && <CampaignPlanner />}
        {activeTab === 'banner'    && <BannerManager />}
      </main>
    </div>
  )
}
