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
  storeFeeRate: number       // ストア/決済手数料率（0〜1）プランごとに編集可
  productId?: string
}

// 決済種別
export type PaymentMethod = 'bank' | 'credix' | 'amazonpay' | 'apple' | 'google'

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
  selectedRank: number       // 想定ランク（stage番号）※後方互換のため保持
  activityPattern: ActivityPattern  // ※後方互換のため保持（未使用）
  monthlyMessages: number    // パフォーマー1人あたり月間メッセージ受信数
  monthlyPaidOpens: number   // パフォーマー1人あたり月間 有料メッセージ開封数
}

export type ActivityPattern = 'message' | 'call' | 'balanced'

// コホート設定
export interface CohortParams {
  months: number             // 予測月数（デフォルト12）
  newUserArppu: number
  secondMonthArppu: number
  continuousArppu: number
  retentionRate: number      // タブ3から引き継ぎ可（後方互換・代表値）
  secondMonthRetention: number   // 2ヶ月目継続率（1ヶ月目→2ヶ月目）
  continuousRetention: number    // 3ヶ月目以降の継続率（開始値）
  continuousDecay: number        // 3ヶ月目以降の毎月逓減幅（pt/月・0=一定）
  cpi: number                // Cost Per Install（基本入力）
  conversionRate: number     // 課金率（基本入力）
  monthlyAdBudgets: number[] // 月別広告費（手動入力・月数分）

  // パフォーマー報酬原価 計算用パラメータ（親データ）
  registrationBonusPt?: number      // 登録特典pt（例:7000）
  registrationBonusConsume?: number // 登録特典消化率（例:0.7）
  credixRepPlan?: number            // Credix代表購入プラン（例:11000）
  avgBonusGrantRate?: number        // 購入平均ボーナス付与率（例:0.0364）
  firstBonusPt?: number             // Credix初回ボーナスpt（例:300）
  firstBonusConsume?: number        // 初回ボーナス消化率（例:1.0）
  bonusPtCost?: number              // ボーナスpt原価 円/pt（例:0.22）
  normalRewardRate?: number         // 通常報酬原価率（売上比・例:0.3333）

  // キャンペーン施策：無償(登録特典)消化分のボーナスpt上乗せ
  campaignEnabled?: boolean         // 施策ON/OFF
  campaignMonth?: number            // 実施月（1始まり・例:1）
  campaignAddMsgBonusPt?: number    // +pt/通（例:10）
  campaignAddCharBonusPt?: number   // +pt/字（例:1）
  campaignApplyBonus?: boolean      // ボーナスpt消化（無償）に付与
  campaignApplyNormal?: boolean     // 通常pt消化（有料）に付与
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

// ─── キャンペーン企画 ───────────────────────────────
export interface Campaign {
  id: string
  audience: 'user' | 'performer'  // ユーザー向け / パフォーマー向け
  category: string      // 種別（記念/季節/ボーナス/ゲリラ/定期 等）
  title: string         // タイトル
  durationDays: number  // 実施期間（日数）
  start: string         // 開始
  end: string           // 終了
  pattern: string       // パターン（A1/B3 等）
  tag: string           // タグ（1通, 1文字 等）
  status: string        // ステータス（準備中/開始前 等）
  ptDesign: string      // pt設計
  banner: string        // バナー
  ptSetting: string     // pt設定
  scenarioRef: '' | 'campaign1' | 'campaign2'
}

// ─── キャンペーンバナー管理 ─────────────────────────
export interface Banner {
  id: string
  category: string         // 月/種別（1月・記念・デフォルト 等）
  event: string            // イベント名
  userText: string         // ユーザー訴求文
  userBanner: string       // 完成バナー(URL/メモ) 375×131
  userLink: string         // リンク先
  userStatus: string       // ステータス
  performerText: string    // パフォーマー訴求文
  performerBanner: string  // 完成バナー(URL/メモ)
  performerLink: string    // リンク先
  performerStatus: string  // ステータス
}

// ランキングイベント（順位別ボーナスPT）
export interface RankingTier {
  label: string      // 集計（前日/前週/前月/新人 等）
  points: number[]   // 1位〜10位のボーナスPT
}

// アプリ全体データ
export interface AppData {
  pointConfig: PointConfig
  purchasePlans: Record<PaymentMethod, PurchasePlan[]>          // 基本設定
  purchasePlans1: Record<PaymentMethod, PurchasePlan[]>         // キャンペーン設定1
  purchasePlans2: Record<PaymentMethod, PurchasePlan[]>         // キャンペーン設定2
  paymentOrder: PaymentMethod[]   // 決済別プラン表の表示順
  performerRanks: PerformerRank[]          // 基本設定
  performerRanks1: PerformerRank[]         // キャンペーン設定1
  performerRanks2: PerformerRank[]         // キャンペーン設定2
  simulatorParams: SimulatorParams
  cohortParams: CohortParams
  agencies: Agency[]
  reports: ReportData[]
  campaigns: Campaign[]
  banners: Banner[]
  rankingTiers: RankingTier[]
}
