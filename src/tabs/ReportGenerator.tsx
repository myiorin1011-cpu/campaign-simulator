import { useState, useMemo } from 'react'
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer'
import { useAppContext } from '../context/AppContext'
import { ReportDocument, type OutputMode } from '../pdf/ReportDocument'
import type { ReportData, ReportSectionConsult } from '../types'

function createInitialReport(
  month: string,
  serviceName: string,
  arppu: number,
  conversionRate: number,
  agencies: { name: string; adBudget: number; sales: number }[],
): ReportData {
  return {
    id: month,
    meta: { serviceName, month, createdAt: new Date().toISOString() },
    sections: {
      sales: {
        showInInternal: true,
        showInPerformer: false,
        target: 0, actual: 0, memo: '',
      },
      user: {
        showInInternal: true,
        showInPerformer: false,
        arppu, dau: 0, installCount: 0,
        conversionRate, newSales: 0, continuousSales: 0, memo: '',
      },
      ad: {
        showInInternal: true,
        showInPerformer: false,
        agencies: agencies.map(a => ({
          ...a,
          roas: a.adBudget > 0 ? a.sales / a.adBudget : 0,
        })),
        totalRoas: 0, memo: '',
      },
      dap: {
        showInInternal: true,
        showInPerformer: false,
        activeCount: 0, totalReward: 0, avgRewardPerDap: 0, memo: '',
      },
      consult: {
        showInInternal: true,
        showInPerformer: false,
        entries: [{ managerName: '', comment: '' }],
      },
      recruit: {
        showInInternal: true,
        showInPerformer: false,
        debutCount: 0, memo: '',
      },
    },
  }
}

function SectionToggleRow({
  label,
  internalVal,
  performerVal,
  onInternal,
  onPerformer,
  alwaysOnInternal = false,
}: {
  label: string
  internalVal: boolean
  performerVal: boolean
  onInternal: (v: boolean) => void
  onPerformer: (v: boolean) => void
  alwaysOnInternal?: boolean
}) {
  return (
    <div className="flex items-center gap-6 py-2 border-b border-gray-100">
      <span className="w-40 text-sm text-gray-700">{label}</span>
      <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
        <input
          type="checkbox"
          checked={alwaysOnInternal || internalVal}
          disabled={alwaysOnInternal}
          onChange={e => onInternal(e.target.checked)}
        />
        社内
      </label>
      <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
        <input
          type="checkbox"
          checked={performerVal}
          onChange={e => onPerformer(e.target.checked)}
        />
        パフォーマー
      </label>
    </div>
  )
}

export function ReportGenerator() {
  const { data, updateReports } = useAppContext()
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')
  const [outputMode, setOutputMode] = useState<OutputMode>('internal')
  const [selectedId, setSelectedId] = useState<string | null>(
    data.reports.length > 0 ? data.reports[data.reports.length - 1].id : null
  )
  const [newMonth, setNewMonth] = useState('')
  const [newServiceName, setNewServiceName] = useState('Canow')

  const currentReport = useMemo(
    () => data.reports.find(r => r.id === selectedId) ?? null,
    [data.reports, selectedId]
  )

  const handleCreate = () => {
    if (!newMonth.trim()) return
    const existing = data.reports.find(r => r.id === newMonth.trim())
    if (existing) {
      setSelectedId(existing.id)
      setNewMonth('')
      return
    }
    const agencyDefaults = data.agencies.map(a => {
      const lastMonth = a.months[a.months.length - 1]
      return {
        name: a.name,
        adBudget: lastMonth?.adBudget ?? 0,
        sales: lastMonth?.sales ?? 0,
      }
    })
    const report = createInitialReport(
      newMonth.trim(),
      newServiceName,
      data.simulatorParams.arppu,
      data.simulatorParams.conversionRate,
      agencyDefaults,
    )
    updateReports([...data.reports, report])
    setSelectedId(report.id)
    setNewMonth('')
  }

  const updateSection = <K extends keyof ReportData['sections']>(
    key: K,
    patch: Partial<ReportData['sections'][K]>
  ) => {
    if (!currentReport) return
    updateReports(
      data.reports.map(r =>
        r.id !== currentReport.id ? r : {
          ...r,
          sections: {
            ...r.sections,
            [key]: { ...r.sections[key], ...patch },
          },
        }
      )
    )
  }

  const fileName = currentReport
    ? `${currentReport.meta.serviceName}-${currentReport.meta.month}-結果報告-${outputMode === 'internal' ? '社内' : 'パフォーマー向け'}.pdf`
    : 'report.pdf'

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">結果報告書</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('edit')}
            className={`px-3 py-1 text-sm rounded ${viewMode === 'edit' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}
          >
            入力
          </button>
          <button
            onClick={() => setViewMode('preview')}
            disabled={!currentReport}
            className={`px-3 py-1 text-sm rounded ${viewMode === 'preview' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'} disabled:opacity-40`}
          >
            プレビュー
          </button>
        </div>
      </div>

      {/* 月度選択・新規作成 */}
      <section className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">既存レポートを選択</label>
          <select
            value={selectedId ?? ''}
            onChange={e => setSelectedId(e.target.value || null)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="">-- 選択 --</option>
            {data.reports.map(r => (
              <option key={r.id} value={r.id}>{r.meta.month}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">新規: 月度</label>
            <input
              value={newMonth}
              onChange={e => setNewMonth(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="例: 2025年1月度"
              className="border border-gray-300 rounded px-2 py-1 text-sm w-36"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">サービス名</label>
            <input
              value={newServiceName}
              onChange={e => setNewServiceName(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm w-24"
            />
          </div>
          <button
            onClick={handleCreate}
            className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700"
          >
            作成
          </button>
        </div>
      </section>

      {!currentReport && (
        <p className="text-gray-400 text-sm">月度を選択または新規作成してください</p>
      )}

      {currentReport && viewMode === 'edit' && (
        <>
          {/* セクション表示設定 */}
          <section className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm">セクション表示設定</h3>
            <SectionToggleRow
              label="売上着地"
              internalVal={currentReport.sections.sales.showInInternal}
              performerVal={currentReport.sections.sales.showInPerformer}
              onInternal={v => updateSection('sales', { showInInternal: v })}
              onPerformer={v => updateSection('sales', { showInPerformer: v })}
              alwaysOnInternal
            />
            {(
              [
                { key: 'user', label: 'ユーザー関連' },
                { key: 'ad', label: '広告成果' },
                { key: 'dap', label: 'DAP関連' },
                { key: 'consult', label: 'コンサル関連' },
                { key: 'recruit', label: '求人広告' },
              ] as { key: keyof ReportData['sections']; label: string }[]
            ).map(({ key, label }) => (
              <SectionToggleRow
                key={key}
                label={label}
                internalVal={currentReport.sections[key].showInInternal}
                performerVal={currentReport.sections[key].showInPerformer}
                onInternal={v => updateSection(key, { showInInternal: v } as never)}
                onPerformer={v => updateSection(key, { showInPerformer: v } as never)}
              />
            ))}
          </section>

          {/* 売上着地 */}
          <section className="bg-white rounded-lg shadow p-4 space-y-3">
            <h3 className="font-semibold text-gray-700 text-sm">売上着地</h3>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { label: '月商目標 (¥)', key: 'target' },
                  { label: '月商実績 (¥)', key: 'actual' },
                ] as { label: string; key: 'target' | 'actual' }[]
              ).map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input
                    type="number"
                    min={0}
                    value={currentReport.sections.sales[key]}
                    onChange={e =>
                      updateSection('sales', { [key]: parseInt(e.target.value) || 0 })
                    }
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">コメント</label>
              <textarea
                rows={2}
                value={currentReport.sections.sales.memo}
                onChange={e => updateSection('sales', { memo: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
          </section>

          {/* ユーザー関連 */}
          {currentReport.sections.user.showInInternal && (
            <section className="bg-white rounded-lg shadow p-4 space-y-3">
              <h3 className="font-semibold text-gray-700 text-sm">ユーザー関連</h3>
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    { label: 'ARPPU (¥)', key: 'arppu', pct: false },
                    { label: '平均DAU (人)', key: 'dau', pct: false },
                    { label: 'インストール数', key: 'installCount', pct: false },
                    { label: '課金率 (%)', key: 'conversionRate', pct: true },
                    { label: '新規売上 (¥)', key: 'newSales', pct: false },
                    { label: '継続売上 (¥)', key: 'continuousSales', pct: false },
                  ] as { label: string; key: keyof typeof currentReport.sections.user; pct: boolean }[]
                ).map(({ label, key, pct }) => {
                  const raw = currentReport.sections.user[key] as number
                  return (
                    <div key={String(key)}>
                      <label className="block text-xs text-gray-500 mb-1">{label}</label>
                      <input
                        type="number"
                        min={0}
                        step={pct ? 0.1 : 1}
                        value={pct ? +(raw * 100).toFixed(1) : raw}
                        onChange={e =>
                          updateSection('user', {
                            [key]: pct
                              ? parseFloat(e.target.value) / 100
                              : parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                  )
                })}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">コメント</label>
                <textarea
                  rows={2}
                  value={currentReport.sections.user.memo}
                  onChange={e => updateSection('user', { memo: e.target.value })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                />
              </div>
            </section>
          )}

          {/* 広告成果 */}
          {currentReport.sections.ad.showInInternal && (
            <section className="bg-white rounded-lg shadow p-4 space-y-3">
              <h3 className="font-semibold text-gray-700 text-sm">広告成果</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-2 py-1 text-left text-gray-600">代理店名</th>
                      <th className="px-2 py-1 text-right text-gray-600">広告費 (¥)</th>
                      <th className="px-2 py-1 text-right text-gray-600">売上 (¥)</th>
                      <th className="px-2 py-1 text-right text-gray-600">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentReport.sections.ad.agencies.map((agency, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="px-2 py-1">
                          <input
                            value={agency.name}
                            onChange={e => {
                              const agencies = [...currentReport.sections.ad.agencies]
                              agencies[i] = { ...agencies[i], name: e.target.value }
                              updateSection('ad', { agencies })
                            }}
                            className="w-full border border-gray-200 rounded px-1 py-0.5 text-xs"
                          />
                        </td>
                        {(['adBudget', 'sales'] as const).map(field => (
                          <td key={field} className="px-2 py-1">
                            <input
                              type="number"
                              min={0}
                              value={agency[field]}
                              onChange={e => {
                                const agencies = [...currentReport.sections.ad.agencies]
                                const updated = {
                                  ...agencies[i],
                                  [field]: parseInt(e.target.value) || 0,
                                }
                                updated.roas = updated.adBudget > 0
                                  ? updated.sales / updated.adBudget
                                  : 0
                                agencies[i] = updated
                                const totalSales = agencies.reduce((s, a) => s + a.sales, 0)
                                const totalBudget = agencies.reduce((s, a) => s + a.adBudget, 0)
                                updateSection('ad', {
                                  agencies,
                                  totalRoas: totalBudget > 0 ? totalSales / totalBudget : 0,
                                })
                              }}
                              className="w-24 border border-gray-200 rounded px-1 py-0.5 text-xs text-right"
                            />
                          </td>
                        ))}
                        <td className="px-2 py-1 text-right text-gray-500">
                          {(agency.roas * 100).toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={() => {
                  const agencies = [
                    ...currentReport.sections.ad.agencies,
                    { name: '', adBudget: 0, sales: 0, roas: 0 },
                  ]
                  updateSection('ad', { agencies })
                }}
                className="text-xs text-indigo-600 hover:underline"
              >
                + 代理店を追加
              </button>
              <div>
                <label className="block text-xs text-gray-500 mb-1">コメント</label>
                <textarea
                  rows={2}
                  value={currentReport.sections.ad.memo}
                  onChange={e => updateSection('ad', { memo: e.target.value })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                />
              </div>
            </section>
          )}

          {/* DAP関連 */}
          {currentReport.sections.dap.showInInternal && (
            <section className="bg-white rounded-lg shadow p-4 space-y-3">
              <h3 className="font-semibold text-gray-700 text-sm">DAP関連</h3>
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    { label: '稼働パフォーマー数', key: 'activeCount' },
                    { label: '総獲得報酬 (¥)', key: 'totalReward' },
                    { label: '1DAPあたり平均 (¥)', key: 'avgRewardPerDap' },
                  ] as { label: string; key: 'activeCount' | 'totalReward' | 'avgRewardPerDap' }[]
                ).map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-500 mb-1">{label}</label>
                    <input
                      type="number"
                      min={0}
                      value={currentReport.sections.dap[key]}
                      onChange={e =>
                        updateSection('dap', { [key]: parseInt(e.target.value) || 0 })
                      }
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">コメント</label>
                <textarea
                  rows={2}
                  value={currentReport.sections.dap.memo}
                  onChange={e => updateSection('dap', { memo: e.target.value })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                />
              </div>
            </section>
          )}

          {/* コンサル関連 */}
          {currentReport.sections.consult.showInInternal && (
            <section className="bg-white rounded-lg shadow p-4 space-y-3">
              <h3 className="font-semibold text-gray-700 text-sm">コンサル関連</h3>
              {currentReport.sections.consult.entries.map((entry, i) => (
                <div key={i} className="space-y-2 border border-gray-100 rounded p-3">
                  <input
                    placeholder="担当者名"
                    value={entry.managerName}
                    onChange={e => {
                      const entries = [...currentReport.sections.consult.entries]
                      entries[i] = { ...entries[i], managerName: e.target.value }
                      updateSection('consult', { entries } as Partial<ReportSectionConsult>)
                    }}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                  <textarea
                    rows={3}
                    placeholder="コメント"
                    value={entry.comment}
                    onChange={e => {
                      const entries = [...currentReport.sections.consult.entries]
                      entries[i] = { ...entries[i], comment: e.target.value }
                      updateSection('consult', { entries } as Partial<ReportSectionConsult>)
                    }}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>
              ))}
              <button
                onClick={() => {
                  const entries = [
                    ...currentReport.sections.consult.entries,
                    { managerName: '', comment: '' },
                  ]
                  updateSection('consult', { entries } as Partial<ReportSectionConsult>)
                }}
                className="text-xs text-indigo-600 hover:underline"
              >
                + 担当者を追加
              </button>
            </section>
          )}

          {/* 求人広告 */}
          {currentReport.sections.recruit.showInInternal && (
            <section className="bg-white rounded-lg shadow p-4 space-y-3">
              <h3 className="font-semibold text-gray-700 text-sm">求人広告</h3>
              <div>
                <label className="block text-xs text-gray-500 mb-1">月間デビュー数</label>
                <input
                  type="number"
                  min={0}
                  value={currentReport.sections.recruit.debutCount}
                  onChange={e =>
                    updateSection('recruit', { debutCount: parseInt(e.target.value) || 0 })
                  }
                  className="w-32 border border-gray-300 rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">コメント</label>
                <textarea
                  rows={2}
                  value={currentReport.sections.recruit.memo}
                  onChange={e => updateSection('recruit', { memo: e.target.value })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                />
              </div>
            </section>
          )}
        </>
      )}

      {/* プレビューモード */}
      {currentReport && viewMode === 'preview' && (
        <section className="bg-white rounded-lg shadow p-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setOutputMode('internal')}
                className={`px-3 py-1 text-sm rounded ${outputMode === 'internal' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}
              >
                社内向け
              </button>
              <button
                onClick={() => setOutputMode('performer')}
                className={`px-3 py-1 text-sm rounded ${outputMode === 'performer' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}
              >
                パフォーマー向け
              </button>
            </div>
            <PDFDownloadLink
              document={<ReportDocument report={currentReport} mode={outputMode} />}
              fileName={fileName}
              className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700"
            >
              {({ loading }) => (loading ? '生成中...' : '📄 PDFダウンロード')}
            </PDFDownloadLink>
          </div>
          <PDFViewer width="100%" height={500} showToolbar={false}>
            <ReportDocument report={currentReport} mode={outputMode} />
          </PDFViewer>
        </section>
      )}
    </div>
  )
}
