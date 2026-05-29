import { useState } from 'react'
import { TabNav } from './components/TabNav'
import { PointSettings } from './tabs/PointSettings'
import { PerformerSettings } from './tabs/PerformerSettings'
import { SalesSimulator } from './tabs/SalesSimulator'
import { CohortForecast } from './tabs/CohortForecast'
import { AgencyROI } from './tabs/AgencyROI'
import { IncomeCalculator } from './tabs/IncomeCalculator'
import { useAppContext } from './context/AppContext'
import { ReportGenerator } from './tabs/ReportGenerator'

const TABS = [
  { id: 'point',     label: '① ポイント設定' },
  { id: 'performer', label: '② パフォーマー設定' },
  { id: 'simulator', label: '③ 売上シミュレーター' },
  { id: 'cohort',    label: '④ コホート予測' },
  { id: 'agency',    label: '⑤ 代理店回収率' },
  { id: 'income',    label: '⑥ 目標月収逆算' },
  { id: 'report',    label: '⑦ 結果報告書' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('point')
  const { resetToInitial } = useAppContext()

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
      </main>
    </div>
  )
}
