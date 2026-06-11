import type { ReactNode } from 'react'

export interface CellPointer {
  label: string
  tone: 'mint' | 'amber'
}

/**
 * One row of array cells, matching the .cells/.cell markup used by the main
 * visualizers. `classFor` returns extra cell classes ('active' | 'warm' |
 * 'dim' | 'done' | '' — combine with spaces); `pointerFor` an optional ▲ label.
 */
export function Cells({
  values,
  classFor,
  pointerFor,
}: {
  values: (number | string)[]
  classFor?: (i: number) => string
  pointerFor?: (i: number) => CellPointer | null
}) {
  return (
    <div className="cells spaced">
      {values.map((v, i) => {
        const extra = classFor?.(i) ?? ''
        const ptr = pointerFor?.(i) ?? null
        return (
          <div key={i} className={`cell${extra ? ` ${extra}` : ''}`}>
            <span className="idx">{i}</span>
            {v}
            {ptr && <span className={`ptr ${ptr.tone}`}>▲ {ptr.label}</span>}
          </div>
        )
      })}
    </div>
  )
}

export function VizCaption({ children }: { children: ReactNode }) {
  return <div className="viz-caption">{children}</div>
}

export function Legend({ items }: { items: { tone?: 'mint' | 'amber'; label: string }[] }) {
  return (
    <div className="legend">
      {items.map((it, i) => (
        <span key={i} className="key">
          <span className={`swatch${it.tone ? ` ${it.tone}` : ''}`} /> {it.label}
        </span>
      ))}
    </div>
  )
}
