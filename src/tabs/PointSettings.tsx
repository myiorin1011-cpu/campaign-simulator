import { useAppContext } from '../context/AppContext'
import { EditableCell } from '../components/EditableCell'
import type { PaymentMethod, PurchasePlan } from '../types'

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  bank: '銀行振込',
  apple: 'Apple',
  google: 'Google',
}

export function PointSettings() {
  const { data, updatePointConfig, updatePurchasePlans } = useAppContext()
  const { pointConfig, purchasePlans } = data

  const calcReturnRate = (plan: PurchasePlan) => {
    const totalPt = plan.normalPt + plan.bonusPt + plan.firstTimeBonusPt
    return plan.priceWithoutTax > 0
      ? ((totalPt / plan.priceWithoutTax) * 100).toFixed(1) + '%'
      : '-'
  }

  const calcGrossMargin = (plan: PurchasePlan) => {
    const rewardCost = plan.normalPt * pointConfig.normalPtCost + plan.bonusPt * pointConfig.bonusPtCost
    return plan.priceWithoutTax > 0
      ? (((plan.priceWithoutTax - rewardCost) / plan.priceWithoutTax) * 100).toFixed(1) + '%'
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

      {/* 決済別購入プラン */}
      {(Object.keys(purchasePlans) as PaymentMethod[]).map((payment) => (
        <section key={payment} className="bg-white rounded-lg shadow p-6 overflow-x-auto">
          <h3 className="font-semibold text-gray-700 mb-4">{PAYMENT_LABELS[payment]} 購入プラン</h3>
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
        <p className="text-xs text-gray-400 mb-4">※ ストア手数料率は業界標準値（Apple/Google: 30%、銀行振込: 0%）。実際の契約によって異なります。</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="px-3 py-2 text-left">決済方法</th>
                <th className="px-3 py-2 text-right">ストア手数料率</th>
                <th className="px-3 py-2 text-right">代表プランの売上</th>
                <th className="px-3 py-2 text-right">手数料コスト</th>
                <th className="px-3 py-2 text-right">手数料差引後</th>
                <th className="px-3 py-2 text-right">実質粗利率</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  { method: '銀行振込', rate: 0, plans: purchasePlans.bank },
                  { method: 'Apple', rate: 0.30, plans: purchasePlans.apple },
                  { method: 'Google', rate: 0.30, plans: purchasePlans.google },
                ] as { method: string; rate: number; plans: typeof purchasePlans.bank }[]
              ).map(({ method, rate, plans }) => {
                // 代表プランとして中間のものを使用
                const plan = plans[Math.floor(plans.length / 2)]
                if (!plan) return null
                const storeFee = plan.priceWithoutTax * rate
                const afterFee = plan.priceWithoutTax - storeFee
                const rewardCost = plan.normalPt * pointConfig.normalPtCost + plan.bonusPt * pointConfig.bonusPtCost
                const grossMargin = afterFee > 0 ? ((afterFee - rewardCost) / afterFee * 100).toFixed(1) : '-'
                return (
                  <tr key={method} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-700">{method}</td>
                    <td className="px-3 py-2 text-right text-orange-600">{(rate * 100).toFixed(0)}%</td>
                    <td className="px-3 py-2 text-right">¥{plan.priceWithoutTax.toLocaleString()}</td>
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
          💡 Apple/Google のストア決済は手数料30%が差し引かれるため、同じ販売価格でも実質粗利率が銀行振込より約{(0.30 * (1 - pointConfig.normalPtCost * 0.5) * 100).toFixed(0)}%程度低下します。
        </div>
      </section>
    </div>
  )
}
