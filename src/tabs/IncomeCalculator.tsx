import { useState, useMemo } from 'react'
import { useAppContext } from '../context/AppContext'

export function IncomeCalculator() {
  const { data } = useAppContext()
  const { performerRanks, pointConfig } = data
  const [targetIncome, setTargetIncome] = useState(200000)
  const [messageRatio, setMessageRatio] = useState(0.6) // 収入のうちメッセージで稼ぐ割合（残りは有料鑑定文字）
  const [isIndividual, setIsIndividual] = useState(true)

  const results = useMemo(() => {
    return performerRanks
      .filter((r) => r.stage > 1) // Bronzeは除外（全0）
      .map((rank) => {
        const msgAction = rank.actions.find((a) => a.type === 'message')         // メッセージ送信(1通)
        const charAction = rank.actions.find((a) => a.type === 'fortune_char')   // 有料鑑定(1文字)

        // 1通・1文字あたりの報酬額（通常pt原価 + ボーナスpt原価）
        const incomePerMessage = (msgAction?.performerNormal ?? 0) * pointConfig.normalPtCost
          + (msgAction?.performerBonus ?? 0) * pointConfig.bonusPtCost
        const incomePerChar = (charAction?.performerNormal ?? 0) * pointConfig.normalPtCost
          + (charAction?.performerBonus ?? 0) * pointConfig.bonusPtCost

        const incomeFromMessage = targetIncome * messageRatio
        const incomeFromChar = targetIncome * (1 - messageRatio)

        const messagesNeeded = incomePerMessage > 0 ? Math.ceil(incomeFromMessage / incomePerMessage) : 0
        const charsNeeded = incomePerChar > 0 ? Math.ceil(incomeFromChar / incomePerChar) : 0
        const dailyMessages = Math.ceil(messagesNeeded / 30)
        const dailyChars = Math.ceil(charsNeeded / 30)

        const withholdRate = isIndividual ? pointConfig.withholdingIndividual : pointConfig.withholdingCorporate
        const netIncome = targetIncome * (1 - withholdRate) - pointConfig.transferFee

        // 実現性（1日あたり: メッセージ通数・有料鑑定文字数で判断）
        const feasibility = dailyMessages <= 200 && dailyChars <= 4000
          ? '◎ 達成しやすい'
          : dailyMessages <= 500 && dailyChars <= 10000
          ? '○ 頑張れば達成可能'
          : '△ 高稼働が必要'

        return { rank, messagesNeeded, charsNeeded, dailyMessages, dailyChars, netIncome, feasibility }
      })
  }, [targetIncome, messageRatio, isIndividual, performerRanks, pointConfig])

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
            <label className="block text-sm text-gray-600 mb-1">
              メッセージ:有料鑑定 配分 <strong>{(messageRatio * 100).toFixed(0)}% : {((1 - messageRatio) * 100).toFixed(0)}%</strong>
            </label>
            <input
              type="range" min={0} max={1} step={0.05}
              value={messageRatio}
              onChange={(e) => setMessageRatio(parseFloat(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <p className="text-[10px] text-gray-400 mt-1">収入のうちメッセージ送信で稼ぐ割合（残りは有料鑑定の文字数）。通話は計算に含めません。</p>
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
              <th className="px-3 py-2 text-right">1日あたり通数</th>
              <th className="px-3 py-2 text-right">必要文字数/月</th>
              <th className="px-3 py-2 text-right">1日あたり文字数</th>
              <th className="px-3 py-2 text-right">税引後手取り</th>
              <th className="px-3 py-2 text-center">達成見込み</th>
            </tr>
          </thead>
          <tbody>
            {results.map(({ rank, messagesNeeded, charsNeeded, dailyMessages, dailyChars, netIncome, feasibility }) => (
              <tr key={rank.stage} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-700">{rank.name}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {messagesNeeded > 0 ? `${messagesNeeded.toLocaleString()} 通` : '-'}
                </td>
                <td className="px-3 py-2 text-right text-indigo-600 font-bold tabular-nums">
                  {dailyMessages > 0 ? `${dailyMessages.toLocaleString()} 通/日` : '-'}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {charsNeeded > 0 ? `${charsNeeded.toLocaleString()} 字` : '-'}
                </td>
                <td className="px-3 py-2 text-right text-purple-600 font-bold tabular-nums">
                  {dailyChars > 0 ? `${dailyChars.toLocaleString()} 字/日` : '-'}
                </td>
                <td className="px-3 py-2 text-right text-green-700 font-bold tabular-nums">
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
          ※ 手取り = 目標月収 × (1 - 源泉徴収率) - 振込手数料¥{pointConfig.transferFee}／ 文字数は有料鑑定(1文字)単価で算出。通話は含めません。
        </p>
      </section>
    </div>
  )
}
