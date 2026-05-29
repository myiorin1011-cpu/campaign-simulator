// ポイント基本設定
export interface PointConfig {
  userPtRate: number        // ¥2 ユーザーポイント販売単価
  performerPtRate: number   // ¥1 パフォーマーポイント表面単価
  normalPtCost: number      // ¥0.67 通常pt報酬原価
  bonusPtCost: number       // ¥0.22 ボーナスpt報酬原価
  taxRate: number           // 0.10
  withholdingIndividual: number  // 0.1021
  withholdingCorporate: number   // 0.00
  transferFee: number       // 550
  minSettlementPt: number   // 5550
}

// ポイント購入プラン（1行）
export interface PurchasePlan {
  id: number
  priceWithTax: number
  priceWithoutTax: number
  normalPt: number
  bonusPt: number
  firstTimeBonusPt: number
  secondTimeBonusPt: number
  thirdTimeBonusPt: number
  productId?: string
}

// 決済種別
export type PaymentMethod = 'bank' | 'apple' | 'google'

// パフォーマーランク
export interface PerformerRank {
  stage: number
  name: string
  nameEn: string
  actions: ActionPoints[]
}

// アクション種別
export type ActionType =
  | 'message'
  | 'fortune_char'
  | 'paid_image'
  | 'paid_video'
  | 'image_attach'
  | 'video_attach'
  | 'voice_call'
  | 'video_call'
  | 'with_user_camera'
  | 'premium_live'
  | 'premium_2shot'
  | 'post_comment'
  | 'post_paid_image'
  | 'post_paid_video'

export interface ActionPoints {
  type: ActionType
  userConsume: number
  performerNormal: number
  performerBonus: number
}

// シミュレーターパラメータ
export interface SimulatorParams {
  adBudget: number           // 月間広告費
  cpi: number                // Cost Per Install
  conversionRate: number     // 課金率 (0〜1)
  arppu: number              // 課金ユーザー平均購入額
  retentionRate: number      // 継続率 (0〜1)
  grossMarginRate: number    // 粗利率 (0〜1)
  selectedRank: number       // 想定ランク（stage番号）
  activityPattern: ActivityPattern
}

export type ActivityPattern = 'message' | 'call' | 'balanced'

// コホート設定
export interface CohortParams {
  months: number             // 予測月数（デフォルト12）
  newUserArppu: number
  secondMonthArppu: number
  continuousArppu: number
  retentionRate: number      // タブ3から引き継ぎ可（上書き可）
}

// 代理店
export interface Agency {
  id: string
  name: string
  months: AgencyMonthData[]
}

export interface AgencyMonthData {
  month: number
  adBudget: number
  applications: number
  debuts: number
  sales: number
}

// ─── 報告書関連の型 ───────────────────────────────────────────

export interface SectionFlags {
  showInInternal: boolean
  showInPerformer: boolean
}

export interface ReportSectionSales extends SectionFlags {
  target: number
  actual: number
  memo: string
}

export interface ReportSectionUser extends SectionFlags {
  arppu: number
  dau: number
  installCount: number
  conversionRate: number
  newSales: number
  continuousSales: number
  memo: string
}

export interface ReportSectionAd extends SectionFlags {
  agencies: {
    name: string
    adBudget: number
    sales: number
    roas: number
  }[]
  totalRoas: number
  memo: string
}

export interface ReportSectionDap extends SectionFlags {
  activeCount: number
  totalReward: number
  avgRewardPerDap: number
  memo: string
}

export interface ReportSectionConsult extends SectionFlags {
  entries: {
    managerName: string
    comment: string
  }[]
}

export interface ReportSectionRecruit extends SectionFlags {
  debutCount: number
  memo: string
}

export interface ReportData {
  id: string
  meta: {
    serviceName: string
    month: string
    createdAt: string
  }
  sections: {
    sales:   ReportSectionSales
    user:    ReportSectionUser
    ad:      ReportSectionAd
    dap:     ReportSectionDap
    consult: ReportSectionConsult
    recruit: ReportSectionRecruit
  }
}

// アプリ全体データ
export interface AppData {
  pointConfig: PointConfig
  purchasePlans: Record<PaymentMethod, PurchasePlan[]>
  performerRanks: PerformerRank[]
  simulatorParams: SimulatorParams
  cohortParams: CohortParams
  agencies: Agency[]
  reports: ReportData[]
}
