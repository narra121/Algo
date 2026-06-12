import type { ReactElement } from 'react'
import type { AttemptDemo, Step, VarEntry } from '../../core/types'
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
   The generator enumerates permutations lexicographically over the catalog
   listing [A, B, G, C, D, E, F] (intro courses first, the flagship Capstone
   featured third, then the rest). Every single examined permutation gets a
   real step with its true first violated arrow — no skipping. The first valid
   ordering under this enumeration is permutation #34: A B C D E F G.

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

const FULL_DEG: Record<NodeId, number> = { A: 0, B: 0, C: 1, D: 2, E: 2, F: 1, G: 2 }

function naiveSnap(order: NodeId[], caption: string, done = false, hotEdge: number | null = null): NaiveState {
  return {
    inDeg: { ...FULL_DEG },
    queue: [],
    order,
    processing: null,
    removed: [],
    hotEdge,
    done,
    caption,
  }
}

/** All permutations of `items`, in lexicographic order of the array's own listing. */
function lexPerms(items: NodeId[]): NodeId[][] {
  if (items.length <= 1) return [items.slice()]
  const out: NodeId[][] = []
  for (let i = 0; i < items.length; i++) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)]
    for (const tail of lexPerms(rest)) out.push([items[i], ...tail])
  }
  return out
}

/** Scan EDGES in declaration order; return the first violated arrow and the checks spent. */
function firstViolation(perm: NodeId[]): { edge: { from: NodeId; to: NodeId } | null; edgeIdx: number | null; checks: number } {
  for (let i = 0; i < EDGES.length; i++) {
    const e = EDGES[i]
    if (perm.indexOf(e.from) > perm.indexOf(e.to)) return { edge: e, edgeIdx: i, checks: i + 1 }
  }
  return { edge: null, edgeIdx: null, checks: EDGES.length }
}

/** The registrar's catalog listing: intro courses first, the flagship Capstone third. */
const CATALOG: NodeId[] = ['A', 'B', 'G', 'C', 'D', 'E', 'F']
const TOTAL_PERMS = 5040 // 7!

function naiveDemoSteps(): Step<NaiveState>[] {
  const steps: Step<NaiveState>[] = []

  const naiveVars = (
    ordering: NodeId[] | null,
    edge: string,
    valid: string,
    tried: number,
    checks: number,
    changed: string[],
  ): VarEntry[] => {
    const ch = new Set(changed)
    return [
      { name: 'ordering', value: ordering ? `[${ordering.join(' ')}]` : '—', changed: ch.has('ordering') },
      { name: 'edge being checked', value: edge, changed: ch.has('edge') },
      { name: 'valid?', value: valid, changed: ch.has('valid') },
      { name: 'orderings tried', value: String(tried), changed: ch.has('tried') },
      { name: 'arrow checks', value: String(checks), changed: ch.has('checks') },
    ]
  }

  steps.push({
    state: naiveSnap([], `perm 0 / ${TOTAL_PERMS} · 0 arrow-checks`),
    description: `Brute force: generate every ordering of the 7 courses and test each against all 8 prerequisite arrows — 7! = ${TOTAL_PERMS.toLocaleString()} candidates, up to 40,320 checks. The generator walks them lexicographically over the catalog listing [A, B, G, C, D, E, F]: the two intro courses first, the flagship Capstone featured third, then the rest. Watch how long that third slot poisons everything.`,
    codeLine: 0,
    vars: naiveVars(null, '—', '—', 0, 0, ['tried', 'checks']),
  })

  let tried = 0
  let totalChecks = 0
  let validPerm: NodeId[] | null = null

  for (const perm of lexPerms(CATALOG)) {
    tried++
    const { edge, edgeIdx, checks } = firstViolation(perm)
    totalChecks += checks

    if (edge) {
      const pu = perm.indexOf(edge.from) + 1
      const pv = perm.indexOf(edge.to) + 1
      let note = ''
      if (tried === 1) note = ' First candidate, first failure — and the generator just moves to the next permutation, none the wiser.'
      else if (tried === 25) note = ' That closes the block: all 24 orderings with Capstone in slot 3 were doomed for the same reason, yet each one was built and tested from scratch — the enumeration never learns WHY an ordering failed.'
      else if (tried === 31) note = ' Capstone has only crept to slot 5 — still ahead of Algorithms, still doomed.'
      else if (tried === 33) note = ' So close — every arrow but this one points forward now.'
      const passPrefix =
        checks > 1
          ? `The first ${checks - 1} arrow check${checks - 1 > 1 ? 's' : ''} pass, then check ${checks} fails`
          : `The very first arrow check fails`
      steps.push({
        state: naiveSnap(perm, `perm ${tried} / ${TOTAL_PERMS} · ${totalChecks} arrow-checks`, false, edgeIdx),
        description: `Permutation ${tried}: [${perm.join(' ')}]. ${passPrefix}: ${edge.from} → ${edge.to} is violated — ${edge.from} (${NAME[edge.from]}) lands in slot ${pu}, AFTER ${edge.to} (${NAME[edge.to]}) in slot ${pv}, but ${edge.from} must come first. Reject after ${checks} of 8 checks.${note}`,
        codeLine: 3,
        vars: naiveVars(perm, `${edge.from} → ${edge.to} ✗`, 'false', tried, totalChecks, ['ordering', 'edge', 'valid', 'tried', 'checks']),
      })
    } else {
      validPerm = perm
      steps.push({
        state: naiveSnap(perm, `perm ${tried} / ${TOTAL_PERMS} · ${totalChecks} arrow-checks · VALID`, true),
        description: `Permutation ${tried}: [${perm.join(' ')}]. All 8 arrow checks pass — every prerequisite sits to the left of the course that needs it. Return it. It took ${tried} full candidate orderings and ${totalChecks} arrow-checks to stumble onto this, and only because a valid ordering happened to come early in the enumeration.`,
        codeLine: 4,
        vars: naiveVars(perm, 'all 8 ✓', 'true', tried, totalChecks, ['ordering', 'edge', 'valid', 'tried', 'checks']),
      })
      break
    }
  }

  steps.push({
    state: naiveSnap(validPerm ?? [], `done · ${tried} orderings · ${totalChecks} arrow-checks`, true),
    description: `Final tally: ${tried} orderings generated, ${totalChecks} real arrow-checks — and 24 of the 33 rejections shared the identical fatal mistake (Capstone in slot 3), yet each was enumerated and validated independently. Had the valid ordering come last instead of 34th, all ${TOTAL_PERMS.toLocaleString()} permutations (~40,320 checks) would be examined; at 20 courses that's 2.4 quintillion. Kahn's algorithm finds an order in 15 operations, no guessing.`,
    codeLine: 4,
    vars: naiveVars(validPerm, 'all 8 ✓', 'true', tried, totalChecks, []),
  })

  return steps
}

function NaiveViz({ step }: { step: Step<NaiveState> }) {
  const { inDeg, queue, order, processing, removed, hotEdge, done, caption } = step.state
  const legend = (
    <div className="legend">
      <span className="key"><span className="swatch mint" /> in candidate ordering</span>
      <span className="key"><span className="swatch amber" /> violated arrow</span>
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
   Then audit ALL 8 arrows against that order: E → G is violated (G slot 5,
   E slot 7). D → E survives only by tie-break luck.

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

function prereqCountSnap(order: NodeId[], caption: string, hotEdge: number | null = null): PrereqCountState {
  return {
    inDeg: { ...FULL_DEG },
    queue: [],
    order,
    processing: null,
    removed: [],
    hotEdge,
    done: false,
    caption,
  }
}

const COUNT_STR = '{A:0, B:0, C:1, D:2, E:2, F:1, G:2}'

function prereqCountSteps(): Step<PrereqCountState>[] {
  const steps: Step<PrereqCountState>[] = []

  const pcVars = (
    counted: boolean,
    sorted: NodeId[] | null,
    arrow: string,
    valid: string,
    changed: string[],
  ): VarEntry[] => {
    const ch = new Set(changed)
    return [
      { name: 'count{}', value: counted ? COUNT_STR : '—', changed: ch.has('count') },
      { name: 'sorted', value: sorted ? `[${sorted.join(', ')}]` : '—', changed: ch.has('sorted') },
      { name: 'arrow being checked', value: arrow, changed: ch.has('arrow') },
      { name: 'ordering valid?', value: valid, changed: ch.has('valid') },
    ]
  }

  // Step 1: Intro — compute counts
  steps.push({
    state: prereqCountSnap([], 'counting prerequisite arrows into each course'),
    description: `Idea: count how many arrows point INTO each course, then sort by that count — fewest prerequisites first. Count the incoming arrows: A gets 0, B gets 0, C gets 1, F gets 1, D gets 2, E gets 2, G gets 2. One sort, done — no iteration needed.`,
    codeLine: 0,
    vars: pcVars(true, null, '—', '—', ['count']),
  })

  // Sort placements, one course per step
  const placements: [NodeId[], string, string][] = [
    [['A'], 'place A (count 0) — first in sort', `A (Intro to CS) has count 0 — no arrows point into it at all. The sort emits it first.`],
    [['A', 'B'], 'place B (count 0) — tied with A', `B (Calculus) also has count 0. Two courses tie at the front; the sort emits B next. Sorted so far: A, B.`],
    [['A', 'B', 'C'], 'place C (count 1)', `C (Data Structures) and F (Databases) both have count 1. The sort picks C first — ties are broken arbitrarily. Sorted so far: A, B, C.`],
    [['A', 'B', 'C', 'F'], 'place F (count 1) — other count-1 course', `F (Databases) is the other count-1 course. It follows C. Sorted so far: A, B, C, F.`],
    [['A', 'B', 'C', 'F', 'G'], 'place G (count 2) — three-way tie at count 2', `Now the three-way tie: D (Discrete Math), E (Algorithms), and G (Capstone) ALL have count 2, so the sort is free to emit them in any order — and this one emits G first. A static count cannot warn us that G sits at the end of the longest chain A → C → E → G.`],
    [['A', 'B', 'C', 'F', 'G', 'D'], 'place D (count 2)', `D (Discrete Math) is next out of the count-2 tie. Sorted so far: A, B, C, F, G, D.`],
    [['A', 'B', 'C', 'F', 'G', 'D', 'E'], 'place E (count 2) — sort complete', `E (Algorithms) is the last of the count-2 tie. The sort is finished: A, B, C, F, G, D, E — Algorithms ended up LAST, after the Capstone that needs it.`],
  ]
  for (const [order, caption, description] of placements) {
    steps.push({
      state: prereqCountSnap(order, caption),
      description,
      codeLine: 1,
      vars: pcVars(true, order, '—', '—', ['sorted']),
    })
  }

  const sortedOrder: NodeId[] = ['A', 'B', 'C', 'F', 'G', 'D', 'E']
  const slot = (id: NodeId) => sortedOrder.indexOf(id) + 1

  // Return step
  steps.push({
    state: prereqCountSnap(sortedOrder, 'sorted by count: A(0) B(0) C(1) F(1) G(2) D(2) E(2)'),
    description: `The algorithm returns A → B → C → F → G → D → E. Is it actually a valid schedule? Audit it: every one of the 8 arrows must point forward in this list. Check them one by one.`,
    codeLine: 2,
    vars: pcVars(true, sortedOrder, '—', '—', []),
  })

  // Audit all 8 arrows, one step each
  let broken = false
  EDGES.forEach((e, i) => {
    const su = slot(e.from)
    const sv = slot(e.to)
    const ok = su < sv
    const firstCheck = i === 0
    let note = ''
    if (e.from === 'D' && e.to === 'E') note = ` — but only by tie-break luck: the sort happened to emit D before E within the count-2 tie; nothing guaranteed it.`
    if (e.from === 'F' && e.to === 'G') note = ` — but the damage is already done.`
    if (ok) {
      steps.push({
        state: prereqCountSnap(sortedOrder, `check ${i + 1}/8: ${e.from} → ${e.to} ✓`, i),
        description: `Check arrow ${e.from} → ${e.to}: ${e.from} (${NAME[e.from]}) is in slot ${su}, ${e.to} (${NAME[e.to]}) in slot ${sv} — ${e.from} comes first, so this arrow is satisfied${note}`.trimEnd() + (note ? '' : '.'),
        codeLine: 2,
        vars: pcVars(true, sortedOrder, `${e.from} → ${e.to} ✓`, broken ? 'false' : 'true so far', firstCheck ? ['arrow', 'valid'] : ['arrow']),
      })
    } else {
      broken = true
      steps.push({
        state: prereqCountSnap(sortedOrder, `check ${i + 1}/8: ${e.from} → ${e.to} ✗ VIOLATED`, i),
        description: `Check arrow ${e.from} → ${e.to}: ${e.to} (${NAME[e.to]}) sits in slot ${sv} but ${e.from} (${NAME[e.from]}) is back in slot ${su} — ${e.to} is scheduled BEFORE the course it requires. The ordering is invalid.`,
        codeLine: 2,
        vars: pcVars(true, sortedOrder, `${e.from} → ${e.to} ✗`, 'false', ['arrow', 'valid']),
      })
    }
  })

  // Verdict
  steps.push({
    state: prereqCountSnap(sortedOrder, 'FAIL · G before E violates E → G'),
    description: `Audit complete: 7 of 8 arrows pass, but E → G is violated — the three-way tie at count 2 let the sort place G (Capstone) before E (Algorithms). A static count can't see depth: G ends the long chain A → C → E → G yet its number looks identical to D's. You need to know which prerequisites are already DONE, not just how many there are.`,
    codeLine: 2,
    vars: pcVars(true, sortedOrder, 'all 8 audited', 'false', []),
  })

  return steps
}

function PrereqCountViz({ step }: { step: Step<PrereqCountState> }) {
  const { inDeg, queue, order, processing, removed, hotEdge, done, caption } = step.state
  const legend = (
    <div className="legend">
      <span className="key"><span className="swatch mint" /> placed in sorted order</span>
      <span className="key"><span className="swatch amber" /> arrow under audit</span>
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
   4 passes, every course scan shown. Each scan of a course costs 8 arrow
   looks (find the arrows pointing into it): pass1 = 7×8 = 56, pass2 = 5×8 = 40,
   pass3 = 3×8 = 24, pass4 = 1×8 = 8 → 128 total. Kahn's does 15.

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

function rescanSnap(
  order: NodeId[],
  caption: string,
  done = false,
  queue: NodeId[] = [],
  processing: NodeId | null = null,
): RescanState {
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
    queue,
    order,
    processing,
    removed: removedEdges,
    hotEdge: null,
    done,
    caption,
  }
}

function rescanSteps(): Step<RescanState>[] {
  const steps: Step<RescanState>[] = []

  const rsVars = (
    order: NodeId[],
    pass: number | null,
    v: NodeId | null,
    prereqs: string,
    ready: NodeId[] | null,
    checks: number,
    changed: string[],
  ): VarEntry[] => {
    const ch = new Set(changed)
    return [
      { name: 'order', value: `[${order.join(', ')}]`, changed: ch.has('order') },
      { name: 'pass', value: pass === null ? '—' : String(pass), changed: ch.has('pass') },
      { name: 'v', value: v ?? '—', changed: ch.has('v') },
      { name: 'prereqs of v', value: prereqs, changed: ch.has('prereqs') },
      { name: 'ready this pass', value: ready ? `[${ready.join(', ')}]` : '—', changed: ch.has('ready') },
      { name: 'arrow-checks', value: String(checks), changed: ch.has('checks') },
    ]
  }

  // Intro sentinel
  steps.push({
    state: rescanSnap([], 'pass 0 · 0 placed · 0 arrow-checks'),
    description: `Simulate semesters: each pass scans every unplaced course and asks "are all of its prerequisites already in the order?" Courses that qualify are taken together when the pass (semester) ends — they don't count as finished mid-pass. Start with an empty order.`,
    codeLine: 0,
    vars: rsVars([], null, null, '—', null, 0, ['order']),
  })

  const placed: NodeId[] = []
  let checks = 0
  let pass = 0
  let gPolls = 0

  const passNotes: Record<number, string> = {
    1: ` Pass 1 cost 7 courses × 8 arrow looks = 56 checks to discover what the in-degrees said for free: exactly A and B were ready.`,
    2: ` Running total: 96 checks. Note that G was re-examined this pass even though nothing about G changed — pure polling.`,
    3: ` Running total: 120 checks. Only G remains.`,
    4: ` Running total: 128 checks — all 7 courses placed.`,
  }

  while (placed.length < NODES.length) {
    pass++
    const ready: NodeId[] = []
    const unplaced = NODES.filter((n) => !placed.includes(n))
    let firstOfPass = true

    for (const v of unplaced) {
      checks += 8
      const pre = EDGES.filter((e) => e.to === v).map((e) => e.from)
      const missing = pre.filter((p) => !placed.includes(p))
      const qualifies = missing.length === 0
      const preStr = pre.length === 0 ? 'none' : pre.map((p) => `${p} ${placed.includes(p) ? '✓' : '✗'}`).join(', ')

      let description: string
      if (qualifies) {
        ready.push(v)
        description =
          pre.length === 0
            ? `Pass ${pass} — scan ${v} (${NAME[v]}): it has no prerequisites at all, so it qualifies. Confirming that still meant looking through all 8 arrows for ones pointing into ${v} — 8 checks (${checks} total).`
            : `Pass ${pass} — scan ${v} (${NAME[v]}): prerequisite${pre.length > 1 ? 's' : ''} ${pre.map((p) => `${p} (${NAME[p]})`).join(' and ')} ${pre.length > 1 ? 'are' : 'is'} already in the order ✓ — ${v} qualifies and will be taken when this semester ends. 8 more arrow looks (${checks} total).`
      } else {
        const missingStr = missing.map((m) => `${m} (${NAME[m]})`).join(' and ')
        const allMissingAreReady = missing.every((m) => ready.includes(m))
        let gNote = ''
        if (v === 'G') {
          gPolls++
          if (gPolls === 2) gNote = ` This is the SECOND time G has been polled, and the answer hasn't changed.`
          else if (gPolls === 3) gNote = ` Third poll of G — same answer again. Nothing about G changed since pass 1; the rescan just doesn't know that.`
        }
        description = allMissingAreReady
          ? `Pass ${pass} — scan ${v} (${NAME[v]}): it needs ${missingStr}, which only qualified THIS pass — they're being taken this very semester, so they aren't finished yet and ${v} must wait a full extra pass. 8 arrow looks spent anyway (${checks} total).`
          : `Pass ${pass} — scan ${v} (${NAME[v]}): it needs ${missingStr}, still unplaced — ${v} stays blocked. The 8 arrow looks were spent anyway (${checks} total).${gNote}`
      }

      steps.push({
        state: rescanSnap(placed, `pass ${pass} · scanning ${v} · ${checks} checks`, false, [...ready], v),
        description,
        codeLine: qualifies ? 3 : 2,
        vars: rsVars(
          placed,
          pass,
          v,
          preStr,
          ready,
          checks,
          [...(firstOfPass ? ['pass'] : []), 'v', 'prereqs', 'checks', ...(qualifies ? ['ready'] : [])],
        ),
      })
      firstOfPass = false
    }

    placed.push(...ready)
    steps.push({
      state: rescanSnap(placed, `pass ${pass} done · placed ${ready.join(', ')} · ${checks} checks so far`),
      description: `Pass ${pass} complete — semester over. ${ready.map((r) => `${r} (${NAME[r]})`).join(' and ')} ${ready.length > 1 ? 'are' : 'is'} appended to the order, now [${placed.join(', ')}].${passNotes[pass] ?? ''}`,
      codeLine: 1,
      vars: rsVars(placed, pass, null, '—', [], checks, ['order', 'ready']),
    })
  }

  steps.push({
    state: rescanSnap(placed, `all 7 placed · ${checks} arrow-checks · correct but wasteful`, true),
    description: `Done — correct result [${placed.join(', ')}] in ${pass} passes and ${checks} arrow-checks. Compare with Kahn's: 7 dequeues + 8 edge deletions = 15 operations. The rescan wastes 113 extra checks because it polls courses like G every single pass even though nothing about them changed until their prerequisites finished. The fix: let each finished course push the news to its dependents, not the other way around.`,
    codeLine: 1,
    vars: rsVars(placed, pass, null, '—', null, checks, []),
  })

  return steps
}

function RescanViz({ step }: { step: Step<RescanState> }) {
  const { inDeg, queue, order, processing, removed, hotEdge, done, caption } = step.state
  const legend = (
    <div className="legend">
      <span className="key"><span className="swatch mint" /> placed in an earlier pass</span>
      <span className="key"><span className="swatch amber" /> qualified this pass</span>
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
