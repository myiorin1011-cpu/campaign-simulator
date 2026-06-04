interface KPICardProps {
  label: string
  value: string
  sub?: string
  color?: 'blue' | 'green' | 'purple' | 'orange'
}

const colorMap: Record<string, { border: string; label: string; value: string; bg: string }> = {
  blue:   { border: 'var(--accent)',    label: '#818cf8', value: '#c7d2fe', bg: 'rgba(99,102,241,0.08)' },
  green:  { border: 'var(--positive)', label: '#6ee7b7', value: '#a7f3d0', bg: 'rgba(63,185,80,0.08)'  },
  purple: { border: '#a78bfa',          label: '#c4b5fd', value: '#ddd6fe', bg: 'rgba(167,139,250,0.08)' },
  orange: { border: 'var(--warning)',  label: '#fcd34d', value: '#fde68a', bg: 'rgba(210,153,34,0.08)'  },
}

export function KPICard({ label, value, sub, color = 'blue' }: KPICardProps) {
  const c = colorMap[color]
  return (
    <div style={{
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: 10,
      padding: '14px 16px',
      borderLeftWidth: 3,
      borderLeftColor: c.border,
    }}>
      <p style={{ fontSize: 11, fontWeight: 500, color: c.label, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}
      </p>
      <p style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontVariantNumeric: 'tabular-nums',
        fontSize: '1.375rem',
        fontWeight: 500,
        color: c.value,
        letterSpacing: '-0.02em',
        lineHeight: 1.2,
      }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: 11, marginTop: 5, color: 'var(--text-muted)' }}>{sub}</p>
      )}
    </div>
  )
}
