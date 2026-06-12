import type { AlgorithmModule, Step, VarEntry } from '../../core/types'
import { NODES, EDGES, POS, SOURCE, neighborsOf } from './data'
import type { NodeId } from './data'
import { naiveDemo, hopsDemo, greedyWalkDemo, plainQueueDemo } from './demos'

/* Canonical example: single-source shortest paths from A in a 6-node weighted graph. */

interface DijkstraState {
  /** Best-known distance from A to every node (Infinity = unreached). */
  dist: Record<NodeId, number>
  /** Nodes whose distance is final. */
  settled: NodeId[]
  /** Node currently popped from the priority queue. */
  current: NodeId | null
  /** Edge being relaxed right now, as [from, to]. */
  relaxEdge: [NodeId, NodeId] | null
  /** Whether the relaxation just improved the target's distance. */
  improved: boolean | null
  /** Node whose distance cell just changed (flashes). */
  flash: NodeId | null
  done: boolean
}

const fmt = (n: number) => (n === Infinity ? '∞' : String(n))

function generateSteps(): Step<DijkstraState>[] {
  const steps: Step<DijkstraState>[] = []
  const dist: Record<NodeId, number> = { A: Infinity, B: Infinity, C: Infinity, D: Infinity, E: Infinity, F: Infinity }
  const settled: NodeId[] = []
  dist[SOURCE] = 0

  const snap = (partial: Partial<DijkstraState>): DijkstraState => ({
    dist: { ...dist },
    settled: [...settled],
    current: null,
    relaxEdge: null,
    improved: null,
    flash: null,
    done: false,
    ...partial,
  })

  /** dist as a readable map, e.g. "{A:0, B:4, C:∞, …}". */
  const distStr = () => `{${NODES.map((n) => `${n}:${fmt(dist[n])}`).join(', ')}}`
  /** Settled set in settle order, e.g. "{A, C, B}". */
  const settledStr = () => (settled.length ? `{${settled.join(', ')}}` : '{}')
  /** PQ = unsettled discovered nodes keyed by tentative dist, cheapest first. */
  const pqStr = () => {
    const entries = NODES.filter((n) => !settled.includes(n) && dist[n] < Infinity)
      .slice()
      .sort((a, b) => dist[a] - dist[b] || a.localeCompare(b))
      .map((n) => `(${n},${dist[n]})`)
    return `[${entries.join(', ')}]`
  }

  /** Same six variables, same order, on every step; `changed` lists the names this step assigned. */
  const makeVars = (opts: { u?: NodeId | null; edge?: readonly [NodeId, NodeId] | null; w?: number | null; changed?: string[] }): VarEntry[] => {
    const ch = new Set(opts.changed ?? [])
    return [
      { name: 'u', value: opts.u ?? '—', changed: ch.has('u') },
      { name: 'dist', value: distStr(), changed: ch.has('dist') },
      { name: 'settled', value: settledStr(), changed: ch.has('settled') },
      { name: 'PQ', value: pqStr(), changed: ch.has('PQ') },
      { name: '(u, v)', value: opts.edge ? `${opts.edge[0]}–${opts.edge[1]}` : '—', changed: ch.has('(u, v)') },
      { name: 'w', value: opts.w != null ? String(opts.w) : '—', changed: ch.has('w') },
    ]
  }

  steps.push({
    state: snap({}),
    description: `Goal: find the cheapest path cost from ${SOURCE} to ALL ${NODES.length} nodes of this weighted graph. Start at ${SOURCE}: its distance is 0 (we are already there). Every other node gets ∞ — we have no idea how to reach them yet. The priority queue holds just (${SOURCE}, 0).`,
    codeLine: 0,
    vars: makeVars({ changed: ['dist', 'PQ'] }),
  })

  while (settled.length < NODES.length) {
    // Pop the closest unsettled node (deterministic: ties broken by node order).
    let u: NodeId | null = null
    for (const n of NODES) {
      if (!settled.includes(n) && dist[n] < Infinity && (u === null || dist[n] < dist[u])) u = n
    }
    if (u === null) break
    const runnersUp = NODES.filter((n) => !settled.includes(n) && n !== u && dist[n] < Infinity)
      .map((n) => `${n}=${dist[n]}`)
      .join(', ')

    settled.push(u)
    const fresh = neighborsOf(u).filter(({ v }) => !settled.includes(v))

    if (u === SOURCE) {
      steps.push({
        state: snap({ current: u }),
        description: `Pop ${u} at distance 0 — trivially the closest node — and settle it. Settled means LOCKED: with no negative weights, no future discovery can ever beat 0.`,
        codeLine: 2,
        vars: makeVars({ u, changed: ['u', 'settled', 'PQ'] }),
      })
    } else if (fresh.length === 0) {
      steps.push({
        state: snap({ current: u }),
        description: `Pop ${u} at distance ${dist[u]} and settle it — the last node. All its neighbors are already settled, so there is nothing left to relax.`,
        codeLine: 2,
        vars: makeVars({ u, changed: ['u', 'settled', 'PQ'] }),
      })
    } else {
      steps.push({
        state: snap({ current: u }),
        description: `The closest unsettled node is ${u} at distance ${dist[u]}${runnersUp ? ` (beats ${runnersUp})` : ''}. Settle it: any other route to ${u} would detour through a node at least ${dist[u]} away, then add non-negative weight — it cannot win.`,
        codeLine: 2,
        vars: makeVars({ u, changed: ['u', 'settled', 'PQ'] }),
      })
    }

    for (const { v, w } of fresh) {
      const candidate = dist[u] + w
      if (candidate < dist[v]) {
        const old = dist[v]
        dist[v] = candidate
        steps.push({
          state: snap({ current: u, relaxEdge: [u, v], improved: true, flash: v }),
          description: `Relax ${u}–${v} (weight ${w}). Via ${u}: ${candidate - w} + ${w} = ${candidate} < ${fmt(old)} — improve ${v}! The cheapest known route to ${v} now runs through ${u}.`,
          codeLine: 6,
          vars: makeVars({ u, edge: [u, v], w, changed: ['(u, v)', 'w', 'dist', 'PQ'] }),
        })
      } else {
        steps.push({
          state: snap({ current: u, relaxEdge: [u, v], improved: false }),
          description: `Relax ${u}–${v} (weight ${w}). Via ${u}: ${dist[u]} + ${w} = ${candidate} ≥ ${fmt(dist[v])} — no improvement. ${v} already has a cheaper route; keep ${fmt(dist[v])}.`,
          codeLine: 5,
          vars: makeVars({ u, edge: [u, v], w, changed: ['(u, v)', 'w'] }),
        })
      }
    }
  }

  steps.push({
    state: snap({ done: true }),
    description: `All ${NODES.length} nodes settled. Final shortest distances from ${SOURCE}: ${NODES.map((n) => `${n}=${dist[n]}`).join(', ')}. Total work: ${NODES.length} pops and ${EDGES.length} edge relaxations — instead of enumerating all 42 simple paths from ${SOURCE} (13 to F alone). Each node was locked exactly once, in increasing order of distance — like ripples spreading outward.`,
    codeLine: 7,
    vars: makeVars({}),
  })

  return steps
}

function Visualizer({ step }: { step: Step<DijkstraState> }) {
  const { dist, settled, current, relaxEdge, improved, flash, done } = step.state

  const nodeClass = (n: NodeId) => {
    let cls = 'node'
    if (n === current) cls += ' active'
    else if (relaxEdge && relaxEdge[1] === n) cls += ' warm'
    else if (settled.includes(n)) cls += ' done'
    return cls
  }

  const edgeClass = (u: NodeId, v: NodeId) => {
    let cls = 'edge'
    if (relaxEdge && ((relaxEdge[0] === u && relaxEdge[1] === v) || (relaxEdge[0] === v && relaxEdge[1] === u))) {
      cls += improved ? ' hot' : ' warm'
    }
    return cls
  }

  return (
    <>
      <div className="viz-caption">
        source = {SOURCE}
        {current && ` · processing ${current}`}
        {relaxEdge && ` · relaxing ${relaxEdge[0]}–${relaxEdge[1]}`}
        {done && ' · all settled'}
      </div>
      <svg className="viz-svg" viewBox="0 0 460 260" width={460} height={260} role="img" aria-label="Weighted graph">
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
                style={{ fill: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}
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
              style={{ fill: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700 }}
            >
              {n}
            </text>
          </g>
        ))}
      </svg>
      <div className="cells spaced">
        {NODES.map((n) => {
          let cls = 'cell'
          if (flash === n) cls += ' active'
          else if (done || settled.includes(n)) cls += ' done'
          else if (dist[n] === Infinity) cls += ' dim'
          return (
            <div key={n} className={cls}>
              <span className="idx">{n}</span>
              {fmt(dist[n])}
              {current === n && <span className="ptr mint">▲ CURRENT</span>}
              {flash === n && <span className="ptr amber">▲ IMPROVED</span>}
            </div>
          )
        })}
      </div>
      <div className="legend">
        <span className="key"><span className="swatch mint" /> current / improved</span>
        <span className="key"><span className="swatch amber" /> edge being relaxed</span>
        <span className="key"><span className="swatch" /> unsettled</span>
      </div>
    </>
  )
}

export const dijkstra: AlgorithmModule<DijkstraState> = {
  id: 'dijkstra',
  name: "Dijkstra's Algorithm",
  tagline: 'Greedily lock in the closest unsettled place — once settled, no shorter route can ever exist.',
  category: 'Graphs',
  icon: '🗺️',
  problem: {
    title: 'Single-source shortest paths — cheapest routes from A to everywhere',
    statement:
      'You are given a map of 6 towns (A–F) joined by 9 two-way roads with tolls: A–B costs 4, A–C costs 2, B–C costs 1, B–D costs 5, C–D costs 8, C–E costs 5, D–E costs 2, D–F costs 6, E–F costs 3. Starting from town A, what is the cheapest total toll to reach EACH of the other five towns? That exact question is what the animation below is solving, live.',
    input: 'The 6-node weighted graph above (9 undirected edges), and the source node A.',
    output: 'The cheapest cost from A to every node — here A=0, B=3, C=2, D=8, E=7, F=10.',
    naive: {
      description:
        'Enumerate every simple path out of A and keep the cheapest per destination: even this tiny graph hides 42 such paths — 13 different routes to F alone.',
      pseudocode: [
        'best[v] ← ∞ for every town v',
        'walk(town, cost, visited):',
        '    best[town] ← min(best[town], cost)',
        '    for each road town–next with toll w:',
        '        if next not in visited:',
        '            walk(next, cost + w, visited ∪ {town})',
        'walk(A, 0, ∅)',
      ],
      time: 'O(V!) — factorial path explosion',
      space: 'O(V) per active path',
      issues:
        'Shared prefixes are re-priced endlessly: the stretch A→C→B is the opening of dozens of the 42 paths, and its toll is re-summed for every single one. Nothing is ever declared finished, so even after stumbling on the best route to F the search keeps grinding through 12 worse ones. The path count grows factorially with the map; Dijkstra answers the same question with 6 pops and 9 edge relaxations by settling each town exactly once.',
      demo: naiveDemo,
    },
  },
  aha:
    'With no negative tolls, the closest unsettled node can never be reached more cheaply — any other route would first detour through somewhere at least as far and then add more — so the first time a node is the closest, its distance is provably final and it can be locked forever. That one lock per node is why 6 pops and 9 edge checks beat searching all 42 paths.',
  journey: [
    {
      title: 'Plain BFS — count hops, not tolls',
      spark:
        'Shortest path in a graph? That is BFS — explore in rings, one road at a time, and the first time you reach a town is the shortest way there. Just record the toll of whichever route arrives first.',
      pseudocode: [
        'dist[A] ← 0; queue ← {A}',
        'while queue not empty:',
        '    u ← dequeue front',
        '    for each road u–v with toll w:',
        '        if v never seen: dist[v] ← dist[u] + w; enqueue v',
      ],
      time: 'O(V + E)',
      space: 'O(V)',
      verdict: 'fail',
      breaks:
        'BFS reaches B in one hop and stamps it 4 via A–B — final, never revisited. But the two-hop route A→C→B costs 2 + 1 = 3. Same poison spreads to D: BFS records it at 4 + 5 = 9 via A→B→D, while the real cheapest is the three-hop A→C→B→D at 2 + 1 + 5 = 8. On a weighted map, fewer roads is not cheaper roads.',
      insight:
        'The expanding-ring picture is right — but the ring must grow by accumulated toll, not by hop count. Whatever comes next has to judge routes by their total cost.',
      demo: hopsDemo,
    },
    {
      title: 'Greedy walk — always take the cheapest road out',
      spark:
        'Fine, track tolls. Walk the map like a thrifty traveler: standing in any town, surely the smart move is the cheapest road leaving it. Follow that rule from A and record each town as you arrive.',
      pseudocode: [
        'at ← A; cost ← 0; visited ← {A}',
        'while some road leaves `at` to an unvisited town:',
        '    pick the cheapest such road at–v (toll w)',
        '    cost ← cost + w; dist[v] ← cost',
        '    at ← v; add v to visited',
      ],
      time: 'O(V + E)',
      space: 'O(V)',
      verdict: 'fail',
      breaks:
        'Trace it: A takes A–C (2), C takes C–B (1, snubbing C–E at 5), B takes B–D (5), D takes D–E (2) — the walker reaches E carrying 2 + 1 + 5 + 2 = 10. But E’s true cheapest is 7, straight down the road it snubbed: A→C→E = 2 + 5. Optimizing the next edge in isolation lost the total.',
      insight:
        'One committed walker cannot do it. Keep a tentative best cost for EVERY town, and let any route that beats it overwrite — decisions must compare whole accumulated totals, never single edges.',
      demo: greedyWalkDemo,
    },
    {
      title: 'Relax with a plain queue — let cheaper routes overwrite',
      spark:
        'So combine the two lessons: keep BFS’s queue, but store the best toll found so far for each town, and whenever a route improves a town, update it and re-queue it so the improvement propagates.',
      pseudocode: [
        'dist[A] ← 0; dist[v] ← ∞ for all others; queue ← {A}',
        'while queue not empty:',
        '    u ← dequeue front  (arrival order — no priority)',
        '    for each road u–v with toll w:',
        '        if dist[u] + w < dist[v]:',
        '            dist[v] ← dist[u] + w; enqueue v',
      ],
      time: 'O(V · E)',
      space: 'O(V)',
      verdict: 'partial',
      breaks:
        'It gets every answer right — but count the work. The queue pops D at a provisional 9 and dutifully relaxes all four of its roads (stamping F at 15). Then B improves to 3, drops D to 8, and D must be popped and fully re-relaxed — its second pass finds nothing, every check wasted. On this graph: 9 pops and 27 edge checks, versus the 6 pops and 9 relaxations the animation needs; B, D, and F are each processed twice, and on hostile graphs the re-work blows up to O(V · E).',
      insight:
        'All the re-processing came from popping towns whose costs were still provisional. Pop the unsettled town with the SMALLEST tentative cost instead, and no future route could ever undercut it — its number would already be final.',
      demo: plainQueueDemo,
    },
    {
      title: 'Dijkstra — always pop the closest unsettled town',
      spark:
        'Swap the FIFO queue for a priority queue keyed by tentative cost, so the town you process is always the closest unsettled one — then its distance is final the moment you pop it, and it never needs a second look.',
      pseudocode: [
        ‘dist[s] ← 0; dist[v] ← ∞ for all others; PQ ← {(0, s)}’,
        ‘while PQ not empty:’,
        ‘    u ← pop node with smallest dist  (u is now settled)’,
        ‘    for each edge (u, v) with weight w:’,
        ‘        if v settled: skip’,
        ‘        if dist[u] + w ≥ dist[v]: keep dist[v]’,
        ‘        else: dist[v] ← dist[u] + w; push (dist[v], v)’,
        ‘return dist’,
      ],
      time: ‘O((V + E) log V)’,
      space: ‘O(V + E)’,
      verdict: ‘optimal’,
      breaks:
        ‘Nothing is re-done: the 6 towns are popped exactly once each, in the order A(0), C(2), B(3), E(7), D(8), F(10), and a popped number never changes — D is relaxed at its true cost 8, never at a stale 9. Total work: 6 pops and 9 edge relaxations for a question whose brute force weighs 42 paths; the log V per heap operation is the entire price of always knowing who is closest.’,
      insight:
        ‘The priority queue’s only job is to hand you the closest unsettled town — and with no negative tolls, that town’s cost is already unbeatable. That lock is the whole algorithm.’,
      demo: { generateSteps, Visualizer },
    },
  ],
  intuition: [
    'Imagine pouring water onto your home city on a road map where every road is a channel and its length is how long water takes to flow through it. The flood front reaches the nearest town first, then the next nearest, and so on. The moment water first touches a town, you KNOW the fastest route there — water that arrives later, by definition, took longer. Dijkstra is that flood, simulated one town at a time.',
    'The invariant: when you pop the unsettled node with the smallest tentative distance, that distance is final. Why? Any alternative path to it must leave the settled region through some other unsettled node — which is already at least as far away — and then add edges with non-negative weight. It can only get worse. This is exactly why negative edge weights break Dijkstra: a "worse-for-now" path could later get a discount, invalidating the lock.',
    'Reach for Dijkstra whenever you need single-source shortest paths on a graph with non-negative weights — including graphs in disguise: grids where each move has a cost, states connected by weighted transitions, even "maximize probability" problems (flip products into sums with logs, or run a max-heap). If all weights are equal, plain BFS is cheaper; if weights can be negative, you need Bellman-Ford.',
  ],
  pseudocode: [
    'dist[s] ← 0; dist[v] ← ∞ for all others; PQ ← {(0, s)}',
    'while PQ not empty:',
    '    u ← pop node with smallest dist  (u is now settled)',
    '    for each edge (u, v) with weight w:',
    '        if v settled: skip',
    '        if dist[u] + w ≥ dist[v]: keep dist[v]',
    '        else: dist[v] ← dist[u] + w; push (dist[v], v)',
    'return dist',
  ],
  complexity: {
    time: 'O((V + E) log V)',
    space: 'O(V + E)',
    explanation:
      'Every edge can trigger at most one successful relaxation per direction, so the priority queue ever receives O(E) entries; each push or pop costs O(log V)-ish. Each of the V nodes is settled exactly once — work never repeats, because settling is permanent. Space is the adjacency list (O(V + E)) plus the distance table and heap (O(V + E)). The log factor is literally the price of always knowing "who is closest right now".',
  },
  generateSteps,
  Visualizer,
  problems: [
    { title: 'Network Delay Time', difficulty: 'Medium', leetcodeId: 743, hint: 'Textbook Dijkstra from the signal source; the answer is the largest settled distance.' },
    { title: 'Cheapest Flights Within K Stops', difficulty: 'Medium', leetcodeId: 787, hint: 'The K-stop cap breaks the settling invariant — use Bellman-Ford or Dijkstra on (city, stops-used) states.' },
    { title: 'Path With Minimum Effort', difficulty: 'Medium', leetcodeId: 1631, hint: 'Minimax Dijkstra on the grid: a path\'s "cost" is its largest single step, so relax with max(effort, |Δheight|).' },
    { title: 'Swim in Rising Water', difficulty: 'Hard', leetcodeId: 778, hint: 'Settle cells by the smallest water level needed to reach them — relax with max(time, cell height).' },
    { title: 'Path with Maximum Probability', difficulty: 'Medium', leetcodeId: 1514, hint: 'Dijkstra with a MAX-heap: probabilities multiply, so greedily settle the most-probable node first.' },
    { title: 'Minimum Cost to Make at Least One Valid Path in a Grid', difficulty: 'Hard', leetcodeId: 1368, hint: 'Edges cost 0 (follow the arrow) or 1 (override it) — 0-1 BFS with a deque is Dijkstra without the heap.' },
    { title: 'The Maze II', difficulty: 'Medium', leetcodeId: 505, hint: 'The ball rolls until it hits a wall, so each "edge" is a full roll whose weight is the distance traveled.' },
    { title: 'Find the City With the Smallest Number of Neighbors at a Threshold Distance', difficulty: 'Medium', leetcodeId: 1334, hint: 'Run Dijkstra from every city (or Floyd-Warshall) and count how many settled distances stay under the threshold.' },
    { title: 'Reachable Nodes In Subdivided Graph', difficulty: 'Hard', leetcodeId: 882, hint: 'Dijkstra on the original nodes; leftover budget on each edge tells you how many subdivided nodes you can touch.' },
    { title: 'Minimum Obstacle Removal to Reach Corner', difficulty: 'Hard', leetcodeId: 2290, hint: 'Moving into an obstacle costs 1, empty costs 0 — minimize removals with 0-1 BFS or Dijkstra.' },
    { title: 'Designing a navigation/GPS route', difficulty: 'Medium', hint: 'Roads are edges weighted by travel time; Dijkstra (with A*-style tweaks) is the backbone of every turn-by-turn router.' },
  ],
}
