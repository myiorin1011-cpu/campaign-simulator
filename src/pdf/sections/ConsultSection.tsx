import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { pdfStyles } from '../fonts'
import type { ReportSectionConsult } from '../../types'

const localStyles = StyleSheet.create({
  entryContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderLeftWidth: 3,
    borderLeftColor: '#4F46E5',
  },
  managerName: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  comment: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.6,
  },
})

interface ConsultSectionProps {
  data: ReportSectionConsult
}

export function ConsultSection({ data }: ConsultSectionProps) {
  return (
    <Page size="A4" orientation="landscape" style={pdfStyles.page}>
      <View style={pdfStyles.sectionHeader}>
        <Text style={pdfStyles.sectionTitle}>コンサル関連</Text>
      </View>
      <View style={pdfStyles.body}>
        {data.entries.map((entry, i) => (
          <View key={i} style={localStyles.entryContainer}>
            <Text style={localStyles.managerName}>{entry.managerName}</Text>
            <Text style={localStyles.comment}>{entry.comment}</Text>
          </View>
        ))}
      </View>
    </Page>
  )
}
