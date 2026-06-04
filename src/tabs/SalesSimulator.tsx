import { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAppContext } from '../context/AppContext'
import { KPICard } from '../components/KPICard'
import {
  calcMonthlyKPI, calcPerformerIncome, calcLTV, calcPaybackMonths,
  calcCampaignImpact, calcTargetPerformerBudget, calcAutoGrossMarginRate,
} from '../utils/calculations'

export function SalesSimulator() {
  const { data, updateSimulatorParams } = useAppContext()
  const { simulatorParams: p, performerRanks, pointConfig } = data

  type ImpactScenario = 'base' | 'campaign1' | 'campaign2'
  const [impactSales, setImpactSales]           = useState(3200000)
  const [impactScenario, setImpactScenario]     = useState<ImpactScenario>('base')
  const [targetMarginRate, setTargetMarginRate] = useState(40)

  const [useAutoMargin, setUseAutoMargin] = useState(true)

  const autoMarginRate = useMemo(
    () => calcAutoGrossMarginRate(data.purchasePlans, pointConfig),
    [data.purchasePlans, pointConfig],
  )

  // 実効粗利率: 自動モードはポイント設定から計算、手動モードはシミュレーターのスライダー値を使用
  const effectiveGrossMarginRate = useAutoMargin ? autoMarginRate : p.grossMarginRate

  const allPlans = {
    base:      data.purchasePlans,
    campaign1: data.purchasePlans1,
    campaign2: data.purchasePlans2,
  }

  const impact = useMemo(
    () => calcCampaignImpact(impactSales, impactScenario, pointConfig, allPlans),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [impactSales, impactScenario, data.purchasePlans, data.purchasePlans1, data.purchasePlans2, pointConfig],
  )

  const budget = useMemo(
    () => calcTargetPerformerBudget(impactSales, targetMarginRate / 100, pointConfig, allPlans[impactScenario]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [impactSales, targetMarginRate, impactScenario, data.purchasePlans, data.purchasePlans1, data.purchasePlans2, pointConfig],
  )

  const fmt2 = (n: number) => n.toLocaleString('ja-JP')
  const pct = (r: number) => (r * 100).toFixed(1) + '%'

  // 有料メッセージ1開封あたりの平均文字数（有料鑑定は1文字単価のため換算が必要）
  const CHARS_PER_PAID_OPEN = 400

  // 月間メッセージ受信数・有料メッセージ開封数からの獲得pt推定（任意ランク）
  // ※通話は売上予測に含めない
  const estimatePtForRank = (r: typeof performerRanks[number]) => {
    const msgAction  = r.actions.find((a) => a.type === 'message')        // メッセージ受信（1通単価）
    const paidAction = r.actions.find((a) => a.type === 'fortune_char')   // 有料鑑定＝有料メッセージ開封（1文字単価）
    const paidChars  = p.monthlyPaidOpens * CHARS_PER_PAID_OPEN           // 開封数 × 平均文字数
    const normalPt = (msgAction?.performerNormal ?? 0) * p.monthlyMessages + (paidAction?.performerNormal ?? 0) * paidChars
    const bonusPt  = (msgAction?.performerBonus  ?? 0) * p.monthlyMessages + (paidAction?.performerBonus  ?? 0) * paidChars
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
    [performerRanks, p.monthlyMessages, p.monthlyPaidOpens, pointConfig],
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
      const grossProfit = Math.floor(sales * effectiveGrossMarginRate)
      return {
        month: `${month}月`,
        売上: sales,
        粗利: grossProfit,
        パフォーマー報酬: Math.floor(performerMonthlyIncome * retentionMultiplier),
      }
    })
  }, [kpi, p, performerMonthlyIncome, effectiveGrossMarginRate])

  // LTV・ペイバック
  const ltv = calcLTV(p.arppu, p.retentionRate)
  const paybackMonths = calcPaybackMonths(p.cpi, p.arppu, p.conversionRate, effectiveGrossMarginRate)
  // LTV ÷ CPA(=1課金あたり獲得コスト) ユニットエコノミクス
  const cpaPerPayer = p.conversionRate > 0 ? p.cpi / p.conversionRate : 0
  const ltvCacRatio = cpaPerPayer > 0 ? ltv / cpaPerPayer : 0

  // LTV早見表（継続率 × ARPPU）
  const ltvRetentionRows = [0.5, 0.6, 0.7, 0.8, 0.9]
  const ltvArppuCols = [p.arppu * 0.5, p.arppu * 0.75, p.arppu, p.arppu * 1.25, p.arppu * 1.5].map(Math.round)

  // 損益分岐グラフ：1課金ユーザーあたり累積粗利 vs 獲得コスト(CPA)
  const breakevenData = useMemo(() => {
    const monthlyGP = p.arppu * effectiveGrossMarginRate
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
  }, [p.arppu, effectiveGrossMarginRate, p.retentionRate, cpaPerPayer])

  const fmt = (n: number) => `¥${Math.floor(n).toLocaleString()}`

  return (
    <div className="space-y-6 max-w-4xl">
      {/* キャンペーン収益影響パネル */}
      <div className="card mb-6">
        <h2 className="section-title">キャンペーン収益影響シミュレーター</h2>

        {/* シナリオ選択 */}
        <div className="flex gap-2 mb-4">
          {(['base', 'campaign1', 'campaign2'] as ImpactScenario[]).map((s) => (
            <button
              key={s}
              onClick={() => setImpactScenario(s)}
              className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                impactScenario === s
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'btn-ghost'
              }`}
            >
              {s === 'base' ? '基本設定' : s === 'campaign1' ? 'キャンペーン1' : 'キャンペーン2'}
            </button>
          ))}
        </div>

        {/* 売上入力 */}
        <div className="flex items-center gap-2 mb-4">
          <label className="text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>売上入力</label>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>¥</span>
          <input
            type="number"
            value={impactSales}
            onChange={(e) => setImpactSales(Number(e.target.value))}
            className="input-dark w-36 text-right"
            step={100000}
          />
        </div>

        {/* 結果カード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div style={{ background: 'var(--positive-bg)', border: '1px solid rgba(63,185,80,0.2)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>粗利額</div>
            <div className="kpi-value" style={{ color: 'var(--positive)' }}>¥{fmt2(impact.grossMargin)}</div>
          </div>
          <div style={{ background: 'var(--accent-dim)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>粗利率</div>
            <div className="kpi-value" style={{ color: 'var(--accent-light)' }}>{pct(impact.grossMarginRate)}</div>
          </div>
          <div style={{ background: 'var(--purple-bg)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>パフォーマー報酬</div>
            <div className="kpi-value" style={{ color: 'var(--purple)' }}>¥{fmt2(impact.performerReward)}</div>
          </div>
          <div style={{
            background: impact.loss > 0 ? 'var(--negative-bg)' : impact.loss < 0 ? 'var(--positive-bg)' : 'var(--bg-elevated)',
            border: impact.loss > 0 ? '1px solid rgba(248,81,73,0.2)' : impact.loss < 0 ? '1px solid rgba(63,185,80,0.2)' : '1px solid var(--border)',
            borderRadius: 8, padding: '10px 12px', textAlign: 'center'
          }}>
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>基本比損失</div>
            <div className="kpi-value" style={{ color: impact.loss > 0 ? 'var(--negative)' : impact.loss < 0 ? 'var(--positive)' : 'var(--text-muted)' }}>
              {impact.loss > 0 ? `+¥${fmt2(impact.loss)}` : impact.loss < 0 ? `-¥${fmt2(Math.abs(impact.loss))}` : '±0'}
            </div>
          </div>
        </div>

        {/* 目標粗利率からの逆算 */}
        <div className="pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>目標粗利率</span>
            <input
              type="number"
              value={targetMarginRate}
              onChange={(e) => setTargetMarginRate(Number(e.target.value))}
              className="input-dark w-16 text-right"
              min={0} max={100} step={1}
            />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>%</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>→</span>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              パフォーマーに払える上限:
              <span className="ml-1 font-semibold" style={{ color: 'var(--purple)' }}>¥{fmt2(budget.maxPerformerBudget)}</span>
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>（実際粗利: ¥{fmt2(budget.actualGrossMargin)}）</span>
          </div>
        </div>
      </div>

      <h2 className="page-title">売上シミュレーター</h2>

      {/* パラメータ入力 */}
      <section className="card">
        <h3 className="section-title">入力パラメータ</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {([
            { label: '月間広告費 (¥)', key: 'adBudget' as const, min: 0, max: 50000000, step: 100000, pct: false },
            { label: 'CPI (¥/install)', key: 'cpi' as const, min: 50, max: 5000, step: 50, pct: false },
            { label: '課金率 (%)', key: 'conversionRate' as const, min: 0.01, max: 0.5, step: 0.01, pct: true },
            { label: 'ARPPU (¥)', key: 'arppu' as const, min: 1000, max: 200000, step: 1000, pct: false },
            { label: '継続率 (%)', key: 'retentionRate' as const, min: 0.01, max: 0.99, step: 0.01, pct: true },
          ] as const).map(({ label, key, min, max, step, pct }) => (
            <div key={key}>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                {label}: <strong style={{ color: 'var(--text-primary)' }}>{pct ? `${(p[key] * 100).toFixed(0)}%` : `¥${(p[key] as number).toLocaleString()}`}</strong>
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
        {/* 粗利率: ポイント設定から自動計算 or 手動入力 */}
        <div className="mt-4 p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              粗利率
              {useAutoMargin && (
                <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-dim)', color: 'var(--accent-light)' }}>
                  ポイント設定から自動計算
                </span>
              )}
            </span>
            <button
              onClick={() => setUseAutoMargin(v => !v)}
              className="text-[11px] px-2 py-1 rounded"
              style={{
                background: useAutoMargin ? 'var(--accent-dim)' : 'var(--bg-hover)',
                color: useAutoMargin ? 'var(--accent-light)' : 'var(--text-muted)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
              }}
            >
              {useAutoMargin ? '🔒 自動' : '✏️ 手動'}
            </button>
          </div>
          {useAutoMargin ? (
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold font-mono-num" style={{ color: 'var(--positive)' }}>
                {(autoMarginRate * 100).toFixed(1)}%
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                ポイント設定の基本設定プランから算出。キャンペーン時の影響は上部パネルで確認。
              </span>
            </div>
          ) : (
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                手動入力: <strong style={{ color: 'var(--text-primary)' }}>{(p.grossMarginRate * 100).toFixed(0)}%</strong>
              </label>
              <input
                type="range" min={0.1} max={0.9} step={0.01}
                value={p.grossMarginRate}
                onChange={(e) => updateSimulatorParams({ grossMarginRate: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600"
              />
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              月間メッセージ受信数（1人あたり）: <strong style={{ color: 'var(--text-primary)' }}>{p.monthlyMessages.toLocaleString()}通</strong>
            </label>
            <input
              type="number" min={0} step={100}
              value={p.monthlyMessages}
              onChange={(e) => updateSimulatorParams({ monthlyMessages: parseInt(e.target.value) || 0 })}
              className="input-dark w-full text-right"
            />
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>例: 1日200通 × 30日 = 6,000通</p>
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              月間 有料メッセージ開封数（1人あたり）: <strong style={{ color: 'var(--text-primary)' }}>{p.monthlyPaidOpens.toLocaleString()}回</strong>
            </label>
            <input
              type="number" min={0} step={10}
              value={p.monthlyPaidOpens}
              onChange={(e) => updateSimulatorParams({ monthlyPaidOpens: parseInt(e.target.value) || 0 })}
              className="input-dark w-full text-right"
            />
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>1開封＝平均400文字で換算（有料鑑定の1文字単価×400）。通話は売上に含めません。</p>
          </div>
        </div>
      </section>

      {/* 全ランク想定月収一覧 */}
      <section className="card">
        <h3 className="section-title">ランク別 想定月収一覧</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          上記のメッセージ受信数・有料メッセージ開封数での各ランクの想定月収です。代表値（ゴールド）を下部KPI・グラフに使用しています。
        </p>
        <div className="overflow-x-auto">
          <table className="table-dark">
            <thead>
              <tr>
                <th className="text-left">ランク</th>
                <th className="text-right">通常pt/月</th>
                <th className="text-right">ボーナスpt/月</th>
                <th className="text-right">想定月収(税引前)</th>
                <th className="text-right">税引後</th>
              </tr>
            </thead>
            <tbody>
              {rankIncomeRows.map((row, i) => {
                const isRep = row.rank.stage === 3
                const isZero = row.income <= 0
                return (
                  <tr
                    key={row.rank.stage}
                    style={isRep ? { background: 'var(--warning-bg)', fontWeight: 600 } : i % 2 === 1 ? { background: 'var(--bg-elevated)' } : undefined}
                    className={isZero ? 'opacity-30' : ''}
                  >
                    <td className="text-left">
                      {row.rank.name}{isRep && <span className="ml-1 text-[10px]" style={{ color: 'var(--warning)' }}>(代表)</span>}
                    </td>
                    <td className="text-right">{row.normalPt.toLocaleString()}</td>
                    <td className="text-right">{row.bonusPt.toLocaleString()}</td>
                    <td className="text-right font-medium" style={{ color: 'var(--positive)' }}>{fmt(row.income)}</td>
                    <td className="text-right" style={{ color: 'var(--text-secondary)' }}>{fmt(row.afterTax)}</td>
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
      <section className="card">
        <h3 className="section-title">LTV早見表（継続率 × ARPPU）</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>現在のARPPU ¥{p.arppu.toLocaleString()} を中心に算出。色が濃いほど高LTV。</p>
        <div className="overflow-x-auto">
          <table className="table-dark">
            <thead>
              <tr>
                <th>継続率＼ARPPU</th>
                {ltvArppuCols.map((a) => (
                  <th key={a} className="text-right">¥{a.toLocaleString()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ltvRetentionRows.map((ret) => (
                <tr key={ret}>
                  <td className="font-medium" style={{ background: 'var(--bg-elevated)' }}>{(ret * 100).toFixed(0)}%</td>
                  {ltvArppuCols.map((a) => {
                    const v = calcLTV(a, ret)
                    const isCurrent = Math.abs(ret - p.retentionRate) < 0.05 && a === p.arppu
                    return (
                      <td key={a} className="text-right" style={isCurrent ? { background: 'rgba(99,102,241,0.25)', fontWeight: 700 } : undefined}>
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
      <section className="card">
        <h3 className="section-title">損益分岐グラフ（1課金ユーザーあたり）</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>累積粗利が獲得コスト(CPA)ラインを超える月が回収完了の目安です。</p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={breakevenData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
            <YAxis tickFormatter={(v) => `${(v/10000).toFixed(1)}万`} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <Tooltip formatter={(v) => v != null ? `¥${Number(v).toLocaleString()}` : ''} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            <Legend />
            <Line type="monotone" dataKey="累積粗利" stroke="#22c55e" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="獲得コストCPA" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* 12ヶ月グラフ */}
      <section className="card">
        <h3 className="section-title">12ヶ月推移予測</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
            <YAxis tickFormatter={(v) => `${(v/10000).toFixed(0)}万`} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <Tooltip formatter={(v) => v != null ? `¥${Number(v).toLocaleString()}` : ''} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
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
