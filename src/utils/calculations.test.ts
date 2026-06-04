import { describe, it, expect } from 'vitest'
import {
  calcTotalPt,
  calcRetentionRate,
  calcPerformerIncome,
  calcMonthlyKPI,
  calcAgencyROI,
  calcRequiredActivity,
  calcLTV,
  calcPaybackMonths,
  calcStoreFee,
  calcPaidOpenRate,
  calcDapDistribution,
} from './calculations'

describe('calcTotalPt', () => {
  it('通常PTとボーナスPTの合計を返す', () => {
    expect(calcTotalPt(1650, 0)).toBe(1650)
    expect(calcTotalPt(2750, 150)).toBe(2900)
  })
})

describe('calcRetentionRate', () => {
  it('N月目の残存ユーザー数を計算する', () => {
    // 初月100人、継続率40%
    expect(calcRetentionRate(100, 0.4, 1)).toBe(100)
    expect(calcRetentionRate(100, 0.4, 2)).toBe(40)
    expect(calcRetentionRate(100, 0.4, 3)).toBeCloseTo(16)
  })
})

describe('calcPerformerIncome', () => {
  it('通常ptとボーナスptから報酬額を計算する（源泉なし）', () => {
    // 通常1000pt × 0.67 + ボーナス500pt × 0.22 = 670 + 110 = 780
    expect(calcPerformerIncome(1000, 500, 0.67, 0.22)).toBe(780)
  })
  it('源泉徴収を差し引いた手取りを計算する', () => {
    // 780 × (1 - 0.1021) = 699.6...
    const gross = calcPerformerIncome(1000, 500, 0.67, 0.22)
    const net = gross * (1 - 0.1021)
    expect(Math.floor(net)).toBe(700)
  })
})

describe('calcMonthlyKPI', () => {
  it('広告費・CPI・課金率・ARPPUから月間KPIを計算する', () => {
    const result = calcMonthlyKPI({
      adBudget: 1000000,
      cpi: 500,
      conversionRate: 0.05,
      arppu: 15000,
    })
    expect(result.installs).toBe(2000)
    expect(result.payingUsers).toBe(100)
    expect(result.sales).toBe(1500000)
  })
})

describe('calcAgencyROI', () => {
  it('累計回収率を計算する', () => {
    const months = [
      { month:1, adBudget:500000, applications:100, debuts:10, sales:200000 },
      { month:2, adBudget:500000, applications:80,  debuts:8,  sales:400000 },
    ]
    const result = calcAgencyROI(months)
    // 累計広告費1,000,000 / 累計売上600,000 = 60%
    expect(result.cumulativeROI).toBeCloseTo(0.6)
    expect(result.debutCpa).toBe(55555) // floor(1000000/18)
  })
})

describe('calcRequiredActivity', () => {
  it('目標月収から必要なメッセージ数を計算する（Goldランク・メッセージ中心）', () => {
    // Goldランク: メッセージ1通でP獲得100pt(通常)
    // 通常pt: ¥0.67 なので 100pt × 0.67 = ¥67/通
    // 目標¥200,000 ÷ ¥67 ≈ 2985通（メッセージ100%の場合）
    const result = calcRequiredActivity({
      targetIncome: 200000,
      normalPtCost: 0.67,
      bonusPtCost: 0.22,
      messageNormalPt: 100,
      messageBonusPt: 30,
      pattern: 'message',
    })
    expect(result.messagesNeeded).toBeGreaterThan(0)
  })
})

describe('calcLTV', () => {
  it('LTV = ARPPU ÷ (1 - 継続率)', () => {
    // ARPPU=10000, 継続率=0.6 → 10000 / 0.4 = 25000
    expect(calcLTV(10000, 0.6)).toBe(25000)
  })
  it('継続率0のときARPPUと等しい', () => {
    expect(calcLTV(15000, 0)).toBe(15000)
  })
})

describe('calcPaybackMonths', () => {
  it('ペイバック期間を月数で返す', () => {
    // CPI=500, ARPPU=10000, 課金率=0.05, 粗利率=0.62
    // 月次粗利 = 10000 * 0.05 * 0.62 = 310
    // ペイバック = 500 / 310 ≈ 1.61
    const result = calcPaybackMonths(500, 10000, 0.05, 0.62)
    expect(result).toBeCloseTo(1.61, 1)
  })
})

describe('calcStoreFee', () => {
  it('売上 × 手数料率を返す', () => {
    expect(calcStoreFee(100000, 0.30)).toBe(30000)
    expect(calcStoreFee(100000, 0)).toBe(0)
  })
})

describe('calcPaidOpenRate', () => {
  it('有料メッセージ ÷ 全メッセージを返す', () => {
    expect(calcPaidOpenRate(200, 1000)).toBeCloseTo(0.2)
  })
  it('全メッセージ0のとき0を返す', () => {
    expect(calcPaidOpenRate(0, 0)).toBe(0)
  })
})

describe('calcDapDistribution', () => {
  it('報酬シェアと稼働率を計算する', () => {
    const result = calcDapDistribution({
      totalReward: 10000000,
      top10Reward: 6000000,
      top50Reward: 9000000,
      totalDap: 100,
      activeDap: 70,
    })
    expect(result.top10Share).toBeCloseTo(0.6)
    expect(result.top50Share).toBeCloseTo(0.9)
    expect(result.bottomShare).toBeCloseTo(0.1)
    expect(result.activeRate).toBeCloseTo(0.7)
  })
})

import {
  calcCampaignImpact,
  calcTargetPerformerBudget,
  calcBonusPtEqualizationLoss,
  inferCampaignIntent,
} from './calculations'
import type { PointConfig, PurchasePlan, PaymentMethod, Campaign } from '../types'

// ─── フィクスチャ ──────────────────────────────────────────
const testPointConfig: PointConfig = {
  userPtRate: 2,
  performerPtRate: 1,
  normalPtCost: 0.67,
  bonusPtCost: 0.22,
  taxRate: 0.10,
  withholdingIndividual: 0.1021,
  withholdingCorporate: 0,
  transferFee: 550,
  minSettlementPt: 5550,
}

const makePlan = (normalPt: number, bonusPt: number, storeFeeRate = 0): PurchasePlan => ({
  id: 1,
  priceWithTax: 1000,
  priceWithoutTax: 909,
  normalPt,
  bonusPt,
  firstTimeBonusPt: 0,
  secondTimeBonusPt: 0,
  thirdTimeBonusPt: 0,
  storeFeeRate,
})

const toAllPayments = (plan: PurchasePlan): Record<PaymentMethod, PurchasePlan[]> => ({
  bank: [plan], credix: [], amazonpay: [], apple: [], google: [],
})

const basePlan     = makePlan(500, 0)
const campaignPlan = makePlan(500, 200)  // ボーナスPTあり
const feeBasePlan  = makePlan(500, 0, 0.04)  // 手数料4%

const testAllPlans = {
  base:      toAllPayments(basePlan),
  campaign1: toAllPayments(campaignPlan),
  campaign2: toAllPayments(basePlan),
}

// ─── calcCampaignImpact ────────────────────────────────────
describe('calcCampaignImpact', () => {
  it('基本シナリオの損失はゼロ', () => {
    const result = calcCampaignImpact(1000000, 'base', testPointConfig, testAllPlans)
    expect(result.loss).toBe(0)
  })

  it('キャンペーン1はボーナスPT分だけ報酬が増え、損失が発生する', () => {
    const base = calcCampaignImpact(1000000, 'base',      testPointConfig, testAllPlans)
    const camp = calcCampaignImpact(1000000, 'campaign1', testPointConfig, testAllPlans)
    expect(camp.performerReward).toBeGreaterThan(base.performerReward)
    expect(camp.loss).toBe(camp.performerReward - base.performerReward)
    expect(camp.grossMargin).toBeLessThan(base.grossMargin)
  })

  it('粗利率は 0〜1 の範囲に収まる', () => {
    const result = calcCampaignImpact(3200000, 'base', testPointConfig, testAllPlans)
    expect(result.grossMarginRate).toBeGreaterThan(0)
    expect(result.grossMarginRate).toBeLessThan(1)
  })

  it('手数料を含む場合に粗利が減る', () => {
    const withFee    = { ...testAllPlans, base: toAllPayments(feeBasePlan) }
    const withoutFee = testAllPlans
    const r1 = calcCampaignImpact(1000000, 'base', testPointConfig, withFee)
    const r2 = calcCampaignImpact(1000000, 'base', testPointConfig, withoutFee)
    expect(r1.grossMargin).toBeLessThan(r2.grossMargin)
  })
})

// ─── calcTargetPerformerBudget ────────────────────────────
describe('calcTargetPerformerBudget', () => {
  it('目標粗利率40%のとき報酬上限を正しく計算する（手数料なし）', () => {
    // storeFeeRate=0, sales=1000000, target=0.4 → maxBudget = 1000000 × 0.6 = 600000
    const result = calcTargetPerformerBudget(1000000, 0.4, testPointConfig, testAllPlans.base)
    expect(result.maxPerformerBudget).toBe(600000)
    expect(result.actualGrossMargin).toBe(400000)
  })

  it('手数料がある場合は上限が下がる', () => {
    const withFee    = calcTargetPerformerBudget(1000000, 0.4, testPointConfig, toAllPayments(feeBasePlan))
    const withoutFee = calcTargetPerformerBudget(1000000, 0.4, testPointConfig, testAllPlans.base)
    expect(withFee.maxPerformerBudget).toBeLessThan(withoutFee.maxPerformerBudget)
  })
})

// ─── calcBonusPtEqualizationLoss ─────────────────────────
describe('calcBonusPtEqualizationLoss', () => {
  it('ボーナスPTがないプランでは差分ゼロ', () => {
    const result = calcBonusPtEqualizationLoss(1000000, testPointConfig, testAllPlans.base)
    expect(result.lossDiff).toBe(0)
    expect(result.currentCost).toBe(result.equalizedCost)
  })

  it('ボーナスPTがある場合は均等化でコストが増加する', () => {
    const result = calcBonusPtEqualizationLoss(1000000, testPointConfig, testAllPlans.campaign1)
    // bonusPt=200, 差分単価=(0.67-0.22)=0.45, 1プラン1000円に200pt
    // 加重: 200 × 0.45 / 1000 × 1000000 = 90000
    expect(result.lossDiff).toBe(90000)
    expect(result.equalizedGrossMarginRate).toBeLessThan(result.currentGrossMarginRate)
  })
})

// ─── inferCampaignIntent ─────────────────────────────────
describe('inferCampaignIntent', () => {
  const baseCampaign: Campaign = {
    id: '1', audience: 'performer', category: 'test', title: 'test',
    durationDays: 7, start: '', end: '', pattern: '', tag: '', status: '',
    ptDesign: '', banner: '', ptSetting: '', scenarioRef: '',
  }

  it('scenarioRef が空のとき null を返す', () => {
    expect(inferCampaignIntent(baseCampaign, testPointConfig, testAllPlans)).toBeNull()
  })

  it('基本と同じシナリオのとき「変化なし」の期待効果を返す', () => {
    const campaign = { ...baseCampaign, scenarioRef: 'campaign2' as const }
    const result = inferCampaignIntent(campaign, testPointConfig, testAllPlans)
    expect(result).not.toBeNull()
    expect(result!.expectedEffect).toBe('基本設定と変化なし')
  })

  it('ボーナスPT重視のシナリオで結果を返す', () => {
    const campaign = { ...baseCampaign, scenarioRef: 'campaign1' as const }
    const result = inferCampaignIntent(campaign, testPointConfig, testAllPlans)
    expect(result).not.toBeNull()
    expect(result!.intent).toBeTruthy()
    expect(result!.purpose).toBeTruthy()
    expect(result!.expectedEffect).toContain('%')
  })
})
