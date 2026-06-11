export function Hint({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="hint">
      {children}
      <span className="hint-box">{text}</span>
    </span>
  )
}

export function InfoDot({ text }: { text: string }) {
  return (
    <span className="hint">
      <span className="info-dot">i</span>
      <span className="hint-box">{text}</span>
    </span>
  )
}
