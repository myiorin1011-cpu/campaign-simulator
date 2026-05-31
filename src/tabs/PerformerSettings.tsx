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

export function PerformerSettings() {
  const { data, updatePerformerRanks } = useAppContext()
  const { performerRanks, pointConfig } = data

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
    updatePerformerRanks(ranks)
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

  return (
    <div className="max-w-full">
      <h2 className="text-xl font-bold text-gray-800 mb-6">パフォーマーランク別獲得ポイント</h2>
      <p className="text-xs text-gray-500 mb-4">
        ※ セルをクリックして編集できます。通常pt単価:¥{pointConfig.normalPtCost} / ボーナスpt単価:¥{pointConfig.bonusPtCost}
      </p>

      <div className="overflow-x-auto">
        <table className="text-xs border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-indigo-700 text-white">
              {/* 縦=ランク、横=アクション（スプレッドシートと同じ並び） */}
              <th className="px-3 py-2 text-left sticky left-0 bg-indigo-700 z-10">ランク</th>
              {actionTypes.map((actionType) => (
                <th key={actionType} className="px-2 py-2 text-center" colSpan={3}>
                  {ACTION_LABELS[actionType]}
                </th>
              ))}
            </tr>
            <tr className="bg-indigo-100 text-gray-700">
              <th className="px-3 py-1 sticky left-0 bg-indigo-100 z-10"></th>
              {actionTypes.map((actionType) => (
                <React.Fragment key={actionType}>
                  <th className="px-2 py-1 text-center text-indigo-700">U消費</th>
                  <th className="px-2 py-1 text-center text-green-700">P通常</th>
                  <th className="px-2 py-1 text-center text-orange-600">Pボーナス</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {performerRanks.map((rank, rankIdx) => (
              <tr key={rank.stage} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-1 font-medium text-gray-700 sticky left-0 bg-white z-10 border-r border-gray-200">
                  {rank.name}
                </td>
                {rank.actions.map((action, actionIdx) => (
                  <React.Fragment key={action.type}>
                    <td className="px-2 py-1 text-center">
                      <EditableCell value={action.userConsume} suffix="pt"
                        onChange={(v) => updateActionPt(rankIdx, actionIdx, 'userConsume', v)} />
                    </td>
                    <td className="px-2 py-1 text-center">
                      <EditableCell value={action.performerNormal} suffix="pt"
                        onChange={(v) => updateActionPt(rankIdx, actionIdx, 'performerNormal', v)} />
                    </td>
                    <td className="px-2 py-1 text-center">
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
      <section className="bg-white rounded-lg shadow p-6 mt-8 max-w-3xl">
        <h3 className="font-semibold text-gray-700 mb-1">DAP稼働分布・報酬集中度</h3>
        <p className="text-xs text-gray-500 mb-4">
          上位パフォーマーへの報酬集中度と稼働率を分析します（数値はこの画面のみで保持）。
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {dapFields.map(({ key, label, money }) => (
            <div key={key}>
              <label className="block text-xs text-gray-600 mb-1">{label}</label>
              <input
                type="number"
                value={dap[key]}
                onChange={(e) => setDap((d) => ({ ...d, [key]: parseFloat(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right"
              />
              <span className="text-[10px] text-gray-400">{money ? '円' : '人'}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-indigo-50 rounded-lg p-4 text-center">
            <div className="text-xs text-gray-500">上位10%の報酬占有率</div>
            <div className="text-2xl font-bold text-indigo-700">{pct(dist.top10Share)}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-xs text-gray-500">上位50%の報酬占有率</div>
            <div className="text-2xl font-bold text-green-700">{pct(dist.top50Share)}</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <div className="text-xs text-gray-500">下位50%の報酬占有率</div>
            <div className="text-2xl font-bold text-orange-600">{pct(dist.bottomShare)}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-xs text-gray-500">DAP稼働率</div>
            <div className="text-2xl font-bold text-purple-700">{pct(dist.activeRate)}</div>
            <div className="text-[10px] text-gray-400">{dap.activeDap}/{dap.totalDap}人</div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          ※ 稼働DAP1人あたり平均報酬: <strong>{yen(dap.activeDap > 0 ? dap.totalReward / dap.activeDap : 0)}</strong>
        </p>
      </section>
    </div>
  )
}
