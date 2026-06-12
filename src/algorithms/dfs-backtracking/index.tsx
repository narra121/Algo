import type { ReactElement } from 'react'
import type { AlgorithmModule, Step, VarEntry } from '../../core/types'
import { naiveDemo, rowRuleDemo, greedyDemo } from './demos'

/* Canonical example: N-Queens on a 4×4 board — place 4 queens so none attack each other. */

const N = 4

interface NQState {
  /** queens[r] = column of the queen placed in row r (only rows 0..queens.length-1 are placed). */
  queens: number[]
  /** Square currently being tried: [row, col], or null. */
  tryPos: [number, number] | null
  /** The already-placed queen that attacks tryPos: [row, col], or null. */
  conflictPos: [number, number] | null
  /** Square a queen was just lifted from during backtracking, or null. */
  removedPos: [number, number] | null
  solved: boolean
  /** Short status line for the viz-caption. */
  caption: string
}

/** First placed queen attacking (row, col), or null if the square is safe. */
function firstAttacker(queens: number[], row: number, col: number): [number, number] | null {
  for (let r = 0; r < queens.length; r++) {
    const c = queens[r]
    if (c === col || Math.abs(row - r) === Math.abs(col - c)) return [r, c]
  }
  return null
}

function generateSteps(): Step<NQState>[] {
  const steps: Step<NQState>[] = []
  const queens: number[] = []
  let squaresTried = 0
  let undos = 0

  const snap = (over: Partial<NQState>): NQState => ({
    queens: [...queens],
    tryPos: null,
    conflictPos: null,
    removedPos: null,
    solved: false,
    caption: '',
    ...over,
  })

  /* Live variables panel: same four names on every step, matching the pseudocode. */
  let prevVars: VarEntry[] | null = null
  const fmtQueens = () =>
    queens.length === 0 ? '[]' : `[${queens.map((c, r) => `r${r}c${c}`).join(', ')}]`
  const mkVars = (row: number | string, col: number | string): VarEntry[] => {
    const raw = [
      { name: 'row', value: String(row) },
      { name: 'col', value: String(col) },
      { name: 'queens', value: fmtQueens() },
      { name: 'conflicts checked', value: String(squaresTried) },
    ]
    const out = raw.map((v) => ({
      ...v,
      changed: prevVars !== null && prevVars.find((p) => p.name === v.name)!.value !== v.value,
    }))
    prevVars = out
    return out
  }

  steps.push({
    state: snap({ caption: 'row 0 · columns 0–3 open' }),
    description: `Goal: place ${N} queens on a ${N}×${N} board so no two share a column or diagonal. Each row gets exactly one queen, so we solve row by row — starting the search at row 0.`,
    codeLine: 0,
    vars: mkVars(0, '—'),
  })

  function solve(row: number): boolean {
    if (row === N) {
      steps.push({
        state: snap({ solved: true, caption: `solved · queen columns = [${queens.join(', ')}]` }),
        description: `Row ${N} reached — all ${N} queens stand at columns ${queens.join(', ')} with zero conflicts. The whole search touched just ${squaresTried} squares and undid only ${undos} placements, while a brute force would have built all ${N ** N} complete one-queen-per-row boards (1,820 if queens could land anywhere) before checking a single one. Every undo pruned an entire subtree of doomed boards.`,
        codeLine: 1,
        vars: mkVars(N, '—'),
      })
      return true
    }
    for (let col = 0; col < N; col++) {
      squaresTried++
      const attacker = firstAttacker(queens, row, col)
      if (attacker) {
        const [ar, ac] = attacker
        const why =
          ac === col
            ? `the queen at row ${ar} already owns column ${col} — a capture straight down`
            : `the queen at (${ar}, ${ac}) sees it diagonally: ${row - ar} rows down, ${Math.abs(col - ac)} column${Math.abs(col - ac) === 1 ? '' : 's'} over`
        steps.push({
          state: snap({ tryPos: [row, col], conflictPos: attacker, caption: `row ${row} · trying col ${col} — attacked` }),
          description: `Row ${row}, col ${col}: ${why}. No point exploring rows ${row + 1}–${N - 1} under a broken board — this column is pruned on the spot.`,
          codeLine: 3,
          vars: mkVars(row, col),
        })
        continue
      }
      queens.push(col)
      steps.push({
        state: snap({ tryPos: [row, col], caption: `row ${row} · placed at col ${col}` }),
        description: `Row ${row}, col ${col}: no placed queen shares this column or diagonal — safe. Commit queen #${row + 1} here and descend to row ${row + 1}. If that choice turns out wrong, we can always take it back.`,
        codeLine: 4,
        vars: mkVars(row, col),
      })
      if (solve(row + 1)) return true
      queens.pop()
      undos++
      const next =
        col + 1 < N
          ? `resume its scan at column ${col + 1}`
          : `row ${row} is now exhausted too, so the failure bubbles up another level`
      steps.push({
        state: snap({ removedPos: [row, col], caption: `backtrack · row ${row} reopened` }),
        description: `No valid square in row ${row + 1} — every column there is attacked while this queen stands. Undo row ${row}: lift the queen off (${row}, ${col}) and ${next}.`,
        codeLine: 6,
        vars: mkVars(row, col),
      })
    }
    return false
  }

  solve(0)
  return steps
}

function Visualizer({ step }: { step: Step<NQState> }) {
  const { queens, tryPos, conflictPos, removedPos, solved, caption } = step.state
  const squares: ReactElement[] = []
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const hasQueen = queens[r] === c
      const isTry = tryPos !== null && tryPos[0] === r && tryPos[1] === c
      const isConflict = conflictPos !== null && conflictPos[0] === r && conflictPos[1] === c
      const isRemoved = removedPos !== null && removedPos[0] === r && removedPos[1] === c

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
      <div className="legend">
        <span className="key"><span className="swatch mint" /> placed queen</span>
        <span className="key"><span className="swatch amber" /> square being tried</span>
        <span className="key"><span className="swatch rose" /> attacker / undone</span>
        <span className="key"><span className="swatch" /> empty square</span>
      </div>
    </>
  )
}

export const dfsBacktracking: AlgorithmModule<NQState> = {
  id: 'dfs-backtracking',
  name: 'DFS & Backtracking',
  tagline: 'Commit to a choice, explore it fully, and undo it the moment it proves wrong.',
  category: 'Recursion & Backtracking',
  icon: '🌿',
  problem: {
    title: 'N-Queens — place 4 non-attacking queens on a 4×4 board',
    statement:
      'You are given an empty 4×4 chessboard and asked: can you place 4 queens on it so that no two attack each other — no shared row, column, or diagonal — and where exactly do they go? That exact question is what the animation below is solving, live, one square at a time.',
    input: 'An empty 4×4 board and 4 queens to place.',
    output:
      'One valid arrangement — here, queens at columns [1, 3, 0, 2] of rows 0–3 (the board\'s only solution up to mirror symmetry).',
    naive: {
      description:
        'Generate every complete board first, check it after: dropping 4 queens on any of the 16 squares gives C(16,4) = 1,820 boards, each needing up to 6 pair-checks — roughly 11,000 checks in all.',
      pseudocode: [
        'for each way to place 4 queens on the 16 squares:',
        '    ok ← true',
        '    for each pair of queens (p, q):',
        '        if p, q share a row, column, or diagonal:',
        '            ok ← false',
        '    if ok: return this board',
      ],
      time: 'O(C(n², n) · n²)',
      space: 'O(n)',
      issues:
        'Verdicts only come on FINISHED boards, so a conflict between the first two queens — visible after two placements — is rediscovered separately on every one of the hundreds of complete boards that contain it. Even the smarter one-queen-per-row version still builds all 4⁴ = 256 finished boards before judging any of them. Backtracking checks after every single placement and discards the whole doomed subtree on the spot, touching just 26 squares total.',
      demo: naiveDemo,
    },
  },
  aha:
    'The instant two queens attack each other, every board you could build on top of that position is ALREADY dead — so one conflict check discards an entire subtree of futures without ever constructing them, and 4 queens fall into place after touching just 26 squares instead of grinding through 256 complete boards.',
  journey: [
    {
      title: 'Bake the row rule into generation — one queen per row',
      spark:
        'Most of those 1,820 boards are silly — they stack two queens in the same row. Two queens can never share a row anyway, so only generate boards with exactly one queen per row: pick a column for each of the 4 rows.',
      pseudocode: [
        'for each (c0, c1, c2, c3) in 0..3 × 0..3 × 0..3 × 0..3:',
        '    ok ← true',
        '    for each pair of rows (r, s):',
        '        if their queens share a column or diagonal: ok ← false',
        '    if ok: return this board',
      ],
      time: 'O(nⁿ · n²)',
      space: 'O(n)',
      verdict: 'partial',
      breaks:
        'Correct, and a real win: 4⁴ = 256 boards instead of 1,820, just by refusing to generate what a constraint already forbids. But verdicts still only come on FINISHED boards. Put queens at (0, 0) and (1, 0) — a column clash you can see after two placements — and 16 of the 256 boards extend that doomed prefix; this loop dutifully builds and rejects all 16, rediscovering the same clash 16 times. At up to 6 pair-checks per board, the full 256-board sweep costs ~1,500 checks, versus the 26 squares the animation touches.',
      insight:
        'Encoding a constraint into HOW you generate beats filtering afterwards — so push that further: check each placement the moment you make it, not after the board is full.',
      demo: rowRuleDemo,
    },
    {
      title: 'Check as you place — and greedily take the first safe square',
      spark:
        'If a clash between rows 0 and 1 is visible after two placements, why finish the board at all? Build row by row, test every square before committing, and just take the first safe column in each row.',
      pseudocode: [
        'for row in 0 .. 3:',
        '    col ← first column in this row not attacked',
        '    if no such column: return "no solution"',
        '    place queen at (row, col)    # and never look back',
        'return the board',
      ],
      time: 'O(n²)',
      space: 'O(n)',
      verdict: 'fail',
      breaks:
        'Run it on this exact board. Row 0: col 0 is safe — take it. Row 1: cols 0 and 1 are attacked, col 2 is safe — take it. Row 2: col 0 shares a column, cols 1 and 3 are on diagonals from (1, 2), col 2 shares a column — every square is attacked. Greedy declares "no solution", yet [1, 3, 0, 2] solves the board. Each pick was locally safe; the combination was a trap it cannot escape.',
      insight:
        'Checking at every placement is exactly right — keep it. What is missing is the power to UNDO: a locally safe choice can doom every future row, so a dead end must send you back to revise the most recent pick, not give up.',
      demo: greedyDemo,
    },
    {
      title: 'Backtracking — commit, explore, and undo on failure',
      spark:
        'Keep the greedy walk, but make every choice reversible: when a row has no safe square, lift the previous queen, try her next column, and only fail upward once a row is truly exhausted.',
      pseudocode: [
        'solve(row):',
        '    if row = N: return true            # all queens placed',
        '    for col in 0 .. N−1:',
        '        if attacked(row, col): continue # prune this branch',
        '        place queen at (row, col)       # choose',
        '        if solve(row + 1): return true  # explore',
        '        remove queen at (row, col)      # un-choose (backtrack)',
        '    return false                        # no column works — fail upward',
      ],
      time: 'O(N!) worst case',
      space: 'O(N)',
      verdict: 'optimal',
      breaks:
        'Nothing is wasted now. When row 2 dead-ends under queens at columns [0, 2], one undo discards all 16 complete boards built on that prefix — for the price of 4 checks. The whole row-0-at-col-0 branch (64 of the 256 boards) is buried after touching just 17 squares. In total the search touches 26 squares and undoes only 4 placements, and every square touched either advanced the solution or killed a subtree.',
      insight:
        'Each early conflict check is a verdict on an entire subtree of futures, not one board — which is exactly the aha below.',
      demo: { generateSteps, Visualizer },
    },
  ],
  intuition: [
    'Imagine solving a hedge maze by always keeping one hand on the wall. At each fork you commit to a corridor and walk it to the end. Hit a dead end? You walk back to the most recent fork — undoing exactly the steps you took — and try the next corridor. You never redraw the whole map; you only ever revise your latest decision.',
    'The key insight is that a partial solution either already violates a constraint or it does not — and if it does, NO extension of it can ever succeed. So the instant a choice creates a conflict (a queen attacked, a parenthesis unbalanced, a sum overshot), you prune the entire subtree of futures built on it. Backtracking is depth-first search over the tree of partial solutions, where "undo the last choice" is what lets one shared, mutable board explore millions of boards.',
    'Reach for this pattern when you must enumerate or find combinatorial structures — permutations, subsets, paths, board placements — and a partial candidate can be checked for validity early. The shape is always the same: choose, recurse, un-choose. If you can detect failure before the candidate is complete, backtracking turns brute force into something tractable.',
  ],
  pseudocode: [
    'solve(row):',
    '    if row = N: return true            # all queens placed',
    '    for col in 0 .. N−1:',
    '        if attacked(row, col): continue # prune this branch',
    '        place queen at (row, col)       # choose',
    '        if solve(row + 1): return true  # explore',
    '        remove queen at (row, col)      # un-choose (backtrack)',
    '    return false                        # no column works — fail upward',
  ],
  complexity: {
    time: 'O(N!) for N-Queens — O(bᵈ) in general',
    space: 'O(N) — recursion depth plus one shared board',
    explanation:
      'Row 0 has N column choices, but each placed queen kills at least one column for every later row, so row 1 has at most N−1 viable choices, row 2 at most N−2, shrinking each level — the search tree is bounded by N·(N−1)·(N−2)···, i.e. N!, and pruning typically visits far less. In general the tree has branching factor b and depth d, giving O(bᵈ) worst case. Space stays tiny because all branches share ONE board: the recursion stack holds at most d frames, and un-choosing on the way back up means we never copy state per branch.',
  },
  generateSteps,
  Visualizer,
  problems: [
    { title: 'N-Queens', difficulty: 'Hard', leetcodeId: 51, hint: 'One queen per row: try each column, prune attacked squares, undo when a row has no safe square.' },
    { title: 'Permutations', difficulty: 'Medium', leetcodeId: 46, hint: 'Choose an unused number, recurse on the rest, then un-mark it so sibling branches can use it.' },
    { title: 'Subsets', difficulty: 'Medium', leetcodeId: 78, hint: 'At each element branch two ways — include it or skip it — and record the path at every node.' },
    { title: 'Combination Sum', difficulty: 'Medium', leetcodeId: 39, hint: 'Keep choosing candidates while the running sum is under target; backtrack the instant it overshoots.' },
    { title: 'Word Search', difficulty: 'Medium', leetcodeId: 79, hint: 'DFS from each cell matching one letter at a time; mark the cell visited, recurse, then unmark it.' },
    { title: 'Generate Parentheses', difficulty: 'Medium', leetcodeId: 22, hint: 'Append "(" while opens remain and ")" only when it keeps the string balanced — invalid prefixes never recurse.' },
    { title: 'Letter Combinations of a Phone Number', difficulty: 'Medium', leetcodeId: 17, hint: 'One recursion level per digit; branch over that digit\'s letters and pop the letter on return.' },
    { title: 'Palindrome Partitioning', difficulty: 'Medium', leetcodeId: 131, hint: 'Cut off a prefix only if it is a palindrome, recurse on the suffix, then remove the cut.' },
    { title: 'Sudoku Solver', difficulty: 'Hard', leetcodeId: 37, hint: 'Try digits 1–9 in each empty cell, pruning row/column/box conflicts; erase the digit when stuck.' },
    { title: 'Number of Islands', difficulty: 'Medium', leetcodeId: 200, hint: 'DFS floods each unvisited land cell to sink its whole island — pure depth-first exploration, no undo needed.' },
    { title: 'Path Sum II', difficulty: 'Medium', leetcodeId: 113, hint: 'Carry the path down the tree, record it at leaves hitting the target, and pop the node when returning.' },
  ],
}
