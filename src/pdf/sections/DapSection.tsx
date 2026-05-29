import { Page, View, Text } from '@react-pdf/renderer'
import { pdfStyles } from '../fonts'
import type { ReportSectionDap } from '../../types'

interface DapSectionProps {
  data: ReportSectionDap
}

export function DapSection({ data }: DapSectionProps) {
  const items = [
    { label: '稼働パフォーマー数', value: `${data.activeCount.toLocaleString()}名` },
    { label: '総獲得報酬', value: `¥${data.totalReward.toLocaleString()}` },
    { label: '1DAPあたり平均獲得', value: `¥${data.avgRewardPerDap.toLocaleString()}` },
  ]

  return (
    <Page size="A4" orientation="landscape" style={pdfStyles.page}>
      <View style={pdfStyles.sectionHeader}>
        <Text style={pdfStyles.sectionTitle}>DAP（稼働パフォーマー）関連</Text>
      </View>
      <View style={pdfStyles.body}>
        {items.map(({ label, value }) => (
          <View key={label} style={pdfStyles.row}>
            <Text style={pdfStyles.label}>{label}</Text>
            <Text style={pdfStyles.value}>{value}</Text>
          </View>
        ))}
        {data.memo ? <Text style={pdfStyles.memo}>{data.memo}</Text> : null}
      </View>
    </Page>
  )
}
