import { useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { EditableCell } from '../components/EditableCell'
import { calcDapDistribution } from '../utils/calculations'
import type { ActionType } from '../types'

const ACTION_LABELS: Record<ActionType, string> = {
  message:         'メッセージ(1通)',
  fortune_char:    '有料鑑定(1文字)',
  paid_image:      '有料画像',
  paid_video:      '有料動画',
  image_attach:    '画像添付(U→P)',
  video_attach:    '動画添付(U→P)',
  voice_call:      '音声通話(1分)',
  video_call:      'ビデオ通話(1分)',
  with_user_camera:'WithUserCam(1分)',
  premium_live:    'PremiumLive(1分)',
  premium_2shot:   'Premium2shot(1分)',
  post_comment:    '投稿コメント(1通)',
  post_paid_image: '投稿有料画像',
  post_paid_video: '投稿有料動画',
}

const RANK_SCENARIOS = [
  { field: 'performerRanks' as const, label: '基本設定' },
  { field: 'performerRanks1' as const, label: 'キャンペーン設定1' },
  { field: 'performerRanks2' as const, label: 'キャンペーン設定2' },
]
type RanksField = typeof RANK_SCENARIOS[number]['field']

export function PerformerSettings() {
  const { data, updateRanksScenario, updateCohortParams } = useAppContext()
  const { pointConfig, cohortParams: cp } = data
  const [scenario, setScenario] = useState<RanksField>('performerRanks')
  const performerRanks = data[scenario]

  const updateActionPt = (
    rankIdx: number,
    actionIdx: number,
    field: 'userConsume' | 'performerNormal' | 'performerBonus',
    value: number,
  ) => {
    const ranks = performerRanks.map((r, ri) =>
      ri !== rankIdx ? r : {
        ...r,
        actions: r.actions.map((a, ai) =>
          ai !== actionIdx ? a : { ...a, [field]: value }
        ),
      }
    )
    updateRanksScenario(scenario, ranks)
  }

  const actionTypes = performerRanks[0]?.actions.map((a) => a.type) ?? []

  // ─── DAP稼働分布（分析用・入力はこの画面のみで保持）───
  const [dap, setDap] = useState({
    totalReward: 5000000,
    top10Reward: 2500000,
    top50Reward: 4000000,
    totalDap: 200,
    activeDap: 120,
  })
  const dist = calcDapDistribution(dap)
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`
  const yen = (n: number) => `¥${Math.floor(n).toLocaleString()}`
  const dapFields: { key: keyof typeof dap; label: string; money: boolean }[] = [
    { key: 'totalReward', label: '全DAP報酬総額', money: true },
    { key: 'top10Reward', label: '上位10%の報酬合計', money: true },
    { key: 'top50Reward', label: '上位50%の報酬合計', money: true },
    { key: 'totalDap', label: '総DAP数', money: false },
    { key: 'activeDap', label: '稼働DAP数', money: false },
  ]

  // ─── 1鑑定シミュレーター（基本 vs キャンペーン比較）───
  // ※常に「基本設定」のランクを基準にキャンペーン上乗せを比較
  const [sim, setSim] = useState({
    messages: 3,     // 1鑑定あたりの通数（目安: 3通）
    chars: 400,      // 1鑑定あたりの文字数（目安: 400字）
    addMsg: 10,      // キャンペーン: 1通あたり +pt
    addChar: 1,      // キャンペーン: 1文字あたり +pt
  })
  const simBaseRanks = data.performerRanks.filter((r) => {
    const m = r.actions.find((a) => a.type === 'message')
    const c = r.actions.find((a) => a.type === 'fortune_char')
    return (m && (m.performerNormal || m.performerBonus)) || (c && (c.performerNormal || c.performerBonus))
  })
  const simRows = simBaseRanks.map((rank) => {
    const m = rank.actions.find((a) => a.type === 'message')
    const c = rank.actions.find((a) => a.type === 'fortune_char')
    const normalPt = sim.messages * (m?.performerNormal ?? 0) + sim.chars * (c?.performerNormal ?? 0)
    const bonusPt = sim.messages * (m?.performerBonus ?? 0) + sim.chars * (c?.performerBonus ?? 0)
    const upliftPt = sim.messages * sim.addMsg + sim.chars * sim.addChar
    const cpBonusPt = bonusPt + upliftPt

    const normalIncome = normalPt * pointConfig.normalPtCost
    const bonusIncome = bonusPt * pointConfig.bonusPtCost
    const cpBonusIncome = cpBonusPt * pointConfig.bonusPtCost
    const addIncome = upliftPt * pointConfig.bonusPtCost
    const addRate = bonusIncome > 0 ? addIncome / bonusIncome : null
    return { rank, normalPt, bonusPt, cpBonusPt, normalIncome, bonusIncome, cpBonusIncome, addIncome, addRate }
  })

  // 1鑑定あたり 総合損益指標（U消費・売上・粗利・キャンペーン後）
  const econRows = simBaseRanks.map((rank) => {
    const m = rank.actions.find((a) => a.type === 'message')
    const c = rank.actions.find((a) => a.type === 'fortune_char')
    const userPt = sim.messages * (m?.userConsume ?? 0) + sim.chars * (c?.userConsume ?? 0)  // U消費pt
    const revenue = userPt * pointConfig.userPtRate                                            // 売上(¥)
    const pNormalPt = sim.messages * (m?.performerNormal ?? 0) + sim.chars * (c?.performerNormal ?? 0)
    const rewardCost = pNormalPt * pointConfig.normalPtCost                                    // 報酬原価(通常)
    const grossProfit = revenue - rewardCost
    const grossMargin = revenue > 0 ? grossProfit / revenue : 0
    // キャンペーン上乗せ（ボーナスpt）のコスト増
    const cpCost = (sim.messages * sim.addMsg + sim.chars * sim.addChar) * pointConfig.bonusPtCost
    const cpGrossProfit = grossProfit - cpCost
    const cpGrossMargin = revenue > 0 ? cpGrossProfit / revenue : 0
    return { rank, userPt, revenue, pNormalPt, rewardCost, grossProfit, grossMargin, cpCost, cpGrossProfit, cpGrossMargin }
  })

  // ─── キャンペーン予算逆算 & 長期ROI ───
  const [camp, setCamp] = useState({
    budget: 1000000,         // 月間キャンペーン予算（上乗せptの会社負担）
    totalMessages: 1000000,  // 月間メッセージ総数（全パフォーマー）
    totalChars: 3000000,     // 月間有料鑑定文字総数（全パフォーマー）
    msgShare: 0.6,           // 予算のメッセージ配分（残りは文字）
    monthlySales: 20000000,  // 現状の月間売上
    extraSalesRate: 0.05,    // 想定の売上アップ率
    grossMargin: 0.62,       // 粗利率
    effectMonths: 6,         // 効果が続く月数
  })
  const bonusCost = pointConfig.bonusPtCost
  // 逆算：予算 ÷ (¥0.22 × 総量) で +pt/通・+pt/字
  const addMsgPt = camp.totalMessages > 0 ? (camp.budget * camp.msgShare) / (bonusCost * camp.totalMessages) : 0
  const addCharPt = camp.totalChars > 0 ? (camp.budget * (1 - camp.msgShare)) / (bonusCost * camp.totalChars) : 0
  // 長期ROI
  const extraSales = camp.monthlySales * camp.extraSalesRate
  const extraGP = extraSales * camp.grossMargin             // 月間の追加粗利（効果）
  const monthBalance = extraGP - camp.budget                // 初月の収支（投資込み）
  const breakevenMonths = extraGP > 0 ? camp.budget / extraGP : Infinity  // 投資回収月数
  const cumNet = extraGP * camp.effectMonths - camp.budget  // 効果継続期間の累計純利益
  const roi = camp.budget > 0 ? cumNet / camp.budget : 0
  const campFields: { key: keyof typeof camp; label: string; pct?: boolean; suffix?: string }[] = [
    { key: 'budget', label: '月間キャンペーン予算 (¥)', suffix: '円' },
    { key: 'totalMessages', label: '月間メッセージ総数 (通)', suffix: '通' },
    { key: 'totalChars', label: '月間有料鑑定文字総数 (字)', suffix: '字' },
    { key: 'msgShare', label: '予算配分: メッセージ (%)', pct: true },
    { key: 'monthlySales', label: '現状の月間売上 (¥)', suffix: '円' },
    { key: 'extraSalesRate', label: '想定 売上アップ率 (%)', pct: true },
    { key: 'grossMargin', label: '粗利率 (%)', pct: true },
    { key: 'effectMonths', label: '効果が続く月数', suffix: 'ヶ月' },
  ]

  return (
    <div className="max-w-full">
      <h2 className="page-title" style={{ marginBottom: '1rem' }}>パフォーマーランク別獲得ポイント</h2>

      {/* キャンペーン登録：無償消化分ボーナスpt上乗せ */}
      <section className="card" style={{ marginBottom: '1rem' }}>
        <div className="flex items-center gap-3 mb-3">
          <h3 className="section-title" style={{ margin: 0 }}>キャンペーン登録（ボーナスpt上乗せ・無償消化分）</h3>
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
            <label className="block text-sm" style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>実施月</label>
            <input type="number" min={1} value={cp.campaignMonth ?? 1}
              onChange={(e) => updateCohortParams({ campaignMonth: parseInt(e.target.value) || 1 })}
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
          <div className="flex flex-col justify-end">
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>1鑑定あたり上乗せ</span>
            <span className="font-bold font-mono-num" style={{ color: 'var(--purple)', fontSize: '1.05rem' }}>
              +{3 * (cp.campaignAddMsgBonusPt ?? 0) + 400 * (cp.campaignAddCharBonusPt ?? 0)} pt / +¥{(3 * (cp.campaignAddMsgBonusPt ?? 0) + 400 * (cp.campaignAddCharBonusPt ?? 0)).toLocaleString()}
            </span>
          </div>
        </div>
        <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
          ※ ゴールド基準・1鑑定＝3通＋400字。対象は登録特典(無償)の消化分のみ。月次の施策原価・採算は「コホート予測」「予算P/L」に反映されます。
        </p>
      </section>

      {/* シナリオ切り替えタブ */}
      <div className="scenario-tabs" style={{ marginBottom: '1rem' }}>
        {RANK_SCENARIOS.map((s) => (
          <button
            key={s.field}
            onClick={() => setScenario(s.field)}
            className={`scenario-tab ${scenario === s.field ? 'active' : ''}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <p className="text-xs" style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
        ※ セルをクリックして編集できます。通常pt単価:¥{pointConfig.normalPtCost} / ボーナスpt単価:¥{pointConfig.bonusPtCost}
      </p>

      {/* カテゴリ別カード（横並びグリッド） */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {actionTypes.map((actionType, actionIdx) => (
          <div key={actionType} className="card" style={{ padding: '0.875rem 1rem' }}>
            <h3 className="font-bold" style={{ color: 'var(--accent-light)', fontSize: '0.95rem', marginBottom: '0.625rem' }}>
              {ACTION_LABELS[actionType]}
            </h3>
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left" style={{ padding: '0.3rem 0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>ランク</th>
                  <th className="text-right" style={{ padding: '0.3rem 0.4rem', fontSize: '0.8rem', color: 'var(--accent-light)' }}>U消費</th>
                  <th className="text-right" style={{ padding: '0.3rem 0.4rem', fontSize: '0.8rem', color: 'var(--positive)' }}>P通常</th>
                  <th className="text-right" style={{ padding: '0.3rem 0.4rem', fontSize: '0.8rem', color: 'var(--warning)' }}>Pボーナス</th>
                </tr>
              </thead>
              <tbody>
                {performerRanks.map((rank, rankIdx) => {
                  const action = rank.actions[actionIdx]
                  return (
                    <tr key={rank.stage} style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: rankIdx % 2 === 1 ? 'var(--bg-elevated)' : 'transparent',
                    }}>
                      <td className="font-medium" style={{ padding: '0.3rem 0.4rem', fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {rank.name}
                      </td>
                      <td className="text-right font-mono-num" style={{ padding: '0.3rem 0.4rem', fontSize: '0.9rem' }}>
                        <EditableCell value={action.userConsume} suffix="pt"
                          onChange={(v) => updateActionPt(rankIdx, actionIdx, 'userConsume', v)} />
                      </td>
                      <td className="text-right font-mono-num" style={{ padding: '0.3rem 0.4rem', fontSize: '0.9rem' }}>
                        <EditableCell value={action.performerNormal} suffix="pt"
                          onChange={(v) => updateActionPt(rankIdx, actionIdx, 'performerNormal', v)} />
                      </td>
                      <td className="text-right font-mono-num" style={{ padding: '0.3rem 0.4rem', fontSize: '0.9rem' }}>
                        <EditableCell value={action.performerBonus} suffix="pt"
                          onChange={(v) => updateActionPt(rankIdx, actionIdx, 'performerBonus', v)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* DAP稼働分布表 */}
      <section className="card mt-8 max-w-3xl" style={{ marginTop: '2rem' }}>
        <h3 className="section-title" style={{ marginBottom: '0.25rem' }}>DAP稼働分布・報酬集中度</h3>
        <p className="text-xs" style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          上位パフォーマーへの報酬集中度と稼働率を分析します（数値はこの画面のみで保持）。
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3" style={{ marginBottom: '1.5rem' }}>
          {dapFields.map(({ key, label, money }) => (
            <div key={key}>
              <label className="block text-xs" style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{label}</label>
              <input
                type="number"
                value={dap[key]}
                onChange={(e) => setDap((d) => ({ ...d, [key]: parseFloat(e.target.value) || 0 }))}
                className="input-dark w-full text-right"
              />
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{money ? '円' : '人'}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg p-4 text-center" style={{ background: 'var(--accent-dim)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 6 }}>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>上位10%の報酬占有率</div>
            <div className="text-2xl font-bold font-mono-num" style={{ color: 'var(--accent-light)' }}>{pct(dist.top10Share)}</div>
          </div>
          <div className="rounded-lg p-4 text-center" style={{ background: 'var(--positive-bg)', border: '1px solid rgba(63,185,80,0.25)', borderRadius: 6 }}>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>上位50%の報酬占有率</div>
            <div className="text-2xl font-bold font-mono-num" style={{ color: 'var(--positive)' }}>{pct(dist.top50Share)}</div>
          </div>
          <div className="rounded-lg p-4 text-center" style={{ background: 'var(--warning-bg)', border: '1px solid rgba(210,153,34,0.25)', borderRadius: 6 }}>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>下位50%の報酬占有率</div>
            <div className="text-2xl font-bold font-mono-num" style={{ color: 'var(--warning)' }}>{pct(dist.bottomShare)}</div>
          </div>
          <div className="rounded-lg p-4 text-center" style={{ background: 'var(--purple-bg)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 6 }}>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>DAP稼働率</div>
            <div className="text-2xl font-bold font-mono-num" style={{ color: 'var(--purple)' }}>{pct(dist.activeRate)}</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{dap.activeDap}/{dap.totalDap}人</div>
          </div>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>
          ※ 稼働DAP1人あたり平均報酬: <strong style={{ color: 'var(--text-primary)' }}>{yen(dap.activeDap > 0 ? dap.totalReward / dap.activeDap : 0)}</strong>
        </p>
      </section>

      {/* 1鑑定シミュレーター（基本 vs キャンペーン比較） */}
      <section className="card" style={{ marginTop: '2rem' }}>
        <h3 className="section-title" style={{ marginBottom: '0.25rem' }}>1鑑定シミュレーター（基本 vs キャンペーン比較）</h3>
        <p className="text-xs" style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          1鑑定あたりの通数・文字数を入力し、キャンペーンの上乗せpt（+pt/通・+pt/字）が各ランクの獲得pt・報酬にどう効くかを比較します。何ptアップが適正かの判断にお使いください。※通話など他の機能は含みません。
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl" style={{ marginBottom: '1.25rem' }}>
          {([
            { key: 'messages', label: '1鑑定の通数', unit: '通' },
            { key: 'chars', label: '1鑑定の文字数', unit: '字' },
            { key: 'addMsg', label: 'CP: 1通あたり +pt', unit: 'pt' },
            { key: 'addChar', label: 'CP: 1文字あたり +pt', unit: 'pt' },
          ] as { key: keyof typeof sim; label: string; unit: string }[]).map(({ key, label, unit }) => (
            <div key={key}>
              <label className="block text-xs" style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{label}</label>
              <div className="flex items-center gap-1">
                <input
                  type="number" min={0}
                  value={sim[key]}
                  onChange={(e) => setSim((s) => ({ ...s, [key]: parseFloat(e.target.value) || 0 }))}
                  className="input-dark w-full text-right"
                  style={key.startsWith('add') ? { borderColor: 'rgba(210,153,34,0.5)', color: 'var(--warning)' } : {}}
                />
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{unit}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="table-dark w-full text-xs">
            <thead>
              <tr>
                <th className="text-left">ランク</th>
                <th className="text-right">通常 獲得pt</th>
                <th className="text-right">ボーナス 獲得pt(基本)</th>
                <th className="text-right" style={{ background: 'var(--warning-bg)' }}>ボーナス 獲得pt(CP)</th>
                <th className="text-right">通常報酬</th>
                <th className="text-right">ボーナス報酬(基本)</th>
                <th className="text-right" style={{ background: 'var(--warning-bg)' }}>ボーナス報酬(CP)</th>
                <th className="text-right">増加額</th>
                <th className="text-right">増加率</th>
              </tr>
            </thead>
            <tbody>
              {simRows.map(({ rank, normalPt, bonusPt, cpBonusPt, normalIncome, bonusIncome, cpBonusIncome, addIncome, addRate }) => (
                <tr key={rank.stage}>
                  <td className="font-medium" style={{ color: 'var(--text-secondary)' }}>{rank.name}</td>
                  <td className="text-right tabular-nums" style={{ color: 'var(--text-muted)' }}>{Math.round(normalPt).toLocaleString()} pt</td>
                  <td className="text-right tabular-nums">{Math.round(bonusPt).toLocaleString()} pt</td>
                  <td className="text-right tabular-nums font-medium" style={{ background: 'var(--warning-bg)' }}>{Math.round(cpBonusPt).toLocaleString()} pt</td>
                  <td className="text-right tabular-nums" style={{ color: 'var(--text-muted)' }}>{yen(normalIncome)}</td>
                  <td className="text-right tabular-nums">{yen(bonusIncome)}</td>
                  <td className="text-right tabular-nums font-medium" style={{ background: 'var(--warning-bg)' }}>{yen(cpBonusIncome)}</td>
                  <td className="text-right tabular-nums font-bold" style={{ color: 'var(--positive)' }}>+{yen(addIncome)}</td>
                  <td className="text-right tabular-nums font-bold" style={{ color: addRate != null && addRate >= 0.5 ? 'var(--negative)' : 'var(--text-secondary)' }}>
                    {addRate != null ? `+${(addRate * 100).toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)', marginTop: '0.75rem' }}>
          ※ 通常獲得pt＝P通常 / ボーナス獲得pt＝Pボーナス（表の値）。通常報酬＝通常pt×¥{pointConfig.normalPtCost}、ボーナス報酬＝ボーナスpt×¥{pointConfig.bonusPtCost}。<br />
          ※ キャンペーンの上乗せ（+pt/通・+pt/字）は<strong style={{ color: 'var(--text-primary)' }}>ボーナスpt</strong>に加算され、会社は¥{pointConfig.bonusPtCost}/ptを追加負担します。増加額・増加率はボーナス報酬に対する増分です。<br />
          ※ 増加率が高いランク（特に下位＝元のボーナス単価が低い）ほど同じ上乗せのインパクトが大きくなります。会社負担とインセンティブ効果のバランスで適正な上乗せ幅を判断できます。
        </p>
      </section>

      {/* 1鑑定あたり 総合損益指標 */}
      <section className="card" style={{ marginTop: '2rem' }}>
        <h3 className="section-title">1鑑定あたり 総合損益指標（{sim.messages}通 ＋ {sim.chars}字）</h3>
        <p className="text-[12px]" style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          上の入力（通数・文字数・上乗せpt）と連動。1鑑定でユーザーがいくら消費し、会社にいくら残るか（売上・報酬原価・粗利・粗利率）と、キャンペーン上乗せ後の粗利をランク別に表示します。
        </p>
        <div className="overflow-x-auto">
          <table className="table-dark w-full">
            <thead>
              <tr>
                <th className="text-left">ランク</th>
                <th>U消費pt</th>
                <th>売上(¥)</th>
                <th>P獲得pt(通常)</th>
                <th>報酬原価(¥)</th>
                <th>粗利(¥)</th>
                <th>粗利率</th>
                <th>CP上乗せ原価</th>
                <th>CP後 粗利</th>
                <th>CP後 粗利率</th>
              </tr>
            </thead>
            <tbody>
              {econRows.map((r) => (
                <tr key={r.rank.stage}>
                  <td className="text-left font-medium" style={{ color: 'var(--text-secondary)' }}>{r.rank.name}</td>
                  <td>{Math.round(r.userPt).toLocaleString()} pt</td>
                  <td style={{ color: 'var(--accent-light)' }}>{yen(r.revenue)}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{Math.round(r.pNormalPt).toLocaleString()} pt</td>
                  <td>{yen(r.rewardCost)}</td>
                  <td className="font-medium" style={{ color: 'var(--positive)' }}>{yen(r.grossProfit)}</td>
                  <td className="font-bold">{(r.grossMargin * 100).toFixed(1)}%</td>
                  <td style={{ color: 'var(--negative)' }}>▲{yen(r.cpCost)}</td>
                  <td className="font-medium" style={{ color: r.cpGrossProfit >= 0 ? 'var(--positive)' : 'var(--negative)' }}>{yen(r.cpGrossProfit)}</td>
                  <td className="font-bold" style={{ color: r.cpGrossMargin >= 0.4 ? 'var(--text-primary)' : 'var(--warning)' }}>{(r.cpGrossMargin * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)', marginTop: '0.75rem' }}>
          ※ U消費pt = 通数×メッセージU消費 ＋ 文字数×有料鑑定U消費。売上 = U消費pt × User販売単価¥{pointConfig.userPtRate}。<br />
          ※ 報酬原価 = P獲得pt(通常) × ¥{pointConfig.normalPtCost}。粗利 = 売上 − 報酬原価。CP上乗せ原価 = 上乗せpt × ¥{pointConfig.bonusPtCost}（ボーナス）。<br />
          ※ CP後粗利率が大きく下がらない範囲で上乗せ幅を決めるのが目安です。
        </p>
      </section>

      {/* キャンペーン予算逆算 & 長期ROI */}
      <section className="card" style={{ marginTop: '2rem' }}>
        <h3 className="section-title">キャンペーン予算 → 最適な上乗せpt 逆算 ＆ 長期ROI</h3>
        <p className="text-[12px]" style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          月間のキャンペーン予算と全パフォーマーの想定稼働量から、適正な「+pt/通・+pt/字」を逆算します。短期は赤字でも、効果（売上アップ）が続けば長期で回収できるかを判定します。
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3" style={{ marginBottom: '1.25rem' }}>
          {campFields.map(({ key, label, pct, suffix }) => (
            <div key={key}>
              <label className="block text-sm" style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{label}</label>
              <input
                type="number" min={0} step={pct ? 1 : (key === 'budget' || key === 'monthlySales' ? 100000 : 1000)}
                value={pct ? +(camp[key] * 100).toFixed(1) : camp[key]}
                onChange={(e) => {
                  const v = parseFloat(e.target.value) || 0
                  setCamp((c) => ({ ...c, [key]: pct ? v / 100 : v }))
                }}
                className="input-dark w-full text-right"
              />
              {suffix && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{suffix}</span>}
            </div>
          ))}
        </div>

        {/* 逆算結果 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4" style={{ marginBottom: '1rem' }}>
          <div className="card-elevated" style={{ padding: '1rem', textAlign: 'center' }}>
            <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>推奨 +pt / 通（ボーナス）</div>
            <div className="kpi-value" style={{ color: 'var(--accent-light)' }}>+{addMsgPt.toFixed(1)} pt</div>
          </div>
          <div className="card-elevated" style={{ padding: '1rem', textAlign: 'center' }}>
            <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>推奨 +pt / 文字（ボーナス）</div>
            <div className="kpi-value" style={{ color: 'var(--accent-light)' }}>+{addCharPt.toFixed(2)} pt</div>
          </div>
          <div className="card-elevated" style={{ padding: '1rem', textAlign: 'center' }}>
            <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>月間 会社負担（予算）</div>
            <div className="kpi-value" style={{ color: 'var(--text-primary)' }}>{yen(camp.budget)}</div>
          </div>
        </div>

        {/* 長期ROI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card-elevated" style={{ padding: '1rem', textAlign: 'center' }}>
            <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>月間 追加粗利（効果）</div>
            <div className="kpi-value" style={{ color: 'var(--positive)' }}>{yen(extraGP)}</div>
          </div>
          <div className="card-elevated" style={{ padding: '1rem', textAlign: 'center' }}>
            <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>初月の収支</div>
            <div className="kpi-value" style={{ color: monthBalance >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
              {monthBalance >= 0 ? '' : '▲'}{yen(Math.abs(monthBalance))}
            </div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{monthBalance >= 0 ? '初月から黒字' : '短期は赤字'}</div>
          </div>
          <div className="card-elevated" style={{ padding: '1rem', textAlign: 'center' }}>
            <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>投資回収月数</div>
            <div className="kpi-value" style={{ color: 'var(--text-primary)' }}>
              {isFinite(breakevenMonths) ? `${breakevenMonths.toFixed(1)}ヶ月` : '—'}
            </div>
            <div className="text-[10px]" style={{ color: breakevenMonths <= camp.effectMonths ? 'var(--positive)' : 'var(--negative)' }}>
              {isFinite(breakevenMonths) ? (breakevenMonths <= camp.effectMonths ? '効果期間内に回収' : '回収には期間不足') : '効果なし'}
            </div>
          </div>
          <div className="card-elevated" style={{ padding: '1rem', textAlign: 'center' }}>
            <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{camp.effectMonths}ヶ月 累計ROI</div>
            <div className="kpi-value" style={{ color: roi >= 0 ? 'var(--positive)' : 'var(--negative)' }}>{(roi * 100).toFixed(0)}%</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>純利益 {yen(cumNet)}</div>
          </div>
        </div>

        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>
          ※ +pt逆算 = 予算 × 配分 ÷（ボーナスpt原価¥{bonusCost} × 総量）。この値を②上部やキャンペーン設定の単価に上乗せしてください。<br />
          ※ 追加粗利 = 現状売上 × 売上アップ率 × 粗利率。<strong style={{ color: 'var(--text-primary)' }}>初月は予算（投資）を引くため赤字でも、効果が続けば「投資回収月数」で黒字転換</strong>します。回収月数が「効果が続く月数」以内ならGOの目安。<br />
          ※ 売上アップ率は「キャンペーンでパフォーマー稼働が増え、結果ユーザー消費が伸びる効果」の想定値です。実績が出たら調整してください。
        </p>
      </section>
    </div>
  )
}
