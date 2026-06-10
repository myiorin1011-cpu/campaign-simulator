// キャンペーン日割り・カレンダー月ユーティリティ

// 0始まりindexから「年・月」を算出（startYear/startMonth起点）
export function monthInfo(startYear: number, startMonth: number, idx0: number) {
  const m0 = (startMonth - 1) + idx0
  const year = startYear + Math.floor(m0 / 12)
  const month = (m0 % 12) + 1
  return { year, month }
}

export function monthLabel(startYear: number, startMonth: number, idx0: number) {
  const { year, month } = monthInfo(startYear, startMonth, idx0)
  return `${year}年${month}月`
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

// 'YYYY-MM-DD' をローカル日付として解釈（UTCズレ防止）
function parseLocal(str?: string): number | null {
  if (!str) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str)
  if (!m) { const t = new Date(str).getTime(); return isNaN(t) ? null : t }
  return new Date(+m[1], +m[2] - 1, +m[3]).getTime()
}

// その暦月のうち、[start, end] と重なる日数
export function overlapDays(year: number, month: number, startStr?: string, endStr?: string): number {
  const s = parseLocal(startStr)
  const e = parseLocal(endStr)
  if (s === null || e === null) return 0
  const mStart = new Date(year, month - 1, 1).getTime()
  const mEnd = new Date(year, month, 0).getTime() // 月末日
  const lo = Math.max(mStart, s)
  const hi = Math.min(mEnd, e)
  if (hi < lo) return 0
  return Math.round((hi - lo) / 86400000) + 1
}

// その暦月の日割り係数（0〜1）
export function campaignFactor(year: number, month: number, startStr?: string, endStr?: string): number {
  const d = daysInMonth(year, month)
  return d > 0 ? overlapDays(year, month, startStr, endStr) / d : 0
}
