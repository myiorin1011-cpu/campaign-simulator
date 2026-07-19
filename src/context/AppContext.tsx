import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { initialData } from '../data/initialData'
import type { AppData } from '../types'
import { fetchRemoteData, fetchRemoteMeta, pushRemoteData, type SyncStatus } from '../utils/sync'

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
  // ── 共有同期 ──
  syncStatus: SyncStatus
  lastUpdatedAt: string | null
  lastUpdatedBy: string | null
  userName: string
  setUserName: (n: string) => void
  syncNow: () => void
}

const AppContext = createContext<AppContextType | null>(null)

const USER_KEY = 'paigner-user'
const POLL_INTERVAL_MS = 10000
const SAVE_DEBOUNCE_MS = 1500

// LocalStorageの古いデータに新フィールドが欠けていても安全に扱うための移行処理。
// リモート(KV)から受け取ったデータも必ずこの関数を通す。
export function migrateData(rawInput: AppData): AppData {
  // 旧LocalStorageのプランに storeFeeRate が無い場合の既定値
  const rawData = (rawInput ?? {}) as AppData

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

  return {
    ...rawData,
    pointConfig: { ...initialData.pointConfig, ...rawData.pointConfig },
    performerRanks: rawData.performerRanks ?? initialData.performerRanks,
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
}

export function AppProvider({ children }: { children: ReactNode }) {
  // LocalStorage への保存は従来どおり継続（オフライン／同期OFF時のフォールバック兼キャッシュ）
  const [rawData, setData] = useLocalStorage<AppData>('campaign-simulator-data', initialData)

  const data: AppData = migrateData(rawData)

  // ── 共有同期の状態 ──────────────────────────────
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('off')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [lastUpdatedBy, setLastUpdatedBy] = useState<string | null>(null)
  const [userName, setUserNameState] = useState<string>(() => {
    try { return localStorage.getItem(USER_KEY) ?? '' } catch { return '' }
  })

  const setUserName = useCallback((n: string) => {
    setUserNameState(n)
    try { localStorage.setItem(USER_KEY, n) } catch { /* 使えない環境では無視 */ }
  }, [])

  // 最新値を effect 内から参照するための ref（依存配列を安定させる）
  const dataRef = useRef(data)
  dataRef.current = data
  const userNameRef = useRef(userName)
  userNameRef.current = userName
  const syncStatusRef = useRef(syncStatus)
  syncStatusRef.current = syncStatus

  // サーバーに保存されている最新の updatedAt（自分の書き込みを含む）
  const lastSyncedAtRef = useRef<string | null>(null)
  // リモート適用直後の data 変更で PUT し返さないための抑止フラグ（同期ループ防止）
  const applyingRemoteRef = useRef(false)
  const firstRenderRef = useRef(true)

  const applyRemote = useCallback((record: { data: unknown; updatedAt: string | null; updatedBy: string | null }) => {
    applyingRemoteRef.current = true
    setData(migrateData(record.data as AppData))
    lastSyncedAtRef.current = record.updatedAt
    setLastUpdatedAt(record.updatedAt)
    setLastUpdatedBy(record.updatedBy)
    // 直後の保存 effect をスキップさせたあとに解除
    setTimeout(() => { applyingRemoteRef.current = false }, 0)
  }, [setData])

  // ── 初回マウント: リモートの状態を確認 ──────────
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const record = await fetchRemoteData()
      if (cancelled) return
      if (!record) {
        // KV未設定 or 通信失敗 → 以降の同期処理は一切走らせない
        setSyncStatus('off')
        return
      }
      if (record.data != null) {
        applyRemote(record)
        setSyncStatus('idle')
      } else {
        // サーバー未保存 → 現在のローカルデータを初回アップロード
        const updatedAt = await pushRemoteData(dataRef.current, userNameRef.current)
        if (cancelled) return
        lastSyncedAtRef.current = updatedAt
        setLastUpdatedAt(updatedAt)
        setLastUpdatedBy(userNameRef.current)
        setSyncStatus('idle')
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 保存: data 変更を 1500ms デバウンスして PUT ──
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false
      return
    }
    if (syncStatusRef.current === 'off') return
    if (applyingRemoteRef.current) return // リモート適用直後は送り返さない

    const timer = setTimeout(() => {
      if (syncStatusRef.current === 'off') return
      void (async () => {
        setSyncStatus('saving')
        const updatedAt = await pushRemoteData(dataRef.current, userNameRef.current)
        if (updatedAt) {
          lastSyncedAtRef.current = updatedAt
          setLastUpdatedAt(updatedAt)
          setLastUpdatedBy(userNameRef.current)
          setSyncStatus('idle')
        } else {
          setSyncStatus('error')
        }
      })()
    }, SAVE_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [rawData])

  // ── ポーリング: 10秒ごとに meta を確認 ──────────
  const syncEnabled = syncStatus !== 'off'
  useEffect(() => {
    if (!syncEnabled) return
    const id = setInterval(() => {
      void (async () => {
        // 保存中は競合を避けるため適用しない
        const status = (): SyncStatus => syncStatusRef.current
        if (status() === 'saving' || status() === 'off') return
        const meta = await fetchRemoteMeta()
        if (!meta || !meta.updatedAt) return
        if (meta.updatedAt === lastSyncedAtRef.current) return
        if (status() === 'saving') return
        const record = await fetchRemoteData()
        if (!record || record.data == null) return
        if (status() === 'saving') return
        if (record.updatedAt === lastSyncedAtRef.current) return
        applyRemote(record)
      })()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [syncEnabled, applyRemote])

  // ── 手動同期 ────────────────────────────────────
  const syncNow = useCallback(() => {
    void (async () => {
      const meta = await fetchRemoteMeta()
      if (!meta) return
      const record = await fetchRemoteData()
      if (!record || record.data == null) return
      applyRemote(record)
      setSyncStatus('idle')
    })()
  }, [applyRemote])

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
      syncStatus, lastUpdatedAt, lastUpdatedBy, userName, setUserName, syncNow,
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
