import type { AppData, ActionPoints, ActionType, PurchasePlan } from '../types'
import { seedCampaigns, seedBanners, rankingTiers as seedRankingTiers } from './campaignSeeds'

// 各プランに決済手数料率(storeFeeRate)を一括付与するヘルパー
const withFee = (rate: number, plans: Omit<PurchasePlan, 'storeFeeRate'>[]): PurchasePlan[] =>
  plans.map((p) => ({ ...p, storeFeeRate: rate }))

const defaultActions = (
  msg: [number,number,number],
  fortuneChar: [number,number,number],
  paidImg: [number,number,number],
  paidVid: [number,number,number],
  imgAttach: [number,number,number],
  vidAttach: [number,number,number],
  voice: [number,number,number],
  video: [number,number,number],
  withCam: [number,number,number],
  premLive: [number,number,number],
  prem2shot: [number,number,number],
  postComment: [number,number,number],
  postPaidImg: [number,number,number],
  postPaidVid: [number,number,number],
): ActionPoints[] => {
  const types: ActionType[] = [
    'message','fortune_char','paid_image','paid_video',
    'image_attach','video_attach','voice_call','video_call',
    'with_user_camera','premium_live','premium_2shot',
    'post_comment','post_paid_image','post_paid_video',
  ]
  const vals = [msg,fortuneChar,paidImg,paidVid,imgAttach,vidAttach,
    voice,video,withCam,premLive,prem2shot,postComment,postPaidImg,postPaidVid]
  return types.map((type, i) => ({
    type,
    userConsume: vals[i][0],
    performerNormal: vals[i][1],
    performerBonus: vals[i][2],
  }))
}

const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o))

const baseData: Omit<AppData, 'purchasePlans1' | 'purchasePlans2' | 'performerRanks1' | 'performerRanks2'> = {
  pointConfig: {
    userPtRate: 2,
    performerPtRate: 1,
    normalPtCost: 0.67,
    bonusPtCost: 0.22,
    taxRate: 0.10,
    withholdingIndividual: 0.1021,
    withholdingCorporate: 0,
    transferFee: 550,
    minSettlementPt: 5550,
  },

  paymentOrder: ['bank', 'credix', 'amazonpay', 'apple', 'google'],

  purchasePlans: {
    // 銀行振込（手数料0%）
    bank: withFee(0, [
      { id:1, priceWithTax:3300,  priceWithoutTax:3000,  normalPt:1650,  bonusPt:0,    firstTimeBonusPt:0, secondTimeBonusPt:0, thirdTimeBonusPt:0 },
      { id:2, priceWithTax:5500,  priceWithoutTax:5000,  normalPt:2750,  bonusPt:150,  firstTimeBonusPt:0, secondTimeBonusPt:0, thirdTimeBonusPt:0 },
      { id:3, priceWithTax:11000, priceWithoutTax:10000, normalPt:5500,  bonusPt:300,  firstTimeBonusPt:0, secondTimeBonusPt:0, thirdTimeBonusPt:0 },
      { id:4, priceWithTax:25000, priceWithoutTax:22727, normalPt:12500, bonusPt:750,  firstTimeBonusPt:0, secondTimeBonusPt:0, thirdTimeBonusPt:0 },
      { id:5, priceWithTax:50000, priceWithoutTax:45455, normalPt:25000, bonusPt:1500, firstTimeBonusPt:0, secondTimeBonusPt:0, thirdTimeBonusPt:0 },
      { id:6, priceWithTax:98000, priceWithoutTax:89091, normalPt:49000, bonusPt:3000, firstTimeBonusPt:0, secondTimeBonusPt:0, thirdTimeBonusPt:0 },
      { id:7, priceWithTax:150000,priceWithoutTax:136364,normalPt:75000, bonusPt:5000, firstTimeBonusPt:0, secondTimeBonusPt:0, thirdTimeBonusPt:0 },
    ]),
    // Credix決済（手数料4%）／初回特典PTあり
    credix: withFee(0.04, [
      { id:1, priceWithTax:1100,  priceWithoutTax:1000,  normalPt:550,   bonusPt:0,    firstTimeBonusPt:1000, secondTimeBonusPt:0, thirdTimeBonusPt:0 },
      { id:2, priceWithTax:5500,  priceWithoutTax:5000,  normalPt:2750,  bonusPt:150,  firstTimeBonusPt:500,  secondTimeBonusPt:0, thirdTimeBonusPt:0 },
      { id:3, priceWithTax:11000, priceWithoutTax:10000, normalPt:5500,  bonusPt:300,  firstTimeBonusPt:300,  secondTimeBonusPt:0, thirdTimeBonusPt:0 },
      { id:4, priceWithTax:25000, priceWithoutTax:22727, normalPt:12500, bonusPt:750,  firstTimeBonusPt:450,  secondTimeBonusPt:0, thirdTimeBonusPt:0 },
      { id:5, priceWithTax:50000, priceWithoutTax:45455, normalPt:25000, bonusPt:1500, firstTimeBonusPt:900,  secondTimeBonusPt:0, thirdTimeBonusPt:0 },
      { id:6, priceWithTax:98000, priceWithoutTax:89091, normalPt:49000, bonusPt:3000, firstTimeBonusPt:1800, secondTimeBonusPt:0, thirdTimeBonusPt:0 },
      { id:7, priceWithTax:150000,priceWithoutTax:136364,normalPt:75000, bonusPt:5000, firstTimeBonusPt:3000, secondTimeBonusPt:0, thirdTimeBonusPt:0 },
    ]),
    // Amazon Pay（手数料3.9%）
    amazonpay: withFee(0.039, [
      { id:1, priceWithTax:3300,  priceWithoutTax:3000,  normalPt:1650,  bonusPt:0,    firstTimeBonusPt:0, secondTimeBonusPt:0, thirdTimeBonusPt:0 },
      { id:2, priceWithTax:5500,  priceWithoutTax:5000,  normalPt:2750,  bonusPt:150,  firstTimeBonusPt:0, secondTimeBonusPt:0, thirdTimeBonusPt:0 },
      { id:3, priceWithTax:11000, priceWithoutTax:10000, normalPt:5500,  bonusPt:300,  firstTimeBonusPt:0, secondTimeBonusPt:0, thirdTimeBonusPt:0 },
      { id:4, priceWithTax:25000, priceWithoutTax:22727, normalPt:12500, bonusPt:750,  firstTimeBonusPt:0, secondTimeBonusPt:0, thirdTimeBonusPt:0 },
      { id:5, priceWithTax:50000, priceWithoutTax:45455, normalPt:25000, bonusPt:1500, firstTimeBonusPt:0, secondTimeBonusPt:0, thirdTimeBonusPt:0 },
      { id:6, priceWithTax:98000, priceWithoutTax:89091, normalPt:49000, bonusPt:3000, firstTimeBonusPt:0, secondTimeBonusPt:0, thirdTimeBonusPt:0 },
      { id:7, priceWithTax:150000,priceWithoutTax:136364,normalPt:75000, bonusPt:5000, firstTimeBonusPt:0, secondTimeBonusPt:0, thirdTimeBonusPt:0 },
    ]),
    // Apple（ストア手数料10%）
    apple: withFee(0.10, [
      { id:1, priceWithTax:2200,  priceWithoutTax:2000,  normalPt:1100,  bonusPt:0,   firstTimeBonusPt:0, secondTimeBonusPt:0, thirdTimeBonusPt:0, productId:'jp.canow-wish.apple.2200' },
      { id:2, priceWithTax:4400,  priceWithoutTax:4000,  normalPt:2200,  bonusPt:50,  firstTimeBonusPt:0, secondTimeBonusPt:0, thirdTimeBonusPt:0, productId:'jp.canow-wish.apple.4400' },
      { id:3, priceWithTax:7700,  priceWithoutTax:7000,  normalPt:3850,  bonusPt:100, firstTimeBonusPt:0, secondTimeBonusPt:0, thirdTimeBonusPt:0, productId:'jp.canow-wish.apple.7700' },
      { id:4, priceWithTax:11000, priceWithoutTax:10000, normalPt:5500,  bonusPt:200, firstTimeBonusPt:0, secondTimeBonusPt:0, thirdTimeBonusPt:0, productId:'jp.canow-wish.apple.11000' },
      { id:5, priceWithTax:25000, priceWithoutTax:22727, normalPt:12500, bonusPt:500, firstTimeBonusPt:0, secondTimeBonusPt:0, thirdTimeBonusPt:0, productId:'jp.canow-wish.apple.25000' },
    ]),
    // Google（ストア手数料10%）
    google: withFee(0.10, [
      { id:1, priceWithTax:2200,  priceWithoutTax:2000,  normalPt:1100,  bonusPt:0,   firstTimeBonusPt:0, secondTimeBonusPt:0, thirdTimeBonusPt:0, productId:'jp.canow-wish.google.2200' },
      { id:2, priceWithTax:4400,  priceWithoutTax:4000,  normalPt:2200,  bonusPt:50,  firstTimeBonusPt:0, secondTimeBonusPt:0, thirdTimeBonusPt:0, productId:'jp.canow-wish.google.4400' },
      { id:3, priceWithTax:7700,  priceWithoutTax:7000,  normalPt:3850,  bonusPt:100, firstTimeBonusPt:0, secondTimeBonusPt:0, thirdTimeBonusPt:0, productId:'jp.canow-wish.google.7700' },
      { id:4, priceWithTax:11000, priceWithoutTax:10000, normalPt:5500,  bonusPt:200, firstTimeBonusPt:0, secondTimeBonusPt:0, thirdTimeBonusPt:0, productId:'jp.canow-wish.google.11000' },
      { id:5, priceWithTax:25000, priceWithoutTax:22727, normalPt:12500, bonusPt:500, firstTimeBonusPt:0, secondTimeBonusPt:0, thirdTimeBonusPt:0, productId:'jp.canow-wish.google.25000' },
    ]),
  },

  performerRanks: [
    { stage:1,  name:'ブロンズ',          nameEn:'Bronze',         actions: defaultActions([0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]) },
    { stage:2,  name:'シルバー',          nameEn:'Silver',         actions: defaultActions([120,80,20],[6,4,1],[495,330,110],[750,500,160],[225,150,55],[375,250,80],[390,260,85],[600,400,130],[0,0,0],[0,0,0],[0,0,0],[150,100,30],[495,330,110],[750,500,160]) },
    { stage:3,  name:'ゴールド',          nameEn:'Gold',           actions: defaultActions([150,100,30],[9,6,2],[600,400,125],[900,600,200],[300,200,65],[450,300,100],[495,330,110],[750,500,165],[0,0,0],[0,0,0],[0,0,0],[150,100,30],[600,400,125],[900,600,200]) },
    { stage:4,  name:'プラチナ',          nameEn:'Platinum',       actions: defaultActions([180,120,40],[12,8,2],[720,480,160],[1095,730,240],[360,240,80],[540,360,120],[600,400,130],[900,600,200],[0,0,0],[0,0,0],[0,0,0],[150,100,30],[720,480,160],[1095,730,240]) },
    { stage:5,  name:'サファイア',        nameEn:'Sapphire',       actions: defaultActions([225,150,50],[15,10,3],[840,560,180],[1245,830,275],[420,280,90],[630,420,140],[690,460,155],[1050,700,230],[0,0,0],[0,0,0],[0,0,0],[150,100,30],[840,560,180],[1245,830,275]) },
    { stage:6,  name:'エメラルド',        nameEn:'Emerald',        actions: defaultActions([270,180,60],[18,12,4],[960,640,200],[1440,960,320],[480,320,105],[720,480,160],[795,530,175],[1200,800,265],[0,0,0],[0,0,0],[0,0,0],[150,100,30],[960,640,200],[1440,960,320]) },
    { stage:7,  name:'ロイヤルエメラルド',nameEn:'Royal Emerald',  actions: defaultActions([0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]) },
    { stage:8,  name:'ルビー',            nameEn:'Ruby',           actions: defaultActions([300,200,70],[21,14,4],[1320,880,295],[1995,1330,440],[660,440,145],[990,660,220],[990,660,220],[1500,1000,330],[0,0,0],[0,0,0],[0,0,0],[150,100,30],[1320,880,295],[1995,1330,440]) },
    { stage:9,  name:'ロイヤルルビー',    nameEn:'Royal Ruby',     actions: defaultActions([0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]) },
    { stage:10, name:'ダイヤモンド',      nameEn:'Diamond',        actions: defaultActions([375,250,90],[24,16,5],[1680,1120,380],[2490,1660,560],[840,560,185],[1260,840,280],[1200,800,265],[1800,1200,400],[0,0,0],[0,0,0],[0,0,0],[150,100,30],[1680,1120,380],[2498,1665,560]) },
    { stage:11, name:'ロイヤルダイヤモンド',nameEn:'Royal Diamond', actions: defaultActions([450,300,110],[27,18,6],[1920,1280,470],[2895,1930,640],[960,640,210],[1440,960,320],[1290,860,285],[1950,1300,430],[0,0,0],[0,0,0],[0,0,0],[150,100,30],[1920,1280,470],[2895,1930,640]) },
    { stage:12, name:'シュプリーム',      nameEn:'Supreme',        actions: defaultActions([525,350,140],[33,22,7],[2250,1500,550],[3300,2200,730],[1095,730,240],[1650,1100,385],[1500,1000,330],[2250,1500,500],[0,0,0],[0,0,0],[0,0,0],[150,100,30],[2250,1500,550],[3300,2200,730]) },
  ],

  simulatorParams: {
    adBudget: 1000000,
    cpi: 500,
    conversionRate: 0.05,
    arppu: 15000,
    retentionRate: 0.40,
    grossMarginRate: 0.62,
    selectedRank: 3,
    activityPattern: 'balanced',
    monthlyMessages: 6000,    // 月間メッセージ受信数（例: 1日200通 × 30日）
    monthlyPaidOpens: 300,    // 月間 有料メッセージ開封数
  },

  cohortParams: {
    months: 12,
    newUserArppu: 20000,
    secondMonthArppu: 35000,
    continuousArppu: 50000,
    retentionRate: 0.40,
    secondMonthRetention: 0.30,   // 2ヶ月目継続率 30%
    continuousRetention: 0.20,    // 3ヶ月目以降継続率 20%（開始値）
    continuousDecay: 0,           // 逓減幅 0=一定
    cpi: 2500,
    conversionRate: 0.10,
    monthlyAdBudgets: Array.from({ length: 12 }, (_, i) => 4000000 + i * 2000000),
    // パフォーマー報酬原価 親パラメータ
    registrationBonusPt: 7000,
    registrationBonusConsume: 0.70,
    credixRepPlan: 11000,
    avgBonusGrantRate: 0.0364,
    firstBonusPt: 300,
    firstBonusConsume: 1.0,
    bonusPtCost: 0.22,
    normalRewardRate: 1 / 3,
  },

  agencies: [
    {
      id: 'gradcube-default',
      name: 'GradCube',
      months: Array.from({ length: 12 }, (_, i) => ({
        month: i + 1, adBudget: 0, applications: 0, debuts: 0, sales: 0,
      })),
    },
  ],
  reports: [],
  campaigns: seedCampaigns,
  banners: seedBanners,
  rankingTiers: seedRankingTiers,
}

export const initialData: AppData = {
  ...baseData,
  // キャンペーン設定1・2は基本設定の複製から開始
  purchasePlans1: clone(baseData.purchasePlans),
  purchasePlans2: clone(baseData.purchasePlans),
  performerRanks1: clone(baseData.performerRanks),
  performerRanks2: clone(baseData.performerRanks),
}
