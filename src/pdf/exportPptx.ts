import pptxgen from 'pptxgenjs'
import type { ReportData, SectionFlags } from '../types'
import type { OutputMode } from './ReportDocument'

const yen = (n: number) => `¥${Math.floor(n).toLocaleString()}`
const pct = (n: number) => `${(n * 100).toFixed(1)}%`

const COLOR = {
  indigo: '4338CA',
  text: '1F2937',
  gray: '6B7280',
  green: '16A34A',
  light: 'F3F4F6',
}

function visible(flags: SectionFlags, mode: OutputMode): boolean {
  return mode === 'internal' ? flags.showInInternal : flags.showInPerformer
}

/**
 * 結果報告書を Google スライドで開ける .pptx 形式で出力する。
 * 生成した .pptx を Google ドライブにアップロードし「Google スライドで開く」と編集可能なスライドになる。
 */
export async function exportReportToPptx(report: ReportData, mode: OutputMode) {
  const pptx = new pptxgen()
  pptx.layout = 'LAYOUT_WIDE' // 13.33 x 7.5 inch (16:9)
  pptx.author = 'Canow'
  pptx.title = `${report.meta.serviceName} ${report.meta.month} 結果報告`

  const { sections, meta } = report

  // タイトルスライドのヘルパー（各セクション共通の見出し）
  const addSectionSlide = (title: string, build: (slide: pptxgen.Slide) => void) => {
    const slide = pptx.addSlide()
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.9, fill: { color: COLOR.indigo } })
    slide.addText(title, { x: 0.5, y: 0.1, w: 12.3, h: 0.7, fontSize: 24, bold: true, color: 'FFFFFF', fontFace: 'Noto Sans JP', valign: 'middle' })
    build(slide)
  }

  const labelValueRows = (slide: pptxgen.Slide, pairs: [string, string][], startY = 1.3) => {
    const rows = pairs.map(([k, v]) => ([
      { text: k, options: { fontSize: 14, color: COLOR.gray, fill: { color: COLOR.light }, fontFace: 'Noto Sans JP' } },
      { text: v, options: { fontSize: 16, bold: true, color: COLOR.text, align: 'right' as const, fontFace: 'Noto Sans JP' } },
    ]))
    slide.addTable(rows, { x: 0.6, y: startY, w: 8, colW: [4, 4], border: { type: 'solid', color: 'E5E7EB', pt: 1 }, rowH: 0.5 })
  }

  const addMemo = (slide: pptxgen.Slide, memo: string, y = 5.6) => {
    if (!memo) return
    slide.addText([
      { text: 'コメント: ', options: { bold: true, color: COLOR.gray } },
      { text: memo, options: { color: COLOR.text } },
    ], { x: 0.6, y, w: 12, h: 1.4, fontSize: 13, fontFace: 'Noto Sans JP', valign: 'top' })
  }

  // ── 表紙 ──
  const cover = pptx.addSlide()
  cover.background = { color: COLOR.indigo }
  cover.addText(meta.serviceName, { x: 0, y: 2.2, w: '100%', h: 1, fontSize: 40, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Noto Sans JP' })
  cover.addText(`${meta.month} 結果報告`, { x: 0, y: 3.3, w: '100%', h: 0.8, fontSize: 28, color: 'E0E7FF', align: 'center', fontFace: 'Noto Sans JP' })
  cover.addText(mode === 'internal' ? '社内向け' : 'パフォーマー共有向け', { x: 0, y: 4.3, w: '100%', h: 0.5, fontSize: 16, color: 'C7D2FE', align: 'center', fontFace: 'Noto Sans JP' })

  // ── 売上着地 ──
  if (visible(sections.sales, mode)) {
    const s = sections.sales
    addSectionSlide('売上着地', (slide) => {
      const achieve = s.target > 0 ? s.actual / s.target : 0
      labelValueRows(slide, [
        ['月商目標', yen(s.target)],
        ['月商実績', yen(s.actual)],
        ['達成率', s.target > 0 ? pct(achieve) : '-'],
      ])
      addMemo(slide, s.memo)
    })
  }

  // ── ユーザー関連 ──
  if (visible(sections.user, mode)) {
    const u = sections.user
    addSectionSlide('ユーザー関連', (slide) => {
      labelValueRows(slide, [
        ['ARPPU', yen(u.arppu)],
        ['平均DAU', `${u.dau.toLocaleString()}人`],
        ['インストール数', `${u.installCount.toLocaleString()}`],
        ['課金率', pct(u.conversionRate)],
        ['新規売上', yen(u.newSales)],
        ['継続売上', yen(u.continuousSales)],
      ])
      addMemo(slide, u.memo)
    })
  }

  // ── 広告成果 ──
  if (visible(sections.ad, mode)) {
    const a = sections.ad
    addSectionSlide('広告成果', (slide) => {
      const header = ['代理店名', '広告費', '売上', 'ROAS'].map((t) => ({
        text: t, options: { bold: true, color: 'FFFFFF', fill: { color: COLOR.indigo }, fontFace: 'Noto Sans JP', align: 'center' as const },
      }))
      const body = a.agencies.map((ag) => ([
        { text: ag.name || '-', options: { fontFace: 'Noto Sans JP' } },
        { text: yen(ag.adBudget), options: { align: 'right' as const, fontFace: 'Noto Sans JP' } },
        { text: yen(ag.sales), options: { align: 'right' as const, fontFace: 'Noto Sans JP' } },
        { text: `${(ag.roas * 100).toFixed(0)}%`, options: { align: 'right' as const, color: COLOR.green, fontFace: 'Noto Sans JP' } },
      ]))
      slide.addTable([header, ...body], { x: 0.6, y: 1.3, w: 12, colW: [4.5, 2.5, 2.5, 2.5], fontSize: 13, border: { type: 'solid', color: 'E5E7EB', pt: 1 }, rowH: 0.45 })
      slide.addText(`全体ROAS: ${pct(a.totalRoas)}`, { x: 0.6, y: 5.0, w: 6, h: 0.4, fontSize: 14, bold: true, color: COLOR.text, fontFace: 'Noto Sans JP' })
      addMemo(slide, a.memo)
    })
  }

  // ── DAP関連 ──
  if (visible(sections.dap, mode)) {
    const d = sections.dap
    addSectionSlide('DAP関連', (slide) => {
      labelValueRows(slide, [
        ['稼働パフォーマー数', `${d.activeCount.toLocaleString()}人`],
        ['総獲得報酬', yen(d.totalReward)],
        ['1DAPあたり平均', yen(d.avgRewardPerDap)],
      ])
      addMemo(slide, d.memo)
    })
  }

  // ── コンサル関連 ──
  if (visible(sections.consult, mode)) {
    const c = sections.consult
    addSectionSlide('コンサル関連', (slide) => {
      let y = 1.3
      c.entries.forEach((e) => {
        slide.addText([
          { text: `${e.managerName || '担当者'}\n`, options: { bold: true, fontSize: 15, color: COLOR.indigo } },
          { text: e.comment || '', options: { fontSize: 13, color: COLOR.text } },
        ], { x: 0.6, y, w: 12, h: 1.1, fontFace: 'Noto Sans JP', valign: 'top', fill: { color: COLOR.light } })
        y += 1.25
      })
    })
  }

  // ── 求人広告 ──
  if (visible(sections.recruit, mode)) {
    const r = sections.recruit
    addSectionSlide('求人広告', (slide) => {
      labelValueRows(slide, [
        ['月間デビュー数', `${r.debutCount.toLocaleString()}人`],
      ])
      addMemo(slide, r.memo)
    })
  }

  const fileName = `${meta.serviceName}-${meta.month}-結果報告-${mode === 'internal' ? '社内' : 'パフォーマー向け'}.pptx`
  await pptx.writeFile({ fileName })
}
