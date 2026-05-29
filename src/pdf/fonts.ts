import { Font, StyleSheet } from '@react-pdf/renderer'

Font.register({
  family: 'NotoSansJP',
  fonts: [
    { src: '/fonts/NotoSansJP-Regular.otf', fontWeight: 'normal' },
  ],
})

export const pdfStyles = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansJP',
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 0,
  },
  sectionHeader: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  body: {
    flex: 1,
    padding: 32,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
    alignItems: 'center',
  },
  label: {
    width: '35%',
    fontSize: 10,
    color: '#6B7280',
  },
  value: {
    flex: 1,
    fontSize: 12,
    color: '#111827',
    fontWeight: 'bold',
  },
  memo: {
    marginTop: 16,
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.6,
    backgroundColor: '#F9FAFB',
    padding: 12,
  },
  subHeading: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    fontSize: 9,
    color: '#4F46E5',
    fontWeight: 'bold',
  },
  tableCell: {
    fontSize: 10,
    color: '#374151',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
})
