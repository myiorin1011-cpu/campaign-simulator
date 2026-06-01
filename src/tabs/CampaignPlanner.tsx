import { useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { userPatterns, performerPatterns } from '../data/campaignSeeds'
import type { Campaign } from '../types'

const STATUS_COLORS: Record<string, string> = {
  '準備中': 'bg-yellow-100 text-yellow-800',
  '開始前': 'bg-gray-100 text-gray-600',
  '実施中': 'bg-green-100 text-green-700',
  '終了': 'bg-gray-200 text-gray-500',
}

const STATUS_OPTIONS = ['開始前', '準備中', '実施中', '終了']
// pt設計・バナー・pt設定 共通の進捗プルダウン
const WORK_OPTIONS = ['未対応', '対応中', '対応済', '対応なし', '作成前', '作成中', '作成済']

// 開始〜終了の日数（両端含む）を算出。日付未入力なら null
function computeDays(start: string, end: string): number | null {
  const s = Date.parse(start)
  const e = Date.parse(end)
  if (isNaN(s) || isNaN(e)) return null
  return Math.floor((e - s) / 86400000) + 1
}

export function CampaignPlanner() {
  const { data, updateCampaigns } = useAppContext()
  const { campaigns } = data
  const [showPatterns, setShowPatterns] = useState(false)

  const update = (id: string, key: keyof Campaign, value: string | number) => {
    updateCampaigns(campaigns.map((c) => (c.id !== id ? c : { ...c, [key]: value })))
  }

  // 開始/終了の変更時、両方そろっていれば期間日数を自動算出
  const updateDate = (id: string, key: 'start' | 'end', value: string) => {
    updateCampaigns(campaigns.map((c) => {
      if (c.id !== id) return c
      const next = { ...c, [key]: value }
      const days = computeDays(next.start, next.end)
      return days != null ? { ...next, durationDays: days } : next
    }))
  }

  const addRow = () => {
    updateCampaigns([
      ...campaigns,
      { id: crypto.randomUUID(), category: '', title: '', durationDays: 0, start: '', end: '', pattern: '', tag: '', status: '開始前', ptDesign: '未対応', banner: '作成前', ptSetting: '未対応' },
    ])
  }

  const remove = (id: string) => updateCampaigns(campaigns.filter((c) => c.id !== id))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">キャンペーン企画</h2>
        <button onClick={() => setShowPatterns((v) => !v)} className="text-sm text-indigo-600 hover:underline">
          {showPatterns ? 'パターン一覧を隠す' : 'パターン一覧を表示'}
        </button>
      </div>

      <section className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="text-xs border-collapse w-full whitespace-nowrap">
          <thead>
            <tr className="bg-indigo-700 text-white">
              <th className="px-2 py-2 text-left">No</th>
              <th className="px-2 py-2 text-left w-20">種別</th>
              <th className="px-2 py-2 text-left min-w-[260px]">タイトル</th>
              <th className="px-2 py-2 text-left w-16">期間(日)</th>
              <th className="px-2 py-2 text-left w-32">開始</th>
              <th className="px-2 py-2 text-left w-32">終了</th>
              <th className="px-2 py-2 text-left w-20">パターン</th>
              <th className="px-2 py-2 text-left w-24">タグ</th>
              <th className="px-2 py-2 text-left w-24">ステータス</th>
              <th className="px-2 py-2 text-left w-20">pt設計</th>
              <th className="px-2 py-2 text-left w-20">バナー</th>
              <th className="px-2 py-2 text-left w-20">pt設定</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c, i) => {
              const days = computeDays(c.start, c.end)
              return (
              <tr key={c.id} className={`border-b border-gray-100 ${i % 2 ? 'bg-gray-50' : 'bg-white'} hover:bg-indigo-50/40`}>
                <td className="px-2 py-1 text-gray-400">{i + 1}</td>
                {/* 種別 */}
                <td className="px-1 py-1"><input value={c.category} onChange={(e) => update(c.id, 'category', e.target.value)} className="border border-gray-200 rounded px-1 py-0.5 text-xs w-full" /></td>
                {/* タイトル */}
                <td className="px-1 py-1"><input value={c.title} onChange={(e) => update(c.id, 'title', e.target.value)} className="border border-gray-200 rounded px-1 py-0.5 text-xs w-full min-w-[260px]" /></td>
                {/* 期間(日) 自動算出（読み取り専用） */}
                <td className="px-1 py-1 text-center">
                  <span className="inline-block min-w-[2.5rem] font-medium text-indigo-700" title="開始・終了から自動算出">
                    {days != null ? `${days}日` : (c.durationDays ? `${c.durationDays}日` : '—')}
                  </span>
                </td>
                {/* 開始（カレンダー） */}
                <td className="px-1 py-1"><input type="date" value={c.start} onChange={(e) => updateDate(c.id, 'start', e.target.value)} className="border border-gray-200 rounded px-1 py-0.5 text-xs w-full" /></td>
                {/* 終了（カレンダー） */}
                <td className="px-1 py-1"><input type="date" value={c.end} onChange={(e) => updateDate(c.id, 'end', e.target.value)} className="border border-gray-200 rounded px-1 py-0.5 text-xs w-full" /></td>
                {/* パターン */}
                <td className="px-1 py-1"><input value={c.pattern} onChange={(e) => update(c.id, 'pattern', e.target.value)} className="border border-gray-200 rounded px-1 py-0.5 text-xs w-full" /></td>
                {/* タグ */}
                <td className="px-1 py-1"><input value={c.tag} onChange={(e) => update(c.id, 'tag', e.target.value)} className="border border-gray-200 rounded px-1 py-0.5 text-xs w-full" /></td>
                {/* ステータス */}
                <td className="px-1 py-1">
                  <select
                    value={c.status}
                    onChange={(e) => update(c.id, 'status', e.target.value)}
                    className={`rounded px-1 py-0.5 text-[11px] border-none outline-none ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {!STATUS_OPTIONS.includes(c.status) && <option value={c.status}>{c.status || '—'}</option>}
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                {/* pt設計 */}
                <td className="px-1 py-1">
                  <select value={c.ptDesign} onChange={(e) => update(c.id, 'ptDesign', e.target.value)} className="border border-gray-200 rounded px-1 py-0.5 text-xs w-full">
                    {!WORK_OPTIONS.includes(c.ptDesign) && <option value={c.ptDesign}>{c.ptDesign || '—'}</option>}
                    {WORK_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                {/* バナー */}
                <td className="px-1 py-1">
                  <select value={c.banner} onChange={(e) => update(c.id, 'banner', e.target.value)} className="border border-gray-200 rounded px-1 py-0.5 text-xs w-full">
                    {!WORK_OPTIONS.includes(c.banner) && <option value={c.banner}>{c.banner || '—'}</option>}
                    {WORK_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                {/* pt設定 */}
                <td className="px-1 py-1">
                  <select value={c.ptSetting} onChange={(e) => update(c.id, 'ptSetting', e.target.value)} className="border border-gray-200 rounded px-1 py-0.5 text-xs w-full">
                    {!WORK_OPTIONS.includes(c.ptSetting) && <option value={c.ptSetting}>{c.ptSetting || '—'}</option>}
                    {WORK_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1 text-center">
                  <button onClick={() => remove(c.id)} className="text-red-400 hover:text-red-600 text-xs">削除</button>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
        <div className="p-3">
          <button onClick={addRow} className="text-sm text-indigo-600 hover:underline">＋ キャンペーンを追加</button>
        </div>
      </section>

      {showPatterns && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="bg-white rounded-lg shadow p-4 overflow-x-auto">
            <h3 className="font-semibold text-gray-700 text-sm mb-2">User向けパターン</h3>
            <table className="text-[11px] border-collapse w-full">
              <thead>
                <tr className="bg-gray-100 text-gray-600">
                  <th className="px-2 py-1 text-left">P</th><th className="px-2 py-1 text-left">内容</th>
                  <th className="px-2 py-1 text-left">対象</th><th className="px-2 py-1 text-left">回数</th><th className="px-2 py-1 text-left">特典</th>
                </tr>
              </thead>
              <tbody>
                {userPatterns.map((p) => (
                  <tr key={p.pattern} className="border-b border-gray-100">
                    <td className="px-2 py-1 font-bold text-indigo-700">{p.pattern}</td>
                    <td className="px-2 py-1">{p.content}</td>
                    <td className="px-2 py-1">{p.target}</td>
                    <td className="px-2 py-1">{p.count}</td>
                    <td className="px-2 py-1">{p.benefit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="bg-white rounded-lg shadow p-4 overflow-x-auto">
            <h3 className="font-semibold text-gray-700 text-sm mb-2">Performer向けパターン</h3>
            <table className="text-[11px] border-collapse w-full">
              <thead>
                <tr className="bg-gray-100 text-gray-600">
                  <th className="px-2 py-1 text-left">P</th><th className="px-2 py-1 text-left">内容</th>
                  <th className="px-2 py-1 text-left">対象</th><th className="px-2 py-1 text-left">条件</th><th className="px-2 py-1 text-left">特典</th>
                </tr>
              </thead>
              <tbody>
                {performerPatterns.map((p) => (
                  <tr key={p.pattern} className="border-b border-gray-100">
                    <td className="px-2 py-1 font-bold text-indigo-700">{p.pattern}</td>
                    <td className="px-2 py-1">{p.content}</td>
                    <td className="px-2 py-1">{p.target}</td>
                    <td className="px-2 py-1">{p.condition}</td>
                    <td className="px-2 py-1">{p.benefit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </div>
  )
}
