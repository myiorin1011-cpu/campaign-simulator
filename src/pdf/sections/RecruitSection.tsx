import { Page, View, Text } from '@react-pdf/renderer'
import { pdfStyles } from '../fonts'
import type { ReportSectionRecruit } from '../../types'

interface RecruitSectionProps {
  data: ReportSectionRecruit
}

export function RecruitSection({ data }: RecruitSectionProps) {
  return (
    <Page size="A4" orientation="landscape" style={pdfStyles.page}>
      <View style={pdfStyles.sectionHeader}>
        <Text style={pdfStyles.sectionTitle}>求人広告</Text>
      </View>
      <View style={pdfStyles.body}>
        <View style={pdfStyles.row}>
          <Text style={pdfStyles.label}>月間デビュー数</Text>
          <Text style={pdfStyles.value}>{data.debutCount.toLocaleString()}名</Text>
        </View>
        {data.memo ? <Text style={pdfStyles.memo}>{data.memo}</Text> : null}
      </View>
    </Page>
  )
}
