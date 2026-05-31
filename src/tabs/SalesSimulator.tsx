import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAppContext } from '../context/AppContext'
import { KPICard } from '../components/KPICard'
import { calcMonthlyKPI, calcPerformerIncome, calcLTV, calcPaybackMonths } from '../utils/calculations'

export function SalesSimulator() {
  const { data, updateSimulatorParams } = useAppContext()
  const { simulatorParams: p, performerRanks, pointConfig } = data

  // 稼働パターン別の月間獲得pt推定（任意ランク）
  // バランス型: メッセージ200通 + 通話60分 程度の月間稼働想定
  const estimatePtForRank = (r: typeof performerRanks[number]) => {
    const msgAction = r.actions.find((a) => a.type === 'message')
    const voiceAction = r.actions.find((a) => a.type === 'voice_call')
    const msgMult   = p.activityPattern === 'call' ? 50 : 200
    const voiceMult = p.activityPattern === 'message' ? 10 : 60
    const normalPt = (msgAction?.performerNormal ?? 0) * msgMult + (voiceAction?.performerNormal ?? 0) * voiceMult
    const bonusPt  = (msgAction?.performerBonus  ?? 0) * msgMult + (voiceAction?.performerBonus  ?? 0) * voiceMult
    return { normalPt, bonusPt }
  }

  // 全ランクの想定月収一覧
  const rankIncomeRows = useMemo(() =>
    performerRanks.map((r) => {
      const pt = estimatePtForRank(r)
      const income = calcPerformerIncome(pt.normalPt, pt.bonusPt, pointConfig.normalPtCost, pointConfig.bonusPtCost)
      const afterTax = income * (1 - pointConfig.withholdingIndividual) - pointConfig.transferFee
      return { rank: r, ...pt, income, afterTax }
    }),
    [performerRanks, p.activityPattern, pointConfig],
  )

  // 代表ランク（ゴールド）をKPI・グラフ用に使用
  const repRow = rankIncomeRows.find((row) => row.rank.stage === 3) ?? rankIncomeRows[2]
  const performerMonthlyIncome = repRow?.income ?? 0

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

  // LTV・ペイバック
  const ltv = calcLTV(p.arppu, p.retentionRate)
  const paybackMonths = calcPaybackMonths(p.cpi, p.arppu, p.conversionRate, p.grossMarginRate)
  // LTV ÷ CPA(=1課金あたり獲得コスト) ユニットエコノミクス
  const cpaPerPayer = p.conversionRate > 0 ? p.cpi / p.conversionRate : 0
  const ltvCacRatio = cpaPerPayer > 0 ? ltv / cpaPerPayer : 0

  // LTV早見表（継続率 × ARPPU）
  const ltvRetentionRows = [0.5, 0.6, 0.7, 0.8, 0.9]
  const ltvArppuCols = [p.arppu * 0.5, p.arppu * 0.75, p.arppu, p.arppu * 1.25, p.arppu * 1.5].map(Math.round)

  // 損益分岐グラフ：1課金ユーザーあたり累積粗利 vs 獲得コスト(CPA)
  const breakevenData = useMemo(() => {
    const monthlyGP = p.arppu * p.grossMarginRate
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const mult = p.retentionRate === 1
        ? month
        : (1 - Math.pow(p.retentionRate, month)) / (1 - p.retentionRate)
      return {
        month: `${month}月`,
        累積粗利: Math.floor(monthlyGP * mult),
        獲得コストCPA: Math.floor(cpaPerPayer),
      }
    })
  }, [p.arppu, p.grossMarginRate, p.retentionRate, cpaPerPayer])

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
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">稼働パターン</label>
            <select
              value={p.activityPattern}
              onChange={(e) => updateSimulatorParams({ activityPattern: e.target.value as 'message'|'call'|'balanced' })}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="balanced">バランス型（メッセージ200通＋通話60分/月）</option>
              <option value="message">メッセージ中心（メッセージ200通＋通話10分/月）</option>
              <option value="call">通話中心（メッセージ50通＋通話60分/月）</option>
            </select>
          </div>
        </div>
      </section>

      {/* 全ランク想定月収一覧 */}
      <section className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-700 mb-1">ランク別 想定月収一覧</h3>
        <p className="text-xs text-gray-500 mb-4">
          選択中の稼働パターンでの各ランクの想定月収です。代表値（ゴールド）を下部KPI・グラフに使用しています。
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-indigo-100 text-gray-700 text-xs">
                <th className="px-3 py-2 text-left border border-gray-200">ランク</th>
                <th className="px-3 py-2 text-right border border-gray-200">通常pt/月</th>
                <th className="px-3 py-2 text-right border border-gray-200">ボーナスpt/月</th>
                <th className="px-3 py-2 text-right border border-gray-200">想定月収(税引前)</th>
                <th className="px-3 py-2 text-right border border-gray-200">税引後</th>
              </tr>
            </thead>
            <tbody>
              {rankIncomeRows.map((row, i) => {
                const isRep = row.rank.stage === 3
                const isZero = row.income <= 0
                return (
                  <tr
                    key={row.rank.stage}
                    className={`${isRep ? 'bg-amber-50 font-semibold' : i % 2 === 1 ? 'bg-gray-50' : 'bg-white'} ${isZero ? 'text-gray-300' : ''} hover:bg-indigo-50/60`}
                  >
                    <td className="px-3 py-1.5 text-left border border-gray-200">
                      {row.rank.name}{isRep && <span className="ml-1 text-[10px] text-amber-600">(代表)</span>}
                    </td>
                    <td className="px-3 py-1.5 text-right border border-gray-200">{row.normalPt.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-right border border-gray-200">{row.bonusPt.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-right border border-gray-200 text-green-700 font-medium">{fmt(row.income)}</td>
                    <td className="px-3 py-1.5 text-right border border-gray-200 text-gray-600">{fmt(row.afterTax)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* KPIカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="月間インストール数" value={`${kpi.installs.toLocaleString()}人`} color="blue" />
        <KPICard label="月間課金ユーザー数" value={`${kpi.payingUsers.toLocaleString()}人`} color="purple" />
        <KPICard label="月間売上" value={fmt(kpi.sales)} color="green" />
        <KPICard
          label="パフォーマー想定月収(ゴールド)"
          value={fmt(performerMonthlyIncome)}
          sub={`税引後: ${fmt(performerMonthlyIncome * (1 - pointConfig.withholdingIndividual) - pointConfig.transferFee)}`}
          color="orange"
        />
      </div>

      {/* LTV・ユニットエコノミクスKPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="LTV (顧客生涯価値)" value={fmt(ltv)} sub="ARPPU÷(1-継続率)" color="green" />
        <KPICard label="CPAペイバック期間" value={`${paybackMonths >= 999 ? '—' : paybackMonths.toFixed(1)}ヶ月`} sub="回収にかかる月数" color="orange" />
        <KPICard label="課金あたり獲得コスト" value={fmt(cpaPerPayer)} sub="CPI÷課金率" color="blue" />
        <KPICard
          label="LTV / CAC 比率"
          value={`${ltvCacRatio.toFixed(1)}倍`}
          sub={ltvCacRatio >= 3 ? '健全(3倍以上)' : '要改善'}
          color={ltvCacRatio >= 3 ? 'green' : 'purple'}
        />
      </div>

      {/* LTV早見表 */}
      <section className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-700 mb-1">LTV早見表（継続率 × ARPPU）</h3>
        <p className="text-xs text-gray-500 mb-4">現在のARPPU ¥{p.arppu.toLocaleString()} を中心に算出。色が濃いほど高LTV。</p>
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead>
              <tr className="bg-indigo-100 text-gray-700">
                <th className="px-3 py-2 border border-gray-200">継続率＼ARPPU</th>
                {ltvArppuCols.map((a) => (
                  <th key={a} className="px-3 py-2 border border-gray-200 text-right">¥{a.toLocaleString()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ltvRetentionRows.map((ret) => (
                <tr key={ret}>
                  <td className="px-3 py-2 border border-gray-200 font-medium bg-gray-50">{(ret * 100).toFixed(0)}%</td>
                  {ltvArppuCols.map((a) => {
                    const v = calcLTV(a, ret)
                    const isCurrent = Math.abs(ret - p.retentionRate) < 0.05 && a === p.arppu
                    return (
                      <td key={a} className={`px-3 py-2 border border-gray-200 text-right ${isCurrent ? 'bg-indigo-200 font-bold' : ''}`}>
                        ¥{Math.floor(v).toLocaleString()}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 損益分岐グラフ */}
      <section className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-700 mb-1">損益分岐グラフ（1課金ユーザーあたり）</h3>
        <p className="text-xs text-gray-500 mb-4">累積粗利が獲得コスト(CPA)ラインを超える月が回収完了の目安です。</p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={breakevenData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `${(v/10000).toFixed(1)}万`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => v != null ? `¥${Number(v).toLocaleString()}` : ''} />
            <Legend />
            <Line type="monotone" dataKey="累積粗利" stroke="#22c55e" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="獲得コストCPA" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>

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
