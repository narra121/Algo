import type { CSSProperties } from 'react'
import type { AlgorithmModule, Step, VarEntry } from '../../core/types'
import { naiveDemo, dfsFirstDemo, greedyDemo, idDemo } from './demos'
import { ROWS, COLS, MAZE, START, TARGET, isWall, idx } from './data'

/* Canonical example: shortest path through a 6×8 grid maze from S (top-left)
   to T (bottom-right), expanding outward one wave at a time. */

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

/* ── helpers for narration + the variables panel ────────────────────────── */

const DIRS = [
  [-1, 0, 'up'],
  [1, 0, 'down'],
  [0, -1, 'left'],
  [0, 1, 'right'],
] as const

/** Open (non-wall) cells in the maze — 33 on this grid. */
const OPEN_CELLS = MAZE.join('').split('').filter((ch) => ch !== '#').length

const cellName = (i: number): string =>
  i === START ? 'S' : i === TARGET ? 'T' : `(${Math.floor(i / COLS)},${i % COLS})`

const fmtQueue = (cells: number[]): string => `[${cells.map(cellName).join(', ')}]`
const fmtPath = (cells: number[]): string => cells.map(cellName).join('→')

interface LiveVars {
  cell: string
  distCell: string
  queue: string
  visited: string
  distT: string
  path: string
}

/** Same six pseudocode variables, in the same order, on every step. */
const mkVars = (v: LiveVars, changed: string[] = []): VarEntry[] => {
  const ch = new Set(changed)
  return [
    { name: 'cell', value: v.cell, changed: ch.has('cell') },
    { name: 'dist[cell]', value: v.distCell, changed: ch.has('dist[cell]') },
    { name: 'queue', value: v.queue, changed: ch.has('queue') },
    { name: 'visited', value: v.visited, changed: ch.has('visited') },
    { name: 'dist[T]', value: v.distT, changed: ch.has('dist[T]') },
    { name: 'path', value: v.path, changed: ch.has('path') },
  ]
}

function generateSteps(): Step<BFSState>[] {
  const steps: Step<BFSState>[] = []
  const dist: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(-1))
  const parent = new Map<number, number>()

  dist[0][0] = 0
  let frontier: number[] = [START]
  let stamped = 1
  let distT = '—'
  const visitedStr = () => `${stamped} / ${OPEN_CELLS} cells`

  steps.push({
    state: { dist: copyDist(dist), frontier: [...frontier], wave: 0, queueSize: 1, path: [], phase: 'explore' },
    description:
      'Goal: find the FEWEST moves from S (top-left) to T (bottom-right) through this 6×8 maze, stepping up/down/left/right around the walls. Start at S(0,0): dist[S] ← 0 and S is the only cell in the queue. BFS will pour outward like water — every cell in wave k is exactly k moves from S, no exceptions.',
    codeLine: 0,
    vars: mkVars(
      { cell: '—', distCell: '—', queue: '[S]', visited: visitedStr(), distT, path: '—' },
      ['queue', 'visited'],
    ),
  })

  let wave = 0
  let found = false
  let dequeues = 0
  let lastCellName = '—'
  let lastDistCell = '—'

  while (frontier.length > 0 && !found) {
    const next: number[] = []
    for (let fi = 0; fi < frontier.length; fi++) {
      const cell = frontier[fi]
      const r = Math.floor(cell / COLS)
      const c = cell % COLS
      const clauses: string[] = []
      let gained = 0
      let touchedT = false

      for (const [dr, dc, dir] of DIRS) {
        const nr = r + dr
        const nc = c + dc
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) {
          clauses.push(`${dir} is off the grid`)
          continue
        }
        if (isWall(nr, nc)) {
          clauses.push(`${dir} (${nr},${nc}) is a wall`)
          continue
        }
        if (dist[nr][nc] !== -1) {
          clauses.push(`${dir} (${nr},${nc}) was already stamped ${dist[nr][nc]} — first touch was final, skip it`)
          continue
        }
        dist[nr][nc] = wave + 1
        parent.set(idx(nr, nc), cell)
        next.push(idx(nr, nc))
        stamped++
        gained++
        if (idx(nr, nc) === TARGET) {
          touchedT = true
          clauses.push(`${dir} is T(5,7) itself — open, stamped ${wave + 1} and enqueued`)
        } else {
          clauses.push(`${dir} (${nr},${nc}) is open — stamped ${wave + 1} and enqueued`)
        }
      }

      if (touchedT) distT = String(wave + 1)
      dequeues++

      const who = cell === START ? 'S(0,0)' : `(${r},${c})`
      let lead: string
      if (cell === START) {
        lead = 'Dequeue S(0,0), the only distance-0 cell; whatever it first-touches is exactly 1 move from S, and that number is final.'
      } else {
        const leads = [
          `Dequeue ${who} at distance ${wave} — any cell it first-touches now is provably ${wave + 1} moves from S, sealed on contact.`,
          `Next out of the queue is ${who} (distance ${wave}); its four sides are checked in up/down/left/right order.`,
          `Dequeue ${who} (distance ${wave}); whatever is still unstamped around it joins wave ${wave + 1}.`,
        ]
        lead = leads[dequeues % leads.length]
      }
      const body = clauses.join('; ')
      let tail = ''
      if (touchedT) {
        tail = ` First touch IS shortest: a cheaper route to T would have arrived in an earlier wave, and none did.`
      } else if (gained === 0) {
        tail = ' Nothing new — every side is a wall, an edge, or already stamped; this arm of the flood is spent.'
      }
      const description = `${lead} ${body.charAt(0).toUpperCase()}${body.slice(1)}.${tail}`

      lastCellName = cellName(cell)
      lastDistCell = String(wave)
      const queueAfter = [...frontier.slice(fi + 1), ...next]

      steps.push({
        state: { dist: copyDist(dist), frontier: [...next], wave: wave + 1, queueSize: queueAfter.length, path: [], phase: 'explore' },
        description,
        codeLine: gained > 0 ? 6 : 5,
        vars: mkVars(
          { cell: lastCellName, distCell: lastDistCell, queue: fmtQueue(queueAfter), visited: visitedStr(), distT, path: '—' },
          gained > 0
            ? touchedT
              ? ['cell', 'dist[cell]', 'queue', 'visited', 'dist[T]']
              : ['cell', 'dist[cell]', 'queue', 'visited']
            : ['cell', 'dist[cell]', 'queue'],
        ),
      })
    }

    wave++
    found = next.includes(TARGET)

    if (found) {
      steps.push({
        state: { dist: copyDist(dist), frontier: [...next], wave, queueSize: next.length, path: [], phase: 'found' },
        description: `Wave ${wave} is complete — and T is in it! The very first time BFS reaches a cell IS its shortest distance, so T is exactly ${wave} moves from S and no cheaper route can exist (it would have arrived in an earlier wave). Everything still queued is also distance ${wave}, so the moment T comes off the queue the loop breaks.`,
        codeLine: 3,
        vars: mkVars(
          { cell: lastCellName, distCell: lastDistCell, queue: fmtQueue(next), visited: visitedStr(), distT, path: '—' },
          [],
        ),
      })
    } else {
      const names = next.map(cellName).join(', ')
      const tail =
        wave % 2 === 1
          ? `The queue now holds exactly this frontier — and nothing cheaper is left anywhere ahead of it.`
          : `None of them was ever touched before, which is precisely why ${wave} is already their final shortest distance.`
      steps.push({
        state: { dist: copyDist(dist), frontier: [...next], wave, queueSize: next.length, path: [], phase: 'explore' },
        description: `Wave ${wave} is complete: ${next.length} cell${next.length === 1 ? '' : 's'} — ${names} — now hold${next.length === 1 ? 's' : ''} distance ${wave}. ${tail}`,
        codeLine: 1,
        vars: mkVars(
          { cell: lastCellName, distCell: lastDistCell, queue: fmtQueue(next), visited: visitedStr(), distT, path: '—' },
          [],
        ),
      })
    }
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

  const leftoverQueue = fmtQueue(frontier)
  const half = path.slice(Math.floor(path.length / 2))
  steps.push({
    state: { dist: copyDist(dist), frontier: [], wave, queueSize: 0, path: [...half], phase: 'trace' },
    description: `Every cell remembered which neighbor discovered it. Start at T (distance ${wave}) and hop parent by parent — ${fmtPath([...half].reverse())} — each link lands exactly one wave closer to S, so the walk-back cannot wander.`,
    codeLine: 7,
    vars: mkVars(
      { cell: lastCellName, distCell: lastDistCell, queue: leftoverQueue, visited: visitedStr(), distT, path: fmtPath(half) },
      ['path'],
    ),
  })

  steps.push({
    state: { dist: copyDist(dist), frontier: [], wave, queueSize: 0, path: [...path], phase: 'trace' },
    description: `The walk-back reaches S at distance 0. Read forward, the route is ${fmtPath(path)} — ${path.length} cells whose stamped distances count up 0, 1, 2, … ${wave} with no gaps.`,
    codeLine: 7,
    vars: mkVars(
      { cell: lastCellName, distCell: lastDistCell, queue: leftoverQueue, visited: visitedStr(), distT, path: fmtPath(path) },
      ['path'],
    ),
  })

  steps.push({
    state: { dist: copyDist(dist), frontier: [], wave, queueSize: 0, path: [...path], phase: 'done' },
    description: `Done: the shortest path is ${wave} moves — found and PROVED minimal after touching ${stamped} of the ${OPEN_CELLS} open cells, each at most once, versus the 165 backtracking steps a try-every-route search burns on this same maze. The proof is free: the queue releases cells in non-decreasing distance order, so nothing at distance ${wave} can be dequeued before everything at distance ${wave - 1}.`,
    codeLine: 7,
    vars: mkVars(
      { cell: lastCellName, distCell: lastDistCell, queue: leftoverQueue, visited: visitedStr(), distT, path: fmtPath(path) },
      [],
    ),
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
  problem: {
    title: 'Shortest path in a maze — fewest moves from S to T',
    statement:
      'You are dropped at S in the top-left corner of a 6×8 maze where 15 of the 48 cells are walls. Moving one cell at a time (up, down, left, or right — never through a wall), what is the FEWEST moves needed to reach T in the bottom-right corner, and which route achieves it? That exact question is what the animation below is solving, live.',
    input: 'A 6×8 grid with 15 wall cells; start S at (0,0), target T at (5,7); every move costs exactly 1.',
    output: 'The minimum number of moves — here, 12 — plus one concrete 12-move route from S to T.',
    naive: {
      description:
        'Exhaustive backtracking — try every route and keep the shortest: this tiny maze hides 6 distinct wall-free routes (12, 16, 18, 20, 24, and 26 moves long), and enumerating them burns 165 steps wandering into dead ends.',
      pseudocode: [
        'best ← ∞',
        'explore(cell, moves, visited):',
        '    if cell = T: best ← min(best, moves); return',
        '    for each open neighbor not in visited:',
        '        explore(neighbor, moves + 1, visited ∪ {cell})',
        'explore(S, 0, ∅)',
        'return best',
      ],
      time: 'O(branchᵈᵉᵖᵗʰ) — exponential',
      space: 'O(path length)',
      issues:
        'It cannot declare ANY answer final until every last route is exhausted — only after seeing all 6 routes can it swear nothing beats 12. The same cell gets re-walked once per route that passes through it, so shared prefixes are re-explored again and again, and the route count explodes exponentially as the maze grows. BFS earns the same minimality guarantee by visiting each of the 33 reachable cells exactly once.',
      demo: naiveDemo,
    },
  },
  aha:
    'Because BFS finishes EVERY cell at distance k before touching any cell at distance k+1, the first time it reaches a cell is provably the shortest way there — so each cell can be sealed forever on first touch. One visit per cell (33 here) buys the minimality guarantee that brute force needs all 165 backtracking steps to earn.',
  journey: [
    {
      title: 'Quit at the first route DFS finds',
      spark:
        'The brute force only hurts because it refuses to stop — it walks all 6 routes before swearing 12 is minimal. A path is a path: return the first one DFS finds and skip the other five.',
      pseudocode: [
        'explore(cell, moves, visited):',
        '    if cell = T: return moves',
        '    for each open neighbor not in visited:',
        '        result ← explore(neighbor, moves + 1, visited ∪ {cell})',
        '        if result found: return result',
        'return explore(S, 0, ∅)',
      ],
      time: 'O(V + E)',
      space: 'O(V)',
      verdict: 'fail',
      breaks:
        'Which route comes back first is an accident of neighbor ordering, not of length. On this exact maze, a DFS that tries down before right returns a 20-move route; prefer down-then-left and it proudly returns 26 — more than double the true 12. A right-first order happens to luck into 12 here, which is the most dangerous outcome of all: it looks correct until the next maze.',
      insight:
        'DFS commits to one route all the way to the end before trying another, so "first found" carries no distance information. To make first-found mean something, you must control the ORDER in which routes get explored.',
      demo: dfsFirstDemo,
    },
    {
      title: 'Steer greedily toward the target',
      spark:
        'If ordering is the problem, bias it: from each cell, always step to the unvisited neighbor that closes the row+col gap to T. Head down-and-right and the first arrival should be a short one.',
      pseudocode: [
        'cell ← S, moves ← 0',
        'while cell ≠ T:',
        '    cell ← unvisited open neighbor closest to T',
        '              (by row + column distance)',
        '    if no neighbor closes the gap: stuck',
        '    moves ← moves + 1',
      ],
      time: 'O(V) — when it survives',
      space: 'O(V)',
      verdict: 'fail',
      breaks:
        'Walls do not care about geometry. From S, down and right both leave the gap at 11 — a coin flip. Pick down and the walk slides along the left edge to (5,1), where after 6 moves it is wedged: (5,2) is a wall, and the only open neighbor (4,1) moves AWAY from T, which the rule forbids. Pick right and it threads the 12-move route — pure luck; the rule cannot tell a corridor from a dead end.',
      insight:
        'Local direction cannot be trusted in a maze. The only quantity that never lies is the move count itself — so organize the search by distance walked, not by compass heading.',
      demo: greedyDemo,
    },
    {
      title: 'Iterative deepening — cap the depth, raise the cap',
      spark:
        'If distance should drive the search, enforce it: run DFS with a hard cap of 1 move, then 2, then 3… The first cap that reaches T is, by construction, the exact shortest distance.',
      pseudocode: [
        'for cap ← 1, 2, 3, …:',
        '    if depthLimitedDFS(S, cap) reaches T:',
        '        return cap',
        'depthLimitedDFS: ordinary DFS that',
        '    refuses to descend past depth = cap',
      ],
      time: 'O(branchᶜᵃᵖ) per cap, re-run 12 times',
      space: 'O(cap)',
      verdict: 'partial',
      breaks:
        'Finally correct: cap 12 is the first to touch T, and that PROVES 12 is minimal without enumerating all 6 routes. But every new cap restarts from scratch, so caps 1 through 12 burn 259 cell visits on this maze — even more than the 165 the exhaustive search took — because the cells near S get re-walked twelve times over.',
      insight:
        'The cap idea is exactly right — finish distance 1 completely, then distance 2, then 3. The waste is the restart. Keep each finished distance layer alive, and grow the next layer directly from it.',
      demo: idDemo,
    },
    {
      title: 'BFS — expand the whole frontier one wave at a time',
      spark:
        'Do not restart — remember. Hold every cell at distance k in a queue, and build distance k+1 by expanding each of them exactly once. Each cell is discovered by the earliest wave that can possibly reach it.',
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
      time: 'O(V + E)',
      space: 'O(V)',
      verdict: 'optimal',
      breaks:
        'Nothing is re-walked and nothing is guessed: each of the 33 reachable cells is stamped with a distance the moment it is first touched and never enters the queue again. The queue releases cells in non-decreasing distance order, so when wave 12 touches T, everything at distance 11 is already finished — a cheaper route would have arrived in an earlier wave. 33 visits buy the proof that cost backtracking 165 steps.',
      insight:
        'First touch IS the shortest distance, sealed forever — which is exactly the aha below.',
      demo: { generateSteps, Visualizer },
    },
  ],
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
