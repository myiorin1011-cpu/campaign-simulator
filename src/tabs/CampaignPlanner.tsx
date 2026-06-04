import { useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { userPatterns, performerPatterns, rankingNote } from '../data/campaignSeeds'
import { inferCampaignIntent } from '../utils/calculations'
import type { Campaign } from '../types'

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  '準備中': { background: 'var(--warning-bg)', color: 'var(--warning)' },
  '開始前': { background: 'var(--bg-elevated)', color: 'var(--text-muted)' },
  '実施中': { background: 'var(--positive-bg)', color: 'var(--positive)' },
  '終了':   { background: 'var(--bg-elevated)', color: 'var(--text-muted)' },
}

const STATUS_OPTIONS = ['開始前', '準備中', '実施中', '終了']
const WORK_OPTIONS = ['未対応', '対応中', '対応済', '対応なし', '作成前', '作成中', '作成済']
const TAG_OPTIONS = ['1通', '1文字', '有償', '無償']

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
        className="input-dark px-1 py-0.5 text-xs w-full text-left truncate"
        title={selected.join(', ')}
      >
        {selected.length ? selected.join(', ') : '—'}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 rounded shadow-lg text-xs p-1 min-w-[120px]"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            {TAG_OPTIONS.map((t) => (
              <label key={t} className="flex items-center gap-1 px-1 py-0.5 cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}>
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
  const { data, updateCampaigns, updateRankingTiers } = useAppContext()
  const { campaigns, rankingTiers } = data

  const setTierPoint = (tierIdx: number, posIdx: number, value: number) => {
    updateRankingTiers(rankingTiers.map((t, ti) => {
      if (ti !== tierIdx) return t
      const points = Array.from({ length: 10 }, (_, k) => t.points[k] ?? 0)
      points[posIdx] = value
      return { ...t, points }
    }))
  }
  const [audience, setAudience] = useState<'user' | 'performer'>('user')
  const [showPatterns, setShowPatterns] = useState(false)
  const [editing, setEditing] = useState<Campaign | null>(null)

  const saveEditing = () => {
    if (!editing) return
    updateCampaigns(campaigns.map((c) => (c.id !== editing.id ? c : editing)))
    setEditing(null)
  }

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
      { id: crypto.randomUUID(), audience, category: '', title: '', durationDays: 0, start: '', end: '', pattern: '', tag: '', status: '開始前', ptDesign: '未対応', banner: '作成前', ptSetting: '未対応', scenarioRef: '' as const },
    ])
  }

  const remove = (id: string) => updateCampaigns(campaigns.filter((c) => c.id !== id))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="page-title">キャンペーン企画</h2>
        <button onClick={() => setShowPatterns((v) => !v)}
          className="text-sm hover:underline" style={{ color: 'var(--accent-light)' }}>
          {showPatterns ? 'パターン一覧を隠す' : 'パターン一覧を表示'}
        </button>
      </div>

      {/* ユーザー / パフォーマー 切り替え */}
      <div className="flex gap-2">
        <button
          onClick={() => setAudience('user')}
          className={`px-4 py-1.5 text-sm rounded ${audience === 'user' ? 'btn-primary' : 'btn-ghost'}`}
        >👤 ユーザー向け</button>
        <button
          onClick={() => setAudience('performer')}
          className={`px-4 py-1.5 text-sm rounded ${audience === 'performer' ? 'btn-primary' : 'btn-ghost'}`}
        >✨ パフォーマー向け</button>
      </div>

      <section className="card overflow-x-auto" style={{ padding: 0 }}>
        <table className="table-dark text-xs whitespace-nowrap" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)', borderBottom: '2px solid var(--accent)', color: 'var(--text-muted)' }}>
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
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 ? 'var(--bg-elevated)' : 'var(--bg-card)' }}>
                <td className="px-2 py-1" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                <td className="px-1 py-1"><input value={c.category} onChange={(e) => update(c.id, 'category', e.target.value)} className="input-dark px-1 py-0.5 text-xs w-full" /></td>
                <td className="px-1 py-1"><input value={c.title} onChange={(e) => update(c.id, 'title', e.target.value)} className="input-dark px-1 py-0.5 text-xs w-full min-w-[260px]" /></td>
                <td className="px-1 py-1 text-center">
                  <span className="inline-block min-w-[2.5rem] font-medium font-mono-num" style={{ color: 'var(--accent-light)' }} title="開始・終了から自動算出">
                    {days != null ? `${days}日` : (c.durationDays ? `${c.durationDays}日` : '—')}
                  </span>
                </td>
                <td className="px-1 py-1"><input type="date" value={c.start} onChange={(e) => updateDate(c.id, 'start', e.target.value)} className="input-dark px-1 py-0.5 text-xs w-full" /></td>
                <td className="px-1 py-1"><input type="date" value={c.end} onChange={(e) => updateDate(c.id, 'end', e.target.value)} className="input-dark px-1 py-0.5 text-xs w-full" /></td>
                <td className="px-1 py-1"><input value={c.pattern} onChange={(e) => update(c.id, 'pattern', e.target.value)} className="input-dark px-1 py-0.5 text-xs w-full" /></td>
                <td className="px-1 py-1"><TagSelect value={c.tag} onChange={(v) => update(c.id, 'tag', v)} /></td>
                <td className="px-1 py-1">
                  <select value={c.status} onChange={(e) => update(c.id, 'status', e.target.value)}
                    className="rounded px-1 py-0.5 text-[11px] border-none outline-none"
                    style={STATUS_STYLES[c.status] ?? { background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                    {!STATUS_OPTIONS.includes(c.status) && <option value={c.status}>{c.status || '—'}</option>}
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <select value={c.ptDesign} onChange={(e) => update(c.id, 'ptDesign', e.target.value)} className="input-dark px-1 py-0.5 text-xs w-full">
                    {!WORK_OPTIONS.includes(c.ptDesign) && <option value={c.ptDesign}>{c.ptDesign || '—'}</option>}
                    {WORK_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <select value={c.banner} onChange={(e) => update(c.id, 'banner', e.target.value)} className="input-dark px-1 py-0.5 text-xs w-full">
                    {!WORK_OPTIONS.includes(c.banner) && <option value={c.banner}>{c.banner || '—'}</option>}
                    {WORK_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <select value={c.ptSetting} onChange={(e) => update(c.id, 'ptSetting', e.target.value)} className="input-dark px-1 py-0.5 text-xs w-full">
                    {!WORK_OPTIONS.includes(c.ptSetting) && <option value={c.ptSetting}>{c.ptSetting || '—'}</option>}
                    {WORK_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1 text-center flex gap-1">
                  <button onClick={() => setEditing(c)} className="text-xs" style={{ color: 'var(--accent-light)' }}>編集</button>
                  <button onClick={() => remove(c.id)} className="text-xs" style={{ color: 'var(--negative)' }}>削除</button>
                </td>
              </tr>
              )
            })}
            {rows.length === 0 && (
              <tr><td colSpan={13} className="px-3 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>この区分のキャンペーンはありません</td></tr>
            )}
          </tbody>
        </table>
        <div className="p-3">
          <button onClick={addRow} className="text-sm hover:underline" style={{ color: 'var(--accent-light)' }}>＋ キャンペーンを追加</button>
        </div>
      </section>

      {/* 編集フォーム */}
      {editing && (
        <section className="card space-y-3">
          <h3 className="section-title">キャンペーン編集</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>タイトル</label>
              <input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="input-dark px-2 py-1 text-xs w-full"
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>pt設計</label>
              <select
                value={editing.ptDesign}
                onChange={(e) => setEditing({ ...editing, ptDesign: e.target.value })}
                className="input-dark px-2 py-1 text-xs w-full"
              >
                {WORK_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>対応シナリオ</label>
              <select
                value={editing.scenarioRef}
                onChange={(e) =>
                  setEditing({ ...editing, scenarioRef: e.target.value as '' | 'campaign1' | 'campaign2' })
                }
                className="input-dark px-2 py-1 text-xs w-full"
              >
                <option value="">未設定</option>
                <option value="campaign1">キャンペーン設定1</option>
                <option value="campaign2">キャンペーン設定2</option>
              </select>
            </div>
          </div>
          {/* 自動生成: ポイント設計分析 */}
          {(() => {
            const analysis = inferCampaignIntent(editing, data.pointConfig, {
              base:      data.purchasePlans,
              campaign1: data.purchasePlans1,
              campaign2: data.purchasePlans2,
            })
            if (!analysis) return null
            return (
              <div className="mt-2 p-3 rounded-lg" style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning)' }}>
                <div className="text-xs font-semibold mb-2" style={{ color: 'var(--warning)' }}>📊 ポイント設計分析（自動生成）</div>
                <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <div>
                    <span className="font-medium" style={{ color: 'var(--text-muted)' }}>設計意図　</span>
                    {analysis.intent}
                  </div>
                  <div>
                    <span className="font-medium" style={{ color: 'var(--text-muted)' }}>目的　　　</span>
                    {analysis.purpose}
                  </div>
                  <div>
                    <span className="font-medium" style={{ color: 'var(--text-muted)' }}>期待効果　</span>
                    <span style={analysis.expectedEffect.includes('+') ? { color: 'var(--purple)', fontWeight: 600 } : {}}>
                      {analysis.expectedEffect}
                    </span>
                  </div>
                </div>
              </div>
            )
          })()}
          <div className="flex gap-2">
            <button onClick={saveEditing} className="btn-primary px-3 py-1 text-xs">保存</button>
            <button onClick={() => setEditing(null)} className="btn-ghost px-3 py-1 text-xs">キャンセル</button>
          </div>
        </section>
      )}

      {/* パフォーマー向け: ランキングイベント */}
      {audience === 'performer' && (
        <section className="card overflow-x-auto">
          <h3 className="section-title mb-1">🏆 ランキングイベント（順位別ボーナスPT）</h3>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            {rankingNote.period}（{rankingNote.start}〜{rankingNote.end}）／ {rankingNote.content}
          </p>
          <table className="table-dark text-xs" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                <th className="px-3 py-1 text-left" style={{ border: '1px solid var(--border)' }}>集計</th>
                {Array.from({ length: 10 }, (_, i) => (
                  <th key={i} className="px-3 py-1 text-center" style={{ border: '1px solid var(--border)' }}>{i + 1}位</th>
                ))}
                <th className="px-3 py-1 text-center" style={{ border: '1px solid var(--border)', background: 'var(--accent-dim)', color: 'var(--accent-light)' }}>合計報酬</th>
              </tr>
            </thead>
            <tbody>
              {rankingTiers.map((tier, ti) => (
                <tr key={tier.label} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="px-3 py-1 font-medium" style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>{tier.label}</td>
                  {Array.from({ length: 10 }, (_, i) => (
                    <td key={i} className="px-1 py-1 text-right" style={{ border: '1px solid var(--border)' }}>
                      <input
                        type="number" min={0}
                        value={tier.points[i] ?? 0}
                        onChange={(e) => setTierPoint(ti, i, parseInt(e.target.value) || 0)}
                        className="input-dark w-16 px-1 py-0.5 text-xs text-right tabular-nums"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-1 text-right font-bold tabular-nums font-mono-num" style={{ border: '1px solid var(--border)', background: 'var(--accent-dim)', color: 'var(--accent-light)' }}>
                    {Array.from({ length: 10 }, (_, k) => tier.points[k] ?? 0).reduce((s, v) => s + v, 0).toLocaleString()} pt
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {showPatterns && (
        <div className="grid grid-cols-1 gap-4">
          {audience === 'user' ? (
            <section className="card overflow-x-auto">
              <h3 className="section-title mb-2">User向けパターン（CPパターン_User）</h3>
              <table className="table-dark text-[11px]" style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                    <th className="px-2 py-1 text-left">P</th><th className="px-2 py-1 text-left">内容</th>
                    <th className="px-2 py-1 text-left">対象</th><th className="px-2 py-1 text-left">回数</th><th className="px-2 py-1 text-left">特典</th>
                  </tr>
                </thead>
                <tbody>
                  {userPatterns.map((pp) => (
                    <tr key={pp.pattern} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="px-2 py-1 font-bold" style={{ color: '#f472b6' }}>{pp.pattern}</td>
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
            <section className="card overflow-x-auto">
              <h3 className="section-title mb-2">Performer向けパターン（CPパターン_Performer）</h3>
              <table className="table-dark text-[11px]" style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                    <th className="px-2 py-1 text-left">P</th><th className="px-2 py-1 text-left">内容</th>
                    <th className="px-2 py-1 text-left">対象</th><th className="px-2 py-1 text-left">条件</th><th className="px-2 py-1 text-left">特典</th>
                  </tr>
                </thead>
                <tbody>
                  {performerPatterns.map((pp) => (
                    <tr key={pp.pattern} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="px-2 py-1 font-bold" style={{ color: '#2dd4bf' }}>{pp.pattern}</td>
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
