import type { ReactElement } from 'react'
import type { AttemptDemo, Step } from '../../core/types'
import { NODES, EDGES, NAME, POS, R } from './data'
import type { NodeId } from './data'

/* ─────────────────────────────────────────────────────────────────────────────
   Shared DAG renderer
   Replicates the exact SVG markup and CSS classes from index.tsx's Visualizer
   so demo graphs look native — same node positions, same edge style, same
   in-degree labels, same bottom cells row, same legend swatches.
───────────────────────────────────────────────────────────────────────────────*/

function edgeGeom(from: NodeId, to: NodeId) {
  const a = POS[from]
  const b = POS[to]
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  const ux = dx / len
  const uy = dy / len
  const sx = a.x + ux * (R + 3)
  const sy = a.y + uy * (R + 3)
  const ex = b.x - ux * (R + 10)
  const ey = b.y - uy * (R + 10)
  const tx = b.x - ux * (R + 2)
  const ty = b.y - uy * (R + 2)
  const px = -uy
  const py = ux
  const arrow = `${tx},${ty} ${ex + px * 4.5},${ey + py * 4.5} ${ex - px * 4.5},${ey - py * 4.5}`
  return { sx, sy, ex, ey, arrow }
}

interface DagViewProps {
  caption: string
  inDeg: Record<NodeId, number>
  queue: NodeId[]
  order: NodeId[]
  processing: NodeId | null
  removed: number[]
  hotEdge: number | null
  done: boolean
  legend: ReactElement
}

function DagView({ caption, inDeg, queue, order, processing, removed, hotEdge, done, legend }: DagViewProps) {
  return (
    <>
      <div className="viz-caption">{caption}{done && ' · valid order found'}</div>
      <svg className="viz-svg" viewBox="0 0 570 240" role="img" aria-label="Course prerequisite DAG">
        {EDGES.map((e, i) => {
          const g = edgeGeom(e.from, e.to)
          const isHot = hotEdge === i
          const isGone = removed.includes(i)
          const opacity = isHot ? 1 : isGone ? 0.12 : 1
          const arrowFill = isHot ? 'var(--amber)' : 'var(--line-strong)'
          return (
            <g key={i} style={{ opacity }}>
              <line className={isHot ? 'edge warm' : 'edge'} x1={g.sx} y1={g.sy} x2={g.ex} y2={g.ey} />
              <polygon points={g.arrow} style={{ fill: arrowFill }} />
            </g>
          )
        })}
        {NODES.map((id) => {
          const p = POS[id]
          const placedAt = order.indexOf(id)
          let cls = 'node'
          if (id === processing) cls += ' active'
          else if (placedAt >= 0) cls += ' done'
          else if (queue.includes(id)) cls += ' warm'
          return (
            <g key={id}>
              <circle className={cls} cx={p.x} cy={p.y} r={R} />
              <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize={15} fontWeight={600}>
                {id}
              </text>
              <text x={p.x} y={p.y - R - 7} textAnchor="middle" fontSize={10.5} style={{ fill: 'var(--faint)' }}>
                {placedAt >= 0 ? `#${placedAt + 1}` : `in:${inDeg[id]}`}
              </text>
              <text x={p.x} y={p.y + R + 14} textAnchor="middle" fontSize={9.5} style={{ fill: 'var(--faint)' }}>
                {NAME[id]}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="cells spaced">
        {NODES.map((_, i) => {
          const v = order[i]
          return (
            <div key={i} className={v ? 'cell done' : 'cell dim'}>
              <span className="idx">{i + 1}</span>
              {v ?? '·'}
            </div>
          )
        })}
      </div>
      {legend}
    </>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 1 — Naive brute force: try every permutation and validate.
   7! = 5,040 permutations × 8 arrow checks ≈ 40,320 checks.
   Show 8 real permutations (intro + 6 invalid + 1 valid), truncation, verdict.

   codeLine indexes problem.naive.pseudocode:
     0: 'for each permutation P of the n courses:'
     1: '    valid ← true'
     2: '    for each arrow u → v:'
     3: '        if u comes after v in P: valid ← false'
     4: '    if valid: return P'
     5: 'return impossible'
─────────────────────────────────────────────────────────────────────────────── */

interface NaiveState {
  inDeg: Record<NodeId, number>
  queue: NodeId[]
  order: NodeId[]
  processing: NodeId | null
  removed: number[]
  hotEdge: number | null
  done: boolean
  /** Extra label shown in caption for brute-force context. */
  caption: string
}

const ZERO_DEG: Record<NodeId, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 }
const FULL_DEG: Record<NodeId, number> = { A: 0, B: 0, C: 1, D: 2, E: 2, F: 1, G: 2 }

function naiveSnap(order: NodeId[], caption: string, done = false): NaiveState {
  return {
    inDeg: { ...FULL_DEG },
    queue: [],
    order,
    processing: null,
    removed: [],
    hotEdge: null,
    done,
    caption,
  }
}

function checkPerm(perm: NodeId[]): { from: NodeId; to: NodeId } | null {
  for (const e of EDGES) {
    if (perm.indexOf(e.from) > perm.indexOf(e.to)) return e
  }
  return null
}

function naiveDemoSteps(): Step<NaiveState>[] {
  const steps: Step<NaiveState>[] = []
  const TOTAL = 5040  // 7!

  // Intro sentinel
  steps.push({
    state: naiveSnap([], `perm 0 / ${TOTAL} · 0 checks`),
    description: `Brute force: try every ordering of the 7 courses and validate each against all 8 arrows. 7! = ${TOTAL} permutations, each needing up to 8 checks — roughly 40,320 checks in all. Begin generating permutations.`,
    codeLine: 0,
  })

  // A sample of early permutations — each starts with a suboptimal choice
  const permsToShow: [NodeId[], string][] = [
    [['G', 'E', 'F', 'D', 'C', 'A', 'B'], 'starts with Capstone — immediately breaks E → G (E comes AFTER G)'],
    [['G', 'A', 'B', 'C', 'D', 'E', 'F'], 'Capstone first again — E → G broken'],
    [['E', 'C', 'D', 'A', 'B', 'F', 'G'], 'Algorithms before its prereqs — C → E broken'],
    [['A', 'C', 'G', 'E', 'B', 'D', 'F'], 'Capstone before Algorithms — E → G broken'],
    [['A', 'B', 'D', 'C', 'E', 'G', 'F'], 'D comes before C but A → C then C → E needed — A → D then D → E; checks out so far but F → G broken (G before F)'],
    [['A', 'B', 'C', 'D', 'E', 'G', 'F'], 'almost — G appears before F but F → G requires F first; broken'],
  ]

  // checksSoFar starts at 1 (the intro sentinel above is conceptually "perm 0 / intro").
  // Each iteration increments BEFORE use, so the first real perm is displayed as #2.
  // This is intentional: perm #1 is the intro/count sentinel, not a curated permutation.
  let checksSoFar = 1
  for (const [perm, note] of permsToShow) {
    checksSoFar++
    const bad = checkPerm(perm)
    const arrowStr = bad ? `${bad.from} → ${bad.to}` : ''
    steps.push({
      state: naiveSnap(perm, `perm ${checksSoFar} / ${TOTAL} · ${checksSoFar} checked`),
      description: bad
        ? `Permutation ${checksSoFar}: [${perm.join(' → ')}]. Arrow ${arrowStr} is violated — ${note}. Reject and try the next.`
        : `Permutation ${checksSoFar}: [${perm.join(' → ')}]. All 8 arrows satisfied — valid! But it took ${checksSoFar} attempts to land here.`,
      codeLine: bad ? 3 : 4,
    })
  }

  // The actual first valid permutation
  const valid: NodeId[] = ['A', 'B', 'C', 'D', 'F', 'E', 'G']
  steps.push({
    state: naiveSnap(valid, `perm found · ${checksSoFar + 1} checked`, false),
    description: `The permutation [${valid.join(' → ')}] passes all 8 arrow checks. Found — but only because we got lucky early; in the worst case (the last permutation is valid) all ${TOTAL} must be examined.`,
    codeLine: 4,
  })

  // Truncation / scale step
  steps.push({
    state: naiveSnap([], `worst case · ${TOTAL} perms · ~40,320 checks`),
    description: `In the worst case all ${TOTAL} permutations are generated and each is validated against all 8 arrows — about 40,320 checks. Every permutation beginning with G (Capstone) is doomed after the first arrow check, yet each of the 720 orderings that start with G is enumerated and checked independently. 20 courses: 2.4 quintillion permutations.`,
    codeLine: 2,
  })

  // Final verdict step
  steps.push({
    state: naiveSnap(valid, `done · A B C D F E G`, true),
    description: `Valid ordering: A → B → C → D → F → E → G. Cost: up to 40,320 checks. Kahn's algorithm finds the same answer in just 15 operations — 7 dequeues + 8 edge deletions — with no guessing.`,
    codeLine: 4,
  })

  return steps
}

function NaiveViz({ step }: { step: Step<NaiveState> }) {
  const { inDeg, queue, order, processing, removed, hotEdge, done, caption } = step.state
  const legend = (
    <div className="legend">
      <span className="key"><span className="swatch mint" /> in valid order</span>
      <span className="key"><span className="swatch" /> not yet placed</span>
    </div>
  )
  return (
    <DagView
      caption={caption}
      inDeg={inDeg}
      queue={queue}
      order={order}
      processing={processing}
      removed={removed}
      hotEdge={hotEdge}
      done={done}
      legend={legend}
    />
  )
}

export const naiveDemo: AttemptDemo<NaiveState> = { generateSteps: naiveDemoSteps, Visualizer: NaiveViz }

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 2 — Attempt 1: Sort by prerequisite count (verdict: fail)
   Counts: A:0, B:0, C:1, F:1, D:2, E:2, G:2
   Sorted (ties arbitrary): A, B, C, F, G, D, E
   Broken example from breaks: puts G before E → arrow E→G violated.
   Note: D→E is NOT violated (D at position 6, E at position 7 — D precedes E).

   codeLine indexes journey[0].pseudocode:
     0: 'count[v] ← number of arrows into v'
     1: 'sort the n courses ascending by count[v]'
     2: 'return the sorted list'
─────────────────────────────────────────────────────────────────────────────── */

interface PrereqCountState {
  inDeg: Record<NodeId, number>
  queue: NodeId[]
  order: NodeId[]
  processing: NodeId | null
  removed: number[]
  hotEdge: number | null
  done: boolean
  caption: string
}

function prereqCountSnap(order: NodeId[], caption: string): PrereqCountState {
  return {
    inDeg: { ...FULL_DEG },
    queue: [],
    order,
    processing: null,
    removed: [],
    hotEdge: null,
    done: false,
    caption,
  }
}

function prereqCountSteps(): Step<PrereqCountState>[] {
  const steps: Step<PrereqCountState>[] = []

  // Step 1: Intro — compute counts
  steps.push({
    state: prereqCountSnap([], 'counting prerequisite arrows into each course'),
    description: `Idea: count how many arrows point INTO each course, then sort by that count — fewest prerequisites first. Count the incoming arrows: A gets 0, B gets 0, C gets 1, F gets 1, D gets 2, E gets 2, G gets 2. One sort, done — no iteration needed.`,
    codeLine: 0,
  })

  // Step 2: Place A (count 0)
  steps.push({
    state: prereqCountSnap(['A'], 'place A (count 0) — first in sort'),
    description: `A (Intro to CS) has count 0 — no arrows point into it at all. It goes first.`,
    codeLine: 1,
  })

  // Step 3: Place B (count 0)
  steps.push({
    state: prereqCountSnap(['A', 'B'], 'place B (count 0) — tied with A'),
    description: `B (Calculus) also has count 0. Two courses tie at the front; the sort emits B next. Order so far: A, B.`,
    codeLine: 1,
  })

  // Step 4: Place C (count 1)
  steps.push({
    state: prereqCountSnap(['A', 'B', 'C'], 'place C (count 1)'),
    description: `C (Data Structures) and F (Databases) both have count 1. The sort picks C first — ties are broken arbitrarily. Order so far: A, B, C.`,
    codeLine: 1,
  })

  // Step 5: Place F (count 1)
  steps.push({
    state: prereqCountSnap(['A', 'B', 'C', 'F'], 'place F (count 1) — other count-1 course'),
    description: `F (Databases) is the other count-1 course. It follows C. Order so far: A, B, C, F.`,
    codeLine: 1,
  })

  // Step 6: Three-way tie at count 2 — sort emits G, D, E (arbitrary tie-break)
  const sortedOrder: NodeId[] = ['A', 'B', 'C', 'F', 'G', 'D', 'E']
  steps.push({
    state: prereqCountSnap(sortedOrder, 'three-way tie: D, E, G all count 2 — tie-break is arbitrary'),
    description: `D (Discrete Math), E (Algorithms), and G (Capstone) all have count 2 — a three-way tie. The sort is free to emit them in any order. Here it produces G, D, E (alphabetical, say). Final sorted order: A, B, C, F, G, D, E.`,
    codeLine: 1,
  })

  // Step 7: Show the full result
  steps.push({
    state: prereqCountSnap(sortedOrder, 'sorted by count: A(0) B(0) C(1) F(1) G(2) D(2) E(2)'),
    description: `The complete sorted list: A → B → C → F → G → D → E. This is what the algorithm returns. Now check whether every arrow still points forward in this order.`,
    codeLine: 2,
  })

  // Step 8: Reveal the broken arrow E→G
  steps.push({
    state: prereqCountSnap(sortedOrder, 'checking arrow E → G …'),
    description: `Check arrow E → G: in our sorted list G sits at position 5 and E at position 7. G comes BEFORE E — that violates E → G (Algorithms must come before Capstone). The ordering is wrong.`,
    codeLine: 2,
  })

  // Step 9: Note that D→E is NOT violated
  steps.push({
    state: prereqCountSnap(sortedOrder, 'checking arrow D → E — D before E here'),
    description: `Check arrow D → E: D is at position 6, E at position 7 — D does come before E here, so that arrow is satisfied. But the three-way tie at count=2 (D, E, G) is what created the trouble in the first place: a static count can't see that G sits at the end of the long chain A → C → E → G, while D is only two hops deep.`,
    codeLine: 2,
  })

  // Step 10: Counterexample verdict
  steps.push({
    state: prereqCountSnap(sortedOrder, 'FAIL · G before E violates E → G'),
    description: `Counterexample confirmed: the counts are A:0, B:0, C:1, F:1, D:2, E:2, G:2 — a three-way tie lets the sort place G (Capstone) before E (Algorithms), immediately breaking E → G. A static count can't see depth; you need to know which prerequisites are already DONE, not just how many there are.`,
    codeLine: 2,
  })

  return steps
}

function PrereqCountViz({ step }: { step: Step<PrereqCountState> }) {
  const { inDeg, queue, order, processing, removed, hotEdge, done, caption } = step.state
  const legend = (
    <div className="legend">
      <span className="key"><span className="swatch mint" /> placed in sorted order</span>
      <span className="key"><span className="swatch" /> not yet sorted</span>
    </div>
  )
  return (
    <DagView
      caption={caption}
      inDeg={inDeg}
      queue={queue}
      order={order}
      processing={processing}
      removed={removed}
      hotEdge={hotEdge}
      done={done}
      legend={legend}
    />
  )
}

export const prereqCountDemo: AttemptDemo<PrereqCountState> = { generateSteps: prereqCountSteps, Visualizer: PrereqCountViz }

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 3 — Attempt 2: Simulate semesters (verdict: partial)
   4 passes. Arrow-checks: pass1=56, pass2=40, pass3=24, pass4=8 → total 128.
   Kahn's does 15 (7 dequeues + 8 edge deletions).

   codeLine indexes journey[1].pseudocode:
     0: 'order ← []'
     1: 'while some course is unplaced:'
     2: '    for each unplaced course v:'
     3: '        if every prerequisite of v is in order: append v'
     4: '    if nothing was appended: cycle, stop'
─────────────────────────────────────────────────────────────────────────────── */

interface RescanState {
  inDeg: Record<NodeId, number>
  queue: NodeId[]
  order: NodeId[]
  processing: NodeId | null
  removed: number[]
  hotEdge: number | null
  done: boolean
  caption: string
}

function rescanSnap(order: NodeId[], caption: string, done = false): RescanState {
  // Show how many edges remain "live" based on what's been placed
  const removedEdges: number[] = []
  for (let i = 0; i < EDGES.length; i++) {
    if (order.includes(EDGES[i].from)) removedEdges.push(i)
  }
  // Compute live in-degrees reflecting placed nodes
  const deg: Record<NodeId, number> = { ...FULL_DEG }
  for (const id of order) {
    for (let i = 0; i < EDGES.length; i++) {
      if (EDGES[i].from === id && !order.includes(EDGES[i].to)) {
        deg[EDGES[i].to]--
      }
    }
  }
  return {
    inDeg: deg,
    queue: [],
    order,
    processing: null,
    removed: removedEdges,
    hotEdge: null,
    done,
    caption,
  }
}

function rescanSteps(): Step<RescanState>[] {
  const steps: Step<RescanState>[] = []

  // Intro sentinel
  steps.push({
    state: rescanSnap([], 'pass 0 · 0 placed · 0 arrow-checks'),
    description: `Simulate semesters: each pass scans every unplaced course and checks whether all its prerequisites are already in the order. Courses that qualify get added; then repeat. This will take 4 passes to place all 7 courses.`,
    codeLine: 0,
  })

  // Pass 1: 7 courses × 8 arrows = 56 checks. A (0 prereqs) and B (0 prereqs) qualify.
  steps.push({
    state: rescanSnap([], 'pass 1 · scanning all 7 courses × 8 arrows = 56 checks'),
    description: `Pass 1: scan all 7 unplaced courses and check each against all 8 arrows — 7 × 8 = 56 arrow-checks. A has no prerequisites (qualifies). B has no prerequisites (qualifies). C needs A (not placed yet). D needs A and B (not placed). E needs C and D. F needs C. G needs E and F. Append A and B.`,
    codeLine: 2,
  })

  const afterPass1: NodeId[] = ['A', 'B']
  steps.push({
    state: rescanSnap(afterPass1, 'pass 1 done · placed A, B · 56 checks so far'),
    description: `Pass 1 complete. Placed: A (Intro to CS) and B (Calculus). 5 courses still waiting. 56 arrow-checks used so far.`,
    codeLine: 3,
  })

  // Pass 2: 5 courses × 8 arrows = 40 checks. C (needs A ✓), D (needs A,B ✓) qualify. F needs C (not placed). E needs C,D. G needs E,F.
  steps.push({
    state: rescanSnap(afterPass1, 'pass 2 · scanning 5 unplaced × 8 arrows = 40 checks'),
    description: `Pass 2: scan the 5 remaining courses — 5 × 8 = 40 more arrow-checks (56 + 40 = 96 total). C needs A (done ✓) — qualifies. D needs A (done ✓) and B (done ✓) — qualifies. F needs C (not done yet). E needs C and D (neither done). G needs E and F (neither done). Append C and D.`,
    codeLine: 2,
  })

  const afterPass2: NodeId[] = ['A', 'B', 'C', 'D']
  steps.push({
    state: rescanSnap(afterPass2, 'pass 2 done · placed C, D · 96 checks so far'),
    description: `Pass 2 complete. Placed: C (Data Structures) and D (Discrete Math). 3 courses remain. 96 arrow-checks used so far. Notice G is re-examined this pass even though neither E nor F has changed — pure polling.`,
    codeLine: 3,
  })

  // Pass 3: 3 courses × 8 arrows = 24 checks. E (needs C,D ✓), F (needs C ✓) qualify. G needs E,F (not done).
  steps.push({
    state: rescanSnap(afterPass2, 'pass 3 · scanning 3 unplaced × 8 arrows = 24 checks'),
    description: `Pass 3: scan the 3 remaining courses — 3 × 8 = 24 more arrow-checks (96 + 24 = 120 total). E needs C (done ✓) and D (done ✓) — qualifies. F needs C (done ✓) — qualifies. G needs E and F (still unplaced). Append E and F.`,
    codeLine: 2,
  })

  const afterPass3: NodeId[] = ['A', 'B', 'C', 'D', 'E', 'F']
  steps.push({
    state: rescanSnap(afterPass3, 'pass 3 done · placed E, F · 120 checks so far'),
    description: `Pass 3 complete. Placed: E (Algorithms) and F (Databases). Only G remains. 120 arrow-checks so far.`,
    codeLine: 3,
  })

  // Pass 4: 1 course × 8 arrows = 8 checks. G (needs E,F ✓) qualifies.
  steps.push({
    state: rescanSnap(afterPass3, 'pass 4 · scanning 1 unplaced × 8 arrows = 8 checks'),
    description: `Pass 4: 1 unplaced course × 8 arrows = 8 more arrow-checks (120 + 8 = 128 total). G needs E (done ✓) and F (done ✓) — qualifies. Append G.`,
    codeLine: 2,
  })

  const fullOrder: NodeId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
  steps.push({
    state: rescanSnap(fullOrder, 'all 7 placed · 128 arrow-checks · correct but wasteful', true),
    description: `Done — correct result in 4 passes and 128 arrow-checks. Compare with Kahn's: 7 dequeues + 8 edge deletions = 15 operations. The re-scan wastes 113 extra checks because it polls G every single pass even though nothing about G changed until E and F finished. The fix: let each finished course push the news to its dependents, not the other way around.`,
    codeLine: 4,
  })

  return steps
}

function RescanViz({ step }: { step: Step<RescanState> }) {
  const { inDeg, queue, order, processing, removed, hotEdge, done, caption } = step.state
  const legend = (
    <div className="legend">
      <span className="key"><span className="swatch mint" /> placed this or earlier pass</span>
      <span className="key"><span className="swatch" /> still blocked / waiting</span>
    </div>
  )
  return (
    <DagView
      caption={caption}
      inDeg={inDeg}
      queue={queue}
      order={order}
      processing={processing}
      removed={removed}
      hotEdge={hotEdge}
      done={done}
      legend={legend}
    />
  )
}

export const rescanDemo: AttemptDemo<RescanState> = { generateSteps: rescanSteps, Visualizer: RescanViz }
