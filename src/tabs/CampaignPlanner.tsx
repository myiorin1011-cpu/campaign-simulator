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

const COLS: { key: keyof Campaign; label: string; w: string }[] = [
  { key: 'category', label: '種別', w: 'w-20' },
  { key: 'title', label: 'タイトル', w: 'min-w-[260px]' },
  { key: 'durationDays', label: '期間(日)', w: 'w-16' },
  { key: 'start', label: '開始', w: 'w-24' },
  { key: 'end', label: '終了', w: 'w-24' },
  { key: 'pattern', label: 'パターン', w: 'w-20' },
  { key: 'tag', label: 'タグ', w: 'w-24' },
  { key: 'status', label: 'ステータス', w: 'w-24' },
  { key: 'ptDesign', label: 'pt設計', w: 'w-20' },
  { key: 'banner', label: 'バナー', w: 'w-20' },
  { key: 'ptSetting', label: 'pt設定', w: 'w-20' },
]

export function CampaignPlanner() {
  const { data, updateCampaigns } = useAppContext()
  const { campaigns } = data
  const [showPatterns, setShowPatterns] = useState(false)

  const update = (id: string, key: keyof Campaign, value: string | number) => {
    updateCampaigns(campaigns.map((c) => (c.id !== id ? c : { ...c, [key]: value })))
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
              {COLS.map((col) => (
                <th key={col.key} className={`px-2 py-2 text-left ${col.w}`}>{col.label}</th>
              ))}
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c, i) => (
              <tr key={c.id} className={`border-b border-gray-100 ${i % 2 ? 'bg-gray-50' : 'bg-white'} hover:bg-indigo-50/40`}>
                <td className="px-2 py-1 text-gray-400">{i + 1}</td>
                {COLS.map((col) => (
                  <td key={col.key} className="px-1 py-1">
                    {col.key === 'status' ? (
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        <input
                          value={c.status}
                          onChange={(e) => update(c.id, 'status', e.target.value)}
                          className="bg-transparent outline-none w-20 text-center"
                        />
                      </span>
                    ) : (
                      <input
                        type={col.key === 'durationDays' ? 'number' : 'text'}
                        value={c[col.key]}
                        onChange={(e) => update(c.id, col.key, col.key === 'durationDays' ? (parseInt(e.target.value) || 0) : e.target.value)}
                        className={`border border-gray-200 rounded px-1 py-0.5 text-xs ${col.w === 'min-w-[260px]' ? 'w-full min-w-[260px]' : 'w-full'}`}
                      />
                    )}
                  </td>
                ))}
                <td className="px-1 py-1 text-center">
                  <button onClick={() => remove(c.id)} className="text-red-400 hover:text-red-600 text-xs">削除</button>
                </td>
              </tr>
            ))}
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
