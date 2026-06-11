import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Step } from './types'

export interface StepPlayer<S> {
  step: Step<S>
  index: number
  total: number
  playing: boolean
  speed: number
  atStart: boolean
  atEnd: boolean
  toggle: () => void
  play: () => void
  next: () => void
  prev: () => void
  reset: () => void
  goto: (i: number) => void
  setSpeed: (s: number) => void
}

const SPEED_MS: Record<number, number> = { 0.5: 1800, 1: 1000, 2: 550, 4: 280 }

export function useStepPlayer<S>(steps: Step<S>[]): StepPlayer<S> {
  const [rawIndex, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const total = steps.length
  // Clamp in case the steps array shrinks under a live index.
  const index = Math.min(rawIndex, total - 1)
  const atEnd = index >= total - 1
  const atStart = index === 0

  useEffect(() => {
    if (!playing) return
    if (atEnd) {
      setPlaying(false)
      return
    }
    const t = setInterval(
      () => setIndex(i => Math.min(i + 1, total - 1)),
      SPEED_MS[speed] ?? 1000,
    )
    return () => clearInterval(t)
  }, [playing, speed, atEnd, total])

  const next = useCallback(() => setIndex(i => Math.min(i + 1, total - 1)), [total])
  const prev = useCallback(() => setIndex(i => Math.max(i - 1, 0)), [])
  const reset = useCallback(() => {
    setPlaying(false)
    setIndex(0)
  }, [])
  const goto = useCallback(
    (i: number) => setIndex(Math.max(0, Math.min(i, total - 1))),
    [total],
  )
  const play = useCallback(() => setPlaying(true), [])
  const toggle = useCallback(() => {
    setPlaying(p => {
      if (!p && atEnd) {
        setIndex(0)
        return true
      }
      return !p
    })
  }, [atEnd])

  return useMemo(
    () => ({
      step: steps[index],
      index,
      total,
      playing,
      speed,
      atStart,
      atEnd,
      toggle,
      play,
      next,
      prev,
      reset,
      goto,
      setSpeed,
    }),
    [steps, index, total, playing, speed, atStart, atEnd, toggle, play, next, prev, reset, goto],
  )
}
