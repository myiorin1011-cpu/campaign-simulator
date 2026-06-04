import { useMemo } from 'react'
import { useAppContext } from '../context/AppContext'

export function CohortForecast() {
  const { data, updateCohortParams, updateSimulatorParams } = useAppContext()
  const { simulatorParams: sp, cohortParams: cp } = data

  // 月数分の広告費（不足分は末尾値で補完）
  const budgets = useMemo(
    () => Array.from({ length: cp.months }, (_, i) =>
      cp.monthlyAdBudgets[i] ?? cp.monthlyAdBudgets[cp.monthlyAdBudgets.length - 1] ?? 1000000),
    [cp.months, cp.monthlyAdBudgets],
  )

  // 月別広告費を1セル更新（月数分にリサイズして保存）
  const updateBudget = (i: number, value: number) => {
    const next = Array.from({ length: cp.months }, (_, k) =>
      k === i ? value : (cp.monthlyAdBudgets[k] ?? budgets[k]))
    updateCohortParams({ monthlyAdBudgets: next })
  }

  const rows = useMemo(() => {
    const r2 = cp.secondMonthRetention   // 1ヶ月目→2ヶ月目
    const r3 = cp.continuousRetention    // 3ヶ月目以降の毎月継続率
    const cpi = cp.cpi
    const cr = cp.conversionRate
    // 各月の新規課金ユーザー数 = (広告費 ÷ CPI) × 課金率
    const newCounts = budgets.map((b) => {
      const installs = cpi > 0 ? Math.floor(b / cpi) : 0
      return Math.floor(installs * cr)
    })
    return Array.from({ length: cp.months }, (_, i) => {
      const month = i + 1
      const adBudget = budgets[i]
      const newCount = newCounts[i]
      const newSales = newCount * cp.newUserArppu

      // 2ヶ月目残存 = 前月の新規 × 2ヶ月目継続率
      const secondCount = i >= 1 ? Math.floor(newCounts[i - 1] * r2) : 0
      const secondSales = secondCount * cp.secondMonthArppu

      // 3ヶ月目以降: 各過去コホートの残存を合算（age=2が2ヶ月目）。age>=3 は r2 × r3^(age-2)
      let continuousCount = 0
      for (let age = 3; age <= month; age++) {
        const idx = i - (age - 1)
        if (idx >= 0) continuousCount += Math.floor(newCounts[idx] * r2 * Math.pow(r3, age - 2))
      }
      const continuousSales = continuousCount * cp.continuousArppu

      const totalSales = newSales + secondSales + continuousSales
      return { month, adBudget, newCount, newSales, secondCount, secondSales, continuousCount, continuousSales, totalSales }
    })
  }, [cp, budgets])

  const fmt = (n: number) => `¥${Math.floor(n).toLocaleString()}`

  return (
    <div className="space-y-6 max-w-5xl">
      <h2 className="page-title">ユーザーコホート売上予測</h2>

      {/* パラメータ */}
      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title" style={{ margin: 0 }}>コホート設定</h3>
          <button
            onClick={() => {
              updateCohortParams({
                newUserArppu:       sp.arppu,
                secondMonthArppu:   Math.round(sp.arppu * 0.85),
                continuousArppu:    Math.round(sp.arppu * 0.75),
                continuousRetention: sp.retentionRate,
                retentionRate:      sp.retentionRate,
                secondMonthRetention: Math.min(sp.retentionRate + 0.1, 0.99),
              })
              updateSimulatorParams({ retentionRate: sp.retentionRate })
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
              background: 'var(--accent-dim)', border: '1px solid rgba(99,102,241,0.3)',
              color: 'var(--accent-light)', fontSize: 12, fontWeight: 500,
            }}
            title={`ARPPU: ¥${sp.arppu.toLocaleString()} / 継続率: ${(sp.retentionRate * 100).toFixed(0)}%`}
          >
            ← 売上Simから引き継ぎ
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {([
            { label: '予測月数', key: 'months' as const, min: 3, max: 36 },
            { label: 'CPI (¥/install)', key: 'cpi' as const, min: 10, max: 10000 },
            { label: '新規ARPPU (¥)', key: 'newUserArppu' as const, min: 1000, max: 200000 },
            { label: '継続候補ARPPU (¥)', key: 'secondMonthArppu' as const, min: 1000, max: 200000 },
            { label: '継続ARPPU (¥)', key: 'continuousArppu' as const, min: 1000, max: 200000 },
          ] as const).map(({ label, key, min, max }) => (
            <div key={key}>
              <label className="block text-sm" style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{label}</label>
              <input
                type="number" min={min} max={max}
                value={cp[key]}
                onChange={(e) => updateCohortParams({ [key]: parseInt(e.target.value) || min })}
                className="input-dark w-full"
              />
            </div>
          ))}
          <div>
            <label className="block text-sm" style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>課金率 (%)</label>
            <input
              type="number" min={0.1} max={100} step={0.1}
              value={+(cp.conversionRate * 100).toFixed(1)}
              onChange={(e) => updateCohortParams({ conversionRate: (parseFloat(e.target.value) || 0) / 100 })}
              className="input-dark w-full"
            />
          </div>
        </div>
        <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
          ※ 各月の新規課金ユーザー数 =（その月の広告費 ÷ CPI）× 課金率。広告費は下表で月ごとに手動入力できます。
        </p>
        <p className="text-[11px] mt-3" style={{ color: 'var(--text-muted)' }}>
          売上Sim設定値 — ARPPU: <span style={{ color: 'var(--accent-light)' }}>¥{sp.arppu.toLocaleString()}</span>
          　継続率: <span style={{ color: 'var(--accent-light)' }}>{(sp.retentionRate * 100).toFixed(0)}%</span>
          　引き継ぎ時: 新規=ARPPU、2ヶ月目=×0.85、継続=×0.75
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
          <div>
            <label className="block text-sm" style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              2ヶ月目の継続率 (%) <span style={{ color: 'var(--text-muted)' }}>1→2ヶ月目</span>
            </label>
            <input
              type="range" min={0.01} max={0.99} step={0.01}
              value={cp.secondMonthRetention}
              onChange={(e) => updateCohortParams({ secondMonthRetention: parseFloat(e.target.value) })}
              className="w-full accent-indigo-600"
            />
            <span className="text-sm font-bold font-mono-num" style={{ color: 'var(--accent-light)' }}>{(cp.secondMonthRetention * 100).toFixed(0)}%</span>
          </div>
          <div>
            <label className="block text-sm" style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              3ヶ月目以降の継続率 (%) <span style={{ color: 'var(--text-muted)' }}>毎月 ※シミュレーター連動</span>
            </label>
            <input
              type="range" min={0.01} max={0.99} step={0.01}
              value={cp.continuousRetention}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                updateCohortParams({ continuousRetention: v, retentionRate: v })
                updateSimulatorParams({ retentionRate: v })
              }}
              className="w-full accent-indigo-600"
            />
            <span className="text-sm font-bold font-mono-num" style={{ color: 'var(--accent-light)' }}>{(cp.continuousRetention * 100).toFixed(0)}%</span>
          </div>
        </div>
      </section>

      {/* テーブル */}
      <section className="card overflow-x-auto" style={{ padding: 0 }}>
        <table className="table-dark w-full text-sm">
          <thead>
            <tr>
              <th>月</th>
              <th className="text-right">広告費</th>
              <th className="text-center" colSpan={2}>新規（1ヶ月目）</th>
              <th className="text-center" colSpan={2}>継続候補（2ヶ月目）</th>
              <th className="text-center" colSpan={2}>継続（3ヶ月目〜）</th>
              <th className="text-right">合計売上</th>
            </tr>
            <tr>
              <th></th>
              <th className="text-right">（手動入力）</th>
              <th className="text-right">人数</th>
              <th className="text-right">売上</th>
              <th className="text-right">人数</th>
              <th className="text-right">売上</th>
              <th className="text-right">人数</th>
              <th className="text-right">売上</th>
              <th className="text-right">合計</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month} className="text-right">
                <td className="text-center font-medium" style={{ color: 'var(--text-secondary)' }}>{row.month}月</td>
                <td className="text-right">
                  <input
                    type="number" min={0} step={100000}
                    value={row.adBudget}
                    onChange={(e) => updateBudget(row.month - 1, parseInt(e.target.value) || 0)}
                    className="input-dark text-right"
                    style={{ width: '7.5rem' }}
                  />
                </td>
                <td>{row.newCount.toLocaleString()}人</td>
                <td style={{ color: 'var(--accent-light)' }}>{fmt(row.newSales)}</td>
                <td>{row.secondCount > 0 ? `${row.secondCount.toLocaleString()}人` : '-'}</td>
                <td style={{ color: 'var(--purple)' }}>{row.secondCount > 0 ? fmt(row.secondSales) : '-'}</td>
                <td>{row.continuousCount > 0 ? `${row.continuousCount.toLocaleString()}人` : '-'}</td>
                <td style={{ color: 'var(--positive)' }}>{row.continuousCount > 0 ? fmt(row.continuousSales) : '-'}</td>
                <td className="font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(row.totalSales)}</td>
              </tr>
            ))}
            <tr className="font-bold text-right" style={{ background: 'var(--bg-elevated)', borderTop: '2px solid var(--border)' }}>
              <td className="text-center" style={{ color: 'var(--text-secondary)' }}>合計</td>
              <td style={{ color: 'var(--text-secondary)' }}>{fmt(rows.reduce((s, r) => s + r.adBudget, 0))}</td>
              <td colSpan={6}></td>
              <td style={{ color: 'var(--accent-light)' }}>
                {fmt(rows.reduce((s, r) => s + r.totalSales, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  )
}
