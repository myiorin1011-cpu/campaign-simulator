import React, { useState } from 'react'
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
  const { data, updateRanksScenario } = useAppContext()
  const { pointConfig } = data
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
    messages: 30,    // 1鑑定あたりの通数
    chars: 400,      // 1鑑定あたりの文字数
    addMsg: 10,      // キャンペーン: 1通あたり +pt
    addChar: 1,      // キャンペーン: 1文字あたり +pt
  })
  const simRows = data.performerRanks
    .filter((r) => {
      const m = r.actions.find((a) => a.type === 'message')
      const c = r.actions.find((a) => a.type === 'fortune_char')
      return (m && (m.performerNormal || m.performerBonus)) || (c && (c.performerNormal || c.performerBonus))
    })
    .map((rank) => {
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

  return (
    <div className="max-w-full">
      <h2 className="page-title" style={{ marginBottom: '1rem' }}>パフォーマーランク別獲得ポイント</h2>

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

      <div className="overflow-x-auto">
        <table className="text-xs border-collapse whitespace-nowrap" style={{ borderColor: 'var(--border)' }}>
          <thead>
            <tr style={{ background: 'var(--accent)', color: 'var(--text-primary)' }}>
              <th className="px-3 py-2 text-left sticky left-0 z-10" style={{ background: 'var(--accent)' }}>ランク</th>
              {actionTypes.map((actionType) => (
                <th key={actionType} className="px-2 py-2 text-center" style={{ borderLeft: '1px solid rgba(99,102,241,0.4)' }} colSpan={3}>
                  {ACTION_LABELS[actionType]}
                </th>
              ))}
            </tr>
            <tr style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              <th className="px-3 py-1 sticky left-0 z-10" style={{ background: 'var(--bg-elevated)' }}></th>
              {actionTypes.map((actionType) => (
                <React.Fragment key={actionType}>
                  <th className="px-2 py-1 text-center" style={{ borderLeft: '1px solid var(--border)', color: 'var(--accent-light)' }}>U消費</th>
                  <th className="px-2 py-1 text-center" style={{ color: 'var(--positive)' }}>P通常</th>
                  <th className="px-2 py-1 text-center" style={{ color: 'var(--warning)' }}>Pボーナス</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {performerRanks.map((rank, rankIdx) => (
              <tr key={rank.stage} style={{
                borderBottom: '1px solid var(--border-subtle)',
                background: rankIdx % 2 === 1 ? 'var(--bg-elevated)' : 'var(--bg-card)',
              }}>
                <td className="px-3 py-1 font-medium sticky left-0 z-10" style={{
                  color: 'var(--text-secondary)',
                  borderRight: '1px solid var(--border)',
                  background: rankIdx % 2 === 1 ? 'var(--bg-elevated)' : 'var(--bg-card)',
                }}>
                  {rank.name}
                </td>
                {rank.actions.map((action, actionIdx) => (
                  <React.Fragment key={action.type}>
                    <td className="px-2 py-1 text-right" style={{ borderLeft: '1px solid var(--border-subtle)' }}>
                      <EditableCell value={action.userConsume} suffix="pt"
                        onChange={(v) => updateActionPt(rankIdx, actionIdx, 'userConsume', v)} />
                    </td>
                    <td className="px-2 py-1 text-right">
                      <EditableCell value={action.performerNormal} suffix="pt"
                        onChange={(v) => updateActionPt(rankIdx, actionIdx, 'performerNormal', v)} />
                    </td>
                    <td className="px-2 py-1 text-right">
                      <EditableCell value={action.performerBonus} suffix="pt"
                        onChange={(v) => updateActionPt(rankIdx, actionIdx, 'performerBonus', v)} />
                    </td>
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
    </div>
  )
}
