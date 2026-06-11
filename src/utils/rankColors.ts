// ランク名 → 代表カラー（行背景・ラベル装飾用）
const RANK_COLOR: Record<string, string> = {
  'ブロンズ':           '#b06b3a',
  'シルバー':           '#9aa3ad',
  'ゴールド':           '#d4af37',
  'プラチナ':           '#6fb3c9',
  'サファイア':         '#2f6fe0',
  'エメラルド':         '#1faa6b',
  'ロイヤルエメラルド': '#0f8f7a',
  'ルビー':             '#e0115f',
  'ロイヤルルビー':     '#c01048',
  'ダイヤモンド':       '#56c2e6',
  'ロイヤルダイヤモンド':'#8a7bf0',
  'シュプリーム':       '#e0a000',
}

// 16進カラー → rgba（背景の薄いティント用）
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// ランクの代表カラー（該当なしは null）
export function rankColor(name: string): string | null {
  return RANK_COLOR[name?.trim()] ?? null
}

// 行背景用の薄いティント（該当なしは transparent）
export function rankRowBg(name: string, alpha = 0.12): string {
  const c = rankColor(name)
  return c ? hexToRgba(c, alpha) : 'transparent'
}
