import { useState, useMemo } from 'react'
import { useAppContext } from '../context/AppContext'
import { calcRequiredActivity } from '../utils/calculations'
import type { ActivityPattern } from '../types'

export function IncomeCalculator() {
  const { data } = useAppContext()
  const { performerRanks, pointConfig } = data
  const [targetIncome, setTargetIncome] = useState(200000)
  const [pattern, setPattern] = useState<ActivityPattern>('balanced')
  const [isIndividual, setIsIndividual] = useState(true)

  const results = useMemo(() => {
    return performerRanks
      .filter((r) => r.stage > 1) // Bronzeは除外（全0）
      .map((rank) => {
        const msgAction = rank.actions.find((a) => a.type === 'message')
        const voiceAction = rank.actions.find((a) => a.type === 'voice_call')

        const activity = calcRequiredActivity({
          targetIncome,
          normalPtCost: pointConfig.normalPtCost,
          bonusPtCost: pointConfig.bonusPtCost,
          messageNormalPt: msgAction?.performerNormal ?? 0,
          messageBonusPt: msgAction?.performerBonus ?? 0,
          pattern,
          voiceNormalPt: voiceAction?.performerNormal ?? 0,
          voiceBonusPt: voiceAction?.performerBonus ?? 0,
        })

        // 税引後手取り試算
        const withholdRate = isIndividual ? pointConfig.withholdingIndividual : pointConfig.withholdingCorporate
        const netIncome = targetIncome * (1 - withholdRate) - pointConfig.transferFee

        // 実現性スコア（1日あたり稼働量で判断）
        const feasibility = activity.dailyMessages <= 50 && activity.dailyVoiceMinutes <= 120
          ? '◎ 達成しやすい'
          : activity.dailyMessages <= 150 && activity.dailyVoiceMinutes <= 240
          ? '○ 頑張れば達成可能'
          : '△ 高稼働が必要'

        return { rank, activity, netIncome, feasibility }
      })
  }, [targetIncome, pattern, isIndividual, performerRanks, pointConfig])

  const fmt = (n: number) => `¥${Math.floor(n).toLocaleString()}`

  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-xl font-bold text-gray-800">目標月収逆算シミュレーター</h2>

      {/* 入力 */}
      <section className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-700 mb-4">設定</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              目標月収（税引前）: <strong>{fmt(targetIncome)}</strong>
            </label>
            <input
              type="range" min={10000} max={2000000} step={10000}
              value={targetIncome}
              onChange={(e) => setTargetIncome(parseInt(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">稼働パターン</label>
            <select
              value={pattern}
              onChange={(e) => setPattern(e.target.value as ActivityPattern)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="balanced">バランス型（メッセ60%/通話25%/他15%）</option>
              <option value="message">メッセージ中心（メッセ90%/通話5%）</option>
              <option value="call">通話中心（メッセ20%/通話70%）</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">源泉徴収区分</label>
            <div className="flex gap-3 mt-2">
              <label className="flex items-center gap-1 text-sm cursor-pointer">
                <input type="radio" checked={isIndividual} onChange={() => setIsIndividual(true)} />
                個人（{(pointConfig.withholdingIndividual * 100).toFixed(2)}%）
              </label>
              <label className="flex items-center gap-1 text-sm cursor-pointer">
                <input type="radio" checked={!isIndividual} onChange={() => setIsIndividual(false)} />
                法人（0%）
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* 結果テーブル */}
      <section className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-indigo-700 text-white text-xs">
              <th className="px-3 py-2 text-left">ランク</th>
              <th className="px-3 py-2 text-right">必要メッセージ数/月</th>
              <th className="px-3 py-2 text-right">1日あたり</th>
              <th className="px-3 py-2 text-right">必要通話時間/月</th>
              <th className="px-3 py-2 text-right">1日あたり</th>
              <th className="px-3 py-2 text-right">税引後手取り</th>
              <th className="px-3 py-2 text-center">達成見込み</th>
            </tr>
          </thead>
          <tbody>
            {results.map(({ rank, activity, netIncome, feasibility }) => (
              <tr key={rank.stage} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-700">{rank.name}</td>
                <td className="px-3 py-2 text-right font-mono">
                  {activity.messagesNeeded > 0 ? `${activity.messagesNeeded.toLocaleString()}通` : '-'}
                </td>
                <td className="px-3 py-2 text-right text-indigo-600 font-bold">
                  {activity.dailyMessages > 0 ? `${activity.dailyMessages}通/日` : '-'}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {activity.voiceMinutesNeeded > 0 ? `${activity.voiceMinutesNeeded.toLocaleString()}分` : '-'}
                </td>
                <td className="px-3 py-2 text-right text-purple-600 font-bold">
                  {activity.dailyVoiceMinutes > 0 ? `${activity.dailyVoiceMinutes}分/日` : '-'}
                </td>
                <td className="px-3 py-2 text-right text-green-700 font-bold">
                  {fmt(netIncome)}
                </td>
                <td className="px-3 py-2 text-center text-sm">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    feasibility.startsWith('◎') ? 'bg-green-100 text-green-700'
                    : feasibility.startsWith('○') ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-orange-100 text-orange-700'
                  }`}>
                    {feasibility}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-400 px-4 py-2">
          ※ 手取り = 目標月収 × (1 - 源泉徴収率) - 振込手数料¥{pointConfig.transferFee}
        </p>
      </section>
    </div>
  )
}
