import type { AttemptDemo, Step, VarEntry } from '../../core/types'
import { Cells, Legend, VizCaption } from '../../components/vizPrimitives'
import { ARR, SORTED } from './data'

/** Build a VarEntry factory that marks the listed names as changed. */
const varsWith = (changed: string[]) => (name: string, value: string): VarEntry =>
  changed.includes(name) ? { name, value, changed: true } : { name, value }

const fmtList = (xs: number[]) => `[${xs.join(', ')}]`

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 1: Brute force — selection sort (full run, all 7 passes)
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
  phase: 'intro' | 'scan' | 'swap' | 'verdict'
}

function selectionSteps(): Step<SelSortState>[] {
  const steps: Step<SelSortState>[] = []
  const a = [...ARR]
  const n = a.length
  let comparisons = 0
  let swaps = 0

  const push = (
    description: string,
    codeLine: number,
    s: Pick<SelSortState, 'outerI' | 'minIdx' | 'scanJ' | 'phase'>,
    v: { i: string; m: string; j: string },
    changed: string[],
  ) => {
    const e = varsWith(changed)
    steps.push({
      state: { arr: [...a], comparisons, ...s },
      description,
      codeLine,
      vars: [
        e('a', fmtList(a)),
        e('i', v.i),
        e('m', v.m),
        e('j', v.j),
        e('comparisons', String(comparisons)),
        e('swaps', String(swaps)),
      ],
    })
  }

  push(
    `Selection sort on [${ARR.join(', ')}]: repeatedly scan everything still unsorted, find the minimum, and plant it at the front. 7 + 6 + 5 + … + 1 = 28 comparisons, every time — watch every single one happen below.`,
    0,
    { outerI: -1, minIdx: -1, scanJ: -1, phase: 'intro' },
    { i: '—', m: '—', j: '—' },
    [],
  )

  for (let i = 0; i < n - 1; i++) {
    let m = i
    const passCmps = n - 1 - i
    for (let j = i + 1; j < n; j++) {
      comparisons++
      const opening =
        j === i + 1
          ? `Pass ${i + 1} (i = ${i}): assume a[${i}] = ${a[i]} is the minimum (m ← ${i}). First check — `
          : `Pass ${i + 1}, check ${j - i} of ${passCmps}: `
      if (a[j] < a[m]) {
        const prevM = m
        m = j
        push(
          `${opening}a[${j}] = ${a[j]} < a[${prevM}] = ${a[prevM]} — new minimum found at index ${j}; m ← ${j}.`,
          3,
          { outerI: i, minIdx: m, scanJ: j, phase: 'scan' },
          { i: String(i), m: String(m), j: String(j) },
          j === i + 1 ? ['i', 'm', 'j', 'comparisons'] : ['m', 'j', 'comparisons'],
        )
      } else {
        push(
          `${opening}a[${j}] = ${a[j]} ≥ a[${m}] = ${a[m]} — not smaller. The minimum stays ${a[m]} at index ${m}.`,
          3,
          { outerI: i, minIdx: m, scanJ: j, phase: 'scan' },
          { i: String(i), m: String(m), j: String(j) },
          j === i + 1 ? ['i', 'j', 'comparisons'] : ['j', 'comparisons'],
        )
      }
    }
    if (m !== i) {
      const minVal = a[m]
      const displaced = a[i]
      ;[a[i], a[m]] = [a[m], a[i]]
      swaps++
      push(
        `Pass ${i + 1} complete (${passCmps} comparisons): the minimum of the unsorted region is ${minVal} — swap it with ${displaced} into position ${i}. ${i + 1} of ${n} placed, and every other fact those ${passCmps} comparisons learned is now forgotten.`,
        4,
        { outerI: i, minIdx: m, scanJ: -1, phase: 'swap' },
        { i: String(i), m: String(m), j: '—' },
        ['a', 'swaps'],
      )
    } else {
      push(
        `Pass ${i + 1} complete (${passCmps} comparisons): a[${i}] = ${a[i]} was already the minimum of the unsorted region, so the swap is a no-op. Even this "free" pass still burned ${passCmps} comparisons that are now forgotten.`,
        4,
        { outerI: i, minIdx: m, scanJ: -1, phase: 'swap' },
        { i: String(i), m: String(m), j: '—' },
        [],
      )
    }
  }

  push(
    `Done: [${a.join(', ')}] — the last element ${a[n - 1]} fell into place by elimination. Selection sort spent all ${comparisons} comparisons (and ${swaps} swaps) re-learning facts each pass and throwing them away. Quick sort sorts these same 8 numbers in 21 comparisons by making each comparison buy a PERMANENT structural fact.`,
    -1,
    { outerI: -1, minIdx: -1, scanJ: -1, phase: 'verdict' },
    { i: '—', m: '—', j: '—' },
    [],
  )

  return steps
}

function SelSortViz({ step }: { step: Step<SelSortState> }) {
  const { arr, outerI, minIdx, scanJ, comparisons, phase } = step.state
  return (
    <>
      <VizCaption>
        {phase === 'verdict'
          ? `sorted: [${arr.join(', ')}] — 28 comparisons total`
          : phase === 'intro'
          ? `unsorted: [${arr.join(', ')}] — 28 comparisons ahead`
          : `pass ${outerI + 1} · comparisons so far = ${comparisons}${minIdx >= 0 ? ` · current min = ${arr[minIdx]}` : ''}`}
      </VizCaption>
      <Cells
        values={arr}
        classFor={k => {
          if (phase === 'verdict') return 'done'
          if (outerI >= 0 && k < outerI) return 'done'
          if (phase === 'swap' && outerI >= 0 && k === outerI) return 'done'
          if (k === minIdx) return 'warm'
          if (k === scanJ) return 'active'
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
   Demo 2: Merge sort (attempt "Sort the halves, then merge") — full run:
   every merge at every level is executed comparison by comparison.
   pseudocode index matches journey[0].pseudocode:
     0: 'mergeSort(a):'
     1: '    if |a| ≤ 1: return a'
     2: '    L ← mergeSort(left half)'
     3: '    R ← mergeSort(right half)'
     4: '    return merge(L, R)   // needs a scratch array'
────────────────────────────────────────────────────────────────────────────── */

interface MergeSortState {
  arr: number[]          // current combined view
  leftHalf: number[]     // left run being shown
  rightHalf: number[]    // right run being shown
  scratch: number[]      // scratch merge buffer (grows)
  phase: 'intro' | 'split' | 'sorted-halves' | 'merge' | 'verdict'
  mergeStep: number      // which merge comparison we are on
  comparisons: number
  scratchLabel: string
  leftLabel: string
  rightLabel: string
}

function mergeSortSteps(): Step<MergeSortState>[] {
  const steps: Step<MergeSortState>[] = []
  const n = ARR.length
  let comparisons = 0
  let scratchCells = 0
  let mergesDone = 0

  const blank = (phase: MergeSortState['phase'], overrides: Partial<MergeSortState> = {}): MergeSortState => ({
    arr: [...ARR],
    leftHalf: [],
    rightHalf: [],
    scratch: [],
    phase,
    mergeStep: 0,
    comparisons: 0,
    scratchLabel: '',
    leftLabel: 'left half',
    rightLabel: 'right half',
    ...overrides,
  })

  const mkVars = (L: string, R: string, merged: string, changed: string[]): VarEntry[] => {
    const e = varsWith(changed)
    return [
      e('L', L),
      e('R', R),
      e('merged', merged),
      e('comparisons', String(comparisons)),
      e('scratch cells', String(scratchCells)),
    ]
  }

  /** Run one real merge, emitting one honest step per comparison (drains folded into the step that empties a run). */
  const emitMerge = (L: number[], R: number[], leftLabel: string, rightLabel: string, runName: string): number[] => {
    scratchCells += L.length + R.length
    mergesDone++
    const buf: number[] = []
    let li = 0
    let ri = 0
    while (li < L.length && ri < R.length) {
      comparisons++
      const lv = L[li]
      const rv = R[ri]
      const takeLeft = lv <= rv
      const take = takeLeft ? lv : rv
      if (takeLeft) li++
      else ri++
      const isFirst = li + ri === 1
      buf.push(take)
      let drainNote = ''
      if (li >= L.length && ri < R.length) {
        const rest = R.slice(ri)
        buf.push(...rest)
        ri = R.length
        drainNote = ` The left run is now empty, so the right run's leftover [${rest.join(', ')}] drains in for free — ${runName} merged: [${buf.join(', ')}].`
      } else if (ri >= R.length && li < L.length) {
        const rest = L.slice(li)
        buf.push(...rest)
        li = L.length
        drainNote = ` The right run is now empty, so the left run's leftover [${rest.join(', ')}] drains in for free — ${runName} merged: [${buf.join(', ')}].`
      }
      const opening = isFirst
        ? `merge(${fmtList(L)}, ${fmtList(R)}) for ${runName}: a fresh ${L.length + R.length}-cell scratch buffer is allocated. `
        : ''
      steps.push({
        state: blank('merge', {
          leftHalf: [...L],
          rightHalf: [...R],
          scratch: [...buf],
          mergeStep: comparisons,
          comparisons,
          leftLabel,
          rightLabel,
          scratchLabel: `scratch buffer (${L.length + R.length} cells): [${buf.join(', ')}]`,
        }),
        description: `${opening}Comparison ${comparisons}: ${lv} vs ${rv} — ${take} is smaller, so it leaves the ${takeLeft ? 'left' : 'right'} run and enters the scratch buffer: [${buf.join(', ')}].${drainNote}`,
        codeLine: 4,
        vars: mkVars(
          fmtList(L),
          fmtList(R),
          fmtList(buf),
          isFirst ? ['L', 'R', 'merged', 'comparisons', 'scratch cells'] : ['merged', 'comparisons'],
        ),
      })
    }
    return buf
  }

  // Step 1: intro
  steps.push({
    state: blank('intro'),
    description: `Merge sort on [${ARR.join(', ')}]: split the array in half, sort each half recursively, then merge the two sorted halves. Divide-and-conquer: a half-size problem is far more than half as easy.`,
    codeLine: 0,
    vars: mkVars('—', '—', '—', []),
  })

  // Step 2: split into halves
  const leftHalf = ARR.slice(0, 4)   // [29, 10, 14, 37]
  const rightHalf = ARR.slice(4)     // [13, 25, 8, 31]
  steps.push({
    state: blank('split', { leftHalf, rightHalf }),
    description: `Split: left half = [${leftHalf.join(', ')}], right half = [${rightHalf.join(', ')}]. Recurse into each independently — sorting a 4-element array is far cheaper than 8.`,
    codeLine: 2,
    vars: mkVars(fmtList(leftHalf), fmtList(rightHalf), '—', ['L', 'R']),
  })

  // Step 3: split all the way down to singles (no comparisons happen here)
  steps.push({
    state: blank('split', { leftHalf, rightHalf }),
    description: `Each half splits again — [${leftHalf.join(', ')}] into [29, 10] and [14, 37], [${rightHalf.join(', ')}] into [13, 25] and [8, 31] — and once more into single elements. |a| ≤ 1 is the base case: a single element is sorted by definition. Splitting cost zero comparisons; ALL the real work happens on the way back up, in merge().`,
    codeLine: 1,
    vars: mkVars(fmtList(leftHalf), fmtList(rightHalf), '—', []),
  })

  // Level 1: merge the four pairs of singles
  const p1 = emitMerge([29], [10], 'left run', 'right run', 'the pair')
  const p2 = emitMerge([14], [37], 'left run', 'right run', 'the pair')
  const p3 = emitMerge([13], [25], 'left run', 'right run', 'the pair')
  const p4 = emitMerge([8], [31], 'left run', 'right run', 'the pair')

  // Level 2: merge the pairs into sorted halves
  const sortedLeft = emitMerge(p1, p2, 'left run', 'right run', 'the left half')
  const sortedRight = emitMerge(p3, p4, 'left run', 'right run', 'the right half')

  // Bridge: both halves sorted, the big merge remains
  steps.push({
    state: blank('sorted-halves', { leftHalf: sortedLeft, rightHalf: sortedRight }),
    description: `Both halves are now genuinely sorted — left [${sortedLeft.join(', ')}] cost 5 comparisons (1 + 1 + 3), right [${sortedRight.join(', ')}] another 5. Ten comparisons spent, ${scratchCells} scratch cells already allocated, and the final merge still needs the biggest buffer yet: ${n} cells.`,
    codeLine: 3,
    vars: mkVars(fmtList(sortedLeft), fmtList(sortedRight), '—', ['L', 'R']),
  })

  // Level 3: the final merge
  const finalMerged = emitMerge(sortedLeft, sortedRight, 'left half (sorted)', 'right half (sorted)', 'the full array')

  // Final verdict
  steps.push({
    state: blank('verdict', {
      arr: [...finalMerged],
      leftHalf: sortedLeft,
      rightHalf: sortedRight,
      scratch: [...finalMerged],
      comparisons,
      scratchLabel: `scratch buffer (${n} cells): [${finalMerged.join(', ')}]`,
    }),
    description: `Merged: [${finalMerged.join(', ')}] in ${comparisons} total comparisons — actually fewer than quick sort's 21. But every one of the ${mergesDone} merges needed its own scratch buffer: ${scratchCells} scratch cells allocated to sort 8 numbers. The task said IN PLACE — at a million items the final merge alone buys a million-cell buffer just to recombine work already done.`,
    codeLine: 4,
    vars: mkVars(fmtList(sortedLeft), fmtList(sortedRight), fmtList(finalMerged), []),
  })

  return steps
}

function MergeSortViz({ step }: { step: Step<MergeSortState> }) {
  const { arr, leftHalf, rightHalf, scratch, phase, scratchLabel, leftLabel, rightLabel } = step.state
  return (
    <>
      <VizCaption>
        {phase === 'intro' && `input: [${arr.join(', ')}]`}
        {phase === 'split' && `split into two halves`}
        {phase === 'sorted-halves' && `both halves sorted — final merge incoming`}
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
          <VizCaption>{leftLabel}</VizCaption>
          <Cells
            values={leftHalf}
            classFor={() => phase === 'sorted-halves' || phase === 'merge' ? 'done' : ''}
          />
          <VizCaption>{rightLabel}</VizCaption>
          <Cells
            values={rightHalf}
            classFor={() => phase === 'sorted-halves' || phase === 'merge' ? 'done' : ''}
          />
        </>
      )}
      {(phase === 'merge' || phase === 'verdict') && scratch.length > 0 && (
        <>
          <VizCaption>{scratchLabel || `scratch buffer (${arr.length} cells allocated)`}</VizCaption>
          <Cells
            values={scratch}
            classFor={() => phase === 'verdict' ? 'done' : 'warm'}
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
          { label: 'sorted run' },
        ]}
      />
    </>
  )
}

export const mergeDemo: AttemptDemo<MergeSortState> = { generateSteps: mergeSortSteps, Visualizer: MergeSortViz }

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 3: Partition into new lists (attempt "Partition by value into two new
   lists") — full recursion: every partition at every level runs to the
   fully sorted result, with the allocation bill tracked honestly.
   pseudocode index matches journey[1].pseudocode:
     0: 'partitionSort(a):'
     1: '    if |a| ≤ 1: return a'
     2: '    pivot ← last element of a'
     3: '    smalls ← [x : x < pivot]   // new list'
     4: '    bigs   ← [x : x > pivot]   // new list'
     5: '    return partitionSort(smalls) + pivot + partitionSort(bigs)'
────────────────────────────────────────────────────────────────────────────── */

interface NewListsState {
  arr: number[]        // list of the current recursive call
  pivot: number        // the pivot value of the current call
  pivotIdx: number     // index of pivot in the current list (-1 = none shown)
  scanIdx: number      // current element being categorized (-1 = none)
  smalls: number[]     // elements < pivot (new list growing)
  bigs: number[]       // elements > pivot (new list growing)
  phase: 'intro' | 'pick' | 'scan' | 'base' | 'concat' | 'verdict'
  totalAllocated: number
  listLabel: string    // which recursive call this list belongs to
}

function newListsSteps(): Step<NewListsState>[] {
  const steps: Step<NewListsState>[] = []
  let cells = 0

  const push = (
    description: string,
    codeLine: number,
    s: Omit<NewListsState, 'totalAllocated'>,
    v: { a: string; pivot: string; x: string; smalls: string; bigs: string },
    changed: string[],
  ) => {
    const e = varsWith(changed)
    steps.push({
      state: { ...s, totalAllocated: cells },
      description,
      codeLine,
      vars: [
        e('a', v.a),
        e('pivot', v.pivot),
        e('x', v.x),
        e('smalls', v.smalls),
        e('bigs', v.bigs),
        e('cells', String(cells)),
      ],
    })
  }

  push(
    `Partition-sort on [${ARR.join(', ')}]: pick the last element ${ARR[ARR.length - 1]} as pivot, copy everything smaller into a new "smalls" list and everything bigger into a new "bigs" list. No merge needed — smalls + pivot + bigs is already the right order. Watch the allocation bill as the recursion plays out in full.`,
    0,
    { arr: [...ARR], pivot: ARR[ARR.length - 1], pivotIdx: ARR.length - 1, scanIdx: -1, smalls: [], bigs: [], phase: 'intro', listLabel: 'a (the input)' },
    { a: fmtList(ARR), pivot: '—', x: '—', smalls: '—', bigs: '—' },
    [],
  )

  const partitionSort = (list: number[], name: string): number[] => {
    if (list.length <= 1) {
      push(
        list.length === 0
          ? `${name} is empty — base case (|a| ≤ 1): nothing to sort, return [] as-is. No new lists allocated here.`
          : `${name} = [${list.join(', ')}] holds a single element — base case (|a| ≤ 1): one element is sorted by definition, return it as-is. No new lists allocated here.`,
        1,
        { arr: [...list], pivot: 0, pivotIdx: -1, scanIdx: -1, smalls: [], bigs: [], phase: 'base', listLabel: name },
        { a: fmtList(list), pivot: '—', x: '—', smalls: '—', bigs: '—' },
        ['a'],
      )
      return [...list]
    }

    const pivot = list[list.length - 1]
    const smalls: number[] = []
    const bigs: number[] = []

    push(
      `Recurse into ${name} = [${list.join(', ')}]: pivot ← ${pivot}, the last element, and two brand-new empty lists are allocated to receive the other ${list.length - 1} elements.`,
      2,
      { arr: [...list], pivot, pivotIdx: list.length - 1, scanIdx: -1, smalls: [], bigs: [], phase: 'pick', listLabel: name },
      { a: fmtList(list), pivot: String(pivot), x: '—', smalls: '[]', bigs: '[]' },
      ['a', 'pivot', 'smalls', 'bigs'],
    )

    for (let j = 0; j < list.length - 1; j++) {
      const v = list[j]
      const goesSmall = v < pivot
      if (goesSmall) smalls.push(v)
      else bigs.push(v)
      cells++
      push(
        `${name}[${j}] = ${v}: ${v} ${goesSmall ? '<' : '>'} pivot ${pivot} — COPY ${v} into ${goesSmall ? 'smalls' : 'bigs'}. smalls = [${smalls.join(', ')}], bigs = [${bigs.join(', ')}] — ${cells} cells allocated so far across all recursion levels.`,
        goesSmall ? 3 : 4,
        { arr: [...list], pivot, pivotIdx: list.length - 1, scanIdx: j, smalls: [...smalls], bigs: [...bigs], phase: 'scan', listLabel: name },
        { a: fmtList(list), pivot: String(pivot), x: String(v), smalls: fmtList(smalls), bigs: fmtList(bigs) },
        ['x', goesSmall ? 'smalls' : 'bigs', 'cells'],
      )
    }

    const sortedSmalls = partitionSort(smalls, `${name} → smalls`)
    const sortedBigs = partitionSort(bigs, `${name} → bigs`)
    const result = [...sortedSmalls, pivot, ...sortedBigs]

    push(
      `Back in ${name}: glue partitionSort(smalls) + pivot + partitionSort(bigs) = [${sortedSmalls.join(', ')}] + ${pivot} + [${sortedBigs.join(', ')}] = [${result.join(', ')}]. The concatenation itself is free — no merge — but every element of ${name} was copied into fresh lists to get here.`,
      5,
      { arr: [...list], pivot, pivotIdx: list.length - 1, scanIdx: -1, smalls: [...sortedSmalls], bigs: [...sortedBigs], phase: 'concat', listLabel: name },
      { a: fmtList(result), pivot: String(pivot), x: '—', smalls: fmtList(sortedSmalls), bigs: fmtList(sortedBigs) },
      ['a', 'smalls', 'bigs'],
    )

    return result
  }

  const sorted = partitionSort([...ARR], 'a')

  push(
    `Fully sorted: [${sorted.join(', ')}]. The pivots were chosen exactly like quick sort's — yet getting here COPIED ${cells} cells into fresh smalls/bigs lists across 4 partitions (7 + 5 + 4 + 2). Merge sort paid its O(n) scratch bill at merge time; this pays the same bill at split time. The fix: keep the two zones inside the ONE array — a boundary index and swaps.`,
    5,
    { arr: [...sorted], pivot: 0, pivotIdx: -1, scanIdx: -1, smalls: [], bigs: [], phase: 'verdict', listLabel: 'result — fully sorted' },
    { a: fmtList(sorted), pivot: '—', x: '—', smalls: '—', bigs: '—' },
    ['a'],
  )

  return steps
}

function NewListsViz({ step }: { step: Step<NewListsState> }) {
  const { arr, pivot, pivotIdx, scanIdx, smalls, bigs, phase, totalAllocated, listLabel } = step.state
  return (
    <>
      <VizCaption>
        {phase === 'intro' && `pivot = ${pivot} (last element) · smalls and bigs lists empty`}
        {phase === 'pick' && `pivot = ${pivot} · two fresh lists allocated`}
        {phase === 'scan' && `copying — ${totalAllocated} cells allocated so far`}
        {phase === 'base' && `base case — no copying needed here`}
        {phase === 'concat' && `glue: smalls + pivot + bigs — concatenation is free`}
        {phase === 'verdict' && `${totalAllocated} cells allocated — same O(n) bill as merge sort, just at split time`}
      </VizCaption>
      <VizCaption>{listLabel}</VizCaption>
      <Cells
        values={arr}
        classFor={k => {
          if (phase === 'verdict') return 'done'
          if (k === pivotIdx) return 'warm'
          if (phase === 'scan' && k < scanIdx) return 'dim'
          if (phase === 'scan' && k === scanIdx) return 'active'
          if (phase === 'concat') return 'dim'
          return ''
        }}
        pointerFor={k => {
          if (phase !== 'verdict' && k === pivotIdx) return { label: 'pivot', tone: 'sky' }
          if (phase === 'scan' && k === scanIdx) return { label: 'copy', tone: 'mint' }
          return null
        }}
      />
      {smalls.length > 0 && (
        <>
          <VizCaption>smalls (new list, {smalls.length} cells)</VizCaption>
          <Cells
            values={smalls}
            classFor={() => phase === 'concat' ? 'done' : 'active'}
          />
        </>
      )}
      {bigs.length > 0 && (
        <>
          <VizCaption>bigs (new list, {bigs.length} cells)</VizCaption>
          <Cells
            values={bigs}
            classFor={() => phase === 'concat' ? 'done' : 'warm'}
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
