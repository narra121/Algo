import type { ReactElement } from 'react'
import type { AttemptDemo, Step } from '../../core/types'
import { N } from './data'

/* ─────────────────────────────────────────────────────────────────────────────
   Shared board renderer
   Replicates the exact grid markup and CSS classes from index.tsx's Visualizer
   so demo boards look native — same 46 px cells, same checker-stripe tint,
   same legend swatches.
─────────────────────────────────────────────────────────────────────────────── */

interface BoardCellInfo {
  hasQueen: boolean
  isTry: boolean       // amber — square being tested
  isConflict: boolean  // rose — attacker
  isRemoved: boolean   // rose — lifted/dead-end
  solved: boolean
}

function BoardGrid({
  caption,
  cells,
  legend,
}: {
  caption: string
  cells: BoardCellInfo[]
  legend: ReactElement
}): ReactElement {
  const squares: ReactElement[] = []
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const { hasQueen, isTry, isConflict, isRemoved, solved } = cells[r * N + c]
      let cls = 'cell'
      if (isConflict) cls += ' bad'
      else if (isRemoved) cls += ' bad'
      else if (hasQueen) cls += solved ? ' done' : ' active'
      else if (isTry) cls += ' warm'

      const glyph = hasQueen || isTry ? '♛' : isRemoved ? '✕' : ''
      const plain = cls === 'cell'
      squares.push(
        <div
          key={`${r}-${c}`}
          className={cls}
          style={{
            width: 46,
            height: 46,
            minWidth: 46,
            padding: 0,
            fontSize: 22,
            ...(plain && (r + c) % 2 === 1 ? { background: 'rgba(124, 143, 255, 0.16)' } : {}),
          }}
        >
          {glyph}
        </div>,
      )
    }
  }
  return (
    <>
      <div className="viz-caption">{caption}</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${N}, 46px)`,
          gridAutoRows: '46px',
          gap: 6,
          justifyContent: 'center',
          padding: '18px 0',
        }}
      >
        {squares}
      </div>
      {legend}
    </>
  )
}

/** Build a flat N×N BoardCellInfo array from placed queens + optional highlight positions. */
function makeCells(
  queens: number[],
  tryPos: [number, number] | null = null,
  conflictPos: [number, number] | null = null,
  removedPos: [number, number] | null = null,
  solved = false,
): BoardCellInfo[] {
  const cells: BoardCellInfo[] = []
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      cells.push({
        hasQueen: r < queens.length && queens[r] === c,
        isTry: tryPos !== null && tryPos[0] === r && tryPos[1] === c,
        isConflict: conflictPos !== null && conflictPos[0] === r && conflictPos[1] === c,
        isRemoved: removedPos !== null && removedPos[0] === r && removedPos[1] === c,
        solved,
      })
    }
  }
  return cells
}

/** Build cells for a full N-queen board (cols[r] = column of queen in row r),
 *  optionally marking a pair of rows as conflicting. */
function makeFullBoardCells(
  cols: number[],
  conflictRows: [number, number] | null = null,
  solved = false,
): BoardCellInfo[] {
  const cells: BoardCellInfo[] = []
  const conflictSet = conflictRows ? new Set(conflictRows) : new Set<number>()
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const isQueenCell = c === cols[r]
      const inConflict = isQueenCell && conflictSet.has(r)
      cells.push({
        hasQueen: isQueenCell && !inConflict,
        isTry: false,
        isConflict: inConflict,
        isRemoved: false,
        solved: isQueenCell && solved,
      })
    }
  }
  return cells
}

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 1 — Naive brute force
   Enumerate every way to choose 4 squares from 16, validate the whole board.
   C(16, 4) = 1,820 boards; show 10 real boards then truncate.

   codeLine indexes problem.naive.pseudocode:
     0: 'for each way to place 4 queens on the 16 squares:'
     1: '    ok ← true'
     2: '    for each pair of queens (p, q):'
     3: '        if p, q share a row, column, or diagonal:'
     4: '            ok ← false'
     5: '    if ok: return this board'
─────────────────────────────────────────────────────────────────────────────── */

interface NaiveState {
  /** Four (row,col) queen positions for the current board under inspection. */
  placement: [number, number][]
  /** First conflicting pair found, or null if valid. */
  conflict: [[number, number], [number, number]] | null
  /** How many boards have been checked so far. */
  checked: number
  /** True on the final summary step. */
  done: boolean
}

function checkNaiveBoard(placement: [number, number][]): [[number, number], [number, number]] | null {
  for (let a = 0; a < placement.length - 1; a++) {
    for (let b = a + 1; b < placement.length; b++) {
      const [ar, ac] = placement[a]
      const [br, bc] = placement[b]
      if (ar === br || ac === bc || Math.abs(ar - br) === Math.abs(ac - bc)) {
        return [placement[a], placement[b]]
      }
    }
  }
  return null
}

function naiveSteps(): Step<NaiveState>[] {
  const steps: Step<NaiveState>[] = []
  const TOTAL = 1820  // C(16, 4)
  const SHOW_LIMIT = 10

  // Intro sentinel
  steps.push({
    state: { placement: [], conflict: null, checked: 0, done: false },
    description: `Brute force: pick any 4 of the 16 squares and validate afterwards. C(16, 4) = ${TOTAL} boards to examine — each needing up to 6 pair-checks, roughly 11,000 checks in all. Start generating.`,
    codeLine: 0,
  })

  // Build the list of 16 squares in row-major order
  const squares: [number, number][] = []
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      squares.push([r, c])

  let checked = 0
  let shown = 0

  outer:
  for (let a = 0; a < squares.length - 3; a++) {
    for (let b = a + 1; b < squares.length - 2; b++) {
      for (let c = b + 1; c < squares.length - 1; c++) {
        for (let d = c + 1; d < squares.length; d++) {
          checked++
          const placement: [number, number][] = [squares[a], squares[b], squares[c], squares[d]]
          const conflict = checkNaiveBoard(placement)

          if (shown < SHOW_LIMIT) {
            shown++
            const posStr = placement.map(([r, cc]) => `(${r},${cc})`).join(' ')
            const desc = conflict
              ? `Board ${checked}: queens at ${posStr}. Pair (${conflict[0][0]},${conflict[0][1]}) and (${conflict[1][0]},${conflict[1][1]}) share a ${conflict[0][0] === conflict[1][0] ? 'row' : conflict[0][1] === conflict[1][1] ? 'column' : 'diagonal'} — reject.`
              : `Board ${checked}: queens at ${posStr}. All 6 pairs pass — a valid placement!`
            steps.push({
              state: { placement, conflict, checked, done: false },
              description: desc,
              codeLine: conflict ? 3 : 5,
            })
            if (!conflict) break outer
          }

          if (shown === SHOW_LIMIT) break outer
        }
      }
    }
  }

  // Truncation step
  steps.push({
    state: { placement: [], conflict: null, checked: TOTAL, done: false },
    description: `…and so on — ${TOTAL} boards built and pair-checked. A conflict visible after 2 placements is rediscovered on every board that contains that same doomed prefix. ~11,000 checks total.`,
    codeLine: 2,
  })

  // Final verdict
  steps.push({
    state: { placement: [[0,1],[1,3],[2,0],[3,2]], conflict: null, checked: TOTAL, done: true },
    description: `Done. 1 valid board found among ${TOTAL}: queens at columns [1, 3, 0, 2]. Cost: roughly 11,000 pair-checks. Backtracking finds the same answer after touching just 26 squares.`,
    codeLine: 5,
  })

  return steps
}

function NaiveViz({ step }: { step: Step<NaiveState> }) {
  const { placement, conflict, checked, done } = step.state

  // Build cells: placed queens as active, conflicting queens as conflict (rose)
  const conflictSet = new Set<string>()
  if (conflict) {
    conflictSet.add(`${conflict[0][0]},${conflict[0][1]}`)
    conflictSet.add(`${conflict[1][0]},${conflict[1][1]}`)
  }

  const cells: BoardCellInfo[] = []
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const placed = placement.some(([pr, pc]) => pr === r && pc === c)
      const inConflict = placed && conflictSet.has(`${r},${c}`)
      cells.push({
        hasQueen: placed && !inConflict,
        isTry: false,
        isConflict: inConflict,
        isRemoved: false,
        solved: done && placement.length > 0 && !conflict,
      })
    }
  }

  const caption = done
    ? `${checked} boards checked · answer: columns [1, 3, 0, 2]`
    : placement.length === 0
      ? `board ${checked} · no queens yet`
      : `board ${checked} · ${placement.map(([r, c]) => `(${r},${c})`).join(' ')}`

  const legend = (
    <div className="legend">
      <span className="key"><span className="swatch mint" /> placed queen</span>
      <span className="key"><span className="swatch rose" /> conflicting pair</span>
      <span className="key"><span className="swatch" /> empty square</span>
    </div>
  )

  return <BoardGrid caption={caption} cells={cells} legend={legend} />
}

export const naiveDemo: AttemptDemo<NaiveState> = { generateSteps: naiveSteps, Visualizer: NaiveViz }

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 2 — Row rule: one queen per row, 4^4 = 256 boards
   Enumerate (c0,c1,c2,c3) ∈ {0..3}^4, validate the whole finished board.

   codeLine indexes journey[0].pseudocode:
     0: 'for each (c0, c1, c2, c3) in 0..3 × 0..3 × 0..3 × 0..3:'
     1: '    ok ← true'
     2: '    for each pair of rows (r, s):'
     3: '        if their queens share a column or diagonal: ok ← false'
     4: '    if ok: return this board'
─────────────────────────────────────────────────────────────────────────────── */

interface RowRuleState {
  cols: number[]                   // column choices for all 4 rows (empty = no board yet)
  conflict: [number, number] | null  // first conflicting row-pair, or null
  checked: number
  done: boolean
}

function checkRowBoard(cols: number[]): [number, number] | null {
  for (let r = 0; r < cols.length - 1; r++) {
    for (let s = r + 1; s < cols.length; s++) {
      if (cols[r] === cols[s] || Math.abs(r - s) === Math.abs(cols[r] - cols[s])) {
        return [r, s]
      }
    }
  }
  return null
}

function rowRuleSteps(): Step<RowRuleState>[] {
  const steps: Step<RowRuleState>[] = []
  const TOTAL = N ** N  // 256
  const SHOW_LIMIT = 10

  // Intro sentinel
  steps.push({
    state: { cols: [], conflict: null, checked: 0, done: false },
    description: `Row rule: one queen per row — choose a column for each of the 4 rows. 4^4 = ${TOTAL} boards instead of 1,820 — a real improvement. But verdicts still arrive only after the board is fully built.`,
    codeLine: 0,
  })

  let checked = 0
  let shown = 0

  outer:
  for (let c0 = 0; c0 < N; c0++) {
    for (let c1 = 0; c1 < N; c1++) {
      for (let c2 = 0; c2 < N; c2++) {
        for (let c3 = 0; c3 < N; c3++) {
          checked++
          const cols = [c0, c1, c2, c3]
          const conflict = checkRowBoard(cols)

          if (shown < SHOW_LIMIT) {
            shown++
            const clashType = conflict
              ? (cols[conflict[0]] === cols[conflict[1]] ? 'same column' : 'diagonal')
              : ''
            const desc = conflict
              ? `Board ${checked}: columns [${cols.join(', ')}]. Rows ${conflict[0]} and ${conflict[1]} clash (${clashType}) — reject.`
              : `Board ${checked}: columns [${cols.join(', ')}]. All 6 pairs pass — valid board!`
            steps.push({
              state: { cols, conflict, checked, done: false },
              description: desc,
              codeLine: conflict ? 3 : 4,
            })
            if (!conflict) break outer
          }

          if (shown === SHOW_LIMIT) break outer
        }
      }
    }
  }

  // Truncation step — mirrors the breaks text
  steps.push({
    state: { cols: [], conflict: null, checked: TOTAL, done: false },
    description: `…and so on — ${TOTAL} boards checked. The prefix [c0=0, c1=0] is a column clash visible after 2 placements; it appears in 16 of the 256 boards and is rediscovered 16 separate times. Up to ~1,500 pair-checks versus backtracking's 26 squares.`,
    codeLine: 2,
  })

  // Final verdict
  steps.push({
    state: { cols: [1, 3, 0, 2], conflict: null, checked: TOTAL, done: true },
    description: `Answer: columns [1, 3, 0, 2]. Correct — but ${TOTAL} complete boards built and validated. Backtracking touches just 26 squares and undoes only 4 placements.`,
    codeLine: 4,
  })

  return steps
}

function RowRuleViz({ step }: { step: Step<RowRuleState> }) {
  const { cols, conflict, checked, done } = step.state

  let cells: BoardCellInfo[]
  if (cols.length === N) {
    cells = makeFullBoardCells(
      cols,
      conflict,
      done && !conflict,
    )
  } else {
    // Intro or truncation frame — empty board
    cells = makeCells([])
  }

  const caption = done
    ? `${checked} boards checked · answer: [1, 3, 0, 2]`
    : cols.length === N
      ? `board ${checked} · columns [${cols.join(', ')}]`
      : `board ${checked} · …`

  const legend = (
    <div className="legend">
      <span className="key"><span className="swatch mint" /> placed queen</span>
      <span className="key"><span className="swatch rose" /> conflicting queen</span>
      <span className="key"><span className="swatch" /> empty square</span>
    </div>
  )

  return <BoardGrid caption={caption} cells={cells} legend={legend} />
}

export const rowRuleDemo: AttemptDemo<RowRuleState> = { generateSteps: rowRuleSteps, Visualizer: RowRuleViz }

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 3 — Greedy: check-as-you-place, commit to first safe column per row
   Honest run until row 2 finds no safe column — the exact dead end from breaks.

   codeLine indexes journey[1].pseudocode:
     0: 'for row in 0 .. 3:'
     1: '    col ← first column in this row not attacked'
     2: '    if no such column: return "no solution"'
     3: '    place queen at (row, col)    # and never look back'
     4: 'return the board'
─────────────────────────────────────────────────────────────────────────────── */

interface GreedyState {
  queens: number[]                      // columns of placed queens (index = row)
  tryPos: [number, number] | null       // square currently being checked
  attackedBy: [number, number] | null   // placed queen that attacks tryPos
  deadEnd: boolean                      // true when a row has no safe column
  caption: string
}

function greedyAttacker(queens: number[], row: number, col: number): [number, number] | null {
  for (let r = 0; r < queens.length; r++) {
    const c = queens[r]
    if (c === col || Math.abs(row - r) === Math.abs(col - c)) return [r, c]
  }
  return null
}

function greedySteps(): Step<GreedyState>[] {
  const steps: Step<GreedyState>[] = []
  const queens: number[] = []

  const snap = (over: Partial<GreedyState>): GreedyState => ({
    queens: [...queens],
    tryPos: null,
    attackedBy: null,
    deadEnd: false,
    caption: '',
    ...over,
  })

  // Intro sentinel
  steps.push({
    state: snap({ caption: 'board empty · row 0 next' }),
    description: `Greedy: walk row by row, commit to the FIRST safe column found, and never revise a choice. Start at row 0.`,
    codeLine: 0,
  })

  let hitDeadEnd = false

  for (let row = 0; row < N; row++) {
    let placed = false

    for (let col = 0; col < N; col++) {
      const attacker = greedyAttacker(queens, row, col)
      if (attacker) {
        const [ar, ac] = attacker
        const why = ac === col
          ? `queen at row ${ar} owns column ${col}`
          : `queen at (${ar},${ac}) sees it diagonally`
        steps.push({
          state: snap({ tryPos: [row, col], attackedBy: attacker, caption: `row ${row} · col ${col} attacked` }),
          description: `Row ${row}, col ${col}: attacked — ${why}. Skip.`,
          codeLine: 1,
        })
        continue
      }

      // Safe — commit
      queens.push(col)
      steps.push({
        state: snap({ tryPos: [row, col], caption: `row ${row} · commit to col ${col}` }),
        description: `Row ${row}, col ${col}: safe. Greedy commits here and never looks back. Queen ${queens.length} placed at (${row},${col}).`,
        codeLine: 3,
      })
      placed = true
      break
    }

    if (!placed) {
      hitDeadEnd = true
      // Show the dead end: queens so far + all 4 columns in this row marked as attacked
      // Use deadEnd flag so the visualizer can highlight every cell in the stuck row
      steps.push({
        state: snap({ deadEnd: true, caption: `row ${row} · every column attacked — dead end` }),
        description: `Row ${row}: col 0 shares the column with (0,0); col 1 is on a diagonal from (1,2); col 2 shares the column with (1,2); col 3 is on a diagonal from (1,2). Every square in row ${row} is attacked. Greedy returns "no solution" — yet [1, 3, 0, 2] solves the board. Each pick was locally safe; together they paint the algorithm into a corner it cannot escape.`,
        codeLine: 2,
      })
      break
    }
  }

  if (!hitDeadEnd) {
    // Should not fire for this input; included for completeness
    steps.push({
      state: snap({ caption: 'board complete' }),
      description: `All ${N} queens placed — done.`,
      codeLine: 4,
    })
  }

  return steps
}

function GreedyViz({ step }: { step: Step<GreedyState> }) {
  const { queens, tryPos, attackedBy, deadEnd, caption } = step.state

  let cells: BoardCellInfo[]

  if (deadEnd) {
    // Queens placed so far (active/mint), all squares in the stuck row as warm (amber)
    // to convey "all blocked" without the rose 'bad' class (which means lifted/removed)
    const stuckRow = queens.length
    cells = []
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const isQueenHere = r < stuckRow && queens[r] === c
        const isStuck = r === stuckRow
        cells.push({
          hasQueen: isQueenHere,
          isTry: isStuck,      // amber: all 4 columns shown as "tried and attacked"
          isConflict: false,
          isRemoved: false,
          solved: false,
        })
      }
    }
  } else {
    cells = makeCells(queens, tryPos, attackedBy)
  }

  const legend = (
    <div className="legend">
      <span className="key"><span className="swatch mint" /> committed queen</span>
      <span className="key"><span className="swatch rose" /> attacker</span>
      <span className="key"><span className="swatch amber" /> tried / all-blocked row</span>
    </div>
  )

  return <BoardGrid caption={caption} cells={cells} legend={legend} />
}

export const greedyDemo: AttemptDemo<GreedyState> = { generateSteps: greedySteps, Visualizer: GreedyViz }
