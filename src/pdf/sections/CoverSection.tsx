import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { ReportData } from '../../types'

export type OutputMode = 'internal' | 'performer'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansJP',
    flexDirection: 'column',
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceName: {
    fontSize: 40,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  monthLabel: {
    fontSize: 22,
    color: '#C7D2FE',
    marginBottom: 8,
  },
  reportType: {
    fontSize: 14,
    color: '#A5B4FC',
    marginTop: 8,
  },
  badge: {
    marginTop: 24,
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 11,
    color: '#E0E7FF',
  },
})

interface CoverSectionProps {
  meta: ReportData['meta']
  mode: OutputMode
}

export function CoverSection({ meta, mode }: CoverSectionProps) {
  return (
    <Page size="A4" orientation="landscape" style={styles.page}>
      <Text style={styles.serviceName}>{meta.serviceName}</Text>
      <Text style={styles.monthLabel}>{meta.month}</Text>
      <Text style={styles.reportType}>結果報告</Text>
      {mode === 'performer' && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>パフォーマー向け</Text>
        </View>
      )}
    </Page>
  )
}
