import { useAppContext } from '../context/AppContext'

export function CampaignPolicyCard({ periodTotal }: { periodTotal?: number }) {
  const { data, updateCohortParams } = useAppContext()
  const { cohortParams: cp } = data
  const fmt = (n: number) => `¥${Math.floor(n).toLocaleString()}`
  const addPerReading = 3 * (cp.campaignAddMsgBonusPt ?? 0) + 400 * (cp.campaignAddCharBonusPt ?? 0)

  return (
    <section className="card">
      <div className="flex items-center gap-3 mb-3">
        <h3 className="section-title" style={{ margin: 0 }}>キャンペーン施策（pt上乗せ・期間指定）</h3>
        <label className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!cp.campaignEnabled}
            onChange={(e) => updateCohortParams({ campaignEnabled: e.target.checked })} />
          有効
        </label>
        <label className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={cp.campaignApplyBonus ?? true}
            onChange={(e) => updateCohortParams({ campaignApplyBonus: e.target.checked })} />
          ボ（無償）に付与
        </label>
        <label className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={cp.campaignApplyNormal ?? false}
            onChange={(e) => updateCohortParams({ campaignApplyNormal: e.target.checked })} />
          通（有償）に付与
        </label>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <label className="block text-sm" style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>開始日</label>
          <input type="date" value={cp.campaignStart ?? ''}
            onChange={(e) => updateCohortParams({ campaignStart: e.target.value })}
            className="input-dark w-full" />
        </div>
        <div>
          <label className="block text-sm" style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>終了日</label>
          <input type="date" value={cp.campaignEnd ?? ''}
            onChange={(e) => updateCohortParams({ campaignEnd: e.target.value })}
            className="input-dark w-full" />
        </div>
        <div>
          <label className="block text-sm" style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>+pt/通</label>
          <input type="number" min={0} step={1} value={cp.campaignAddMsgBonusPt ?? 0}
            onChange={(e) => updateCohortParams({ campaignAddMsgBonusPt: parseFloat(e.target.value) || 0 })}
            className="input-dark w-full" />
        </div>
        <div>
          <label className="block text-sm" style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>+pt/字</label>
          <input type="number" min={0} step={1} value={cp.campaignAddCharBonusPt ?? 0}
            onChange={(e) => updateCohortParams({ campaignAddCharBonusPt: parseFloat(e.target.value) || 0 })}
            className="input-dark w-full" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>1鑑定あたり上乗せ</span>
          <span className="font-bold font-mono-num" style={{ color: 'var(--purple)', fontSize: '1.05rem' }}>
            +{addPerReading} pt / +¥{addPerReading.toLocaleString()}
          </span>
        </div>
        {periodTotal !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>期間中の施策原価合計</span>
            <span className="font-bold font-mono-num" style={{ color: 'var(--purple)', fontSize: '1.15rem' }}>
              {fmt(periodTotal)}
            </span>
          </div>
        )}
      </div>
      <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
        ※ 開始〜終了日を各月で日割り按分。付与先は上のチェック（ボ＝無償／通＝有償）で選択。
        1鑑定＝3通＋400字、ゴールド基準 U消費 通150pt・字9pt（＝4,050pt/鑑定）。<br />
        施策原価 ＝（対象消化pt ÷ 4,050）×（3×+pt/通 ＋ 400×+pt/字）×（実施日数÷その月の日数）。
      </p>
    </section>
  )
}
