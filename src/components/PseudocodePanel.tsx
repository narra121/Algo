export function PseudocodePanel({ lines, hot }: { lines: string[]; hot: number }) {
  return (
    <div className="panel code-panel">
      <h2>Pseudocode</h2>
      <div className="code-lines">
        {lines.map((line, i) => (
          <div key={i} className={`code-line${i === hot ? ' hot' : ''}`}>
            <span className="ln">{i + 1}</span>
            <span>{line}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
