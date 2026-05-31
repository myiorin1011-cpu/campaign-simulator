import { createContext, useContext, type ReactNode } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { initialData } from '../data/initialData'
import type { AppData } from '../types'

interface AppContextType {
  data: AppData
  setData: (data: AppData) => void
  updatePointConfig: (config: Partial<AppData['pointConfig']>) => void
  updatePurchasePlans: (payment: keyof AppData['purchasePlans'], plans: AppData['purchasePlans'][typeof payment]) => void
  updatePerformerRanks: (ranks: AppData['performerRanks']) => void
  updateSimulatorParams: (params: Partial<AppData['simulatorParams']>) => void
  updateCohortParams: (params: Partial<AppData['cohortParams']>) => void
  updateAgencies: (agencies: AppData['agencies']) => void
  updateReports: (reports: AppData['reports']) => void
  updatePaymentOrder: (order: AppData['paymentOrder']) => void
  resetToInitial: () => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [rawData, setData] = useLocalStorage<AppData>('campaign-simulator-data', initialData)

  // LocalStorageの古いデータに新フィールドが欠けていても安全に扱うための移行処理
  const mergedPlans = {
    ...rawData.purchasePlans,
    // 旧LocalStorageに新決済種別が無い場合は初期値で補完
    credix: rawData.purchasePlans?.credix ?? initialData.purchasePlans.credix,
    amazonpay: rawData.purchasePlans?.amazonpay ?? initialData.purchasePlans.amazonpay,
  }
  // 並び順: 旧データを尊重しつつ、初期順の未登録決済を末尾に追加
  const rawOrder = rawData.paymentOrder ?? []
  const mergedOrder = [
    ...rawOrder.filter((m) => m in mergedPlans),
    ...initialData.paymentOrder.filter((m) => !rawOrder.includes(m)),
  ]

  const data: AppData = {
    ...rawData,
    reports: rawData.reports ?? [],
    purchasePlans: mergedPlans,
    paymentOrder: mergedOrder,
    simulatorParams: {
      ...initialData.simulatorParams,
      ...rawData.simulatorParams,
      // 旧データに新フィールドが無い場合は初期値で補完
      monthlyMessages: rawData.simulatorParams?.monthlyMessages ?? initialData.simulatorParams.monthlyMessages,
      monthlyPaidOpens: rawData.simulatorParams?.monthlyPaidOpens ?? initialData.simulatorParams.monthlyPaidOpens,
    },
  }

  const updatePointConfig: AppContextType['updatePointConfig'] = (config) =>
    setData(prev => ({ ...prev, pointConfig: { ...prev.pointConfig, ...config } }))

  const updatePurchasePlans: AppContextType['updatePurchasePlans'] = (payment, plans) =>
    setData(prev => ({ ...prev, purchasePlans: { ...prev.purchasePlans, [payment]: plans } }))

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

  const resetToInitial = () => setData(initialData)

  return (
    <AppContext.Provider value={{
      data, setData,
      updatePointConfig, updatePurchasePlans, updatePerformerRanks,
      updateSimulatorParams, updateCohortParams, updateAgencies, updateReports,
      updatePaymentOrder,
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
