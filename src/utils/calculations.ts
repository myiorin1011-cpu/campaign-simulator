// src/utils/calculations.ts

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
