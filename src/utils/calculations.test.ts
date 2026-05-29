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
