import type { AttemptDemo, Step } from '../../core/types'
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

  // Sentinel intro — no duplicate of first real frame
  steps.push({
    state: { arr: [...a], passI: -1, scanI: -1, swapCount: 0, compCount: 0, phase: 'intro' },
    description: `Bubble sort on [${ARR.join(', ')}]: sweep left to right, swap every adjacent pair that is out of order, repeat until a full pass finds nothing to fix. Up to n·(n−1)/2 = ${(n * (n - 1)) / 2} pair-comparisons — 28 — for these 8 numbers.`,
    codeLine: 0,
  })

  let totalSwaps = 0
  let totalComps = 0

  // Run pass 1 fully (the most instructive pass — 7 comparisons)
  {
    const passI = 1
    let swapped = false
    for (let i = 0; i < n - 1; i++) {
      totalComps++
      if (a[i] > a[i + 1]) {
        const lo = a[i]
        const hi = a[i + 1]
        ;[a[i], a[i + 1]] = [a[i + 1], a[i]]
        totalSwaps++
        swapped = true
        steps.push({
          state: { arr: [...a], passI, scanI: i, swapCount: totalSwaps, compCount: totalComps, phase: 'swap' },
          description: `Pass ${passI}, comparison ${totalComps}: ${lo} > ${hi} — swap. Array is now [${a.join(', ')}]. One swap, but ${lo} only moved one slot.`,
          codeLine: 4,
        })
      } else {
        steps.push({
          state: { arr: [...a], passI, scanI: i, swapCount: totalSwaps, compCount: totalComps, phase: 'scan' },
          description: `Pass ${passI}, comparison ${totalComps}: ${a[i]} ≤ ${a[i + 1]} — already in order, no swap.`,
          codeLine: 3,
        })
      }
    }
    // After pass 1: 82 is settled at the end; find where 5 landed
    const fiveIdx = a.indexOf(5)
    steps.push({
      state: { arr: [...a], passI, scanI: -1, swapCount: totalSwaps, compCount: totalComps, phase: 'scan' },
      description: `Pass 1 done: ${n - 1} comparisons, ${totalSwaps} swaps. The largest value 82 has bubbled to position ${n - 1}. But 5 is now at index ${fiveIdx} — it belongs at index 1 and has ${fiveIdx - 1} more positions to travel, one per pass.`,
      codeLine: 5,
    })
  }

  // Simulate remaining passes fully to get honest counts, but show a summary step
  let passNum = 2
  let cont = true
  while (cont) {
    let swapped = false
    let passSwaps = 0
    for (let i = 0; i < n - passNum; i++) {
      totalComps++
      if (a[i] > a[i + 1]) {
        ;[a[i], a[i + 1]] = [a[i + 1], a[i]]
        totalSwaps++
        passSwaps++
        swapped = true
      }
    }
    if (!swapped) cont = false
    passNum++
  }
  const totalPasses = passNum - 1

  // Summary step (≥8 real steps already; now summarize remaining passes)
  steps.push({
    state: { arr: [...a], passI: totalPasses, scanI: -1, swapCount: totalSwaps, compCount: totalComps, phase: 'summary' },
    description: `Passes 2–${totalPasses} continue the same pattern — ${totalComps - (n - 1)} more comparisons across ${totalPasses - 1} passes, each bubbling one more large value into place. Running total: ${totalComps} comparisons, ${totalSwaps} swaps.`,
    codeLine: 0,
  })

  // Verdict
  steps.push({
    state: { arr: [...SORTED], passI: -1, scanI: -1, swapCount: totalSwaps, compCount: totalComps, phase: 'verdict' },
    description: `Done: [${SORTED.join(', ')}] in ${totalPasses} passes, ${totalComps} comparisons, ${totalSwaps} swaps. Each pass moves every value at most ONE slot — a value displaced 6 positions (like 5) needs 6 separate passes to travel home. Compare with merge sort's 3 levels of cheap zips: the same 8 numbers in 24 placements.`,
    codeLine: -1,
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
        {phase === 'summary' && `passes 2–${passI} done · ${compCount} comparisons total`}
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
  phase: 'intro' | 'pick' | 'shift' | 'place' | 'summary' | 'verdict'
}

// Compute per-element shift counts honestly
function computeInsertionShifts(arr: number[]): { shifts: number[]; total: number } {
  const a = [...arr]
  const shifts: number[] = []
  let total = 0
  for (let i = 1; i < a.length; i++) {
    const x = a[i]
    let j = i - 1
    let s = 0
    while (j >= 0 && a[j] > x) {
      a[j + 1] = a[j]
      j--
      s++
    }
    a[j + 1] = x
    shifts.push(s)
    total += s
  }
  return { shifts, total }
}

function insertionSteps(): Step<InsertionState>[] {
  const steps: Step<InsertionState>[] = []
  const a = [...ARR]
  const n = a.length
  const { shifts, total } = computeInsertionShifts([...ARR])

  // Sentinel intro
  steps.push({
    state: { arr: [...a], outerI: -1, insertX: null, scanJ: -1, totalShifts: 0, phase: 'intro' },
    description: `Insertion sort on [${ARR.join(', ')}]: grow a sorted prefix — pick each new element and slide it leftward past everything larger until it sits in place. Every comparison now places something (better than bubble!), but each value still moves ONE slot per shift.`,
    codeLine: 0,
  })

  let runningShifts = 0

  // Show i=1 (insert 27) and i=6 (insert 10) and i=7 (insert 5) in full
  // Summarize i=2..5 to stay within 8-25 steps

  // --- i = 1: insert 27 (1 shift) ---
  {
    const i = 1
    const x = a[i]
    steps.push({
      state: { arr: [...a], outerI: i, insertX: x, scanJ: i, totalShifts: runningShifts, phase: 'pick' },
      description: `i = ${i}: pick x = ${x}. Sorted prefix so far: [${a.slice(0, i).join(', ')}]. Slide ${x} left past anything larger.`,
      codeLine: 1,
    })
    let j = i - 1
    while (j >= 0 && a[j] > x) {
      a[j + 1] = a[j]
      runningShifts++
      steps.push({
        state: { arr: [...a], outerI: i, insertX: x, scanJ: j, totalShifts: runningShifts, phase: 'shift' },
        description: `${a[j + 1]} > ${x} — shift ${a[j + 1]} right one slot (shift #${runningShifts} total). Slot ${j + 1} freed.`,
        codeLine: 3,
      })
      j--
    }
    a[j + 1] = x
    steps.push({
      state: { arr: [...a], outerI: i, insertX: x, scanJ: j + 1, totalShifts: runningShifts, phase: 'place' },
      description: `Place ${x} at index ${j + 1}. Sorted prefix: [${a.slice(0, i + 1).join(', ')}]. ${shifts[i - 1]} shift${shifts[i - 1] !== 1 ? 's' : ''} for this element.`,
      codeLine: 5,
    })
  }

  // --- i = 2..5: simulate honestly, emit one summary step ---
  {
    const beforeSummary = runningShifts
    for (let i = 2; i <= 5; i++) {
      const x = a[i]
      let j = i - 1
      while (j >= 0 && a[j] > x) {
        a[j + 1] = a[j]
        runningShifts++
        j--
      }
      a[j + 1] = x
    }
    const summaryShifts = runningShifts - beforeSummary
    steps.push({
      state: { arr: [...a], outerI: 5, insertX: null, scanJ: -1, totalShifts: runningShifts, phase: 'summary' },
      description: `Elements i = 2 to 5 ([43, 3, 9, 82]) inserted in turn — ${summaryShifts} more shifts. 3 slid past two neighbors; 9 past three; 43 and 82 needed none and zero shifts respectively. Running total: ${runningShifts} shifts, sorted prefix now [${a.slice(0, 6).join(', ')}].`,
      codeLine: 0,
    })
  }

  // --- i = 6: insert 10 (4 shifts) ---
  {
    const i = 6
    const x = a[i]
    steps.push({
      state: { arr: [...a], outerI: i, insertX: x, scanJ: i, totalShifts: runningShifts, phase: 'pick' },
      description: `i = ${i}: pick x = ${x}. Sorted prefix: [${a.slice(0, i).join(', ')}]. Watch ${x} slide left.`,
      codeLine: 1,
    })
    let j = i - 1
    while (j >= 0 && a[j] > x) {
      a[j + 1] = a[j]
      runningShifts++
      steps.push({
        state: { arr: [...a], outerI: i, insertX: x, scanJ: j, totalShifts: runningShifts, phase: 'shift' },
        description: `${a[j + 1]} > ${x} — shift right (shift #${runningShifts}). One slot closer to home.`,
        codeLine: 3,
      })
      j--
    }
    a[j + 1] = x
    steps.push({
      state: { arr: [...a], outerI: i, insertX: x, scanJ: j + 1, totalShifts: runningShifts, phase: 'place' },
      description: `Place ${x} at index ${j + 1}. ${shifts[i - 1]} shifts for this element. Sorted prefix: [${a.slice(0, i + 1).join(', ')}].`,
      codeLine: 5,
    })
  }

  // --- i = 7: insert 5 (6 shifts — the dramatic case) ---
  {
    const i = 7
    const x = a[i]
    steps.push({
      state: { arr: [...a], outerI: i, insertX: x, scanJ: i, totalShifts: runningShifts, phase: 'pick' },
      description: `i = ${i}: pick x = ${x} — the last and smallest remaining value. Sorted prefix: [${a.slice(0, i).join(', ')}]. Every element is larger; ${x} must crawl the full ${shifts[i - 1]} slots.`,
      codeLine: 1,
    })
    let j = i - 1
    while (j >= 0 && a[j] > x) {
      a[j + 1] = a[j]
      runningShifts++
      steps.push({
        state: { arr: [...a], outerI: i, insertX: x, scanJ: j, totalShifts: runningShifts, phase: 'shift' },
        description: `${a[j + 1]} > ${x} — shift right (shift #${runningShifts}). ${x} still needs to pass ${j} more value${j !== 1 ? 's' : ''}.`,
        codeLine: 3,
      })
      j--
    }
    a[j + 1] = x
    steps.push({
      state: { arr: [...a], outerI: i, insertX: x, scanJ: j + 1, totalShifts: runningShifts, phase: 'place' },
      description: `Place ${x} at index ${j + 1}. ${shifts[i - 1]} shifts to move ${x} from position ${i} to position ${j + 1} — one slot at a time. Total shifts: ${runningShifts}.`,
      codeLine: 5,
    })
  }

  // Verdict
  steps.push({
    state: { arr: [...SORTED], outerI: -1, insertX: null, scanJ: -1, totalShifts: total, phase: 'verdict' },
    description: `Done: [${SORTED.join(', ')}] in ${total} shifts — leaner than bubble sort's repeated passes, but the O(n²) wall remains: 5 traveled 6 positions via 6 one-slot shifts. In a reversed million-element array every element crawls home one step at a time: ~500 billion shifts, just as before.`,
    codeLine: -1,
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
        {phase === 'summary' && `passes 2–5 done · shifts so far = ${totalShifts}`}
        {phase === 'verdict' && `sorted · ${totalShifts} total shifts`}
      </VizCaption>
      <Cells
        values={arr}
        classFor={k => {
          if (phase === 'verdict') return 'done'
          if (phase === 'intro' || phase === 'summary') return phase === 'summary' && outerI >= 0 && k <= outerI ? 'done' : ''
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
  })

  // Split step
  steps.push({
    state: blank('split', { leftHalf: leftOrig, rightHalf: rightOrig }),
    description: `Split at mid = ${mid}: left = [${leftOrig.join(', ')}], right = [${rightOrig.join(', ')}]. Each half is 4 elements — sorting a 4-element array costs roughly 4² = 16 units vs 8² = 64 for the whole; that is a real gain.`,
    codeLine: 0,
  })

  // Walk through sorting the left half with a few concrete observations
  steps.push({
    state: blank('sorted-left', { leftHalf: leftOrig, rightHalf: rightOrig, leftSorted: false }),
    description: `Sorting left half [${leftOrig.join(', ')}] recursively. 3 is the smallest — it must travel from index 3 all the way to index 0. The recursion handles this, at a cost proportional to (n/2)² = 16 for four elements.`,
    codeLine: 1,
  })

  steps.push({
    state: blank('sorted-left', { leftHalf: sortedLeft, rightHalf: rightOrig, leftSorted: true }),
    description: `Left half sorted: [${sortedLeft.join(', ')}]. Maximum = ${sortedLeft[sortedLeft.length - 1]}. The recursion correctly placed every value relative to its neighbours — but only within this four-element window. Now sort the right half.`,
    codeLine: 1,
  })

  // Walk through sorting the right half
  steps.push({
    state: blank('sorted-right', { leftHalf: sortedLeft, rightHalf: rightOrig, leftSorted: true, rightSorted: false }),
    description: `Sorting right half [${rightOrig.join(', ')}] recursively. 5 is the minimum here — it must reach index 0 of the right window. Again proportional cost of (n/2)².`,
    codeLine: 2,
  })

  steps.push({
    state: blank('sorted-right', { leftHalf: sortedLeft, rightHalf: sortedRight, leftSorted: true, rightSorted: true }),
    description: `Right half sorted: [${sortedRight.join(', ')}]. Minimum = ${sortedRight[0]}. Both halves are now in perfect order within their own windows. The question is: where does ${sortedRight[0]} belong in the FULL array?`,
    codeLine: 2,
  })

  // Concatenate
  steps.push({
    state: blank('concat', { leftHalf: sortedLeft, rightHalf: sortedRight, combined, leftSorted: true, rightSorted: true }),
    description: `Concatenate left ++ right: [${sortedLeft.join(', ')}] followed by [${sortedRight.join(', ')}] = [${combined.join(', ')}]. Gluing end-to-end costs nothing — but look at the junction between the two halves.`,
    codeLine: 3,
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
