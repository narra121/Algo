import type { CSSProperties } from 'react'
import type { AlgorithmModule, Step } from '../../core/types'

/* Canonical example: House Robber — max loot from a row of houses, no two adjacent. */

const VALUES = [2, 7, 9, 3, 1, 8, 4]

interface DPState {
  values: number[]
  /** dp[i] = best haul using only houses 0…i; null = not yet computed. */
  dp: (number | null)[]
  /** Index of the house currently being considered, or -1. */
  house: number
  /** dp indices currently being compared / consulted. */
  compare: number[]
  /** dp index that was just written, or -1. */
  justWrote: number
  finished: boolean
}

function generateSteps(): Step<DPState>[] {
  const steps: Step<DPState>[] = []
  const n = VALUES.length
  const dp: (number | null)[] = new Array(n).fill(null)

  steps.push({
    state: { values: [...VALUES], dp: [...dp], house: -1, compare: [], justWrote: -1, finished: false },
    description: `Goal: steal the MAXIMUM total from seven houses holding [${VALUES.join(', ')}], where robbing two neighbors trips the alarm. Brute force would weigh all 2^${VALUES.length} = ${2 ** VALUES.length} rob/skip subsets — instead we build a table where dp[i] = the best haul using only houses 0…i. Each entry gets computed exactly once.`,
    codeLine: 0,
  })

  dp[0] = VALUES[0]
  steps.push({
    state: { values: [...VALUES], dp: [...dp], house: 0, compare: [], justWrote: 0, finished: false },
    description: `Base case: if house 0 is the whole street, the best haul is simply its ${VALUES[0]}. Write dp[0] = ${VALUES[0]} — this tiny answer is now settled forever.`,
    codeLine: 1,
  })

  dp[1] = Math.max(VALUES[0], VALUES[1])
  steps.push({
    state: { values: [...VALUES], dp: [...dp], house: 1, compare: [0], justWrote: 1, finished: false },
    description: `Houses 0 and 1 are neighbors, so we can take at most one. max(${VALUES[0]}, ${VALUES[1]}) = ${dp[1]}. Write dp[1] = ${dp[1]}. The two seeds are planted; every later answer grows from entries like these.`,
    codeLine: 2,
  })

  for (let i = 2; i < n; i++) {
    const rob = VALUES[i] + (dp[i - 2] as number)
    const skip = dp[i - 1] as number

    steps.push({
      state: { values: [...VALUES], dp: [...dp], house: i, compare: [], justWrote: -1, finished: false },
      description: `Move to house ${i}, holding ${VALUES[i]}. Only two futures exist: rob it (then house ${i - 1} is off-limits) or skip it. Both futures were already priced — they're sitting in the table.`,
      codeLine: 3,
    })

    steps.push({
      state: { values: [...VALUES], dp: [...dp], house: i, compare: [i - 2, i - 1], justWrote: -1, finished: false },
      description: `ROB: take the ${VALUES[i]} here plus dp[${i - 2}] = ${dp[i - 2]} (best haul that legally ends before the neighbor) → ${VALUES[i]} + ${dp[i - 2]} = ${rob}. SKIP: keep dp[${i - 1}] = ${skip} as-is. No recursion, no re-planning — just two table lookups.`,
      codeLine: 4,
    })

    dp[i] = Math.max(rob, skip)
    const robWins = rob > skip
    steps.push({
      state: { values: [...VALUES], dp: [...dp], house: i, compare: [], justWrote: i, finished: false },
      description: robWins
        ? `Robbing wins: ${rob} > ${skip}, so dp[${i}] = ${dp[i]}. Grabbing the ${VALUES[i]} here beats whatever skipping preserved — small answers just built a bigger one.`
        : `Skipping wins: ${skip} ≥ ${rob}, so dp[${i}] = ${dp[i]}. The ${VALUES[i]} in this house isn't worth giving up the streak already banked in dp[${i - 1}].`,
      codeLine: 6,
    })
  }

  steps.push({
    state: { values: [...VALUES], dp: [...dp], house: -1, compare: [], justWrote: n - 1, finished: true },
    description: `The table is full. dp[${n - 1}] = ${dp[n - 1]} is the maximum haul for the whole street — found with just ${n} cheap table fills instead of exploring 2^${n} = ${2 ** n} rob/skip combinations.`,
    codeLine: 7,
  })

  return steps
}

function Visualizer({ step }: { step: Step<DPState> }) {
  const { values, dp, house, compare, justWrote, finished } = step.state
  const rowLabel: CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--faint)',
    textAlign: 'center',
    marginBottom: 2,
  }
  return (
    <>
      <div className="viz-caption">
        house robber · dp[i] = best haul from houses 0…i
        {finished && ` · answer = ${dp[dp.length - 1]}`}
      </div>
      <div style={rowLabel}>houses</div>
      <div className="cells spaced" style={{ paddingBottom: 8 }}>
        {values.map((v, i) => {
          let cls = 'cell'
          if (i === house) cls += ' warm'
          else if (finished) cls += ' done'
          return (
            <div key={i} className={cls}>
              <span className="idx">{i}</span>
              {v}
              {i === house && <span className="ptr amber">▲ HOUSE</span>}
            </div>
          )
        })}
      </div>
      <div style={rowLabel}>dp table</div>
      <div className="cells spaced" style={{ paddingTop: 18 }}>
        {dp.map((v, i) => {
          let cls = 'cell'
          if (compare.includes(i)) cls += ' active'
          else if (i === justWrote) cls += ' active'
          else if (v !== null) cls += ' done'
          else cls += ' dim'
          return (
            <div key={i} className={cls}>
              <span className="idx">{i}</span>
              {v === null ? '·' : v}
              {i === justWrote && <span className="ptr mint">{finished ? '▲ ANSWER' : '▲ WROTE'}</span>}
              {compare.includes(i) && <span className="ptr sky">{i === house - 1 ? '▲ SKIP' : '▲ ROB +'}</span>}
            </div>
          )
        })}
      </div>
      <div className="legend">
        <span className="key"><span className="swatch amber" /> current house</span>
        <span className="key"><span className="swatch mint" /> dp cells in play</span>
        <span className="key"><span className="swatch" /> solved subproblem</span>
      </div>
    </>
  )
}

export const dynamicProgramming: AlgorithmModule<DPState> = {
  id: 'dynamic-programming',
  name: 'Dynamic Programming',
  tagline: 'Solve every subproblem once, write the answer down, and let small answers build big ones.',
  category: 'Dynamic Programming',
  icon: '🧩',
  problem: {
    title: 'House Robber — maximum loot with no two adjacent houses',
    statement:
      'A street of seven houses holds cash [2, 7, 9, 3, 1, 8, 4]. Robbing any two adjacent houses trips the alarm, so the question is: what is the LARGEST total you can steal without ever hitting two neighbors? That exact question, on these exact seven numbers, is what the animation below solves live.',
    input: 'A row of 7 cash amounts: [2, 7, 9, 3, 1, 8, 4], plus the rule that no two adjacent houses may both be robbed.',
    output: 'The maximum legal haul — here 19, by robbing houses 0, 2, and 5 (2 + 9 + 8).',
    naive: {
      description:
        'Enumerate every rob/skip combination: 2⁷ = 128 subsets for just these 7 houses, then discard the illegal ones (two neighbors robbed) and total what survives.',
      pseudocode: [
        'best ← 0',
        'for each subset S of the n houses:',
        '    if no two houses in S are adjacent:',
        '        best ← max(best, sum of cash in S)',
        'return best',
      ],
      time: 'O(2ⁿ · n)',
      space: 'O(n)',
      issues:
        'The same sub-question — "what is the best haul up to house i?" — gets re-answered inside exponentially many subsets, because the enumeration never writes anything down. Doubling the street doubles the EXPONENT: 7 houses cost 128 subsets, a 40-house street already needs over a trillion. DP answers each of the 7 sub-questions exactly once and reads the rest from the table.',
    },
  },
  aha:
    'The best haul up to house i depends on nothing but two numbers already in the table — dp[i−1] and dp[i−2] — so the millions of ways those hauls were achieved can be thrown away forever, collapsing 2^7 = 128 rob/skip futures into just 7 one-line table fills.',
  intuition: [
    'Imagine a burglar walking down a street with a notebook. At every house he jots one number: "best haul possible using the street up to here." When he reaches house 50 he never re-plans houses 1–49 from scratch — he just checks two notebook lines, does one addition and one comparison, and writes the next line. The notebook is the dp table, and it turns an overwhelming plan into a stroll.',
    'The key insight is that big problems often repeat the same small questions over and over. A naive recursion for house i asks about i−1 and i−2, which each ask about their predecessors — the same subproblems explode exponentially down the call tree. But the ANSWER to "best haul up to house i" is a single number that never changes once known (optimal substructure). Cache it the first time, and the exponential tree collapses into one linear pass: each entry is computed once, from a constant number of earlier entries.',
    'Reach for DP when a problem asks for a best / count / possibility over sequential choices, a greedy pick can be wrong because early decisions constrain later ones, and the situation at each point can be summarized by a small state (an index, a remaining amount, a pair of positions). If you can write the answer at state i as a formula over answers at smaller states — a recurrence — you have a DP.',
  ],
  pseudocode: [
    'dp ← table of size n, all empty',
    'dp[0] ← value[0]',
    'dp[1] ← max(value[0], value[1])',
    'for i ← 2 … n − 1:',
    '    rob  ← value[i] + dp[i − 2]',
    '    skip ← dp[i − 1]',
    '    dp[i] ← max(rob, skip)',
    'return dp[n − 1]',
  ],
  complexity: {
    time: 'O(n)',
    space: 'O(n)',
    explanation:
      'The whole point of the table is that no subproblem is ever solved twice: each of the n entries is filled exactly once, and filling one costs only a constant amount of work (two lookups, an add, a max). So the total is n × O(1) = O(n) — versus the 2^n rob/skip combinations brute force would explore. Space is the table itself, O(n); and since each entry only consults the previous two, keeping just those two numbers shrinks it to O(1).',
  },
  generateSteps,
  Visualizer,
  problems: [
    { title: 'Climbing Stairs', difficulty: 'Easy', leetcodeId: 70, hint: 'Ways to reach step i = ways to reach i−1 plus ways to reach i−2 — Fibonacci in disguise.' },
    { title: 'House Robber', difficulty: 'Medium', leetcodeId: 198, hint: 'The canonical rob-or-skip: dp[i] = max(dp[i−1], dp[i−2] + value[i]).' },
    { title: 'Best Time to Buy and Sell Stock', difficulty: 'Easy', leetcodeId: 121, hint: 'Carry one running state — the cheapest price so far — and best profit at day i builds on it.' },
    { title: 'Maximum Subarray', difficulty: 'Medium', leetcodeId: 53, hint: 'Kadane: best sum ending at i either extends the best ending at i−1 or restarts fresh.' },
    { title: 'Coin Change', difficulty: 'Medium', leetcodeId: 322, hint: 'dp[amount] = 1 + min over coins of dp[amount − coin]; fill amounts from 0 upward.' },
    { title: 'Unique Paths', difficulty: 'Medium', leetcodeId: 62, hint: 'Paths into a grid cell = paths from above + paths from the left, filled row by row.' },
    { title: 'Word Break', difficulty: 'Medium', leetcodeId: 139, hint: 'dp[i] = can the first i characters be segmented — true if some dictionary word ends a breakable prefix.' },
    { title: 'Longest Increasing Subsequence', difficulty: 'Medium', leetcodeId: 300, hint: 'dp[i] = longest increasing run ending at i, built from every smaller element before it.' },
    { title: 'Decode Ways', difficulty: 'Medium', leetcodeId: 91, hint: 'Decodings of a prefix come from taking one digit (dp[i−1]) or a valid two-digit pair (dp[i−2]).' },
    { title: 'Partition Equal Subset Sum', difficulty: 'Medium', leetcodeId: 416, hint: 'Subset-sum DP over reachable totals: can some subset hit exactly half the array sum?' },
    { title: 'Longest Common Subsequence', difficulty: 'Medium', leetcodeId: 1143, hint: '2-D table over both prefixes: match extends the diagonal, mismatch takes the best neighbor.' },
    { title: 'Edit Distance', difficulty: 'Medium', leetcodeId: 72, hint: 'dp[i][j] = cost to convert one prefix into another via the cheapest insert / delete / replace.' },
  ],
}
