import type { CSSProperties } from 'react'
import type { AttemptDemo, Step, VarEntry } from '../../core/types'
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

/* ── shared helpers for narration + the variables panel ─────────────────── */

const cellName = (i: number): string =>
  i === START ? 'S' : i === TARGET ? 'T' : `(${Math.floor(i / COLS)},${i % COLS})`

const fmtPath = (cells: number[]): string => cells.map(cellName).join('→')

/** Same names in the same order on every step of a generator; mark changed ones. */
function mkVars(entries: [string, string][], changed: string[] = []): VarEntry[] {
  const ch = new Set(changed)
  return entries.map(([name, value]) => ({ name, value, changed: ch.has(name) }))
}

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 1 — Naive brute-force (exhaustive backtracking)
   Honest simulation: plays EVERY route to the end — all 6 routes
   (12, 16, 18, 20, 24, 26 moves) across 165 recursive calls, no truncation.

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

/** Enumerate all S→T routes via DFS, recording each complete route and the grand total of calls. */
function enumerateRoutes(): { routes: { path: number[]; stepsBefore: number }[]; totalCalls: number } {
  const routes: { path: number[]; stepsBefore: number }[] = []
  let calls = 0

  function dfs(cell: number, visited: Set<number>, path: number[]): void {
    calls++
    if (cell === TARGET) {
      routes.push({ path: [...path], stepsBefore: calls })
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
  return { routes, totalCalls: calls }
}

function naiveSteps(): Step<NaiveState>[] {
  const steps: Step<NaiveState>[] = []
  const { routes, totalCalls } = enumerateRoutes()
  const lengthsFound = routes.map((r) => r.path.length - 1)
  const sorted = [...lengthsFound].sort((a, b) => a - b)
  const best = sorted[0]

  // A cell (other than S and T) that lies on every completed route — real, computed.
  let common = routes[0].path.filter((c) => c !== START && c !== TARGET)
  for (const route of routes.slice(1)) {
    const inRoute = new Set(route.path)
    common = common.filter((c) => inRoute.has(c))
  }
  const sharedCell = common.length > 0 ? cellName(common[0]) : null

  const nVars = (route: string, length: string, found: string, calls: string, changed: string[] = []) =>
    mkVars([['route', route], ['length', length], ['routes found', found], ['calls', calls]], changed)

  // Sentinel intro
  steps.push({
    state: { currentPath: [], routeLengths: [], totalSteps: 0, done: false },
    description:
      `Exhaustive backtracking: try every wall-free route from S to T, keeping the shortest. This 6×8 maze hides exactly ${routes.length} distinct routes — lengths ${sorted.join(', ')} moves — and the search will burn ${totalCalls} recursive calls wandering into dead ends before it can swear ${best} is minimal. Watch every one of them fall out, in the exact order the DFS discovers them.`,
    codeLine: 0,
    vars: nVars('—', '—', '[]', '0'),
  })

  for (let i = 0; i < routes.length; i++) {
    const { path, stepsBefore } = routes[i]
    const moves = path.length - 1
    const seen = lengthsFound.slice(0, i + 1)

    let description: string
    if (i === 0) {
      description =
        `Route 1 found after ${stepsBefore} recursive calls: ${moves} moves — the wandering first route is the LONGEST of all ${routes.length}. Down-first ordering dragged it down the left wall, across the bottom, up columns 5 and 4 to the top row, then down the right edge. Enumeration has no idea better routes exist until it tries every remaining branch.`
    } else {
      const prev = routes[i - 1]
      let k = 0
      while (k < prev.path.length && k < path.length && prev.path[k] === path[k]) k++
      const branch = cellName(path[k - 1])
      const burned = stepsBefore - prev.stepsBefore
      const shortestNote =
        moves === best
          ? ' This is, in fact, the shortest route of all — but the search cannot know that until every branch is closed.'
          : ' The minimum cannot be trusted until every branch is exhausted.'
      description =
        `Route ${i + 1} found: ${moves} moves (cumulative calls: ${stepsBefore}). The ${burned} calls since route ${i} backtracked out of route ${i}'s tail and probed dead branches before this route emerged — it keeps route ${i}'s first ${k - 1} moves and diverges at ${branch}. Lengths so far: [${seen.join(', ')}].${shortestNote}`
    }

    steps.push({
      state: { currentPath: [...path], routeLengths: seen, totalSteps: stepsBefore, done: false },
      description,
      codeLine: 2,
      vars: nVars(fmtPath(path), String(moves), `[${seen.join(', ')}]`, String(stepsBefore), [
        'route',
        'length',
        'routes found',
        'calls',
      ]),
    })
  }

  // Final verdict — real totals, shown only AFTER every route was played out above.
  const last = routes[routes.length - 1]
  const lastFoundAt = last.stepsBefore
  const finishNote =
    totalCalls === lastFoundAt
      ? `Fittingly, the optimal ${last.path.length - 1}-move route was the very LAST thing found — on the ${totalCalls}th and final recursive call; only once that branch closed could the search stop.`
      : `The final ${totalCalls - lastFoundAt} calls after route ${routes.length} were spent confirming no further route exists.`
  steps.push({
    state: { currentPath: [], routeLengths: lengthsFound, totalSteps: totalCalls, done: true },
    description:
      `Done: all ${routes.length} routes are in — sorted, [${sorted.join(', ')}] — so the minimum is ${best} moves, proved only after ${totalCalls} recursive calls. ${finishNote}${sharedCell ? ` ${sharedCell} lies on every one of the ${routes.length} routes and was walked once per route.` : ''} BFS earns the same proof by visiting each of the 33 reachable cells exactly once.`,
    codeLine: 6,
    vars: nVars(fmtPath(last.path), String(last.path.length - 1), `[${lengthsFound.join(', ')}]`, String(totalCalls)),
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
    ? `all ${routeLengths.length} routes found · best = ${Math.min(...routeLengths)} moves · ${totalSteps} total steps`
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
   DFS tries DOWN first → returns the 20-move route, played move by move.
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

type DFSMove = { from: number; to: number; checks: string[] }

/**
 * DFS down-first ([down, right, left, up] order), logging every move with the
 * neighbor checks that produced it. On this maze the down-first DFS reaches T
 * without ever dead-ending, so the recursion never backtracks — the log below
 * IS the exact execution, move for move.
 */
function dfsWalk(): DFSMove[] {
  const moves: DFSMove[] = []
  const visited = new Set([START])
  let cur = START

  while (cur !== TARGET) {
    const r = Math.floor(cur / COLS)
    const c = cur % COLS
    const checks: string[] = []
    let chosen = -1
    for (const [dr, dc, dir] of [
      [1, 0, 'down'],
      [0, 1, 'right'],
      [0, -1, 'left'],
      [-1, 0, 'up'],
    ] as const) {
      const nr = r + dr
      const nc = c + dc
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) {
        checks.push(`${dir} is off the grid`)
        continue
      }
      const next = idx(nr, nc)
      if (isWall(nr, nc)) {
        checks.push(`${dir} (${nr},${nc}) is a wall`)
        continue
      }
      if (visited.has(next)) {
        checks.push(`${dir} (${nr},${nc}) is already on the path`)
        continue
      }
      chosen = next
      checks.push(
        next === TARGET
          ? `${dir} (${nr},${nc}) is open — and it is T itself`
          : `${dir} (${nr},${nc}) is open — recurse into it without trying the rest`
      )
      break
    }
    if (chosen === -1) break // unreachable on this maze: the walk never dead-ends
    moves.push({ from: cur, to: chosen, checks })
    visited.add(chosen)
    cur = chosen
  }

  return moves
}

function dfsSteps(): Step<DFSState>[] {
  const steps: Step<DFSState>[] = []
  const walk = dfsWalk()
  const fullPath = [START, ...walk.map((m) => m.to)]
  const totalMoves = fullPath.length - 1

  const dVars = (path: string, depth: string, changed: string[] = []) =>
    mkVars([['path', path], ['depth', depth]], changed)

  // Sentinel intro
  steps.push({
    state: { visited: [START], currentPath: [START], foundPath: [], phase: 'exploring' },
    description:
      'DFS modified to quit at the first route found instead of enumerating the other 5. The idea: any path is a path — why walk all 6? The flaw: "first found" depends entirely on which direction DFS happens to try first. This DFS checks down, then right, then left, then up — watch every one of its 20 moves.',
    codeLine: 0,
    vars: dVars('S', '0', ['path', 'depth']),
  })

  const tails = [
    'Down-first keeps dragging the walk toward the bottom-left, away from the short row-2 corridor.',
    'DFS is committed: this branch will be followed to its very end before any earlier turn is reconsidered.',
    'Still no dead end — every cell so far had an open neighbor to dive into, so nothing forces a rethink.',
  ]

  for (let i = 0; i < walk.length; i++) {
    const m = walk[i]
    const partial = fullPath.slice(0, i + 2)
    const reachedT = m.to === TARGET
    const checksText = m.checks.join('; ')

    let description: string
    if (i === 0) {
      description =
        'Move 1: from S, down (1,0) is open, so DFS recurses into it immediately — right (0,1), the very first step of the true 12-move route, is never even examined, because down already succeeded.'
    } else if (reachedT) {
      description =
        `Move ${i + 1}: at ${cellName(m.from)} — ${checksText}. DFS reaches T after ${totalMoves} moves and returns this route immediately as "the answer." The optimal 12-move corridor through row 2 was never explored.`
    } else {
      description = `Move ${i + 1}: at ${cellName(m.from)} — ${checksText}. ${tails[i % tails.length]}`
    }

    steps.push({
      state: {
        visited: [...partial],
        currentPath: [...partial],
        foundPath: reachedT ? [...fullPath] : [],
        phase: reachedT ? 'found' : 'exploring',
      },
      description,
      codeLine: reachedT ? 1 : 3,
      vars: dVars(fmtPath(partial), String(i + 1), ['path', 'depth']),
    })
  }

  // Verdict step
  steps.push({
    state: { visited: fullPath, currentPath: [], foundPath: fullPath, phase: 'found' },
    description:
      `Verdict: DFS returned ${totalMoves} moves — 8 longer than the true shortest path of 12. A right-first DFS on this same maze would return 12 by pure luck. "First found" carries no distance guarantee; it is purely an accident of neighbor order. To make first-found meaningful, you must control the ORDER routes are explored — by distance walked, not by DFS direction.`,
    codeLine: 4,
    vars: dVars(fmtPath(fullPath), String(totalMoves)),
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

  const gVars = (cell: string, moves: string, gap: string, changed: string[] = []) =>
    mkVars([['cell', cell], ['moves', moves], ['gap', gap]], changed)

  // Sentinel intro
  steps.push({
    state: { visited: [START], current: START, rejected: [], stuck: false },
    description:
      'Greedy navigation: at each cell, step to the unvisited open neighbor that most closes the row+col gap to T. If no neighbor closes the gap, the walk is stuck. Starting at S, gap = 12 — both down (1,0) and right (0,1) leave a gap of 11, so down wins the tie.',
    codeLine: 0,
    vars: gVars('S', '0', '12', ['cell', 'moves']),
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
        vars: gVars(cellName(w.cell), String(visited.length - 1), String(curGap)),
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
        vars: gVars(cellName(w.chosen), String(visited.length - 1), String(nextGap), ['cell', 'moves', 'gap']),
      })
    }
  }

  // Final verdict
  const last = visited[visited.length - 1]
  const lastGap = (5 - Math.floor(last / COLS)) + (7 - (last % COLS))
  steps.push({
    state: {
      visited,
      current: last,
      rejected: [],
      stuck: true,
    },
    description:
      'Verdict: the greedy walk reaches (5,1) after exactly 6 moves and gets irreversibly stuck. It chose down every time because the gap kept shrinking — each step felt optimal locally, but together they boxed the search into the bottom-left corner. Only a search ordered by DISTANCE WALKED — not by compass heading — can guarantee shortest-path.',
    codeLine: 5,
    vars: gVars(cellName(last), String(visited.length - 1), String(lastGap)),
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
   Every cap from 1 to 12 is played for real — per-cap visit counts, new cells
   reached, and the running re-walk tally. Total: 259 cell visits vs BFS's 33.

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

/** Run IDDFS and collect per-cap results plus the path that finally reached T. */
function simulateIDDFS(): { caps: CapResult[]; foundPath: number[] } {
  const results: CapResult[] = []
  let foundPath: number[] = []

  function dlDFS(
    cell: number,
    depth: number,
    cap: number,
    visited: Set<number>,
    log: number[],
    path: number[]
  ): boolean {
    log.push(cell)
    if (cell === TARGET) {
      foundPath = [...path]
      return true
    }
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
      path.push(next)
      if (dlDFS(next, depth + 1, cap, visited, log, path)) return true
      path.pop()
      visited.delete(next)
    }
    return false
  }

  for (let cap = 1; cap <= 12; cap++) {
    const log: number[] = []
    dlDFS(START, 0, cap, new Set([START]), log, [START])
    results.push({ cap, visits: log.length, visitedCells: log })
    if (log.includes(TARGET)) break
  }

  return { caps: results, foundPath }
}

function idSteps(): Step<IDState>[] {
  const steps: Step<IDState>[] = []
  const { caps, foundPath } = simulateIDDFS()
  const totalVisits = caps.reduce((s, r) => s + r.visits, 0)
  const finalCap = caps[caps.length - 1].cap
  const bruteCalls = enumerateRoutes().totalCalls

  const iVars = (cap: string, path: string, reWalked: string, cumulative: string, changed: string[] = []) =>
    mkVars(
      [['cap', cap], ['path', path], ['cells re-walked', reWalked], ['cumulative visits', cumulative]],
      changed
    )

  // Sentinel intro
  steps.push({
    state: { cap: 0, visitedThisCap: [], cumulativeVisits: 0, found: false, done: false },
    description:
      'Iterative deepening: run a depth-limited DFS with cap = 1, then restart with cap = 2, then cap = 3 — raising the cap by one each round until T is reached. The first cap that reaches T is provably the shortest distance — correct by construction. The catch: every new cap restarts from S, re-walking everything the previous caps already covered. Watch all 12 caps run for real.',
    codeLine: 0,
    vars: iVars('—', '—', '0', '0'),
  })

  const seenEver = new Set<number>()
  const entryCounts = new Map<number, number>()
  let cumulative = 0
  let prevCumulative = 0
  let prevReWalked = 0

  for (const result of caps) {
    prevCumulative = cumulative
    cumulative += result.visits

    const newCells: number[] = []
    for (const cell of result.visitedCells) {
      entryCounts.set(cell, (entryCounts.get(cell) ?? 0) + 1)
      if (!seenEver.has(cell)) {
        seenEver.add(cell)
        newCells.push(cell)
      }
    }
    const reWalked = cumulative - seenEver.size
    const found = result.visitedCells.includes(TARGET)

    if (found) {
      // Most re-entered cell across all caps — real, computed.
      let maxCell = START
      let maxCount = 0
      for (const [cell, n] of entryCounts) {
        if (n > maxCount) {
          maxCount = n
          maxCell = cell
        }
      }
      steps.push({
        state: {
          cap: result.cap,
          visitedThisCap: result.visitedCells,
          cumulativeVisits: cumulative,
          found: true,
          done: false,
        },
        description:
          `Cap ${result.cap}: DFS reaches T after ${result.visits} visits this cap — the first cap ever to touch T, so ${result.cap} is PROVED to be the shortest distance. The winning route: ${fmtPath(foundPath)}. The bill: ${cumulative} cumulative visits across caps 1–${result.cap}, of which ${reWalked} were re-entries of already-walked cells; ${cellName(maxCell)} alone was entered ${maxCount} times across the restarts.`,
        codeLine: 1,
        vars: iVars(String(result.cap), fmtPath(foundPath), String(reWalked), String(cumulative), [
          'cap',
          'path',
          'cells re-walked',
          'cumulative visits',
        ]),
      })
    } else {
      const newNames = newCells.slice(0, 3).map(cellName).join(', ')
      const extraNew = newCells.length > 3 ? ` and ${newCells.length - 3} more` : ''
      const crossedBrute = prevCumulative < bruteCalls && cumulative >= bruteCalls
      const tail = crossedBrute
        ? ` Cumulative visits (${cumulative}) have now passed the ${bruteCalls} recursive calls the exhaustive backtracking burned — and T is still unfound.`
        : ` Restart from scratch with cap = ${result.cap + 1}.`
      steps.push({
        state: {
          cap: result.cap,
          visitedThisCap: result.visitedCells,
          cumulativeVisits: cumulative,
          found: false,
          done: false,
        },
        description:
          `Cap ${result.cap}: ${result.visits} visit${result.visits === 1 ? '' : 's'} this cap, ${newCells.length === 0 ? 'not one of them a new cell' : `only ${newCells.length} of them new cell${newCells.length === 1 ? '' : 's'} (${newNames}${extraNew})`} — the other ${result.visits - newCells.length} re-enter cells some earlier walk already covered. T needs 12 moves, still beyond the cap, so the whole search is thrown away.${tail}`,
        codeLine: result.cap === 1 ? 4 : 0,
        vars: iVars(
          String(result.cap),
          '—',
          String(reWalked),
          String(cumulative),
          reWalked !== prevReWalked
            ? ['cap', 'cells re-walked', 'cumulative visits']
            : ['cap', 'cumulative visits']
        ),
      })
    }
    prevReWalked = reWalked
  }

  const finalReWalked = cumulative - seenEver.size

  // Final verdict
  steps.push({
    state: { cap: finalCap, visitedThisCap: [], cumulativeVisits: totalVisits, found: true, done: true },
    description:
      `Verdict: IDDFS is correct — cap ${finalCap} was the first to touch T, proving ${finalCap} is minimal without enumerating all 6 routes. But it cost ${totalVisits} total visits vs BFS's 33. The insight: the cap idea is exactly right — finish distance 1, then 2, then 3. The waste is the restart. If you keep each finished distance layer alive and grow the next layer from it, you get BFS: 33 visits, zero restarts.`,
    codeLine: 2,
    vars: iVars(String(finalCap), fmtPath(foundPath), String(finalReWalked), String(totalVisits)),
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
    ? `cap ${cap} · T found · total visits = ${cumulativeVisits}`
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
