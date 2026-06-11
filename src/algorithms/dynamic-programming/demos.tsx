import type { AttemptDemo, Step } from '../../core/types'
import { Cells, Legend, VizCaption } from '../../components/vizPrimitives'
import { VALUES } from './data'

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 1: Brute force — enumerate every valid (non-adjacent) subset
   pseudocode index matches problem.naive.pseudocode:
     0: 'best ← 0'
     1: 'for each subset S of the n houses:'
     2: '    if no two houses in S are adjacent:'
     3: '        best ← max(best, sum of cash in S)'
     4: 'return best'

   Honest simulation: 2^7 = 128 masks; 34 pass the adjacency check.
   We show 10 concrete evaluations, then a truncation step, then the verdict.
───────────────────────────────────────────────────────────────────────────── */

interface SubsetState {
  /** Which house indices are in the current subset (-1 means intro). */
  subset: number[]
  /** Sum of the current subset (null = intro). */
  subsetSum: number | null
  /** Best haul seen so far. */
  best: number
  /** Best subset indices seen so far. */
  bestSubset: number[]
  /** How many valid subsets evaluated so far. */
  validCount: number
  /** Total subsets examined (2^n when done). */
  totalExamined: number
  phase: 'intro' | 'eval' | 'truncate' | 'verdict'
}

function subsetSteps(): Step<SubsetState>[] {
  const steps: Step<SubsetState>[] = []
  const n = VALUES.length // 7

  // Compute honest totals by running the full enumeration
  let allValid: { subset: number[]; total: number }[] = []
  for (let mask = 0; mask < (1 << n); mask++) {
    let valid = true
    for (let i = 0; i < n - 1; i++) {
      if ((mask >> i) & 1 && (mask >> (i + 1)) & 1) { valid = false; break }
    }
    if (!valid) continue
    let total = 0
    const subset: number[] = []
    for (let i = 0; i < n; i++) { if ((mask >> i) & 1) { total += VALUES[i]; subset.push(i) } }
    allValid.push({ subset, total })
  }
  // allValid.length === 34; best is 19 at [0,2,5]

  // Intro sentinel
  steps.push({
    state: { subset: [], subsetSum: null, best: 0, bestSubset: [], validCount: 0, totalExamined: 0, phase: 'intro' },
    description: `Brute force: try all 2^${n} = ${1 << n} rob/skip subsets of the 7 houses. Discard any subset where two adjacent houses are both robbed. Keep the highest-total subset that survives.`,
    codeLine: 0,
  })

  // Show the first 10 valid subsets concretely
  let best = 0
  let bestSubset: number[] = []
  const SHOW = 10
  for (let k = 0; k < SHOW; k++) {
    const { subset, total } = allValid[k]
    const prevBest = best
    if (total > best) { best = total; bestSubset = [...subset] }
    const houseList = subset.length === 0 ? 'empty set (rob nothing)' : `houses [${subset.join(', ')}] → values [${subset.map(i => VALUES[i]).join(', ')}]`
    const improved = total > prevBest
    steps.push({
      state: { subset, subsetSum: total, best, bestSubset: [...bestSubset], validCount: k + 1, totalExamined: k + 1, phase: 'eval' },
      description: `Subset ${k + 1}: ${houseList} — total ${total}.${improved ? ` New best: ${total}.` : ` Best stays ${best}.`} (${34 - k - 1} valid subsets still to check.)`,
      codeLine: total > 0 ? 3 : 2,
    })
  }

  // Truncation step: skip the remaining 24 valid subsets
  steps.push({
    state: { subset: [], subsetSum: null, best, bestSubset: [...bestSubset], validCount: 34, totalExamined: 128, phase: 'truncate' },
    description: `Skipping subsets 11–34: the remaining 24 valid subsets produce totals ≤ ${best}. All 128 masks examined in full. Best so far: ${best} from houses [${bestSubset.join(', ')}].`,
    codeLine: 1,
  })

  // Verdict
  steps.push({
    state: { subset: [0, 2, 5], subsetSum: 19, best: 19, bestSubset: [0, 2, 5], validCount: 34, totalExamined: 128, phase: 'verdict' },
    description: `Answer: rob houses 0, 2, 5 → values [${[0, 2, 5].map(i => VALUES[i]).join(', ')}] = ${19}. Found by exhausting all 128 subsets (34 valid ones). A 40-house street has over a trillion subsets — 2^40 > 1,000,000,000,000.`,
    codeLine: 4,
  })

  return steps
}

function SubsetViz({ step }: { step: Step<SubsetState> }) {
  const { subset, best, bestSubset, validCount, totalExamined, phase } = step.state
  return (
    <>
      <VizCaption>
        {phase === 'intro' && `brute force: all 2^7 = 128 subsets · best so far = 0`}
        {phase === 'eval' && `valid subset #${validCount} · best so far = ${best}`}
        {phase === 'truncate' && `all 128 examined · 34 valid · best = ${best}`}
        {phase === 'verdict' && `answer = ${best} · houses [${bestSubset.join(', ')}]`}
      </VizCaption>
      <VizCaption>current subset</VizCaption>
      <Cells
        values={VALUES}
        classFor={k => {
          if (phase === 'verdict') return bestSubset.includes(k) ? 'done' : 'dim'
          if (phase === 'truncate') return bestSubset.includes(k) ? 'done' : 'dim'
          if (phase === 'intro') return ''
          return subset.includes(k) ? 'active' : 'dim'
        }}
        pointerFor={k => {
          if (phase === 'eval' && subset.includes(k)) return { label: 'rob', tone: 'mint' }
          if (phase === 'verdict' && bestSubset.includes(k)) return { label: 'rob', tone: 'amber' }
          return null
        }}
      />
      <VizCaption>best subset so far</VizCaption>
      <Cells
        values={VALUES}
        classFor={k => (bestSubset.includes(k) ? 'done' : 'dim')}
        pointerFor={() => null}
      />
      <Legend
        items={[
          { tone: 'mint', label: 'in current subset' },
          { tone: 'amber', label: 'best subset' },
          { label: 'settled best' },
        ]}
      />
    </>
  )
}

export const naiveDemo: AttemptDemo<SubsetState> = { generateSteps: subsetSteps, Visualizer: SubsetViz }

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 2: Greedy — rob every other house (verdict: fail)
   pseudocode index matches journey[0].pseudocode:
     0: 'evens ← value[0] + value[2] + value[4] + …'
     1: 'odds  ← value[1] + value[3] + value[5] + …'
     2: 'return max(evens, odds)'

   Honest simulation: evens = 2+9+1+4 = 16; odds = 7+3+8 = 18.
   True optimum = 19 from [0,2,5].
───────────────────────────────────────────────────────────────────────────── */

interface GreedyState {
  phase: 'intro' | 'evens' | 'odds' | 'compare' | 'verdict'
  evenIndices: number[]
  oddIndices: number[]
  evenSum: number
  oddSum: number
  /** Which pattern is highlighted right now: 'even' | 'odd' | 'neither'. */
  highlight: 'even' | 'odd' | 'neither'
}

function greedySteps(): Step<GreedyState>[] {
  const steps: Step<GreedyState>[] = []
  const n = VALUES.length

  // Compute honestly
  const evenIdx = Array.from({ length: n }, (_, i) => i).filter(i => i % 2 === 0) // [0,2,4,6]
  const oddIdx = Array.from({ length: n }, (_, i) => i).filter(i => i % 2 === 1)  // [1,3,5]
  const evenSum = evenIdx.reduce((s, i) => s + VALUES[i], 0) // 2+9+1+4 = 16
  const oddSum = oddIdx.reduce((s, i) => s + VALUES[i], 0)   // 7+3+8 = 18

  // Intro
  steps.push({
    state: { phase: 'intro', evenIndices: [], oddIndices: [], evenSum: 0, oddSum: 0, highlight: 'neither' },
    description: `Greedy: "no two adjacent" sounds like strict alternation — rob every other house. Two possible patterns: even-indexed houses (0, 2, 4, 6) or odd-indexed (1, 3, 5). Take the bigger total.`,
    codeLine: 0,
  })

  // Even pass — build sum step by step, show 4 additions
  let runningEven = 0
  for (let k = 0; k < evenIdx.length; k++) {
    const i = evenIdx[k]
    runningEven += VALUES[i]
    steps.push({
      state: { phase: 'evens', evenIndices: evenIdx.slice(0, k + 1), oddIndices: [], evenSum: runningEven, oddSum: 0, highlight: 'even' },
      description: `Even pattern: add house ${i} (${VALUES[i]}). Running even total: ${runningEven}.`,
      codeLine: 0,
    })
  }

  // Odd pass — build sum step by step, show 3 additions
  let runningOdd = 0
  for (let k = 0; k < oddIdx.length; k++) {
    const i = oddIdx[k]
    runningOdd += VALUES[i]
    steps.push({
      state: { phase: 'odds', evenIndices: evenIdx, oddIndices: oddIdx.slice(0, k + 1), evenSum: evenSum, oddSum: runningOdd, highlight: 'odd' },
      description: `Odd pattern: add house ${i} (${VALUES[i]}). Running odd total: ${runningOdd}.`,
      codeLine: 1,
    })
  }

  // Compare
  steps.push({
    state: { phase: 'compare', evenIndices: evenIdx, oddIndices: oddIdx, evenSum, oddSum, highlight: 'neither' },
    description: `Compare: even total = ${evenSum}, odd total = ${oddSum}. Greedy picks the odd pattern: ${oddSum}. But the true optimum is 19 — houses 0, 2, 5, which rob both 9 (even) and 8 (odd). Strict alternation can never span both patterns.`,
    codeLine: 2,
  })

  // Verdict — show the winning houses 0,2,5 vs greedy's 1,3,5
  steps.push({
    state: { phase: 'verdict', evenIndices: [0, 2, 5], oddIndices: oddIdx, evenSum: 19, oddSum, highlight: 'neither' },
    description: `FAIL. Greedy returns ${oddSum}; the answer is 19 (houses 0, 2, 5 → ${VALUES[0]} + ${VALUES[2]} + ${VALUES[5]}). The winning plan skips TWO houses in a row (houses 3 and 4, worth 3 and 1) to grab both 9 and 8 — a non-alternating rhythm no greedy can produce.`,
    codeLine: -1,
  })

  return steps
}

function GreedyViz({ step }: { step: Step<GreedyState> }) {
  const { phase, evenIndices, oddIndices, evenSum, oddSum, highlight } = step.state
  return (
    <>
      <VizCaption>
        {phase === 'intro' && `greedy: rob every other house — pick the bigger pattern`}
        {phase === 'evens' && `even-indexed houses · running sum = ${evenSum}`}
        {phase === 'odds' && `odd-indexed houses · running sum = ${oddSum}`}
        {phase === 'compare' && `even = ${evenSum} vs odd = ${oddSum} · greedy picks ${Math.max(evenSum, oddSum)}`}
        {phase === 'verdict' && `greedy = ${oddSum} but optimum = 19 · FAIL`}
      </VizCaption>
      <Cells
        values={VALUES}
        classFor={k => {
          if (phase === 'verdict') {
            // show true optimal [0,2,5]
            return evenIndices.includes(k) ? 'done' : 'dim'
          }
          if (highlight === 'even') return evenIndices.includes(k) ? 'active' : 'dim'
          if (highlight === 'odd') return oddIndices.includes(k) ? 'warm' : 'dim'
          if (phase === 'compare') {
            return evenIndices.includes(k) ? 'active' : oddIndices.includes(k) ? 'warm' : 'dim'
          }
          return ''
        }}
        pointerFor={k => {
          if (phase === 'verdict' && evenIndices.includes(k)) return { label: 'rob', tone: 'amber' }
          if (highlight === 'even' && evenIndices.includes(k)) return { label: 'even', tone: 'mint' }
          if (highlight === 'odd' && oddIndices.includes(k)) return { label: 'odd', tone: 'amber' }
          return null
        }}
      />
      {phase === 'compare' || phase === 'verdict' ? (
        <VizCaption>
          {phase === 'compare'
            ? `even [${evenIndices.join(',')}] = ${evenSum} | odd [${oddIndices.join(',')}] = ${oddSum}`
            : `optimal [0,2,5] = 19 | greedy odd [1,3,5] = ${oddSum}`}
        </VizCaption>
      ) : null}
      <Legend
        items={[
          { tone: 'mint', label: 'even pattern' },
          { tone: 'amber', label: 'odd pattern / optimal' },
          { label: 'skipped' },
        ]}
      />
    </>
  )
}

export const greedyDemo: AttemptDemo<GreedyState> = { generateSteps: greedySteps, Visualizer: GreedyViz }

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 3: Rob-or-skip recursion (verdict: partial)
   pseudocode index matches journey[1].pseudocode:
     0: 'best(i):'
     1: '    if i = 0: return value[0]'
     2: '    if i = 1: return max(value[0], value[1])'
     3: '    return max(best(i − 1),'
     4: '               value[i] + best(i − 2))'

   Honest: 25 total calls; per-index counts [5,8,5,3,2,1,1].
   best(1) called 8 times, best(2) called 5 times.
───────────────────────────────────────────────────────────────────────────── */

interface RecursionState {
  /** call count per index, built up as calls happen. */
  callCounts: number[]
  /** Index currently being evaluated (-1 = intro). */
  currentI: number
  /** Total calls so far. */
  totalCalls: number
  phase: 'intro' | 'call' | 'verdict'
}

function recursionSteps(): Step<RecursionState>[] {
  const steps: Step<RecursionState>[] = []
  const n = VALUES.length

  // Run the full recursion and record call log
  const callLog: number[] = []
  function best(i: number): number {
    callLog.push(i)
    if (i === 0) return VALUES[0]
    if (i === 1) return Math.max(VALUES[0], VALUES[1])
    return Math.max(best(i - 1), VALUES[i] + best(i - 2))
  }
  const answer = best(n - 1)
  // callLog.length === 25

  // Compute running callCounts after each call
  const snapshots: number[][] = []
  const running = new Array(n).fill(0)
  for (const idx of callLog) {
    running[idx]++
    snapshots.push([...running])
  }
  // Honest per-index final: [5,8,5,3,2,1,1]; total: 25; dupes: 18

  // Intro
  steps.push({
    state: { callCounts: new Array(n).fill(0), currentI: -1, totalCalls: 0, phase: 'intro' },
    description: `Recursive approach: best(i) = max(best(i−1), value[i] + best(i−2)). To price house 6 we call best(5) and best(4). Each of those calls two more. The call tree fans out — but how many unique questions exist?`,
    codeLine: 0,
  })

  // Show the first 15 calls (enough to see the pattern of repeats)
  const SHOW_CALLS = 15
  for (let k = 0; k < Math.min(SHOW_CALLS, callLog.length); k++) {
    const i = callLog[k]
    const counts = snapshots[k]
    const callNum = k + 1
    const isRepeat = counts[i] > 1
    steps.push({
      state: { callCounts: counts, currentI: i, totalCalls: callNum, phase: 'call' },
      description: isRepeat
        ? `Call #${callNum}: best(${i}) — this is call #${counts[i]} to best(${i}). Same subproblem, same answer (${best(i)}), recomputed from scratch. Wasted work.`
        : `Call #${callNum}: best(${i}) — first time computing best(${i}).`,
      codeLine: i === 0 ? 1 : i === 1 ? 2 : 3,
    })
  }

  // Truncation: remaining calls are all repeats
  const remaining = callLog.length - SHOW_CALLS
  steps.push({
    state: { callCounts: snapshots[callLog.length - 1], currentI: -1, totalCalls: callLog.length, phase: 'call' },
    description: `${remaining} more calls (all duplicates) finish the tree. Running total: ${callLog.length} calls to answer only ${n} distinct questions. best(1) answered ${snapshots[callLog.length - 1][1]} times, best(2) answered ${snapshots[callLog.length - 1][2]} times.`,
    codeLine: 3,
  })

  // Verdict
  steps.push({
    state: { callCounts: snapshots[callLog.length - 1], currentI: -1, totalCalls: callLog.length, phase: 'verdict' },
    description: `Answer: ${answer}. Correct — but 25 calls answered only 7 distinct questions, wasting ${callLog.length - n} duplicate calls. At 40 houses the call count tracks Fibonacci growth: roughly 331 million calls for 40 distinct answers.`,
    codeLine: -1,
  })

  return steps
}

function RecursionViz({ step }: { step: Step<RecursionState> }) {
  const { callCounts, currentI, totalCalls, phase } = step.state
  const maxCount = Math.max(...callCounts, 1)
  return (
    <>
      <VizCaption>
        {phase === 'intro' && `recursion call tree · best(6) fans out`}
        {phase === 'call' && `total calls so far = ${totalCalls}${currentI >= 0 ? ` · current: best(${currentI})` : ''}`}
        {phase === 'verdict' && `25 calls · 7 distinct subproblems · 18 duplicate calls`}
      </VizCaption>
      <VizCaption>house values</VizCaption>
      <Cells
        values={VALUES}
        classFor={k => (phase !== 'intro' && k === currentI ? 'active' : '')}
        pointerFor={k => (k === currentI && phase === 'call' ? { label: 'best(i)', tone: 'mint' } : null)}
      />
      <VizCaption>best(i) call count</VizCaption>
      <Cells
        values={callCounts}
        classFor={k => {
          if (callCounts[k] === 0) return 'dim'
          if (k === currentI) return 'active'
          if (callCounts[k] > 1) return 'rose'
          return 'done'
        }}
        pointerFor={k => {
          if (k === currentI && callCounts[k] > 1) return { label: `×${callCounts[k]}`, tone: 'rose' }
          return null
        }}
      />
      <Legend
        items={[
          { tone: 'mint', label: 'current call' },
          { tone: 'rose', label: 'repeated subproblem' },
          { label: 'called once' },
        ]}
      />
    </>
  )
}

export const recursionDemo: AttemptDemo<RecursionState> = { generateSteps: recursionSteps, Visualizer: RecursionViz }

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 4: Memoize — cache each answer the first time (verdict: partial)
   pseudocode index matches journey[2].pseudocode:
     0: 'memo ← empty table'
     1: 'best(i):'
     2: '    if memo[i] exists: return memo[i]'
     3: '    (base cases as before)'
     4: '    memo[i] ← max(best(i − 1), value[i] + best(i − 2))'
     5: '    return memo[i]'

   Honest: 7 misses, 4 hits, 11 total calls.
───────────────────────────────────────────────────────────────────────────── */

interface MemoState {
  /** memo[i] = computed value or null if not yet cached. */
  memo: (number | null)[]
  /** Index currently being looked up. */
  currentI: number
  /** Was the current access a hit? */
  isHit: boolean | null
  hits: number
  misses: number
  phase: 'intro' | 'call' | 'verdict'
}

function memoSteps(): Step<MemoState>[] {
  const steps: Step<MemoState>[] = []
  const n = VALUES.length

  // Run the memoized recursion and record events
  const events: { i: number; hit: boolean; memoAfter: (number | null)[] }[] = []
  const memo: (number | null)[] = new Array(n).fill(null)
  function bestMemo(i: number): number {
    if (memo[i] !== null) {
      events.push({ i, hit: true, memoAfter: [...memo] })
      return memo[i]!
    }
    if (i === 0) {
      memo[i] = VALUES[0]
      events.push({ i, hit: false, memoAfter: [...memo] })
      return memo[i]!
    }
    if (i === 1) {
      memo[i] = Math.max(VALUES[0], VALUES[1])
      events.push({ i, hit: false, memoAfter: [...memo] })
      return memo[i]!
    }
    // compute — will recurse first; record after
    const val = Math.max(bestMemo(i - 1), VALUES[i] + bestMemo(i - 2))
    memo[i] = val
    events.push({ i, hit: false, memoAfter: [...memo] })
    return val
  }
  const answer = bestMemo(n - 1)
  const totalHits = events.filter(e => e.hit).length   // 4
  const totalMisses = events.filter(e => !e.hit).length // 7

  // Intro
  steps.push({
    state: { memo: new Array(n).fill(null), currentI: -1, isHit: null, hits: 0, misses: 0, phase: 'intro' },
    description: `Memoize: before computing best(i), check if the answer is already cached. If yes, return it instantly. Same recursion — but each subproblem is computed at most once. Memo table starts empty.`,
    codeLine: 0,
  })

  // Show all 11 events
  let hits = 0; let misses = 0
  for (let k = 0; k < events.length; k++) {
    const { i, hit, memoAfter } = events[k]
    if (hit) hits++; else misses++
    const val = memoAfter[i]
    steps.push({
      state: { memo: memoAfter, currentI: i, isHit: hit, hits, misses, phase: 'call' },
      description: hit
        ? `best(${i}): memo[${i}] = ${val} — CACHE HIT. Return ${val} instantly, zero recursion. (Hit #${hits})`
        : `best(${i}): memo[${i}] was empty — compute and store ${val}. (Miss #${misses})`,
      codeLine: hit ? 2 : i <= 1 ? 3 : 4,
    })
  }

  // Verdict
  steps.push({
    state: { memo: events[events.length - 1].memoAfter, currentI: -1, isHit: null, hits: totalHits, misses: totalMisses, phase: 'verdict' },
    description: `Answer: ${answer}. ${totalMisses} real computations + ${totalHits} cache hits = ${totalHits + totalMisses} total calls (vs 25 for naive recursion). Linear work — but the stack still dives ${n} frames deep. On a 100,000-house street that depth blows the call stack. And the fill order was always 0, 1, 2, 3, 4, 5, 6 — left to right, no recursion needed.`,
    codeLine: -1,
  })

  return steps
}

function MemoViz({ step }: { step: Step<MemoState> }) {
  const { memo, currentI, isHit, hits, misses, phase } = step.state
  return (
    <>
      <VizCaption>
        {phase === 'intro' && `memoize: cache each answer the first time`}
        {phase === 'call' && `hits = ${hits} · misses = ${misses}${isHit !== null ? (isHit ? ' · CACHE HIT' : ' · MISS — computing') : ''}`}
        {phase === 'verdict' && `${misses} misses + ${hits} hits = ${hits + misses} calls · answer = ${memo[memo.length - 1]}`}
      </VizCaption>
      <VizCaption>house values</VizCaption>
      <Cells
        values={VALUES}
        classFor={k => (k === currentI ? 'active' : '')}
        pointerFor={() => null}
      />
      <VizCaption>memo table</VizCaption>
      <Cells
        values={memo.map(v => (v === null ? '·' : v))}
        classFor={k => {
          if (memo[k] === null) return 'dim'
          if (k === currentI) return isHit ? 'amber' : 'active'
          return 'done'
        }}
        pointerFor={k => {
          if (k === currentI && phase === 'call') {
            return isHit
              ? { label: 'HIT', tone: 'amber' }
              : { label: 'MISS', tone: 'mint' }
          }
          return null
        }}
      />
      <Legend
        items={[
          { tone: 'mint', label: 'computed (miss)' },
          { tone: 'amber', label: 'cache hit' },
          { label: 'previously cached' },
        ]}
      />
    </>
  )
}

export const memoDemo: AttemptDemo<MemoState> = { generateSteps: memoSteps, Visualizer: MemoViz }
