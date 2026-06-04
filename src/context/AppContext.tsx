import { createContext, useContext, type ReactNode } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { initialData } from '../data/initialData'
import type { AppData } from '../types'

interface AppContextType {
  data: AppData
  setData: (data: AppData) => void
  updatePointConfig: (config: Partial<AppData['pointConfig']>) => void
  updatePurchasePlans: (payment: keyof AppData['purchasePlans'], plans: AppData['purchasePlans'][typeof payment]) => void
  // シナリオ別（基本/キャンペーン1/2）の更新
  updatePlansScenario: (field: 'purchasePlans' | 'purchasePlans1' | 'purchasePlans2', payment: keyof AppData['purchasePlans'], plans: AppData['purchasePlans'][keyof AppData['purchasePlans']]) => void
  updateRanksScenario: (field: 'performerRanks' | 'performerRanks1' | 'performerRanks2', ranks: AppData['performerRanks']) => void
  updatePerformerRanks: (ranks: AppData['performerRanks']) => void
  updateSimulatorParams: (params: Partial<AppData['simulatorParams']>) => void
  updateCohortParams: (params: Partial<AppData['cohortParams']>) => void
  updateAgencies: (agencies: AppData['agencies']) => void
  updateReports: (reports: AppData['reports']) => void
  updatePaymentOrder: (order: AppData['paymentOrder']) => void
  updateCampaigns: (campaigns: AppData['campaigns']) => void
  updateBanners: (banners: AppData['banners']) => void
  updateRankingTiers: (tiers: AppData['rankingTiers']) => void
  resetToInitial: () => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [rawData, setData] = useLocalStorage<AppData>('campaign-simulator-data', initialData)

  // LocalStorageの古いデータに新フィールドが欠けていても安全に扱うための移行処理
  // 旧LocalStorageのプランに storeFeeRate が無い場合の既定値
  const defaultFee = (method: string): number => {
    switch (method) {
      case 'apple':
      case 'google': return 0.10
      case 'credix': return 0.04
      case 'amazonpay': return 0.039
      default: return 0
    }
  }
  const backfillFee = (method: string, plans?: typeof initialData.purchasePlans.bank) =>
    (plans ?? []).map((p) => ({ ...p, storeFeeRate: p.storeFeeRate ?? defaultFee(method) }))

  const mergedPlans = {
    bank:      backfillFee('bank',      rawData.purchasePlans?.bank),
    credix:    rawData.purchasePlans?.credix ? backfillFee('credix', rawData.purchasePlans.credix) : initialData.purchasePlans.credix,
    amazonpay: rawData.purchasePlans?.amazonpay ? backfillFee('amazonpay', rawData.purchasePlans.amazonpay) : initialData.purchasePlans.amazonpay,
    apple:     backfillFee('apple',     rawData.purchasePlans?.apple),
    google:    backfillFee('google',    rawData.purchasePlans?.google),
  }
  // 並び順: 旧データを尊重しつつ、初期順の未登録決済を末尾に追加
  const rawOrder = rawData.paymentOrder ?? []
  const mergedOrder = [
    ...rawOrder.filter((m) => m in mergedPlans),
    ...initialData.paymentOrder.filter((m) => !rawOrder.includes(m)),
  ]

  // 代理店が未登録（旧データで空）の場合はデフォルトのGradCubeを補完
  const mergedAgencies = (rawData.agencies && rawData.agencies.length > 0)
    ? rawData.agencies
    : initialData.agencies

  // キャンペーン設定1・2が無い旧データは基本設定の複製で補完
  const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o))
  const purchasePlans1 = rawData.purchasePlans1 ?? clone(mergedPlans)
  const purchasePlans2 = rawData.purchasePlans2 ?? clone(mergedPlans)
  const performerRanks1 = rawData.performerRanks1 ?? clone(rawData.performerRanks ?? initialData.performerRanks)
  const performerRanks2 = rawData.performerRanks2 ?? clone(rawData.performerRanks ?? initialData.performerRanks)

  const data: AppData = {
    ...rawData,
    reports: rawData.reports ?? [],
    purchasePlans: mergedPlans,
    purchasePlans1,
    purchasePlans2,
    performerRanks1,
    performerRanks2,
    paymentOrder: mergedOrder,
    agencies: mergedAgencies,
    // 区分(audience)が全行に揃った新形式のみ採用。旧形式(区分なし)は新シードに入れ替え
    campaigns: (rawData.campaigns && rawData.campaigns.length > 0 && rawData.campaigns.every((c) => c.audience === 'user' || c.audience === 'performer'))
      ? rawData.campaigns.map((c) => ({ ...c, scenarioRef: (c.scenarioRef ?? '') as '' | 'campaign1' | 'campaign2' }))
      : initialData.campaigns,
    banners: (rawData.banners && rawData.banners.length > 0) ? rawData.banners : initialData.banners,
    rankingTiers: (rawData.rankingTiers && rawData.rankingTiers.length > 0) ? rawData.rankingTiers : initialData.rankingTiers,
    simulatorParams: {
      ...initialData.simulatorParams,
      ...rawData.simulatorParams,
      // 旧データに新フィールドが無い場合は初期値で補完
      monthlyMessages: rawData.simulatorParams?.monthlyMessages ?? initialData.simulatorParams.monthlyMessages,
      monthlyPaidOpens: rawData.simulatorParams?.monthlyPaidOpens ?? initialData.simulatorParams.monthlyPaidOpens,
    },
    cohortParams: {
      ...initialData.cohortParams,
      ...rawData.cohortParams,
      // 2ヶ月目・3ヶ月目以降の継続率を補完（旧データは従来のretentionRate or 既定値）
      secondMonthRetention: rawData.cohortParams?.secondMonthRetention ?? initialData.cohortParams.secondMonthRetention,
      continuousRetention: rawData.cohortParams?.continuousRetention ?? initialData.cohortParams.continuousRetention,
      continuousDecay: rawData.cohortParams?.continuousDecay ?? initialData.cohortParams.continuousDecay,
      cpi: rawData.cohortParams?.cpi ?? rawData.simulatorParams?.cpi ?? initialData.cohortParams.cpi,
      conversionRate: rawData.cohortParams?.conversionRate ?? rawData.simulatorParams?.conversionRate ?? initialData.cohortParams.conversionRate,
      monthlyAdBudgets: rawData.cohortParams?.monthlyAdBudgets ?? initialData.cohortParams.monthlyAdBudgets,
    },
  }

  const updatePointConfig: AppContextType['updatePointConfig'] = (config) =>
    setData(prev => ({ ...prev, pointConfig: { ...prev.pointConfig, ...config } }))

  const updatePurchasePlans: AppContextType['updatePurchasePlans'] = (payment, plans) =>
    setData(prev => ({ ...prev, purchasePlans: { ...prev.purchasePlans, [payment]: plans } }))

  const updatePlansScenario: AppContextType['updatePlansScenario'] = (field, payment, plans) =>
    setData(prev => ({ ...prev, [field]: { ...prev[field], [payment]: plans } }))

  const updateRanksScenario: AppContextType['updateRanksScenario'] = (field, ranks) =>
    setData(prev => ({ ...prev, [field]: ranks }))

  const updatePerformerRanks: AppContextType['updatePerformerRanks'] = (ranks) =>
    setData(prev => ({ ...prev, performerRanks: ranks }))

  const updateSimulatorParams: AppContextType['updateSimulatorParams'] = (params) =>
    setData(prev => ({ ...prev, simulatorParams: { ...prev.simulatorParams, ...params } }))

  const updateCohortParams: AppContextType['updateCohortParams'] = (params) =>
    setData(prev => ({ ...prev, cohortParams: { ...prev.cohortParams, ...params } }))

  const updateAgencies: AppContextType['updateAgencies'] = (agencies) =>
    setData(prev => ({ ...prev, agencies }))

  const updateReports: AppContextType['updateReports'] = (reports) =>
    setData(prev => ({ ...prev, reports }))

  const updatePaymentOrder: AppContextType['updatePaymentOrder'] = (order) =>
    setData(prev => ({ ...prev, paymentOrder: order }))

  const updateCampaigns: AppContextType['updateCampaigns'] = (campaigns) =>
    setData(prev => ({ ...prev, campaigns }))

  const updateBanners: AppContextType['updateBanners'] = (banners) =>
    setData(prev => ({ ...prev, banners }))

  const updateRankingTiers: AppContextType['updateRankingTiers'] = (rankingTiers) =>
    setData(prev => ({ ...prev, rankingTiers }))

  const resetToInitial = () => setData(initialData)

  return (
    <AppContext.Provider value={{
      data, setData,
      updatePointConfig, updatePurchasePlans, updatePlansScenario, updateRanksScenario, updatePerformerRanks,
      updateSimulatorParams, updateCohortParams, updateAgencies, updateReports,
      updatePaymentOrder, updateCampaigns, updateBanners, updateRankingTiers,
      resetToInitial,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}
