import { Document } from '@react-pdf/renderer'
import './fonts'
import { CoverSection, type OutputMode } from './sections/CoverSection'
import { SalesSection } from './sections/SalesSection'
import { UserSection } from './sections/UserSection'
import { AdSection } from './sections/AdSection'
import { DapSection } from './sections/DapSection'
import { ConsultSection } from './sections/ConsultSection'
import { RecruitSection } from './sections/RecruitSection'
import type { ReportData, SectionFlags } from '../types'

export type { OutputMode }

function visible(flags: SectionFlags, mode: OutputMode): boolean {
  return mode === 'internal' ? flags.showInInternal : flags.showInPerformer
}

interface ReportDocumentProps {
  report: ReportData
  mode: OutputMode
}

export function ReportDocument({ report, mode }: ReportDocumentProps) {
  const { sections } = report
  return (
    <Document
      title={`${report.meta.serviceName} ${report.meta.month} 結果報告`}
      author="Canow"
    >
      <CoverSection meta={report.meta} mode={mode} />
      {visible(sections.sales, mode) && <SalesSection data={sections.sales} />}
      {visible(sections.user, mode) && <UserSection data={sections.user} />}
      {visible(sections.ad, mode) && <AdSection data={sections.ad} />}
      {visible(sections.dap, mode) && <DapSection data={sections.dap} />}
      {visible(sections.consult, mode) && <ConsultSection data={sections.consult} />}
      {visible(sections.recruit, mode) && <RecruitSection data={sections.recruit} />}
    </Document>
  )
}
