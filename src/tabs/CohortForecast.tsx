import { useMemo, useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { monthLabel, monthInfo, campaignFactor } from '../utils/campaign'
import { blendReading } from '../utils/rankMix'

export function CohortForecast() {
  const { data, updateCohortParams, updateSimulatorParams } = useAppContext()
  const { simulatorParams: sp, cohortParams: cp } = data
  const [orient, setOrient] = useState<'vertical' | 'horizontal'>('horizontal')

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
    // ランク別構成比が有効なときだけブレンド値を使用（無効時は従来どおりゴールド基準）
    const blend = cp.rankMixEnabled ? blendReading(cp) : null
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
      const installs = cpi > 0 ? Math.floor(adBudget / cpi) : 0   // 新規集客数 = 広告費 ÷ CPI
      const newCount = newCounts[i]                                // PU(課金ユーザー) = 新規集客数 × 課金率
      const newSales = newCount * cp.newUserArppu

      // 2ヶ月目残存 = 前月の新規 × 2ヶ月目継続率
      const secondCount = i >= 1 ? Math.floor(newCounts[i - 1] * r2) : 0
      const secondSales = secondCount * cp.secondMonthArppu

      // 3ヶ月目以降: 各過去コホートの残存を合算。新規PUに3ヶ月目以降継続率を直接適用
      //   age=3 の継続率 = r3。逓減幅 decay があれば毎月 decay pt ずつ低下（0=一定）
      const decay = cp.continuousDecay
      let continuousCount = 0
      for (let age = 3; age <= month; age++) {
        const idx = i - (age - 1)
        if (idx >= 0) {
          const rate = Math.max(0, r3 - decay * (age - 3))
          continuousCount += Math.floor(newCounts[idx] * rate)
        }
      }
      const continuousSales = continuousCount * cp.continuousArppu

      const totalSales = newSales + secondSales + continuousSales

      // ── パフォーマー報酬原価計 ──
      const bonusPtCost = cp.bonusPtCost ?? 0.22
      const payers = newCount + secondCount + continuousCount
      // ① 通常報酬原価 = 売上 × 1/3（0.67円/pt 相当）
      const normalReward = totalSales * (blend?.normalRewardRate ?? (cp.normalRewardRate ?? 1 / 3))
      // ② 登録特典原価 = 新規集客数 × 7000pt × 0.22円 × 消化率0.7
      const regBonusCost = installs * (cp.registrationBonusPt ?? 7000) * bonusPtCost * (cp.registrationBonusConsume ?? 0.7)
      // ③ 通常ボーナス原価 = 課金者数 ×（代表プラン11000 × 付与率3.64%）× 0.22円
      const normalBonusCost = payers * (cp.credixRepPlan ?? 11000) * (cp.avgBonusGrantRate ?? 0.0364) * bonusPtCost
      // ④ 初回ボーナス原価 = 新規PU × 300pt × 0.22円 × 消化率
      const firstBonusCost = newCount * (cp.firstBonusPt ?? 300) * bonusPtCost * (cp.firstBonusConsume ?? 1.0)
      const performerCostBase = normalReward + regBonusCost + normalBonusCost + firstBonusCost

      // ⑤ キャンペーン施策原価（無償=登録特典 消化分のボーナスpt上乗せ）
      //   ゴールド基準: 1鑑定 = 3通 + 400字, U消費 通150pt/字9pt → 1鑑定 = 4050pt
      const PT_PER_READING = blend?.uPtPerReading ?? 4050   // ゴールド基準 3*150+400*9 = 4050
      const { year: calYear, month: calMonth } = monthInfo(cp.startYear ?? 2026, cp.startMonth ?? 6, i)
      const label = monthLabel(cp.startYear ?? 2026, cp.startMonth ?? 6, i)
      let campaignBonus = 0, campaignNormal = 0
      if (cp.campaignEnabled) {
        const factor = campaignFactor(calYear, calMonth, cp.campaignStart, cp.campaignEnd) // 日割り係数(0〜1)
        if (factor > 0) {
          const addPerReading = 3 * (cp.campaignAddMsgBonusPt ?? 0) + 400 * (cp.campaignAddCharBonusPt ?? 0)
          const k = (addPerReading / PT_PER_READING) * factor
          if (cp.campaignApplyBonus ?? true) campaignBonus = installs * (cp.registrationBonusPt ?? 7000) * (cp.registrationBonusConsume ?? 0.7) * k
          if (cp.campaignApplyNormal ?? false) campaignNormal = (totalSales / 2) * k
        }
      }
      const campaignCost = campaignBonus + campaignNormal
      const performerCost = performerCostBase + campaignCost

      return { month, label, adBudget, installs, newCount, newSales, secondCount, secondSales, continuousCount, continuousSales, totalSales,
        normalReward, regBonusCost, normalBonusCost, firstBonusCost, performerCostBase, campaignBonus, campaignNormal, campaignCost, performerCost }
    })
  }, [cp, budgets])

  const fmt = (n: number) => `¥${Math.floor(n).toLocaleString()}`

  return (
    <div className="space-y-6">
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
          <div>
            <label className="block text-sm" style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>起点 年</label>
            <input type="number" min={2020} max={2100} value={cp.startYear ?? 2026}
              onChange={(e) => updateCohortParams({ startYear: parseInt(e.target.value) || 2026 })}
              className="input-dark w-full" />
          </div>
          <div>
            <label className="block text-sm" style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>起点 月</label>
            <input type="number" min={1} max={12} value={cp.startMonth ?? 6}
              onChange={(e) => updateCohortParams({ startMonth: parseInt(e.target.value) || 1 })}
              className="input-dark w-full" />
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
            <div className="mt-3">
              <label className="block text-sm" style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                逓減幅（pt/月） <span style={{ color: 'var(--text-muted)' }}>0=一定 / 例:2 → 20→18→16…</span>
              </label>
              <input
                type="number" min={0} max={20} step={0.5}
                value={+(cp.continuousDecay * 100).toFixed(1)}
                onChange={(e) => updateCohortParams({ continuousDecay: (parseFloat(e.target.value) || 0) / 100 })}
                className="input-dark w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* パフォーマー報酬原価 親パラメータ */}
      <section className="card">
        <h3 className="section-title" style={{ marginTop: 0 }}>パフォーマー報酬原価 パラメータ（親データ）</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {([
            { label: '登録特典 (pt)', key: 'registrationBonusPt' as const, step: 100 },
            { label: '登録特典消化率 (%)', key: 'registrationBonusConsume' as const, pct: true, step: 1 },
            { label: 'Credix代表購入プラン (¥)', key: 'credixRepPlan' as const, step: 100 },
            { label: '購入平均ボーナス付与率 (%)', key: 'avgBonusGrantRate' as const, pct: true, step: 0.01 },
            { label: 'Credix初回ボーナス (pt)', key: 'firstBonusPt' as const, step: 10 },
            { label: '初回ボーナス消化率 (%)', key: 'firstBonusConsume' as const, pct: true, step: 1 },
            { label: 'ボーナスpt原価 (¥/pt)', key: 'bonusPtCost' as const, step: 0.01 },
            { label: '通常報酬原価率 (%)', key: 'normalRewardRate' as const, pct: true, step: 0.1 },
          ]).map(({ label, key, pct, step }) => (
            <div key={key}>
              <label className="block text-sm" style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{label}</label>
              <input
                type="number" step={step} min={0}
                value={pct ? +(((cp[key] as number) ?? 0) * 100).toFixed(4) : ((cp[key] as number) ?? 0)}
                onChange={(e) => {
                  const v = parseFloat(e.target.value) || 0
                  updateCohortParams({ [key]: pct ? v / 100 : v })
                }}
                className="input-dark w-full"
              />
            </div>
          ))}
        </div>
        <div className="text-[11px] mt-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>パフォーマー報酬原価計 ＝ ①＋②＋③＋④</div>
          ① 通常報酬原価 ＝ 合計売上 × {((cp.normalRewardRate ?? 1/3) * 100).toFixed(1)}%（0.67円/pt 相当・売上の1/3）<br />
          ② 登録特典原価 ＝ 新規集客数 × {cp.registrationBonusPt ?? 7000}pt × {cp.bonusPtCost ?? 0.22}円 × 消化率{((cp.registrationBonusConsume ?? 0.7) * 100).toFixed(0)}%<br />
          ③ 通常ボーナス原価 ＝ 課金者数(新規+継続候補+継続) ×（{(cp.credixRepPlan ?? 11000).toLocaleString()}円 × 付与率{((cp.avgBonusGrantRate ?? 0.0364) * 100).toFixed(2)}%）× {cp.bonusPtCost ?? 0.22}円<br />
          ④ 初回ボーナス原価 ＝ 新規PU × {cp.firstBonusPt ?? 300}pt × {cp.bonusPtCost ?? 0.22}円 × 消化率{((cp.firstBonusConsume ?? 1.0) * 100).toFixed(0)}%
        </div>
      </section>

      {/* キャンペーン施策（無償消化分ボーナスpt上乗せ） */}
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
        <div className="flex items-center gap-2 mt-3">
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>期間中の施策原価合計</span>
          <span className="font-bold font-mono-num" style={{ color: 'var(--purple)', fontSize: '1.15rem' }}>
            {fmt(rows.reduce((s, r) => s + r.campaignCost, 0))}
          </span>
        </div>
        <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
          ※ 開始〜終了日を各月で日割り按分。付与先は上のチェック（ボ＝無償／通＝有償）で選択。
          1鑑定＝3通＋400字、ゴールド基準 U消費 通150pt・字9pt（＝4,050pt/鑑定）。<br />
          施策原価 ＝（対象消化pt ÷ 4,050）×（3×+pt/通 ＋ 400×+pt/字）×（実施日数÷その月の日数）。
        </p>
      </section>

      {/* 表示切替 */}
      <div className="flex items-center gap-2">
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>表の向き</span>
        {([
          { id: 'vertical' as const, label: '縦（月＝行）' },
          { id: 'horizontal' as const, label: '横（月＝列）' },
        ]).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setOrient(id)}
            style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
              background: orient === id ? 'var(--accent-dim)' : 'var(--bg-elevated)',
              border: `1px solid ${orient === id ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
              color: orient === id ? 'var(--accent-light)' : 'var(--text-secondary)',
              fontWeight: orient === id ? 600 : 400,
            }}
          >{label}</button>
        ))}
      </div>

      {/* テーブル（横向き：月＝列、指標＝行） */}
      {orient === 'horizontal' && (
        <section className="card overflow-x-auto" style={{ padding: 0 }}>
          <table className="table-dark w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">項目</th>
                {rows.map((r) => <th key={r.month} className="text-right">{r.label}</th>)}
                <th className="text-right">合計</th>
              </tr>
            </thead>
            <tbody>
              {([
                { label: '広告費', get: (r: typeof rows[0]) => fmt(r.adBudget), total: () => fmt(rows.reduce((s, r) => s + r.adBudget, 0)), color: 'var(--text-secondary)', input: true },
                { label: '新規集客数', get: (r: typeof rows[0]) => `${r.installs.toLocaleString()}人`, total: () => `${rows.reduce((s, r) => s + r.installs, 0).toLocaleString()}人`, color: 'var(--text-secondary)' },
                { label: 'PU（課金）', get: (r: typeof rows[0]) => `${r.newCount.toLocaleString()}人`, total: () => `${rows.reduce((s, r) => s + r.newCount, 0).toLocaleString()}人`, color: 'var(--accent-light)' },
                { label: '新規 売上', get: (r: typeof rows[0]) => fmt(r.newSales), total: () => fmt(rows.reduce((s, r) => s + r.newSales, 0)), color: 'var(--accent-light)' },
                { label: '継続候補 人数', get: (r: typeof rows[0]) => r.secondCount > 0 ? `${r.secondCount.toLocaleString()}人` : '-', total: () => `${rows.reduce((s, r) => s + r.secondCount, 0).toLocaleString()}人`, color: 'var(--text-secondary)' },
                { label: '継続候補 売上', get: (r: typeof rows[0]) => r.secondCount > 0 ? fmt(r.secondSales) : '-', total: () => fmt(rows.reduce((s, r) => s + r.secondSales, 0)), color: 'var(--purple)' },
                { label: '継続 人数', get: (r: typeof rows[0]) => r.continuousCount > 0 ? `${r.continuousCount.toLocaleString()}人` : '-', total: () => `${rows.reduce((s, r) => s + r.continuousCount, 0).toLocaleString()}人`, color: 'var(--text-secondary)' },
                { label: '継続 売上', get: (r: typeof rows[0]) => r.continuousCount > 0 ? fmt(r.continuousSales) : '-', total: () => fmt(rows.reduce((s, r) => s + r.continuousSales, 0)), color: 'var(--positive)' },
                { label: '合計売上', get: (r: typeof rows[0]) => fmt(r.totalSales), total: () => fmt(rows.reduce((s, r) => s + r.totalSales, 0)), color: 'var(--text-primary)', bold: true },
                { label: '　└ ① 通常報酬原価', get: (r: typeof rows[0]) => fmt(r.normalReward), total: () => fmt(rows.reduce((s, r) => s + r.normalReward, 0)), color: 'var(--text-secondary)' },
                { label: '　└ ② 登録特典原価', get: (r: typeof rows[0]) => fmt(r.regBonusCost), total: () => fmt(rows.reduce((s, r) => s + r.regBonusCost, 0)), color: 'var(--text-secondary)' },
                { label: '　└ ③ 通常ボーナス原価', get: (r: typeof rows[0]) => fmt(r.normalBonusCost), total: () => fmt(rows.reduce((s, r) => s + r.normalBonusCost, 0)), color: 'var(--text-secondary)' },
                { label: '　└ ④ 初回ボーナス原価', get: (r: typeof rows[0]) => fmt(r.firstBonusCost), total: () => fmt(rows.reduce((s, r) => s + r.firstBonusCost, 0)), color: 'var(--text-secondary)' },
                { label: '　└ ⑤ キャンペーン施策(ボ)', get: (r: typeof rows[0]) => r.campaignBonus > 0 ? fmt(r.campaignBonus) : '-', total: () => fmt(rows.reduce((s, r) => s + r.campaignBonus, 0)), color: 'var(--purple)' },
                { label: '　└ ⑤ キャンペーン施策(通)', get: (r: typeof rows[0]) => r.campaignNormal > 0 ? fmt(r.campaignNormal) : '-', total: () => fmt(rows.reduce((s, r) => s + r.campaignNormal, 0)), color: 'var(--purple)' },
                { label: 'パフォーマー報酬原価計', get: (r: typeof rows[0]) => fmt(r.performerCost), total: () => fmt(rows.reduce((s, r) => s + r.performerCost, 0)), color: 'var(--negative)', bold: true },
              ]).map((m) => (
                <tr key={m.label} className="text-right" style={m.bold ? { background: 'var(--bg-elevated)', borderTop: '2px solid var(--border)' } : undefined}>
                  <td className="text-left font-medium" style={{ color: 'var(--text-secondary)' }}>{m.label}</td>
                  {rows.map((r) => (
                    <td key={r.month} style={{ color: m.color, fontWeight: m.bold ? 700 : undefined }}>
                      {'input' in m && m.input ? (
                        <input
                          type="number" min={0} step={100000}
                          value={r.adBudget}
                          onChange={(e) => updateBudget(r.month - 1, parseInt(e.target.value) || 0)}
                          className="input-dark text-right"
                          style={{ width: '7rem' }}
                        />
                      ) : m.get(r)}
                    </td>
                  ))}
                  <td style={{ color: m.color, fontWeight: 700 }}>{m.total()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* テーブル（縦向き：月＝行） */}
      {orient === 'vertical' && (
      <section className="card overflow-x-auto" style={{ padding: 0 }}>
        <table className="table-dark w-full text-sm">
          <thead>
            <tr>
              <th>月</th>
              <th className="text-right">広告費</th>
              <th className="text-right">新規集客数</th>
              <th className="text-right">PU</th>
              <th className="text-center" colSpan={2}>新規（1ヶ月目）</th>
              <th className="text-center" colSpan={2}>継続候補（2ヶ月目）</th>
              <th className="text-center" colSpan={2}>継続（3ヶ月目〜）</th>
              <th className="text-right">合計売上</th>
              <th className="text-right">報酬原価計</th>
            </tr>
            <tr>
              <th></th>
              <th className="text-right">（手動入力）</th>
              <th className="text-right">÷CPI</th>
              <th className="text-right">×課金率</th>
              <th className="text-right">人数</th>
              <th className="text-right">売上</th>
              <th className="text-right">人数</th>
              <th className="text-right">売上</th>
              <th className="text-right">人数</th>
              <th className="text-right">売上</th>
              <th className="text-right">合計</th>
              <th className="text-right">原価</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month} className="text-right">
                <td className="text-center font-medium" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{row.label}</td>
                <td className="text-right">
                  <input
                    type="number" min={0} step={100000}
                    value={row.adBudget}
                    onChange={(e) => updateBudget(row.month - 1, parseInt(e.target.value) || 0)}
                    className="input-dark text-right"
                    style={{ width: '7.5rem' }}
                  />
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{row.installs.toLocaleString()}人</td>
                <td className="font-medium" style={{ color: 'var(--accent-light)' }}>{row.newCount.toLocaleString()}人</td>
                <td>{row.newCount.toLocaleString()}人</td>
                <td style={{ color: 'var(--accent-light)' }}>{fmt(row.newSales)}</td>
                <td>{row.secondCount > 0 ? `${row.secondCount.toLocaleString()}人` : '-'}</td>
                <td style={{ color: 'var(--purple)' }}>{row.secondCount > 0 ? fmt(row.secondSales) : '-'}</td>
                <td>{row.continuousCount > 0 ? `${row.continuousCount.toLocaleString()}人` : '-'}</td>
                <td style={{ color: 'var(--positive)' }}>{row.continuousCount > 0 ? fmt(row.continuousSales) : '-'}</td>
                <td className="font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(row.totalSales)}</td>
                <td className="font-bold" style={{ color: 'var(--negative)' }}>{fmt(row.performerCost)}</td>
              </tr>
            ))}
            <tr className="font-bold text-right" style={{ background: 'var(--bg-elevated)', borderTop: '2px solid var(--border)' }}>
              <td className="text-center" style={{ color: 'var(--text-secondary)' }}>合計</td>
              <td style={{ color: 'var(--text-secondary)' }}>{fmt(rows.reduce((s, r) => s + r.adBudget, 0))}</td>
              <td style={{ color: 'var(--text-secondary)' }}>{rows.reduce((s, r) => s + r.installs, 0).toLocaleString()}人</td>
              <td style={{ color: 'var(--accent-light)' }}>{rows.reduce((s, r) => s + r.newCount, 0).toLocaleString()}人</td>
              <td colSpan={6}></td>
              <td style={{ color: 'var(--accent-light)' }}>
                {fmt(rows.reduce((s, r) => s + r.totalSales, 0))}
              </td>
              <td style={{ color: 'var(--negative)' }}>
                {fmt(rows.reduce((s, r) => s + r.performerCost, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </section>
      )}
    </div>
  )
}
