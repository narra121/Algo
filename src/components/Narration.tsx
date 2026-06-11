import { Fragment } from 'react'

export function Narration({ text }: { text: string }) {
  const words = text.split(' ')
  return (
    <div className="narration">
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="nw" style={{ animationDelay: `${Math.min(i * 26, 800)}ms` }}>
            {w}
          </span>{' '}
        </Fragment>
      ))}
    </div>
  )
}
