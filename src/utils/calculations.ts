// src/utils/calculations.ts
import type { PointConfig, PurchasePlan, PaymentMethod, Campaign } from '../types'

/** 通常PT + ボーナスPT の合計 */
export function calcTotalPt(normalPt: number, bonusPt: number): number {
  return normalPt + bonusPt
}

/**
 * N月目の残存ユーザー数
 * month=1 が初月（全員在籍）
 */
export function calcRetentionRate(
  initialUsers: number,
  retentionRate: number,
  month: number,
): number {
  if (month <= 1) return initialUsers
  return initialUsers * Math.pow(retentionRate, month - 1)
}

/**
 * パフォーマー報酬額（税引き前）
 */
export function calcPerformerIncome(
  normalPt: number,
  bonusPt: number,
  normalPtCost: number,
  bonusPtCost: number,
): number {
  return normalPt * normalPtCost + bonusPt * bonusPtCost
}

/**
 * 月間KPI計算
 */
export function calcMonthlyKPI(params: {
  adBudget: number
  cpi: number
  conversionRate: number
  arppu: number
}): { installs: number; payingUsers: number; sales: number } {
  const installs = params.cpi > 0 ? Math.floor(params.adBudget / params.cpi) : 0
  const payingUsers = Math.floor(installs * params.conversionRate)
  const sales = payingUsers * params.arppu
  return { installs, payingUsers, sales }
}

/**
 * 代理店回収率計算
 */
export function calcAgencyROI(months: {
  month: number
  adBudget: number
  applications: number
  debuts: number
  sales: number
}[]): {
  cumulativeROI: number
  debutCpa: number
  cumulativeAdBudget: number
  cumulativeSales: number
  cumulativeDebuts: number
} {
  const cumulativeAdBudget = months.reduce((s, m) => s + m.adBudget, 0)
  const cumulativeSales = months.reduce((s, m) => s + m.sales, 0)
  const cumulativeDebuts = months.reduce((s, m) => s + m.debuts, 0)
  const cumulativeROI = cumulativeAdBudget > 0 ? cumulativeSales / cumulativeAdBudget : 0
  const debutCpa = cumulativeDebuts > 0
    ? Math.floor(cumulativeAdBudget / cumulativeDebuts)
    : 0
  return { cumulativeROI, debutCpa, cumulativeAdBudget, cumulativeSales, cumulativeDebuts }
}

/**
 * 目標月収逆算: 必要稼働量を計算
 */
export function calcRequiredActivity(params: {
  targetIncome: number
  normalPtCost: number
  bonusPtCost: number
  messageNormalPt: number
  messageBonusPt: number
  pattern: 'message' | 'call' | 'balanced'
  voiceNormalPt?: number
  voiceBonusPt?: number
}): { messagesNeeded: number; voiceMinutesNeeded: number; dailyMessages: number; dailyVoiceMinutes: number } {
  const { targetIncome, normalPtCost, bonusPtCost, messageNormalPt, messageBonusPt, pattern } = params
  const voiceNormalPt = params.voiceNormalPt ?? 0
  const voiceBonusPt = params.voiceBonusPt ?? 0

  const incomePerMessage = messageNormalPt * normalPtCost + messageBonusPt * bonusPtCost
  const incomePerVoiceMin = voiceNormalPt * normalPtCost + voiceBonusPt * bonusPtCost

  let messageRatio = 0.6
  let voiceRatio = 0.25
  if (pattern === 'message') { messageRatio = 0.9; voiceRatio = 0.05 }
  if (pattern === 'call')    { messageRatio = 0.2; voiceRatio = 0.7 }

  const incomeFromMessage = targetIncome * messageRatio
  const incomeFromVoice   = targetIncome * voiceRatio

  const messagesNeeded = incomePerMessage > 0 ? Math.ceil(incomeFromMessage / incomePerMessage) : 0
  const voiceMinutesNeeded = incomePerVoiceMin > 0 ? Math.ceil(incomeFromVoice / incomePerVoiceMin) : 0

  return {
    messagesNeeded,
    voiceMinutesNeeded,
    dailyMessages: Math.ceil(messagesNeeded / 30),
    dailyVoiceMinutes: Math.ceil(voiceMinutesNeeded / 30),
  }
}

/**
 * LTV（顧客生涯価値）
 * LTV = ARPPU ÷ (1 - 継続率)
 */
export function calcLTV(arppu: number, retentionRate: number): number {
  if (retentionRate >= 1) return arppu * 120 // 上限10年
  return arppu / (1 - retentionRate)
}

/**
 * CPAペイバック期間（月数）
 * ペイバック = CPI ÷ (ARPPU × 課金率 × 粗利率)
 */
export function calcPaybackMonths(
  cpi: number,
  arppu: number,
  conversionRate: number,
  grossMarginRate: number,
): number {
  const monthlyGrossProfit = arppu * conversionRate * grossMarginRate
  if (monthlyGrossProfit <= 0) return 999
  return cpi / monthlyGrossProfit
}

/**
 * ストア手数料コスト
 */
export function calcStoreFee(sales: number, storeRate: number): number {
  return sales * storeRate
}

/**
 * 有料開封率
 */
export function calcPaidOpenRate(paidMessages: number, totalMessages: number): number {
  if (totalMessages <= 0) return 0
  return paidMessages / totalMessages
}

/**
 * DAP報酬分布・稼働率
 */
export function calcDapDistribution(params: {
  totalReward: number
  top10Reward: number
  top50Reward: number
  totalDap: number
  activeDap: number
}): {
  top10Share: number
  top50Share: number
  bottomShare: number
  activeRate: number
} {
  const { totalReward, top10Reward, top50Reward, totalDap, activeDap } = params
  return {
    top10Share:  totalReward > 0 ? top10Reward / totalReward : 0,
    top50Share:  totalReward > 0 ? top50Reward / totalReward : 0,
    bottomShare: totalReward > 0 ? (totalReward - top50Reward) / totalReward : 0,
    activeRate:  totalDap > 0 ? activeDap / totalDap : 0,
  }
}

// ─── キャンペーン収益影響計算 ─────────────────────────────────────────

// シナリオ内の全購入プランを価格加重平均して決済手数料率・報酬コスト率を返す
function weightedPlanMetrics(
  plans: Record<PaymentMethod, PurchasePlan[]>,
  pointConfig: PointConfig,
): { storeFeeRate: number; rewardCostRatio: number; normalCostRatio: number; bonusCostRatio: number } {
  const allPlans = (Object.values(plans) as PurchasePlan[][]).flat()
  const totalWeight = allPlans.reduce((s, p) => s + p.priceWithTax, 0)
  if (totalWeight === 0) return { storeFeeRate: 0, rewardCostRatio: 0, normalCostRatio: 0, bonusCostRatio: 0 }
  const storeFeeRate    = allPlans.reduce((s, p) => s + p.priceWithTax * (p.storeFeeRate ?? 0), 0) / totalWeight
  const normalCostRatio = allPlans.reduce((s, p) => s + p.normalPt * pointConfig.normalPtCost, 0) / totalWeight
  const bonusCostRatio  = allPlans.reduce((s, p) => s + p.bonusPt  * pointConfig.bonusPtCost,  0) / totalWeight
  return { storeFeeRate, rewardCostRatio: normalCostRatio + bonusCostRatio, normalCostRatio, bonusCostRatio }
}

/**
 * ポイント設定から粗利率を自動計算する
 * 粗利率 = 1 - 加重平均決済手数料率 - 加重平均報酬コスト率
 */
export function calcAutoGrossMarginRate(
  plans: Record<PaymentMethod, PurchasePlan[]>,
  pointConfig: PointConfig,
): number {
  const { storeFeeRate, rewardCostRatio } = weightedPlanMetrics(plans, pointConfig)
  return Math.max(0, 1 - storeFeeRate - rewardCostRatio)
}

/**
 * キャンペーン収益影響計算
 * 売上額に対して指定シナリオの粗利・パフォーマー報酬・損失を返す
 * loss = 基本シナリオとの差分コスト（正 = 追加コスト発生）
 */
export function calcCampaignImpact(
  salesAmount: number,
  scenario: 'base' | 'campaign1' | 'campaign2',
  pointConfig: PointConfig,
  allPlans: {
    base:      Record<PaymentMethod, PurchasePlan[]>
    campaign1: Record<PaymentMethod, PurchasePlan[]>
    campaign2: Record<PaymentMethod, PurchasePlan[]>
  },
): {
  grossMargin: number
  grossMarginRate: number
  performerReward: number
  loss: number
  lossRate: number
} {
  const m           = weightedPlanMetrics(allPlans[scenario], pointConfig)
  const paymentFee  = salesAmount * m.storeFeeRate
  const performerReward = salesAmount * m.rewardCostRatio
  const grossMargin = salesAmount - paymentFee - performerReward
  const grossMarginRate = salesAmount > 0 ? grossMargin / salesAmount : 0

  const baseM      = weightedPlanMetrics(allPlans.base, pointConfig)
  const baseReward = salesAmount * baseM.rewardCostRatio
  const loss       = performerReward - baseReward

  return {
    grossMargin:     Math.round(grossMargin),
    grossMarginRate,
    performerReward: Math.round(performerReward),
    loss:            Math.round(loss),
    lossRate:        salesAmount > 0 ? loss / salesAmount : 0,
  }
}

/**
 * 目標粗利率から逆算してパフォーマーに払える上限額を返す
 */
export function calcTargetPerformerBudget(
  salesAmount: number,
  targetGrossMarginRate: number,
  pointConfig: PointConfig,
  plans: Record<PaymentMethod, PurchasePlan[]>,
): {
  maxPerformerBudget: number
  actualGrossMargin: number
} {
  const { storeFeeRate } = weightedPlanMetrics(plans, pointConfig)
  const paymentFee       = salesAmount * storeFeeRate
  const maxPerformerBudget = salesAmount * (1 - targetGrossMarginRate) - paymentFee
  return {
    maxPerformerBudget: Math.round(maxPerformerBudget),
    actualGrossMargin:  Math.round(salesAmount - paymentFee - maxPerformerBudget),
  }
}

/**
 * ボーナスPT原価を通常PTと同じ単価(normalPtCost)に引き上げた場合の損失差分
 */
export function calcBonusPtEqualizationLoss(
  salesAmount: number,
  pointConfig: PointConfig,
  plans: Record<PaymentMethod, PurchasePlan[]>,
): {
  currentCost: number
  equalizedCost: number
  lossDiff: number
  currentGrossMarginRate: number
  equalizedGrossMarginRate: number
} {
  const m        = weightedPlanMetrics(plans, pointConfig)
  const allPlans = (Object.values(plans) as PurchasePlan[][]).flat()
  const totalWeight = allPlans.reduce((s, p) => s + p.priceWithTax, 0)
  const equalizedBonusCostRatio = totalWeight > 0
    ? allPlans.reduce((s, p) => s + p.bonusPt * pointConfig.normalPtCost, 0) / totalWeight
    : 0
  const equalizedRewardCostRatio = m.normalCostRatio + equalizedBonusCostRatio

  const paymentFee    = salesAmount * m.storeFeeRate
  const currentCost   = Math.round(salesAmount * m.rewardCostRatio)
  const equalizedCost = Math.round(salesAmount * equalizedRewardCostRatio)

  return {
    currentCost,
    equalizedCost,
    lossDiff: equalizedCost - currentCost,
    currentGrossMarginRate:   salesAmount > 0 ? (salesAmount - paymentFee - currentCost)   / salesAmount : 0,
    equalizedGrossMarginRate: salesAmount > 0 ? (salesAmount - paymentFee - equalizedCost) / salesAmount : 0,
  }
}

/**
 * キャンペーンのシナリオと基本設定を比較し、設計意図・目的・期待効果を自動生成する
 * scenarioRef が空の場合は null を返す
 */
export function inferCampaignIntent(
  campaign: Campaign,
  pointConfig: PointConfig,
  allPlans: {
    base:      Record<PaymentMethod, PurchasePlan[]>
    campaign1: Record<PaymentMethod, PurchasePlan[]>
    campaign2: Record<PaymentMethod, PurchasePlan[]>
  },
): { intent: string; purpose: string; expectedEffect: string } | null {
  if (!campaign.scenarioRef) return null
  const base = weightedPlanMetrics(allPlans.base,                   pointConfig)
  const camp = weightedPlanMetrics(allPlans[campaign.scenarioRef],  pointConfig)
  if (base.rewardCostRatio === 0) return null

  const totalMultiplier  = camp.rewardCostRatio / base.rewardCostRatio
  const normalMultiplier = base.normalCostRatio > 0 ? camp.normalCostRatio / base.normalCostRatio : 1
  const bonusMultiplier  = base.bonusCostRatio  > 0 ? camp.bonusCostRatio  / base.bonusCostRatio  : 1

  const rewardDeltaPct   = Math.round((totalMultiplier - 1) * 100)
  const marginImpactPct  = Math.round((camp.rewardCostRatio - base.rewardCostRatio) * 100)

  const isNormalHeavy = normalMultiplier >= bonusMultiplier * 1.2
  const isBonusHeavy  = bonusMultiplier  >= normalMultiplier * 1.2
  const isBalanced    = Math.abs(normalMultiplier - bonusMultiplier) / Math.max(normalMultiplier, bonusMultiplier) < 0.2
  const isHighAmplify = totalMultiplier >= 1.5

  let intent: string
  let purpose: string

  if (isNormalHeavy) {
    intent  = '稼働量比例型の還元設計（通常PT重視）'
    purpose = 'メッセージ数・稼働継続を促進し、パフォーマーの日常的な稼働モチベーションを高める'
  } else if (isBonusHeavy) {
    intent  = '有料アクション促進型の設計（ボーナスPT重視）'
    purpose = '有料鑑定・通話など高単価アクションへの誘導を狙い、ユーザー単価の向上につなげる'
  } else if (isBalanced && isHighAmplify) {
    intent  = '全体底上げキャンペーン（通常・ボーナスPT均等に大幅増）'
    purpose = '短期集中の稼働促進・新規パフォーマーの早期定着を図る。ただしコスト増加率が高い点に注意'
  } else if (isBalanced) {
    intent  = '均等還元型設計（通常・ボーナスPTを同水準で増加）'
    purpose = '全アクションを均等に底上げし、特定行動に偏らない全体的な稼働意欲の向上を狙う'
  } else {
    intent  = '複合型のポイント設計'
    purpose = '複数の稼働パターンを複合的に刺激する設計'
  }

  const expectedEffect = rewardDeltaPct === 0
    ? '基本設定と変化なし'
    : `パフォーマー報酬 ${rewardDeltaPct > 0 ? '+' : ''}${rewardDeltaPct}%（基本比）／粗利への影響 ${marginImpactPct > 0 ? '-' : '+'}${Math.abs(marginImpactPct)}%ポイント`

  return { intent, purpose, expectedEffect }
}
