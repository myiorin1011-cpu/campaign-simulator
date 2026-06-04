import { useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { calcAgencyROI } from '../utils/calculations'
import type { Agency, AgencyMonthData } from '../types'

const DISPLAY_MONTHS = 12

function roiStyle(roi: number): React.CSSProperties {
  if (roi >= 1.5) return { background: 'var(--positive-bg)', border: '1px solid rgba(63,185,80,0.25)', color: 'var(--positive)', borderRadius: 4, padding: '1px 6px' }
  if (roi >= 1.0) return { background: 'var(--warning-bg)', border: '1px solid rgba(210,153,34,0.25)', color: 'var(--warning)', borderRadius: 4, padding: '1px 6px' }
  if (roi >= 0.5) return { background: 'var(--warning-bg)', border: '1px solid rgba(210,153,34,0.25)', color: 'var(--warning)', borderRadius: 4, padding: '1px 6px' }
  return { background: 'var(--negative-bg)', border: '1px solid rgba(248,81,73,0.25)', color: 'var(--negative)', borderRadius: 4, padding: '1px 6px' }
}

function roiCellStyle(roi: number): React.CSSProperties {
  if (roi >= 1.5) return { background: 'var(--positive-bg)', color: 'var(--positive)', fontWeight: 700 }
  if (roi >= 1.0) return { background: 'var(--warning-bg)', color: 'var(--warning)', fontWeight: 700 }
  if (roi >= 0.5) return { background: 'var(--warning-bg)', color: 'var(--warning)', fontWeight: 700 }
  return { background: 'var(--negative-bg)', color: 'var(--negative)', fontWeight: 700 }
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
        <h2 className="page-title">代理店別 月別回収率表</h2>
        <div className="flex gap-2">
          <button onClick={() => setViewMode('input')}
            className={`scenario-tab${viewMode === 'input' ? ' active' : ''}`}>
            入力モード
          </button>
          <button onClick={() => setViewMode('roi')}
            className={`scenario-tab${viewMode === 'roi' ? ' active' : ''}`}>
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
          className="input-dark text-sm flex-1 max-w-xs"
        />
        <button onClick={addAgency} className="btn-primary text-sm px-4 py-1">
          追加
        </button>
      </div>

      {agencies.length === 0 && (
        <p style={{ color: 'var(--text-muted)' }} className="text-sm">代理店を追加してください</p>
      )}

      {/* 代理店ごとのテーブル */}
      {agencies.map((agency) => {
        const roi = calcAgencyROI(agency.months)
        return (
          <section key={agency.id} className="card overflow-x-auto" style={{ padding: 0 }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <input
                value={agency.name}
                onChange={(e) => updateAgencyName(agency.id, e.target.value)}
                className="font-semibold border-none outline-none bg-transparent text-base"
                style={{ color: 'var(--text-primary)' }}
              />
              <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>累計広告費: ¥{roi.cumulativeAdBudget.toLocaleString()}</span>
                <span>累計売上: ¥{roi.cumulativeSales.toLocaleString()}</span>
                <span style={roiStyle(roi.cumulativeROI)} className="font-bold">
                  累計回収率: {(roi.cumulativeROI * 100).toFixed(1)}%
                </span>
                <button onClick={() => removeAgency(agency.id)} className="btn-ghost text-xs px-2 py-0.5" style={{ color: 'var(--negative)' }}>削除</button>
              </div>
            </div>
            <table className="table-dark text-xs whitespace-nowrap w-full">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left sticky left-0" style={{ background: 'var(--bg-elevated)' }}>項目</th>
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
                      <tr key={field} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td className="px-3 py-2 font-medium sticky left-0" style={{ color: 'var(--text-secondary)', background: 'var(--bg-card)' }}>{label}</td>
                        {agency.months.map((m, mi) => (
                          <td key={m.month} className="px-2 py-1 text-center">
                            <input
                              type="number" min={0}
                              value={m[field]}
                              onChange={(e) => updateMonthData(agency.id, mi, field, parseInt(e.target.value) || 0)}
                              className="input-dark w-20 px-1 text-right text-xs"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--accent-dim)' }}>
                      <td className="px-3 py-2 font-medium sticky left-0" style={{ color: 'var(--accent-light)', background: 'var(--accent-dim)' }}>デビュー単価 (¥)</td>
                      {agency.months.map((m) => (
                        <td key={m.month} className="px-3 py-2 text-center font-medium" style={{ color: 'var(--accent-light)' }}>
                          {m.debuts > 0 ? `¥${Math.floor(m.adBudget / m.debuts).toLocaleString()}` : '-'}
                        </td>
                      ))}
                    </tr>
                  </>
                ) : (
                  <>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="px-3 py-2 font-medium sticky left-0" style={{ color: 'var(--text-secondary)', background: 'var(--bg-card)' }}>月次回収率</td>
                      {agency.months.map((m) => {
                        const monthROI = m.adBudget > 0 ? m.sales / m.adBudget : 0
                        return (
                          <td key={m.month} className="px-3 py-2 text-center">
                            {m.adBudget > 0 ? (
                              <span style={roiStyle(monthROI)}>{(monthROI * 100).toFixed(1)}%</span>
                            ) : '-'}
                          </td>
                        )
                      })}
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="px-3 py-2 font-medium sticky left-0" style={{ color: 'var(--text-secondary)', background: 'var(--bg-card)' }}>累計回収率</td>
                      {agency.months.map((_, mi) => {
                        const cumData = calcAgencyROI(agency.months.slice(0, mi + 1))
                        return (
                          <td key={mi} className="px-3 py-2 text-center" style={cumData.cumulativeAdBudget > 0 ? roiCellStyle(cumData.cumulativeROI) : {}}>
                            {cumData.cumulativeAdBudget > 0 ? `${(cumData.cumulativeROI * 100).toFixed(1)}%` : '-'}
                          </td>
                        )
                      })}
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="px-3 py-2 font-medium sticky left-0" style={{ color: 'var(--text-secondary)', background: 'var(--bg-card)' }}>デビュー単価</td>
                      {agency.months.map((m) => (
                        <td key={m.month} className="px-3 py-2 text-center" style={{ color: 'var(--accent-light)' }}>
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
