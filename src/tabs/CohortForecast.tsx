import { useMemo } from 'react'
import { useAppContext } from '../context/AppContext'
import { calcMonthlyKPI } from '../utils/calculations'

export function CohortForecast() {
  const { data, updateCohortParams, updateSimulatorParams } = useAppContext()
  const { simulatorParams: sp, cohortParams: cp } = data

  const kpi = calcMonthlyKPI({
    adBudget: sp.adBudget,
    cpi: sp.cpi,
    conversionRate: sp.conversionRate,
    arppu: sp.arppu,
  })

  const rows = useMemo(() => {
    const r2 = cp.secondMonthRetention   // 1ヶ月目→2ヶ月目
    const r3 = cp.continuousRetention    // 3ヶ月目以降の毎月継続率
    return Array.from({ length: cp.months }, (_, i) => {
      const month = i + 1
      const newCount = kpi.payingUsers
      const newSales = newCount * cp.newUserArppu

      // 2ヶ月目残存 = 新規 × 2ヶ月目継続率
      const secondCount = month >= 2 ? Math.floor(kpi.payingUsers * r2) : 0
      const secondSales = secondCount * cp.secondMonthArppu

      // 3ヶ月目以降: コホート年齢 age（age=2が2ヶ月目）。age>=3 は r2 × r3^(age-2)
      let continuousCount = 0
      if (month >= 3) {
        for (let age = 3; age <= month; age++) {
          continuousCount += Math.floor(kpi.payingUsers * r2 * Math.pow(r3, age - 2))
        }
      }
      const continuousSales = continuousCount * cp.continuousArppu

      const totalSales = newSales + secondSales + continuousSales
      return { month, newCount, newSales, secondCount, secondSales, continuousCount, continuousSales, totalSales }
    })
  }, [kpi, cp])

  const fmt = (n: number) => `¥${Math.floor(n).toLocaleString()}`

  return (
    <div className="space-y-6 max-w-5xl">
      <h2 className="text-xl font-bold text-gray-800">ユーザーコホート売上予測</h2>

      {/* パラメータ */}
      <section className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-700 mb-4">コホート設定</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {([
            { label: '予測月数', key: 'months' as const, min: 3, max: 36 },
            { label: '新規ARPPU (¥)', key: 'newUserArppu' as const, min: 1000, max: 200000 },
            { label: '継続候補ARPPU (¥)', key: 'secondMonthArppu' as const, min: 1000, max: 200000 },
            { label: '継続ARPPU (¥)', key: 'continuousArppu' as const, min: 1000, max: 200000 },
          ] as const).map(({ label, key, min, max }) => (
            <div key={key}>
              <label className="block text-gray-600 mb-1">{label}</label>
              <input
                type="number" min={min} max={max}
                value={cp[key]}
                onChange={(e) => updateCohortParams({ [key]: parseInt(e.target.value) || min })}
                className="w-full border border-gray-300 rounded px-2 py-1"
              />
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              2ヶ月目の継続率 (%) <span className="text-gray-400">1→2ヶ月目</span>
            </label>
            <input
              type="range" min={0.01} max={0.99} step={0.01}
              value={cp.secondMonthRetention}
              onChange={(e) => updateCohortParams({ secondMonthRetention: parseFloat(e.target.value) })}
              className="w-full accent-indigo-600"
            />
            <span className="text-sm font-bold text-indigo-600">{(cp.secondMonthRetention * 100).toFixed(0)}%</span>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              3ヶ月目以降の継続率 (%) <span className="text-gray-400">毎月 ※シミュレーター連動</span>
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
            <span className="text-sm font-bold text-indigo-600">{(cp.continuousRetention * 100).toFixed(0)}%</span>
          </div>
        </div>
      </section>

      {/* テーブル */}
      <section className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-indigo-700 text-white text-xs">
              <th className="px-3 py-2">月</th>
              <th className="px-3 py-2 text-center" colSpan={2}>新規（1ヶ月目）</th>
              <th className="px-3 py-2 text-center" colSpan={2}>継続候補（2ヶ月目）</th>
              <th className="px-3 py-2 text-center" colSpan={2}>継続（3ヶ月目〜）</th>
              <th className="px-3 py-2 text-right">合計売上</th>
            </tr>
            <tr className="bg-indigo-100 text-gray-700 text-xs">
              <th className="px-3 py-1"></th>
              <th className="px-3 py-1 text-right">人数</th>
              <th className="px-3 py-1 text-right">売上</th>
              <th className="px-3 py-1 text-right">人数</th>
              <th className="px-3 py-1 text-right">売上</th>
              <th className="px-3 py-1 text-right">人数</th>
              <th className="px-3 py-1 text-right">売上</th>
              <th className="px-3 py-1 text-right">合計</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month} className="border-b border-gray-100 hover:bg-gray-50 text-right">
                <td className="px-3 py-2 text-center font-medium text-gray-600">{row.month}月</td>
                <td className="px-3 py-2">{row.newCount.toLocaleString()}人</td>
                <td className="px-3 py-2 text-blue-600">{fmt(row.newSales)}</td>
                <td className="px-3 py-2">{row.secondCount > 0 ? `${row.secondCount.toLocaleString()}人` : '-'}</td>
                <td className="px-3 py-2 text-purple-600">{row.secondCount > 0 ? fmt(row.secondSales) : '-'}</td>
                <td className="px-3 py-2">{row.continuousCount > 0 ? `${row.continuousCount.toLocaleString()}人` : '-'}</td>
                <td className="px-3 py-2 text-green-600">{row.continuousCount > 0 ? fmt(row.continuousSales) : '-'}</td>
                <td className="px-3 py-2 font-bold text-gray-800">{fmt(row.totalSales)}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-bold text-right border-t-2 border-gray-300">
              <td className="px-3 py-2 text-center">合計</td>
              <td className="px-3 py-2" colSpan={6}></td>
              <td className="px-3 py-2 text-indigo-700">
                {fmt(rows.reduce((s, r) => s + r.totalSales, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  )
}
