import type { AttemptDemo, Step, VarEntry } from '../../core/types'
import { Cells, Legend, VizCaption } from '../../components/vizPrimitives'
import { VALUES } from './data'

const fmtSet = (s: number[]) => (s.length ? `[${s.join(', ')}]` : '∅')

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 1: Brute force — enumerate every rob/skip mask, all 128 of them
   pseudocode index matches problem.naive.pseudocode:
     0: 'best ← 0'
     1: 'for each subset S of the n houses:'
     2: '    if no two houses in S are adjacent:'
     3: '        best ← max(best, sum of cash in S)'
     4: 'return best'

   Honest simulation: all 2^7 = 128 masks are examined one per step;
   34 pass the adjacency check, best = 19 at houses [0, 2, 5].
───────────────────────────────────────────────────────────────────────────── */

interface SubsetState {
  /** Which house indices are in the current subset. */
  subset: number[]
  /** Sum of the current subset (null = intro / not computed for illegal masks). */
  subsetSum: number | null
  /** Best haul seen so far. */
  best: number
  /** Best subset indices seen so far. */
  bestSubset: number[]
  /** How many valid subsets evaluated so far. */
  validCount: number
  /** Total masks examined so far (128 when done). */
  totalExamined: number
  /** Did the current mask pass the adjacency check? (null = intro/verdict) */
  valid: boolean | null
  phase: 'intro' | 'eval' | 'verdict'
}

function subsetSteps(): Step<SubsetState>[] {
  const steps: Step<SubsetState>[] = []
  const n = VALUES.length // 7

  const mkVars = (
    mask: string,
    S: string,
    sum: string,
    valid: string,
    best: number,
    bestSubset: number[],
    ch: { mask?: boolean; S?: boolean; sum?: boolean; valid?: boolean; best?: boolean } = {},
  ): VarEntry[] => [
    { name: 'mask', value: mask, ...(ch.mask ? { changed: true } : {}) },
    { name: 'S', value: S, ...(ch.S ? { changed: true } : {}) },
    { name: 'sum(S)', value: sum, ...(ch.sum ? { changed: true } : {}) },
    { name: 'valid?', value: valid, ...(ch.valid ? { changed: true } : {}) },
    { name: 'best', value: String(best), ...(ch.best ? { changed: true } : {}) },
    { name: 'bestSubset', value: fmtSet(bestSubset), ...(ch.best ? { changed: true } : {}) },
  ]

  // Intro sentinel
  steps.push({
    state: { subset: [], subsetSum: null, best: 0, bestSubset: [], validCount: 0, totalExamined: 0, valid: null, phase: 'intro' },
    description: `Brute force: try all 2^${n} = ${1 << n} rob/skip subsets of the 7 houses. Discard any subset where two adjacent houses are both robbed. Keep the highest-total subset that survives. Start with best = 0.`,
    codeLine: 0,
    vars: mkVars('—', '—', '—', '—', 0, [], { best: true }),
  })

  // Examine every one of the 128 masks, one honest step each
  let best = 0
  let bestSubset: number[] = []
  let validCount = 0
  for (let mask = 0; mask < 1 << n; mask++) {
    const subset: number[] = []
    for (let i = 0; i < n; i++) if ((mask >> i) & 1) subset.push(i)
    let badPair = -1
    for (let i = 0; i < n - 1; i++) {
      if ((mask >> i) & 1 && (mask >> (i + 1)) & 1) { badPair = i; break }
    }
    const valid = badPair === -1

    if (!valid) {
      steps.push({
        state: { subset, subsetSum: null, best, bestSubset: [...bestSubset], validCount, totalExamined: mask + 1, valid: false, phase: 'eval' },
        description: `Mask ${mask} would rob houses ${fmtSet(subset)} — but houses ${badPair} and ${badPair + 1} are next-door neighbors (worth ${VALUES[badPair]} and ${VALUES[badPair + 1]}), so this plan trips the alarm. Illegal; discarded before summing. Best stays ${best}.`,
        codeLine: 2,
        vars: mkVars(String(mask), fmtSet(subset), '—', `no — houses ${badPair},${badPair + 1} adjacent`, best, bestSubset, { mask: true, S: true, sum: true, valid: true }),
      })
      continue
    }

    validCount++
    const total = subset.reduce((s, i) => s + VALUES[i], 0)
    const prevBest = best
    const improved = total > best
    if (improved) { best = total; bestSubset = [...subset] }

    const houseList = subset.length === 0
      ? 'the empty set — rob nothing'
      : `houses ${fmtSet(subset)} → values [${subset.map(i => VALUES[i]).join(', ')}]`
    steps.push({
      state: { subset, subsetSum: total, best, bestSubset: [...bestSubset], validCount, totalExamined: mask + 1, valid: true, phase: 'eval' },
      description: improved
        ? `Mask ${mask}: ${houseList}, total ${total}. No two picks touch, so it is legal — and ${total} beats the old best ${prevBest}. New best: ${total} from houses ${fmtSet(bestSubset)}. (Valid subset #${validCount}.)`
        : `Mask ${mask}: ${houseList}, total ${total}. Legal — no two picks are adjacent — but ${total} ≤ best ${best}${bestSubset.length ? ` (held by houses ${fmtSet(bestSubset)})` : ''}, so best stays ${best}. (Valid subset #${validCount}.)`,
      codeLine: 3,
      vars: mkVars(String(mask), fmtSet(subset), String(total), 'yes', best, bestSubset, { mask: true, S: true, sum: true, valid: true, ...(improved ? { best: true } : {}) }),
    })
  }

  // Verdict — after every one of the 128 masks was actually examined
  steps.push({
    state: { subset: [...bestSubset], subsetSum: best, best, bestSubset: [...bestSubset], validCount, totalExamined: 1 << n, valid: null, phase: 'verdict' },
    description: `Answer: rob houses ${fmtSet(bestSubset)} → values [${bestSubset.map(i => VALUES[i]).join(', ')}] = ${best}. All ${1 << n} masks were examined; ${validCount} survived the adjacency check and none beat ${best}. A 40-house street has over a trillion subsets — 2^40 > 1,000,000,000,000.`,
    codeLine: 4,
    vars: mkVars(`128 of 128 done`, fmtSet(bestSubset), String(best), 'yes', best, bestSubset),
  })

  return steps
}

function SubsetViz({ step }: { step: Step<SubsetState> }) {
  const { subset, best, bestSubset, validCount, totalExamined, valid, phase } = step.state
  return (
    <>
      <VizCaption>
        {phase === 'intro' && `brute force: all 2^7 = 128 subsets · best so far = 0`}
        {phase === 'eval' && `mask ${totalExamined} of 128 · ${validCount} valid so far · best = ${best}`}
        {phase === 'verdict' && `answer = ${best} · houses ${fmtSet(bestSubset)}`}
      </VizCaption>
      <VizCaption>current subset</VizCaption>
      <Cells
        values={VALUES}
        classFor={k => {
          if (phase === 'verdict') return bestSubset.includes(k) ? 'done' : 'dim'
          if (phase === 'intro') return ''
          if (subset.includes(k)) return valid === false ? 'rose' : 'active'
          return 'dim'
        }}
        pointerFor={k => {
          if (phase === 'eval' && subset.includes(k)) return { label: 'rob', tone: valid === false ? 'rose' : 'mint' }
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
          { tone: 'rose', label: 'illegal — adjacent picks' },
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

  const mkVars = (
    house: string,
    evens: string,
    odds: string,
    answer: string,
    ch: { house?: boolean; evens?: boolean; odds?: boolean; answer?: boolean } = {},
  ): VarEntry[] => [
    { name: 'house', value: house, ...(ch.house ? { changed: true } : {}) },
    { name: 'evens', value: evens, ...(ch.evens ? { changed: true } : {}) },
    { name: 'odds', value: odds, ...(ch.odds ? { changed: true } : {}) },
    { name: 'max(evens, odds)', value: answer, ...(ch.answer ? { changed: true } : {}) },
  ]

  // Intro
  steps.push({
    state: { phase: 'intro', evenIndices: [], oddIndices: [], evenSum: 0, oddSum: 0, highlight: 'neither' },
    description: `Greedy: "no two adjacent" sounds like strict alternation — rob every other house. Two possible patterns: even-indexed houses (0, 2, 4, 6) or odd-indexed (1, 3, 5). Take the bigger total.`,
    codeLine: 0,
    vars: mkVars('—', '—', '—', '—'),
  })

  // Even pass — build sum step by step, show 4 additions
  let runningEven = 0
  for (let k = 0; k < evenIdx.length; k++) {
    const i = evenIdx[k]
    runningEven += VALUES[i]
    steps.push({
      state: { phase: 'evens', evenIndices: evenIdx.slice(0, k + 1), oddIndices: [], evenSum: runningEven, oddSum: 0, highlight: 'even' },
      description: `Even pattern: add house ${i} (${VALUES[i]})${k > 0 ? ` to the running ${runningEven - VALUES[i]}` : ''}. Running even total: ${runningEven}.`,
      codeLine: 0,
      vars: mkVars(String(i), String(runningEven), '—', '—', { house: true, evens: true }),
    })
  }

  // Odd pass — build sum step by step, show 3 additions
  let runningOdd = 0
  for (let k = 0; k < oddIdx.length; k++) {
    const i = oddIdx[k]
    runningOdd += VALUES[i]
    steps.push({
      state: { phase: 'odds', evenIndices: evenIdx, oddIndices: oddIdx.slice(0, k + 1), evenSum: evenSum, oddSum: runningOdd, highlight: 'odd' },
      description: `Odd pattern: add house ${i} (${VALUES[i]})${k > 0 ? ` to the running ${runningOdd - VALUES[i]}` : ''}. Running odd total: ${runningOdd}.`,
      codeLine: 1,
      vars: mkVars(String(i), String(evenSum), String(runningOdd), '—', { house: true, odds: true }),
    })
  }

  // Compare
  steps.push({
    state: { phase: 'compare', evenIndices: evenIdx, oddIndices: oddIdx, evenSum, oddSum, highlight: 'neither' },
    description: `Compare: even total = ${evenSum}, odd total = ${oddSum}. Greedy picks the odd pattern: ${oddSum}. But the true optimum is 19 — houses 0, 2, 5, which rob both 9 (even) and 8 (odd). Strict alternation can never span both patterns.`,
    codeLine: 2,
    vars: mkVars('—', String(evenSum), String(oddSum), String(Math.max(evenSum, oddSum)), { answer: true }),
  })

  // Verdict — show the winning houses 0,2,5 vs greedy's 1,3,5
  steps.push({
    state: { phase: 'verdict', evenIndices: [0, 2, 5], oddIndices: oddIdx, evenSum: 19, oddSum, highlight: 'neither' },
    description: `FAIL. Greedy returns ${oddSum}; the answer is 19 (houses 0, 2, 5 → ${VALUES[0]} + ${VALUES[2]} + ${VALUES[5]}). The winning plan passes over TWO houses in a row (houses 3 and 4, worth 3 and 1) to grab both 9 and 8 — a non-alternating rhythm no greedy can produce.`,
    codeLine: -1,
    vars: mkVars('—', String(evenSum), String(oddSum), String(Math.max(evenSum, oddSum))),
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

   Honest: all 25 calls shown, one step each; per-index counts [5,8,5,3,2,1,1].
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

  // Run the full recursion once and record the call log (25 entries)
  const callLog: number[] = []
  function best(i: number): number {
    callLog.push(i)
    if (i === 0) return VALUES[0]
    if (i === 1) return Math.max(VALUES[0], VALUES[1])
    return Math.max(best(i - 1), VALUES[i] + best(i - 2))
  }
  const answer = best(n - 1)
  const totalCallCount = callLog.length // 25 — frozen here; never call best() again

  // What each best(i) resolves to, computed without touching the call log
  const val: number[] = new Array(n)
  val[0] = VALUES[0]
  val[1] = Math.max(VALUES[0], VALUES[1])
  for (let i = 2; i < n; i++) val[i] = Math.max(val[i - 1], VALUES[i] + val[i - 2])

  // Compute running callCounts after each call
  const snapshots: number[][] = []
  const running = new Array(n).fill(0)
  for (const idx of callLog) {
    running[idx]++
    snapshots.push([...running])
  }
  const finalCounts = snapshots[totalCallCount - 1] // [5,8,5,3,2,1,1]

  const mkVars = (
    i: string,
    valueI: string,
    bestI: string,
    callsToI: string,
    total: number,
    ch: { call?: boolean; total?: boolean } = {},
  ): VarEntry[] => [
    { name: 'i', value: i, ...(ch.call ? { changed: true } : {}) },
    { name: 'value[i]', value: valueI, ...(ch.call ? { changed: true } : {}) },
    { name: 'best(i)', value: bestI, ...(ch.call ? { changed: true } : {}) },
    { name: 'calls to best(i)', value: callsToI, ...(ch.call ? { changed: true } : {}) },
    { name: 'total calls', value: String(total), ...(ch.total ? { changed: true } : {}) },
  ]

  // Intro
  steps.push({
    state: { callCounts: new Array(n).fill(0), currentI: -1, totalCalls: 0, phase: 'intro' },
    description: `Recursive approach: best(i) = max(best(i−1), value[i] + best(i−2)). To price house 6 we call best(5) and best(4). Each of those calls two more. The call tree fans out — but how many unique questions exist?`,
    codeLine: 0,
    vars: mkVars('—', '—', '—', '—', 0, { total: true }),
  })

  // Show every one of the 25 calls, one honest step each
  for (let k = 0; k < totalCallCount; k++) {
    const i = callLog[k]
    const counts = snapshots[k]
    const callNum = k + 1
    const isRepeat = counts[i] > 1
    let description: string
    if (isRepeat) {
      description = `Call #${callNum}: best(${i}) AGAIN — visit #${counts[i]} to this same subproblem. ${i <= 1 ? 'Even the base case gets re-asked: it' : 'Nothing was written down, so the whole subtree below it is re-grown; it'} dutifully returns the identical ${val[i]}. Wasted work.`
    } else if (i === 0) {
      description = `Call #${callNum}: best(0) — first visit. Base case: the street is just house 0, so return value[0] = ${VALUES[0]} immediately.`
    } else if (i === 1) {
      description = `Call #${callNum}: best(1) — first visit. Base case: houses 0 and 1 are neighbors, so return max(${VALUES[0]}, ${VALUES[1]}) = ${val[1]} immediately.`
    } else {
      description = `Call #${callNum}: best(${i}) — first visit. To price houses 0…${i} it must ask best(${i - 1}) (skip house ${i}) and best(${i - 2}) (rob its ${VALUES[i]}); the branches will resolve to max(${val[i - 1]}, ${VALUES[i]} + ${val[i - 2]}) = ${val[i]}.`
    }
    steps.push({
      state: { callCounts: counts, currentI: i, totalCalls: callNum, phase: 'call' },
      description,
      codeLine: i === 0 ? 1 : i === 1 ? 2 : 3,
      vars: mkVars(String(i), String(VALUES[i]), String(val[i]), `${counts[i]}${isRepeat ? ' (repeat!)' : ' (first)'}`, callNum, { call: true, total: true }),
    })
  }

  // Verdict — after every call was actually shown
  steps.push({
    state: { callCounts: finalCounts, currentI: -1, totalCalls: totalCallCount, phase: 'verdict' },
    description: `Answer: best(${n - 1}) = ${answer}. Correct — but ${totalCallCount} calls answered only ${n} distinct questions, wasting ${totalCallCount - n} duplicate calls: best(1) was answered ${finalCounts[1]} times and best(2) ${finalCounts[2]} times. At 40 houses the call count tracks Fibonacci growth — roughly 331 million calls for 40 distinct answers.`,
    codeLine: -1,
    vars: mkVars('—', '—', `${answer} (= best(${n - 1}))`, '—', totalCallCount),
  })

  return steps
}

function RecursionViz({ step }: { step: Step<RecursionState> }) {
  const { callCounts, currentI, totalCalls, phase } = step.state
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

   Honest: 7 misses, 4 hits, 11 total calls — all shown.
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

  const fmtMemo = (a: (number | null)[]) => `[${a.map(v => (v === null ? '—' : v)).join(', ')}]`
  const mkVars = (
    i: string,
    memoArr: (number | null)[],
    memoI: string,
    hits: number,
    misses: number,
    ch: { i?: boolean; memo?: boolean; memoI?: boolean; hits?: boolean; misses?: boolean } = {},
  ): VarEntry[] => [
    { name: 'i', value: i, ...(ch.i ? { changed: true } : {}) },
    { name: 'memo[]', value: fmtMemo(memoArr), ...(ch.memo ? { changed: true } : {}) },
    { name: 'memo[i]', value: memoI, ...(ch.memoI ? { changed: true } : {}) },
    { name: 'hits', value: String(hits), ...(ch.hits ? { changed: true } : {}) },
    { name: 'misses', value: String(misses), ...(ch.misses ? { changed: true } : {}) },
  ]

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
    vars: mkVars('—', new Array(n).fill(null), '—', 0, 0, { memo: true }),
  })

  // Show all 11 events
  let hits = 0; let misses = 0
  for (let k = 0; k < events.length; k++) {
    const { i, hit, memoAfter } = events[k]
    if (hit) hits++; else misses++
    const val = memoAfter[i]
    let description: string
    if (hit) {
      description = `best(${i}): memo[${i}] already holds ${val} — CACHE HIT. Return ${val} instantly, zero recursion below this call. (Hit #${hits})`
    } else if (i === 0) {
      description = `best(0): memo[0] was empty — base case, store memo[0] ← value[0] = ${val}. (Miss #${misses})`
    } else if (i === 1) {
      description = `best(1): memo[1] was empty — base case, store memo[1] ← max(${VALUES[0]}, ${VALUES[1]}) = ${val}. (Miss #${misses})`
    } else {
      description = `best(${i}): memo[${i}] was empty — its recursion just resolved best(${i - 1}) = ${memoAfter[i - 1]} and best(${i - 2}) = ${memoAfter[i - 2]}, so store memo[${i}] ← max(${memoAfter[i - 1]}, ${VALUES[i]} + ${memoAfter[i - 2]}) = ${val}. (Miss #${misses})`
    }
    steps.push({
      state: { memo: memoAfter, currentI: i, isHit: hit, hits, misses, phase: 'call' },
      description,
      codeLine: hit ? 2 : i <= 1 ? 3 : 4,
      vars: mkVars(String(i), memoAfter, String(val), hits, misses, {
        i: true,
        memoI: true,
        ...(hit ? { hits: true } : { memo: true, misses: true }),
      }),
    })
  }

  // Verdict
  const finalMemo = events[events.length - 1].memoAfter
  steps.push({
    state: { memo: finalMemo, currentI: -1, isHit: null, hits: totalHits, misses: totalMisses, phase: 'verdict' },
    description: `Answer: ${answer}. ${totalMisses} real computations + ${totalHits} cache hits = ${totalHits + totalMisses} total calls (vs 25 for naive recursion). Linear work — but the stack still dives ${n} frames deep. On a 100,000-house street that depth blows the call stack. And the fill order was always 0, 1, 2, 3, 4, 5, 6 — left to right, no recursion needed.`,
    codeLine: -1,
    vars: mkVars('—', finalMemo, String(answer), totalHits, totalMisses),
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
