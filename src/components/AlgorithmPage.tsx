import { useEffect, useMemo, useRef } from 'react'
import type { AlgorithmModule } from '../core/types'
import { useStepPlayer } from '../core/useStepPlayer'
import { PlayerControls } from './PlayerControls'
import { PseudocodePanel } from './PseudocodePanel'
import { ProblemsList } from './ProblemsList'

function Narration({ text }: { text: string }) {
  const words = text.split(' ')
  return (
    <div className="narration">
      {words.map((w, i) => (
        <span key={i} className="nw" style={{ animationDelay: `${Math.min(i * 26, 800)}ms` }}>
          {w}{' '}
        </span>
      ))}
    </div>
  )
}

export function AlgorithmPage({ algo, onBack }: { algo: AlgorithmModule; onBack: () => void }) {
  const steps = useMemo(() => algo.generateSteps(), [algo])
  const player = useStepPlayer(steps)
  const { Visualizer } = algo

  // Bring the page to life: start the animation by itself, once, shortly after load.
  const autoplayed = useRef(false)
  useEffect(() => {
    if (autoplayed.current) return
    autoplayed.current = true
    const t = setTimeout(() => player.play(), 1600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <header className="algo-head">
        <button className="back" onClick={onBack}>
          ← all patterns
        </button>
        <h1>
          <span>{algo.icon}</span> {algo.name}
        </h1>
        <p className="tagline">{algo.tagline}</p>
        <div className="badges">
          <span className="chip time">time {algo.complexity.time}</span>
          <span className="chip space">space {algo.complexity.space}</span>
          <span className="chip">{algo.category}</span>
        </div>
      </header>

      <section className="panel problem-card">
        <h2>① The problem we're about to solve</h2>
        <div className="ptitle">{algo.problem.title}</div>
        <p className="pstatement">{algo.problem.statement}</p>
        <div className="pfacts">
          <div className="pfact">
            <span className="plabel">given</span>
            {algo.problem.input}
          </div>
          <div className="pfact">
            <span className="plabel">find</span>
            {algo.problem.output}
          </div>
          <div className="pfact naive">
            <span className="plabel">the painful way</span>
            {algo.problem.naive}
          </div>
        </div>
      </section>

      <section className="aha-banner">
        <div className="aha-label">② the aha moment</div>
        <p className="aha-text">{algo.aha}</p>
      </section>

      <div className="stage-grid">
        <section className="panel">
          <h2>③ Now watch that idea run</h2>
          <div className="viz-stage">
            <Visualizer step={player.step} />
          </div>
          <Narration key={player.index} text={player.step.description} />
          <div style={{ height: 14 }} />
          <PlayerControls player={player} />
        </section>
        <PseudocodePanel lines={algo.pseudocode} hot={player.step.codeLine} />
      </div>

      <div className="below-grid">
        <section className="panel intuition">
          <h2>Why this works — the deeper intuition</h2>
          {algo.intuition.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>
        <section className="panel complexity">
          <h2>Why these bounds</h2>
          <div className="row">
            <span className="chip time">time {algo.complexity.time}</span>
            <span className="chip space">space {algo.complexity.space}</span>
          </div>
          <p className="why">{algo.complexity.explanation}</p>
        </section>
      </div>

      <ProblemsList problems={algo.problems} />
    </div>
  )
}
