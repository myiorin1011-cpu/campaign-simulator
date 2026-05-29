import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAppContext } from '../context/AppContext'
import { KPICard } from '../components/KPICard'
import { calcMonthlyKPI, calcPerformerIncome } from '../utils/calculations'

export function SalesSimulator() {
  const { data, updateSimulatorParams } = useAppContext()
  const { simulatorParams: p, performerRanks, pointConfig } = data

  const rank = performerRanks.find((r) => r.stage === p.selectedRank) ?? performerRanks[2]

  // 選択ランクのアクションから稼働パターン別の獲得pt推定
  const estimatedMonthlyPt = useMemo(() => {
    const msgAction = rank.actions.find((a) => a.type === 'message')
    const voiceAction = rank.actions.find((a) => a.type === 'voice_call')
    // バランス型: メッセージ200通 + 通話60分 + 画像10枚 程度の月間稼働想定
    const msgNormal  = (msgAction?.performerNormal ?? 0) * (p.activityPattern === 'call' ? 50 : 200)
    const msgBonus   = (msgAction?.performerBonus  ?? 0) * (p.activityPattern === 'call' ? 50 : 200)
    const voiceNormal = (voiceAction?.performerNormal ?? 0) * (p.activityPattern === 'message' ? 10 : 60)
    const voiceBonus  = (voiceAction?.performerBonus  ?? 0) * (p.activityPattern === 'message' ? 10 : 60)
    return { normalPt: msgNormal + voiceNormal, bonusPt: msgBonus + voiceBonus }
  }, [rank, p.activityPattern])

  const performerMonthlyIncome = calcPerformerIncome(
    estimatedMonthlyPt.normalPt,
    estimatedMonthlyPt.bonusPt,
    pointConfig.normalPtCost,
    pointConfig.bonusPtCost,
  )

  const kpi = calcMonthlyKPI({
    adBudget: p.adBudget,
    cpi: p.cpi,
    conversionRate: p.conversionRate,
    arppu: p.arppu,
  })

  // 12ヶ月推移データ
  const chartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const retentionMultiplier = p.retentionRate === 1
        ? month
        : (1 - Math.pow(p.retentionRate, month)) / (1 - p.retentionRate)
      const totalUsers = Math.floor(kpi.payingUsers * retentionMultiplier)
      const sales = totalUsers * p.arppu
      const grossProfit = Math.floor(sales * p.grossMarginRate)
      return {
        month: `${month}月`,
        売上: sales,
        粗利: grossProfit,
        パフォーマー報酬: Math.floor(performerMonthlyIncome * retentionMultiplier),
      }
    })
  }, [kpi, p, performerMonthlyIncome])

  const fmt = (n: number) => `¥${Math.floor(n).toLocaleString()}`

  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-xl font-bold text-gray-800">売上シミュレーター</h2>

      {/* パラメータ入力 */}
      <section className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-700 mb-4">入力パラメータ</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {([
            { label: '月間広告費 (¥)', key: 'adBudget' as const, min: 0, max: 50000000, step: 100000, pct: false },
            { label: 'CPI (¥/install)', key: 'cpi' as const, min: 50, max: 5000, step: 50, pct: false },
            { label: '課金率 (%)', key: 'conversionRate' as const, min: 0.01, max: 0.5, step: 0.01, pct: true },
            { label: 'ARPPU (¥)', key: 'arppu' as const, min: 1000, max: 200000, step: 1000, pct: false },
            { label: '継続率 (%)', key: 'retentionRate' as const, min: 0.01, max: 0.99, step: 0.01, pct: true },
            { label: '粗利率 (%)', key: 'grossMarginRate' as const, min: 0.1, max: 0.9, step: 0.01, pct: true },
          ] as const).map(({ label, key, min, max, step, pct }) => (
            <div key={key}>
              <label className="block text-sm text-gray-600 mb-1">
                {label}: <strong>{pct ? `${(p[key] * 100).toFixed(0)}%` : `¥${(p[key] as number).toLocaleString()}`}</strong>
              </label>
              <input
                type="range" min={min} max={max} step={step}
                value={p[key]}
                onChange={(e) => updateSimulatorParams({ [key]: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600"
              />
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">想定ランク</label>
            <select
              value={p.selectedRank}
              onChange={(e) => updateSimulatorParams({ selectedRank: parseInt(e.target.value) })}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            >
              {performerRanks.map((r) => (
                <option key={r.stage} value={r.stage}>{r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">稼働パターン</label>
            <select
              value={p.activityPattern}
              onChange={(e) => updateSimulatorParams({ activityPattern: e.target.value as 'message'|'call'|'balanced' })}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="balanced">バランス型</option>
              <option value="message">メッセージ中心</option>
              <option value="call">通話中心</option>
            </select>
          </div>
        </div>
      </section>

      {/* KPIカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="月間インストール数" value={`${kpi.installs.toLocaleString()}人`} color="blue" />
        <KPICard label="月間課金ユーザー数" value={`${kpi.payingUsers.toLocaleString()}人`} color="purple" />
        <KPICard label="月間売上" value={fmt(kpi.sales)} color="green" />
        <KPICard
          label="パフォーマー想定月収"
          value={fmt(performerMonthlyIncome)}
          sub={`税引後: ${fmt(performerMonthlyIncome * (1 - pointConfig.withholdingIndividual) - pointConfig.transferFee)}`}
          color="orange"
        />
      </div>

      {/* 12ヶ月グラフ */}
      <section className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-700 mb-4">12ヶ月推移予測</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `${(v/10000).toFixed(0)}万`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => v != null ? `¥${Number(v).toLocaleString()}` : ''} />
            <Legend />
            <Line type="monotone" dataKey="売上" stroke="#6366f1" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="粗利" stroke="#22c55e" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="パフォーマー報酬" stroke="#f97316" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>
    </div>
  )
}
