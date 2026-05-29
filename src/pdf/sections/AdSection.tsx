import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { pdfStyles } from '../fonts'
import type { ReportSectionAd } from '../../types'

const localStyles = StyleSheet.create({
  col1: { width: '30%' },
  col2: { width: '25%' },
  col3: { width: '25%' },
  col4: { width: '20%' },
})

interface AdSectionProps {
  data: ReportSectionAd
}

export function AdSection({ data }: AdSectionProps) {
  return (
    <Page size="A4" orientation="landscape" style={pdfStyles.page}>
      <View style={pdfStyles.sectionHeader}>
        <Text style={pdfStyles.sectionTitle}>広告成果</Text>
      </View>
      <View style={pdfStyles.body}>
        <View style={pdfStyles.row}>
          <Text style={pdfStyles.label}>全体ROAS</Text>
          <Text style={pdfStyles.value}>{(data.totalRoas * 100).toFixed(0)}%</Text>
        </View>
        <Text style={pdfStyles.subHeading}>代理店別実績</Text>
        <View style={pdfStyles.tableHeaderRow}>
          <Text style={[pdfStyles.tableHeaderCell, localStyles.col1]}>代理店名</Text>
          <Text style={[pdfStyles.tableHeaderCell, localStyles.col2]}>広告費</Text>
          <Text style={[pdfStyles.tableHeaderCell, localStyles.col3]}>売上</Text>
          <Text style={[pdfStyles.tableHeaderCell, localStyles.col4]}>ROAS</Text>
        </View>
        {data.agencies.map((agency, i) => (
          <View key={i} style={pdfStyles.tableRow}>
            <Text style={[pdfStyles.tableCell, localStyles.col1]}>{agency.name}</Text>
            <Text style={[pdfStyles.tableCell, localStyles.col2]}>¥{agency.adBudget.toLocaleString()}</Text>
            <Text style={[pdfStyles.tableCell, localStyles.col3]}>¥{agency.sales.toLocaleString()}</Text>
            <Text style={[pdfStyles.tableCell, localStyles.col4]}>{(agency.roas * 100).toFixed(0)}%</Text>
          </View>
        ))}
        {data.memo ? <Text style={pdfStyles.memo}>{data.memo}</Text> : null}
      </View>
    </Page>
  )
}
