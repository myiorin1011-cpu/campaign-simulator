import { useAppContext } from '../context/AppContext'
import type { Banner } from '../types'

const cell = 'border border-gray-200 rounded px-1 py-0.5 text-xs w-full'

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
      <h2 className="text-xl font-bold text-gray-800">キャンペーンバナー管理</h2>
      <p className="text-xs text-gray-500">
        ※ 完成バナー(375×131)は画像URL／ドライブのリンクを貼り付けてください。リンク先・ステータスも管理できます。
      </p>

      <section className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="text-xs border-collapse w-full whitespace-nowrap">
          <thead>
            <tr className="bg-indigo-700 text-white">
              <th className="px-2 py-2 text-left w-20">月/種別</th>
              <th className="px-2 py-2 text-left w-28">イベント</th>
              <th className="px-2 py-2 text-left bg-pink-700" colSpan={4}>ユーザー</th>
              <th className="px-2 py-2 text-left bg-teal-700" colSpan={4}>パフォーマー</th>
              <th className="px-2 py-2"></th>
            </tr>
            <tr className="bg-indigo-100 text-gray-700">
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
              <tr key={b.id} className={`border-b border-gray-100 ${i % 2 ? 'bg-gray-50' : 'bg-white'} hover:bg-indigo-50/40 align-top`}>
                <td className="px-1 py-1"><input value={b.category} onChange={(e) => update(b.id, 'category', e.target.value)} className={`${cell} w-16`} /></td>
                <td className="px-1 py-1"><input value={b.event} onChange={(e) => update(b.id, 'event', e.target.value)} className={`${cell} w-24`} /></td>
                {/* User */}
                <td className="px-1 py-1 bg-pink-50/40"><textarea rows={2} value={b.userText} onChange={(e) => update(b.id, 'userText', e.target.value)} className={`${cell} min-w-[200px]`} /></td>
                <td className="px-1 py-1 bg-pink-50/40"><input value={b.userBanner} onChange={(e) => update(b.id, 'userBanner', e.target.value)} className={`${cell} w-28`} /></td>
                <td className="px-1 py-1 bg-pink-50/40"><input value={b.userLink} onChange={(e) => update(b.id, 'userLink', e.target.value)} className={`${cell} w-28`} /></td>
                <td className="px-1 py-1 bg-pink-50/40">
                  <select value={b.userStatus} onChange={(e) => update(b.id, 'userStatus', e.target.value)} className={`${cell} w-24`}>
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || '—'}</option>)}
                  </select>
                </td>
                {/* Performer */}
                <td className="px-1 py-1 bg-teal-50/40"><textarea rows={2} value={b.performerText} onChange={(e) => update(b.id, 'performerText', e.target.value)} className={`${cell} min-w-[200px]`} /></td>
                <td className="px-1 py-1 bg-teal-50/40"><input value={b.performerBanner} onChange={(e) => update(b.id, 'performerBanner', e.target.value)} className={`${cell} w-28`} /></td>
                <td className="px-1 py-1 bg-teal-50/40"><input value={b.performerLink} onChange={(e) => update(b.id, 'performerLink', e.target.value)} className={`${cell} w-28`} /></td>
                <td className="px-1 py-1 bg-teal-50/40">
                  <select value={b.performerStatus} onChange={(e) => update(b.id, 'performerStatus', e.target.value)} className={`${cell} w-24`}>
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || '—'}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1 text-center"><button onClick={() => remove(b.id)} className="text-red-400 hover:text-red-600">削除</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3">
          <button onClick={addRow} className="text-sm text-indigo-600 hover:underline">＋ バナー行を追加</button>
        </div>
      </section>
    </div>
  )
}
