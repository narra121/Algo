import type { CSSProperties } from 'react'
import type { AlgorithmModule, Step } from '../../core/types'

/* Canonical example: shortest path through a 6×8 grid maze from S (top-left)
   to T (bottom-right), expanding outward one wave at a time. */

const ROWS = 6
const COLS = 8

/* '#' = wall, 'S' = start, 'T' = target, '.' = open floor. */
const MAZE = [
  'S..#....',
  '.#.#.##.',
  '.#......',
  '.####.#.',
  '....#.#.',
  '..#...#T',
]

const START = 0 // r*COLS + c of S → (0,0)
const TARGET = 5 * COLS + 7 // (5,7)

const isWall = (r: number, c: number) => MAZE[r][c] === '#'
const idx = (r: number, c: number) => r * COLS + c

type Phase = 'explore' | 'found' | 'trace' | 'done'

interface BFSState {
  /** dist[r][c] = wave number when first reached, or -1 if untouched. */
  dist: number[][]
  /** Cell indices (r*COLS+c) discovered in the current wave — the frontier. */
  frontier: number[]
  /** Current wave / distance number. */
  wave: number
  /** How many cells the queue holds right now. */
  queueSize: number
  /** Reconstructed shortest path (cell indices), filled during trace/done. */
  path: number[]
  phase: Phase
}

const copyDist = (d: number[][]) => d.map((row) => [...row])

function generateSteps(): Step<BFSState>[] {
  const steps: Step<BFSState>[] = []
  const dist: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(-1))
  const parent = new Map<number, number>()

  dist[0][0] = 0
  let frontier: number[] = [START]

  steps.push({
    state: { dist: copyDist(dist), frontier: [...frontier], wave: 0, queueSize: 1, path: [], phase: 'explore' },
    description:
      'Start at S with distance 0 — it is the only cell in the queue. BFS will pour outward like water: every cell in wave k is exactly k moves from S, no exceptions.',
    codeLine: 0,
  })

  steps.push({
    state: { dist: copyDist(dist), frontier: [...frontier], wave: 0, queueSize: 1, path: [], phase: 'explore' },
    description:
      'Dequeue S and inspect its 4 neighbors: up and left are out of bounds, but right (0,1) and down (1,0) are open floor — they will form the first wave.',
    codeLine: 2,
  })

  let wave = 0
  let found = false
  while (frontier.length > 0 && !found) {
    const next: number[] = []
    for (const cell of frontier) {
      const r = Math.floor(cell / COLS)
      const c = cell % COLS
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        const nr = r + dr
        const nc = c + dc
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue
        if (isWall(nr, nc) || dist[nr][nc] !== -1) continue
        dist[nr][nc] = wave + 1
        parent.set(idx(nr, nc), cell)
        next.push(idx(nr, nc))
      }
    }
    wave++
    found = next.includes(TARGET)

    let description: string
    if (found) {
      description = `Wave ${wave} touches T! The very first time BFS reaches a cell IS its shortest distance — so T is exactly ${wave} moves from S, and no cheaper route can exist (a cheaper one would have arrived in an earlier wave).`
    } else if (wave === 1) {
      description = `Wave 1: dequeue S and enqueue its ${next.length} open neighbors — right and down. Both get distance 1. The wall at column 3 already fences off the top-right; the flood must find a way around.`
    } else if (wave === 5) {
      description = `Wave 5: the ${frontier.length} frontier cells fan out into ${next.length} new cells, all stamped distance 5. The flood has split — one arm crawls down the left edge, another squeezes through the corridor in row 2.`
    } else if (wave === 8) {
      description = `Wave 8: ${next.length} cells get distance 8 — the widest wave yet. The arm that threaded the row-2 corridor now wraps back up into the top-right pocket the walls had sealed off. No cell is ever visited twice.`
    } else {
      description = `Wave ${wave}: the ${frontier.length} frontier cell${frontier.length === 1 ? '' : 's'} at distance ${wave - 1} each check up/down/left/right; ${next.length} unvisited open neighbor${next.length === 1 ? '' : 's'} get${next.length === 1 ? 's' : ''} distance ${wave} and join the queue.`
    }

    steps.push({
      state: { dist: copyDist(dist), frontier: [...next], wave, queueSize: next.length, path: [], phase: found ? 'found' : 'explore' },
      description,
      codeLine: found ? 3 : 6,
    })
    frontier = next
  }

  // Reconstruct the path by walking parent links from T back to S.
  const path: number[] = []
  let cur: number | undefined = TARGET
  while (cur !== undefined) {
    path.push(cur)
    cur = parent.get(cur)
  }
  path.reverse()

  const half = path.slice(Math.floor(path.length / 2))
  steps.push({
    state: { dist: copyDist(dist), frontier: [], wave, queueSize: 0, path: [...half], phase: 'trace' },
    description: `Every cell remembered which neighbor discovered it. Start at T (distance ${wave}) and hop to its parent (${wave - 1}), then ${wave - 2}, ${wave - 3}… — each parent link moves exactly one wave closer to S, so the walk-back cannot wander.`,
    codeLine: 7,
  })

  steps.push({
    state: { dist: copyDist(dist), frontier: [], wave, queueSize: 0, path: [...path], phase: 'trace' },
    description: `The walk-back reaches S at distance 0, revealing one concrete shortest route of ${path.length} cells — read the highlighted distances and they count up 0, 1, 2, … ${wave} with no gaps.`,
    codeLine: 7,
  })

  steps.push({
    state: { dist: copyDist(dist), frontier: [], wave, queueSize: 0, path: [...path], phase: 'done' },
    description: `Done: shortest path is ${wave} moves. BFS examined each open cell at most once and still PROVED minimality — because waves leave in strict distance order, nothing at distance ${wave} can be dequeued before everything at distance ${wave - 1}.`,
    codeLine: 7,
  })

  return steps
}

const CELL_STYLE: CSSProperties = {
  width: 34,
  height: 34,
  minWidth: 34,
  padding: 0,
  fontSize: 12.5,
  borderRadius: 7,
}

function Visualizer({ step }: { step: Step<BFSState> }) {
  const { dist, frontier, wave, queueSize, path, phase } = step.state
  const onPath = new Set(path)
  const inFrontier = new Set(frontier)

  return (
    <>
      <div className="viz-caption">
        {phase === 'explore' && `wave ${wave} · queue holds ${queueSize} cell${queueSize === 1 ? '' : 's'}`}
        {phase === 'found' && `target reached · distance = ${wave}`}
        {(phase === 'trace' || phase === 'done') && `shortest path = ${wave} moves (${path.length} cells)`}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, 34px)`,
          gap: 5,
          justifyContent: 'center',
          padding: '14px 0',
        }}
      >
        {MAZE.flatMap((row, r) =>
          row.split('').map((ch, c) => {
            const i = idx(r, c)
            const d = dist[r][c]
            let cls = 'cell'
            if (ch === '#') cls += ' bad'
            else if ((phase === 'trace' || phase === 'done') && onPath.has(i)) cls += ' window'
            else if (i === TARGET) cls += inFrontier.has(i) ? ' warm' : d >= 0 ? ' done' : ' warm'
            else if (inFrontier.has(i)) cls += ' active'
            else if (d >= 0) cls += ' done'
            let label = ''
            if (ch === 'S') label = 'S'
            else if (ch === 'T') label = 'T'
            else if (ch === '#') label = ''
            else if (d >= 0) label = String(d)
            return (
              <div key={i} className={cls} style={CELL_STYLE}>
                {label}
              </div>
            )
          })
        )}
      </div>
      <div className="legend">
        <span className="key"><span className="swatch mint" /> frontier (this wave)</span>
        <span className="key"><span className="swatch amber" /> target T</span>
        <span className="key"><span className="swatch rose" /> wall</span>
        <span className="key"><span className="swatch sky" /> shortest path</span>
        <span className="key"><span className="swatch" /> unexplored</span>
      </div>
    </>
  )
}

export const bfs: AlgorithmModule<BFSState> = {
  id: 'bfs',
  name: 'Breadth-First Search',
  tagline: 'Explore in expanding waves — the first time you reach something is the shortest way there.',
  category: 'Graphs',
  icon: '🌊',
  intuition: [
    'Drop a pebble into a still pond and watch the ripple spread: it reaches everything one meter away before anything two meters away, everything two meters away before anything at three. BFS is that ripple running through a graph — it visits every node one edge away, then every node two edges away, and so on, never skipping ahead.',
    'The key invariant is that the queue always holds nodes in non-decreasing distance order. When a node comes off the queue at distance k, everything at distance k − 1 has already been processed — so the FIRST time you ever touch a node, you have provably arrived by a shortest route. That is why BFS can mark a node visited immediately and never reconsider it: any later arrival would only be longer.',
    'Reach for BFS whenever every move costs the same and you want "fewest steps": shortest path in a maze or grid, fewest word transformations, fewest lock turns, levels of a tree. If you can phrase the problem as "states connected by unit-cost moves", BFS finds the minimum. (Multi-source variants start the ripple from several pebbles at once; weighted edges instead call for Dijkstra.)',
  ],
  pseudocode: [
    'dist[S] ← 0; queue ← [S]',
    'while queue is not empty:',
    '    cell ← dequeue(queue)',
    '    if cell = T: break — first arrival is shortest',
    '    for each neighbor (up, down, left, right):',
    '        if in bounds, not a wall, not yet visited:',
    '            dist[nbr] ← dist[cell] + 1; enqueue(nbr)',
    'walk parent links back from T to recover the path',
  ],
  complexity: {
    time: 'O(V + E)',
    space: 'O(V)',
    explanation:
      'Each cell enters the queue at most once (it is stamped with a distance the moment it is discovered, and stamped cells are skipped), so dequeues total V. Each dequeue inspects only its own edges, so edge checks total E — on a grid that is at most 4 per cell. The queue and the dist/parent tables are the memory: in the worst case a whole wave (a constant fraction of V) sits in the queue at once.',
  },
  generateSteps,
  Visualizer,
  problems: [
    { title: 'Binary Tree Level Order Traversal', difficulty: 'Medium', leetcodeId: 102, hint: 'Each BFS wave is exactly one tree level — snapshot the queue size to slice levels apart.' },
    { title: 'Number of Islands', difficulty: 'Medium', leetcodeId: 200, hint: 'Each BFS flood from an unvisited land cell paints one whole island; count the floods.' },
    { title: 'Rotting Oranges', difficulty: 'Medium', leetcodeId: 994, hint: 'Multi-source BFS: seed the queue with ALL rotten oranges; the wave number is the minute count.' },
    { title: 'Word Ladder', difficulty: 'Hard', leetcodeId: 127, hint: 'Words are nodes, one-letter edits are edges — BFS gives the fewest transformations.' },
    { title: 'Shortest Path in Binary Matrix', difficulty: 'Medium', leetcodeId: 1091, hint: 'Same grid flood as here, but with 8 neighbor directions instead of 4.' },
    { title: '01 Matrix', difficulty: 'Medium', leetcodeId: 542, hint: 'Flip the question: BFS outward from every 0 at once, and each 1 gets its nearest-zero distance.' },
    { title: 'Open the Lock', difficulty: 'Medium', leetcodeId: 752, hint: 'Each 4-digit state has 8 neighbors (each wheel ±1); BFS finds the fewest turns, skipping deadends.' },
    { title: 'Minimum Knight Moves', difficulty: 'Medium', leetcodeId: 1197, hint: 'The knight\'s 8 jumps are unit-cost edges on an infinite board — BFS waves count the moves.' },
    { title: 'Walls and Gates', difficulty: 'Medium', leetcodeId: 286, hint: 'Multi-source BFS from every gate simultaneously fills each room with its nearest-gate distance.' },
    { title: 'Perfect Squares', difficulty: 'Medium', leetcodeId: 279, hint: 'Treat numbers as nodes and "subtract a square" as an edge — BFS depth is the answer.' },
    { title: 'Clone Graph', difficulty: 'Medium', leetcodeId: 133, hint: 'BFS the original while a visited-map doubles as the old-node → copy registry.' },
  ],
}
