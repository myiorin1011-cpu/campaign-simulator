import { describe, it, expect } from 'vitest'
import {
  calcTotalPt,
  calcRetentionRate,
  calcPerformerIncome,
  calcMonthlyKPI,
  calcAgencyROI,
  calcRequiredActivity,
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
    expect(Math.floor(net)).toBe(699)
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
    expect(result.debutCpa).toBe(50000) // 500000/10
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
