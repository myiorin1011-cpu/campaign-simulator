import { useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { calcAgencyROI } from '../utils/calculations'
import type { Agency, AgencyMonthData } from '../types'

const DISPLAY_MONTHS = 12

function roiColor(roi: number) {
  if (roi >= 1.5) return 'bg-green-200 text-green-800'
  if (roi >= 1.0) return 'bg-yellow-100 text-yellow-800'
  if (roi >= 0.5) return 'bg-orange-100 text-orange-800'
  return 'bg-red-100 text-red-700'
}

export function AgencyROI() {
  const { data, updateAgencies } = useAppContext()
  const { agencies } = data
  const [viewMode, setViewMode] = useState<'input' | 'roi'>('input')
  const [newName, setNewName] = useState('')

  const addAgency = () => {
    if (!newName.trim()) return
    const agency: Agency = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      months: Array.from({ length: DISPLAY_MONTHS }, (_, i) => ({
        month: i + 1, adBudget: 0, applications: 0, debuts: 0, sales: 0,
      })),
    }
    updateAgencies([...agencies, agency])
    setNewName('')
  }

  const removeAgency = (id: string) => {
    updateAgencies(agencies.filter((a) => a.id !== id))
  }

  const updateMonthData = (agencyId: string, monthIdx: number, field: keyof AgencyMonthData, value: number) => {
    updateAgencies(agencies.map((a) =>
      a.id !== agencyId ? a : {
        ...a,
        months: a.months.map((m, i) => i !== monthIdx ? m : { ...m, [field]: value }),
      }
    ))
  }

  const updateAgencyName = (id: string, name: string) => {
    updateAgencies(agencies.map((a) => a.id !== id ? a : { ...a, name }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">代理店別 月別回収率表</h2>
        <div className="flex gap-2">
          <button onClick={() => setViewMode('input')}
            className={`px-3 py-1 text-sm rounded ${viewMode === 'input' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
            入力モード
          </button>
          <button onClick={() => setViewMode('roi')}
            className={`px-3 py-1 text-sm rounded ${viewMode === 'roi' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
            回収率モード
          </button>
        </div>
      </div>

      {/* 代理店追加 */}
      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addAgency()}
          placeholder="代理店名を入力してEnter"
          className="border border-gray-300 rounded px-3 py-1 text-sm flex-1 max-w-xs"
        />
        <button onClick={addAgency}
          className="bg-indigo-600 text-white px-4 py-1 rounded text-sm hover:bg-indigo-700">
          追加
        </button>
      </div>

      {agencies.length === 0 && (
        <p className="text-gray-400 text-sm">代理店を追加してください</p>
      )}

      {/* 代理店ごとのテーブル */}
      {agencies.map((agency) => {
        const roi = calcAgencyROI(agency.months)
        return (
          <section key={agency.id} className="bg-white rounded-lg shadow overflow-x-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <input
                value={agency.name}
                onChange={(e) => updateAgencyName(agency.id, e.target.value)}
                className="font-semibold text-gray-800 border-none outline-none bg-transparent text-base"
              />
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>累計広告費: ¥{roi.cumulativeAdBudget.toLocaleString()}</span>
                <span>累計売上: ¥{roi.cumulativeSales.toLocaleString()}</span>
                <span className={`px-2 py-0.5 rounded font-bold ${roiColor(roi.cumulativeROI)}`}>
                  累計回収率: {(roi.cumulativeROI * 100).toFixed(1)}%
                </span>
                <button onClick={() => removeAgency(agency.id)} className="text-red-400 hover:text-red-600">削除</button>
              </div>
            </div>
            <table className="text-xs border-collapse whitespace-nowrap w-full">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="px-3 py-2 text-left sticky left-0 bg-gray-50">項目</th>
                  {agency.months.map((m) => (
                    <th key={m.month} className="px-3 py-2 text-center">{m.month}月目</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {viewMode === 'input' ? (
                  <>
                    {([
                      { label: '広告費 (¥)', field: 'adBudget' as const },
                      { label: '応募数', field: 'applications' as const },
                      { label: 'デビュー数', field: 'debuts' as const },
                      { label: '売上 (¥)', field: 'sales' as const },
                    ] as { label: string; field: keyof AgencyMonthData }[]).map(({ label, field }) => (
                      <tr key={field} className="border-b border-gray-100">
                        <td className="px-3 py-2 font-medium text-gray-600 sticky left-0 bg-white">{label}</td>
                        {agency.months.map((m, mi) => (
                          <td key={m.month} className="px-2 py-1 text-center">
                            <input
                              type="number" min={0}
                              value={m[field]}
                              onChange={(e) => updateMonthData(agency.id, mi, field, parseInt(e.target.value) || 0)}
                              className="w-20 border border-gray-200 rounded px-1 text-right text-xs"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="border-b border-gray-100 bg-blue-50">
                      <td className="px-3 py-2 font-medium text-blue-700 sticky left-0 bg-blue-50">デビュー単価 (¥)</td>
                      {agency.months.map((m) => (
                        <td key={m.month} className="px-3 py-2 text-center text-blue-700 font-medium">
                          {m.debuts > 0 ? `¥${Math.floor(m.adBudget / m.debuts).toLocaleString()}` : '-'}
                        </td>
                      ))}
                    </tr>
                  </>
                ) : (
                  <>
                    <tr className="border-b border-gray-100">
                      <td className="px-3 py-2 font-medium text-gray-600 sticky left-0 bg-white">月次回収率</td>
                      {agency.months.map((m) => {
                        const monthROI = m.adBudget > 0 ? m.sales / m.adBudget : 0
                        return (
                          <td key={m.month} className={`px-3 py-2 text-center font-medium ${roiColor(monthROI)}`}>
                            {m.adBudget > 0 ? `${(monthROI * 100).toFixed(1)}%` : '-'}
                          </td>
                        )
                      })}
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-3 py-2 font-medium text-gray-600 sticky left-0 bg-white">累計回収率</td>
                      {agency.months.map((_, mi) => {
                        const cumData = calcAgencyROI(agency.months.slice(0, mi + 1))
                        return (
                          <td key={mi} className={`px-3 py-2 text-center font-bold ${roiColor(cumData.cumulativeROI)}`}>
                            {cumData.cumulativeAdBudget > 0 ? `${(cumData.cumulativeROI * 100).toFixed(1)}%` : '-'}
                          </td>
                        )
                      })}
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-3 py-2 font-medium text-gray-600 sticky left-0 bg-white">デビュー単価</td>
                      {agency.months.map((m) => (
                        <td key={m.month} className="px-3 py-2 text-center text-blue-700">
                          {m.debuts > 0 ? `¥${Math.floor(m.adBudget / m.debuts).toLocaleString()}` : '-'}
                        </td>
                      ))}
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </section>
        )
      })}
    </div>
  )
}
