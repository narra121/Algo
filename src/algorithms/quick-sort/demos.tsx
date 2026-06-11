import type { AttemptDemo, Step } from '../../core/types'
import { Cells, Legend, VizCaption } from '../../components/vizPrimitives'
import { ARR, SORTED } from './data'

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 1: Brute force — selection sort
   pseudocode index matches problem.naive.pseudocode:
     0: 'for i ← 0 .. n − 2:'
     1: '    m ← i'
     2: '    for j ← i + 1 .. n − 1:'
     3: '        if a[j] < a[m]: m ← j'
     4: '    swap a[i], a[m]'
────────────────────────────────────────────────────────────────────────────── */

interface SelSortState {
  arr: number[]
  outerI: number   // current outer pass index (-1 = intro)
  minIdx: number   // current minimum index (-1 when not scanning)
  scanJ: number    // current j scanner (-1 when not scanning)
  comparisons: number
  phase: 'intro' | 'scan' | 'swap' | 'summary' | 'verdict'
}

function selectionSteps(): Step<SelSortState>[] {
  const steps: Step<SelSortState>[] = []
  const a = [...ARR]
  const n = a.length

  // Intro sentinel
  steps.push({
    state: { arr: [...a], outerI: -1, minIdx: -1, scanJ: -1, comparisons: 0, phase: 'intro' },
    description: `Selection sort on [${ARR.join(', ')}]: repeatedly scan everything still unsorted, find the minimum, and plant it at the front. 7 + 6 + 5 + … + 1 = 28 comparisons, every time.`,
    codeLine: 0,
  })

  let comparisons = 0
  // Run pass 0 (i=0) fully: 7 comparisons + 1 swap = 8 steps total
  const i = 0
  let m = i
  // j scans i+1 .. n-1
  for (let j = i + 1; j < n; j++) {
    comparisons++
    const newMin = a[j] < a[m]
    if (newMin) {
      const prevM = m
      m = j
      steps.push({
        state: { arr: [...a], outerI: i, minIdx: m, scanJ: j, comparisons, phase: 'scan' },
        description: `Pass 1, check ${comparisons}: a[${j}] = ${a[j]} < a[${prevM}] = ${a[prevM]} — new minimum found at index ${j}. Minimum updates to ${a[j]}.`,
        codeLine: 3,
      })
    } else {
      steps.push({
        state: { arr: [...a], outerI: i, minIdx: m, scanJ: j, comparisons, phase: 'scan' },
        description: `Pass 1, check ${comparisons}: a[${j}] = ${a[j]} ≥ a[${m}] = ${a[m]} — not smaller. Minimum stays at ${a[m]}.`,
        codeLine: 3,
      })
    }
  }
  // Swap for pass 0
  const minVal = a[m]
  ;[a[i], a[m]] = [a[m], a[i]]
  steps.push({
    state: { arr: [...a], outerI: i, minIdx: m, scanJ: -1, comparisons, phase: 'swap' },
    description: `Pass 1 complete (${n - 1} comparisons). ${minVal} is the minimum — swap it to position ${i}. One element placed, ${n - 1} to go. Notice: all ${n - 1} comparisons from this pass are now forgotten.`,
    codeLine: 4,
  })

  // Summary: skip the remaining 6 passes, report total cost
  const remainingComparisons = 6 + 5 + 4 + 3 + 2 + 1  // = 21
  steps.push({
    state: { arr: [...a], outerI: 1, minIdx: -1, scanJ: -1, comparisons, phase: 'summary' },
    description: `Passes 2–7 follow the same pattern — ${remainingComparisons} more comparisons across 6 passes, each buying exactly one placement and discarding everything else learned. Total: ${comparisons + remainingComparisons} comparisons to sort 8 numbers.`,
    codeLine: 0,
  })

  // Verdict
  steps.push({
    state: { arr: [...SORTED], outerI: -1, minIdx: -1, scanJ: -1, comparisons: 28, phase: 'verdict' },
    description: `Done: [${SORTED.join(', ')}]. Selection sort spent all 28 comparisons buying 7 placements — each pass re-learned facts the previous pass already knew and threw away. Quick sort sorts these same 8 numbers in 21 comparisons by making each comparison buy a PERMANENT structural fact.`,
    codeLine: -1,
  })

  return steps
}

function SelSortViz({ step }: { step: Step<SelSortState> }) {
  const { arr, outerI, minIdx, scanJ, comparisons, phase } = step.state
  const n = arr.length
  return (
    <>
      <VizCaption>
        {phase === 'verdict'
          ? `sorted: [${arr.join(', ')}] — 28 comparisons total`
          : phase === 'summary'
          ? `passes 2–7: 21 more comparisons remaining`
          : `pass ${outerI + 1} · comparisons so far = ${comparisons}${minIdx >= 0 ? ` · current min = ${arr[minIdx]}` : ''}`}
      </VizCaption>
      <Cells
        values={arr}
        classFor={k => {
          if (phase === 'verdict') return 'done'
          if (outerI >= 0 && k < outerI) return 'done'
          if (k === minIdx && k === scanJ) return 'warm'
          if (k === minIdx) return 'warm'
          if (k === scanJ) return 'active'
          if (phase === 'summary' && outerI >= 0 && k >= outerI) return ''
          return ''
        }}
        pointerFor={k => {
          if (k === scanJ && k === minIdx) return { label: 'j / min', tone: 'amber' }
          if (k === minIdx) return { label: 'min', tone: 'amber' }
          if (k === scanJ) return { label: 'j', tone: 'mint' }
          if (k === outerI && phase === 'scan') return { label: 'i', tone: 'sky' }
          return null
        }}
      />
      <Legend
        items={[
          { tone: 'amber', label: 'current minimum' },
          { tone: 'mint', label: 'scanner j' },
          { tone: 'sky', label: 'pass boundary i' },
          { label: 'unsorted' },
        ]}
      />
    </>
  )
}

export const naiveDemo: AttemptDemo<SelSortState> = { generateSteps: selectionSteps, Visualizer: SelSortViz }

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 2: Merge sort (attempt "Sort the halves, then merge")
   pseudocode index matches journey[0].pseudocode:
     0: 'mergeSort(a):'
     1: '    if |a| ≤ 1: return a'
     2: '    L ← mergeSort(left half)'
     3: '    R ← mergeSort(right half)'
     4: '    return merge(L, R)   // needs a scratch array'
────────────────────────────────────────────────────────────────────────────── */

interface MergeSortState {
  arr: number[]          // current combined view (merged so far)
  leftHalf: number[]     // left half being shown
  rightHalf: number[]    // right half being shown
  scratch: number[]      // scratch merge buffer (grows)
  phase: 'intro' | 'split' | 'sorted-halves' | 'merge' | 'verdict'
  mergeStep: number      // which merge comparison we are on (0-indexed)
  comparisons: number
  scratchLabel: string
}

// Simulate merge sort on ARR to get honest comparison count
function countMergeSortComparisons(arr: number[]): number {
  if (arr.length <= 1) return 0
  const mid = Math.floor(arr.length / 2)
  const left = arr.slice(0, mid)
  const right = arr.slice(mid)
  let count = countMergeSortComparisons(left) + countMergeSortComparisons(right)
  // merge step
  let i = 0, j = 0
  while (i < left.length && j < right.length) {
    count++
    if (left[i] <= right[j]) i++
    else j++
  }
  return count
}

function mergeSortSteps(): Step<MergeSortState>[] {
  const steps: Step<MergeSortState>[] = []
  const n = ARR.length
  const totalComparisons = countMergeSortComparisons([...ARR])

  const blank = (phase: MergeSortState['phase'], overrides: Partial<MergeSortState> = {}): MergeSortState => ({
    arr: [...ARR],
    leftHalf: [],
    rightHalf: [],
    scratch: [],
    phase,
    mergeStep: 0,
    comparisons: 0,
    scratchLabel: '',
    ...overrides,
  })

  // Step 1: intro sentinel
  steps.push({
    state: blank('intro'),
    description: `Merge sort on [${ARR.join(', ')}]: split the array in half, sort each half recursively, then merge the two sorted halves. Divide-and-conquer: a half-size problem is far more than half as easy.`,
    codeLine: 0,
  })

  // Step 2: split into halves
  const leftHalf = ARR.slice(0, 4)   // [29, 10, 14, 37]
  const rightHalf = ARR.slice(4)     // [13, 25, 8, 31]
  steps.push({
    state: blank('split', { leftHalf, rightHalf }),
    description: `Split: left half = [${leftHalf.join(', ')}], right half = [${rightHalf.join(', ')}]. Recurse into each independently — the left half's sorting tells us nothing about the right half's order, but that is fine because sorting a 4-element array is far cheaper than 8.`,
    codeLine: 2,
  })

  // Steps 3–4: sorted halves emerge from recursion
  const sortedLeft = [...leftHalf].sort((a, b) => a - b)   // [10, 14, 29, 37]
  const sortedRight = [...rightHalf].sort((a, b) => a - b)  // [8, 13, 25, 31]
  steps.push({
    state: blank('sorted-halves', { leftHalf: sortedLeft, rightHalf: sortedRight }),
    description: `Left half sorted recursively: [${sortedLeft.join(', ')}] (5 comparisons inside). Right half sorted recursively: [${sortedRight.join(', ')}] (5 comparisons inside). Now comes the merge — this is where the scratch buffer enters.`,
    codeLine: 3,
  })

  // Merge steps — simulate the merge of [10,14,29,37] and [8,13,25,31]
  // Merge trace:
  //  cmp 1: 10 vs 8  → take 8   (from R)
  //  cmp 2: 10 vs 13 → take 10  (from L)
  //  cmp 3: 14 vs 13 → take 13  (from R)
  //  cmp 4: 14 vs 25 → take 14  (from L)
  //  cmp 5: 29 vs 25 → take 25  (from R)
  //  cmp 6: 29 vs 31 → take 29  (from L)
  //  then remainder: 37, 31
  const mergeTrace: { cmp: number; take: number; from: 'L' | 'R'; scratch: number[] }[] = []
  {
    const L = [...sortedLeft]
    const R = [...sortedRight]
    let li = 0, ri = 0, cmp = 0
    const buf: number[] = []
    while (li < L.length && ri < R.length) {
      cmp++
      if (L[li] <= R[ri]) {
        buf.push(L[li])
        mergeTrace.push({ cmp, take: L[li], from: 'L', scratch: [...buf] })
        li++
      } else {
        buf.push(R[ri])
        mergeTrace.push({ cmp, take: R[ri], from: 'R', scratch: [...buf] })
        ri++
      }
    }
    // Drain remaining
    while (li < L.length) { buf.push(L[li]); li++ }
    while (ri < R.length) { buf.push(R[ri]); ri++ }
  }

  for (const trace of mergeTrace) {
    steps.push({
      state: blank('merge', {
        leftHalf: sortedLeft,
        rightHalf: sortedRight,
        scratch: trace.scratch,
        mergeStep: trace.cmp,
        comparisons: trace.cmp,
        scratchLabel: `scratch buffer: [${trace.scratch.join(', ')}]`,
      }),
      description: `Merge comparison ${trace.cmp}: take ${trace.take} from ${trace.from === 'L' ? 'left' : 'right'} → scratch buffer grows to [${trace.scratch.join(', ')}]. Elements must land somewhere while the merge runs — that somewhere is a new ${n}-slot array.`,
      codeLine: 4,
    })
  }

  // Final verdict
  steps.push({
    state: blank('verdict', {
      arr: [...SORTED],
      leftHalf: sortedLeft,
      rightHalf: sortedRight,
      scratch: [...SORTED],
      comparisons: totalComparisons,
      scratchLabel: `scratch buffer (${n} cells): [${SORTED.join(', ')}]`,
    }),
    description: `Merged: [${SORTED.join(', ')}] in ${totalComparisons} total comparisons — actually fewer than quick sort's 21. But the merge needed a second 8-slot scratch array to hold results while it interleaved. The task said IN PLACE. At a million items, that scratch buffer costs a million extra cells just to recombine work already done.`,
    codeLine: 4,
  })

  return steps
}

function MergeSortViz({ step }: { step: Step<MergeSortState> }) {
  const { arr, leftHalf, rightHalf, scratch, phase, scratchLabel } = step.state
  return (
    <>
      <VizCaption>
        {phase === 'intro' && `input: [${arr.join(', ')}]`}
        {phase === 'split' && `split into two halves`}
        {phase === 'sorted-halves' && `both halves sorted — merge step incoming`}
        {phase === 'merge' && `merging — scratch buffer grows`}
        {phase === 'verdict' && `sorted — but required ${arr.length} extra cells`}
      </VizCaption>
      {(phase === 'intro') && (
        <Cells
          values={arr}
          classFor={() => ''}
        />
      )}
      {(phase === 'split' || phase === 'sorted-halves' || phase === 'merge') && (
        <>
          <VizCaption>left half</VizCaption>
          <Cells
            values={leftHalf}
            classFor={k => phase === 'sorted-halves' || phase === 'merge' ? 'done' : ''}
          />
          <VizCaption>right half</VizCaption>
          <Cells
            values={rightHalf}
            classFor={k => phase === 'sorted-halves' || phase === 'merge' ? 'done' : ''}
          />
        </>
      )}
      {(phase === 'merge' || phase === 'verdict') && scratch.length > 0 && (
        <>
          <VizCaption>{scratchLabel || `scratch buffer (${arr.length} cells allocated)`}</VizCaption>
          <Cells
            values={scratch}
            classFor={k => phase === 'verdict' ? 'done' : 'warm'}
          />
        </>
      )}
      {phase === 'verdict' && (
        <Cells
          values={arr}
          classFor={() => 'done'}
        />
      )}
      <Legend
        items={[
          { tone: 'amber', label: 'in scratch buffer' },
          { label: 'sorted half' },
        ]}
      />
    </>
  )
}

export const mergeDemo: AttemptDemo<MergeSortState> = { generateSteps: mergeSortSteps, Visualizer: MergeSortViz }

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 3: Partition into new lists (attempt "Partition by value into two new lists")
   pseudocode index matches journey[1].pseudocode:
     0: 'partitionSort(a):'
     1: '    if |a| ≤ 1: return a'
     2: '    pivot ← last element of a'
     3: '    smalls ← [x : x < pivot]   // new list'
     4: '    bigs   ← [x : x > pivot]   // new list'
     5: '    return partitionSort(smalls) + pivot + partitionSort(bigs)'
────────────────────────────────────────────────────────────────────────────── */

interface NewListsState {
  arr: number[]        // original array
  pivot: number        // the pivot value
  pivotIdx: number     // index of pivot in original array
  scanIdx: number      // current element being categorized (-1 = intro)
  smalls: number[]     // elements < pivot (new list growing)
  bigs: number[]       // elements > pivot (new list growing)
  phase: 'intro' | 'scan' | 'verdict'
  totalAllocated: number
}

function newListsSteps(): Step<NewListsState>[] {
  const steps: Step<NewListsState>[] = []
  const n = ARR.length
  const pivotIdx = n - 1
  const pivot = ARR[pivotIdx]  // 31

  const blank = (phase: NewListsState['phase'], overrides: Partial<NewListsState> = {}): NewListsState => ({
    arr: [...ARR],
    pivot,
    pivotIdx,
    scanIdx: -1,
    smalls: [],
    bigs: [],
    phase,
    totalAllocated: 0,
    ...overrides,
  })

  // Intro sentinel
  steps.push({
    state: blank('intro'),
    description: `Partition-sort on [${ARR.join(', ')}]: pick the last element ${pivot} as pivot, copy everything smaller into a new "smalls" list and everything bigger into a new "bigs" list. No merge needed — smalls + pivot + bigs is already the right order.`,
    codeLine: 0,
  })

  // Scan each non-pivot element
  const smalls: number[] = []
  const bigs: number[] = []
  for (let j = 0; j < n - 1; j++) {
    const v = ARR[j]
    const goesSmall = v < pivot
    if (goesSmall) smalls.push(v)
    else bigs.push(v)
    steps.push({
      state: blank('scan', {
        scanIdx: j,
        smalls: [...smalls],
        bigs: [...bigs],
        totalAllocated: smalls.length + bigs.length,
      }),
      description: `a[${j}] = ${v}: ${v} ${goesSmall ? '<' : '>'} pivot ${pivot} — copy ${v} into ${goesSmall ? 'smalls' : 'bigs'}. smalls = [${[...smalls].join(', ')}], bigs = [${[...bigs].join(', ')}]. That is ${smalls.length + bigs.length} cells allocated so far.`,
      codeLine: goesSmall ? 3 : 4,
    })
  }

  // Verdict: show the cost of all copies
  const totalCopied = smalls.length + bigs.length + 1  // +1 for the pivot slot
  steps.push({
    state: blank('verdict', {
      smalls: [...smalls],
      bigs: [...bigs],
      totalAllocated: totalCopied,
      scanIdx: -1,
    }),
    description: `Partition complete: smalls = [${smalls.join(', ')}] (${smalls.length} cells), pivot = ${pivot} (1 slot), bigs = [${bigs.join(', ')}] (${bigs.length} cells). All ${n} original elements got COPIED into fresh lists — ${totalCopied} allocated cells. Every recursion level makes the same mistake. The pivot selection was right; the copying was the waste.`,
    codeLine: 5,
  })

  return steps
}

function NewListsViz({ step }: { step: Step<NewListsState> }) {
  const { arr, pivot, pivotIdx, scanIdx, smalls, bigs, phase, totalAllocated } = step.state
  return (
    <>
      <VizCaption>
        {phase === 'intro' && `pivot = ${pivot} (last element) · smalls and bigs lists empty`}
        {phase === 'scan' && `scanning — ${totalAllocated} cells allocated so far`}
        {phase === 'verdict' && `${totalAllocated} cells allocated — same O(n) bill as merge sort, just at split time`}
      </VizCaption>
      <VizCaption>original array</VizCaption>
      <Cells
        values={arr}
        classFor={k => {
          if (k === pivotIdx) return 'warm'
          if (phase === 'scan' && k < scanIdx) return 'dim'
          if (phase === 'scan' && k === scanIdx) return 'active'
          if (phase === 'verdict') return 'dim'
          return ''
        }}
        pointerFor={k => {
          if (k === pivotIdx) return { label: 'pivot', tone: 'sky' }
          if (phase === 'scan' && k === scanIdx) return { label: 'copy', tone: 'mint' }
          return null
        }}
      />
      {smalls.length > 0 && (
        <>
          <VizCaption>smalls (new list, {smalls.length} cells)</VizCaption>
          <Cells
            values={smalls}
            classFor={() => phase === 'verdict' ? 'done' : 'active'}
          />
        </>
      )}
      {bigs.length > 0 && (
        <>
          <VizCaption>bigs (new list, {bigs.length} cells)</VizCaption>
          <Cells
            values={bigs}
            classFor={() => phase === 'verdict' ? 'done' : 'warm'}
          />
        </>
      )}
      <Legend
        items={[
          { tone: 'sky', label: 'pivot' },
          { tone: 'mint', label: 'current element / smalls' },
          { tone: 'amber', label: 'bigs list' },
        ]}
      />
    </>
  )
}

export const newListsDemo: AttemptDemo<NewListsState> = { generateSteps: newListsSteps, Visualizer: NewListsViz }
