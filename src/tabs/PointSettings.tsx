import { useState, useMemo } from 'react'
import { calcBonusPtEqualizationLoss } from '../utils/calculations'
import { useAppContext } from '../context/AppContext'
import { EditableCell } from '../components/EditableCell'
import type { PaymentMethod, PurchasePlan } from '../types'

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  bank: '銀行振込',
  credix: 'Credix決済',
  amazonpay: 'Amazon Pay',
  apple: 'Apple',
  google: 'Google',
}

const SCENARIOS = [
  { field: 'purchasePlans' as const, label: '基本設定' },
  { field: 'purchasePlans1' as const, label: 'キャンペーン設定1' },
  { field: 'purchasePlans2' as const, label: 'キャンペーン設定2' },
]
type PlansField = typeof SCENARIOS[number]['field']

export function PointSettings() {
  const { data, updatePointConfig, updatePlansScenario, updatePaymentOrder } = useAppContext()
  const { pointConfig, paymentOrder } = data
  const [scenario, setScenario] = useState<PlansField>('purchasePlans')
  const purchasePlans = data[scenario]

  const [eqSales, setEqSales] = useState(3200000)

  const eqResult = useMemo(
    () => calcBonusPtEqualizationLoss(eqSales, pointConfig, purchasePlans),
    [eqSales, pointConfig, purchasePlans],
  )

  const fmt = (n: number) => n.toLocaleString('ja-JP')
  const pct = (r: number) => (r * 100).toFixed(1) + '%'

  const movePayment = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= paymentOrder.length) return
    const next = [...paymentOrder]
    ;[next[index], next[target]] = [next[target], next[index]]
    updatePaymentOrder(next)
  }

  const pctOf = (value: number, base: number) => (base > 0 ? (value / base * 100).toFixed(1) + '%' : '-')

  // 還元率 = 付与PT × User販売単価(¥2) ÷ 販売価格(税込)
  //   通常：通常pt＋通常ボーナス ／ 初回：＋初回特典PT
  const calcReturnRate = (plan: PurchasePlan, withFirst = false) => {
    const totalPt = plan.normalPt + plan.bonusPt + (withFirst ? plan.firstTimeBonusPt : 0)
    return pctOf(totalPt * pointConfig.userPtRate, plan.priceWithTax)
  }

  // 粗利率 = (税込 − 税込×決済手数料率 − 通常pt×0.67 − ボーナス×0.22) ÷ 税込
  //   ※スプレッドシートの式に準拠。控除するのは決済手数料率のみ（消費税は別途控除しない）
  //   通常：通常ボーナスのみ ／ 初回：通常ボーナス＋初回特典PT
  const calcGrossMargin = (plan: PurchasePlan, withFirst = false) => {
    const fee = plan.priceWithTax * (plan.storeFeeRate ?? 0)
    const bonusPt = plan.bonusPt + (withFirst ? plan.firstTimeBonusPt : 0)
    const rewardCost = plan.normalPt * pointConfig.normalPtCost + bonusPt * pointConfig.bonusPtCost
    return pctOf(plan.priceWithTax - fee - rewardCost, plan.priceWithTax)
  }

  const updatePlan = (payment: PaymentMethod, index: number, field: keyof PurchasePlan, value: number) => {
    const plans = [...purchasePlans[payment]]
    plans[index] = { ...plans[index], [field]: value }
    updatePlansScenario(scenario, payment, plans)
  }

  // 決済種別ごとに全プランの手数料率を一括設定（％入力 → 0〜1で保存）
  const updatePaymentFee = (payment: PaymentMethod, ratePercent: number) => {
    const rate = ratePercent / 100
    const plans = purchasePlans[payment].map((p) => ({ ...p, storeFeeRate: rate }))
    updatePlansScenario(scenario, payment, plans)
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <h2 className="text-xl font-bold text-gray-800">ポイント設定</h2>

      {/* シナリオ切り替えタブ */}
      <div className="flex gap-1 border-b border-gray-200">
        {SCENARIOS.map((s) => (
          <button
            key={s.field}
            onClick={() => setScenario(s.field)}
            className={`px-4 py-2 text-sm -mb-px border-b-2 ${
              scenario === s.field
                ? 'border-gray-900 text-gray-900 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* 基本単価 */}
      <section className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-700 mb-4">基本単価・手数料</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            { label: 'Userポイント販売単価 (¥/pt)', field: 'userPtRate' as const },
            { label: 'Performerポイント表面単価 (¥/pt)', field: 'performerPtRate' as const },
            { label: '通常pt報酬原価 (¥/pt)', field: 'normalPtCost' as const },
            { label: 'ボーナスpt報酬原価 (¥/pt)', field: 'bonusPtCost' as const },
            { label: '消費税率', field: 'taxRate' as const },
            { label: '源泉徴収率（個人）', field: 'withholdingIndividual' as const },
            { label: '源泉徴収率（法人）', field: 'withholdingCorporate' as const },
            { label: '振込手数料 (¥)', field: 'transferFee' as const },
            { label: '最低精算ポイント (pt)', field: 'minSettlementPt' as const },
          ].map(({ label, field }) => (
            <div key={field} className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">{label}</span>
              <EditableCell
                value={pointConfig[field]}
                onChange={(v) => updatePointConfig({ [field]: v })}
                className="text-right font-mono"
              />
            </div>
          ))}
        </div>
      </section>

      {/* 決済別購入プラン（並び替え可能） */}
      {paymentOrder.map((payment, orderIdx) => {
        const hasFirst = purchasePlans[payment].some((p) => p.firstTimeBonusPt > 0)
        // 2回目・3回目特典PTはCredixのみ対象
        const hasMulti = payment === 'credix'
        return (
        <section key={payment} className="bg-white rounded-lg shadow p-6 overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-700">
                <span className="text-gray-400 mr-2">{orderIdx + 1}.</span>{PAYMENT_LABELS[payment]} 購入プラン
              </h3>
              <label className="flex items-center gap-1 text-xs text-gray-500 bg-orange-50 border border-orange-200 rounded px-2 py-1">
                手数料率
                <input
                  type="number" min={0} max={100} step={0.1}
                  value={Math.round((purchasePlans[payment][0]?.storeFeeRate ?? 0) * 1000) / 10}
                  onChange={(e) => updatePaymentFee(payment, parseFloat(e.target.value) || 0)}
                  className="w-16 border border-gray-300 rounded px-1 py-0.5 text-right text-sm text-orange-600 font-medium"
                />
                <span className="text-orange-600">%</span>
              </label>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => movePayment(orderIdx, -1)}
                disabled={orderIdx === 0}
                className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                title="上へ移動"
              >▲ 上へ</button>
              <button
                onClick={() => movePayment(orderIdx, 1)}
                disabled={orderIdx === paymentOrder.length - 1}
                className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                title="下へ移動"
              >▼ 下へ</button>
            </div>
          </div>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="px-3 py-2 text-left">No</th>
                <th className="px-3 py-2 text-right">販売価格(税込)</th>
                <th className="px-3 py-2 text-right">本体価格</th>
                <th className="px-3 py-2 text-right">通常PT</th>
                <th className="px-3 py-2 text-right">ボーナスPT</th>
                <th className="px-3 py-2 text-right">初回特典PT</th>
                {hasMulti && <th className="px-3 py-2 text-right">2回目特典PT</th>}
                {hasMulti && <th className="px-3 py-2 text-right">3回目特典PT</th>}
                <th className="px-3 py-2 text-right bg-indigo-50">合計付与PT(通常)</th>
                <th className="px-3 py-2 text-right bg-indigo-50">合計付与PT(初回)</th>
                {hasMulti && <th className="px-3 py-2 text-right bg-indigo-50">合計付与PT(2回目)</th>}
                {hasMulti && <th className="px-3 py-2 text-right bg-indigo-50">合計付与PT(3回目)</th>}
                <th className="px-3 py-2 text-right">還元率</th>
                <th className="px-3 py-2 text-right">粗利率</th>
                {hasFirst && <th className="px-3 py-2 text-right bg-pink-50">還元率(初回)</th>}
                {hasFirst && <th className="px-3 py-2 text-right bg-pink-50">粗利率(初回)</th>}
              </tr>
            </thead>
            <tbody>
              {purchasePlans[payment].map((plan, i) => (
                <tr key={plan.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2">{plan.id}</td>
                  <td className="px-3 py-2 text-right">
                    <EditableCell value={plan.priceWithTax} prefix="¥" onChange={(v) => updatePlan(payment, i, 'priceWithTax', v)} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <EditableCell value={plan.priceWithoutTax} prefix="¥" onChange={(v) => updatePlan(payment, i, 'priceWithoutTax', v)} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <EditableCell value={plan.normalPt} suffix="pt" onChange={(v) => updatePlan(payment, i, 'normalPt', v)} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <EditableCell value={plan.bonusPt} suffix="pt" onChange={(v) => updatePlan(payment, i, 'bonusPt', v)} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <EditableCell value={plan.firstTimeBonusPt} suffix="pt" onChange={(v) => updatePlan(payment, i, 'firstTimeBonusPt', v)} />
                  </td>
                  {hasMulti && (
                    <td className="px-3 py-2 text-right">
                      <EditableCell value={plan.secondTimeBonusPt} suffix="pt" onChange={(v) => updatePlan(payment, i, 'secondTimeBonusPt', v)} />
                    </td>
                  )}
                  {hasMulti && (
                    <td className="px-3 py-2 text-right">
                      <EditableCell value={plan.thirdTimeBonusPt} suffix="pt" onChange={(v) => updatePlan(payment, i, 'thirdTimeBonusPt', v)} />
                    </td>
                  )}
                  <td className="px-3 py-2 text-right bg-indigo-50/40 text-gray-700 tabular-nums">{(plan.normalPt + plan.bonusPt).toLocaleString()} pt</td>
                  <td className="px-3 py-2 text-right bg-indigo-50/40 text-gray-700 tabular-nums">{(plan.normalPt + plan.bonusPt + plan.firstTimeBonusPt).toLocaleString()} pt</td>
                  {hasMulti && <td className="px-3 py-2 text-right bg-indigo-50/40 text-gray-700 tabular-nums">{(plan.normalPt + plan.bonusPt + plan.secondTimeBonusPt).toLocaleString()} pt</td>}
                  {hasMulti && <td className="px-3 py-2 text-right bg-indigo-50/40 text-gray-700 tabular-nums">{(plan.normalPt + plan.bonusPt + plan.thirdTimeBonusPt).toLocaleString()} pt</td>}
                  <td className="px-3 py-2 text-right text-blue-600 font-medium">{calcReturnRate(plan)}</td>
                  <td className="px-3 py-2 text-right text-green-600 font-medium">{calcGrossMargin(plan)}</td>
                  {hasFirst && <td className="px-3 py-2 text-right text-pink-600 font-medium bg-pink-50/40">{calcReturnRate(plan, true)}</td>}
                  {hasFirst && <td className="px-3 py-2 text-right text-pink-700 font-medium bg-pink-50/40">{calcGrossMargin(plan, true)}</td>}
                </tr>
              ))}
            </tbody>
          </table>

          {/* 計算式の注記 */}
          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded text-[11px] text-gray-600 leading-relaxed">
            <p className="font-semibold text-gray-700 mb-1">📐 計算式（{PAYMENT_LABELS[payment]}：手数料率 {Math.round((purchasePlans[payment][0]?.storeFeeRate ?? 0) * 1000) / 10}%）</p>
            <p>
              <span className="text-blue-600 font-medium">還元率</span> ＝（通常PT ＋ ボーナスPT{hasFirst && '〔初回は＋初回特典PT〕'}）× User販売単価(¥{pointConfig.userPtRate}) ÷ 販売価格(税込)
            </p>
            <p>
              <span className="text-green-600 font-medium">粗利率</span> ＝（販売価格(税込) − 販売価格×手数料率 − 通常PT×¥{pointConfig.normalPtCost} − ボーナスPT{hasFirst && '〔初回は＋初回特典PT〕'}×¥{pointConfig.bonusPtCost}）÷ 販売価格(税込)
            </p>
            <p className="text-gray-400 mt-1">
              ※ 通常PT原価¥{pointConfig.normalPtCost}・ボーナスPT原価¥{pointConfig.bonusPtCost}・User販売単価¥{pointConfig.userPtRate} は上部「基本単価・手数料」で変更可。消費税は粗利率の控除に含めません。
            </p>
          </div>
        </section>
        )
      })}

      {/* 決済種別コスト比較表 */}
      <section className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-700 mb-4">決済種別コスト比較</h3>
        <p className="text-xs text-gray-400 mb-4">※ 手数料率は各「購入プラン」見出し横で決済種別ごとに設定できます（初期値: 銀行振込0% / Credix4% / Amazon Pay3.9% / Apple・Google10%）。</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="px-3 py-2 text-left">決済方法</th>
                <th className="px-3 py-2 text-right">ストア手数料率</th>
                <th className="px-3 py-2 text-right">代表プランの売上(税込)</th>
                <th className="px-3 py-2 text-right">手数料コスト</th>
                <th className="px-3 py-2 text-right">手数料差引後</th>
                <th className="px-3 py-2 text-right">実質粗利率</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  { method: '銀行振込', plans: purchasePlans.bank },
                  { method: 'Credix決済', plans: purchasePlans.credix },
                  { method: 'Amazon Pay', plans: purchasePlans.amazonpay },
                  { method: 'Apple', plans: purchasePlans.apple },
                  { method: 'Google', plans: purchasePlans.google },
                ] as { method: string; plans: typeof purchasePlans.bank }[]
              ).map(({ method, plans }) => {
                // 代表プランとして全決済共通の¥11,000プランを使用（無ければ中間）
                const plan = plans.find((p) => p.priceWithTax === 11000) ?? plans[Math.floor(plans.length / 2)]
                if (!plan) return null
                const rate = plan.storeFeeRate ?? 0
                // 粗利率の定義と統一：控除は決済手数料率のみ（通常ボーナス基準）
                const storeFee = plan.priceWithTax * rate
                const afterFee = plan.priceWithTax - storeFee
                const rewardCost =
                  plan.normalPt * pointConfig.normalPtCost +
                  plan.bonusPt * pointConfig.bonusPtCost
                const grossProfit = plan.priceWithTax - storeFee - rewardCost
                const grossMargin = plan.priceWithTax > 0 ? (grossProfit / plan.priceWithTax * 100).toFixed(1) : '-'
                return (
                  <tr key={method} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-700">{method}</td>
                    <td className="px-3 py-2 text-right text-orange-600">{(rate * 100).toFixed(0)}%</td>
                    <td className="px-3 py-2 text-right">¥{plan.priceWithTax.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-red-500">
                      {rate > 0 ? `▲¥${Math.floor(storeFee).toLocaleString()}` : '-'}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">¥{Math.floor(afterFee).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-green-600 font-bold">{grossMargin}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 p-3 bg-amber-50 rounded text-xs text-amber-700">
          💡 Apple/Google のストア決済は手数料10%が差し引かれるため、同じ販売価格でも実質粗利率が銀行振込・Credix・Amazon Payより低下します。非ストア決済（銀行振込/Credix/Amazon Pay）への誘導が粗利改善に有効です。
        </div>
      </section>

        {/* 均等化シミュレーター */}
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            🔄 通常PT = ボーナスPT 均等化シミュレーター
          </h3>
          <div className="flex items-center gap-2 mb-4">
            <label className="text-xs text-gray-600 whitespace-nowrap">想定売上</label>
            <span className="text-xs text-gray-500">¥</span>
            <input
              type="number"
              value={eqSales}
              onChange={(e) => setEqSales(Number(e.target.value))}
              className="border border-gray-200 rounded px-2 py-1 text-sm w-36 text-right"
              step={100000}
            />
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b">
                <th className="text-left py-1 font-medium w-40"></th>
                <th className="text-right py-1 font-medium">現在設定</th>
                <th className="text-right py-1 font-medium">均等化した場合</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-1.5 text-gray-600">通常PT原価</td>
                <td className="py-1.5 text-right">¥{pointConfig.normalPtCost.toFixed(2)}/pt</td>
                <td className="py-1.5 text-right">¥{pointConfig.normalPtCost.toFixed(2)}/pt</td>
              </tr>
              <tr>
                <td className="py-1.5 text-gray-600">ボーナスPT原価</td>
                <td className="py-1.5 text-right">¥{pointConfig.bonusPtCost.toFixed(2)}/pt</td>
                <td className="py-1.5 text-right font-semibold text-orange-600">
                  ¥{pointConfig.normalPtCost.toFixed(2)}/pt（↑均等化）
                </td>
              </tr>
              <tr>
                <td className="py-1.5 text-gray-600">パフォーマー報酬</td>
                <td className="py-1.5 text-right">¥{fmt(eqResult.currentCost)}</td>
                <td className="py-1.5 text-right text-orange-600">¥{fmt(eqResult.equalizedCost)}</td>
              </tr>
              <tr>
                <td className="py-1.5 text-gray-600">原価増加額</td>
                <td className="py-1.5 text-right text-gray-400">—</td>
                <td className="py-1.5 text-right font-semibold text-red-600">
                  {eqResult.lossDiff > 0 ? `+¥${fmt(eqResult.lossDiff)}` : '±0'}
                </td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="py-1.5 text-gray-600">粗利率</td>
                <td className="py-1.5 text-right font-semibold text-green-700">
                  {pct(eqResult.currentGrossMarginRate)}
                </td>
                <td className="py-1.5 text-right font-semibold text-orange-600">
                  {pct(eqResult.equalizedGrossMarginRate)}
                  <span className="ml-1 text-red-500 text-xs">
                    ({eqResult.currentGrossMarginRate > eqResult.equalizedGrossMarginRate ? '-' : '+'}
                    {Math.abs((eqResult.currentGrossMarginRate - eqResult.equalizedGrossMarginRate) * 100).toFixed(1)}pt)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
    </div>
  )
}
