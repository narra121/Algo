import type { VarEntry } from '../core/types'

/**
 * Live variable table for the current step. Renders nothing when the step
 * carries no vars, so older modules degrade gracefully.
 */
export function VariablesPanel({ vars }: { vars?: VarEntry[] }) {
  if (!vars?.length) return null
  return (
    <div className="vars-panel">
      <div className="viz-caption">variables right now</div>
      <div className="vars-grid">
        {vars.map(v => (
          <div key={v.name} className={`var-chip${v.changed ? ' changed' : ''}`}>
            <span className="var-name">{v.name}</span>
            <span className="var-value">{v.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
