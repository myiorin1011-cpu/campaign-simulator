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
    <div className="min-h-screen bg-indigo-700 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-sm text-center">
        <div className="text-4xl mb-3">📊</div>
        <h1 className="text-xl font-bold text-gray-800 mb-1">キャンペーンシミュレーター</h1>
        <p className="text-sm text-gray-500 mb-6">パスワードを入力してください</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={input}
            onChange={e => { setInput(e.target.value); setError(false) }}
            placeholder="パスワード"
            autoFocus
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          {error && <p className="text-red-500 text-xs">パスワードが違います</p>}
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700"
          >
            ログイン
          </button>
        </form>
      </div>
    </div>
  )
}
// ────────────────────────────────────────────────────

import { TabNav } from './components/TabNav'
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-700 text-white px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">📊 キャンペーンシミュレーター</h1>
        <button
          onClick={() => { if (confirm('全設定を初期値にリセットしますか？')) resetToInitial() }}
          className="text-xs text-indigo-200 hover:text-white underline"
        >
          初期値にリセット
        </button>
      </header>
      <TabNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="p-6">
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
