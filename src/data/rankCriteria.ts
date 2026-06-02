// ランク昇降基準（月1回カウンセラーが実績確認して昇降判断）
// stage番号 → 月間維持・昇格基準（円）。threshold=null は金額基準なし
// 1 ブロンズ / 7 ロイヤルエメラルド / 9 ロイヤルルビー は仕様上のプレースホルダー（判定対象外）

export interface RankCriterion {
  threshold: number | null  // 月間維持・昇格に必要な実績（円）
  note: string
  placeholder?: boolean     // 仕様上のみのランク
}

export const rankCriteria: Record<number, RankCriterion> = {
  1:  { threshold: null,     note: 'ブロンズ（仕様上のみ）', placeholder: true },
  2:  { threshold: null,     note: '週間10,000pts以上 / 1日300名以上送信' },
  3:  { threshold: 100000,   note: '基準ランク。月間100,000pts以上 / 1日500名送信。未経験スタート' },
  4:  { threshold: 300000,   note: '月間¥300,000以上。1日1,000名送信。下回ると1ヶ月でダウン' },
  5:  { threshold: 500000,   note: '月間¥500,000以上。下回ると1ヶ月でダウン' },
  6:  { threshold: 800000,   note: '月間¥800,000以上。下回ると1ヶ月でダウン' },
  7:  { threshold: null,     note: 'ロイヤルエメラルド（仕様上のみ・特別認定）', placeholder: true },
  8:  { threshold: 1000000,  note: '月間¥1,000,000以上' },
  9:  { threshold: null,     note: 'ロイヤルルビー（仕様上のみ・特別認定）', placeholder: true },
  10: { threshold: 2500000,  note: '月間¥2,500,000以上' },
  11: { threshold: 3500000,  note: '月間¥3,500,000以上' },
  12: { threshold: 5000000,  note: 'シュプリーム（特別招待制）。月間3,500,000pts以上を3ヶ月維持' },
}
