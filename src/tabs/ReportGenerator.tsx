import { useState, useMemo } from 'react'
import { calcMonthlyKPI } from '../utils/calculations'
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer'
import { useAppContext } from '../context/AppContext'
import { ReportDocument, type OutputMode } from '../pdf/ReportDocument'
import { exportReportToPptx } from '../pdf/exportPptx'
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
    <div className="flex items-center gap-6 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <span className="w-40 text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <label className="flex items-center gap-1 text-xs cursor-pointer" style={{ color: 'var(--text-muted)' }}>
        <input
          type="checkbox"
          checked={alwaysOnInternal || internalVal}
          disabled={alwaysOnInternal}
          onChange={e => onInternal(e.target.checked)}
        />
        社内
      </label>
      <label className="flex items-center gap-1 text-xs cursor-pointer" style={{ color: 'var(--text-muted)' }}>
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
  const [pptxBusy, setPptxBusy] = useState(false)

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

  const autoFill = () => {
    if (!currentReport) return
    const { simulatorParams: sp, agencies } = data
    const kpi = calcMonthlyKPI({
      adBudget: sp.adBudget,
      cpi: sp.cpi,
      conversionRate: sp.conversionRate,
      arppu: sp.arppu,
    })
    const monthlySales = kpi.payingUsers * sp.arppu
    const agencyData = agencies.map(a => {
      const lastMonth = a.months.filter(m => m.adBudget > 0 || m.sales > 0).slice(-1)[0]
      const adBudget = lastMonth?.adBudget ?? 0
      const sales    = lastMonth?.sales ?? 0
      return { name: a.name, adBudget, sales, roas: adBudget > 0 ? sales / adBudget : 0 }
    })
    const totalAdBudget = agencyData.reduce((s, a) => s + a.adBudget, 0)
    const totalSales    = agencyData.reduce((s, a) => s + a.sales, 0)

    updateReports(
      data.reports.map(r => r.id !== currentReport.id ? r : {
        ...r,
        sections: {
          ...r.sections,
          user: {
            ...r.sections.user,
            arppu: sp.arppu,
            installCount: kpi.installs,
            conversionRate: sp.conversionRate,
          },
          sales: {
            ...r.sections.sales,
            target: Math.round(monthlySales * 1.1),
            actual: Math.round(monthlySales),
          },
          ad: {
            ...r.sections.ad,
            agencies: agencyData,
            totalRoas: totalAdBudget > 0 ? totalSales / totalAdBudget : 0,
          },
        },
      })
    )
  }

  const fileName = currentReport
    ? `${currentReport.meta.serviceName}-${currentReport.meta.month}-結果報告-${outputMode === 'internal' ? '社内' : 'パフォーマー向け'}.pdf`
    : 'report.pdf'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="page-title">結果報告書</h2>
        <div className="flex gap-2 items-center">
          {currentReport && viewMode === 'edit' && (
            <button
              onClick={autoFill}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                background: 'var(--accent-dim)', border: '1px solid rgba(99,102,241,0.3)',
                color: 'var(--accent-light)', fontSize: 12, fontWeight: 500,
              }}
              title="売上シミュレーター・代理店データから主要項目を自動入力します"
            >
              ⚡ Simデータから自動入力
            </button>
          )}
          <button
            onClick={() => setViewMode('edit')}
            className={`px-3 py-1 text-sm rounded ${viewMode === 'edit' ? 'btn-primary' : 'btn-ghost'}`}
          >
            入力
          </button>
          <button
            onClick={() => setViewMode('preview')}
            disabled={!currentReport}
            className={`px-3 py-1 text-sm rounded ${viewMode === 'preview' ? 'btn-primary' : 'btn-ghost'} disabled:opacity-40`}
          >
            プレビュー
          </button>
        </div>
      </div>

      {/* 月度選択・新規作成 */}
      <section className="card flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>既存レポートを選択</label>
          <select
            value={selectedId ?? ''}
            onChange={e => setSelectedId(e.target.value || null)}
            className="input-dark px-2 py-1 text-sm"
          >
            <option value="">-- 選択 --</option>
            {data.reports.map(r => (
              <option key={r.id} value={r.id}>{r.meta.month}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 items-end">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>新規: 月度</label>
            <input
              value={newMonth}
              onChange={e => setNewMonth(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="例: 2025年1月度"
              className="input-dark px-2 py-1 text-sm w-36"
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>サービス名</label>
            <input
              value={newServiceName}
              onChange={e => setNewServiceName(e.target.value)}
              className="input-dark px-2 py-1 text-sm w-24"
            />
          </div>
          <button onClick={handleCreate} className="btn-primary px-3 py-1 text-sm">
            作成
          </button>
        </div>
      </section>

      {!currentReport && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>月度を選択または新規作成してください</p>
      )}

      {currentReport && viewMode === 'edit' && (
        <>
          {/* セクション表示設定 */}
          <section className="card">
            <h3 className="section-title mb-3">セクション表示設定</h3>
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
          <section className="card space-y-3">
            <h3 className="section-title">売上着地</h3>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { label: '月商目標 (¥)', key: 'target' },
                  { label: '月商実績 (¥)', key: 'actual' },
                ] as { label: string; key: 'target' | 'actual' }[]
              ).map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
                  <input
                    type="number"
                    min={0}
                    value={currentReport.sections.sales[key]}
                    onChange={e =>
                      updateSection('sales', { [key]: parseInt(e.target.value) || 0 })
                    }
                    className="input-dark w-full px-2 py-1 text-sm"
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>コメント</label>
              <textarea
                rows={2}
                value={currentReport.sections.sales.memo}
                onChange={e => updateSection('sales', { memo: e.target.value })}
                className="input-dark w-full px-2 py-1 text-sm"
              />
            </div>
          </section>

          {/* ユーザー関連 */}
          {currentReport.sections.user.showInInternal && (
            <section className="card space-y-3">
              <h3 className="section-title">ユーザー関連</h3>
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
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
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
                        className="input-dark w-full px-2 py-1 text-sm"
                      />
                    </div>
                  )
                })}
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>コメント</label>
                <textarea
                  rows={2}
                  value={currentReport.sections.user.memo}
                  onChange={e => updateSection('user', { memo: e.target.value })}
                  className="input-dark w-full px-2 py-1 text-sm"
                />
              </div>
            </section>
          )}

          {/* 広告成果 */}
          {currentReport.sections.ad.showInInternal && (
            <section className="card space-y-3">
              <h3 className="section-title">広告成果</h3>
              <div className="overflow-x-auto">
                <table className="table-dark w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-elevated)' }}>
                      <th className="px-2 py-1 text-left" style={{ color: 'var(--text-secondary)' }}>代理店名</th>
                      <th className="px-2 py-1 text-right" style={{ color: 'var(--text-secondary)' }}>広告費 (¥)</th>
                      <th className="px-2 py-1 text-right" style={{ color: 'var(--text-secondary)' }}>売上 (¥)</th>
                      <th className="px-2 py-1 text-right" style={{ color: 'var(--text-secondary)' }}>ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentReport.sections.ad.agencies.map((agency, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td className="px-2 py-1">
                          <input
                            value={agency.name}
                            onChange={e => {
                              const agencies = [...currentReport.sections.ad.agencies]
                              agencies[i] = { ...agencies[i], name: e.target.value }
                              updateSection('ad', { agencies })
                            }}
                            className="input-dark w-full px-1 py-0.5 text-xs"
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
                              className="input-dark w-24 px-1 py-0.5 text-xs text-right"
                            />
                          </td>
                        ))}
                        <td className="px-2 py-1 text-right" style={{ color: 'var(--text-muted)' }}>
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
                className="text-xs hover:underline" style={{ color: 'var(--accent-light)' }}
              >
                + 代理店を追加
              </button>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>コメント</label>
                <textarea
                  rows={2}
                  value={currentReport.sections.ad.memo}
                  onChange={e => updateSection('ad', { memo: e.target.value })}
                  className="input-dark w-full px-2 py-1 text-sm"
                />
              </div>
            </section>
          )}

          {/* DAP関連 */}
          {currentReport.sections.dap.showInInternal && (
            <section className="card space-y-3">
              <h3 className="section-title">DAP関連</h3>
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    { label: '稼働パフォーマー数', key: 'activeCount' },
                    { label: '総獲得報酬 (¥)', key: 'totalReward' },
                    { label: '1DAPあたり平均 (¥)', key: 'avgRewardPerDap' },
                  ] as { label: string; key: 'activeCount' | 'totalReward' | 'avgRewardPerDap' }[]
                ).map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
                    <input
                      type="number"
                      min={0}
                      value={currentReport.sections.dap[key]}
                      onChange={e =>
                        updateSection('dap', { [key]: parseInt(e.target.value) || 0 })
                      }
                      className="input-dark w-full px-2 py-1 text-sm"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>コメント</label>
                <textarea
                  rows={2}
                  value={currentReport.sections.dap.memo}
                  onChange={e => updateSection('dap', { memo: e.target.value })}
                  className="input-dark w-full px-2 py-1 text-sm"
                />
              </div>
            </section>
          )}

          {/* コンサル関連 */}
          {currentReport.sections.consult.showInInternal && (
            <section className="card space-y-3">
              <h3 className="section-title">コンサル関連</h3>
              {currentReport.sections.consult.entries.map((entry, i) => (
                <div key={i} className="space-y-2 rounded p-3" style={{ border: '1px solid var(--border)' }}>
                  <input
                    placeholder="担当者名"
                    value={entry.managerName}
                    onChange={e => {
                      const entries = [...currentReport.sections.consult.entries]
                      entries[i] = { ...entries[i], managerName: e.target.value }
                      updateSection('consult', { entries } as Partial<ReportSectionConsult>)
                    }}
                    className="input-dark w-full px-2 py-1 text-sm"
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
                    className="input-dark w-full px-2 py-1 text-sm"
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
                className="text-xs hover:underline" style={{ color: 'var(--accent-light)' }}
              >
                + 担当者を追加
              </button>
            </section>
          )}

          {/* 求人広告 */}
          {currentReport.sections.recruit.showInInternal && (
            <section className="card space-y-3">
              <h3 className="section-title">求人広告</h3>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>月間デビュー数</label>
                <input
                  type="number"
                  min={0}
                  value={currentReport.sections.recruit.debutCount}
                  onChange={e =>
                    updateSection('recruit', { debutCount: parseInt(e.target.value) || 0 })
                  }
                  className="input-dark w-32 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>コメント</label>
                <textarea
                  rows={2}
                  value={currentReport.sections.recruit.memo}
                  onChange={e => updateSection('recruit', { memo: e.target.value })}
                  className="input-dark w-full px-2 py-1 text-sm"
                />
              </div>
            </section>
          )}
        </>
      )}

      {/* プレビューモード */}
      {currentReport && viewMode === 'preview' && (
        <section className="card space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setOutputMode('internal')}
                className={`px-3 py-1 text-sm rounded ${outputMode === 'internal' ? 'btn-primary' : 'btn-ghost'}`}
              >
                社内向け
              </button>
              <button
                onClick={() => setOutputMode('performer')}
                className={`px-3 py-1 text-sm rounded ${outputMode === 'performer' ? 'btn-primary' : 'btn-ghost'}`}
              >
                パフォーマー向け
              </button>
            </div>
            <PDFDownloadLink
              document={<ReportDocument report={currentReport} mode={outputMode} />}
              fileName={fileName}
              className="btn-primary px-4 py-1.5 rounded text-sm"
            >
              {({ loading }) => (loading ? '生成中...' : '📄 PDFダウンロード')}
            </PDFDownloadLink>
            <button
              onClick={async () => {
                setPptxBusy(true)
                try { await exportReportToPptx(currentReport, outputMode) }
                finally { setPptxBusy(false) }
              }}
              disabled={pptxBusy}
              className="btn-primary px-4 py-1.5 rounded text-sm disabled:opacity-50"
              style={{ background: 'var(--warning)', borderColor: 'var(--warning)' }}
            >
              {pptxBusy ? '生成中...' : '📊 Googleスライド用に書き出し (.pptx)'}
            </button>
          </div>
          <p className="text-xs rounded p-2" style={{ color: 'var(--text-secondary)', background: 'var(--warning-bg)', border: '1px solid var(--warning)' }}>
            💡 「Googleスライド用に書き出し」で <strong>.pptx</strong> ファイルがダウンロードされます。これを
            <strong>Googleドライブにアップロード → 右クリック →「アプリで開く」→「Googleスライド」</strong>
            で、そのまま編集可能なスライドとして開けます。
          </p>
          <PDFViewer width="100%" height={500} showToolbar={false}>
            <ReportDocument report={currentReport} mode={outputMode} />
          </PDFViewer>
        </section>
      )}
    </div>
  )
}
