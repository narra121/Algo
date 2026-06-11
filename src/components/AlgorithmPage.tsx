import { useMemo } from 'react'
import type { AlgorithmModule } from '../core/types'
import { useStepPlayer } from '../core/useStepPlayer'
import { PlayerControls } from './PlayerControls'
import { PseudocodePanel } from './PseudocodePanel'
import { ProblemsList } from './ProblemsList'

export function AlgorithmPage({ algo, onBack }: { algo: AlgorithmModule; onBack: () => void }) {
  const steps = useMemo(() => algo.generateSteps(), [algo])
  const player = useStepPlayer(steps)
  const { Visualizer } = algo

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

      <div className="stage-grid">
        <section className="panel">
          <h2>Watch it think</h2>
          <div className="viz-stage">
            <Visualizer step={player.step} />
          </div>
          <div className="narration" key={player.index}>
            {player.step.description}
          </div>
          <div style={{ height: 14 }} />
          <PlayerControls player={player} />
        </section>
        <PseudocodePanel lines={algo.pseudocode} hot={player.step.codeLine} />
      </div>

      <div className="below-grid">
        <section className="panel intuition">
          <h2>The intuition</h2>
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
