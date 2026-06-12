import type { CSSProperties } from 'react'
import type { AttemptDemo, Step } from '../../core/types'
import { ROWS, COLS, MAZE, START, TARGET, isWall, idx } from './data'

/* ─────────────────────────────────────────────────────────────────────────────
   Shared grid renderer
   Replicates the exact markup and CSS classes from index.tsx's Visualizer so
   demo grids look native — same 34 px cells, same class set, same legend swatches.
   demos.tsx does NOT import ./index.
─────────────────────────────────────────────────────────────────────────────── */

const CELL_STYLE: CSSProperties = {
  width: 34,
  height: 34,
  minWidth: 34,
  padding: 0,
  fontSize: 12.5,
  borderRadius: 7,
}

/** Colour bucket for one cell. */
type CellTone = 'wall' | 'frontier' | 'target' | 'path' | 'visited' | 'start' | 'plain'

interface GridCellInfo {
  label: string
  tone: CellTone
}

interface DemoGridProps {
  caption: string
  cells: GridCellInfo[][]  // [row][col]
  legend: React.ReactElement
}

function DemoGrid({ caption, cells, legend }: DemoGridProps): React.ReactElement {
  return (
    <>
      <div className="viz-caption">{caption}</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, 34px)`,
          gap: 5,
          justifyContent: 'center',
          padding: '14px 0',
        }}
      >
        {cells.flatMap((row, r) =>
          row.map((cell, c) => {
            let cls = 'cell'
            if (cell.tone === 'wall') cls += ' bad'
            else if (cell.tone === 'path') cls += ' window'
            else if (cell.tone === 'target') cls += ' warm'
            else if (cell.tone === 'frontier') cls += ' active'
            else if (cell.tone === 'visited') cls += ' done'
            return (
              <div key={idx(r, c)} className={cls} style={CELL_STYLE}>
                {cell.label}
              </div>
            )
          })
        )}
      </div>
      {legend}
    </>
  )
}

/** Build a fresh ROWS×COLS GridCellInfo grid from scratch. */
function makeGrid(
  dist: number[][],
  highlights: {
    frontier?: Set<number>
    path?: Set<number>
    target?: number
  } = {}
): GridCellInfo[][] {
  const { frontier = new Set(), path = new Set(), target = TARGET } = highlights
  return MAZE.map((row, r) =>
    row.split('').map((ch, c) => {
      const i = idx(r, c)
      const d = dist[r][c]
      let tone: CellTone = 'plain'
      let label = ''

      if (ch === '#') {
        tone = 'wall'
      } else if (path.has(i)) {
        tone = 'path'
        label = d >= 0 ? String(d) : ch === 'S' ? 'S' : ch === 'T' ? 'T' : ''
      } else if (i === target) {
        tone = 'target'
        label = d >= 0 ? String(d) : 'T'
      } else if (frontier.has(i)) {
        tone = 'frontier'
        label = d >= 0 ? String(d) : ''
      } else if (d >= 0) {
        tone = 'visited'
        label = ch === 'S' ? 'S' : String(d)
      }

      return { label, tone }
    })
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 1 — Naive brute-force (exhaustive backtracking)
   Honest simulation: finds all 6 routes (12, 16, 18, 20, 24, 26 moves),
   burns 165 backtracking steps. Truncated after 10 shown routes.

   codeLine indexes problem.naive.pseudocode:
     0: 'best ← ∞'
     1: 'explore(cell, moves, visited):'
     2: '    if cell = T: best ← min(best, moves); return'
     3: '    for each open neighbor not in visited:'
     4: '        explore(neighbor, moves + 1, visited ∪ {cell})'
     5: 'explore(S, 0, ∅)'
     6: 'return best'
─────────────────────────────────────────────────────────────────────────────── */

interface NaiveState {
  /** Cell index path of the most recently completed route, or []. */
  currentPath: number[]
  /** All route lengths found so far. */
  routeLengths: number[]
  /** Total recursive calls (backtracking steps) so far. */
  totalSteps: number
  /** Whether this is the final done step. */
  done: boolean
}

/** Enumerate all S→T routes via DFS, recording each complete route. */
function enumerateRoutes(): { path: number[]; stepsBefore: number }[] {
  const routes: { path: number[]; stepsBefore: number }[] = []
  let steps = 0

  function dfs(cell: number, visited: Set<number>, path: number[]): void {
    steps++
    if (cell === TARGET) {
      routes.push({ path: [...path], stepsBefore: steps })
      return
    }
    const r = Math.floor(cell / COLS)
    const c = cell % COLS
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const nr = r + dr
      const nc = c + dc
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue
      const next = idx(nr, nc)
      if (isWall(nr, nc) || visited.has(next)) continue
      visited.add(next)
      path.push(next)
      dfs(next, visited, path)
      path.pop()
      visited.delete(next)
    }
  }

  const visited = new Set([START])
  dfs(START, visited, [START])
  return routes
}

function naiveSteps(): Step<NaiveState>[] {
  const steps: Step<NaiveState>[] = []

  // Sentinel intro
  steps.push({
    state: { currentPath: [], routeLengths: [], totalSteps: 0, done: false },
    description:
      'Exhaustive backtracking: try every wall-free route from S to T, keeping the shortest. This 6×8 maze hides exactly 6 distinct routes — lengths 12, 16, 18, 20, 24, and 26 moves — and the search burns 165 recursive calls wandering into dead ends before it can swear 12 is minimal.',
    codeLine: 0,
  })

  const routes = enumerateRoutes()
  const SHOW_LIMIT = 6

  let cumulativeSteps = 0
  for (let i = 0; i < Math.min(routes.length, SHOW_LIMIT); i++) {
    const { path, stepsBefore } = routes[i]
    cumulativeSteps = stepsBefore
    const moves = path.length - 1
    const routeLengths = routes.slice(0, i + 1).map((r) => r.path.length - 1)

    steps.push({
      state: { currentPath: path, routeLengths, totalSteps: cumulativeSteps, done: false },
      description:
        i === 0
          ? `Route 1 found after ${cumulativeSteps} recursive calls: ${moves} moves — the wandering first route is the LONGEST of all six. Enumeration has no idea better ones exist until it tries them all; it must keep searching every remaining branch before it can return anything.`
          : `Route ${i + 1} found: ${moves} moves (cumulative calls: ${cumulativeSteps}). So far seen [${routeLengths.join(', ')}] — the brute force must exhaust every branch before returning the minimum.`,
      codeLine: 2,
    })
  }

  // Truncation step
  steps.push({
    state: { currentPath: [], routeLengths: [12, 16, 18, 20, 24, 26], totalSteps: 165, done: false },
    description:
      '…and so on — all 6 routes enumerated after 165 recursive calls. Shared route prefixes are re-walked once per route that passes through them; the cell (2,2), for instance, appears in every route and is entered 6 separate times.',
    codeLine: 3,
  })

  // Final verdict
  steps.push({
    state: { currentPath: [], routeLengths: [12, 16, 18, 20, 24, 26], totalSteps: 165, done: true },
    description:
      'Done: the minimum across all 6 routes is 12 moves — but it took 165 backtracking steps to prove it. BFS earns the same proof by visiting each of the 33 reachable cells exactly once (33 visits), because the first time BFS reaches any cell is provably the shortest distance.',
    codeLine: 6,
  })

  return steps
}

function NaiveViz({ step }: { step: Step<NaiveState> }): React.ReactElement {
  const { currentPath, routeLengths, totalSteps, done } = step.state
  const pathSet = new Set(currentPath)
  const dist = Array.from({ length: ROWS }, () => Array(COLS).fill(-1))
  // Mark S distance 0
  dist[0][0] = 0

  const caption = done
    ? `all 6 routes found · best = 12 moves · 165 total steps`
    : currentPath.length === 0
      ? `starting · steps = ${totalSteps}`
      : `route: ${currentPath.length - 1} moves · steps so far = ${totalSteps}`

  const cells = MAZE.map((row, r) =>
    row.split('').map((ch, c) => {
      const i = idx(r, c)
      let tone: CellTone = 'plain'
      let label = ''
      if (ch === '#') {
        tone = 'wall'
      } else if (pathSet.has(i)) {
        tone = 'path'
        label = ch === 'S' ? 'S' : ch === 'T' ? 'T' : ''
      } else if (ch === 'S') {
        label = 'S'
      } else if (ch === 'T') {
        tone = 'target'
        label = 'T'
      }
      return { label, tone }
    })
  )

  const legend = (
    <div className="legend">
      <span className="key"><span className="swatch sky" /> current route</span>
      <span className="key"><span className="swatch amber" /> target T</span>
      <span className="key"><span className="swatch rose" /> wall</span>
      {routeLengths.length > 0 && (
        <span className="key">routes found: [{routeLengths.join(', ')}]</span>
      )}
    </div>
  )

  return <DemoGrid caption={caption} cells={cells} legend={legend} />
}

export const naiveDemo: AttemptDemo<NaiveState> = { generateSteps: naiveSteps, Visualizer: NaiveViz }

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 2 — DFS first route (journey[0], verdict: fail)
   DFS tries DOWN first → returns the 20-move route.
   Counterexample: that is 8 moves longer than the optimal 12.
   The same grid also shows the 12-move route exists, so "first found ≠ shortest."

   codeLine indexes journey[0].pseudocode:
     0: 'explore(cell, moves, visited):'
     1: '    if cell = T: return moves'
     2: '    for each open neighbor not in visited:'
     3: '        result ← explore(neighbor, moves + 1, visited ∪ {cell})'
     4: '        if result found: return result'
     5: 'return explore(S, 0, ∅)'
─────────────────────────────────────────────────────────────────────────────── */

interface DFSState {
  /** Cells visited so far in DFS order. */
  visited: number[]
  /** Current live path from S to the deepest reached cell. */
  currentPath: number[]
  /** Complete route once T is found, or []. */
  foundPath: number[]
  phase: 'exploring' | 'found'
}

/** DFS down-first: tries [down, right, left, up] order. Returns path from S to T (inclusive). */
function dfsFindFirst(): number[] {
  const result: number[] = []

  function dfs(cell: number, visited: Set<number>, path: number[]): boolean {
    if (cell === TARGET) {
      result.push(...path)
      return true
    }
    const r = Math.floor(cell / COLS)
    const c = cell % COLS
    // DOWN first, then RIGHT, LEFT, UP
    for (const [dr, dc] of [[1, 0], [0, 1], [0, -1], [-1, 0]] as const) {
      const nr = r + dr
      const nc = c + dc
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue
      const next = idx(nr, nc)
      if (isWall(nr, nc) || visited.has(next)) continue
      visited.add(next)
      path.push(next)
      if (dfs(next, visited, path)) return true
      path.pop()
      visited.delete(next)
    }
    return false
  }

  const visited = new Set([START])
  dfs(START, visited, [START])
  return result
}

function dfsSteps(): Step<DFSState>[] {
  const steps: Step<DFSState>[] = []
  const fullPath = dfsFindFirst()
  // fullPath is the 21-cell (20-move) path

  // Sentinel intro
  steps.push({
    state: { visited: [START], currentPath: [START], foundPath: [], phase: 'exploring' },
    description:
      'DFS modified to quit at the first route found, skipping the other 5. The idea: any path is a path — why enumerate all 6? The flaw: "first found" depends entirely on which direction DFS happens to try first.',
    codeLine: 0,
  })

  // Show waypoints along the discovered path: positions 1,3,6,10,15,last
  const WAYPOINTS = [1, 3, 6, 10, 15, fullPath.length - 1]

  let shownFull = false
  for (const wp of WAYPOINTS) {
    const partial = fullPath.slice(0, wp + 1)
    const reached = partial[partial.length - 1]
    const r = Math.floor(reached / COLS)
    const c = reached % COLS

    if (wp === fullPath.length - 1) {
      shownFull = true
      steps.push({
        state: { visited: [...partial], currentPath: [...partial], foundPath: [...fullPath], phase: 'found' },
        description:
          `DFS reaches T after ${fullPath.length - 1} moves — it returns this immediately as "the answer." But a down-first DFS hugged the left edge, then looped through the bottom rows. The optimal 12-move route through row 2 was never explored.`,
        codeLine: 1,
      })
    } else {
      steps.push({
        state: { visited: [...partial], currentPath: [...partial], foundPath: [], phase: 'exploring' },
        description:
          `DFS at (${r},${c}) — ${partial.length - 1} moves from S. Down-first ordering pulls the search toward the bottom-left before it can find the shorter corridor through row 2.`,
        codeLine: 3,
      })
    }
  }

  if (!shownFull) {
    steps.push({
      state: { visited: fullPath, currentPath: fullPath, foundPath: fullPath, phase: 'found' },
      description: `DFS returns ${fullPath.length - 1} moves — the first route it found.`,
      codeLine: 1,
    })
  }

  // Verdict step
  steps.push({
    state: { visited: fullPath, currentPath: [], foundPath: fullPath, phase: 'found' },
    description:
      `Verdict: DFS returned 20 moves — 8 longer than the true shortest path of 12. The right-first DFS on this same maze would return 12 by luck. "First found" carries no distance guarantee; it is purely an accident of neighbor order. To make first-found meaningful, you must control the ORDER routes are explored — by distance walked, not by DFS direction.`,
    codeLine: 4,
  })

  return steps
}

function DFSViz({ step }: { step: Step<DFSState> }): React.ReactElement {
  const { currentPath, foundPath, phase } = step.state
  const activeSet = new Set(phase === 'found' ? foundPath : currentPath)
  const dist = Array.from({ length: ROWS }, () => Array(COLS).fill(-1))

  const caption =
    phase === 'found'
      ? `DFS first route = ${foundPath.length - 1} moves · optimal = 12 moves`
      : `DFS exploring · path length = ${currentPath.length - 1}`

  const cells = MAZE.map((row, r) =>
    row.split('').map((ch, c) => {
      const i = idx(r, c)
      let tone: CellTone = 'plain'
      let label = ''
      if (ch === '#') {
        tone = 'wall'
      } else if (activeSet.has(i)) {
        if (i === TARGET) {
          tone = phase === 'found' ? 'target' : 'frontier'
          label = 'T'
        } else {
          tone = 'path'
          label = ch === 'S' ? 'S' : ''
        }
      } else if (ch === 'S') {
        label = 'S'
      } else if (ch === 'T') {
        tone = 'target'
        label = 'T'
      }
      return { label, tone }
    })
  )

  const legend = (
    <div className="legend">
      <span className="key"><span className="swatch sky" /> DFS route found</span>
      <span className="key"><span className="swatch amber" /> target T</span>
      <span className="key"><span className="swatch rose" /> wall</span>
      <span className="key"><span className="swatch" /> unexplored</span>
    </div>
  )

  return <DemoGrid caption={caption} cells={cells} legend={legend} />
}

export const dfsFirstDemo: AttemptDemo<DFSState> = { generateSteps: dfsSteps, Visualizer: DFSViz }

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 3 — Greedy toward target (journey[1], verdict: fail)
   Rule: step to unvisited open neighbor that strictly closes the row+col gap.
   Walk: S→(1,0)→(2,0)→(3,0)→(4,0)→(5,0)→(5,1) — stuck after 6 moves.
   From (5,1): (5,2) is wall; only open neighbor (4,1) moves AWAY from T.

   codeLine indexes journey[1].pseudocode:
     0: 'cell ← S, moves ← 0'
     1: 'while cell ≠ T:'
     2: '    cell ← unvisited open neighbor closest to T'
     3: '              (by row + column distance)'
     4: '    if no neighbor closes the gap: stuck'
     5: '    moves ← moves + 1'
─────────────────────────────────────────────────────────────────────────────── */

interface GreedyState {
  /** Cells visited in order, including S. */
  visited: number[]
  /** Current cell. */
  current: number
  /** Cells that were rejected because they moved away. */
  rejected: number[]
  /** True when the algorithm is stuck. */
  stuck: boolean
}

type GreedyWalkStep = {
  cell: number
  closingNeighbors: number[]
  awayNeighbors: number[]
  chosen: number | null
  stuck: boolean
}

function simulateGreedy(): GreedyWalkStep[] {
  const walkSteps: GreedyWalkStep[] = []
  const visited = new Set([START])
  let pos = START

  for (let iter = 0; iter < 50; iter++) {
    const r = Math.floor(pos / COLS)
    const c = pos % COLS
    if (pos === TARGET) break
    const curGap = (5 - r) + (7 - c)
    const closing: number[] = []
    const away: number[] = []
    for (const [dr, dc] of [[1, 0], [0, 1], [0, -1], [-1, 0]] as const) {
      const nr = r + dr
      const nc = c + dc
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue
      const next = idx(nr, nc)
      if (isWall(nr, nc) || visited.has(next)) continue
      const g = (5 - nr) + (7 - nc)
      if (g < curGap) closing.push(next)
      else away.push(next)
    }

    if (closing.length === 0) {
      walkSteps.push({ cell: pos, closingNeighbors: [], awayNeighbors: away, chosen: null, stuck: true })
      break
    }

    // Pick minimum gap, prefer down then right
    const minG = Math.min(...closing.map((n) => {
      const nr = Math.floor(n / COLS)
      const nc = n % COLS
      return (5 - nr) + (7 - nc)
    }))
    const best = closing
      .filter((n) => {
        const nr = Math.floor(n / COLS)
        const nc = n % COLS
        return (5 - nr) + (7 - nc) === minG
      })
      .sort((a, b) => {
        // prefer down (larger row) then right (larger col)
        const ar = Math.floor(a / COLS), ac = a % COLS
        const br = Math.floor(b / COLS), bc = b % COLS
        return br - ar || bc - ac
      })[0]

    walkSteps.push({ cell: pos, closingNeighbors: closing, awayNeighbors: away, chosen: best, stuck: false })
    visited.add(best)
    pos = best
  }

  return walkSteps
}

function greedySteps(): Step<GreedyState>[] {
  const steps: Step<GreedyState>[] = []
  const walk = simulateGreedy()

  // Sentinel intro
  steps.push({
    state: { visited: [START], current: START, rejected: [], stuck: false },
    description:
      'Greedy navigation: at each cell, step to the unvisited open neighbor that most closes the row+col gap to T. If no neighbor closes the gap, the walk is stuck. Starting at S — both down (1,0) and right (0,1) leave a gap of 11, so down wins the tie.',
    codeLine: 0,
  })

  const visited: number[] = [START]

  for (let i = 0; i < walk.length; i++) {
    const w = walk[i]
    const r = Math.floor(w.cell / COLS)
    const c = w.cell % COLS
    const curGap = (5 - r) + (7 - c)

    if (w.stuck) {
      steps.push({
        state: { visited: [...visited], current: w.cell, rejected: w.awayNeighbors, stuck: true },
        description:
          `Stuck at (${r},${c}) after ${visited.length - 1} moves — gap = ${curGap}. (5,2) is a wall; the only open neighbor is (4,1), which has gap ${curGap + 1} — it moves AWAY from T. The greedy rule forbids it, so the walk halts and returns "no path." Yet (4,1) is the necessary backtrack that leads to the actual 12-move solution; locally-safe greedy choices earlier have painted the search into this corner.`,
        codeLine: 4,
      })
    } else if (w.chosen !== null) {
      const nr = Math.floor(w.chosen / COLS)
      const nc = w.chosen % COLS
      const nextGap = (5 - nr) + (7 - nc)
      visited.push(w.chosen)
      steps.push({
        state: { visited: [...visited], current: w.chosen, rejected: w.awayNeighbors, stuck: false },
        description:
          `Move ${visited.length - 1}: (${r},${c}) → (${nr},${nc}). Gap closes from ${curGap} to ${nextGap}. ${w.awayNeighbors.length > 0 ? `Rejected ${w.awayNeighbors.map((n) => '(' + Math.floor(n / COLS) + ',' + (n % COLS) + ')').join(', ')} — moved away or already visited.` : ''}`,
        codeLine: 2,
      })
    }
  }

  // Final verdict
  steps.push({
    state: {
      visited,
      current: visited[visited.length - 1],
      rejected: [],
      stuck: true,
    },
    description:
      'Verdict: the greedy walk reaches (5,1) after exactly 6 moves and gets irreversibly stuck. It chose down every time because the gap kept shrinking — each step felt optimal locally, but together they boxed the search into the bottom-left corner. Only a search ordered by DISTANCE WALKED — not by compass heading — can guarantee shortest-path.',
    codeLine: 5,
  })

  return steps
}

function GreedyViz({ step }: { step: Step<GreedyState> }): React.ReactElement {
  const { visited, current, rejected, stuck } = step.state
  const visitedSet = new Set(visited)
  const rejectedSet = new Set(rejected)

  const r = Math.floor(current / COLS)
  const c = current % COLS

  const caption = stuck
    ? `stuck at (${r},${c}) after ${visited.length - 1} moves — gap = ${(5 - r) + (7 - c)}`
    : `greedy step ${visited.length - 1} · at (${r},${c}) · gap = ${(5 - r) + (7 - c)}`

  const cells = MAZE.map((row, ri) =>
    row.split('').map((ch, ci) => {
      const i = idx(ri, ci)
      let tone: CellTone = 'plain'
      let label = ''
      if (ch === '#') {
        tone = 'wall'
      } else if (i === TARGET) {
        tone = 'target'
        label = 'T'
      } else if (i === current && stuck) {
        tone = 'frontier'   // amber = stuck cell
        label = ch === 'S' ? 'S' : String(visited.length - 1)
      } else if (rejectedSet.has(i) && stuck) {
        tone = 'frontier'   // amber = rejected away-neighbor
        label = '?'
      } else if (visitedSet.has(i)) {
        tone = 'path'
        label = ch === 'S' ? 'S' : String(visited.indexOf(i))
      }
      return { label, tone }
    })
  )

  const legend = (
    <div className="legend">
      <span className="key"><span className="swatch sky" /> greedy path walked</span>
      <span className="key"><span className="swatch amber" /> stuck cell / away-neighbor</span>
      <span className="key"><span className="swatch rose" /> wall</span>
      <span className="key"><span className="swatch" /> unexplored</span>
    </div>
  )

  return <DemoGrid caption={caption} cells={cells} legend={legend} />
}

export const greedyDemo: AttemptDemo<GreedyState> = { generateSteps: greedySteps, Visualizer: GreedyViz }

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 4 — Iterative deepening DFS (journey[2], verdict: partial)
   Caps 1, 2, 3 (shown in detail); cap 12 (found). Re-visit counts per cap.
   Total: 259 cell visits across caps 1–12 vs BFS's 33.

   codeLine indexes journey[2].pseudocode:
     0: 'for cap ← 1, 2, 3, …:'
     1: '    if depthLimitedDFS(S, cap) reaches T:'
     2: '        return cap'
     3: 'depthLimitedDFS: ordinary DFS that'
     4: '    refuses to descend past depth = cap'
─────────────────────────────────────────────────────────────────────────────── */

interface IDState {
  /** Current cap being tried. */
  cap: number
  /** Cells visited so far in this cap's DFS (partial snapshot). */
  visitedThisCap: number[]
  /** Cumulative visits across all caps. */
  cumulativeVisits: number
  /** Whether T was found at this cap. */
  found: boolean
  /** Whether this is the final done step. */
  done: boolean
}

type CapResult = { cap: number; visits: number; visitedCells: number[] }

/** Run IDDFS and collect per-cap results. */
function simulateIDDFS(): CapResult[] {
  const results: CapResult[] = []

  function dlDFS(cell: number, depth: number, cap: number, visited: Set<number>, log: number[]): boolean {
    log.push(cell)
    if (cell === TARGET) return true
    if (depth >= cap) return false
    const r = Math.floor(cell / COLS)
    const c = cell % COLS
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const nr = r + dr
      const nc = c + dc
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue
      const next = idx(nr, nc)
      if (isWall(nr, nc) || visited.has(next)) continue
      visited.add(next)
      if (dlDFS(next, depth + 1, cap, visited, log)) return true
      visited.delete(next)
    }
    return false
  }

  for (let cap = 1; cap <= 12; cap++) {
    const log: number[] = []
    const visited = new Set([START])
    dlDFS(START, 0, cap, visited, log)
    results.push({ cap, visits: log.length, visitedCells: log })
    if (log.includes(TARGET)) break
  }

  return results
}

function idSteps(): Step<IDState>[] {
  const steps: Step<IDState>[] = []
  const capResults = simulateIDDFS()

  // Sentinel intro
  steps.push({
    state: { cap: 0, visitedThisCap: [], cumulativeVisits: 0, found: false, done: false },
    description:
      'Iterative deepening: run DFS with a hard cap of 1, then 2, then 3, and so on. The first cap that reaches T is provably the shortest distance — correct by construction. The catch: every new cap restarts from S, so early cells near S get re-walked on every iteration.',
    codeLine: 0,
  })

  // Show caps 1,2,3 individually, then mid-progress summaries at caps 6 and 9, then cap 12 (found)
  const SHOW_CAPS = new Set([1, 2, 3, 6, 9, 12])
  let cumulative = 0
  // Accumulate all results up-front so we can reference earlier cumulative totals
  const allResults = capResults

  for (const result of allResults) {
    cumulative += result.visits
    const show = SHOW_CAPS.has(result.cap) || result.visitedCells.includes(TARGET)

    if (!show) continue

    const found = result.visitedCells.includes(TARGET)

    if (found) {
      steps.push({
        state: {
          cap: result.cap,
          visitedThisCap: result.visitedCells,
          cumulativeVisits: cumulative,
          found: true,
          done: false,
        },
        description:
          `Cap ${result.cap}: DFS reaches T after ${result.visits} visits this cap — first cap to succeed, so ${result.cap} is the shortest distance. Correct! But cumulative visits across caps 1–${result.cap} = ${cumulative}. S alone has been entered 12 times, (0,1) 12 times, (4,1) 14 times — every cap re-walks the cells near S from scratch.`,
        codeLine: 1,
      })
    } else {
      steps.push({
        state: {
          cap: result.cap,
          visitedThisCap: result.visitedCells,
          cumulativeVisits: cumulative,
          found: false,
          done: false,
        },
        description:
          result.cap <= 3
            ? `Cap ${result.cap}: DFS explores ${result.visits} cells within distance ${result.cap} of S — ${result.cap === 1 ? 'S and its 2 open neighbors' : result.cap === 2 ? 'now reaching 5 cells (adds 2 more at depth 2)' : 'now reaching 7 cells (adds 2 more at depth 3)'}. T not reached; restart from S with cap = ${result.cap + 1}.`
            : `Cap ${result.cap}: ${result.visits} visits this cap (cumulative so far: ${cumulative}). The cells closest to S get re-walked yet again${result.cap === 9 ? ' — after 9 caps, cumulative visits (130) already approach the 165 the exhaustive backtracking burned' : ''}. Restart with cap = ${result.cap + 1}.`,
        codeLine: result.cap === 1 ? 4 : 0,
      })
    }
  }

  // Final verdict
  steps.push({
    state: { cap: 12, visitedThisCap: [], cumulativeVisits: 259, found: true, done: true },
    description:
      'Verdict: IDDFS is correct — cap 12 is the first to touch T, proving 12 is minimal. But 259 total visits vs BFS\'s 33. The insight: the cap idea is exactly right — finish distance 1, then 2, then 3. The waste is the restart. If you keep each finished distance layer alive and grow the next layer from it, you get BFS: 33 visits, zero restarts.',
    codeLine: 2,
  })

  return steps
}

function IDViz({ step }: { step: Step<IDState> }): React.ReactElement {
  const { cap, visitedThisCap, cumulativeVisits, found, done } = step.state

  // Show cells visited in this cap's DFS
  const visitedSet = new Set(visitedThisCap)
  const dist = Array.from({ length: ROWS }, () => Array(COLS).fill(-1))

  // Mark visit order for label (use index into visitedThisCap as rough distance)
  // For display, just mark as visited vs. frontier (last cell = current)
  const lastCell = visitedThisCap.length > 0 ? visitedThisCap[visitedThisCap.length - 1] : -1

  const caption = done
    ? `cap 12 · T found · total visits = ${cumulativeVisits}`
    : cap === 0
      ? 'cap 0 · ready to start'
      : found
        ? `cap ${cap} · T reached · cumulative visits = ${cumulativeVisits}`
        : `cap ${cap} · ${visitedThisCap.length} visits · cumulative = ${cumulativeVisits}`

  const cells = MAZE.map((row, r) =>
    row.split('').map((ch, ci) => {
      const i = idx(r, ci)
      let tone: CellTone = 'plain'
      let label = ''
      if (ch === '#') {
        tone = 'wall'
      } else if (ch === 'T') {
        tone = found ? 'target' : visitedSet.has(i) ? 'target' : 'plain'
        label = 'T'
      } else if (i === lastCell && !found) {
        tone = 'frontier'
        label = ch === 'S' ? 'S' : ''
      } else if (visitedSet.has(i)) {
        tone = 'visited'
        label = ch === 'S' ? 'S' : ''
      }
      return { label, tone }
    })
  )

  const legend = (
    <div className="legend">
      <span className="key"><span className="swatch mint" /> DFS frontier (this cap)</span>
      <span className="key"><span className="swatch mint" /> visited this cap</span>
      <span className="key"><span className="swatch amber" /> target T</span>
      <span className="key"><span className="swatch rose" /> wall</span>
    </div>
  )

  return <DemoGrid caption={caption} cells={cells} legend={legend} />
}

export const idDemo: AttemptDemo<IDState> = { generateSteps: idSteps, Visualizer: IDViz }

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 5 — Optimal BFS (journey[3], verdict: optimal)
   journey[3].pseudocode (7 lines) is byte-identical to the first 7 lines of the
   module's main pseudocode array — confirmed by inspection.
   Per the task rules, this reuses the main generateSteps + Visualizer directly,
   wired in index.tsx as: demo: { generateSteps, Visualizer }
   (No export needed here — see index.tsx wiring.)
─────────────────────────────────────────────────────────────────────────────── */
