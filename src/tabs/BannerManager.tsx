import { useAppContext } from '../context/AppContext'
import type { Banner } from '../types'

const STATUS_OPTIONS = ['', '作成前', '作成中', '確認中', '完成', '適用中', '停止中']

export function BannerManager() {
  const { data, updateBanners } = useAppContext()
  const { banners } = data

  const update = (id: string, key: keyof Banner, value: string) => {
    updateBanners(banners.map((b) => (b.id !== id ? b : { ...b, [key]: value })))
  }

  const addRow = () => {
    updateBanners([
      ...banners,
      { id: crypto.randomUUID(), category: '', event: '', userText: '', userBanner: '', userLink: '', userStatus: '', performerText: '', performerBanner: '', performerLink: '', performerStatus: '' },
    ])
  }

  const remove = (id: string) => updateBanners(banners.filter((b) => b.id !== id))

  return (
    <div className="space-y-6">
      <h2 className="page-title">キャンペーンバナー管理</h2>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        ※ 完成バナー(375×131)は画像URL／ドライブのリンクを貼り付けてください。リンク先・ステータスも管理できます。
      </p>

      <section className="card overflow-x-auto" style={{ padding: 0 }}>
        <table className="table-dark text-xs whitespace-nowrap" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ background: 'var(--accent)', color: '#fff' }}>
              <th className="px-2 py-2 text-left w-20">月/種別</th>
              <th className="px-2 py-2 text-left w-28">イベント</th>
              <th className="px-2 py-2 text-left" colSpan={4} style={{ background: '#9d174d' }}>ユーザー</th>
              <th className="px-2 py-2 text-left" colSpan={4} style={{ background: '#0f766e' }}>パフォーマー</th>
              <th className="px-2 py-2"></th>
            </tr>
            <tr style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              <th></th><th></th>
              <th className="px-2 py-1 text-left">訴求文</th>
              <th className="px-2 py-1 text-left">完成バナー(URL)</th>
              <th className="px-2 py-1 text-left">リンク先</th>
              <th className="px-2 py-1 text-left">状態</th>
              <th className="px-2 py-1 text-left">訴求文</th>
              <th className="px-2 py-1 text-left">完成バナー(URL)</th>
              <th className="px-2 py-1 text-left">リンク先</th>
              <th className="px-2 py-1 text-left">状態</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {banners.map((b, i) => (
              <tr key={b.id} className="align-top" style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 ? 'var(--bg-elevated)' : 'var(--bg-card)' }}>
                <td className="px-1 py-1"><input value={b.category} onChange={(e) => update(b.id, 'category', e.target.value)} className="input-dark w-16 px-1 py-0.5 text-xs" /></td>
                <td className="px-1 py-1"><input value={b.event} onChange={(e) => update(b.id, 'event', e.target.value)} className="input-dark w-24 px-1 py-0.5 text-xs" /></td>
                {/* User */}
                <td className="px-1 py-1" style={{ background: 'rgba(157,23,77,0.08)' }}><textarea rows={2} value={b.userText} onChange={(e) => update(b.id, 'userText', e.target.value)} className="input-dark min-w-[200px] px-1 py-0.5 text-xs w-full" /></td>
                <td className="px-1 py-1" style={{ background: 'rgba(157,23,77,0.08)' }}><input value={b.userBanner} onChange={(e) => update(b.id, 'userBanner', e.target.value)} className="input-dark w-28 px-1 py-0.5 text-xs" /></td>
                <td className="px-1 py-1" style={{ background: 'rgba(157,23,77,0.08)' }}><input value={b.userLink} onChange={(e) => update(b.id, 'userLink', e.target.value)} className="input-dark w-28 px-1 py-0.5 text-xs" /></td>
                <td className="px-1 py-1" style={{ background: 'rgba(157,23,77,0.08)' }}>
                  <select value={b.userStatus} onChange={(e) => update(b.id, 'userStatus', e.target.value)} className="input-dark w-24 px-1 py-0.5 text-xs">
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || '—'}</option>)}
                  </select>
                </td>
                {/* Performer */}
                <td className="px-1 py-1" style={{ background: 'rgba(15,118,110,0.08)' }}><textarea rows={2} value={b.performerText} onChange={(e) => update(b.id, 'performerText', e.target.value)} className="input-dark min-w-[200px] px-1 py-0.5 text-xs w-full" /></td>
                <td className="px-1 py-1" style={{ background: 'rgba(15,118,110,0.08)' }}><input value={b.performerBanner} onChange={(e) => update(b.id, 'performerBanner', e.target.value)} className="input-dark w-28 px-1 py-0.5 text-xs" /></td>
                <td className="px-1 py-1" style={{ background: 'rgba(15,118,110,0.08)' }}><input value={b.performerLink} onChange={(e) => update(b.id, 'performerLink', e.target.value)} className="input-dark w-28 px-1 py-0.5 text-xs" /></td>
                <td className="px-1 py-1" style={{ background: 'rgba(15,118,110,0.08)' }}>
                  <select value={b.performerStatus} onChange={(e) => update(b.id, 'performerStatus', e.target.value)} className="input-dark w-24 px-1 py-0.5 text-xs">
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || '—'}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1 text-center"><button onClick={() => remove(b.id)} style={{ color: 'var(--negative)' }}>削除</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3">
          <button onClick={addRow} className="text-sm hover:underline" style={{ color: 'var(--accent-light)' }}>＋ バナー行を追加</button>
        </div>
      </section>
    </div>
  )
}
