import { useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { userPatterns, performerPatterns, rankingTiers, rankingNote } from '../data/campaignSeeds'
import type { Campaign } from '../types'

const STATUS_COLORS: Record<string, string> = {
  '準備中': 'bg-yellow-100 text-yellow-800',
  '開始前': 'bg-gray-100 text-gray-600',
  '実施中': 'bg-green-100 text-green-700',
  '終了': 'bg-gray-200 text-gray-500',
}

const STATUS_OPTIONS = ['開始前', '準備中', '実施中', '終了']
const WORK_OPTIONS = ['未対応', '対応中', '対応済', '対応なし', '作成前', '作成中', '作成済']
const TAG_OPTIONS = ['1通', '1文字', '有料画像', '有料動画', '画像送受信', '動画送受信', '通話']

// タグの複数選択（チェックボックス式ドロップダウン）
function TagSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const selected = value ? value.split(',').map((s) => s.trim()).filter(Boolean) : []
  const toggle = (t: string) => {
    const next = selected.includes(t) ? selected.filter((x) => x !== t) : [...selected, t]
    onChange(next.join(', '))
  }
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="border border-gray-200 rounded px-1 py-0.5 text-xs w-full text-left truncate hover:bg-gray-50"
        title={selected.join(', ')}
      >
        {selected.length ? selected.join(', ') : '—'}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded shadow-lg text-xs p-1 min-w-[120px]">
            {TAG_OPTIONS.map((t) => (
              <label key={t} className="flex items-center gap-1 px-1 py-0.5 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selected.includes(t)} onChange={() => toggle(t)} />
                {t}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function computeDays(start: string, end: string): number | null {
  const s = Date.parse(start)
  const e = Date.parse(end)
  if (isNaN(s) || isNaN(e)) return null
  return Math.floor((e - s) / 86400000) + 1
}

export function CampaignPlanner() {
  const { data, updateCampaigns } = useAppContext()
  const { campaigns } = data
  const [audience, setAudience] = useState<'user' | 'performer'>('user')
  const [showPatterns, setShowPatterns] = useState(false)

  const rows = campaigns.filter((c) => c.audience === audience)

  const update = (id: string, key: keyof Campaign, value: string | number) => {
    updateCampaigns(campaigns.map((c) => (c.id !== id ? c : { ...c, [key]: value })))
  }

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
      { id: crypto.randomUUID(), audience, category: '', title: '', durationDays: 0, start: '', end: '', pattern: '', tag: '', status: '開始前', ptDesign: '未対応', banner: '作成前', ptSetting: '未対応' },
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

      {/* ユーザー / パフォーマー 切り替え */}
      <div className="flex gap-2">
        <button
          onClick={() => setAudience('user')}
          className={`px-4 py-1.5 text-sm rounded ${audience === 'user' ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-600'}`}
        >👤 ユーザー向け</button>
        <button
          onClick={() => setAudience('performer')}
          className={`px-4 py-1.5 text-sm rounded ${audience === 'performer' ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-600'}`}
        >✨ パフォーマー向け</button>
      </div>

      <section className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="text-xs border-collapse w-full whitespace-nowrap">
          <thead>
            <tr className={audience === 'user' ? 'bg-pink-700 text-white' : 'bg-teal-700 text-white'}>
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
            {rows.map((c, i) => {
              const days = computeDays(c.start, c.end)
              return (
              <tr key={c.id} className={`border-b border-gray-100 ${i % 2 ? 'bg-gray-50' : 'bg-white'} hover:bg-indigo-50/40`}>
                <td className="px-2 py-1 text-gray-400">{i + 1}</td>
                <td className="px-1 py-1"><input value={c.category} onChange={(e) => update(c.id, 'category', e.target.value)} className="border border-gray-200 rounded px-1 py-0.5 text-xs w-full" /></td>
                <td className="px-1 py-1"><input value={c.title} onChange={(e) => update(c.id, 'title', e.target.value)} className="border border-gray-200 rounded px-1 py-0.5 text-xs w-full min-w-[260px]" /></td>
                <td className="px-1 py-1 text-center">
                  <span className="inline-block min-w-[2.5rem] font-medium text-indigo-700" title="開始・終了から自動算出">
                    {days != null ? `${days}日` : (c.durationDays ? `${c.durationDays}日` : '—')}
                  </span>
                </td>
                <td className="px-1 py-1"><input type="date" value={c.start} onChange={(e) => updateDate(c.id, 'start', e.target.value)} className="border border-gray-200 rounded px-1 py-0.5 text-xs w-full" /></td>
                <td className="px-1 py-1"><input type="date" value={c.end} onChange={(e) => updateDate(c.id, 'end', e.target.value)} className="border border-gray-200 rounded px-1 py-0.5 text-xs w-full" /></td>
                <td className="px-1 py-1"><input value={c.pattern} onChange={(e) => update(c.id, 'pattern', e.target.value)} className="border border-gray-200 rounded px-1 py-0.5 text-xs w-full" /></td>
                <td className="px-1 py-1"><TagSelect value={c.tag} onChange={(v) => update(c.id, 'tag', v)} /></td>
                <td className="px-1 py-1">
                  <select value={c.status} onChange={(e) => update(c.id, 'status', e.target.value)}
                    className={`rounded px-1 py-0.5 text-[11px] border-none outline-none ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {!STATUS_OPTIONS.includes(c.status) && <option value={c.status}>{c.status || '—'}</option>}
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <select value={c.ptDesign} onChange={(e) => update(c.id, 'ptDesign', e.target.value)} className="border border-gray-200 rounded px-1 py-0.5 text-xs w-full">
                    {!WORK_OPTIONS.includes(c.ptDesign) && <option value={c.ptDesign}>{c.ptDesign || '—'}</option>}
                    {WORK_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <select value={c.banner} onChange={(e) => update(c.id, 'banner', e.target.value)} className="border border-gray-200 rounded px-1 py-0.5 text-xs w-full">
                    {!WORK_OPTIONS.includes(c.banner) && <option value={c.banner}>{c.banner || '—'}</option>}
                    {WORK_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
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
            {rows.length === 0 && (
              <tr><td colSpan={13} className="px-3 py-6 text-center text-gray-400 text-sm">この区分のキャンペーンはありません</td></tr>
            )}
          </tbody>
        </table>
        <div className="p-3">
          <button onClick={addRow} className="text-sm text-indigo-600 hover:underline">＋ キャンペーンを追加</button>
        </div>
      </section>

      {/* パフォーマー向け: ランキングイベント */}
      {audience === 'performer' && (
        <section className="bg-white rounded-lg shadow p-4 overflow-x-auto">
          <h3 className="font-semibold text-gray-700 text-sm mb-1">🏆 ランキングイベント（順位別ボーナスPT）</h3>
          <p className="text-xs text-gray-500 mb-3">
            {rankingNote.period}（{rankingNote.start}〜{rankingNote.end}）／ {rankingNote.content}
          </p>
          <table className="text-xs border-collapse">
            <thead>
              <tr className="bg-teal-100 text-gray-700">
                <th className="px-3 py-1 text-left border border-gray-200">集計</th>
                {Array.from({ length: 10 }, (_, i) => (
                  <th key={i} className="px-3 py-1 text-center border border-gray-200">{i + 1}位</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rankingTiers.map((tier) => (
                <tr key={tier.label} className="border-b border-gray-100">
                  <td className="px-3 py-1 font-medium text-gray-700 border border-gray-200 bg-gray-50">{tier.label}</td>
                  {Array.from({ length: 10 }, (_, i) => (
                    <td key={i} className="px-3 py-1 text-right border border-gray-200">
                      {tier.points[i] != null ? `${tier.points[i].toLocaleString()}pt` : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {showPatterns && (
        <div className="grid grid-cols-1 gap-4">
          {audience === 'user' ? (
            <section className="bg-white rounded-lg shadow p-4 overflow-x-auto">
              <h3 className="font-semibold text-gray-700 text-sm mb-2">User向けパターン（CPパターン_User）</h3>
              <table className="text-[11px] border-collapse w-full">
                <thead>
                  <tr className="bg-gray-100 text-gray-600">
                    <th className="px-2 py-1 text-left">P</th><th className="px-2 py-1 text-left">内容</th>
                    <th className="px-2 py-1 text-left">対象</th><th className="px-2 py-1 text-left">回数</th><th className="px-2 py-1 text-left">特典</th>
                  </tr>
                </thead>
                <tbody>
                  {userPatterns.map((pp) => (
                    <tr key={pp.pattern} className="border-b border-gray-100">
                      <td className="px-2 py-1 font-bold text-pink-700">{pp.pattern}</td>
                      <td className="px-2 py-1">{pp.content}</td>
                      <td className="px-2 py-1">{pp.target}</td>
                      <td className="px-2 py-1">{pp.count}</td>
                      <td className="px-2 py-1">{pp.benefit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : (
            <section className="bg-white rounded-lg shadow p-4 overflow-x-auto">
              <h3 className="font-semibold text-gray-700 text-sm mb-2">Performer向けパターン（CPパターン_Performer）</h3>
              <table className="text-[11px] border-collapse w-full">
                <thead>
                  <tr className="bg-gray-100 text-gray-600">
                    <th className="px-2 py-1 text-left">P</th><th className="px-2 py-1 text-left">内容</th>
                    <th className="px-2 py-1 text-left">対象</th><th className="px-2 py-1 text-left">条件</th><th className="px-2 py-1 text-left">特典</th>
                  </tr>
                </thead>
                <tbody>
                  {performerPatterns.map((pp) => (
                    <tr key={pp.pattern} className="border-b border-gray-100">
                      <td className="px-2 py-1 font-bold text-teal-700">{pp.pattern}</td>
                      <td className="px-2 py-1">{pp.content}</td>
                      <td className="px-2 py-1">{pp.target}</td>
                      <td className="px-2 py-1">{pp.condition}</td>
                      <td className="px-2 py-1">{pp.benefit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
