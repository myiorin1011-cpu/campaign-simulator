import { useMemo, useState } from 'react'
import { useAppContext } from '../context/AppContext'
import type { CohortParams } from '../types'

// ───────────────────────────────────────────────
// 2026年 想定予算（P/L）データ  期間: 2026年4月 〜 2027年3月
// 出典: Googleスプレッドシート「2026年_想定予算」
// ───────────────────────────────────────────────
const MONTHS = [
  '2026年4月', '2026年5月', '2026年6月', '2026年7月', '2026年8月', '2026年9月',
  '2026年10月', '2026年11月', '2026年12月', '2027年1月', '2027年2月', '2027年3月',
]
const N = MONTHS.length
const fill = (v: number) => Array.from({ length: N }, () => v)

// ── 売上 ──
const rev_shinki   = [0, 0, 3000000, 5100000, 6800000, 8500000, 10200000, 11900000, 13600000, 15300000, 17000000, 18700000]
const rev_kouho    = [0, 0, 0, 1843200, 4665480, 2558840, 4907050, 5677320, 3559290, 6551120, 8849520, 14426200]
const rev_keizoku  = [0, 0, 0, 0, 2935665, 4256605, 4314689, 5412469, 7600531, 11174790, 15057157, 19726074]

// ── システム ──
const sys_release  = [2000000, 2500000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
const sys_unyo     = [0, 0, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000]
const sys_kaishu   = [0, 0, 1000000, 1000000, 0, 1000000, 0, 0, 1000000, 0, 0, 1000000]
const sys_aws      = [250000, 250000, 250000, 300000, 350000, 400000, 450000, 500000, 550000, 600000, 650000, 700000]
const tool_github   = fill(150000)
const tool_atlassian = fill(100000)
const tool_adjust   = [0, 1200000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
const tool_figma    = [10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 100000, 10000]
const tool_liquid   = [100000, 100000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000]
const tool_tencent  = [200000, 200000, 400000, 400000, 400000, 400000, 400000, 400000, 400000, 400000, 400000, 400000]
const tool_bankcode = fill(10000)

// ── 原価 ──
const ad_uranaishi = fill(500000)
const ad_user      = [0, 0, 4000000, 6000000, 8000000, 10000000, 12000000, 14000000, 16000000, 18000000, 20000000, 22000000]
const performer    = [0, 0, 3600000, 6943200, 12240973, 10720812, 9710869, 11115563, 10319893, 13841159, 17495786, 21516161]
const pay_credix   = fill(50000)
const pay_juuryou  = [0, 0, 275000, 287679, 299665, 306039, 313801, 321230, 328149, 336903, 345249, 354170]

// ── 販管費 ──
const sga_oya = [3292500, 2637500, 3510000, 3075000, 3255000, 3270000, 3075000, 3175000, 4035000, 3600000, 3700000, 4370000]
const sga_ko  = [30000, 80000, 260000, 30000, 30000, 30000, 30000, 30000, 30000, 30000, 30000, 35000]

// ── その他（参考・費用合計には含めない）──
const memo_yobi = fill(50000)

// ───────────────────────────────────────────────
type Node = { label: string; monthly?: number[]; children?: Node[] }

const sumNodes = (arrs: number[][]) =>
  Array.from({ length: N }, (_, i) => arrs.reduce((s, a) => s + (a[i] ?? 0), 0))

// 子を持つノードは monthly を子の合計で算出
const resolve = (node: Node): number[] => {
  if (node.monthly) return node.monthly
  return sumNodes((node.children ?? []).map(resolve))
}

const buildRevenueTree = (shinki: number[], kouho: number[], keizoku: number[]): Node => ({
  label: '売上', children: [
    { label: '新規（利用初月）', monthly: shinki },
    { label: '継続候補（2ヶ月目）', monthly: kouho },
    { label: '継続（3ヶ月目以降）', monthly: keizoku },
  ],
})

const buildCostTree = (adUser: number[], performerArr: number[]): Node => ({
  label: '費用', children: [
    {
      label: 'システム', children: [
        {
          label: 'システム開発', children: [
            { label: 'リリース開発', monthly: sys_release },
            { label: '運用・保守', monthly: sys_unyo },
            { label: 'システム改修', monthly: sys_kaishu },
          ],
        },
        { label: 'サーバ利用料（AWS）', monthly: sys_aws },
        {
          label: '開発ツール利用料', children: [
            { label: 'GitHub', monthly: tool_github },
            { label: 'ATLASSIAN', monthly: tool_atlassian },
            { label: 'ADJUST SDK', monthly: tool_adjust },
            { label: 'Figma', monthly: tool_figma },
            { label: 'Liquid', monthly: tool_liquid },
            { label: 'Tencent', monthly: tool_tencent },
            { label: 'BankCode', monthly: tool_bankcode },
          ],
        },
      ],
    },
    {
      label: '原価', children: [
        {
          label: '広告費', children: [
            { label: '占い師', monthly: ad_uranaishi },
            { label: 'ユーザ', monthly: adUser },
          ],
        },
        { label: 'パフォーマー報酬（占い師）', monthly: performerArr },
        {
          label: '決済利用料', children: [
            { label: 'クレジット（Credix）', monthly: pay_credix },
            { label: '従量課金ほか', monthly: pay_juuryou },
          ],
        },
      ],
    },
    {
      label: '販管費', children: [
        { label: '親会社経費', monthly: sga_oya },
        { label: '子会社経費', monthly: sga_ko },
      ],
    },
  ],
})

// ── コホート連動: cohortParams から月次の売上/広告費/報酬原価を算出 ──
function computeCohortMonthly(cp: CohortParams) {
  const months = Math.max(0, cp.months || 0)
  const budgets = Array.from({ length: months }, (_, i) =>
    cp.monthlyAdBudgets[i] ?? cp.monthlyAdBudgets[cp.monthlyAdBudgets.length - 1] ?? 0)
  const r2 = cp.secondMonthRetention
  const r3 = cp.continuousRetention
  const decay = cp.continuousDecay
  const cpi = cp.cpi
  const cr = cp.conversionRate
  const newCounts = budgets.map((b) => Math.floor((cpi > 0 ? Math.floor(b / cpi) : 0) * cr))
  const bonusPtCost = cp.bonusPtCost ?? 0.22

  const shinki: number[] = [], kouho: number[] = [], keizoku: number[] = []
  const adUser: number[] = [], performer: number[] = []
  for (let i = 0; i < months; i++) {
    const month = i + 1
    const installs = cpi > 0 ? Math.floor(budgets[i] / cpi) : 0
    const newCount = newCounts[i]
    const secondCount = i >= 1 ? Math.floor(newCounts[i - 1] * r2) : 0
    let continuousCount = 0
    for (let age = 3; age <= month; age++) {
      const idx = i - (age - 1)
      if (idx >= 0) continuousCount += Math.floor(newCounts[idx] * Math.max(0, r3 - decay * (age - 3)))
    }
    const newSales = newCount * cp.newUserArppu
    const secondSales = secondCount * cp.secondMonthArppu
    const continuousSales = continuousCount * cp.continuousArppu
    const totalSales = newSales + secondSales + continuousSales
    const payers = newCount + secondCount + continuousCount
    const normalReward = totalSales * (cp.normalRewardRate ?? 1 / 3)
    const regBonusCost = installs * (cp.registrationBonusPt ?? 7000) * bonusPtCost * (cp.registrationBonusConsume ?? 0.7)
    const normalBonusCost = payers * (cp.credixRepPlan ?? 11000) * (cp.avgBonusGrantRate ?? 0.0364) * bonusPtCost
    const firstBonusCost = newCount * (cp.firstBonusPt ?? 300) * bonusPtCost * (cp.firstBonusConsume ?? 1.0)
    // キャンペーン施策原価（無償消化分・1鑑定=3通+400字, ゴールド U消費 通150/字9 → 4050pt/鑑定）
    let campaignCost = 0
    if (cp.campaignEnabled && (cp.campaignMonth ?? 1) === month) {
      const PPR = 3 * 150 + 400 * 9
      const addPerReading = 3 * (cp.campaignAddMsgBonusPt ?? 0) + 400 * (cp.campaignAddCharBonusPt ?? 0)
      if (cp.campaignApplyBonus ?? true) {
        const bonusConsumedPt = installs * (cp.registrationBonusPt ?? 7000) * (cp.registrationBonusConsume ?? 0.7)
        campaignCost += (bonusConsumedPt / PPR) * addPerReading
      }
      if (cp.campaignApplyNormal ?? false) {
        campaignCost += (totalSales / 2 / PPR) * addPerReading
      }
    }

    shinki.push(newSales); kouho.push(secondSales); keizoku.push(continuousSales)
    adUser.push(budgets[i])
    performer.push(normalReward + regBonusCost + normalBonusCost + firstBonusCost + campaignCost)
  }
  // P/L は12ヶ月固定列。長さを N に合わせる（不足は0埋め・超過は切り捨て）
  const pad = (a: number[]) => Array.from({ length: N }, (_, i) => a[i] ?? 0)
  return { shinki: pad(shinki), kouho: pad(kouho), keizoku: pad(keizoku), adUser: pad(adUser), performer: pad(performer) }
}

// 原本（固定）の配列
const FIXED = {
  shinki: rev_shinki, kouho: rev_kouho, keizoku: rev_keizoku, adUser: ad_user, performer,
}

// 表示用にツリーを行へ平坦化（level=インデント, kind=見た目）
type Row = { label: string; monthly: number[]; level: number; kind: 'group' | 'sub' | 'leaf' }
function flatten(node: Node, level: number, out: Row[]) {
  const monthly = resolve(node)
  const kind: Row['kind'] = node.children ? (level === 0 ? 'group' : 'sub') : 'leaf'
  out.push({ label: node.label, monthly, level, kind })
  node.children?.forEach((c) => flatten(c, level + 1, out))
}

export function BudgetPL() {
  const { data } = useAppContext()
  const [mode, setMode] = useState<'fixed' | 'linked'>('fixed')

  const { revenue, costTotal, costRows, revRows, monthlyProfit, cumulative, yobi } = useMemo(() => {
    const src = mode === 'linked' ? computeCohortMonthly(data.cohortParams) : FIXED
    const revenueTree = buildRevenueTree(src.shinki, src.kouho, src.keizoku)
    const costTree = buildCostTree(src.adUser, src.performer)

    const revRowsArr: Row[] = []
    revenueTree.children!.forEach((c) => flatten(c, 1, revRowsArr))
    const revenue = resolve(revenueTree)

    const costRowsArr: Row[] = []
    costTree.children!.forEach((c) => flatten(c, 0, costRowsArr))
    const costTotal = resolve(costTree)

    const monthlyProfit = revenue.map((r, i) => r - costTotal[i])
    const cumulative: number[] = []
    monthlyProfit.reduce((acc, v, i) => (cumulative[i] = acc + v), 0)

    return {
      revenue, costTotal, costRows: costRowsArr, revRows: revRowsArr,
      monthlyProfit, cumulative, yobi: memo_yobi,
    }
  }, [mode, data.cohortParams])

  const total = (a: number[]) => a.reduce((s, v) => s + v, 0)
  const fmt = (n: number) => {
    if (n === 0) return <span style={{ color: 'var(--text-muted)' }}>-</span>
    const neg = n < 0
    return <span style={{ color: neg ? 'var(--negative)' : undefined }}>{`${neg ? '▲' : ''}¥${Math.abs(Math.round(n)).toLocaleString()}`}</span>
  }

  // 行スタイル（グループ/小計/明細）
  const rowStyle = (kind: Row['kind']): React.CSSProperties => {
    if (kind === 'group') return { background: 'var(--bg-elevated)', fontWeight: 700 }
    if (kind === 'sub') return { fontWeight: 600 }
    return {}
  }
  const labelStyle = (level: number, kind: Row['kind']): React.CSSProperties => ({
    paddingLeft: 8 + level * 16,
    color: kind === 'leaf' ? 'var(--text-secondary)' : 'var(--text-primary)',
    whiteSpace: 'nowrap',
  })

  const Cells = ({ arr, color, bold }: { arr: number[]; color?: string; bold?: boolean }) => (
    <>
      {arr.map((v, i) => (
        <td key={i} className="text-right" style={{ color, fontWeight: bold ? 700 : undefined }}>{fmt(v)}</td>
      ))}
      <td className="text-right" style={{ color, fontWeight: 700, background: 'var(--bg-elevated)' }}>{fmt(total(arr))}</td>
    </>
  )

  return (
    <div className="space-y-6">
      <h2 className="page-title">2026年 想定予算（P/L）</h2>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        期間: 2026年4月 〜 2027年3月　／　出典: スプレッドシート「2026年_想定予算」
      </p>

      {/* モード切替 */}
      <div className="flex items-center gap-2">
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>データソース</span>
        {([
          { id: 'fixed' as const, label: '原本（固定予算）' },
          { id: 'linked' as const, label: 'コホート連動' },
        ]).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
              background: mode === id ? 'var(--accent-dim)' : 'var(--bg-elevated)',
              border: `1px solid ${mode === id ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
              color: mode === id ? 'var(--accent-light)' : 'var(--text-secondary)',
              fontWeight: mode === id ? 600 : 400,
            }}
          >{label}</button>
        ))}
        <span className="text-[11px]" style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
          {mode === 'linked'
            ? '※ 売上(新規/候補/継続)・広告費(ユーザ)・パフォーマー報酬 をコホート予測タブの値で算出。他の費用は原本固定。'
            : '※ スプレッドシート原本の固定値を表示中。'}
        </span>
      </div>

      {/* サマリーKPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '売上合計（12ヶ月）', value: total(revenue), color: 'var(--accent-light)' },
          { label: '費用合計（12ヶ月）', value: total(costTotal), color: 'var(--negative)' },
          { label: '通期損益', value: total(monthlyProfit), color: total(monthlyProfit) >= 0 ? 'var(--positive)' : 'var(--negative)' },
          { label: '期末累計損益', value: cumulative[N - 1], color: cumulative[N - 1] >= 0 ? 'var(--positive)' : 'var(--negative)' },
        ].map((k) => (
          <div key={k.label} className="card" style={{ padding: '14px 16px' }}>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{k.label}</div>
            <div className="font-bold font-mono-num" style={{ fontSize: '1.25rem', color: k.color, marginTop: 4 }}>
              {k.value < 0 ? '▲' : ''}¥{Math.abs(Math.round(k.value)).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* P/L テーブル */}
      <section className="card overflow-x-auto" style={{ padding: 0 }}>
        <table className="table-dark w-full text-sm">
          <thead>
            <tr>
              <th className="text-left" style={{ position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 1 }}>項目</th>
              {MONTHS.map((m) => <th key={m} className="text-right">{m.replace('20', "'")}</th>)}
              <th className="text-right">合計</th>
            </tr>
          </thead>
          <tbody>
            {/* 売上 */}
            <tr style={{ background: 'var(--accent-dim)', fontWeight: 700 }}>
              <td style={{ paddingLeft: 8, color: 'var(--accent-light)', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: 'var(--accent-dim)' }}>売上</td>
              <Cells arr={revenue} color="var(--accent-light)" bold />
            </tr>
            {revRows.map((r, idx) => (
              <tr key={`r${idx}`} style={rowStyle(r.kind)}>
                <td style={{ ...labelStyle(r.level, r.kind), position: 'sticky', left: 0, background: r.kind === 'group' ? 'var(--bg-elevated)' : 'var(--bg-card)' }}>{r.label}</td>
                <Cells arr={r.monthly} />
              </tr>
            ))}

            {/* 区切り */}
            <tr><td colSpan={N + 2} style={{ height: 6, background: 'var(--bg-app)' }}></td></tr>

            {/* 費用 */}
            {costRows.map((r, idx) => (
              <tr key={`c${idx}`} style={rowStyle(r.kind)}>
                <td style={{ ...labelStyle(r.level, r.kind), position: 'sticky', left: 0, background: r.kind === 'group' ? 'var(--bg-elevated)' : 'var(--bg-card)' }}>{r.label}</td>
                <Cells arr={r.monthly} />
              </tr>
            ))}
            <tr style={{ background: 'var(--bg-elevated)', fontWeight: 700, borderTop: '2px solid var(--border)' }}>
              <td style={{ paddingLeft: 8, color: 'var(--negative)', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: 'var(--bg-elevated)' }}>費用合計</td>
              <Cells arr={costTotal} color="var(--negative)" bold />
            </tr>

            {/* 区切り */}
            <tr><td colSpan={N + 2} style={{ height: 6, background: 'var(--bg-app)' }}></td></tr>

            {/* 損益 */}
            <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border)' }}>
              <td style={{ paddingLeft: 8, whiteSpace: 'nowrap', position: 'sticky', left: 0, background: 'var(--bg-card)' }}>単月損益</td>
              <Cells arr={monthlyProfit} bold />
            </tr>
            <tr style={{ fontWeight: 700 }}>
              <td style={{ paddingLeft: 8, whiteSpace: 'nowrap', position: 'sticky', left: 0, background: 'var(--bg-card)' }}>累計損益</td>
              {cumulative.map((v, i) => (
                <td key={i} className="text-right" style={{ fontWeight: 700 }}>{fmt(v)}</td>
              ))}
              <td className="text-right" style={{ background: 'var(--bg-elevated)' }}>{fmt(cumulative[N - 1])}</td>
            </tr>

            {/* 参考: 予備費 */}
            <tr><td colSpan={N + 2} style={{ height: 6, background: 'var(--bg-app)' }}></td></tr>
            <tr style={{ color: 'var(--text-muted)' }}>
              <td style={{ paddingLeft: 8, whiteSpace: 'nowrap', position: 'sticky', left: 0, background: 'var(--bg-card)' }}>（参考）予備費 ※費用合計外</td>
              {yobi.map((v, i) => <td key={i} className="text-right">{fmt(v)}</td>)}
              <td className="text-right" style={{ background: 'var(--bg-elevated)' }}>{fmt(total(yobi))}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
        ※ 単月損益 ＝ 売上 − 費用合計。累計損益 ＝ 単月損益の累計。予備費（¥600,000）は費用合計に含めていません（原本準拠）。<br />
        ※ 前提値: ARPPU 新規¥20,000 / 候補¥35,000 / 継続¥50,000、課金率10%、CPI¥2,500、継続率 2ヶ月目30%・3ヶ月目以降20%。
      </p>
    </div>
  )
}
