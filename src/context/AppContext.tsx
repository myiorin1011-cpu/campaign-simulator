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
  resetToInitial: () => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useLocalStorage<AppData>('campaign-simulator-data', initialData)

  const updatePointConfig: AppContextType['updatePointConfig'] = (config) =>
    setData({ ...data, pointConfig: { ...data.pointConfig, ...config } })

  const updatePurchasePlans: AppContextType['updatePurchasePlans'] = (payment, plans) =>
    setData({ ...data, purchasePlans: { ...data.purchasePlans, [payment]: plans } })

  const updatePerformerRanks: AppContextType['updatePerformerRanks'] = (ranks) =>
    setData({ ...data, performerRanks: ranks })

  const updateSimulatorParams: AppContextType['updateSimulatorParams'] = (params) =>
    setData({ ...data, simulatorParams: { ...data.simulatorParams, ...params } })

  const updateCohortParams: AppContextType['updateCohortParams'] = (params) =>
    setData({ ...data, cohortParams: { ...data.cohortParams, ...params } })

  const updateAgencies: AppContextType['updateAgencies'] = (agencies) =>
    setData({ ...data, agencies })

  const resetToInitial = () => setData(initialData)

  return (
    <AppContext.Provider value={{
      data, setData,
      updatePointConfig, updatePurchasePlans, updatePerformerRanks,
      updateSimulatorParams, updateCohortParams, updateAgencies,
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
