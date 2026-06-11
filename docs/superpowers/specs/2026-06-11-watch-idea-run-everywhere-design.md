# Design: "Watch this idea run" for every approach

**Date:** 2026-06-11
**Status:** Approved

## Goal

Every approach shown on an algorithm page becomes animated. Today only section ⑤
("Now watch that idea run") has a step player; the brute-force card (②) and each
journey attempt (③) show only static pseudocode. After this change:

- Section ② gains an embedded, collapsed-by-default step player animating the
  brute-force solution.
- Every journey attempt in section ③ gains the same, shown once the attempt is
  revealed.
- All demos run on the **same concrete input** as the page's main animation, so
  the operation counts quoted in the prose (e.g. "28 pair-checks") are visible
  on screen.

Scope: all 12 algorithm modules, in one pass. That is one brute-force demo plus
one demo per journey attempt per algorithm — roughly 40 mini-animations.

## Data model (`src/core/types.ts`)

One new concept, hung optionally off both existing content types:

```ts
export interface AttemptDemo<S = any> {
  /** Pure function producing the full deterministic step list for THIS attempt. */
  generateSteps: () => Step<S>[]
  /** Renders one step's state. Pure w.r.t. props. */
  Visualizer: ComponentType<{ step: Step<S> }>
}

export interface NaiveApproach  { /* existing fields */ demo?: AttemptDemo }
export interface JourneyAttempt { /* existing fields */ demo?: AttemptDemo }
```

`Step` is reused unchanged. `Step.codeLine` indexes into the *attempt's own*
`pseudocode` array, so playback highlights the pseudocode lines already shown in
the card — same mechanic as the main panel.

`demo` is optional so the app renders correctly for any attempt that lacks one
(no button shown). The end state of this project is full coverage, but the field
stays optional as the extension point for future algorithms.

## New component: `MiniPlayer` (`src/components/MiniPlayer.tsx`)

- Collapsed state: a single `▶ watch this idea run` button.
- Expanding it mounts the demo and auto-plays after a short beat (~800 ms),
  mirroring the page-load autoplay of section ⑤.
- Expanded state renders: visualizer stage, the existing `PlayerControls`, the
  existing word-by-word `Narration`, and the attempt's pseudocode with the hot
  line highlighted.
- MiniPlayer **owns** its `useStepPlayer` instance and renders the pseudocode
  itself when expanded (the host card hides its static pseudocode block while
  expanded). This keeps line-highlighting internal — `JourneyPanel` and the
  naive card need only pass `{ demo, pseudocode }` and swap which block is
  visible.
- Each MiniPlayer is independent; multiple may be expanded at once. Steps are
  generated lazily on first expand (`useMemo` gated on expanded).

## Wiring

- **Section ② (`AlgorithmPage.tsx`):** MiniPlayer rendered under the
  naive-grid, driven by `algo.problem.naive.demo` and
  `algo.problem.naive.pseudocode`.
- **Section ③ (`JourneyPanel.tsx`):** each **revealed** attempt renders a
  MiniPlayer under its `AttemptBody`. The current (unrevealed-flaw) attempt and
  locked attempts show no player — the predict-before-reveal mechanic is
  untouched, and the animation never spoils the flaw.
- Attempt 1 in the journey rail (the brute-force stub) stays a stub pointing up
  to section ②; its demo lives in section ② only.

## Content plan (~40 demos)

Two authoring aids keep the volume tractable and the look consistent:

1. **Shared primitives** — `src/components/vizPrimitives.tsx` exports the
   cell-row / pointer / legend / caption patterns already repeated across
   modules. Most array-based demos become 20–40 lines of generator + a small
   composition of primitives.
2. **Visualizer reuse** — graph/tree modules (BFS, DFS-backtracking, Dijkstra,
   topological sort, union-find, heap) reuse their module's existing visualizer
   components where the state shape fits; naive attempts use simplified states
   (e.g. brute-force path enumeration highlights repeated visits).

Demo content rules:

- Same input data as the page's main animation.
- Narrations follow the house style: concrete numbers, present tense, the
  wasted work made explicit ("this is the 14th time we re-check 2 + …").
- Brute-force demos may **truncate** long runs: show enough iterations to feel
  the pain, then a closing step that states the full count ("…and so on: 28
  checks in the worst case"). A demo must end with the answer or the verdict.
- `codeLine` must track the attempt's pseudocode accurately at every step.

## What does not change

- `useStepPlayer`, `PlayerControls`, `PseudocodePanel`, section ⑤, the page
  layout, and the journey reveal/prediction flow.
- CSS additions are scoped to the mini-player (`.mini-player`, expanded sizing
  inside `.jbody` and `.naive-card`).

## Error handling

- Attempts without `demo` render exactly as today.
- Step generators are pure and deterministic; an empty step list disables the
  expand button (defensive, should not occur).

## Testing

- Type-level: `AttemptDemo` integrates without breaking existing modules
  (`tsc` clean).
- Manual: expand/collapse per attempt, autoplay-on-expand, line highlighting
  against attempt pseudocode, multiple players expanded simultaneously,
  reveal flow unaffected, all 12 pages render with demos.
- Existing `verify-narration.mjs`-style check extended if applicable: every
  demo's steps have non-empty descriptions and valid `codeLine` ranges.

## Alternatives considered

- **One generic shared visualizer for all demos** — less code, but cannot
  faithfully show hash sets, recursion trees, or graphs; the journey would feel
  flatter than section ⑤. Rejected.
- **Always-visible mini players** — makes the journey section extremely tall
  and competes with the predict-then-reveal rhythm. Rejected in favor of
  collapsed-by-default.
- **Auto-looping animation without controls** — lightest weight but the student
  cannot step through, which is the core value. Rejected.
