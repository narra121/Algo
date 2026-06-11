import { useState } from 'react'
import type { JourneyAttempt, NaiveApproach } from '../core/types'

const VERDICT = {
  fail: { chip: 'bad', mark: '✗', label: 'dead end' },
  partial: { chip: 'space', mark: '⚠', label: 'works, but…' },
  optimal: { chip: 'time', mark: '✓', label: 'the answer' },
} as const

function AttemptBody({ a }: { a: JourneyAttempt }) {
  return (
    <>
      <p className="jspark">{a.spark}</p>
      <div className="jcode code-lines">
        {a.pseudocode.map((line, i) => (
          <div key={i} className="code-line">
            <span className="ln">{i + 1}</span>
            <span>{line}</span>
          </div>
        ))}
      </div>
      <div className="jchips">
        <span className={`chip ${a.verdict === 'optimal' ? 'time' : 'bad'}`}>time {a.time}</span>
        <span className={`chip ${a.verdict === 'optimal' ? 'space' : 'bad'}`}>space {a.space}</span>
      </div>
    </>
  )
}

/**
 * "The road to the insight": a guided-reveal stepper of attempts, from the
 * brute force the student just read, through tempting wrong turns, to the
 * optimal idea — each flaw hidden until the student commits to a prediction.
 */
export function JourneyPanel({
  naive,
  journey,
}: {
  naive: NaiveApproach
  journey: JourneyAttempt[]
}) {
  // Number of journey attempts whose flaw has been revealed.
  const [revealed, setRevealed] = useState(0)
  const done = revealed >= journey.length

  return (
    <section className="panel journey-card">
      <h2>③ The road to the insight</h2>
      <p className="jintro">
        Nobody invents the clever solution in one jump. Walk the path: each idea below is one a
        real solver would try next — predict where it breaks before you reveal it.
      </p>

      <div className="jsteps">
        {/* Attempt 1 — the brute force, already dissected in section ② above. */}
        <div className="jstep revealed">
          <div className="jrail">
            <span className="jdot fail">✗</span>
          </div>
          <div className="jbody">
            <div className="jtitle">
              <span className="jnum">attempt 1</span> The brute force
              <span className="jverdict fail">dead end</span>
            </div>
            <div className="jchips">
              <span className="chip bad">time {naive.time}</span>
              <span className="chip bad">space {naive.space}</span>
            </div>
            <p className="jinsight">💡 you just saw why it hurts ↑ — now improve on it.</p>
          </div>
        </div>

        {journey.map((a, i) => {
          const num = i + 2
          if (i > revealed) {
            return (
              <div key={i} className="jstep locked">
                <div className="jrail">
                  <span className="jdot">?</span>
                </div>
                <div className="jbody">
                  <div className="jtitle dim">
                    <span className="jnum">attempt {num}</span> ???
                  </div>
                </div>
              </div>
            )
          }
          const v = VERDICT[a.verdict]
          if (i === revealed) {
            return (
              <div key={i} className="jstep current">
                <div className="jrail">
                  <span className="jdot live">{num}</span>
                </div>
                <div className="jbody">
                  <div className="jtitle">
                    <span className="jnum">attempt {num}</span> {a.title}
                  </div>
                  <AttemptBody a={a} />
                  <button className="jreveal" onClick={() => setRevealed(revealed + 1)}>
                    🤔{' '}
                    {a.verdict === 'optimal'
                      ? 'is this finally it? — reveal'
                      : 'will this work? — reveal where it breaks'}
                  </button>
                </div>
              </div>
            )
          }
          return (
            <div key={i} className={`jstep revealed ${a.verdict}`}>
              <div className="jrail">
                <span className={`jdot ${a.verdict}`}>{v.mark}</span>
              </div>
              <div className="jbody">
                <div className="jtitle">
                  <span className="jnum">attempt {num}</span> {a.title}
                  <span className={`jverdict ${a.verdict}`}>{v.label}</span>
                </div>
                <AttemptBody a={a} />
                <p className={`jbreaks ${a.verdict}`}>
                  <strong>{a.verdict === 'optimal' ? '✓ why it holds:' : `${v.mark} where it breaks:`}</strong>{' '}
                  {a.breaks}
                </p>
                <p className="jinsight">💡 {a.insight}</p>
              </div>
            </div>
          )
        })}
      </div>

      {done && <p className="joutro">↓ and that — is the aha moment.</p>}
    </section>
  )
}
