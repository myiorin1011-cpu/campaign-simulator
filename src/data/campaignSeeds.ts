import type { Campaign, Banner } from '../types'

let cid = 0
const mk = (audience: 'user' | 'performer') => (
  category: string, title: string, durationDays: number, start: string, end: string,
  pattern = '', tag = '', status = '開始前', ptDesign = '未対応', banner = '作成前', ptSetting = '未対応',
): Campaign => ({
  id: `seed-c-${++cid}`, audience, category, title, durationDays, start, end, pattern, tag, status, ptDesign, banner, ptSetting,
})

// ── イベント_User ──
const u = mk('user')
const userCampaigns: Campaign[] = [
  u('記念', 'Canowリリースキャンペーン！運命の初鑑定SP', 31, '2026-07-01', '2026-07-31', 'A4', '', '準備中'),
  u('季節', '夏の運命、全部見せます — 真夏の占いFEST', 31, '2026-08-01', '2026-08-31', 'B3', '', '準備中'),
  u('季節', '満月の夜。あなたの運命が照らされる 中秋の名月CP', 30, '2026-09-01', '2026-09-30', 'B3', '', '準備中'),
  u('季節', '秘密の恋、見抜かれる夜 — ハロウィン占い祭', 31, '2026-10-01', '2026-10-31'),
  u('季節', '年に一度だけ。ポイント超増量 BLACK FRIDAYキャンペーン', 30, '2026-11-01', '2026-11-30'),
  u('季節', '奇跡の季節に、運命も動く —クリスマス&歳末感謝祭', 31, '2026-12-01', '2026-12-31'),
  u('季節', '今年の運命、先取りしよう — 新春初鑑定キャンペーン', 17, '2027-01-01', '2027-01-17'),
  u('季節', 'あの人の本音、今だけ見えます —バレンタイン恋愛占いキャンペーン', 14, '2027-02-01', '2027-02-14'),
  u('季節', '返事を待つより、先に知ろう —ホワイトデー恋愛占いCP', 14, '2027-03-01', '2027-03-14'),
  u('季節', '新しい私へ。桜と一緒に運命が開く サクラサク新生活CP', 30, '2027-03-19', '2027-04-18'),
  u('季節', '連休まるごと、ガッツリ占ってもらうなら今 GW集中鑑定キャンペーン', 18, '2027-04-23', '2027-05-09'),
  u('季節', '運命の人を引き寄せる6月 —ジューンブライド 縁結びCP', 30, '2027-06-01', '2027-06-30'),
  u('季節', '願いを星に届ける夜 七夕 縁結び占いCP', 10, '2027-07-01', '2027-07-11'),
  u('記念', 'Canow ○周年！ありがとうの大還元祭', 31, '', ''),
  u('記念', '○万人突破！みんなで祝う大感謝祭', 31, '', ''),
  u('ボーナス', 'フォローするだけで運気UP — 今すぐGETしよう', 30, '', ''),
  u('ゲリラ', '今夜だけ。満月パワーでポイントが急増中', 1, '', ''),
  u('ゲリラ', '大安の日だけ。今日がいちばんお得な日 ポイント増量ゲリライベント開催中', 1, '', ''),
  u('ゲリラ', '一粒万倍日。今日の投資が何倍にもなる ポイント増量ゲリライベント開催中', 1, '', ''),
  u('定期', '天が許した日。今日だけの大解放 ポイント増量イベント開催中', 1, '', ''),
]

// ── イベント_Performer ──
const p = mk('performer')
const performerCampaigns: Campaign[] = [
  p('記念', 'Canowリリースキャンペーン！運命の初鑑定SP', 31, '2026-07-01', '2026-07-31', 'A1', '1通, 1文字', '準備中'),
  p('ボーナス', 'リリースCP同時開催！Storeや広告ページにプロフ写真の掲載チャンス！', 92, '2026-07-01', '2026-09-30', 'E', '', '準備中', '対応なし', '対応なし', '対応なし'),
  p('季節', '夏の運命、全部見せます — 真夏の占いFEST', 31, '2026-08-01', '2026-08-31', '', '', '準備中'),
  p('季節', '満月の夜。あなたの運命が照らされる 中秋の名月CP', 30, '2026-09-01', '2026-09-30', '', '', '準備中'),
  p('季節', '秘密の恋、見抜かれる夜 — ハロウィン占い祭', 31, '2026-10-01', '2026-10-31'),
  p('季節', '年に一度だけ。ポイント超増量 BLACK FRIDAYキャンペーン', 30, '2026-11-01', '2026-11-30'),
  p('季節', '奇跡の季節に、運命も動く —クリスマス&歳末感謝祭', 31, '2026-12-01', '2026-12-31'),
  p('季節', '今年の運命、先取りしよう — 新春初鑑定キャンペーン', 17, '2027-01-01', '2027-01-17'),
  p('季節', 'あの人の本音、今だけ見えます —バレンタイン恋愛占いキャンペーン', 14, '2027-02-01', '2027-02-14'),
  p('季節', '返事を待つより、先に知ろう —ホワイトデー恋愛占いCP', 14, '2027-03-01', '2027-03-14'),
  p('季節', '新しい私へ。桜と一緒に運命が開く サクラサク新生活CP', 30, '2027-03-19', '2027-04-18'),
  p('季節', '連休まるごと、ガッツリ占ってもらうなら今 GW集中鑑定キャンペーン', 18, '2027-04-23', '2027-05-09'),
  p('季節', '運命の人を引き寄せる6月 —ジューンブライド 縁結びCP', 30, '2027-06-01', '2027-06-30'),
  p('季節', '願いを星に届ける夜 七夕 縁結び占いCP', 10, '2027-07-01', '2027-07-11'),
  p('記念', 'Canow ○周年！ありがとうの大還元祭', 31, '', ''),
  p('記念', '○万人突破！みんなで祝う大感謝祭', 31, '', ''),
  p('ボーナス', 'フォローするだけで運気UP — 今すぐGETしよう', 30, '', ''),
  p('定期', '新規占い師 初月単価UPボーナス', 0, '', ''),
  p('定期', 'ランクUP達成ボーナス', 0, '', ''),
  p('定期', '月間売上達成 報酬率UPボーナス', 0, '', ''),
  p('定期', 'プロフィール・画像投稿ボーナス', 0, '', ''),
  p('定期', 'ランキング入賞ボーナス', 0, '', ''),
]

export const seedCampaigns: Campaign[] = [...userCampaigns, ...performerCampaigns]

// ── ランキングイベント（Performerタブで表示）──
export const rankingTiers: { label: string; points: number[] }[] = [
  { label: '前日', points: [100, 50, 30] },
  { label: '前週', points: [500, 250, 130, 80, 50] },
  { label: '前月', points: [3000, 2000, 1500, 1000, 800, 500, 400, 300, 200, 100] },
  { label: '新人', points: [3000, 2000, 1500, 1000, 800, 500, 400, 300, 200, 100] },
]

export const rankingNote = {
  period: '31日間',
  start: '2026/7/1',
  end: '2026/7/31',
  content: '終了時点のランキング順位に応じてボーナスptを付与',
}

let bid = 0
const b = (
  category: string, event: string,
  userText = '', performerText = '', userStatus = '', performerStatus = '',
): Banner => ({
  id: `seed-b-${++bid}`, category, event,
  userText, userBanner: '', userLink: '', userStatus,
  performerText, performerBanner: '', performerLink: '', performerStatus,
})

export const seedBanners: Banner[] = [
  b('1月', '新春'),
  b('2月', 'バレンタイン'),
  b('3月', 'ホワイトデー'),
  b('4月', '新生活'),
  b('5月', 'GW'),
  b('6月', 'ジューンブライド'),
  b('7月', '七夕'),
  b('8月', '夏祭り'),
  b('9月', '中秋の名月'),
  b('10月', 'ハロウィン'),
  b('11月', 'ブラックフライデー'),
  b('12月', 'クリスマス 歳末'),
  b('記念', 'リリース', '今だけポイント大増量中！ Canowリリース記念！運命の初鑑定キャンペーン', 'Canowリリース記念！運命の初鑑定キャンペーン'),
  b('記念', '周年'),
  b('記念', '登録達成'),
  b('ボーナス', 'SNSフォロー'),
  b('ボーナス', '画像投稿'),
  b('ゲリラ', '満月'),
  b('ゲリラ', '大安吉日'),
  b('ゲリラ', '天赦日'),
  b('ゲリラ', '一粒万倍日'),
  b('定期', 'ランキング'),
  b('定期', 'ランクアップ'),
  b('定期', '新人'),
  b('デフォルト', '決済誘導', '初回限定！ クレジットカードでのポイント購入で、さらにポイント増量中！', '', '適用中'),
  b('デフォルト', '4大特典', '4つのお得な特典 ご登録でポイントGET!! アカウント連携／お悩みシート記入／クレジットカード登録／LINE友だち追加', '', '適用中'),
  b('デフォルト', '初めての方へ', '吐き出しませんか？あなたのお悩み 初めて相談する方へ', '', '適用中'),
]

// パターン参照（企画タブの参考表示用）
export const userPatterns: { pattern: string; content: string; target: string; count: string; benefit: string }[] = [
  { pattern: 'A1', content: 'ポイント購入でさらにポイント増量', target: '決済縛りなし', count: '1回のみ', benefit: '購入額に応じた無料pt付与' },
  { pattern: 'A2', content: 'ポイント購入でさらにポイント増量', target: '決済縛りなし', count: '2回まで', benefit: '購入額に応じた無料pt付与' },
  { pattern: 'A3', content: 'ポイント購入でさらにポイント増量', target: '決済縛りなし', count: '3回まで', benefit: '購入額に応じた無料pt付与' },
  { pattern: 'A4', content: 'ポイント購入でさらにポイント増量', target: '決済縛りなし', count: '無制限', benefit: '購入額に応じた無料pt付与' },
  { pattern: 'B1', content: 'クレカ決済限定！ポイント購入でさらにポイント増量', target: 'クレカ決済のみ', count: '1回のみ', benefit: '購入額に応じた無料pt付与（デフォルト）' },
  { pattern: 'B2', content: 'クレカ決済限定！ポイント購入でさらにポイント増量', target: 'クレカ決済のみ', count: '2回まで', benefit: '購入額に応じた無料pt付与' },
  { pattern: 'B3', content: 'クレカ決済限定！ポイント購入でさらにポイント増量', target: 'クレカ決済のみ', count: '3回まで', benefit: '購入額に応じた無料pt付与' },
  { pattern: 'B4', content: 'クレカ決済限定！ポイント購入でさらにポイント増量', target: 'クレカ決済のみ', count: '無制限', benefit: '購入額に応じた無料pt付与' },
  { pattern: 'C1', content: '対象決済の中からポイント購入でさらにポイント増量', target: 'クレカ・AmazonPay・銀行振込', count: '1回のみ', benefit: '購入額に応じた無料pt付与' },
  { pattern: 'C2', content: '対象決済の中からポイント購入でさらにポイント増量', target: 'クレカ・AmazonPay・銀行振込', count: '2回まで', benefit: '購入額に応じた無料pt付与' },
  { pattern: 'C3', content: '対象決済の中からポイント購入でさらにポイント増量', target: 'クレカ・AmazonPay・銀行振込', count: '3回まで', benefit: '購入額に応じた無料pt付与' },
  { pattern: 'C4', content: '対象決済の中からポイント購入でさらにポイント増量', target: 'クレカ・AmazonPay・銀行振込', count: '無制限', benefit: '購入額に応じた無料pt付与' },
  { pattern: 'D', content: '購入すればするほどポイントが増える倍倍UP', target: 'クレカ決済のみ', count: '3回まで', benefit: '2回目1.5倍/3回目2倍pt付与（1回目の無料ptから）' },
  { pattern: 'E', content: '○○ランク限定！消費ポイントがお得に', target: '‐', count: '‐', benefit: '指定ランクのみ消費pt値引き（1通・1文字）' },
  { pattern: 'α', content: 'ポイント購入でさらにポイント増量', target: '‐', count: '‐', benefit: '有償(通常)pt付与（P向け：他パターンと組合せ）' },
]

export const performerPatterns: { pattern: string; content: string; target: string; condition: string; benefit: string }[] = [
  { pattern: 'A1', content: '期間中獲得pt単価アップ', target: '1通, 1文字', condition: '無条件', benefit: 'ボーナスに10pt/1pt' },
  { pattern: 'A2', content: '期間中獲得pt単価アップで消費ptのみ値引き', target: '1通, 1文字', condition: '特定ランクのみ', benefit: 'ボーナスに10pt/1pt' },
  { pattern: 'A3', content: '期間中獲得pt単価据え置きで消費ptのみ値引き', target: '1通, 1文字', condition: '特定ランクのみ（User向け）', benefit: 'ボーナスに10pt/1pt' },
  { pattern: 'A4', content: '期間中獲得無料pt単価アップ', target: '1通, 1文字', condition: '無料pt分を通常pt単価と同等に', benefit: '‐' },
  { pattern: 'B1', content: '期間中条件達成で報酬GET', target: '固定報酬', condition: 'ランキングイベントでランクイン', benefit: '‐' },
  { pattern: 'B2', content: '期間中条件達成で報酬GET', target: '固定報酬', condition: '期間終了時点のランクイン', benefit: '550pt' },
  { pattern: 'B3', content: '期間中条件達成で報酬GET', target: '固定報酬', condition: '500,000pt獲得/月', benefit: '1000pt' },
  { pattern: 'B4', content: '期間中条件達成で報酬GET', target: '固定報酬', condition: '有料メッセージ開封数100件/月', benefit: '1000pt' },
  { pattern: 'B5', content: '期間中条件達成で報酬GET', target: '固定報酬', condition: '初回報酬清算で翌月pt付与', benefit: '550pt' },
  { pattern: 'E', content: '期間中条件達成で報酬GET', target: '写真掲載', condition: '期間終了時点のランクイン(総合5位まで)', benefit: '‐' },
]
