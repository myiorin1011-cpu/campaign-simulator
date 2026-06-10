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

// その暦月のうち、[start, end] と重なる日数
export function overlapDays(year: number, month: number, startStr?: string, endStr?: string): number {
  if (!startStr || !endStr) return 0
  const mStart = new Date(year, month - 1, 1).getTime()
  const mEnd = new Date(year, month, 0).getTime() // 月末日
  const s = new Date(startStr).getTime()
  const e = new Date(endStr).getTime()
  if (isNaN(s) || isNaN(e)) return 0
  const lo = Math.max(mStart, s)
  const hi = Math.min(mEnd, e)
  if (hi < lo) return 0
  return Math.floor((hi - lo) / 86400000) + 1
}

// その暦月の日割り係数（0〜1）
export function campaignFactor(year: number, month: number, startStr?: string, endStr?: string): number {
  const d = daysInMonth(year, month)
  return d > 0 ? overlapDays(year, month, startStr, endStr) / d : 0
}
