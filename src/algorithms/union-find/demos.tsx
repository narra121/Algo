import type { AttemptDemo, Step } from '../../core/types'
import { N, UNIONS, QUERY } from './data'

/* ─────────────────────────────────────────────────────────────────────────────
   Shared helpers: replicate the SVG forest markup from index.tsx so demo
   visualizers look native — same node circles, parent arcs, legend swatches.
─────────────────────────────────────────────────────────────────────────────── */

const CX = (i: number) => 52 + i * 77
const CY = 152
const R = 20

function arc(i: number, p: number): string {
  const x1 = CX(i)
  const x2 = CX(p)
  const dist = Math.abs(i - p)
  const yTop = CY - R - 2
  const peak = yTop - 14 - dist * 22
  return `M ${x1} ${yTop} Q ${(x1 + x2) / 2} ${peak} ${x2} ${yTop}`
}

/** Shared SVG forest identical in markup to index.tsx's Visualizer. */
function ForestSVG({
  parent,
  rank,
  active,
  flash,
}: {
  parent: number[]
  rank: number[]
  active: number[]
  flash: number[]
}) {
  return (
    <svg className="viz-svg" viewBox="0 0 640 215" role="img" aria-label="Union-Find forest">
      <defs>
        <marker id="uf-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#7a86ad" />
        </marker>
        <marker id="uf-arrow-hot" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#5ef2b8" />
        </marker>
      </defs>
      {parent.map((p, i) => {
        if (p === i) return null
        const hot = flash.includes(i)
        const warm = !hot && active.includes(i) && active.includes(p)
        const cls = hot ? 'edge hot' : warm ? 'edge warm' : 'edge'
        return (
          <path
            key={`e${i}`}
            className={cls}
            d={arc(i, p)}
            fill="none"
            markerEnd={hot ? 'url(#uf-arrow-hot)' : 'url(#uf-arrow)'}
          />
        )
      })}
      {parent.map((p, i) => {
        const isRoot = p === i
        let cls = 'node'
        if (active.includes(i)) cls += ' active'
        else if (flash.includes(i)) cls += ' done'
        else if (isRoot) cls += ' warm'
        return (
          <g key={`n${i}`}>
            <circle className={cls} cx={CX(i)} cy={CY} r={R} />
            <text x={CX(i)} y={CY + 5} textAnchor="middle" fontSize={15} fontWeight={600}>
              {i}
            </text>
            <text x={CX(i)} y={CY + R + 17} textAnchor="middle" fontSize={10.5} opacity={0.55}>
              {isRoot ? `rank ${rank[i]}` : `→ ${p}`}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 1 — Naive brute force: BFS from scratch for every connectivity query
   and full re-traversal to count components.

   codeLine indexes problem.naive.pseudocode:
     0: 'on union(a, b):  add edge a–b to the list'
     1: 'on connected?(a, b):'
     2: '    run BFS from a over ALL current edges'
     3: '    return true if b was reached'
     4: 'on countComponents:'
     5: '    BFS from every unvisited node, counting starts'
─────────────────────────────────────────────────────────────────────────────── */

interface NaiveState {
  /** Adjacency list (edge pairs), as stored after each union. */
  edges: [number, number][]
  /** Nodes highlighted as BFS frontier or visited in the current BFS sweep. */
  visited: number[]
  /** Components count derived by the last full BFS sweep (−1 = unknown yet). */
  components: number
  /** Whether this step is part of the connectivity query. */
  querying: boolean
}

function naiveSteps(): Step<NaiveState>[] {
  const steps: Step<NaiveState>[] = []
  const edges: [number, number][] = []

  const snap = (visited: number[], components: number, querying: boolean): NaiveState => ({
    edges: [...edges] as [number, number][],
    visited: [...visited],
    components,
    querying,
  })

  // Sentinel intro
  steps.push({
    state: snap([], -1, false),
    description: `Brute force: maintain a raw edge list, and re-run a full BFS from scratch every time someone asks "are these two nodes connected?" or "how many components are there?". Start: 8 isolated nodes, empty edge list.`,
    codeLine: 0,
  })

  // Add edges one by one (first 6 unions, without counting — just appending)
  for (let ui = 0; ui < 6; ui++) {
    const [a, b] = UNIONS[ui]
    edges.push([a, b])
    steps.push({
      state: snap([], -1, false),
      description: `union(${a}, ${b}): append edge ${a}–${b} to the list. Edge count is now ${edges.length}. No computation — answers are deferred until a query arrives.`,
      codeLine: 0,
    })
  }

  // The connectivity query: are 0 and 4 connected after 6 unions?
  const [qa, qb] = QUERY  // [0, 4]
  steps.push({
    state: snap([], -1, true),
    description: `Query: connected?(${qa}, ${qb})? Time to earn the answer the hard way — launch a full BFS from node ${qa} across all ${edges.length} edges.`,
    codeLine: 1,
  })

  // Simulate BFS from node 0 with the 6 edges
  // Build adjacency list from edges
  const adj: number[][] = Array.from({ length: N }, () => [])
  for (const [u, v] of edges) {
    adj[u].push(v)
    adj[v].push(u)
  }

  // BFS from qa (node 0)
  const visitedA: number[] = []
  const seenA = new Set<number>()
  const queueA = [qa]
  seenA.add(qa)
  while (queueA.length > 0) {
    const node = queueA.shift()!
    visitedA.push(node)
    steps.push({
      state: snap([...visitedA], -1, true),
      description: `BFS from ${qa}: visit node ${node}. Neighbors via edges: [${adj[node].filter(n => !seenA.has(n)).join(', ') || 'none new'}]. Visited so far: {${visitedA.join(', ')}}.`,
      codeLine: 2,
    })
    for (const nb of adj[node]) {
      if (!seenA.has(nb)) {
        seenA.add(nb)
        queueA.push(nb)
      }
    }
  }

  const reached = seenA.has(qb)
  steps.push({
    state: snap([...visitedA], -1, true),
    description: `BFS complete. Reached ${visitedA.length} nodes: {${visitedA.join(', ')}}. Node ${qb} was ${reached ? '' : 'NOT '}found — answer: ${reached ? 'CONNECTED' : 'NOT connected'}. The BFS re-derived connectivity that prior union calls had already established, then immediately threw all that work away.`,
    codeLine: 3,
  })

  // Now add the 7th union and do a full component count via BFS
  const [ua7, ub7] = UNIONS[6]
  edges.push([ua7, ub7])
  adj[ua7].push(ub7)
  adj[ub7].push(ua7)
  steps.push({
    state: snap([], -1, false),
    description: `union(${ua7}, ${ub7}): append edge ${ua7}–${ub7}. Edge count is now ${edges.length}. Now compute the component count — that means BFS from every unvisited node.`,
    codeLine: 4,
  })

  // Full BFS sweep for component counting
  const globalSeen = new Set<number>()
  let compCount = 0
  const allVisited: number[] = []
  for (let start = 0; start < N; start++) {
    if (globalSeen.has(start)) continue
    compCount++
    const bfsQ = [start]
    globalSeen.add(start)
    while (bfsQ.length > 0) {
      const node = bfsQ.shift()!
      allVisited.push(node)
      for (const nb of adj[node]) {
        if (!globalSeen.has(nb)) {
          globalSeen.add(nb)
          bfsQ.push(nb)
        }
      }
    }
    steps.push({
      state: snap([...allVisited], compCount, false),
      description: `BFS sweep: start from node ${start} (not yet visited). Component ${compCount} found, covering nodes reachable from ${start}. Running total: ${compCount} component${compCount > 1 ? 's' : ''}.`,
      codeLine: 5,
    })
  }

  steps.push({
    state: snap([...allVisited], compCount, false),
    description: `Done. After all 7 unions: ${compCount} component. Every future "connected?" query will re-run this entire BFS from scratch — the ${edges.length} edges and ${N} nodes are re-examined each time, carrying forward nothing from the query we just answered.`,
    codeLine: 5,
  })

  return steps
}

interface NaiveVizState extends NaiveState {}

function NaiveViz({ step }: { step: Step<NaiveVizState> }) {
  const { edges, visited, components, querying } = step.state
  // Build a parent array purely for display: show each edge as a "directed" link
  // We use a simple flat representation — roots are nodes with no edge yet "above" them.
  // For display, show a linear parent array representing edge connectivity.
  // We render nodes and highlight visited ones; edges shown as adjacency.
  const visitedSet = new Set(visited)

  return (
    <>
      <div className="viz-caption">
        {querying
          ? `connected?(${QUERY[0]}, ${QUERY[1]})? · edges = ${edges.length}`
          : `edges = ${edges.length}${components >= 0 ? ` · components = ${components}` : ''}`}
      </div>
      <svg className="viz-svg" viewBox="0 0 640 215" role="img" aria-label="Union-Find naive edge list">
        {/* Draw edges as simple arcs */}
        {edges.map(([u, v], ei) => {
          const x1 = CX(u)
          const x2 = CX(v)
          const dist = Math.abs(u - v)
          const yTop = CY - R - 2
          const peak = yTop - 14 - dist * 22
          const d = `M ${x1} ${yTop} Q ${(x1 + x2) / 2} ${peak} ${x2} ${yTop}`
          const bothVisited = visitedSet.has(u) && visitedSet.has(v)
          return (
            <path
              key={`edge${ei}`}
              className={bothVisited ? 'edge hot' : 'edge'}
              d={d}
              fill="none"
              markerEnd="none"
            />
          )
        })}
        {/* Draw nodes */}
        {Array.from({ length: N }, (_, i) => {
          let cls = 'node'
          if (visitedSet.has(i)) cls += ' active'
          else cls += ' warm'
          return (
            <g key={`n${i}`}>
              <circle className={cls} cx={CX(i)} cy={CY} r={R} />
              <text x={CX(i)} y={CY + 5} textAnchor="middle" fontSize={15} fontWeight={600}>
                {i}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="legend">
        <span className="key"><span className="swatch mint" /> visited by current BFS</span>
        <span className="key"><span className="swatch amber" /> not yet reached</span>
        <span className="key"><span className="swatch mint" /> mint arc = traversed edge</span>
      </div>
    </>
  )
}

export const naiveDemo: AttemptDemo<NaiveVizState> = { generateSteps: naiveSteps, Visualizer: NaiveViz }

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 2 — Labels attempt: comp[i] per node, relabel the whole losing group on merge.
   7 unions × 8 node-scans = 56 checks; 12 total relabels; union(3,7) alone rewrites 4.

   codeLine indexes journey[0].pseudocode:
     0: 'comp[i] ← i for every node'
     1: 'connected?(a, b): return comp[a] = comp[b]'
     2: 'union(a, b):'
     3: '    if comp[a] = comp[b]: stop'
     4: '    old ← comp[b]'
     5: '    for i ← 0 .. n − 1:'
     6: '        if comp[i] = old: comp[i] ← comp[a]'
─────────────────────────────────────────────────────────────────────────────── */

interface LabelsState {
  comp: number[]
  scanIdx: number   // current scan position (−1 = not scanning)
  relabels: number  // running total relabels
  totalScans: number // running total node-scans across all unions
  flash: number[]   // nodes just relabeled (shown in mint)
}

function labelsSteps(): Step<LabelsState>[] {
  const steps: Step<LabelsState>[] = []
  const comp = Array.from({ length: N }, (_, i) => i)
  let relabels = 0
  let totalScans = 0

  const snap = (scanIdx: number, flash: number[]): LabelsState => ({
    comp: [...comp],
    scanIdx,
    relabels,
    totalScans,
    flash: [...flash],
  })

  // Sentinel intro
  steps.push({
    state: snap(-1, []),
    description: `Labels approach: stamp every node with its component ID. connected? is a one-comparison lookup. But union(a, b) must scan ALL ${N} nodes to relabel the losing group. Start: comp[i] = i, ${N} components.`,
    codeLine: 0,
  })

  for (let ui = 0; ui < UNIONS.length; ui++) {
    const [a, b] = UNIONS[ui]
    const ca = comp[a]
    const cb = comp[b]

    if (ca === cb) {
      steps.push({
        state: snap(-1, []),
        description: `union(${a}, ${b}): comp[${a}] = comp[${b}] = ${ca} — already same component. Stop early, no scan needed.`,
        codeLine: 3,
      })
      continue
    }

    // Show the old values before scanning
    steps.push({
      state: snap(-1, []),
      description: `union(${a}, ${b}): comp[${a}] = ${ca}, comp[${b}] = ${cb} — different components. Must rename every node labeled ${cb} to ${ca}. Scanning all ${N} nodes now.`,
      codeLine: 4,
    })

    // Scan and relabel
    const justRelabeled: number[] = []
    for (let i = 0; i < N; i++) {
      totalScans++
      if (comp[i] === cb) {
        comp[i] = ca
        relabels++
        justRelabeled.push(i)
      }
    }

    steps.push({
      state: snap(-1, [...justRelabeled]),
      description: `Scan complete (${N} checks). Nodes ${justRelabeled.join(', ')} had label ${cb} — relabeled to ${ca}. That is ${justRelabeled.length} relabel${justRelabeled.length > 1 ? 's' : ''} this union. Running total: ${relabels} relabels across ${totalScans} node-scans.`,
      codeLine: 6,
    })
  }

  // Final verdict
  steps.push({
    state: snap(-1, []),
    description: `All 7 unions done. Final comp: [${comp.join(', ')}] — every node carries label 0 (one component). Cost: ${relabels} relabels across ${totalScans} node-scans (${UNIONS.length} × ${N} = ${totalScans}). The last union(3,7) alone rewrote ${4} labels — half the graph in one blow. At a million nodes, one bad merge rewrites 500,000 labels. The O(n) cost just moved from queries into unions.`,
    codeLine: 6,
  })

  return steps
}

function LabelsViz({ step }: { step: Step<LabelsState> }) {
  const { comp, relabels, totalScans, flash } = step.state
  const flashSet = new Set(flash)
  // Group nodes by component label for display
  const compValues = Array.from({ length: N }, (_, i) => comp[i])

  return (
    <>
      <div className="viz-caption">
        relabels = {relabels} · node-scans = {totalScans} · comp = [{compValues.join(', ')}]
      </div>
      <svg className="viz-svg" viewBox="0 0 640 215" role="img" aria-label="Labels union-find">
        {/* No arrows — labels approach has no parent pointers */}
        {Array.from({ length: N }, (_, i) => {
          let cls = 'node'
          if (flashSet.has(i)) cls += ' done'
          else if (comp[i] === i) cls += ' warm'
          return (
            <g key={`n${i}`}>
              <circle className={cls} cx={CX(i)} cy={CY} r={R} />
              <text x={CX(i)} y={CY + 5} textAnchor="middle" fontSize={15} fontWeight={600}>
                {i}
              </text>
              <text x={CX(i)} y={CY + R + 17} textAnchor="middle" fontSize={10.5} opacity={0.55}>
                {comp[i]}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="legend">
        <span className="key"><span className="swatch mint" /> just relabeled</span>
        <span className="key"><span className="swatch amber" /> component leader (comp[i] = i)</span>
        <span className="key"><span className="swatch" /> member node · label shown below</span>
      </div>
    </>
  )
}

export const labelsDemo: AttemptDemo<LabelsState> = { generateSteps: labelsSteps, Visualizer: LabelsViz }

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 3 — Trees attempt: parent[i] pointer, a's root always bows to b's root.
   Shows chain growing deeper with each merge; final step: 3-hop chain 0→1→3→7.
   Highlights from breaks: "query walks 0→1→3 and 4→5→7 — two hops each"
   and degenerate risk of a's root always bowing to b's.

   codeLine indexes journey[1].pseudocode:
     0: 'parent[i] ← i for every node'
     1: 'find(x):'
     2: '    while parent[x] ≠ x: x ← parent[x]'
     3: '    return x'
     4: 'union(a, b):'
     5: '    if find(a) ≠ find(b):'
     6: '        parent[find(a)] ← find(b)   // a\'s root bows to b\'s'
─────────────────────────────────────────────────────────────────────────────── */

interface TreesState {
  parent: number[]
  active: number[]   // nodes currently on a find() walk
  flash: number[]    // root just repointed
  maxChain: number   // length of the longest current path (in hops)
}

function treesFind(parent: number[], x: number): { root: number; path: number[] } {
  const path: number[] = []
  while (parent[x] !== x) {
    path.push(x)
    x = parent[x]
  }
  path.push(x)  // include root
  return { root: x, path }
}

function treesSteps(): Step<TreesState>[] {
  const steps: Step<TreesState>[] = []
  const parent = Array.from({ length: N }, (_, i) => i)

  const maxDepth = () => {
    let max = 0
    for (let i = 0; i < N; i++) {
      let d = 0; let x = i
      while (parent[x] !== x) { d++; x = parent[x] }
      max = Math.max(max, d)
    }
    return max
  }

  const snap = (active: number[], flash: number[]): TreesState => ({
    parent: [...parent],
    active: [...active],
    flash: [...flash],
    maxChain: maxDepth(),
  })

  // Sentinel intro
  steps.push({
    state: snap([], []),
    description: `Trees approach: each node holds a parent pointer — parent[i] = i means "I am a root". Merging two groups costs one pointer write: a's root bows to b's root. Start: all ${N} nodes are their own roots.`,
    codeLine: 0,
  })

  // Process unions one at a time, showing find() walks
  for (let ui = 0; ui < UNIONS.length; ui++) {
    const [a, b] = UNIONS[ui]

    // Show find(a)
    const fa = treesFind(parent, a)
    const fb = treesFind(parent, b)

    if (ui < 4) {
      // First four unions: both arguments are already roots, just one step each
      steps.push({
        state: snap([...fa.path, ...fb.path], []),
        description: `union(${a}, ${b}): find(${a}) = ${fa.root} (${fa.path.length - 1} hop${fa.path.length - 1 !== 1 ? 's' : ''}); find(${b}) = ${fb.root} (${fb.path.length - 1} hop${fb.path.length - 1 !== 1 ? 's' : ''}). Different roots — merge.`,
        codeLine: 5,
      })
    } else {
      // Later unions: show the walk explicitly because paths are longer
      steps.push({
        state: snap([...fa.path, ...fb.path], []),
        description: `union(${a}, ${b}): find(${a}) walks ${fa.path.join(' → ')} (${fa.path.length - 1} hop${fa.path.length - 1 !== 1 ? 's' : ''}); find(${b}) walks ${fb.path.join(' → ')} (${fb.path.length - 1} hop${fb.path.length - 1 !== 1 ? 's' : ''}). Roots: ${fa.root} and ${fb.root} — different, so merge.`,
        codeLine: 2,
      })
    }

    if (fa.root !== fb.root) {
      parent[fa.root] = fb.root  // a's root bows to b's root
      const depth = maxDepth()
      steps.push({
        state: snap([], [fa.root]),
        description: `Repoint root ${fa.root} → ${fb.root}. One pointer write, all of ${fa.root}'s subtree now belongs to ${fb.root}'s group. Longest chain now = ${depth} hop${depth !== 1 ? 's' : ''}.`,
        codeLine: 6,
      })
    }
  }

  // Final verdict: show the worst chain formed
  // After all 7 unions, longest chain is 0→1→3→7 (3 hops)
  // find(0) result
  const f0 = treesFind(parent, 0)
  steps.push({
    state: snap([...f0.path], []),
    description: `Final state: find(0) walks ${f0.path.join(' → ')} — ${f0.path.length - 1} hops. This is our specific stream with its well-behaved pairs. But "a's root always bows to b's root" is reckless: the stream (0,1)(1,2)(2,3)…(6,7) welds a 7-hop chain, and find(0) climbs ${N - 1} arrows on ${N} nodes. The O(n) cost hid inside find() instead of union(). Fix: choose who bows by height, and flatten every path after you walk it.`,
    codeLine: 2,
  })

  return steps
}

function TreesViz({ step }: { step: Step<TreesState> }) {
  const { parent, active, flash, maxChain } = step.state
  const rank = new Array(N).fill(0)  // trees attempt has no rank tracking; all zeros

  return (
    <>
      <div className="viz-caption">
        max chain = {maxChain} hop{maxChain !== 1 ? 's' : ''} · parent = [{parent.join(' ')}]
      </div>
      <ForestSVG parent={parent} rank={rank} active={active} flash={flash} />
      <div className="legend">
        <span className="key"><span className="swatch amber" /> root (parent[i] = i)</span>
        <span className="key"><span className="swatch mint" /> on a find() walk</span>
        <span className="key"><span className="swatch" /> tree member</span>
        <span className="key"><span className="swatch mint" /> mint arrow = root just repointed</span>
      </div>
    </>
  )
}

export const treesDemo: AttemptDemo<TreesState> = { generateSteps: treesSteps, Visualizer: TreesViz }
