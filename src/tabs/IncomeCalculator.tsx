import { useState, useMemo } from 'react'
import { useAppContext } from '../context/AppContext'
import { rankCriteria } from '../data/rankCriteria'

export function IncomeCalculator() {
  const { data } = useAppContext()
  const { performerRanks, pointConfig } = data
  const [achieveRate, setAchieveRate] = useState(1.0) // 目標達成率（各ランクの月間維持基準に対する%）
  const [messageRatio, setMessageRatio] = useState(0.6) // 収入のうちメッセージで稼ぐ割合（残りは有料鑑定文字）
  const [isIndividual, setIsIndividual] = useState(true)
  const [maxDailyMessages, setMaxDailyMessages] = useState(300)
  const [maxDailyChars, setMaxDailyChars] = useState(8000)

  const results = useMemo(() => {
    return performerRanks
      // 金額基準のあるランクのみ（プレースホルダー＝ブロンズ/ロイヤルエメラルド/ロイヤルルビー、シルバーは金額基準なしで除外）
      .filter((r) => (rankCriteria[r.stage]?.threshold ?? null) != null)
      .map((rank) => {
        const threshold = rankCriteria[rank.stage]!.threshold as number
        const targetIncome = Math.round(threshold * achieveRate) // このランクで狙う月収

        const msgAction = rank.actions.find((a) => a.type === 'message')         // メッセージ送信(1通)
        const charAction = rank.actions.find((a) => a.type === 'fortune_char')   // 有料鑑定(1文字)

        const incomePerMessage = (msgAction?.performerNormal ?? 0) * pointConfig.normalPtCost
          + (msgAction?.performerBonus ?? 0) * pointConfig.bonusPtCost
        const incomePerChar = (charAction?.performerNormal ?? 0) * pointConfig.normalPtCost
          + (charAction?.performerBonus ?? 0) * pointConfig.bonusPtCost

        const messagesNeeded = incomePerMessage > 0 ? Math.ceil(targetIncome * messageRatio / incomePerMessage) : 0
        const charsNeeded = incomePerChar > 0 ? Math.ceil(targetIncome * (1 - messageRatio) / incomePerChar) : 0
        const dailyMessages = Math.ceil(messagesNeeded / 30)
        const dailyChars = Math.ceil(charsNeeded / 30)

        const withholdRate = isIndividual ? pointConfig.withholdingIndividual : pointConfig.withholdingCorporate
        const netIncome = targetIncome * (1 - withholdRate) - pointConfig.transferFee

        const loadMsg = maxDailyMessages > 0 ? dailyMessages / maxDailyMessages : Infinity
        const loadChar = maxDailyChars > 0 ? dailyChars / maxDailyChars : Infinity
        const load = Math.max(loadMsg, loadChar)

        const feasibility = load <= 0.5 ? '◎ 余裕で達成'
          : load <= 0.8 ? '○ 達成可能'
          : load <= 1.0 ? '△ 高稼働が必要'
          : '✕ 現実的でない'

        return { rank, threshold, targetIncome, messagesNeeded, charsNeeded, dailyMessages, dailyChars, netIncome, feasibility, load }
      })
  }, [achieveRate, messageRatio, isIndividual, maxDailyMessages, maxDailyChars, performerRanks, pointConfig])

  const fmt = (n: number) => `¥${Math.floor(n).toLocaleString()}`

  return (
    <div className="space-y-6 max-w-5xl">
      <h2 className="text-xl font-bold text-gray-800">目標月収逆算シミュレーター</h2>
      <p className="text-sm text-gray-500">
        各ランクの「月間維持基準」を目標月収として、達成に必要な1日あたりのメッセージ通数・有料鑑定文字数を逆算します。
        目標額は維持基準に対する達成率（%）で増減できます。
      </p>

      {/* 入力 */}
      <section className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-700 mb-4">設定</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              目標達成率（維持基準に対する%）: <strong>{(achieveRate * 100).toFixed(0)}%</strong>
            </label>
            <input
              type="range" min={0.5} max={3} step={0.05}
              value={achieveRate}
              onChange={(e) => setAchieveRate(parseFloat(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <p className="text-[10px] text-gray-400 mt-1">100%＝そのランクの月間維持基準ちょうど。150%なら基準の1.5倍を目標。</p>
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
            <p className="text-[10px] text-gray-400 mt-1">収入のうちメッセージ送信で稼ぐ割合（残りは有料鑑定の文字数）。通話は含めません。</p>
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
        <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl">
          <div>
            <label className="block text-sm text-gray-600 mb-1">1日の上限メッセージ数（現実的な稼働）</label>
            <input
              type="number" min={1}
              value={maxDailyMessages}
              onChange={(e) => setMaxDailyMessages(parseInt(e.target.value) || 1)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">1日の上限文字数（有料鑑定）</label>
            <input
              type="number" min={1} step={500}
              value={maxDailyChars}
              onChange={(e) => setMaxDailyChars(parseInt(e.target.value) || 1)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right"
            />
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          ※ 達成見込みは「必要な1日あたり稼働 ÷ 上記の上限」（＝稼働率）で判定します。
        </p>
      </section>

      {/* 結果テーブル */}
      <section className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-indigo-700 text-white text-xs">
              <th className="px-3 py-2 text-left">ランク</th>
              <th className="px-3 py-2 text-right">月間維持基準</th>
              <th className="px-3 py-2 text-right">目標月収</th>
              <th className="px-3 py-2 text-right">必要メッセージ数/月</th>
              <th className="px-3 py-2 text-right">1日あたり通数</th>
              <th className="px-3 py-2 text-right">必要文字数/月</th>
              <th className="px-3 py-2 text-right">1日あたり文字数</th>
              <th className="px-3 py-2 text-right">税引後手取り</th>
              <th className="px-3 py-2 text-right">稼働率</th>
              <th className="px-3 py-2 text-center">達成見込み</th>
            </tr>
          </thead>
          <tbody>
            {results.map(({ rank, threshold, targetIncome, messagesNeeded, charsNeeded, dailyMessages, dailyChars, netIncome, feasibility, load }) => (
              <tr key={rank.stage} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-700" title={rankCriteria[rank.stage]?.note}>{rank.name}</td>
                <td className="px-3 py-2 text-right text-gray-500 tabular-nums">{fmt(threshold)}〜</td>
                <td className="px-3 py-2 text-right font-bold text-gray-800 tabular-nums">{fmt(targetIncome)}</td>
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
                <td className="px-3 py-2 text-right text-green-700 font-bold tabular-nums">{fmt(netIncome)}</td>
                <td className={`px-3 py-2 text-right font-bold tabular-nums ${load > 1 ? 'text-red-600' : load > 0.8 ? 'text-orange-600' : 'text-gray-700'}`}>
                  {isFinite(load) ? `${(load * 100).toFixed(0)}%` : '-'}
                </td>
                <td className="px-3 py-2 text-center text-sm">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    feasibility.startsWith('◎') ? 'bg-green-100 text-green-700'
                    : feasibility.startsWith('○') ? 'bg-yellow-100 text-yellow-700'
                    : feasibility.startsWith('△') ? 'bg-orange-100 text-orange-700'
                    : 'bg-red-100 text-red-700'
                  }`}>
                    {feasibility}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-400 px-4 py-2 leading-relaxed">
          ※ 目標月収 = 各ランクの月間維持基準 × 達成率。手取り = 目標月収 × (1 - 源泉徴収率) - 振込手数料¥{pointConfig.transferFee}。<br />
          ※ 文字数は有料鑑定(1文字)単価で算出。通話は含めません。ブロンズ・シルバー（金額基準なし）・ロイヤルエメラルド・ロイヤルルビー（仕様上のみ）は非表示です。
        </p>
      </section>
    </div>
  )
}
