# "Watch This Idea Run" Everywhere — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the brute-force card (section ②) and every revealed journey attempt (section ③) on all 12 algorithm pages an embedded, collapsed-by-default step player — the same animated experience as section ⑤.

**Architecture:** A new optional `demo` field (`AttemptDemo = { generateSteps, Visualizer }`) on `NaiveApproach` and `JourneyAttempt`; a new `MiniPlayer` component that owns a `useStepPlayer` and reports the hot pseudocode line up to its host card (the card's already-rendered pseudocode block highlights in place — no layout swap); per-module `demos.tsx` files holding the brute-force + attempt step generators and small visualizers composed from shared primitives. The optimal journey attempt reuses the module's existing main `generateSteps`/`Visualizer`. Registry build-time contract checks enforce full coverage at the end.

**Tech Stack:** React 18 + TypeScript + Vite (existing). No new dependencies. No test framework exists in this repo — verification is `npx tsc --noEmit`, the registry's build-time contract checks (they throw on dev-server load), and a Playwright sweep script (`verify-demos.mjs`, same style as the existing `verify-narration.mjs`).

**Spec:** `docs/superpowers/specs/2026-06-11-watch-idea-run-everywhere-design.md`

**One refinement vs the spec:** the spec said MiniPlayer renders its own pseudocode while expanded and the host hides its static block. During planning this proved worse than highlighting the host's existing pseudocode block *in place* via an `onStepChange(codeLine)` callback — no layout swap, less code, identical learning effect. The plan uses the callback approach throughout.

**Demo inventory (51 total):**

| module | brute force | non-optimal attempts to author | optimal (reuse main viz) |
|---|---|---|---|
| two-pointers | 1 | 2 | 1 |
| sliding-window | 1 | 2 | 1 |
| binary-search | 1 | 2 | 1 |
| bfs | 1 | 3 | 1 |
| dfs-backtracking | 1 | 2 | 1 |
| dynamic-programming | 1 | 3 | 1 |
| merge-sort | 1 | 2 | 1 |
| quick-sort | 1 | 2 | 1 |
| heap | 1 | 2 | 1 |
| union-find | 1 | 2 | 1 |
| dijkstra | 1 | 3 | 1 |
| topological-sort | 1 | 2 | 1 |
| **total** | **12** | **27** | **12** |

---

## File Structure

```
src/core/types.ts                       MODIFY — add AttemptDemo, demo? fields
src/components/Narration.tsx            CREATE — extracted from AlgorithmPage
src/components/vizPrimitives.tsx        CREATE — Cells / VizCaption / Legend
src/components/MiniPlayer.tsx           CREATE — collapsed player
src/components/AlgorithmPage.tsx        MODIFY — naive-card wiring, Narration import
src/components/JourneyPanel.tsx         MODIFY — per-attempt wiring
src/styles.css                          MODIFY — .mini-open / .mini-player styles
src/algorithms/<id>/demos.tsx           CREATE ×12 — demo generators + visualizers
src/algorithms/<id>/index.tsx           MODIFY ×12 — wire demos into naive/journey
src/algorithms/registry.ts              MODIFY (last) — demo contract checks
verify-demos.mjs                        CREATE — Playwright sweep
```

---

## Content rules (apply to EVERY demo — copy into each content task's review)

1. **Same input data** as the page's main animation (e.g. two-pointers always uses `[2, 5, 8, 11, 15, 19, 23, 28]`, target 34). Import or re-declare the same constants; never invent new data.
2. **Honest simulation.** Generate steps by actually executing the attempt's algorithm on that input. If the simulation finds a different (still valid) answer than the prose mentions, the narration must acknowledge it (see two-pointers hash-set demo below, which finds 15 + 19, not 11 + 23).
3. **Narration house style:** present tense, concrete numbers, wasted work made explicit ("…that's the 14th check, and we've learned nothing reusable").
4. **Truncation allowed for long brute forces:** show enough full iterations to feel the pain (≥8 steps), then one summarizing step ("…and so on — N checks in the worst case"), then the finding/verdict step. A demo must end with the answer or an explicit verdict.
5. **`codeLine` indexes the attempt's OWN `pseudocode` array** (the one rendered in its card), `-1` for none. Every step's `codeLine` must be `>= -1` and `< pseudocode.length`.
6. **Step count per demo:** 8–25 steps. First step sets the scene; last step states the cost lesson.
7. **The module's `index.tsx` is the source of truth** for input data, attempt prose, and pseudocode. Read it fully before writing `demos.tsx`.

---

### Task 1: `AttemptDemo` type + `demo` fields

**Files:**
- Modify: `src/core/types.ts`

- [ ] **Step 1: Add the type and fields**

In `src/core/types.ts`, add after the `Step` interface (line 11):

```ts
/** An embedded, on-demand animation of ONE approach (brute force or journey attempt). */
export interface AttemptDemo<S = any> {
  /** Pure function producing the full deterministic step list for this attempt. */
  generateSteps: () => Step<S>[]
  /** Renders one step's state. Pure w.r.t. props. */
  Visualizer: ComponentType<{ step: Step<S> }>
}
```

Add to the END of `NaiveApproach` (after `issues`):

```ts
  /** Optional embedded animation of this brute force running on the page's input. */
  demo?: AttemptDemo
```

Add to the END of `JourneyAttempt` (after `insight`):

```ts
  /** Optional embedded animation of this attempt running on the page's input. */
  demo?: AttemptDemo
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean (the fields are optional; nothing else changes).

- [ ] **Step 3: Commit**

```bash
git add src/core/types.ts
git commit -m "feat: add optional AttemptDemo to NaiveApproach and JourneyAttempt"
```

---

### Task 2: Extract `Narration` into its own component

**Files:**
- Create: `src/components/Narration.tsx`
- Modify: `src/components/AlgorithmPage.tsx:1-22`

- [ ] **Step 1: Create `src/components/Narration.tsx`**

Move the `Narration` function out of `AlgorithmPage.tsx` verbatim, exported:

```tsx
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
```

- [ ] **Step 2: Update `AlgorithmPage.tsx`**

Delete the local `Narration` function (lines 9–22) and the now-unused `Fragment` import; add:

```tsx
import { Narration } from './Narration'
```

- [ ] **Step 3: Typecheck and run**

Run: `npx tsc --noEmit` — expected clean.
Run: `npm run dev`, open any algorithm page, confirm the section ⑤ narration still animates word by word.

- [ ] **Step 4: Commit**

```bash
git add src/components/Narration.tsx src/components/AlgorithmPage.tsx
git commit -m "refactor: extract Narration component for reuse"
```

---

### Task 3: Shared viz primitives

**Files:**
- Create: `src/components/vizPrimitives.tsx`

These mirror the cell-row / legend / caption markup already used by every module's main visualizer (see `src/algorithms/two-pointers/index.tsx:61-95`), so demo visualizers compose instead of copy.

- [ ] **Step 1: Create `src/components/vizPrimitives.tsx`**

```tsx
import type { ReactNode } from 'react'

export interface CellPointer {
  label: string
  tone: 'mint' | 'amber'
}

/**
 * One row of array cells, matching the .cells/.cell markup used by the main
 * visualizers. `classFor` returns extra cell classes ('active' | 'warm' |
 * 'dim' | 'done' | '' — combine with spaces); `pointerFor` an optional ▲ label.
 */
export function Cells({
  values,
  classFor,
  pointerFor,
}: {
  values: (number | string)[]
  classFor?: (i: number) => string
  pointerFor?: (i: number) => CellPointer | null
}) {
  return (
    <div className="cells spaced">
      {values.map((v, i) => {
        const extra = classFor?.(i) ?? ''
        const ptr = pointerFor?.(i) ?? null
        return (
          <div key={i} className={`cell${extra ? ` ${extra}` : ''}`}>
            <span className="idx">{i}</span>
            {v}
            {ptr && <span className={`ptr ${ptr.tone}`}>▲ {ptr.label}</span>}
          </div>
        )
      })}
    </div>
  )
}

export function VizCaption({ children }: { children: ReactNode }) {
  return <div className="viz-caption">{children}</div>
}

export function Legend({ items }: { items: { tone?: 'mint' | 'amber'; label: string }[] }) {
  return (
    <div className="legend">
      {items.map((it, i) => (
        <span key={i} className="key">
          <span className={`swatch${it.tone ? ` ${it.tone}` : ''}`} /> {it.label}
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` — expected clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/vizPrimitives.tsx
git commit -m "feat: shared cell-row/caption/legend viz primitives for demos"
```

---

### Task 4: `MiniPlayer` component + CSS

**Files:**
- Create: `src/components/MiniPlayer.tsx`
- Modify: `src/styles.css` (append)

- [ ] **Step 1: Create `src/components/MiniPlayer.tsx`**

```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
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
  const autoplayed = useRef(false)
  useEffect(() => {
    if (autoplayed.current) return
    autoplayed.current = true
    const t = setTimeout(() => player.play(), 800)
    return () => clearTimeout(t)
  }, [player])

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
```

- [ ] **Step 2: Append styles to `src/styles.css`**

```css
/* ---- embedded mini player (brute-force card + journey attempts) ---- */
.mini-open {
  margin-top: 12px;
  align-self: flex-start;
  background: var(--mint-dim);
  color: var(--mint);
  border: 1px solid var(--mint);
  border-radius: 8px;
  padding: 8px 14px;
  font: inherit;
  font-size: 0.92rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.mini-open:hover {
  background: var(--mint);
  color: var(--bg);
}
.mini-player {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-top: 1px dashed rgba(233, 237, 255, 0.18);
  padding-top: 12px;
}
.mini-player .viz-stage {
  min-height: 150px;
}
.mini-head {
  display: flex;
  justify-content: flex-end;
}
.mini-close {
  background: none;
  border: none;
  color: var(--ink);
  opacity: 0.55;
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}
.mini-close:hover {
  opacity: 1;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit` — expected clean (component not yet used anywhere).

- [ ] **Step 4: Commit**

```bash
git add src/components/MiniPlayer.tsx src/styles.css
git commit -m "feat: MiniPlayer — collapsed embedded step player with hot-line callback"
```

---

### Task 5: Wire the brute-force card (section ②)

**Files:**
- Modify: `src/components/AlgorithmPage.tsx`

- [ ] **Step 1: Extract the naive card into a small component with hot-line state**

In `AlgorithmPage.tsx`, replace the inline section ② JSX (the `<section className="panel naive-card">…</section>` block) with `<NaiveCard naive={algo.problem.naive} optimal={algo.complexity} />` and add below the `Narration` import:

```tsx
import { useState } from 'react'
import type { Complexity, NaiveApproach } from '../core/types'
import { MiniPlayer } from './MiniPlayer'

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
```

(The JSX inside is the existing markup verbatim, with `algo.problem.naive` → `naive`, `algo.complexity` → `optimal`, plus the `hot` class and the trailing `MiniPlayer`.)

- [ ] **Step 2: Typecheck and run**

Run: `npx tsc --noEmit` — expected clean.
Run: `npm run dev` — every page renders identically (no module has a `demo` yet, so no button appears).

- [ ] **Step 3: Commit**

```bash
git add src/components/AlgorithmPage.tsx
git commit -m "feat: brute-force card hosts MiniPlayer with in-place pseudocode highlighting"
```

---

### Task 6: Wire the journey attempts (section ③)

**Files:**
- Modify: `src/components/JourneyPanel.tsx`

- [ ] **Step 1: Add demo support to `AttemptBody`**

Replace `AttemptBody` in `JourneyPanel.tsx` with:

```tsx
import { MiniPlayer } from './MiniPlayer'

function AttemptBody({ a, withDemo = false }: { a: JourneyAttempt; withDemo?: boolean }) {
  const [hot, setHot] = useState(-1)
  return (
    <>
      <p className="jspark">{a.spark}</p>
      <div className="jcode code-lines">
        {a.pseudocode.map((line, i) => (
          <div key={i} className={`code-line${withDemo && i === hot ? ' hot' : ''}`}>
            <span className="ln">{i + 1}</span>
            <span>{line}</span>
          </div>
        ))}
      </div>
      <div className="jchips">
        <span className={`chip ${a.verdict === 'optimal' ? 'time' : 'bad'}`}>time {a.time}</span>
        <span className={`chip ${a.verdict === 'optimal' ? 'space' : 'bad'}`}>space {a.space}</span>
      </div>
      {withDemo && a.demo && <MiniPlayer demo={a.demo} onStepChange={setHot} />}
    </>
  )
}
```

- [ ] **Step 2: Enable demos ONLY for revealed attempts**

In the `i < revealed` branch (the fully-revealed card, currently `<AttemptBody a={a} />` at the bottom of the map), change to `<AttemptBody a={a} withDemo />`. The `i === revealed` (predict-before-reveal) branch stays `<AttemptBody a={a} />` — the animation must never spoil the flaw.

Place the existing `jbreaks` / `jinsight` paragraphs ABOVE the MiniPlayer? No — keep DOM order as is: `AttemptBody` (which now ends with the MiniPlayer button) renders first, then `jbreaks`/`jinsight`. The button sits between the chips and the "where it breaks" text. To keep the reveal text adjacent to the chips, move the MiniPlayer rendering AFTER the insight instead: remove the MiniPlayer line from `AttemptBody` and render it in the revealed branch directly, after `<p className="jinsight">…</p>`:

```tsx
{a.demo && <MiniPlayer demo={a.demo} onStepChange={setHot} />}
```

This requires the `hot` state to live in the revealed-branch card. Since hooks can't go inside the `.map`, wrap the revealed card in its own component:

```tsx
function RevealedAttempt({ a, num }: { a: JourneyAttempt; num: number }) {
  const v = VERDICT[a.verdict]
  const [hot, setHot] = useState(-1)
  return (
    <div className={`jstep revealed ${a.verdict}`}>
      <div className="jrail">
        <span className={`jdot ${a.verdict}`}>{v.mark}</span>
      </div>
      <div className="jbody">
        <div className="jtitle">
          <span className="jnum">attempt {num}</span> {a.title}
          <span className={`jverdict ${a.verdict}`}>{v.label}</span>
        </div>
        <AttemptBody a={a} hot={hot} />
        <p className={`jbreaks ${a.verdict}`}>
          <strong>{a.verdict === 'optimal' ? '✓ why it holds:' : `${v.mark} where it breaks:`}</strong>{' '}
          {a.breaks}
        </p>
        <p className="jinsight">💡 {a.insight}</p>
        {a.demo && <MiniPlayer demo={a.demo} onStepChange={setHot} />}
      </div>
    </div>
  )
}
```

and `AttemptBody` simplifies to taking `hot` (no state, no MiniPlayer):

```tsx
function AttemptBody({ a, hot = -1 }: { a: JourneyAttempt; hot?: number }) {
  return (
    <>
      <p className="jspark">{a.spark}</p>
      <div className="jcode code-lines">
        {a.pseudocode.map((line, i) => (
          <div key={i} className={`code-line${i === hot ? ' hot' : ''}`}>
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
```

The revealed branch in the map becomes `return <RevealedAttempt key={i} a={a} num={num} />`. The current-attempt branch keeps `<AttemptBody a={a} />` (defaults: no highlight, no demo).

- [ ] **Step 3: Typecheck and run**

Run: `npx tsc --noEmit` — expected clean.
Run: `npm run dev` — journey reveal flow works exactly as before on every page (still no demos in data).

- [ ] **Step 4: Commit**

```bash
git add src/components/JourneyPanel.tsx
git commit -m "feat: revealed journey attempts host MiniPlayer below the insight"
```

---

### Task 7: Two-pointers demos (the reference implementation)

**Files:**
- Create: `src/algorithms/two-pointers/demos.tsx`
- Modify: `src/algorithms/two-pointers/index.tsx`

This is the exemplar every later module task follows. Read `src/algorithms/two-pointers/index.tsx` first.

- [ ] **Step 1: Move shared constants**

In `index.tsx`, export the data constants so `demos.tsx` uses the identical input:

```tsx
export const ARR = [2, 5, 8, 11, 15, 19, 23, 28]
export const TARGET = 34
```

- [ ] **Step 2: Create `src/algorithms/two-pointers/demos.tsx`**

Three demos. All simulated honestly on `ARR`/`TARGET` (verified counts: brute force finds 11+23 on check 21; the hash set finds 15+19 at the 6th element — a different valid pair, the narration says so; binary-search-per-complement finds 11+23 with 11 probes total).

```tsx
import type { AttemptDemo, Step } from '../../core/types'
import { Cells, Legend, VizCaption } from '../../components/vizPrimitives'
import { ARR, TARGET } from './index'

/* ---------- demo 1: brute force — check every pair ---------- */

interface BFState {
  i: number
  j: number
  sum: number | null
  checks: number
  hit: boolean
}

function bruteSteps(): Step<BFState>[] {
  const steps: Step<BFState>[] = []
  steps.push({
    state: { i: 0, j: 1, sum: null, checks: 0, hit: false },
    description: `Check every pair until one sums to ${TARGET}. With ${ARR.length} numbers that is up to ${(ARR.length * (ARR.length - 1)) / 2} pair-checks. Start: pair up the first two.`,
    codeLine: 0,
  })
  let checks = 0
  for (let i = 0; i < ARR.length - 1; i++) {
    for (let j = i + 1; j < ARR.length; j++) {
      checks++
      const sum = ARR[i] + ARR[j]
      if (sum === TARGET) {
        steps.push({
          state: { i, j, sum, checks, hit: true },
          description: `${ARR[i]} + ${ARR[j]} = ${sum} — found it! But it took ${checks} checks to get here, and nothing learned from the first ${checks - 1} failures helped.`,
          codeLine: 3,
        })
        return steps
      }
      steps.push({
        state: { i, j, sum, checks, hit: false },
        description: `Check ${checks}: ${ARR[i]} + ${ARR[j]} = ${sum} ≠ ${TARGET}. ${sum < TARGET ? 'Too small' : 'Too big'} — but the loops learn nothing from that, they just grind on.`,
        codeLine: 2,
      })
    }
  }
  return steps
}

function BruteViz({ step }: { step: Step<BFState> }) {
  const { i, j, sum, checks, hit } = step.state
  return (
    <>
      <VizCaption>
        target = {TARGET} · checks so far = {checks}
        {sum !== null && ` · current sum = ${sum}`}
      </VizCaption>
      <Cells
        values={ARR}
        classFor={k => (hit && (k === i || k === j) ? 'done' : k === i ? 'active' : k === j ? 'warm' : k < i ? 'dim' : '')}
        pointerFor={k => (k === i ? { label: 'i', tone: 'mint' } : k === j ? { label: 'j', tone: 'amber' } : null)}
      />
      <Legend items={[{ tone: 'mint', label: 'outer i' }, { tone: 'amber', label: 'inner j' }, { label: 'not yet paired' }]} />
    </>
  )
}

export const naiveDemo: AttemptDemo<BFState> = { generateSteps: bruteSteps, Visualizer: BruteViz }

/* ---------- demo 2: hash set of complements ---------- */

interface HSState {
  idx: number
  seen: number[]
  want: number | null
  found: boolean
}

function hashSteps(): Step<HSState>[] {
  const steps: Step<HSState>[] = []
  steps.push({
    state: { idx: -1, seen: [], want: null, found: false },
    description: `One pass, no re-scanning: for each number x ask "have I already seen ${TARGET} − x?". The hash set starts empty.`,
    codeLine: 0,
  })
  const seen: number[] = []
  for (let idx = 0; idx < ARR.length; idx++) {
    const x = ARR[idx]
    const want = TARGET - x
    if (seen.includes(want)) {
      steps.push({
        state: { idx, seen: [...seen], want, found: true },
        description: `At ${x}: is ${TARGET} − ${x} = ${want} in the set? YES — ${want} + ${x} = ${TARGET}, found in ${idx + 1} steps. (A different valid pair than 11 + 23 — the set answers with whichever partner it met first.) Cost: the set itself, O(n) extra memory — and the sortedness was never used.`,
        codeLine: 2,
      })
      return steps
    }
    steps.push({
      state: { idx, seen: [...seen], want, found: false },
      description: `At ${x}: is ${TARGET} − ${x} = ${want} in the set {${seen.join(', ')}}? No — remember ${x} and move on.`,
      codeLine: 3,
    })
    seen.push(x)
  }
  return steps
}

function HashViz({ step }: { step: Step<HSState> }) {
  const { idx, seen, want, found } = step.state
  return (
    <>
      <VizCaption>
        target = {TARGET}
        {want !== null && ` · looking for ${want} in the set`}
      </VizCaption>
      <Cells
        values={ARR}
        classFor={k => (found && (k === idx || ARR[k] === want) ? 'done' : k === idx ? 'active' : k < idx ? 'dim' : '')}
        pointerFor={k => (k === idx ? { label: 'x', tone: 'mint' } : null)}
      />
      <VizCaption>seen = {`{ ${seen.join(', ')} }`} — O(n) extra memory</VizCaption>
      <Legend items={[{ tone: 'mint', label: 'current x' }, { label: 'already in the set' }]} />
    </>
  )
}

export const hashDemo: AttemptDemo<HSState> = { generateSteps: hashSteps, Visualizer: HashViz }

/* ---------- demo 3: binary-search each complement ---------- */

interface BSCState {
  i: number
  lo: number
  hi: number
  mid: number | null
  want: number
  probes: number
  found: boolean
}

function bsearchSteps(): Step<BSCState>[] {
  const steps: Step<BSCState>[] = []
  let probes = 0
  steps.push({
    state: { i: 0, lo: 1, hi: ARR.length - 1, mid: null, want: TARGET - ARR[0], probes, found: false },
    description: `No extra memory this time: for each x, binary-search the rest of the array for ${TARGET} − x. First up: x = ${ARR[0]}, hunting for ${TARGET - ARR[0]}.`,
    codeLine: 0,
  })
  for (let i = 0; i < ARR.length - 1; i++) {
    const want = TARGET - ARR[i]
    let lo = i + 1
    let hi = ARR.length - 1
    if (i > 0) {
      steps.push({
        state: { i, lo, hi, mid: null, want, probes, found: false },
        description: `Next x = ${ARR[i]}, so now hunt for ${want}. Notice: the wanted partner only ever shrinks — yet this search restarts blind from the middle anyway.`,
        codeLine: 1,
      })
    }
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      probes++
      if (ARR[mid] === want) {
        steps.push({
          state: { i, lo, hi, mid, want, probes, found: true },
          description: `Probe ${probes}: a[${mid}] = ${ARR[mid]} — that IS ${want}! ${ARR[i]} + ${ARR[mid]} = ${TARGET}, found with ${probes} probes total. Correct and memory-free, but every search forgot what the previous one ruled out.`,
          codeLine: 2,
        })
        return steps
      }
      steps.push({
        state: { i, lo, hi, mid, want, probes, found: false },
        description: `Probe ${probes}: a[${mid}] = ${ARR[mid]} ${ARR[mid] < want ? '<' : '>'} ${want} — ${ARR[mid] < want ? 'search the right half' : 'search the left half'}.`,
        codeLine: 1,
      })
      if (ARR[mid] < want) lo = mid + 1
      else hi = mid - 1
    }
  }
  return steps
}

function BsearchViz({ step }: { step: Step<BSCState> }) {
  const { i, lo, hi, mid, want, probes, found } = step.state
  return (
    <>
      <VizCaption>
        x = {ARR[i]} · hunting {want} · probes = {probes}
      </VizCaption>
      <Cells
        values={ARR}
        classFor={k =>
          found && (k === i || k === mid) ? 'done' : k === i ? 'active' : k === mid ? 'warm' : k > i && k >= lo && k <= hi ? '' : 'dim'
        }
        pointerFor={k => (k === i ? { label: 'x', tone: 'mint' } : k === mid ? { label: 'mid', tone: 'amber' } : null)}
      />
      <Legend items={[{ tone: 'mint', label: 'fixed x' }, { tone: 'amber', label: 'probe' }, { label: 'live search range' }]} />
    </>
  )
}

export const bsearchDemo: AttemptDemo<BSCState> = { generateSteps: bsearchSteps, Visualizer: BsearchViz }
```

- [ ] **Step 3: Wire into `index.tsx`**

```tsx
import { bsearchDemo, hashDemo, naiveDemo } from './demos'
```

> ⚠ `demos.tsx` imports `ARR`/`TARGET` from `./index` while `index.tsx` imports the demos back — a module cycle. It is safe here (all uses are inside functions, nothing runs at module top level in `demos.tsx` except object literals referencing functions), but if the dev server complains, move `ARR`/`TARGET` into a third file `src/algorithms/two-pointers/data.ts` imported by both. Apply the same rule in every later module task.

Then:
- `problem.naive`: add `demo: naiveDemo,` after `issues`.
- journey attempt 1 (hash set): add `demo: hashDemo,` after `insight`.
- journey attempt 2 (binary search): add `demo: bsearchDemo,` after `insight`.
- journey attempt 3 (optimal): add `demo: { generateSteps, Visualizer },` after `insight` — reusing the module's own main animation (its pseudocode is identical to the attempt's, so `codeLine` lines up).

- [ ] **Step 4: Typecheck + manual verification**

Run: `npx tsc --noEmit` — expected clean.
Run: `npm run dev`, open Two Pointers, and verify ALL of:
1. Section ② shows "▶ watch the brute force run"; expanding autoplays; the naive pseudocode lines highlight as it runs; it ends at 21 checks finding 11 + 23.
2. Reveal journey attempt 2 → a "▶ watch this idea run" button appears below the insight; demo finds 15 + 19 in 6 steps; set contents render.
3. Reveal attempt 3 → binary-search demo, 11 probes, finds 11 + 23.
4. Reveal attempt 4 (optimal) → demo plays the same animation as section ⑤.
5. The predict-before-reveal card never shows a demo button. Multiple demos can be open at once. ✕ hide collapses and clears the highlight.

- [ ] **Step 5: Commit**

```bash
git add src/algorithms/two-pointers/
git commit -m "feat(two-pointers): brute-force and journey-attempt demos"
```

---

## Module demo recipe (Tasks 8–18)

Every remaining module task follows this exact procedure — it is repeated here once in full so each task below can stay focused on its module-specific content. **This recipe is part of each task; do not skip steps.**

1. **Read the module's `src/algorithms/<id>/index.tsx` top to bottom.** Note: the input constants, the main `Visualizer` and its state interface, `problem.naive` (description/pseudocode/counts), and every journey attempt's spark/pseudocode/breaks (the demos must dramatize exactly the flaws those texts describe, with the same numbers where given).
2. **Export the input constants** from `index.tsx` (or move them to `data.ts` if the import cycle bites — see Task 7 Step 3 warning).
3. **Create `src/algorithms/<id>/demos.tsx`** exporting one `AttemptDemo` per non-optimal approach: `naiveDemo` plus one named export per non-optimal journey attempt. Each demo:
   - simulates that attempt's algorithm honestly on the page's input (rule 2),
   - has 8–25 steps (truncate per rule 4 if the honest run is longer),
   - sets `codeLine` against that attempt's own pseudocode (rule 5),
   - composes its visualizer from `vizPrimitives` (`Cells`/`VizCaption`/`Legend`) for array-shaped state, or **reuses the module's main Visualizer / its helper components** when the state shape matches (grids, graphs, trees, heaps) — adding a simplified state mapping rather than a new renderer. For `fail`-verdict attempts the LAST step must show the counterexample from `breaks`; for `partial` ones the last step states the cost comparison.
4. **Wire `index.tsx`:** `demo: <name>Demo,` on `problem.naive` and each non-optimal attempt; `demo: { generateSteps, Visualizer },` on the optimal attempt **only if** the attempt's `pseudocode` matches the module's main `pseudocode` (it does in most modules — verify line counts; if it differs, copy the main pseudocode into the attempt's `pseudocode` field so `codeLine` stays valid).
5. **Verify:** `npx tsc --noEmit` clean; `npm run dev`; on the module's page expand EVERY demo, play each to the end, and check: narration matches what the visualizer shows, hot pseudocode line tracks, final step states the lesson, reveal flow unspoiled.
6. **Commit:** `git add src/algorithms/<id>/ && git commit -m "feat(<id>): brute-force and journey-attempt demos"`.

---

### Task 8: Binary-search demos

**Files:** Create `src/algorithms/binary-search/demos.tsx`; Modify `src/algorithms/binary-search/index.tsx`. Follow the Module demo recipe above. Demos to author:

- `naiveDemo` — the brute force from `problem.naive` (linear scan; show every cell checked, count comparisons, end on the cost lesson).
- `hashDemo` — attempt "Build a hash map — make the lookup instant" (partial): show the one-time O(n) build cost cell by cell, then the instant lookup; final step contrasts build cost + memory vs. what sortedness gives free.
- `jumpDemo` — attempt "Jump search — leap in √n strides, scan the last block" (partial): show √n-stride leaps, overshoot, then the linear scan-back; final step gives the probe count vs. binary search's.
- Optimal "Binary search — probe the middle, halve the world" → reuse `{ generateSteps, Visualizer }` (check pseudocode match per recipe step 4).

### Task 9: Sliding-window demos

**Files:** Create `src/algorithms/sliding-window/demos.tsx`; Modify `src/algorithms/sliding-window/index.tsx`. Follow the Module demo recipe. Demos to author:

- `naiveDemo` — brute force from `problem.naive` (enumerate substrings/subarrays; truncate per rule 4, end with total count).
- `gapDemo` — attempt "Skip the substrings — measure the gaps between repeated letters" (fail): run it to the exact counterexample named in that attempt's `breaks` and stop there with the wrong answer on screen.
- `setDemo` — attempt "Track the contents — extend each start with a hash set" (partial): show the re-extension from every start position; final step counts the redundant re-adds.
- Optimal "Sliding window — one window, two forward-only edges" → reuse main demo.

### Task 10: DFS-backtracking demos

**Files:** Create `src/algorithms/dfs-backtracking/demos.tsx`; Modify `src/algorithms/dfs-backtracking/index.tsx`. Follow the Module demo recipe. The main visualizer renders a 4×4 board — reuse its board-rendering for all demos. Demos to author:

- `naiveDemo` — brute force from `problem.naive` (enumerate raw placements; truncate heavily, the point is the astronomic count).
- `rowRuleDemo` — attempt "Bake the row rule into generation — one queen per row" (partial): show 4⁴ = 256-style enumeration shrinking the space but still validating whole boards; truncate, end on the count comparison.
- `greedyDemo` — attempt "Check as you place — and greedily take the first safe square" (fail): play to the dead end the `breaks` text describes — a row with no safe square and no way back.
- Optimal "Backtracking — commit, explore, and undo on failure" → reuse main demo.

### Task 11: Quick-sort demos

**Files:** Create `src/algorithms/quick-sort/demos.tsx`; Modify `src/algorithms/quick-sort/index.tsx`. Follow the Module demo recipe. Demos to author:

- `naiveDemo` — brute force from `problem.naive` (whatever it specifies — likely selection-style repeated scanning; show comparisons mounting).
- `mergeDemo` — attempt "Sort the halves, then merge — merge sort" (partial): show the split/merge on this module's array; final step: correct, but the merge needs O(n) scratch space — show the buffer.
- `newListsDemo` — attempt "Partition by value into two new lists" (partial): show elements copied into two fresh lists around the pivot; final step counts allocated cells.
- Optimal "Partition in place — quick sort" → reuse main demo.

### Task 12: Merge-sort demos

**Files:** Create `src/algorithms/merge-sort/demos.tsx`; Modify `src/algorithms/merge-sort/index.tsx`. Follow the Module demo recipe. Demos to author:

- `naiveDemo` — brute force from `problem.naive`.
- `insertionDemo` — attempt "Insertion sort — grow a sorted prefix, slide each newcomer into place" (partial): show the slides, count shifts on this input; final step: O(n²) shifts when the input is reversed.
- `naiveSplitDemo` — attempt "Divide and conquer — sort each half separately, then stick them together" (fail): sort halves, concatenate, end on the out-of-order seam — the counterexample from `breaks`.
- Optimal "Merge sort — split to single elements, zip sorted halves all the way up" → reuse main demo.

### Task 13: Dynamic-programming demos

**Files:** Create `src/algorithms/dynamic-programming/demos.tsx`; Modify `src/algorithms/dynamic-programming/index.tsx`. Follow the Module demo recipe. Demos to author:

- `naiveDemo` — brute force from `problem.naive` (enumerate subsets of houses; truncate, end with the 2ⁿ count).
- `greedyDemo` — attempt "Greedy — rob every other house" (fail): run both alternating patterns, end with the counterexample sum from `breaks`.
- `recursionDemo` — attempt "Rob-or-skip recursion — try both choices at every house" (partial): visualize the call tree growing with REPEATED subproblems highlighted; final step counts duplicate calls.
- `memoDemo` — attempt "Memoize — cache each answer the first time" (partial): same tree but cache hits short-circuit; final step: linear work but recursion depth/stack remains.
- Optimal "Bottom-up table — fill dp left to right" → reuse main demo.

### Task 14: Union-find demos

**Files:** Create `src/algorithms/union-find/demos.tsx`; Modify `src/algorithms/union-find/index.tsx`. Follow the Module demo recipe. Reuse the module's graph/forest rendering. Demos to author:

- `naiveDemo` — brute force from `problem.naive` (re-traverse for every query; count repeated visits).
- `labelsDemo` — attempt "Cache the answer in labels — comp[i] per node, relabel on merge" (partial): show a merge relabeling EVERY node of one component; final step counts relabels on this input.
- `treesDemo` — attempt "Trees of parent pointers — merge by repointing one root" (partial): show the chain degenerating — root walks getting longer each merge; final step: O(n) deep chain.
- Optimal "Union by rank + path compression" → reuse main demo.

### Task 15: Topological-sort demos

**Files:** Create `src/algorithms/topological-sort/demos.tsx`; Modify `src/algorithms/topological-sort/index.tsx`. Follow the Module demo recipe. Reuse the module's DAG rendering. Demos to author (this module has 3 attempts; one title was multiline — read `index.tsx:250-310` for the exact list):

- `naiveDemo` — brute force from `problem.naive`.
- `prereqCountDemo` — attempt "Sort courses by how many prerequisites they list" (fail): order by prerequisite count, end on the broken ordering counterexample from `breaks`.
- `rescanDemo` — attempt "Simulate semesters — re-scan for any course whose prerequisites are all done" (partial): show full re-scans each round; final step counts wasted scans vs. Kahn's queue.
- Optimal (Kahn's algorithm attempt) → reuse main demo.

### Task 16: BFS demos

**Files:** Create `src/algorithms/bfs/demos.tsx`; Modify `src/algorithms/bfs/index.tsx`. Follow the Module demo recipe. Reuse the module's grid/graph rendering. Demos to author (4 attempts — the most of any module):

- `naiveDemo` — brute force from `problem.naive`.
- `dfsFirstDemo` — attempt "Quit at the first route DFS finds" (fail): DFS finds A route, end showing it is longer than the shortest — the counterexample from `breaks`.
- `greedyDemo` — attempt "Steer greedily toward the target" (fail): walk into the trap/detour from `breaks` and end stuck or suboptimal.
- `idDemo` — attempt "Iterative deepening — cap the depth, raise the cap" (partial): show depth-1, depth-2… re-exploring the same near cells each round; final step counts re-visits.
- Optimal "BFS — expand the whole frontier one wave at a time" → reuse main demo.

### Task 17: Heap demos

**Files:** Create `src/algorithms/heap/demos.tsx`; Modify `src/algorithms/heap/index.tsx`. Follow the Module demo recipe. Demos to author:

- `naiveDemo` — brute force from `problem.naive` (re-sort everything per query; show the full sort cost each time, truncated).
- `sortedHistoryDemo` — attempt "Stop re-sorting — keep the history sorted and insert into place" (partial): show each insertion shifting a long sorted row; final step counts shifts.
- `topKRowDemo` — attempt "Keep only the top 3, in a sorted row" (partial): show the row maintained but each insert still scanning/shifting the row; final step: works, but a heap does the same with log k per op.
- Optimal "A min-heap of size 3" → reuse main demo.

### Task 18: Dijkstra demos

**Files:** Create `src/algorithms/dijkstra/demos.tsx`; Modify `src/algorithms/dijkstra/index.tsx`. Follow the Module demo recipe. Reuse the module's weighted-graph rendering. Demos to author (4 attempts):

- `naiveDemo` — brute force from `problem.naive` (enumerate all paths; truncate at the explosion).
- `hopsDemo` — attempt "Plain BFS — count hops, not tolls" (fail): BFS returns the fewest-hops path; end showing its cost beaten by a longer-but-cheaper path (counterexample from `breaks`).
- `greedyWalkDemo` — attempt "Greedy walk — always take the cheapest road out" (fail): walk the cheap edge into the expensive trap from `breaks`.
- `plainQueueDemo` — attempt "Relax with a plain queue — let cheaper routes overwrite" (partial): show nodes re-entering the queue and being re-relaxed; final step counts redundant relaxations vs. the priority queue.
- Optimal "Dijkstra — always pop the closest unsettled town" → reuse main demo.

---

### Task 19: Registry contract checks + Playwright sweep + final verification

**Files:**
- Modify: `src/algorithms/registry.ts`
- Create: `verify-demos.mjs`

- [ ] **Step 1: Add demo contract checks to `registry.ts`**

Append inside the existing `for (const a of algorithms)` loop (after the journey-verdict check):

```ts
  const checkDemo = (owner: string, demo: import('../core/types').AttemptDemo | undefined, pseudocode: string[]) => {
    if (!demo) throw new Error(`AlgoLens: ${owner} is missing its demo`)
    const steps = demo.generateSteps()
    if (steps.length < 2) throw new Error(`AlgoLens: ${owner} demo has ${steps.length} steps (need ≥2)`)
    steps.forEach((s, i) => {
      if (!s.description.trim()) throw new Error(`AlgoLens: ${owner} demo step ${i} has empty narration`)
      if (s.codeLine < -1 || s.codeLine >= pseudocode.length) {
        throw new Error(`AlgoLens: ${owner} demo step ${i} codeLine ${s.codeLine} out of range (pseudocode has ${pseudocode.length} lines)`)
      }
    })
  }
  checkDemo(`"${a.id}" naive`, a.problem.naive.demo, a.problem.naive.pseudocode)
  a.journey.forEach((j, i) => checkDemo(`"${a.id}" journey[${i}]`, j.demo, j.pseudocode))
```

This makes missing/broken demos a hard failure on every dev-server load and build — the same enforcement style the registry already uses.

- [ ] **Step 2: Run the contract checks**

Run: `npm run dev` and open the app, or `npm run build`.
Expected: no `AlgoLens:` errors. Any error names the exact module/attempt to fix — fix it before continuing.

- [ ] **Step 3: Create `verify-demos.mjs`** (same harness style as the existing `verify-narration.mjs`)

```js
import { chromium } from 'playwright'

const browser = await chromium.launch({
  executablePath: 'C:/Users/narpra1/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe',
})
const page = await browser.newPage()
const errors = []
page.on('pageerror', e => errors.push(String(e)))

await page.goto('http://localhost:5173/')
const cardCount = await page.locator('.algo-card').count()
console.log('algorithm cards:', cardCount)

for (let c = 0; c < cardCount; c++) {
  await page.goto('http://localhost:5173/')
  const card = page.locator('.algo-card').nth(c)
  const name = await card.locator('h3').innerText()
  await card.click()
  await page.waitForSelector('.naive-card')

  // Reveal every journey attempt so all demo buttons exist.
  while (await page.locator('.jreveal').count()) {
    await page.locator('.jreveal').first().click()
  }

  // Expand every mini player, confirm it renders narration, collapse it.
  const buttons = page.locator('.mini-open')
  let opened = 0
  while (await buttons.count()) {
    await buttons.first().click()
    await page.waitForSelector('.mini-player .narration', { timeout: 5000 })
    opened++
    await page.locator('.mini-close').first().click()
  }
  console.log(`${name}: ${opened} demos opened — ${opened >= 3 ? 'PASS' : 'FAIL (expected ≥3)'}`)
}

console.log(errors.length ? `PAGE ERRORS:\n${errors.join('\n')}` : 'no page errors')
await browser.close()
process.exitCode = errors.length ? 1 : 0
```

- [ ] **Step 4: Run the sweep**

With `npm run dev` running: `node verify-demos.mjs`
Expected: every module line reports `PASS`, final line `no page errors`.

- [ ] **Step 5: Full verification**

Run: `npx tsc --noEmit` — clean.
Run: `npm run build` — succeeds (registry checks run at build too via module evaluation in the bundle? They run at runtime — the dev-server load in Step 2 is the authoritative check).

- [ ] **Step 6: Commit**

```bash
git add src/algorithms/registry.ts verify-demos.mjs
git commit -m "feat: enforce demo coverage via registry contract checks + Playwright sweep"
```

---

## Self-Review Notes

- **Spec coverage:** data model (Task 1), MiniPlayer (Task 4), section ② wiring (Task 5), section ③ wiring incl. no-spoiler rule (Task 6), shared primitives (Task 3), ~40 authored demos + 12 reuses (Tasks 7–18), same-input + truncation + codeLine content rules (Content rules section), validation (Task 19). The spec's "MiniPlayer renders its own pseudocode" detail was replaced by the in-place highlight callback — recorded under "One refinement vs the spec" at the top.
- **Type consistency:** `AttemptDemo` (Task 1) is what `MiniPlayer` (Task 4), demos (Tasks 7–18), and registry checks (Task 19) all reference; `onStepChange(codeLine: number)` is the single callback name used in Tasks 4, 5, 6.
- **Known risk:** the `demos.tsx ↔ index.tsx` import cycle — mitigation documented in Task 7 Step 3 and recipe step 2.
```
