import { Page, View, Text } from '@react-pdf/renderer'
import { pdfStyles } from '../fonts'
import type { ReportSectionSales } from '../../types'

interface SalesSectionProps {
  data: ReportSectionSales
}

export function SalesSection({ data }: SalesSectionProps) {
  const achievementRate = data.target > 0
    ? ((data.actual / data.target) * 100).toFixed(1)
    : '-'
  const achieved = data.target > 0 && data.actual >= data.target

  return (
    <Page size="A4" orientation="landscape" style={pdfStyles.page}>
      <View style={pdfStyles.sectionHeader}>
        <Text style={pdfStyles.sectionTitle}>売上着地</Text>
      </View>
      <View style={pdfStyles.body}>
        {[
          { label: '月商目標', value: `¥${data.target.toLocaleString()}` },
          { label: '月商実績', value: `¥${data.actual.toLocaleString()}` },
        ].map(({ label, value }) => (
          <View key={label} style={pdfStyles.row}>
            <Text style={pdfStyles.label}>{label}</Text>
            <Text style={pdfStyles.value}>{value}</Text>
          </View>
        ))}
        <View style={pdfStyles.row}>
          <Text style={pdfStyles.label}>達成率</Text>
          <Text style={[pdfStyles.value, { color: achieved ? '#059669' : '#DC2626' }]}>
            {achievementRate === '-' ? '-' : `${achievementRate}%`}
          </Text>
        </View>
        {data.memo ? <Text style={pdfStyles.memo}>{data.memo}</Text> : null}
      </View>
    </Page>
  )
}
