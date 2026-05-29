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
    </div>
  )
}
