import type { AlgorithmModule, Step } from '../../core/types'

/* Canonical example: 8 nodes (0–7); unions arrive one at a time:
   (0,1) (2,3) (4,5) (6,7) (1,3) (5,7) — leaving 2 components —
   then we ask "find(0) == find(4)?", then union(3,7) merges everything. */

const N = 8

interface UFState {
  /** parent[i] — each node's single upward pointer (parent[i] === i means root). */
  parent: number[]
  /** rank[i] — upper bound on the tree height rooted at i. */
  rank: number[]
  components: number
  /** Nodes currently being walked by find(). */
  active: number[]
  /** Nodes whose parent pointer was just rewired (attach or path compression). */
  flash: number[]
}

function generateSteps(): Step<UFState>[] {
  const steps: Step<UFState>[] = []
  const parent = Array.from({ length: N }, (_, i) => i)
  const rank: number[] = new Array(N).fill(0)
  let components = N

  const snap = (active: number[], flash: number[]): UFState => ({
    parent: [...parent],
    rank: [...rank],
    components,
    active: [...active],
    flash: [...flash],
  })

  steps.push({
    state: snap([], []),
    description: `Eight nodes, eight tiny kingdoms. Every node starts as its own boss: parent[i] = i, rank 0. Component count = ${components}. Unions will arrive one at a time — we never see the whole graph up front.`,
    codeLine: 0,
  })

  /* ---- union(0,1): spelled out in full ---- */
  steps.push({
    state: snap([0, 1], []),
    description: `union(0, 1): first, find both roots. find(0) takes zero hops — parent[0] = 0, so 0 is already a root. Same for 1. Roots 0 and 1 differ, so these really are two separate components.`,
    codeLine: 7,
  })
  parent[1] = 0
  rank[0] = 1
  components--
  steps.push({
    state: snap([], [1]),
    description: `Both roots have rank 0 — a tie. Union by rank says: attach either one, but bump the winner. Node 1 hooks under 0, and rank[0] rises to 1. Ties are the ONLY time rank grows — that stinginess is what keeps trees shallow. ${components} components left.`,
    codeLine: 9,
  })

  /* ---- three more rank-0 ties, quickly ---- */
  parent[3] = 2
  rank[2] = 1
  components--
  steps.push({
    state: snap([2, 3], [3]),
    description: `union(2, 3): same story — two rank-0 roots, so 3 hooks under 2 and rank[2] becomes 1. ${components} components.`,
    codeLine: 9,
  })
  parent[5] = 4
  rank[4] = 1
  components--
  steps.push({
    state: snap([4, 5], [5]),
    description: `union(4, 5): another rank-0 tie. 5 attaches under 4, rank[4] = 1. ${components} components.`,
    codeLine: 9,
  })
  parent[7] = 6
  rank[6] = 1
  components--
  steps.push({
    state: snap([6, 7], [7]),
    description: `union(6, 7): 7 attaches under 6. We now have four tidy two-node trees: {0,1} {2,3} {4,5} {6,7}. ${components} components.`,
    codeLine: 9,
  })

  /* ---- union(1,3): first non-root arguments ---- */
  steps.push({
    state: snap([1, 0, 3, 2], []),
    description: `union(1, 3): neither argument is a root! find(1) climbs one arrow to root 0; find(3) climbs one arrow to root 2. Roots 0 ≠ 2, so these two trees have never met — merge them.`,
    codeLine: 7,
  })
  parent[2] = 0
  rank[0] = 2
  components--
  steps.push({
    state: snap([], [2]),
    description: `rank[0] = 1 and rank[2] = 1 — tied again. Root 2 (taking nodes 2 AND 3 with it) now answers to root 0, and rank[0] grows to 2. One pointer write merged two whole groups. ${components} components.`,
    codeLine: 9,
  })

  /* ---- union(5,7) ---- */
  steps.push({
    state: snap([5, 4, 7, 6], []),
    description: `union(5, 7): find(5) climbs to root 4, find(7) climbs to root 6. Different roots again — this union will genuinely merge something.`,
    codeLine: 7,
  })
  parent[6] = 4
  rank[4] = 2
  components--
  steps.push({
    state: snap([], [6]),
    description: `Ranks tied at 1, so root 6 bows to root 4 and rank[4] becomes 2. Down to ${components} components: {0,1,2,3} on the left, {4,5,6,7} on the right.`,
    codeLine: 9,
  })

  /* ---- connectivity query: find(0) == find(4)? ---- */
  steps.push({
    state: snap([], []),
    description: `Two kingdoms remain. Now the killer query: are 0 and 4 connected? Union-Find never searches edges — no BFS, no visited set. We just ask each node to name its root and compare.`,
    codeLine: 1,
  })
  steps.push({
    state: snap([0], []),
    description: `find(0): parent[0] = 0, so 0 IS its own root. Answered in zero hops — find(0) = 0.`,
    codeLine: 5,
  })
  steps.push({
    state: snap([0, 4], []),
    description: `find(4): parent[4] = 4 — also a root, also zero hops. So find(0) = 0 but find(4) = 4.`,
    codeLine: 5,
  })
  steps.push({
    state: snap([0, 4], []),
    description: `0 ≠ 4: different roots means different components — NOT connected. Two pointer walks replaced an entire graph traversal. That's the whole sales pitch.`,
    codeLine: 8,
  })

  /* ---- union(3,7): deep finds with path compression ---- */
  parent[3] = 0 // compression: parent[3] was 2; parent[parent[3]] = parent[2] = 0
  steps.push({
    state: snap([3, 0], [3]),
    description: `union(3, 7): find(3) climbs 3 → 2 → 0. And here path compression earns its keep: mid-walk, parent[3] is rewired from 2 straight to root 0. Next time, 3 reaches its root in ONE hop instead of two.`,
    codeLine: 3,
  })
  parent[7] = 4 // compression: parent[7] was 6; parent[parent[7]] = parent[6] = 4
  steps.push({
    state: snap([7, 4], [7]),
    description: `find(7) climbs 7 → 6 → 4, and compression rewires parent[7] directly to 4. Every lookup physically flattens the tree as a side effect — future finds get cheaper for free.`,
    codeLine: 3,
  })
  parent[4] = 0
  rank[0] = 3
  components--
  steps.push({
    state: snap([], [4]),
    description: `Roots 0 and 4 both have rank 2 — one final tie. Root 4 attaches under root 0, rank[0] becomes 3, and the entire graph is ONE component. Ask "find(0) == find(4)?" now and the answer flips to yes.`,
    codeLine: 9,
  })
  steps.push({
    state: snap([], []),
    description: `Done: 7 unions took us from 8 components to ${components}. Notice the forest stayed almost flat — rank held height to at most 3, and compression keeps shaving it. Each operation costs amortized α(n): effectively constant.`,
    codeLine: 11,
  })

  return steps
}

/* ---- visualizer: nodes in a row, parent arrows curving upward ---- */

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

function Visualizer({ step }: { step: Step<UFState> }) {
  const { parent, rank, components, active, flash } = step.state
  return (
    <>
      <div className="viz-caption">
        components = {components} · parent = [{parent.join(' ')}]
      </div>
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
      <div className="legend">
        <span className="key"><span className="swatch amber" /> root (its own parent)</span>
        <span className="key"><span className="swatch mint" /> on a find() walk</span>
        <span className="key"><span className="swatch" /> tree member</span>
        <span className="key"><span className="swatch mint" /> mint arrow = pointer just rewired</span>
      </div>
    </>
  )
}

export const unionFind: AlgorithmModule<UFState> = {
  id: 'union-find',
  name: 'Union-Find (DSU)',
  tagline: 'Answer "are these two connected?" in near-constant time, even as new edges keep arriving.',
  category: 'Graphs',
  icon: '🤝',
  intuition: [
    'Imagine clubs merging at a school. Each member remembers just one person — whoever recruited them — and only the founder remembers no one. To check whether two students are in the same club, each follows their recruiter chain up to a founder and you compare founders. When two clubs merge, nobody re-registers: one founder simply starts reporting to the other, and instantly every member of both clubs shares a root.',
    'The invariant is that every component is a tree whose root is its unique representative — so "connected?" reduces to "same root?". Two tricks keep root-finding cheap. Union by rank never lets a tall tree hide under a short one, and only grows rank on exact ties, so a rank-k root must command at least 2^k nodes. Path compression makes every find() rewire the nodes it visits to point nearer the root — reads literally repair the structure while answering the query.',
    'Reach for Union-Find when connectivity questions are interleaved with merges: edges streaming in (Redundant Connection), grouping equivalence classes (Accounts Merge, equality equations), cycle detection in Kruskal\'s MST, or grid cells flooding in over time. If you only need connectivity once on a static graph, BFS/DFS is enough — DSU shines when the graph keeps changing underneath your queries.',
  ],
  pseudocode: [
    'parent[i] ← i, rank[i] ← 0 for every node   // n components',
    'find(x):',
    '    while parent[x] ≠ x:',
    '        parent[x] ← parent[parent[x]]   // path compression',
    '        x ← parent[x]',
    '    return x',
    'union(a, b):',
    '    ra ← find(a); rb ← find(b)',
    '    if ra = rb: already connected — stop',
    '    attach lower-rank root under higher   // union by rank',
    '    on a rank tie: winner\'s rank += 1',
    '    components ← components − 1',
  ],
  complexity: {
    time: 'O(α(n)) amortized per op',
    space: 'O(n)',
    explanation:
      'Union by rank alone caps tree height at log n: rank only increases on ties, so a root of rank k sits on at least 2^k nodes — height can\'t outrun the node count. Path compression then flattens whatever rank allowed, and the two together amortize to the inverse Ackermann function α(n), which is ≤ 4 for any n that fits in the universe. Memory is just the two arrays, parent and rank.',
  },
  generateSteps,
  Visualizer,
  problems: [
    { title: 'Number of Connected Components in an Undirected Graph', difficulty: 'Medium', leetcodeId: 323, hint: 'Start with n components, run union per edge, and count how many merges actually succeed.' },
    { title: 'Redundant Connection', difficulty: 'Medium', leetcodeId: 684, hint: 'The first edge whose endpoints already share a root is the one closing a cycle — return it.' },
    { title: 'Accounts Merge', difficulty: 'Medium', leetcodeId: 721, hint: 'Union accounts that share an email; each final root is one real person\'s merged account.' },
    { title: 'Number of Provinces', difficulty: 'Medium', leetcodeId: 547, hint: 'Union every pair the adjacency matrix marks as friends; provinces = distinct roots left.' },
    { title: 'Graph Valid Tree', difficulty: 'Medium', leetcodeId: 261, hint: 'A tree is exactly n−1 edges with zero failed unions — any union of an already-joined pair means a cycle.' },
    { title: 'Longest Consecutive Sequence', difficulty: 'Medium', leetcodeId: 128, hint: 'Union each number with its neighbor value+1; the answer is the largest component size.' },
    { title: 'Most Stones Removed with the Same Row or Column', difficulty: 'Medium', leetcodeId: 947, hint: 'Union stones sharing a row or column; each component lets you remove all but one stone.' },
    { title: 'Satisfiability of Equality Equations', difficulty: 'Medium', leetcodeId: 990, hint: 'Union variables from every "a==b" first, then any "a!=b" with matching roots is a contradiction.' },
    { title: 'Swim in Rising Water', difficulty: 'Hard', leetcodeId: 778, hint: 'Binary search the water level (or add cells by height) and use DSU to test when start and end connect.' },
    { title: 'Number of Islands II', difficulty: 'Hard', leetcodeId: 305, hint: 'Each added land cell starts as a new component, then unions with adjacent land — report the live count.' },
    { title: 'Smallest String With Swaps', difficulty: 'Medium', leetcodeId: 1202, hint: 'Swappable index pairs form components; sort the characters within each component independently.' },
  ],
}
