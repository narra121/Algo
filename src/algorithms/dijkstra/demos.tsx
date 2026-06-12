import type { AttemptDemo, Step, VarEntry } from '../../core/types'
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
   42 non-trivial simple paths; 13 end at F. Every single one is walked.
   Total steps: 44 (intro + 42 paths + verdict).

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

/** Toll on the road u–v (graph is undirected). */
function edgeWeight(u: NodeId, v: NodeId): number {
  for (const [a, b, w] of EDGES) {
    if ((a === u && b === v) || (a === v && b === u)) return w
  }
  return 0
}

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

  const runBest: Record<NodeId, number> = { A: 0, B: Infinity, C: Infinity, D: Infinity, E: Infinity, F: Infinity }

  const bestStr = () =>
    `{${NODES.map((n) => `${n}:${fmt((runBest as Record<string, number>)[n])}`).join(', ')}}`

  /** Same four variables, same order, every step; `changed` lists names this step assigned. */
  const makeVars = (o: { path?: NodeId[]; cost?: number; walked: number; changed?: string[] }): VarEntry[] => {
    const ch = new Set(o.changed ?? [])
    return [
      { name: 'path', value: o.path && o.path.length > 0 ? o.path.join('→') : '—', changed: ch.has('path') },
      { name: 'cost', value: o.cost != null ? String(o.cost) : '—', changed: ch.has('cost') },
      { name: 'best', value: bestStr(), changed: ch.has('best') },
      { name: 'paths walked', value: String(o.walked), changed: ch.has('paths walked') },
    ]
  }

  const allPaths = collectAllPaths()
  const nonTrivial = allPaths.filter(p => p.path.length > 1)
  const pathsToF = nonTrivial.filter(p => p.path[p.path.length - 1] === 'F').length

  // Intro
  steps.push({
    state: {
      best: { ...runBest },
      currentPath: [],
      currentCost: 0,
      pathsExplored: 0,
      done: false,
    },
    description: `Brute force: walk every simple path from ${SOURCE} and track a running best cost per destination. This tiny 6-node graph hides ${nonTrivial.length} simple paths — ${pathsToF} different routes to F alone. Initialise best[${SOURCE}]=0, all others ∞. Begin the recursive walk.`,
    codeLine: 0,
    vars: makeVars({ walked: 0, changed: ['best'] }),
  })

  let prevPath: NodeId[] = []
  for (let i = 0; i < nonTrivial.length; i++) {
    const { path, cost } = nonTrivial[i]
    const dest = path[path.length - 1]
    const old = (runBest as Record<string, number>)[dest]
    const improved = cost < old
    if (improved) (runBest as Record<string, number>)[dest] = cost

    // Real toll arithmetic for THIS path, e.g. "2+1+5 = 8".
    const tolls = path.slice(1).map((n, k) => edgeWeight(path[k], n))
    const arith = tolls.length > 1 ? `${tolls.join('+')} = ${cost}` : `${cost}`

    // How much of this path is a re-priced copy of the previous one.
    let shared = 0
    while (shared < path.length && shared < prevPath.length && path[shared] === prevPath[shared]) shared++
    let prefixNote = ''
    if (shared >= 2) {
      const prefixCost = tolls.slice(0, shared - 1).reduce((a, b) => a + b, 0)
      prefixNote = ` The prefix ${path.slice(0, shared).join('→')} (toll ${prefixCost}) was just re-summed from scratch — the same roads priced yet again.`
    }
    prevPath = path

    steps.push({
      state: {
        best: { ...runBest },
        currentPath: path,
        currentCost: cost,
        pathsExplored: i + 1,
        done: false,
      },
      description:
        `Path ${i + 1} of ${nonTrivial.length}: ${path.join(' → ')} (toll ${arith}). ${
          improved
            ? `New best for ${dest}: ${fmt(old)} → ${cost}.`
            : `best[${dest}] stays ${fmt(old)} — ${cost} is not cheaper.`
        }${prefixNote}`,
      codeLine: improved ? 2 : 3,
      vars: makeVars({
        path,
        cost,
        walked: i + 1,
        changed: improved ? ['path', 'cost', 'best', 'paths walked'] : ['path', 'cost', 'paths walked'],
      }),
    })
  }

  // Verdict step — real totals, AFTER every path was actually shown.
  steps.push({
    state: {
      best: { ...runBest },
      currentPath: ['A', 'C', 'E', 'F'],
      currentCost: 10,
      pathsExplored: nonTrivial.length,
      done: true,
    },
    description: `Done — all ${nonTrivial.length} simple paths walked to the end. True shortest costs: ${NODES.map((n) => `${n}=${fmt((runBest as Record<string, number>)[n])}`).join(', ')}. Best route to F: A→C→E→F at cost 10 — confirmed only after grinding through all ${pathsToF} routes to F; Dijkstra answers with 6 pops and 9 edge checks, never re-walking a path.`,
    codeLine: 6,
    vars: makeVars({ path: ['A', 'C', 'E', 'F'], cost: 10, walked: nonTrivial.length }),
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
   Full trace — every pop and every one of the 18 edge checks is shown.
   Total steps: 26 (intro + 6 pops + 18 edge checks + verdict).

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

  const distStr = () => `{${NODES.map((n) => `${n}:${fmt((dist as Record<string, number>)[n])}`).join(', ')}}`
  const seenStr = () => `{${seen.join(', ')}}`
  const queueStr = () => `[${queue.join(', ')}]`

  /** Same six variables, same order, every step; `changed` lists names this step assigned. */
  const makeVars = (o: { u?: NodeId | null; edge?: readonly [NodeId, NodeId] | null; w?: number | null; changed?: string[] }): VarEntry[] => {
    const ch = new Set(o.changed ?? [])
    return [
      { name: 'u', value: o.u ?? '—', changed: ch.has('u') },
      { name: 'dist', value: distStr(), changed: ch.has('dist') },
      { name: 'seen', value: seenStr(), changed: ch.has('seen') },
      { name: 'queue', value: queueStr(), changed: ch.has('queue') },
      { name: '(u, v)', value: o.edge ? `${o.edge[0]}–${o.edge[1]}` : '—', changed: ch.has('(u, v)') },
      { name: 'w', value: o.w != null ? String(o.w) : '—', changed: ch.has('w') },
    ]
  }

  // Intro
  steps.push({
    state: snap({}),
    description: `BFS explores towns one hop at a time and stamps each town on first arrival — permanently. That works perfectly when every road has the same toll. Here it does not. Initialise dist[A]=0, queue=[A].`,
    codeLine: 0,
    vars: makeVars({ changed: ['dist', 'seen', 'queue'] }),
  })

  // Full BFS trace: a pop step for each node, then one step per edge check —
  // every stamp AND every already-seen rejection, with real values.
  while (queue.length > 0) {
    const u = queue.shift()!

    steps.push({
      state: snap({ current: u }),
      description: `Dequeue ${u} (dist[${u}]=${dist[u]}). Check each of its ${neighborsOf(u).length} roads in turn.`,
      codeLine: 2,
      vars: makeVars({ u, changed: ['u', 'queue'] }),
    })

    for (const { v, w } of neighborsOf(u)) {
      const candidate = (dist as Record<string, number>)[u] + w
      if (!seen.includes(v)) {
        ;(dist as Record<string, number>)[v] = candidate
        seen.push(v)
        queue.push(v)
        steps.push({
          state: snap({ current: u, examiningEdge: [u, v], accepted: true }),
          description: `${u}–${v} (toll ${w}): ${v} never seen — stamp dist[${v}] = ${dist[u]} + ${w} = ${candidate} and enqueue. First arrival is final; ${v} will never be revisited${candidate === 9 && v === 'D' ? ' — even though A→C→B→D = 8 is cheaper' : ''}.`,
          codeLine: 4,
          vars: makeVars({ u, edge: [u, v], w, changed: ['dist', 'seen', 'queue', '(u, v)', 'w'] }),
        })
      } else {
        const isCheaper = candidate < (dist as Record<string, number>)[v]
        steps.push({
          state: snap({ current: u, examiningEdge: [u, v], accepted: false }),
          description: `${u}–${v} (toll ${w}): ${v} already seen at dist[${v}]=${(dist as Record<string, number>)[v]}. BFS ignores it — ${isCheaper ? `even though ${dist[u]} + ${w} = ${candidate} would be CHEAPER than ${(dist as Record<string, number>)[v]}. This is exactly where BFS goes wrong.` : `${candidate} is no cheaper, so nothing is lost on this particular road.`}`,
          codeLine: 4,
          vars: makeVars({ u, edge: [u, v], w, changed: ['(u, v)', 'w'] }),
        })
      }
    }
  }

  // Verdict
  steps.push({
    state: snap({ done: true, verdict: true }),
    description: `BFS result: A=0, B=4, C=2, D=9, E=7, F=15. Correct distances: B=3, D=8, F=10. BFS stamped B=4 via one-hop A–B and locked it — it missed the cheaper two-hop A→C→B = 2+1 = 3. D inherited stale B: 4+5=9 instead of 3+5=8. F followed: 9+6=15 instead of 10. On a weighted map, fewer roads is not cheaper roads.`,
    codeLine: -1,
    vars: makeVars({}),
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

  const distStr = () => `{${NODES.map((n) => `${n}:${fmt((dist as Record<string, number>)[n])}`).join(', ')}}`
  const visitedStr = () => `{${visited.join(', ')}}`

  /** Same six variables, same order, every step; `changed` lists names this step assigned. */
  const makeVars = (o: { road?: readonly [NodeId, NodeId] | null; w?: number | null; changed?: string[] }): VarEntry[] => {
    const ch = new Set(o.changed ?? [])
    return [
      { name: 'at', value: cur, changed: ch.has('at') },
      { name: 'cost', value: String(totalCost), changed: ch.has('cost') },
      { name: 'visited', value: visitedStr(), changed: ch.has('visited') },
      { name: 'dist', value: distStr(), changed: ch.has('dist') },
      { name: 'road', value: o.road ? `${o.road[0]}–${o.road[1]}` : '—', changed: ch.has('road') },
      { name: 'w', value: o.w != null ? String(o.w) : '—', changed: ch.has('w') },
    ]
  }

  steps.push({
    state: snap({}),
    description: `Greedy walk: stand at ${SOURCE}, always take the cheapest unvisited road available. Record each town's toll as we arrive. Start at ${SOURCE} with accumulated cost 0.`,
    codeLine: 0,
    vars: makeVars({ changed: ['at', 'cost', 'visited', 'dist'] }),
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
      vars: makeVars({ road: [cur, nxt], w, changed: ['road', 'w'] }),
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
      vars: makeVars({ road: [prev, cur], w, changed: ['at', 'cost', 'visited', 'dist'] }),
    })
  }

  // Verdict
  steps.push({
    state: snap({ done: true, verdict: true }),
    description: `Walk complete: A=0, C=2, B=3, D=8, E=10, F=13. E's true cheapest is 7 — the direct A→C→E = 2+5 was snubbed at C in favour of the cheaper single road C–B (toll 1). Optimising each step lost the better total: E is stamped at 10 instead of 7, and F at 13 instead of 10.`,
    codeLine: -1,
    vars: makeVars({}),
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
   Full trace — every pop and every one of the 27 edge checks is shown.
   Steps: intro + 9 pop steps + 27 relax steps + verdict = 38.

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
  // Honest per-node tracking: a pop is a duplicate only when processCount[u] > 1
  const processCount: Partial<Record<NodeId, number>> = {}

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

  const distStr = () => `{${NODES.map((n) => `${n}:${fmt((dist as Record<string, number>)[n])}`).join(', ')}}`
  const queueStr = () => `[${queue.join(', ')}]`

  /** Same seven variables, same order, every step; `changed` lists names this step assigned. */
  const makeVars = (o: { u?: NodeId | null; edge?: readonly [NodeId, NodeId] | null; w?: number | null; changed?: string[] }): VarEntry[] => {
    const ch = new Set(o.changed ?? [])
    return [
      { name: 'u', value: o.u ?? '—', changed: ch.has('u') },
      { name: 'dist', value: distStr(), changed: ch.has('dist') },
      { name: 'queue', value: queueStr(), changed: ch.has('queue') },
      { name: '(u, v)', value: o.edge ? `${o.edge[0]}–${o.edge[1]}` : '—', changed: ch.has('(u, v)') },
      { name: 'w', value: o.w != null ? String(o.w) : '—', changed: ch.has('w') },
      { name: 'pops', value: String(pops), changed: ch.has('pops') },
      { name: 'checks', value: String(relaxChecks), changed: ch.has('checks') },
    ]
  }

  steps.push({
    state: snap({}),
    description: `Plain-queue relaxation: like BFS but allow re-queuing when a shorter route is found. Any improvement re-queues the node so the saving propagates. Start: dist[A]=0, queue=[A].`,
    codeLine: 0,
    vars: makeVars({ changed: ['dist', 'queue'] }),
  })

  while (queue.length > 0) {
    const u = queue.shift()!
    pops++
    processCount[u] = (processCount[u] ?? 0) + 1
    const isDuplicate = processCount[u]! > 1

    steps.push({
      state: snap({ current: u }),
      description: isDuplicate
        ? `Pop #${pops}: dequeue ${u} again, now at dist[${u}]=${dist[u]}. Second pass — ${u} was first processed at a stale cost, so every one of its roads must be re-checked; this is the redundant work a priority queue would eliminate.`
        : `Pop #${pops}: dequeue ${u} at dist[${u}]=${dist[u]}. Relax each of its ${neighborsOf(u).length} roads in turn.`,
      codeLine: 2,
      vars: makeVars({ u, changed: ['u', 'queue', 'pops'] }),
    })

    // One honest step per edge check — improvements AND no-improvements alike.
    for (const { v, w } of neighborsOf(u)) {
      relaxChecks++
      const candidate = (dist as Record<string, number>)[u] + w
      const old = (dist as Record<string, number>)[v]
      if (candidate < old) {
        ;(dist as Record<string, number>)[v] = candidate
        queue.push(v)
        steps.push({
          state: snap({ current: u, relaxEdge: [u, v], improved: true, flashNode: v }),
          description: `Check #${relaxChecks}: ${u}–${v} (toll ${w}). ${dist[u]} + ${w} = ${candidate} < ${fmt(old)} — improve dist[${v}] to ${candidate} and re-queue ${v} so the saving propagates.`,
          codeLine: 5,
          vars: makeVars({ u, edge: [u, v], w, changed: ['dist', 'queue', '(u, v)', 'w', 'checks'] }),
        })
      } else {
        steps.push({
          state: snap({ current: u, relaxEdge: [u, v], improved: false }),
          description: `Check #${relaxChecks}: ${u}–${v} (toll ${w}). ${dist[u]} + ${w} = ${candidate} ≥ ${fmt(old)} — no improvement; dist[${v}] stays ${fmt(old)}.${isDuplicate ? ` A wasted re-check: it only exists because ${u} was re-queued after its first, stale pass.` : ''}`,
          codeLine: 4,
          vars: makeVars({ u, edge: [u, v], w, changed: ['(u, v)', 'w', 'checks'] }),
        })
      }
    }
  }

  steps.push({
    state: snap({ done: true }),
    description: `Plain queue gets every answer right: A=0, B=3, C=2, D=8, E=7, F=10. But it took ${pops} pops and ${relaxChecks} edge checks. B, D, and F were each processed twice — once at stale costs (B=4, D=9, F=15), then again after being improved. Dijkstra needs only 6 pops and 9 edge checks by always popping the closest unsettled town first; with that ordering a town's distance is final on first pop.`,
    codeLine: -1,
    vars: makeVars({}),
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
        { tone: 'mint', label: 'current / relaxation improves a distance' },
        { tone: 'amber', label: 're-check finds no improvement' },
        { label: 'queued or unreached' },
      ]}
    />
  )
}

export const plainQueueDemo: AttemptDemo<PlainQueueState> = { generateSteps: plainQueueSteps, Visualizer: PlainQueueViz }
