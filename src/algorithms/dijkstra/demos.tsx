import type { AttemptDemo, Step } from '../../core/types'
import { NODES, EDGES, POS, SOURCE, neighborsOf } from './data'
import type { NodeId } from './data'

/* ─────────────────────────────────────────────────────────────────────────────
   Shared graph renderer
   Replicates the exact SVG + cell markup and CSS classes from index.tsx's
   Visualizer so demo graphs look native — same node circles, same edge lines,
   same weight labels, same distance cells, same legend swatches.
─────────────────────────────────────────────────────────────────────────────── */

const fmt = (n: number) => (n === Infinity ? '∞' : String(n))

interface GraphRendererProps {
  caption: string
  dist: Record<NodeId, number>
  activeNode: NodeId | null
  settledNodes: NodeId[]
  relaxEdge: [NodeId, NodeId] | null
  edgeImproved: boolean | null
  flashNode: NodeId | null
  done: boolean
  legend: Array<{ tone?: 'mint' | 'amber' | 'rose' | 'sky'; label: string }>
}

function GraphRenderer({
  caption,
  dist,
  activeNode,
  settledNodes,
  relaxEdge,
  edgeImproved,
  flashNode,
  done,
  legend,
}: GraphRendererProps) {
  const nodeClass = (n: NodeId) => {
    let cls = 'node'
    if (n === activeNode) cls += ' active'
    else if (relaxEdge && relaxEdge[1] === n) cls += ' warm'
    else if (settledNodes.includes(n)) cls += ' done'
    return cls
  }

  const edgeClass = (u: NodeId, v: NodeId) => {
    let cls = 'edge'
    if (
      relaxEdge &&
      ((relaxEdge[0] === u && relaxEdge[1] === v) ||
        (relaxEdge[0] === v && relaxEdge[1] === u))
    ) {
      cls += edgeImproved ? ' hot' : ' warm'
    }
    return cls
  }

  return (
    <>
      <div className="viz-caption">{caption}</div>
      <svg
        className="viz-svg"
        viewBox="0 0 460 260"
        width={460}
        height={260}
        role="img"
        aria-label="Weighted graph"
      >
        {EDGES.map(([u, v, w]) => {
          const p = POS[u]
          const q = POS[v]
          const mx = (p.x + q.x) / 2
          const my = (p.y + q.y) / 2
          const len = Math.hypot(q.x - p.x, q.y - p.y)
          const ox = (-(q.y - p.y) / len) * 12
          const oy = ((q.x - p.x) / len) * 12
          return (
            <g key={`${u}-${v}`}>
              <line className={edgeClass(u, v)} x1={p.x} y1={p.y} x2={q.x} y2={q.y} />
              <text
                x={mx + ox}
                y={my + oy}
                textAnchor="middle"
                dominantBaseline="central"
                style={{
                  fill: 'var(--muted)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {w}
              </text>
            </g>
          )
        })}
        {NODES.map((n) => (
          <g key={n}>
            <circle className={nodeClass(n)} cx={POS[n].x} cy={POS[n].y} r={20} />
            <text
              x={POS[n].x}
              y={POS[n].y}
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                fill: 'var(--ink)',
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {n}
            </text>
          </g>
        ))}
      </svg>
      <div className="cells spaced">
        {NODES.map((n) => {
          const val = (dist as Record<string, number>)[n]
          let cls = 'cell'
          if (flashNode === n) cls += ' active'
          else if (done || settledNodes.includes(n)) cls += ' done'
          else if (val === Infinity) cls += ' dim'
          return (
            <div key={n} className={cls}>
              <span className="idx">{n}</span>
              {fmt(val)}
              {activeNode === n && <span className="ptr mint">▲ CURRENT</span>}
              {flashNode === n && <span className="ptr amber">▲ IMPROVED</span>}
            </div>
          )
        })}
      </div>
      <div className="legend">
        {legend.map((it, i) => (
          <span key={i} className="key">
            <span className={`swatch${it.tone ? ` ${it.tone}` : ''}`} /> {it.label}
          </span>
        ))}
      </div>
    </>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 1 — Naive brute force: enumerate ALL simple paths from A
   42 total simple paths; 13 to F. Show 10 paths then truncate + verdict.
   Total steps: 13 (intro + 10 paths + truncation + verdict).

   codeLine indexes problem.naive.pseudocode:
     0: 'best[v] ← ∞ for every town v'
     1: 'walk(town, cost, visited):'
     2: '    best[town] ← min(best[town], cost)'
     3: '    for each road town–next with toll w:'
     4: '        if next not in visited:'
     5: '            walk(next, cost + w, visited ∪ {town})'
     6: 'walk(A, 0, ∅)'
─────────────────────────────────────────────────────────────────────────────── */

interface NaiveState {
  best: Record<NodeId, number>
  currentPath: NodeId[]
  currentCost: number
  pathsExplored: number
  done: boolean
}

const NAIVE_PATHS_TOTAL = 42
const NAIVE_PATHS_TO_F = 13

/** Collect all simple paths from SOURCE by DFS. */
function collectAllPaths(): Array<{ path: NodeId[]; cost: number }> {
  const result: Array<{ path: NodeId[]; cost: number }> = []
  function dfs(node: NodeId, cost: number, vis: Set<NodeId>, path: NodeId[]) {
    result.push({ path: [...path, node], cost })
    for (const { v, w } of neighborsOf(node)) {
      if (!vis.has(v)) {
        vis.add(v)
        dfs(v, cost + w, vis, [...path, node])
        vis.delete(v)
      }
    }
  }
  dfs(SOURCE, 0, new Set([SOURCE]), [])
  return result
}

function naiveSteps(): Step<NaiveState>[] {
  const steps: Step<NaiveState>[] = []

  // Intro
  steps.push({
    state: {
      best: { A: 0, B: Infinity, C: Infinity, D: Infinity, E: Infinity, F: Infinity },
      currentPath: [],
      currentCost: 0,
      pathsExplored: 0,
      done: false,
    },
    description: `Brute force: walk every simple path from ${SOURCE} and track a running best cost per destination. This tiny 6-node graph hides ${NAIVE_PATHS_TOTAL} simple paths — ${NAIVE_PATHS_TO_F} different routes to F alone. Initialise best[${SOURCE}]=0, all others ∞. Begin the recursive walk.`,
    codeLine: 0,
  })

  const allPaths = collectAllPaths()
  const nonTrivial = allPaths.filter(p => p.path.length > 1)
  const SHOW = 10

  const runBest: Record<NodeId, number> = { A: 0, B: Infinity, C: Infinity, D: Infinity, E: Infinity, F: Infinity }

  for (let i = 0; i < Math.min(SHOW, nonTrivial.length); i++) {
    const { path, cost } = nonTrivial[i]
    const dest = path[path.length - 1]
    const old = (runBest as Record<string, number>)[dest]
    const improved = cost < old
    if (improved) (runBest as Record<string, number>)[dest] = cost

    steps.push({
      state: {
        best: { ...runBest },
        currentPath: path,
        currentCost: cost,
        pathsExplored: i + 1,
        done: false,
      },
      description:
        `Path ${i + 1}: ${path.join(' → ')} (toll ${cost}). ${
          improved
            ? `New best for ${dest}! best[${dest}] = ${cost}.`
            : `best[${dest}] stays ${(runBest as Record<string, number>)[dest]} — ${cost} is not cheaper.`
        } The shared prefix A→C was re-summed from scratch once more.`,
      codeLine: improved ? 2 : 3,
    })
  }

  // Truncation step
  steps.push({
    state: {
      best: { A: 0, B: 3, C: 2, D: 8, E: 7, F: 10 },
      currentPath: [],
      currentCost: 0,
      pathsExplored: NAIVE_PATHS_TOTAL,
      done: false,
    },
    description: `…and so on — all ${NAIVE_PATHS_TOTAL} simple paths walked, ${NAIVE_PATHS_TO_F} of them ending at F. Every shared prefix (A→C, A→C→B, …) is re-priced on every path that contains it; nothing is ever declared finished. The path count explodes factorially with more towns.`,
    codeLine: 5,
  })

  // Verdict step
  steps.push({
    state: {
      best: { A: 0, B: 3, C: 2, D: 8, E: 7, F: 10 },
      currentPath: ['A', 'C', 'E', 'F'],
      currentCost: 10,
      pathsExplored: NAIVE_PATHS_TOTAL,
      done: true,
    },
    description: `Done. True shortest costs: A=0, B=3, C=2, D=8, E=7, F=10. Best route to F: A→C→E→F at cost 10 — but the search ground through all ${NAIVE_PATHS_TO_F} routes to F before confirming it. Dijkstra answers with 6 pops and 9 edge checks; no path is ever re-walked.`,
    codeLine: 6,
  })

  return steps
}

function NaiveViz({ step }: { step: Step<NaiveState> }) {
  const { best, currentPath, currentCost, pathsExplored, done } = step.state

  const pathSet = new Set(currentPath)
  const pathEdges = new Set<string>()
  for (let i = 0; i < currentPath.length - 1; i++) {
    pathEdges.add(`${currentPath[i]}-${currentPath[i + 1]}`)
    pathEdges.add(`${currentPath[i + 1]}-${currentPath[i]}`)
  }
  const lastNode = currentPath.length > 0 ? currentPath[currentPath.length - 1] : null

  const caption = done
    ? `${pathsExplored} paths walked · cheapest to F: A→C→E→F = 10`
    : pathsExplored === 0
      ? `path 0 · initialising best[]`
      : `path ${pathsExplored} · ${currentPath.join('→')} = ${currentCost}`

  return (
    <>
      <div className="viz-caption">{caption}</div>
      <svg
        className="viz-svg"
        viewBox="0 0 460 260"
        width={460}
        height={260}
        role="img"
        aria-label="Weighted graph"
      >
        {EDGES.map(([u, v, w]) => {
          const p = POS[u]
          const q = POS[v]
          const mx = (p.x + q.x) / 2
          const my = (p.y + q.y) / 2
          const len = Math.hypot(q.x - p.x, q.y - p.y)
          const ox = (-(q.y - p.y) / len) * 12
          const oy = ((q.x - p.x) / len) * 12
          const onPath = pathEdges.has(`${u}-${v}`)
          return (
            <g key={`${u}-${v}`}>
              <line
                className={`edge${onPath ? ' hot' : ''}`}
                x1={p.x}
                y1={p.y}
                x2={q.x}
                y2={q.y}
              />
              <text
                x={mx + ox}
                y={my + oy}
                textAnchor="middle"
                dominantBaseline="central"
                style={{
                  fill: 'var(--muted)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {w}
              </text>
            </g>
          )
        })}
        {NODES.map((n) => {
          let cls = 'node'
          if (done) cls += ' done'
          else if (n === lastNode) cls += ' active'
          else if (pathSet.has(n)) cls += ' warm'
          return (
            <g key={n}>
              <circle className={cls} cx={POS[n].x} cy={POS[n].y} r={20} />
              <text
                x={POS[n].x}
                y={POS[n].y}
                textAnchor="middle"
                dominantBaseline="central"
                style={{
                  fill: 'var(--ink)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {n}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="cells spaced">
        {NODES.map((n) => {
          const val = (best as Record<string, number>)[n]
          let cls = 'cell'
          if (done) cls += ' done'
          else if (n === lastNode) cls += ' active'
          else if (val === Infinity) cls += ' dim'
          return (
            <div key={n} className={cls}>
              <span className="idx">{n}</span>
              {fmt(val)}
            </div>
          )
        })}
      </div>
      <div className="legend">
        <span className="key"><span className="swatch mint" /> current destination</span>
        <span className="key"><span className="swatch amber" /> on active path</span>
        <span className="key"><span className="swatch" /> unvisited this path</span>
      </div>
    </>
  )
}

export const naiveDemo: AttemptDemo<NaiveState> = { generateSteps: naiveSteps, Visualizer: NaiveViz }

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 2 — Attempt 1: Plain BFS — count hops, not tolls  (verdict: fail)
   BFS visit order: A(0), B(4 via A), C(2 via A), D(9 via B), E(7 via C), F(15 via D).
   Counterexample: B stamped at 4, true best is 3 (A→C→B = 2+1).
   D stamped at 9, true best is 8 (A→C→B→D).
   Key steps only — show each node being stamped + 2 already-seen rejections + verdict.
   Total steps: ~13.

   codeLine indexes journey[0].pseudocode:
     0: 'dist[A] ← 0; queue ← {A}'
     1: 'while queue not empty:'
     2: '    u ← dequeue front'
     3: '    for each road u–v with toll w:'
     4: '        if v never seen: dist[v] ← dist[u] + w; enqueue v'
─────────────────────────────────────────────────────────────────────────────── */

interface BfsState {
  dist: Record<NodeId, number>
  seen: NodeId[]
  queue: NodeId[]
  current: NodeId | null
  examiningEdge: [NodeId, NodeId] | null
  accepted: boolean | null
  done: boolean
  verdict: boolean
}

function bfsSteps(): Step<BfsState>[] {
  const steps: Step<BfsState>[] = []
  const Inf = Infinity
  const dist: Record<NodeId, number> = { A: 0, B: Inf, C: Inf, D: Inf, E: Inf, F: Inf }
  const seen: NodeId[] = ['A']
  const queue: NodeId[] = ['A']

  const snap = (partial: Partial<BfsState>): BfsState => ({
    dist: { ...dist },
    seen: [...seen],
    queue: [...queue],
    current: null,
    examiningEdge: null,
    accepted: null,
    done: false,
    verdict: false,
    ...partial,
  })

  // Intro
  steps.push({
    state: snap({}),
    description: `BFS explores towns one hop at a time and stamps each town on first arrival — permanently. That works perfectly when every road has the same toll. Here it does not. Initialise dist[A]=0, queue=[A].`,
    codeLine: 0,
  })

  // Simulate BFS, emitting only meaningful steps:
  // - pop step for each node
  // - stamp step for each newly-seen neighbour
  // - ONE skip step per node (the most instructive already-seen skip)
  while (queue.length > 0) {
    const u = queue.shift()!

    steps.push({
      state: snap({ current: u, queue: [...queue] }),
      description: `Dequeue ${u} (dist[${u}]=${dist[u]}). Check its roads.`,
      codeLine: 2,
    })

    let shownSkip = false
    for (const { v, w } of neighborsOf(u)) {
      const candidate = (dist as Record<string, number>)[u] + w
      const firstTime = !seen.includes(v)
      if (firstTime) {
        ;(dist as Record<string, number>)[v] = candidate
        seen.push(v)
        queue.push(v)
        steps.push({
          state: snap({ current: u, examiningEdge: [u, v], accepted: true }),
          description: `${u}–${v} (toll ${w}): ${v} never seen — stamp dist[${v}]=${candidate} and enqueue. First arrival is final; ${v} will never be revisited${candidate === 9 && v === 'D' ? ' — even though A→C→B→D = 8 is cheaper' : ''}.`,
          codeLine: 4,
        })
      } else if (!shownSkip) {
        // Show the most instructive skip (prefer the one where the better cost was missed)
        const isCheaper = candidate < (dist as Record<string, number>)[v]
        steps.push({
          state: snap({ current: u, examiningEdge: [u, v], accepted: false }),
          description: `${u}–${v} (toll ${w}): ${v} already seen at dist[${v}]=${(dist as Record<string, number>)[v]}. BFS skips it — ${isCheaper ? `even though ${candidate} would be CHEAPER. This is where BFS goes wrong.` : 'no cheaper route here.'}`,
          codeLine: 4,
        })
        shownSkip = true
      }
    }
  }

  // Verdict
  steps.push({
    state: snap({ done: true, verdict: true }),
    description: `BFS result: A=0, B=4, C=2, D=9, E=7, F=15. Correct distances: B=3, D=8, F=10. BFS stamped B=4 via one-hop A–B and locked it — it missed the cheaper two-hop A→C→B = 2+1 = 3. D inherited stale B: 4+5=9 instead of 3+5=8. F followed: 9+6=15 instead of 10. On a weighted map, fewer roads is not cheaper roads.`,
    codeLine: -1,
  })

  return steps
}

function BfsViz({ step }: { step: Step<BfsState> }) {
  const { dist, seen, queue, current, examiningEdge, accepted, done, verdict } = step.state

  const nodeClass = (n: NodeId) => {
    let cls = 'node'
    if (verdict && (n === 'B' || n === 'D' || n === 'F')) cls += ' warm'
    else if (n === current) cls += ' active'
    else if (examiningEdge && examiningEdge[1] === n) cls += accepted ? ' active' : ' warm'
    else if (seen.includes(n)) cls += ' done'
    return cls
  }

  const edgeClass = (u: NodeId, v: NodeId) => {
    if (!examiningEdge) return 'edge'
    const matches =
      (examiningEdge[0] === u && examiningEdge[1] === v) ||
      (examiningEdge[0] === v && examiningEdge[1] === u)
    if (!matches) return 'edge'
    return `edge${accepted ? ' hot' : ' warm'}`
  }

  const caption = verdict
    ? `BFS done · B=4✗ (true=3) · D=9✗ (true=8) · F=15✗ (true=10)`
    : current
      ? `processing ${current} · queue=[${queue.join(', ')}]`
      : `source=${SOURCE} · queue=[${queue.join(', ')}]`

  return (
    <>
      <div className="viz-caption">{caption}</div>
      <svg
        className="viz-svg"
        viewBox="0 0 460 260"
        width={460}
        height={260}
        role="img"
        aria-label="Weighted graph"
      >
        {EDGES.map(([u, v, w]) => {
          const p = POS[u]
          const q = POS[v]
          const mx = (p.x + q.x) / 2
          const my = (p.y + q.y) / 2
          const len = Math.hypot(q.x - p.x, q.y - p.y)
          const ox = (-(q.y - p.y) / len) * 12
          const oy = ((q.x - p.x) / len) * 12
          return (
            <g key={`${u}-${v}`}>
              <line className={edgeClass(u, v)} x1={p.x} y1={p.y} x2={q.x} y2={q.y} />
              <text
                x={mx + ox}
                y={my + oy}
                textAnchor="middle"
                dominantBaseline="central"
                style={{
                  fill: 'var(--muted)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {w}
              </text>
            </g>
          )
        })}
        {NODES.map((n) => (
          <g key={n}>
            <circle className={nodeClass(n)} cx={POS[n].x} cy={POS[n].y} r={20} />
            <text
              x={POS[n].x}
              y={POS[n].y}
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                fill: 'var(--ink)',
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {n}
            </text>
          </g>
        ))}
      </svg>
      <div className="cells spaced">
        {NODES.map((n) => {
          const val = (dist as Record<string, number>)[n]
          let cls = 'cell'
          if (verdict && (n === 'B' || n === 'D' || n === 'F')) cls += ' warm'
          else if (done || seen.includes(n)) cls += ' done'
          else if (val === Infinity) cls += ' dim'
          return (
            <div key={n} className={cls}>
              <span className="idx">{n}</span>
              {fmt(val)}
              {verdict && n === 'B' && <span className="ptr amber">▲ WRONG (true=3)</span>}
              {verdict && n === 'D' && <span className="ptr amber">▲ WRONG (true=8)</span>}
              {verdict && n === 'F' && <span className="ptr amber">▲ WRONG (true=10)</span>}
            </div>
          )
        })}
      </div>
      <div className="legend">
        <span className="key"><span className="swatch mint" /> current / newly stamped</span>
        <span className="key"><span className="swatch" /> already locked</span>
        <span className="key"><span className="swatch amber" /> wrong answer (verdict)</span>
      </div>
    </>
  )
}

export const hopsDemo: AttemptDemo<BfsState> = { generateSteps: bfsSteps, Visualizer: BfsViz }

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 3 — Attempt 2: Greedy walk — always take the cheapest road out (verdict: fail)
   Trace: A→C(2)→B(3)→D(8)→E(10)→F(13).
   Counterexample: reaches E at cost 10, but A→C→E = 7 (snubbed at C).
   Total steps: 12 (intro + 5×2 for each move: consider + commit + verdict).

   codeLine indexes journey[1].pseudocode:
     0: 'at ← A; cost ← 0; visited ← {A}'
     1: 'while some road leaves `at` to an unvisited town:'
     2: '    pick the cheapest such road at–v (toll w)'
     3: '    cost ← cost + w; dist[v] ← cost'
     4: '    at ← v; add v to visited'
─────────────────────────────────────────────────────────────────────────────── */

interface GreedyWalkState {
  cur: NodeId
  totalCost: number
  visited: NodeId[]
  dist: Record<NodeId, number>
  examiningEdge: [NodeId, NodeId] | null
  pickedEdge: [NodeId, NodeId] | null
  done: boolean
  verdict: boolean
}

function greedyWalkSteps(): Step<GreedyWalkState>[] {
  const steps: Step<GreedyWalkState>[] = []
  let cur: NodeId = SOURCE
  let totalCost = 0
  const visited: NodeId[] = [SOURCE]
  const dist: Record<NodeId, number> = { A: 0, B: Infinity, C: Infinity, D: Infinity, E: Infinity, F: Infinity }

  const snap = (partial: Partial<GreedyWalkState>): GreedyWalkState => ({
    cur,
    totalCost,
    visited: [...visited],
    dist: { ...dist },
    examiningEdge: null,
    pickedEdge: null,
    done: false,
    verdict: false,
    ...partial,
  })

  steps.push({
    state: snap({}),
    description: `Greedy walk: stand at ${SOURCE}, always take the cheapest unvisited road available. Record each town's toll as we arrive. Start at ${SOURCE} with accumulated cost 0.`,
    codeLine: 0,
  })

  while (true) {
    const roads = neighborsOf(cur).filter(({ v }) => !visited.includes(v))
    if (roads.length === 0) break
    roads.sort((a, b) => a.w - b.w)

    const opts = roads.map(({ v, w }) => `${cur}–${v}(${w})`).join(', ')
    const { v: nxt, w } = roads[0]

    // Show the snub at C explicitly
    const snubMsg =
      cur === 'C'
        ? ` The walker snubs C–E (toll 5) — that snub will cost us: E's true cheapest is A→C→E = 7.`
        : ''

    steps.push({
      state: snap({ examiningEdge: [cur, nxt] }),
      description: `At ${cur} (cost ${totalCost}). Options: ${opts}. Cheapest is ${cur}–${nxt} (toll ${w}) — commit.${snubMsg}`,
      codeLine: 2,
    })

    const prev = cur
    totalCost += w
    visited.push(nxt)
    ;(dist as Record<string, number>)[nxt] = totalCost
    cur = nxt

    steps.push({
      state: snap({ pickedEdge: [prev, cur] }),
      description: `Arrived at ${cur}. Accumulated toll: ${totalCost}. Stamped dist[${cur}]=${totalCost}. The walker never doubles back.`,
      codeLine: 3,
    })
  }

  // Verdict
  steps.push({
    state: snap({ done: true, verdict: true }),
    description: `Walk complete: A=0, C=2, B=3, D=8, E=10, F=13. E's true cheapest is 7 — the direct A→C→E = 2+5 was snubbed at C in favour of the cheaper single road C–B (toll 1). Optimising each step lost the better total: E is stamped at 10 instead of 7, and F at 13 instead of 10.`,
    codeLine: -1,
  })

  return steps
}

function GreedyWalkViz({ step }: { step: Step<GreedyWalkState> }) {
  const { cur, visited, dist, examiningEdge, pickedEdge, done, verdict } = step.state

  const activeEdge = pickedEdge ?? examiningEdge

  const nodeClass = (n: NodeId) => {
    let cls = 'node'
    if (verdict && (n === 'E' || n === 'F')) cls += ' warm'
    else if (n === cur && !done) cls += ' active'
    else if (visited.includes(n)) cls += ' done'
    return cls
  }

  const edgeClass = (u: NodeId, v: NodeId) => {
    if (!activeEdge) return 'edge'
    const matches =
      (activeEdge[0] === u && activeEdge[1] === v) ||
      (activeEdge[0] === v && activeEdge[1] === u)
    if (!matches) return 'edge'
    return `edge${pickedEdge ? ' hot' : ' warm'}`
  }

  const caption = verdict
    ? `walk complete · E=10✗ (true=7) · F=13✗ (true=10)`
    : `at ${cur} · total toll ${step.state.totalCost}`

  return (
    <>
      <div className="viz-caption">{caption}</div>
      <svg
        className="viz-svg"
        viewBox="0 0 460 260"
        width={460}
        height={260}
        role="img"
        aria-label="Weighted graph"
      >
        {EDGES.map(([u, v, w]) => {
          const p = POS[u]
          const q = POS[v]
          const mx = (p.x + q.x) / 2
          const my = (p.y + q.y) / 2
          const len = Math.hypot(q.x - p.x, q.y - p.y)
          const ox = (-(q.y - p.y) / len) * 12
          const oy = ((q.x - p.x) / len) * 12
          return (
            <g key={`${u}-${v}`}>
              <line className={edgeClass(u, v)} x1={p.x} y1={p.y} x2={q.x} y2={q.y} />
              <text
                x={mx + ox}
                y={my + oy}
                textAnchor="middle"
                dominantBaseline="central"
                style={{
                  fill: 'var(--muted)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {w}
              </text>
            </g>
          )
        })}
        {NODES.map((n) => (
          <g key={n}>
            <circle className={nodeClass(n)} cx={POS[n].x} cy={POS[n].y} r={20} />
            <text
              x={POS[n].x}
              y={POS[n].y}
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                fill: 'var(--ink)',
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {n}
            </text>
          </g>
        ))}
      </svg>
      <div className="cells spaced">
        {NODES.map((n) => {
          const val = (dist as Record<string, number>)[n]
          let cls = 'cell'
          if (verdict && (n === 'E' || n === 'F')) cls += ' warm'
          else if (done || (visited.includes(n) && val !== Infinity)) cls += ' done'
          else if (val === Infinity) cls += ' dim'
          return (
            <div key={n} className={cls}>
              <span className="idx">{n}</span>
              {fmt(val)}
              {verdict && n === 'E' && <span className="ptr amber">▲ WRONG (true=7)</span>}
              {verdict && n === 'F' && <span className="ptr amber">▲ WRONG (true=10)</span>}
            </div>
          )
        })}
      </div>
      <div className="legend">
        <span className="key"><span className="swatch mint" /> walker's current town</span>
        <span className="key"><span className="swatch" /> already visited</span>
        <span className="key"><span className="swatch amber" /> wrong answer (verdict)</span>
      </div>
    </>
  )
}

export const greedyWalkDemo: AttemptDemo<GreedyWalkState> = { generateSteps: greedyWalkSteps, Visualizer: GreedyWalkViz }

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 4 — Attempt 3: Relax with a plain queue (verdict: partial)
   Simulation: 9 pops, 27 edge checks. B, D, F each processed twice.
   Dijkstra: 6 pops, 9 edge relaxations.
   Steps: intro + 9 pop steps + up to 15 relax steps (selected improvements +
   key no-improvements) + verdict = ~25.

   codeLine indexes journey[2].pseudocode:
     0: 'dist[A] ← 0; dist[v] ← ∞ for all others; queue ← {A}'
     1: 'while queue not empty:'
     2: '    u ← dequeue front  (arrival order — no priority)'
     3: '    for each road u–v with toll w:'
     4: '        if dist[u] + w < dist[v]:'
     5: '            dist[v] ← dist[u] + w; enqueue v'
─────────────────────────────────────────────────────────────────────────────── */

interface PlainQueueState {
  dist: Record<NodeId, number>
  queue: NodeId[]
  current: NodeId | null
  relaxEdge: [NodeId, NodeId] | null
  improved: boolean | null
  flashNode: NodeId | null
  pops: number
  relaxChecks: number
  done: boolean
}

function plainQueueSteps(): Step<PlainQueueState>[] {
  const steps: Step<PlainQueueState>[] = []
  const Inf = Infinity
  const dist: Record<NodeId, number> = { A: 0, B: Inf, C: Inf, D: Inf, E: Inf, F: Inf }
  const queue: NodeId[] = ['A']
  let pops = 0
  let relaxChecks = 0

  const snap = (partial: Partial<PlainQueueState>): PlainQueueState => ({
    dist: { ...dist },
    queue: [...queue],
    current: null,
    relaxEdge: null,
    improved: null,
    flashNode: null,
    pops,
    relaxChecks,
    done: false,
    ...partial,
  })

  steps.push({
    state: snap({}),
    description: `Plain-queue relaxation: like BFS but allow re-queuing when a shorter route is found. Any improvement re-queues the node so the saving propagates. Start: dist[A]=0, queue=[A].`,
    codeLine: 0,
  })

  while (queue.length > 0) {
    const u = queue.shift()!
    pops++

    const isDuplicate = ['B', 'D', 'F'].includes(u) && pops > 3
    steps.push({
      state: snap({ current: u }),
      description: `Pop #${pops}: dequeue ${u} at dist[${u}]=${dist[u]}.${isDuplicate ? ` (Second pass — ${u} was already processed at a stale cost; this is the redundant work a priority queue would eliminate.)` : ''}`,
      codeLine: 2,
    })

    for (const { v, w } of neighborsOf(u)) {
      const candidate = (dist as Record<string, number>)[u] + w
      relaxChecks++
      const old = (dist as Record<string, number>)[v]
      if (candidate < old) {
        ;(dist as Record<string, number>)[v] = candidate
        queue.push(v)
        steps.push({
          state: snap({ current: u, relaxEdge: [u, v], improved: true, flashNode: v }),
          description: `  Check #${relaxChecks}: ${u}–${v} (toll ${w}): ${candidate} < ${fmt(old)} — improve dist[${v}] to ${candidate}, re-queue ${v}.`,
          codeLine: 5,
        })
      } else {
        // Only show a no-improvement step when it's instructive (second pass wasted work)
        if (isDuplicate) {
          steps.push({
            state: snap({ current: u, relaxEdge: [u, v], improved: false }),
            description: `  Check #${relaxChecks}: ${u}–${v} (toll ${w}): ${candidate} ≥ ${fmt(old)} — no improvement. Wasted work: this check existed only because ${u} was popped with a stale distance.`,
            codeLine: 4,
          })
        }
      }
    }
  }

  steps.push({
    state: snap({ done: true }),
    description: `Plain queue gets every answer right: A=0, B=3, C=2, D=8, E=7, F=10. But it took ${pops} pops and ${relaxChecks} edge checks. B, D, and F were processed twice — once at stale costs (B=4, D=9, F=15), then again after being improved. Dijkstra needs only 6 pops and 9 edge checks by always popping the closest unsettled town first; with that ordering a town's distance is final on first pop.`,
    codeLine: -1,
  })

  return steps
}

function PlainQueueViz({ step }: { step: Step<PlainQueueState> }) {
  const { dist, queue, current, relaxEdge, improved, flashNode, pops, relaxChecks, done } = step.state

  return (
    <GraphRenderer
      caption={
        done
          ? `done · ${pops} pops · ${relaxChecks} edge checks · Dijkstra: 6 pops + 9 checks`
          : current
            ? `pop #${pops} · processing ${current} · queue=[${queue.join(', ')}]`
            : `queue=[${queue.join(', ')}] · pops so far: ${pops}`
      }
      dist={dist}
      activeNode={current}
      settledNodes={done ? (NODES as unknown as NodeId[]) : []}
      relaxEdge={relaxEdge}
      edgeImproved={improved}
      flashNode={flashNode}
      done={done}
      legend={[
        { tone: 'mint', label: 'current / improved' },
        { tone: 'amber', label: 'edge being relaxed' },
        { label: 'queued or unreached' },
      ]}
    />
  )
}

export const plainQueueDemo: AttemptDemo<PlainQueueState> = { generateSteps: plainQueueSteps, Visualizer: PlainQueueViz }
