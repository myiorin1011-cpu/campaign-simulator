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

export function PointSettings() {
  const { data, updatePointConfig, updatePurchasePlans, updatePaymentOrder } = useAppContext()
  const { pointConfig, purchasePlans, paymentOrder } = data

  const movePayment = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= paymentOrder.length) return
    const next = [...paymentOrder]
    ;[next[index], next[target]] = [next[target], next[index]]
    updatePaymentOrder(next)
  }

  // 還元率 = 合計付与PT（通常＝通常pt＋通常ボーナス）× User販売単価(¥2) ÷ 販売価格(税込)
  const calcReturnRate = (plan: PurchasePlan) => {
    const totalPt = plan.normalPt + plan.bonusPt
    return plan.priceWithTax > 0
      ? ((totalPt * pointConfig.userPtRate / plan.priceWithTax) * 100).toFixed(1) + '%'
      : '-'
  }

  // 粗利率 = (税込価格 − 税込価格×消費税率 − 通常pt×0.67 − (通常ボーナス+初回ボーナス)×0.22) ÷ 税込価格
  // ※スプレッドシートのO11式に準拠
  const calcGrossMargin = (plan: PurchasePlan) => {
    const tax = plan.priceWithTax * pointConfig.taxRate
    const rewardCost =
      plan.normalPt * pointConfig.normalPtCost +
      (plan.bonusPt + plan.firstTimeBonusPt) * pointConfig.bonusPtCost
    const grossProfit = plan.priceWithTax - tax - rewardCost
    return plan.priceWithTax > 0
      ? ((grossProfit / plan.priceWithTax) * 100).toFixed(1) + '%'
      : '-'
  }

  const updatePlan = (payment: PaymentMethod, index: number, field: keyof PurchasePlan, value: number) => {
    const plans = [...purchasePlans[payment]]
    plans[index] = { ...plans[index], [field]: value }
    updatePurchasePlans(payment, plans)
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <h2 className="text-xl font-bold text-gray-800">ポイント基本設定</h2>

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
      {paymentOrder.map((payment, orderIdx) => (
        <section key={payment} className="bg-white rounded-lg shadow p-6 overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">
              <span className="text-gray-400 mr-2">{orderIdx + 1}.</span>{PAYMENT_LABELS[payment]} 購入プラン
            </h3>
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
                <th className="px-3 py-2 text-right">還元率</th>
                <th className="px-3 py-2 text-right">粗利率</th>
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
                  <td className="px-3 py-2 text-right text-blue-600 font-medium">{calcReturnRate(plan)}</td>
                  <td className="px-3 py-2 text-right text-green-600 font-medium">{calcGrossMargin(plan)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      {/* 決済種別コスト比較表 */}
      <section className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-700 mb-4">決済種別コスト比較</h3>
        <p className="text-xs text-gray-400 mb-4">※ Apple/Googleのストア手数料は10%で計算。銀行振込・Credix・Amazon Payは非ストア決済のため手数料0%。</p>
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
                  { method: '銀行振込', rate: 0, plans: purchasePlans.bank },
                  { method: 'Credix決済', rate: 0, plans: purchasePlans.credix },
                  { method: 'Amazon Pay', rate: 0, plans: purchasePlans.amazonpay },
                  { method: 'Apple', rate: 0.10, plans: purchasePlans.apple },
                  { method: 'Google', rate: 0.10, plans: purchasePlans.google },
                ] as { method: string; rate: number; plans: typeof purchasePlans.bank }[]
              ).map(({ method, rate, plans }) => {
                // 代表プランとして中間のものを使用
                const plan = plans[Math.floor(plans.length / 2)]
                if (!plan) return null
                // 税込価格を基準に消費税・ストア手数料・報酬原価を控除（粗利率の定義と統一）
                const tax = plan.priceWithTax * pointConfig.taxRate
                const storeFee = plan.priceWithTax * rate
                const afterFee = plan.priceWithTax - storeFee
                const rewardCost =
                  plan.normalPt * pointConfig.normalPtCost +
                  (plan.bonusPt + plan.firstTimeBonusPt) * pointConfig.bonusPtCost
                const grossProfit = plan.priceWithTax - tax - storeFee - rewardCost
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
    </div>
  )
}
