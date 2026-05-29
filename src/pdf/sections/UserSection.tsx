import { Page, View, Text } from '@react-pdf/renderer'
import { pdfStyles } from '../fonts'
import type { ReportSectionUser } from '../../types'

interface UserSectionProps {
  data: ReportSectionUser
}

export function UserSection({ data }: UserSectionProps) {
  const items = [
    { label: '月間平均DAU', value: `${data.dau.toLocaleString()}人` },
    { label: '月間インストール数', value: `${data.installCount.toLocaleString()}件` },
    { label: '課金率', value: `${(data.conversionRate * 100).toFixed(1)}%` },
    { label: 'ARPPU', value: `¥${data.arppu.toLocaleString()}` },
    { label: '新規売上', value: `¥${data.newSales.toLocaleString()}` },
    { label: '継続売上', value: `¥${data.continuousSales.toLocaleString()}` },
    { label: '合計売上', value: `¥${(data.newSales + data.continuousSales).toLocaleString()}` },
  ]

  return (
    <Page size="A4" orientation="landscape" style={pdfStyles.page}>
      <View style={pdfStyles.sectionHeader}>
        <Text style={pdfStyles.sectionTitle}>ユーザー関連</Text>
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
