import type { StepPlayer } from '../core/useStepPlayer'

const SPEEDS = [0.5, 1, 2, 4]

export function PlayerControls<S>({ player }: { player: StepPlayer<S> }) {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="controls">
        <button className="ctl" onClick={player.reset} disabled={player.atStart}>
          ⟲ Reset
        </button>
        <button className="ctl" onClick={player.prev} disabled={player.atStart}>
          ← Prev
        </button>
        <button className="ctl play" onClick={player.toggle}>
          {player.playing ? '❚❚ Pause' : '▶ Play'}
        </button>
        <button className="ctl" onClick={player.next} disabled={player.atEnd}>
          Next →
        </button>
        <div className="speed-group">
          {SPEEDS.map(s => (
            <button
              key={s}
              className={player.speed === s ? 'on' : ''}
              onClick={() => player.setSpeed(s)}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
      <div className="scrub">
        <span>
          {player.index + 1}/{player.total}
        </span>
        <input
          type="range"
          min={0}
          max={player.total - 1}
          value={player.index}
          onChange={e => player.goto(Number(e.target.value))}
        />
      </div>
    </div>
  )
}
