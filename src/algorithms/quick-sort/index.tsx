import type { AlgorithmModule, Step } from '../../core/types'

/* Canonical example: sort [29, 10, 14, 37, 13, 25, 8, 31] with Lomuto partition (last element pivot). */

const ARR = [29, 10, 14, 37, 13, 25, 8, 31]

interface QSState {
  arr: number[]
  /** Current partition range; -1/-1 when no range is active. */
  lo: number
  hi: number
  /** Index of the pivot being partitioned around, or -1. */
  pivotIdx: number
  /** Boundary: everything in [lo, i) is < pivot. -1 when hidden. */
  i: number
  /** Scanner walking the range. -1 when hidden. */
  j: number
  /** Pair of indices that just swapped (flash), or null. */
  swapped: [number, number] | null
  /** True at index k once a[k] is in its final sorted position. */
  done: boolean[]
}

function generateSteps(): Step<QSState>[] {
  const steps: Step<QSState>[] = []
  const a = [...ARR]
  const done = ARR.map(() => false)

  const push = (
    description: string,
    codeLine: number,
    s: Pick<QSState, 'lo' | 'hi' | 'pivotIdx' | 'i' | 'j' | 'swapped'>,
  ) => {
    steps.push({ state: { arr: [...a], done: [...done], ...s }, description, codeLine })
  }

  push(
    `Goal: sort [${ARR.join(', ')}] into ascending order — [8, 10, 13, 14, 25, 29, 31, 37] — in place. The plan: pick a pivot, sweep everything smaller to its left and everything bigger to its right — the pivot drops into its final sorted slot, then we repeat on each half.`,
    0,
    { lo: 0, hi: ARR.length - 1, pivotIdx: -1, i: -1, j: -1, swapped: null },
  )

  const sort = (lo: number, hi: number, intro: string): void => {
    if (lo > hi) return
    if (lo === hi) {
      done[lo] = true
      push(
        `${intro}a[${lo}] = ${a[lo]} is a one-element range — a single element is sorted by definition. Mark it done.`,
        1,
        { lo, hi, pivotIdx: -1, i: -1, j: -1, swapped: null },
      )
      return
    }

    const pivot = a[hi]
    let i = lo
    push(
      `${intro}Partition a[${lo}..${hi}]. Pivot = ${pivot}, the last element. Boundary i starts at ${lo} — everything left of i will be the "smaller than ${pivot}" zone. Scanner j walks the range hunting for small elements to pull across.`,
      2,
      { lo, hi, pivotIdx: hi, i, j: -1, swapped: null },
    )

    for (let j = lo; j < hi; j++) {
      if (a[j] < pivot) {
        if (i === j) {
          i++
          push(
            `a[${j}] = ${a[j]} < ${pivot} — it belongs in the small zone, and it is already sitting at the boundary slot. No swap needed; the zone simply grows to absorb it (i → ${i}).`,
            5,
            { lo, hi, pivotIdx: hi, i, j, swapped: null },
          )
        } else {
          const small = a[j]
          const big = a[i]
          ;[a[i], a[j]] = [a[j], a[i]]
          const oldI = i
          i++
          push(
            `a[${j}] = ${small} < ${pivot} — but the boundary slot holds big ${big}. Swap them: ${small} joins the small zone, ${big} gets bumped deeper into big territory (i → ${i}).`,
            5,
            { lo, hi, pivotIdx: hi, i, j, swapped: [oldI, j] },
          )
        }
      } else {
        push(
          `a[${j}] = ${a[j]} ≥ ${pivot} — too big for the small zone. Leave it where it is: i holds its ground at ${i} while j moves on.`,
          4,
          { lo, hi, pivotIdx: hi, i, j, swapped: null },
        )
      }
    }

    if (i === hi) {
      done[i] = true
      push(
        `The boundary i walked all the way to the pivot itself — every element scanned was smaller than ${pivot}. So ${pivot} is already in its final home at index ${i}; no swap needed. It never moves again.`,
        6,
        { lo, hi, pivotIdx: -1, i: -1, j: -1, swapped: null },
      )
    } else {
      const displaced = a[i]
      ;[a[i], a[hi]] = [a[hi], a[i]]
      done[i] = true
      push(
        `Scan done: a[${lo}..${i - 1}] are all < ${pivot}. Swap pivot ${pivot} with ${displaced} at the boundary — ${pivot} lands at index ${i}, its FINAL home: everything left is smaller, everything right is bigger.`,
        6,
        { lo, hi, pivotIdx: -1, i: -1, j: -1, swapped: [i, hi] },
      )
    }

    sort(lo, i - 1, `Recurse LEFT of pivot ${pivot}: `)
    sort(i + 1, hi, `Recurse RIGHT of pivot ${pivot}: `)
  }

  sort(0, ARR.length - 1, '')

  push(
    `Every pivot dropped into its slot and the one-element ranges filled the gaps: [${a.join(', ')}]. Fully sorted in 21 comparisons across 5 partition passes — selection sort would have ground through all 28 on these same 8 numbers, and at a million items that gap explodes to ~20 million vs ~500 billion. No merge step needed: the partitioning alone did all the work.`,
    -1,
    { lo: -1, hi: -1, pivotIdx: -1, i: -1, j: -1, swapped: null },
  )

  return steps
}

function Visualizer({ step }: { step: Step<QSState> }) {
  const { arr, lo, hi, pivotIdx, i, j, swapped, done } = step.state
  const sortedCount = done.filter(Boolean).length
  return (
    <>
      <div className="viz-caption">
        {lo >= 0 ? `partitioning a[${lo}..${hi}]` : 'all positions fixed'}
        {pivotIdx >= 0 && ` · pivot = ${arr[pivotIdx]}`}
        {` · ${sortedCount}/${arr.length} in final position`}
      </div>
      <div className="cells spaced">
        {arr.map((v, k) => {
          const justSwapped = swapped !== null && (k === swapped[0] || k === swapped[1])
          let cls = 'cell'
          if (done[k]) cls += ' done'
          else if (k === pivotIdx) cls += ' warm'
          else if (justSwapped) cls += ' window'
          else if (k === j) cls += ' active'
          else if (lo >= 0 && (k < lo || k > hi)) cls += ' dim'
          return (
            <div key={k} className={cls}>
              <span className="idx">{k}</span>
              {v}
              {k === pivotIdx && <span className="ptr amber">▲ PIVOT</span>}
              {k === i && k === j && <span className="ptr mint">▲ i j</span>}
              {k === i && k !== j && <span className="ptr sky">▲ i</span>}
              {k === j && k !== i && <span className="ptr mint">▲ j</span>}
            </div>
          )
        })}
      </div>
      <div className="legend">
        <span className="key"><span className="swatch amber" /> pivot</span>
        <span className="key"><span className="swatch mint" /> scanner j</span>
        <span className="key"><span className="swatch sky" /> just swapped</span>
        <span className="key"><span className="swatch" /> in current range</span>
      </div>
    </>
  )
}

export const quickSort: AlgorithmModule<QSState> = {
  id: 'quick-sort',
  name: 'Quick Sort',
  tagline: 'Pick a pivot, throw smaller left and bigger right — the pivot lands in its final home.',
  category: 'Sorting',
  icon: '⚡',
  problem: {
    title: 'Sort the array — put 8 jumbled numbers in ascending order',
    statement:
      'You are handed the jumbled array [29, 10, 14, 37, 13, 25, 8, 31] and asked to rearrange it, in place, into ascending order: [8, 10, 13, 14, 25, 29, 31, 37]. That exact rearrangement — these eight numbers, no extra array — is what the animation below performs, live.',
    input: 'An unsorted array of 8 numbers: [29, 10, 14, 37, 13, 25, 8, 31].',
    output: 'The same 8 numbers in ascending order: [8, 10, 13, 14, 25, 29, 31, 37].',
    naive: {
      description:
        'Selection sort: rescan everything still unsorted for the minimum, place it, and repeat — 7 + 6 + 5 + … + 1 = 28 comparisons for these 8 numbers, every single time, even if the array starts nearly sorted.',
      pseudocode: [
        'for i ← 0 .. n − 2:',
        '    m ← i',
        '    for j ← i + 1 .. n − 1:',
        '        if a[j] < a[m]: m ← j',
        '    swap a[i], a[m]',
      ],
      time: 'O(n²) — always',
      space: 'O(1)',
      issues:
        'Each pass scans nearly the whole remainder, finds one minimum, and then FORGETS every other comparison it just made — pass two re-learns facts pass one already knew. The cost is n²/2 no matter what: ~500 billion comparisons for a million items. Quick sort\'s partition pass spends its n comparisons buying something permanent — a pivot locked in its final slot and the problem cut in two — finishing this very array in 21 comparisons and ~20 million at a million items.',
    },
  },
  aha:
    'One sweep does not "roughly place" the pivot — it provably locks it into its FINAL sorted slot, because everything smaller now sits to its left and everything bigger to its right, so no element ever needs to cross that boundary again. That one irreversible fact splits the problem in two for good each pass: about log n rounds of n cheap comparisons instead of n² of endless reshuffling.',
  intuition: [
    'Picture a teacher lining students up by height. She grabs one student — the pivot — and shouts: "shorter than them, stand to the left; taller, to the right." She has not sorted anyone yet, but that one student is now standing EXACTLY where they will be in the final line. She then repeats the trick inside the left group and inside the right group, and the line assembles itself.',
    'The key insight is that one partition pass buys you a permanent fact: the pivot is in its final position, and no element ever needs to cross it again. The Lomuto scan maintains a tidy invariant — everything in [lo, i) is smaller than the pivot, everything in [i, j) is at least as big — so when the scan finishes, one last swap drops the pivot at i. Unlike merge sort, all the work happens BEFORE the recursive calls; there is nothing to combine afterwards.',
    'Reach for this pattern when you need fast in-place sorting, or — even more powerfully — when you only need PART of a sorted order: the kth largest element, the top-k items, the median. Quickselect recurses into just one side of the partition and finds them in expected O(n), no full sort required.',
  ],
  pseudocode: [
    'quickSort(a, lo, hi):',
    '    if lo ≥ hi: range is trivially sorted; return',
    '    pivot ← a[hi];  i ← lo',
    '    for j ← lo to hi − 1:',
    '        if a[j] < pivot:',
    '            swap a[i], a[j];  i ← i + 1',
    '    swap a[i], a[hi]        // pivot lands at i, forever',
    '    quickSort(a, lo, i − 1)',
    '    quickSort(a, i + 1, hi)',
  ],
  complexity: {
    time: 'O(n log n) average, O(n²) worst',
    space: 'O(log n) average (recursion stack)',
    explanation:
      'Each partition pass touches every element in its range once, so the total cost is n times the recursion depth. A decent pivot splits the range roughly in half, so ranges halve about log n times before they hit size one — n work per level × log n levels. But pick the minimum or maximum as pivot (watch our 8 and 29 in the demo) and one side is empty: the range shrinks by only 1 per call, stacking n levels for O(n²) — which is why real implementations randomize the pivot. Sorting is in place; the only extra memory is the recursion stack, one frame per level.',
  },
  generateSteps,
  Visualizer,
  problems: [
    { title: 'Sort an Array', difficulty: 'Medium', leetcodeId: 912, hint: 'Vanilla quick sort with a randomized pivot — the judge is built to TLE fixed-pivot O(n²) behavior.' },
    { title: 'Kth Largest Element in an Array', difficulty: 'Medium', leetcodeId: 215, hint: 'Quickselect: partition once, then recurse only into the side that contains index k — expected O(n).' },
    { title: 'Sort Colors', difficulty: 'Medium', leetcodeId: 75, hint: 'A single three-way partition pass (Dutch national flag) — quick sort’s partition step generalized to three buckets.' },
    { title: 'Top K Frequent Elements', difficulty: 'Medium', leetcodeId: 347, hint: 'Count frequencies, then quickselect the kth most frequent so the top k land on one side of the partition.' },
    { title: 'Wiggle Sort II', difficulty: 'Medium', leetcodeId: 324, hint: 'Quickselect the median in O(n), then three-way partition around it before the zig-zag placement.' },
    { title: 'K Closest Points to Origin', difficulty: 'Medium', leetcodeId: 973, hint: 'Quickselect on squared distances — once the kth closest is in position, the answer is everything left of it, unsorted.' },
    { title: 'Find the Kth Smallest in Unsorted Data', difficulty: 'Medium', hint: 'The classic quickselect: each partition either finds slot k or tells you which side holds it.' },
    { title: 'Largest Number', difficulty: 'Medium', leetcodeId: 179, hint: 'Quick sort with a custom comparator: order a before b when the concatenation ab beats ba as a number.' },
    { title: 'Sort List', difficulty: 'Medium', leetcodeId: 148, hint: 'Partition a linked list into <, =, > chains around a pivot and concatenate — no index arithmetic needed.' },
    { title: 'Array Partition', difficulty: 'Easy', leetcodeId: 561, hint: 'Sort first (quick sort is the natural choice), then pair adjacent elements so each min sacrificed is as large as possible.' },
    { title: 'Median of an Unsorted Array', difficulty: 'Medium', hint: 'Quickselect index n/2 — the partition invariant guarantees the median lands there without sorting either half.' },
  ],
}
