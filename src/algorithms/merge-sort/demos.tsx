import type { AttemptDemo, Step, VarEntry } from '../../core/types'
import { Cells, Legend, VizCaption } from '../../components/vizPrimitives'
import { ARR, SORTED } from './data'

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 1: Brute force — bubble sort
   pseudocode index matches problem.naive.pseudocode:
     0: 'repeat:'
     1: '    swapped ← false'
     2: '    for i ← 0 .. n − 2:'
     3: '        if a[i] > a[i+1]:'
     4: '            swap a[i], a[i+1]; swapped ← true'
     5: 'until swapped = false'
────────────────────────────────────────────────────────────────────────────── */

interface BubbleState {
  arr: number[]
  passI: number    // current pass number (1-indexed), -1 for intro
  scanI: number    // current comparison index within pass, -1 when not scanning
  swapCount: number
  compCount: number
  phase: 'intro' | 'scan' | 'swap' | 'summary' | 'verdict'
}

function bubbleSteps(): Step<BubbleState>[] {
  const steps: Step<BubbleState>[] = []
  const a = [...ARR]
  const n = a.length

  let totalSwaps = 0
  let totalComps = 0

  const fmtBool = (b: boolean | null) => (b === null ? '—' : String(b))
  const bubbleVars = (
    pass: number | null,
    i: number | null,
    swapped: boolean | null,
    changed: string[],
  ): VarEntry[] => {
    const c = (nm: string) => (changed.includes(nm) ? { changed: true as const } : {})
    return [
      { name: 'pass', value: pass === null ? '—' : String(pass), ...c('pass') },
      { name: 'i', value: i === null ? '—' : String(i), ...c('i') },
      { name: 'swapped', value: fmtBool(swapped), ...c('swapped') },
      { name: 'comparisons', value: String(totalComps), ...c('comparisons') },
      { name: 'swaps', value: String(totalSwaps), ...c('swaps') },
    ]
  }

  // Sentinel intro — no duplicate of first real frame
  steps.push({
    state: { arr: [...a], passI: -1, scanI: -1, swapCount: 0, compCount: 0, phase: 'intro' },
    description: `Bubble sort on [${ARR.join(', ')}]: sweep left to right, swap every adjacent pair that is out of order, repeat until a full pass finds nothing to fix. Up to n·(n−1)/2 = ${(n * (n - 1)) / 2} pair-comparisons — 28 — for these 8 numbers.`,
    codeLine: 0,
    vars: bubbleVars(null, null, null, []),
  })

  // Run EVERY pass fully — one real step per comparison, plus a pass-end step.
  let pass = 0
  let sweptClean = false
  while (!sweptClean) {
    pass++
    let swapped = false
    let passSwaps = 0
    const limit = n - pass // last (pass−1) slots already settled by earlier passes
    for (let i = 0; i < limit; i++) {
      totalComps++
      const firstOfPass = i === 0
      if (a[i] > a[i + 1]) {
        const big = a[i]
        const small = a[i + 1]
        ;[a[i], a[i + 1]] = [a[i + 1], a[i]]
        totalSwaps++
        passSwaps++
        swapped = true
        steps.push({
          state: { arr: [...a], passI: pass, scanI: i, swapCount: totalSwaps, compCount: totalComps, phase: 'swap' },
          description: `Pass ${pass}, comparison ${totalComps}: ${big} > ${small} — out of order, swap. ${big} drifts one slot right and the array is now [${a.join(', ')}]; ${small} gained exactly one position.`,
          codeLine: 4,
          vars: bubbleVars(pass, i, true, firstOfPass ? ['pass', 'i', 'swapped', 'comparisons', 'swaps'] : ['i', 'swapped', 'comparisons', 'swaps']),
        })
      } else {
        steps.push({
          state: { arr: [...a], passI: pass, scanI: i, swapCount: totalSwaps, compCount: totalComps, phase: 'scan' },
          description: `Pass ${pass}, comparison ${totalComps}: ${a[i]} ≤ ${a[i + 1]} — already in order, no swap. The pair was still re-examined: bubble sort pays a comparison whether or not it learns anything new.`,
          codeLine: 3,
          vars: bubbleVars(pass, i, swapped, firstOfPass ? ['pass', 'i', 'swapped', 'comparisons'] : ['i', 'comparisons']),
        })
      }
    }
    if (!swapped) sweptClean = true
    const settled = a[n - pass]
    const fiveIdx = a.indexOf(5)
    steps.push({
      state: { arr: [...a], passI: pass, scanI: -1, swapCount: totalSwaps, compCount: totalComps, phase: 'summary' },
      description: swapped
        ? `Pass ${pass} done: ${limit} comparison${limit !== 1 ? 's' : ''}, ${passSwaps} swap${passSwaps !== 1 ? 's' : ''} — ${settled} has bubbled into its final slot at index ${n - pass}${fiveIdx > 1 ? `, yet 5 still sits at index ${fiveIdx}, ${fiveIdx - 1} slot${fiveIdx - 1 !== 1 ? 's' : ''} from home` : ''}. swapped = true, so sweep again.`
        : `Pass ${pass} done: ${limit} comparison${limit !== 1 ? 's' : ''}, zero swaps — a fully clean sweep is the only proof bubble sort accepts that the array [${a.join(', ')}] is sorted, so the loop stops.`,
      codeLine: 5,
      vars: bubbleVars(pass, null, swapped, []),
    })
  }

  // Verdict — every pass was shown above; these totals were all played out.
  steps.push({
    state: { arr: [...SORTED], passI: -1, scanI: -1, swapCount: totalSwaps, compCount: totalComps, phase: 'verdict' },
    description: `Done: [${SORTED.join(', ')}] in ${pass} passes, ${totalComps} comparisons, ${totalSwaps} swaps — every one shown above. Each pass moves a value at most ONE slot — 5, displaced 6 positions, needed 6 separate passes to travel home. Compare with merge sort's 3 levels of cheap zips: the same 8 numbers in 24 placements.`,
    codeLine: -1,
    vars: bubbleVars(pass, null, false, []),
  })

  return steps
}

function BubbleViz({ step }: { step: Step<BubbleState> }) {
  const { arr, passI, scanI, swapCount, compCount, phase } = step.state
  const n = arr.length
  // After p completed passes, the last p cells are settled: k >= n - p
  // During pass p, last (p-1) cells are settled from previous passes.
  const settledFrom = passI > 0 ? n - (passI - 1) : n

  return (
    <>
      <VizCaption>
        {phase === 'intro' && `unsorted input · n = ${n}`}
        {(phase === 'scan' || phase === 'swap') && `pass ${passI} · comparisons = ${compCount} · swaps = ${swapCount}`}
        {phase === 'summary' && `pass ${passI} done · ${compCount} comparisons · ${swapCount} swaps`}
        {phase === 'verdict' && `sorted · ${compCount} comparisons · ${swapCount} swaps`}
      </VizCaption>
      <Cells
        values={arr}
        classFor={k => {
          if (phase === 'verdict') return 'done'
          if (phase === 'summary') return k >= n - passI ? 'done' : ''
          if (phase === 'intro') return ''
          // settled cells from previous passes
          if (k >= settledFrom) return 'done'
          if (k === scanI) return 'active'
          if (k === scanI + 1 && scanI >= 0) return 'warm'
          return ''
        }}
        pointerFor={k => {
          if ((phase === 'scan' || phase === 'swap') && scanI >= 0 && k === scanI) return { label: 'i', tone: 'mint' }
          if ((phase === 'scan' || phase === 'swap') && scanI >= 0 && k === scanI + 1) return { label: 'i+1', tone: 'amber' }
          return null
        }}
      />
      <Legend
        items={[
          { tone: 'mint', label: 'a[i]' },
          { tone: 'amber', label: 'a[i+1]' },
          { label: 'settled (bubbled up)' },
        ]}
      />
    </>
  )
}

export const naiveDemo: AttemptDemo<BubbleState> = { generateSteps: bubbleSteps, Visualizer: BubbleViz }

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 2: Insertion sort (journey[0], verdict: partial)
   pseudocode index matches journey[0].pseudocode:
     0: 'for i ← 1 .. n − 1:'
     1: '    x ← a[i]; j ← i − 1'
     2: '    while j ≥ 0 and a[j] > x:'
     3: '        a[j+1] ← a[j]   // shift right one slot'
     4: '        j ← j − 1'
     5: '    a[j+1] ← x'
────────────────────────────────────────────────────────────────────────────── */

interface InsertionState {
  arr: number[]
  outerI: number    // current element being inserted (-1 = intro)
  insertX: number | null  // value being inserted
  scanJ: number     // current j (shift position), -1 when not scanning
  totalShifts: number
  phase: 'intro' | 'pick' | 'shift' | 'place' | 'verdict'
}

function insertionSteps(): Step<InsertionState>[] {
  const steps: Step<InsertionState>[] = []
  const a = [...ARR]
  const n = a.length
  let runningShifts = 0

  const insVars = (
    i: number | null,
    x: number | null,
    j: number | null,
    prefix: number[] | null,
    changed: string[],
  ): VarEntry[] => {
    const c = (nm: string) => (changed.includes(nm) ? { changed: true as const } : {})
    const num = (v: number | null) => (v === null ? '—' : String(v))
    return [
      { name: 'i', value: num(i), ...c('i') },
      { name: 'x', value: num(x), ...c('x') },
      { name: 'j', value: num(j), ...c('j') },
      { name: 'sorted prefix', value: prefix === null ? '—' : `[${prefix.join(', ')}]`, ...c('sorted prefix') },
      { name: 'shifts', value: String(runningShifts), ...c('shifts') },
    ]
  }

  // Sentinel intro
  steps.push({
    state: { arr: [...a], outerI: -1, insertX: null, scanJ: -1, totalShifts: 0, phase: 'intro' },
    description: `Insertion sort on [${ARR.join(', ')}]: grow a sorted prefix — pick each new element and slide it leftward past everything larger until it sits in place. Every comparison now places something (better than bubble!), but each value still moves ONE slot per shift. The prefix starts as just [${a[0]}], sorted by definition.`,
    codeLine: 0,
    vars: insVars(null, null, null, [a[0]], []),
  })

  // Run EVERY insertion i = 1..7 for real — pick, each one-slot shift, place.
  for (let i = 1; i < n; i++) {
    const x = a[i]
    const prefix = a.slice(0, i)
    const needed = prefix.filter(v => v > x).length

    if (needed === 0) {
      // x is already ≥ the prefix max: one comparison, zero shifts — pick and place in one honest step.
      steps.push({
        state: { arr: [...a], outerI: i, insertX: x, scanJ: i, totalShifts: runningShifts, phase: 'place' },
        description: `i = ${i}: pick x = ${x}. The prefix's largest value ${prefix[i - 1]} ≤ ${x}, so a single comparison proves ${x} already sits where it belongs — 0 shifts. Sorted prefix grows to [${a.slice(0, i + 1).join(', ')}].`,
        codeLine: 5,
        vars: insVars(i, x, i - 1, a.slice(0, i + 1), ['i', 'x', 'j', 'sorted prefix']),
      })
      continue
    }

    steps.push({
      state: { arr: [...a], outerI: i, insertX: x, scanJ: i, totalShifts: runningShifts, phase: 'pick' },
      description: `i = ${i}: pick x = ${x}. Sorted prefix: [${prefix.join(', ')}] — ${needed} of its value${needed !== 1 ? 's are' : ' is'} larger than ${x}, so ${x} must crawl ${needed} slot${needed !== 1 ? 's' : ''} left, one shift at a time.`,
      codeLine: 1,
      vars: insVars(i, x, i - 1, prefix, ['i', 'x', 'j']),
    })

    let j = i - 1
    let done = 0
    while (j >= 0 && a[j] > x) {
      const moved = a[j]
      a[j + 1] = a[j]
      runningShifts++
      done++
      const isLast = j === 0 || a[j - 1] <= x
      steps.push({
        state: { arr: [...a], outerI: i, insertX: x, scanJ: j, totalShifts: runningShifts, phase: 'shift' },
        description: isLast
          ? `${moved} > ${x} — shift ${moved} right one slot (shift #${runningShifts} overall). ${j === 0 ? 'The gap has reached the front of the array' : `${a[j - 1]}, just ahead, is ≤ ${x}`}, so the slide ends here.`
          : `${moved} > ${x} — shift ${moved} right one slot (shift #${runningShifts} overall). The gap moves to index ${j}; ${needed - done} larger value${needed - done !== 1 ? 's' : ''} still stand${needed - done === 1 ? 's' : ''} between ${x} and its home.`,
        codeLine: 3,
        vars: insVars(i, x, j - 1, prefix, ['j', 'shifts']),
      })
      j--
    }

    a[j + 1] = x
    steps.push({
      state: { arr: [...a], outerI: i, insertX: x, scanJ: j + 1, totalShifts: runningShifts, phase: 'place' },
      description: `Place ${x} into the gap at index ${j + 1}: everything left of it is ≤ ${x}, everything right is larger. ${needed} one-slot shift${needed !== 1 ? 's' : ''} for this element; sorted prefix is now [${a.slice(0, i + 1).join(', ')}].`,
      codeLine: 5,
      vars: insVars(i, x, j, a.slice(0, i + 1), ['sorted prefix']),
    })
  }

  // Verdict — all 7 insertions and all 17 shifts were shown above.
  steps.push({
    state: { arr: [...SORTED], outerI: -1, insertX: null, scanJ: -1, totalShifts: runningShifts, phase: 'verdict' },
    description: `Done: [${SORTED.join(', ')}] in ${runningShifts} shifts — leaner than bubble sort's repeated passes, but the O(n²) wall remains: 5 traveled 6 positions via 6 one-slot shifts. In a reversed million-element array every element crawls home one step at a time: ~500 billion shifts, just as before.`,
    codeLine: -1,
    vars: insVars(null, null, null, [...SORTED], []),
  })

  return steps
}

function InsertionViz({ step }: { step: Step<InsertionState> }) {
  const { arr, outerI, insertX, scanJ, totalShifts, phase } = step.state
  return (
    <>
      <VizCaption>
        {phase === 'intro' && `unsorted input · n = ${arr.length}`}
        {phase === 'pick' && `i = ${outerI} · picking x = ${insertX} · shifts so far = ${totalShifts}`}
        {phase === 'shift' && `shifting right · x = ${insertX} · shifts so far = ${totalShifts}`}
        {phase === 'place' && `placed · shifts so far = ${totalShifts}`}
        {phase === 'verdict' && `sorted · ${totalShifts} total shifts`}
      </VizCaption>
      <Cells
        values={arr}
        classFor={k => {
          if (phase === 'verdict') return 'done'
          if (phase === 'intro') return ''
          // sorted prefix = [0 .. outerI-1] (before current insertion) or [0..outerI] (after place)
          const sortedEnd = phase === 'place' ? outerI : outerI - 1
          if (k <= sortedEnd && k !== scanJ) return 'done'
          if (k === scanJ) return phase === 'shift' ? 'active' : 'done'
          if (k === outerI && (phase === 'pick')) return 'warm'
          return ''
        }}
        pointerFor={k => {
          if ((phase === 'pick') && k === outerI) return { label: 'x', tone: 'amber' }
          if (phase === 'shift' && k === scanJ) return { label: 'j', tone: 'mint' }
          if (phase === 'place' && k === scanJ) return { label: '←x', tone: 'mint' }
          return null
        }}
      />
      <Legend
        items={[
          { tone: 'amber', label: 'element being inserted' },
          { tone: 'mint', label: 'current shift position j' },
          { label: 'sorted prefix' },
        ]}
      />
    </>
  )
}

export const insertionDemo: AttemptDemo<InsertionState> = { generateSteps: insertionSteps, Visualizer: InsertionViz }

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 3: Divide and conquer — sort halves, concatenate (journey[1], verdict: fail)
   pseudocode index matches journey[1].pseudocode:
     0: 'mid ← n / 2'
     1: 'left  ← sort(a[0 .. mid−1])    // half the size'
     2: 'right ← sort(a[mid .. n−1])'
     3: 'answer ← left followed by right'
────────────────────────────────────────────────────────────────────────────── */

interface NaiveSplitState {
  arr: number[]
  leftHalf: number[]
  rightHalf: number[]
  combined: number[] | null
  seamIdx: number   // index of out-of-order boundary in combined, -1 if not shown
  leftSorted: boolean
  rightSorted: boolean
  phase: 'intro' | 'split' | 'sorted-left' | 'sorted-right' | 'concat' | 'verdict'
}

function naiveSplitSteps(): Step<NaiveSplitState>[] {
  const steps: Step<NaiveSplitState>[] = []
  const n = ARR.length
  const mid = Math.floor(n / 2)
  const leftOrig = ARR.slice(0, mid)   // [38, 27, 43, 3]
  const rightOrig = ARR.slice(mid)     // [9, 82, 10, 5]
  const sortedLeft = [...leftOrig].sort((a, b) => a - b)   // [3, 27, 38, 43]
  const sortedRight = [...rightOrig].sort((a, b) => a - b) // [5, 9, 10, 82]
  const combined = [...sortedLeft, ...sortedRight]          // [3, 27, 38, 43, 5, 9, 10, 82]

  // Seam: last element of left half vs first element of right half
  const seamIdx = mid - 1  // 43 is at index 3; 5 is at index 4

  const splitVars = (
    m: number | null,
    left: number[] | null,
    right: number[] | null,
    answer: number[] | null,
    changed: string[],
  ): VarEntry[] => {
    const c = (nm: string) => (changed.includes(nm) ? { changed: true as const } : {})
    const arr = (xs: number[] | null) => (xs === null ? '—' : `[${xs.join(', ')}]`)
    return [
      { name: 'mid', value: m === null ? '—' : String(m), ...c('mid') },
      { name: 'left', value: arr(left), ...c('left') },
      { name: 'right', value: arr(right), ...c('right') },
      { name: 'answer', value: arr(answer), ...c('answer') },
    ]
  }

  const blank = (phase: NaiveSplitState['phase'], overrides: Partial<NaiveSplitState> = {}): NaiveSplitState => ({
    arr: [...ARR],
    leftHalf: [],
    rightHalf: [],
    combined: null,
    seamIdx: -1,
    leftSorted: false,
    rightSorted: false,
    phase,
    ...overrides,
  })

  // Sentinel intro
  steps.push({
    state: blank('intro'),
    description: `Divide-and-conquer on [${ARR.join(', ')}]: sorting a half-size array is cheaper — split at the midpoint, sort each half on its own, then concatenate. The plan: left half [${leftOrig.join(', ')}] and right half [${rightOrig.join(', ')}].`,
    codeLine: 0,
    vars: splitVars(null, null, null, null, []),
  })

  // Split step
  steps.push({
    state: blank('split', { leftHalf: leftOrig, rightHalf: rightOrig }),
    description: `Split at mid = ${mid}: left = [${leftOrig.join(', ')}], right = [${rightOrig.join(', ')}]. Each half is 4 elements — sorting a 4-element array costs roughly 4² = 16 units vs 8² = 64 for the whole; that is a real gain.`,
    codeLine: 0,
    vars: splitVars(mid, leftOrig, rightOrig, null, ['mid', 'left', 'right']),
  })

  // Walk through sorting the left half with a few concrete observations
  steps.push({
    state: blank('sorted-left', { leftHalf: leftOrig, rightHalf: rightOrig, leftSorted: false }),
    description: `Sorting left half [${leftOrig.join(', ')}] recursively. 3 is the smallest — it must travel from index 3 all the way to index 0. The recursion handles this, at a cost proportional to (n/2)² = 16 for four elements.`,
    codeLine: 1,
    vars: splitVars(mid, leftOrig, rightOrig, null, []),
  })

  steps.push({
    state: blank('sorted-left', { leftHalf: sortedLeft, rightHalf: rightOrig, leftSorted: true }),
    description: `Left half sorted: [${sortedLeft.join(', ')}]. Maximum = ${sortedLeft[sortedLeft.length - 1]}. The recursion correctly placed every value relative to its neighbours — but only within this four-element window. Now sort the right half.`,
    codeLine: 1,
    vars: splitVars(mid, sortedLeft, rightOrig, null, ['left']),
  })

  // Walk through sorting the right half
  steps.push({
    state: blank('sorted-right', { leftHalf: sortedLeft, rightHalf: rightOrig, leftSorted: true, rightSorted: false }),
    description: `Sorting right half [${rightOrig.join(', ')}] recursively. 5 is the minimum here — it must reach index 0 of the right window. Again proportional cost of (n/2)².`,
    codeLine: 2,
    vars: splitVars(mid, sortedLeft, rightOrig, null, []),
  })

  steps.push({
    state: blank('sorted-right', { leftHalf: sortedLeft, rightHalf: sortedRight, leftSorted: true, rightSorted: true }),
    description: `Right half sorted: [${sortedRight.join(', ')}]. Minimum = ${sortedRight[0]}. Both halves are now in perfect order within their own windows. The question is: where does ${sortedRight[0]} belong in the FULL array?`,
    codeLine: 2,
    vars: splitVars(mid, sortedLeft, sortedRight, null, ['right']),
  })

  // Concatenate
  steps.push({
    state: blank('concat', { leftHalf: sortedLeft, rightHalf: sortedRight, combined, leftSorted: true, rightSorted: true }),
    description: `Concatenate left ++ right: [${sortedLeft.join(', ')}] followed by [${sortedRight.join(', ')}] = [${combined.join(', ')}]. Gluing end-to-end costs nothing — but look at the junction between the two halves.`,
    codeLine: 3,
    vars: splitVars(mid, sortedLeft, sortedRight, combined, ['answer']),
  })

  // Verdict — highlight the seam
  steps.push({
    state: blank('verdict', {
      leftHalf: sortedLeft,
      rightHalf: sortedRight,
      combined,
      seamIdx,
      leftSorted: true,
      rightSorted: true,
    }),
    description: `Result: [${combined.join(', ')}] — WRONG. ${sortedLeft[sortedLeft.length - 1]} ends the left half; ${sortedRight[0]} starts the right half: ${sortedLeft[sortedLeft.length - 1]} > ${sortedRight[0]}. The sorting was locally correct but globally blind: ${sortedRight[0]}, ${sortedRight[1]}, and ${sortedRight[2]} all belong among the left half's values. Concatenation throws away the global ordering — the seam is broken.`,
    codeLine: 3,
    vars: splitVars(mid, sortedLeft, sortedRight, combined, []),
  })

  return steps
}

function NaiveSplitViz({ step }: { step: Step<NaiveSplitState> }) {
  const { arr, leftHalf, rightHalf, combined, seamIdx, leftSorted, rightSorted, phase } = step.state
  return (
    <>
      <VizCaption>
        {phase === 'intro' && `input: [${arr.join(', ')}]`}
        {phase === 'split' && `split at midpoint — two unsorted halves`}
        {phase === 'sorted-left' && (leftSorted ? `left half sorted — sorting right half next` : `sorting left half recursively`)}
        {phase === 'sorted-right' && (rightSorted ? `both halves sorted — ready to concatenate` : `sorting right half recursively`)}
        {phase === 'concat' && `concatenated — seam not yet checked`}
        {phase === 'verdict' && `wrong: seam broken at position ${seamIdx}–${seamIdx + 1}`}
      </VizCaption>

      {phase === 'intro' && (
        <Cells values={arr} classFor={() => ''} />
      )}

      {(phase === 'split' || phase === 'sorted-left' || phase === 'sorted-right') && (
        <>
          <VizCaption>left half</VizCaption>
          <Cells
            values={leftHalf}
            classFor={() => leftSorted ? 'done' : ''}
          />
          <VizCaption>right half</VizCaption>
          <Cells
            values={rightHalf}
            classFor={() => rightSorted ? 'done' : ''}
          />
        </>
      )}

      {(phase === 'concat' || phase === 'verdict') && combined && (
        <>
          <VizCaption>combined (left ++ right)</VizCaption>
          <Cells
            values={combined}
            classFor={k => {
              if (phase === 'concat') return 'done'
              // verdict: highlight the broken seam
              if (k === seamIdx || k === seamIdx + 1) return 'rose'
              return 'done'
            }}
            pointerFor={k => {
              if (phase === 'verdict' && k === seamIdx) return { label: '←seam', tone: 'rose' }
              if (phase === 'verdict' && k === seamIdx + 1) return { label: 'seam→', tone: 'rose' }
              return null
            }}
          />
        </>
      )}

      <Legend
        items={[
          { label: 'sorted within half' },
          { tone: 'rose', label: 'broken seam' },
        ]}
      />
    </>
  )
}

export const naiveSplitDemo: AttemptDemo<NaiveSplitState> = { generateSteps: naiveSplitSteps, Visualizer: NaiveSplitViz }
