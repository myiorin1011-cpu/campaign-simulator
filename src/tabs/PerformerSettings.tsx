import React from 'react'
import { useAppContext } from '../context/AppContext'
import { EditableCell } from '../components/EditableCell'
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
    </div>
  )
}
