import { useState, useRef, useEffect } from 'react'

interface EditableCellProps {
  value: number
  onChange: (value: number) => void
  prefix?: string
  suffix?: string
  className?: string
}

export function EditableCell({ value, onChange, prefix, suffix, className = '' }: EditableCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const commit = () => {
    const num = parseFloat(draft.replace(/,/g, ''))
    if (!isNaN(num)) onChange(num)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={`w-full border border-indigo-400 rounded px-1 text-right text-sm ${className}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
      />
    )
  }

  return (
    <span
      className={`cursor-pointer hover:bg-indigo-50 rounded px-1 text-sm ${className}`}
      onClick={() => { setDraft(String(value)); setEditing(true) }}
    >
      {prefix}{value.toLocaleString()}{suffix}
    </span>
  )
}
