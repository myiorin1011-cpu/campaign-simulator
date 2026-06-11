import type { CohortParams, RankMixRow } from '../types'

// ゴールド基準のデフォルト単価（実値判明前のプレースホルダ兼フォールバック）
// 1鑑定 = 3通 + 400字 → U消費 3*150 + 400*9 = 4050pt、通常報酬原価率 2700/8100 = 1/3
export const GOLD_DEFAULT: RankMixRow = {
  label: 'ゴールド', share: 1,
  uMsgPt: 150, uCharPt: 9,
  pMsgNormalPt: 100, pMsgBonusPt: 30,
  pCharNormalPt: 6, pCharBonusPt: 2,
}

// 有効な構成比行を返す（無効・空・合計0ならゴールド単独にフォールバック）
export function getRankMix(cp: CohortParams): RankMixRow[] {
  const rows = cp.rankMix
  if (!rows || rows.length === 0) return [GOLD_DEFAULT]
  const totalShare = rows.reduce((s, r) => s + (r.share || 0), 0)
  if (totalShare <= 0) return [GOLD_DEFAULT]
  return rows
}

// ブレンド値（構成比加重）
export interface BlendedReading {
  uPtPerReading: number        // 1鑑定あたりU消費pt（ゴールド単独なら4050）
  normalRewardRate: number     // 通常報酬原価率＝Σshare×P通円 ÷ Σshare×売上円（ゴールド単独なら1/3）
  pNormalYenPerReading: number // 1鑑定あたりP獲得(通)円
  pBonusYenPerReading: number  // 1鑑定あたりP獲得(ボ)円
}

// 各行 i について:
//   uPt_i   = 3*uMsgPt + 400*uCharPt
//   売上円_i = uPt_i × 2（U: 2円=1pt）
//   P通円_i  = 3*pMsgNormalPt + 400*pCharNormalPt（P: 1pt=1円）
//   Pボ円_i  = 3*pMsgBonusPt  + 400*pCharBonusPt
// share は合計で正規化。
//   uPtPerReading        = Σ s_i × uPt_i
//   normalRewardRate     = (Σ s_i × P通円_i) ÷ (Σ s_i × 売上円_i)  ※売上加重の比率
//   pNormalYenPerReading = Σ s_i × P通円_i
//   pBonusYenPerReading  = Σ s_i × Pボ円_i
// ゴールド単独なら uPtPerReading=4050, normalRewardRate=2700/8100=1/3。
export function blendReading(cp: CohortParams): BlendedReading {
  const rows = getRankMix(cp)
  const totalShare = rows.reduce((s, r) => s + (r.share || 0), 0)

  if (totalShare <= 0) {
    // 念のためのゼロ除算ガード（getRankMix で防いでいるが二重に保護）
    const g = GOLD_DEFAULT
    const uPt = 3 * g.uMsgPt + 400 * g.uCharPt
    const pNormalYen = 3 * g.pMsgNormalPt + 400 * g.pCharNormalPt
    const pBonusYen = 3 * g.pMsgBonusPt + 400 * g.pCharBonusPt
    const revYen = uPt * 2
    return {
      uPtPerReading: uPt,
      normalRewardRate: revYen > 0 ? pNormalYen / revYen : 1 / 3,
      pNormalYenPerReading: pNormalYen,
      pBonusYenPerReading: pBonusYen,
    }
  }

  let uPtAcc = 0
  let revYenAcc = 0
  let pNormalYenAcc = 0
  let pBonusYenAcc = 0
  for (const r of rows) {
    const s = (r.share || 0) / totalShare
    const uPt = 3 * r.uMsgPt + 400 * r.uCharPt
    const revYen = uPt * 2
    const pNormalYen = 3 * r.pMsgNormalPt + 400 * r.pCharNormalPt
    const pBonusYen = 3 * r.pMsgBonusPt + 400 * r.pCharBonusPt
    uPtAcc += s * uPt
    revYenAcc += s * revYen
    pNormalYenAcc += s * pNormalYen
    pBonusYenAcc += s * pBonusYen
  }

  return {
    uPtPerReading: uPtAcc,
    normalRewardRate: revYenAcc > 0 ? pNormalYenAcc / revYenAcc : 1 / 3,
    pNormalYenPerReading: pNormalYenAcc,
    pBonusYenPerReading: pBonusYenAcc,
  }
}
