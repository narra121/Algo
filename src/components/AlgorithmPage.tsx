import { useEffect, useMemo, useRef, useState } from 'react'
import type { AlgorithmModule, Complexity, NaiveApproach } from '../core/types'
import { MiniPlayer } from './MiniPlayer'
import { useStepPlayer } from '../core/useStepPlayer'
import { PlayerControls } from './PlayerControls'
import { PseudocodePanel } from './PseudocodePanel'
import { ProblemsList } from './ProblemsList'
import { JourneyPanel } from './JourneyPanel'
import { Narration } from './Narration'
import { VariablesPanel } from './VariablesPanel'

function NaiveCard({ naive, optimal }: { naive: NaiveApproach; optimal: Complexity }) {
  const [hot, setHot] = useState(-1)
  return (
    <section className="panel naive-card">
      <h2>② The brute force — and why it hurts</h2>
      <p className="pstatement">{naive.description}</p>
      <div className="naive-grid">
        <div className="naive-code">
          <div className="viz-caption">brute-force pseudocode</div>
          <div className="code-lines">
            {naive.pseudocode.map((line, i) => (
              <div key={i} className={`code-line${i === hot ? ' hot' : ''}`}>
                <span className="ln">{i + 1}</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="naive-cost">
          <div className="viz-caption">what it costs</div>
          <div className="row">
            <span className="chip bad">time {naive.time}</span>
            <span className="chip bad">space {naive.space}</span>
          </div>
          <p className="why">{naive.issues}</p>
          <div className="vs-line">
            <span className="vs-label">this pattern instead</span>
            <span className="chip time">time {optimal.time}</span>
            <span className="chip space">space {optimal.space}</span>
          </div>
        </div>
      </div>
      {naive.demo && (
        <MiniPlayer demo={naive.demo} label="watch the brute force run" onStepChange={setHot} />
      )}
    </section>
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
        </div>
      </section>

      <NaiveCard naive={algo.problem.naive} optimal={algo.complexity} />

      <JourneyPanel naive={algo.problem.naive} journey={algo.journey} />

      <section className="aha-banner">
        <div className="aha-label">④ the aha moment</div>
        <p className="aha-text">{algo.aha}</p>
      </section>

      <div className="stage-grid">
        <section className="panel">
          <h2>⑤ Now watch that idea run</h2>
          <div className="viz-stage">
            <Visualizer step={player.step} />
          </div>
          <PlayerControls player={player} />
          <VariablesPanel vars={player.step.vars} />
          <div style={{ height: 14 }} />
          <Narration key={player.index} text={player.step.description} />
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
