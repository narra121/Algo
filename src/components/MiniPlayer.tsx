import { useEffect, useMemo, useState } from 'react'
import type { AttemptDemo } from '../core/types'
import { useStepPlayer } from '../core/useStepPlayer'
import { PlayerControls } from './PlayerControls'
import { Narration } from './Narration'

/**
 * Collapsed-by-default embedded step player for one approach (brute force or
 * journey attempt). Reports the current step's codeLine up via onStepChange so
 * the host card can highlight its already-rendered pseudocode in place.
 */
export function MiniPlayer({
  demo,
  label = 'watch this idea run',
  onStepChange,
}: {
  demo: AttemptDemo
  label?: string
  onStepChange?: (codeLine: number) => void
}) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button className="mini-open" onClick={() => setOpen(true)}>
        ▶ {label}
      </button>
    )
  }
  return (
    <MiniPlayerBody
      demo={demo}
      onStepChange={onStepChange}
      onClose={() => {
        setOpen(false)
        onStepChange?.(-1)
      }}
    />
  )
}

function MiniPlayerBody({
  demo,
  onStepChange,
  onClose,
}: {
  demo: AttemptDemo
  onStepChange?: (codeLine: number) => void
  onClose: () => void
}) {
  const steps = useMemo(() => demo.generateSteps(), [demo])
  const player = useStepPlayer(steps)
  const { Visualizer } = demo

  // Auto-play shortly after expand, once — mirrors the page-load autoplay of section ⑤.
  useEffect(() => {
    const t = setTimeout(() => player.play(), 800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    onStepChange?.(player.step.codeLine)
  }, [player.step, onStepChange])

  return (
    <div className="mini-player">
      <div className="mini-head">
        <button className="mini-close" onClick={onClose}>
          ✕ hide
        </button>
      </div>
      <div className="viz-stage">
        <Visualizer step={player.step} />
      </div>
      <PlayerControls player={player} />
      <Narration key={player.index} text={player.step.description} />
    </div>
  )
}
