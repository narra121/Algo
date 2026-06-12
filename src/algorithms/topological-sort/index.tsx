import type { AlgorithmModule, Step, VarEntry } from '../../core/types'
import { naiveDemo, prereqCountDemo, rescanDemo } from './demos'
import { NODES, EDGES, NAME, POS, R } from './data'
import type { NodeId } from './data'

/* Canonical example: Kahn's algorithm on a 7-course prerequisite DAG. */

interface TopoState {
  /** Current in-degree (pending prerequisites) of every course. */
  inDeg: Record<NodeId, number>
  /** Courses with in-degree 0, waiting to be scheduled (FIFO). */
  queue: NodeId[]
  /** The growing topological order. */
  order: NodeId[]
  /** Course currently being processed, if any. */
  processing: NodeId | null
  /** Indices into EDGES that have been removed (prerequisite satisfied). */
  removed: number[]
  /** Edge being removed right now, highlighted. */
  hotEdge: number | null
  /** True on the final success step. */
  done: boolean
}

function generateSteps(): Step<TopoState>[] {
  const steps: Step<TopoState>[] = []
  const inDeg: Record<NodeId, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 }
  for (const e of EDGES) inDeg[e.to]++
  const queue: NodeId[] = []
  const order: NodeId[] = []
  const removed: number[] = []

  const snap = (processing: NodeId | null, hotEdge: number | null, done = false): TopoState => ({
    inDeg: { ...inDeg },
    queue: [...queue],
    order: [...order],
    processing,
    removed: [...removed],
    hotEdge,
    done,
  })

  const fmtDeg = () => `{${NODES.map((n) => `${n}:${inDeg[n]}`).join(', ')}}`
  const mkVars = (u: NodeId | null, changed: string[], preInit = false): VarEntry[] => {
    const ch = new Set(changed)
    return [
      { name: 'in-degree{}', value: fmtDeg(), changed: ch.has('in-degree') },
      { name: 'queue', value: preInit ? '—' : `[${queue.join(', ')}]`, changed: ch.has('queue') },
      { name: 'order', value: preInit ? '—' : `[${order.join(', ')}]`, changed: ch.has('order') },
      { name: 'u', value: u ?? '—', changed: ch.has('u') },
      { name: 'edges removed', value: `${removed.length}/${EDGES.length}`, changed: ch.has('removed') },
    ]
  }

  steps.push({
    state: snap(null, null),
    description: `Goal: line up all 7 courses so every prerequisite arrow points forward. Start by counting incoming arrows for every course: A and B have 0 pending prerequisites, C and F have 1, while D, E and G are blocked by 2 each. An in-degree is just "how many things must happen before me".`,
    codeLine: 0,
    vars: mkVars(null, ['in-degree'], true),
  })

  for (const id of NODES) if (inDeg[id] === 0) queue.push(id)
  steps.push({
    state: snap(null, null),
    description: `Seed the queue with every course nobody is waiting on: A (${NAME.A}) and B (${NAME.B}). They are safe to take RIGHT NOW — no arrow points into them, so scheduling them first can't violate anything. The order starts empty.`,
    codeLine: 1,
    vars: mkVars(null, ['queue', 'order']),
  })

  while (queue.length > 0) {
    const u = queue.shift() as NodeId
    order.push(u)
    const outgoing = EDGES.map((e, i) => ({ ...e, i })).filter((e) => e.from === u)
    const unlockNote =
      outgoing.length === 0
        ? ` It has no outgoing arrows — nothing depends on it, so there's nothing to unlock.`
        : ` Now satisfy the ${outgoing.length} arrow${outgoing.length > 1 ? 's' : ''} leaving it.`
    steps.push({
      state: snap(u, null),
      description: `Dequeue ${u} (${NAME[u]}) — its in-degree is 0, meaning every prerequisite it ever had is already in the order. It becomes course #${order.length}.${unlockNote}`,
      codeLine: 4,
      vars: mkVars(u, ['u', 'queue', 'order']),
    })

    for (const e of outgoing) {
      const before = inDeg[e.to]
      inDeg[e.to] = before - 1
      removed.push(e.i)
      if (inDeg[e.to] === 0) {
        queue.push(e.to)
        steps.push({
          state: snap(u, e.i),
          description: `Delete edge ${u} → ${e.to}: ${e.to}'s in-degree drops ${before} → 0. That was the LAST thing blocking ${e.to} (${NAME[e.to]}) — it's fully unlocked and joins the queue.`,
          codeLine: 7,
          vars: mkVars(u, ['in-degree', 'removed', 'queue']),
        })
      } else {
        steps.push({
          state: snap(u, e.i),
          description: `Delete edge ${u} → ${e.to}: one of ${e.to}'s prerequisites is satisfied, so its in-degree drops ${before} → ${inDeg[e.to]}. Still ${inDeg[e.to]} pending — ${e.to} (${NAME[e.to]}) stays locked for now.`,
          codeLine: 6,
          vars: mkVars(u, ['in-degree', 'removed']),
        })
      }
    }
  }

  steps.push({
    state: snap(null, null, true),
    description: `Queue empty and all ${order.length} of ${NODES.length} courses placed: ${order.join(' → ')}. Every arrow points forward in this list — and it took just ${order.length} dequeues + ${EDGES.length} edge deletions = ${order.length + EDGES.length} operations, versus checking up to 5,040 permutations by brute force. Had we finished with fewer than 7, the leftovers would all be waiting on each other — a cycle, and no valid order exists.`,
    codeLine: 8,
    vars: mkVars(null, []),
  })

  return steps
}

/* ---------- fixed left-to-right layered layout ---------- */

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

function Visualizer({ step }: { step: Step<TopoState> }) {
  const { inDeg, queue, order, processing, removed, hotEdge, done } = step.state
  return (
    <>
      <div className="viz-caption">
        queue = [{queue.join(', ')}] · placed {order.length}/{NODES.length}
        {done && ' · valid order found'}
      </div>
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
      <div className="legend">
        <span className="key"><span className="swatch amber" /> in queue (in-degree 0)</span>
        <span className="key"><span className="swatch mint" /> being processed</span>
        <span className="key"><span className="swatch" /> still blocked</span>
      </div>
    </>
  )
}

export const topologicalSort: AlgorithmModule<TopoState> = {
  id: 'topological-sort',
  name: 'Topological Sort',
  tagline: 'Order tasks so every prerequisite comes first — repeatedly peel off whatever has nothing pending.',
  category: 'Graphs',
  icon: '🧭',
  problem: {
    title: 'Course Schedule — order 7 courses so every prerequisite comes first',
    statement:
      'A course catalog has 7 courses — Intro to CS, Calculus, Data Structures, Discrete Math, Algorithms, Databases, Capstone — linked by 8 prerequisite arrows (e.g. Intro to CS → Data Structures, Algorithms → Capstone). In what order can you take all 7 so that every arrow points forward — every prerequisite finished before the course that needs it? That exact question is what the animation below is solving, live.',
    input: '7 courses (A–G) and 8 prerequisite arrows "u must come before v" forming a DAG.',
    output: 'One valid ordering of all 7 — here, A → B → C → D → F → E → G — or proof that none exists (a cycle).',
    naive: {
      description:
        'Try every possible ordering and check it: 7! = 5,040 permutations, each verified against all 8 arrows — about 40,320 checks for just 7 courses.',
      pseudocode: [
        'for each permutation P of the n courses:',
        '    valid ← true',
        '    for each arrow u → v:',
        '        if u comes after v in P: valid ← false',
        '    if valid: return P',
        'return impossible',
      ],
      time: 'O(n! · E)',
      space: 'O(n)',
      issues:
        'Thousands of permutations share the same fatal early mistake — Capstone scheduled first dooms 720 orderings at once — yet each one is generated and checked independently, because the enumeration never learns WHY an ordering failed. Factorial growth is merciless: 20 courses means 2.4 quintillion permutations. Kahn\'s algorithm reads the answer straight off the in-degrees and finishes this instance in 15 operations: 7 dequeues + 8 edge deletions.',
      demo: naiveDemo,
    },
  },
  aha:
    'A course with in-degree 0 has every prerequisite already behind it, so scheduling it next can NEVER break the order — and once placed it can be deleted forever, which may unblock its neighbors. Repeating that one always-safe move sorts all 7 courses in V + E = 15 operations instead of auditing 5,040 permutations.',
  journey: [
    {
      title: 'Sort courses by how many prerequisites they list',
      spark:
        'Intro to CS has zero prerequisites and Capstone has the most pressure on it — so just rank every course by its prerequisite count, fewest first, and take them in that order. One sort, done.',
      pseudocode: [
        'count[v] ← number of arrows into v',
        'sort the n courses ascending by count[v]',
        'return the sorted list',
      ],
      time: 'O(V log V + E)',
      space: 'O(V)',
      verdict: 'fail',
      breaks:
        "The counts here are A:0, B:0, C:1, F:1, D:2, E:2, G:2 — so D, E and G are a three-way tie, and the sort is free to emit A, B, C, F, G, D, E. That puts G (Capstone) before E (Algorithms) AND E before D (Discrete Math), breaking the arrows E → G and D → E. A static count can't see depth: G sits at the end of the chain A → C → E → G, yet its number looks identical to D's.",
      insight:
        "Readiness isn't about how many prerequisites a course HAS — it's about which ones are already DONE. The order has to be built incrementally, checking completion as you go.",
      demo: prereqCountDemo,
    },
    {
      title: 'Simulate semesters — re-scan for any course whose prerequisites are all done',
      spark:
        'So build the order live: each "semester", scan the whole catalog for courses whose prerequisites are all already placed, take them, and repeat until all 7 are scheduled.',
      pseudocode: [
        'order ← []',
        'while some course is unplaced:',
        '    for each unplaced course v:',
        '        if every prerequisite of v is in order: append v',
        '    if nothing was appended: cycle, stop',
      ],
      time: 'O(V · (V + E))',
      space: 'O(V)',
      verdict: 'partial',
      breaks:
        "Correct — it finds A, B → C, D → E, F → G in 4 passes. But count the work: pass 1 checks 7 courses against all 8 arrows (56 looks), pass 2 checks 5 (40), pass 3 checks 3 (24), pass 4 checks 1 (8) — 128 arrow-checks to place 7 courses, versus 15 operations for Kahn's. Worse, the re-scans are pure polling: G gets re-examined every single pass even though nothing about it changed until E and F finished.",
      insight:
        'The ONLY event that can unlock a course is one of its prerequisites finishing. So stop asking every course every pass — let each finished course push the news to its dependents directly.',
      demo: rescanDemo,
    },
    {
      title: "Kahn's algorithm — count down in-degrees, queue whatever hits 0",
      spark:
        "Give every course a live counter of pending prerequisites. When a course is placed, decrement the counter of each dependent — and any counter that hits 0 announces itself by joining the queue. No scanning, ever.",
      pseudocode: [
        'compute in-degree of every node',
        'queue ← all nodes with in-degree 0',
        'order ← []',
        'while queue not empty:',
        '    u ← dequeue(queue); append u to order',
        '    for each edge u → v:',
        '        in-degree[v] ← in-degree[v] − 1',
        '        if in-degree[v] = 0: enqueue v',
        'if |order| = n: return order   — else: cycle, no valid order',
      ],
      time: 'O(V + E)',
      space: 'O(V)',
      verdict: 'optimal',
      breaks:
        "Nothing is wasted now: each of the 7 courses enters the queue exactly once (the single moment its counter hits 0), and each of the 8 arrows is deleted exactly once, when its source is placed. That's 7 dequeues + 8 decrements = 15 operations total — no course is ever re-examined, unlike the 128 polling checks, and no ordering is ever guessed, unlike the 5,040 permutations.",
      insight:
        'A counter hitting 0 is a PROOF that every prerequisite is already behind us — which is exactly the aha below.',
      demo: { generateSteps, Visualizer },
    },
  ],
  intuition: [
    "Picture planning a college degree. The capstone needs Algorithms, Algorithms needs Data Structures and Discrete Math, and those need the intro courses. You can't enroll in everything at once — but each semester you CAN take any course whose prerequisites are all done. Take those, cross them off, and suddenly new courses become available. Repeat until the whole catalog is scheduled.",
    "The key insight is the in-degree counter: a node with in-degree 0 has no unmet dependency, so placing it next can never break an ordering — every arrow into it is already behind us. And once it's placed, it can be deleted from the graph, decrementing its neighbors' counters. The invariant is that the queue holds EXACTLY the nodes whose entire ancestry is already in the output. If the queue ever empties before all n nodes are placed, every remaining node is waiting on another remaining node — a cycle — and no valid order exists at all.",
    'Reach for topological sort whenever items have one-directional "must come before" constraints and you need a linear schedule or a safe processing order: build systems, course prerequisites, task pipelines, spreadsheet cell evaluation. It also unlocks DAG dynamic programming — processing nodes in topo order guarantees every dependency is computed before it is needed (longest path, counting paths, eventual-safe-state style reverse analyses).',
  ],
  pseudocode: [
    'compute in-degree of every node',
    'queue ← all nodes with in-degree 0',
    'order ← []',
    'while queue not empty:',
    '    u ← dequeue(queue); append u to order',
    '    for each edge u → v:',
    '        in-degree[v] ← in-degree[v] − 1',
    '        if in-degree[v] = 0: enqueue v',
    'if |order| = n: return order   — else: cycle, no valid order',
  ],
  complexity: {
    time: 'O(V + E)',
    space: 'O(V)',
    explanation:
      "Every node enters and leaves the queue exactly once (it's only enqueued the single time its in-degree hits 0) — that's the V part. Every edge is deleted exactly once, when its source is processed — that's the E part. Nothing is ever revisited, so the total work is one clean pass over the graph. The queue, in-degree array, and output each hold at most V entries.",
  },
  generateSteps,
  Visualizer,
  problems: [
    { title: 'Course Schedule', difficulty: 'Medium', leetcodeId: 207, hint: "Run Kahn's and check whether all n courses get placed — fewer means a prerequisite cycle." },
    { title: 'Course Schedule II', difficulty: 'Medium', leetcodeId: 210, hint: 'Same as 207, but the queue-pop sequence itself IS the answer to return.' },
    { title: 'Alien Dictionary', difficulty: 'Hard', leetcodeId: 269, hint: 'Derive letter-precedence edges from adjacent word pairs, then topo-sort the alphabet.' },
    { title: 'Minimum Height Trees', difficulty: 'Medium', leetcodeId: 310, hint: 'Peel leaves (degree 1) layer by layer, topo-style, until 1–2 center nodes remain.' },
    { title: 'Parallel Courses', difficulty: 'Medium', leetcodeId: 1136, hint: 'Process the queue in whole levels — each level of in-degree-0 nodes is one semester.' },
    { title: 'Sequence Reconstruction', difficulty: 'Medium', leetcodeId: 444, hint: 'The supersequence is unique iff the queue never holds more than one node at a time.' },
    { title: 'Build Order of Project Dependencies', difficulty: 'Medium', hint: 'Projects are nodes, dependencies are edges — emit any topological order or report a cycle.' },
    { title: 'Sort Items by Groups Respecting Dependencies', difficulty: 'Hard', leetcodeId: 1203, hint: 'Two nested topo sorts: one ordering the groups, one ordering items inside each group.' },
    { title: 'Find Eventual Safe States', difficulty: 'Medium', leetcodeId: 802, hint: 'Reverse every edge, then topo-sort: nodes that get peeled can never be trapped in a cycle.' },
    { title: 'Longest Path in a DAG', difficulty: 'Medium', hint: 'Relax edges in topo order — every predecessor is finalized before you extend it, no negative-cycle worries.' },
    { title: 'All Ancestors of a Node in a DAG', difficulty: 'Medium', leetcodeId: 2192, hint: 'Propagate ancestor sets along edges in topo order so each node inherits fully-built sets.' },
  ],
}
