import type { AlgorithmModule, Step } from '../../core/types'

/* Canonical example: sort [38, 27, 43, 3, 9, 82, 10, 5] with merge sort. */

const ARR = [38, 27, 43, 3, 9, 82, 10, 5]

interface MSState {
  /** Snapshot of the working array (merged prefix + unmerged remainders inside the window). */
  arr: number[]
  /** Current operating range, inclusive. */
  lo: number
  hi: number
  /** Indices lo..k−1 inside the window are merged into final position. */
  k: number
  /** Index where the right-half remainder starts, or −1 when no merge is mid-flight. */
  rs: number
  /** Recursion depth of the current range (0 = whole array). */
  depth: number
  phase: 'intro' | 'split' | 'merge' | 'sorted'
}

function generateSteps(): Step<MSState>[] {
  const steps: Step<MSState>[] = []
  const a = [...ARR]

  steps.push({
    state: { arr: [...a], lo: -1, hi: -1, k: -1, rs: -1, depth: 0, phase: 'intro' },
    description: `The goal: sort the eight scrambled values [${a.join(', ')}] into ascending order. Merge sort's promise: never sort a messy array directly — split it until every piece is trivially sorted, then zipping sorted pieces together is the easy part.`,
    codeLine: 0,
  })

  const emitSplit = (lo: number, hi: number, depth: number, text: string) => {
    steps.push({
      state: { arr: [...a], lo, hi, k: lo, rs: -1, depth, phase: 'split' },
      description: text,
      codeLine: 2,
    })
  }

  const emitMerge = (lo: number, mid: number, hi: number, depth: number) => {
    const left = a.slice(lo, mid + 1)
    const right = a.slice(mid + 1, hi + 1)

    if (hi - lo + 1 === 2) {
      // Leaf merge: two singletons, one comparison.
      const x = a[lo]
      const y = a[hi]
      const pair = x <= y ? [x, y] : [y, x]
      a[lo] = pair[0]
      a[hi] = pair[1]
      steps.push({
        state: { arr: [...a], lo, hi, k: hi + 1, rs: -1, depth, phase: 'merge' },
        description:
          x <= y
            ? `${x} vs ${y} — already in order. Each single element is sorted by definition (the base case), so one comparison certifies the sorted pair [${x}, ${y}].`
            : `${x} vs ${y} — take ${y} first. Two singletons are each "sorted", so a single comparison zips them into the sorted pair [${y}, ${x}].`,
        codeLine: 6,
      })
      return
    }

    steps.push({
      state: { arr: [...a], lo, hi, k: lo, rs: mid + 1, depth, phase: 'merge' },
      description: `Both halves of a[${lo}..${hi}] are now sorted: [${left.join(', ')}] and [${right.join(', ')}]. Merge them: repeatedly compare the two front values and take the smaller — the front of a sorted list is its minimum, so the winner beats everything still waiting.`,
      codeLine: 5,
    })

    let i = 0
    let j = 0
    const merged: number[] = []
    while (i < left.length && j < right.length) {
      const lf = left[i]
      const rf = right[j]
      const takeLeft = lf <= rf
      const taken = takeLeft ? lf : rf
      if (takeLeft) i++
      else j++
      merged.push(taken)
      const view = [...a.slice(0, lo), ...merged, ...left.slice(i), ...right.slice(j), ...a.slice(hi + 1)]
      steps.push({
        state: {
          arr: view,
          lo,
          hi,
          k: lo + merged.length,
          rs: lo + merged.length + (left.length - i),
          depth,
          phase: 'merge',
        },
        description: `${lf} vs ${rf} — take ${taken} from the ${takeLeft ? 'left' : 'right'} half. Nothing behind either front can be smaller, so ${taken} is locked into position ${lo + merged.length - 1} forever.`,
        codeLine: 6,
      })
    }

    const leftoverFromLeft = i < left.length
    const rem = leftoverFromLeft ? left.slice(i) : right.slice(j)
    merged.push(...rem)
    a.splice(lo, hi - lo + 1, ...merged)
    steps.push({
      state: { arr: [...a], lo, hi, k: hi + 1, rs: -1, depth, phase: 'merge' },
      description: `The ${leftoverFromLeft ? 'right' : 'left'} half ran dry. The leftover${rem.length > 1 ? 's' : ''} [${rem.join(', ')}] ${rem.length > 1 ? 'are' : 'is'} already sorted and bigger than everything placed, so append wholesale — no more comparisons needed. a[${lo}..${hi}] is now [${merged.join(', ')}].`,
      codeLine: 7,
    })
  }

  emitSplit(0, 7, 0, `Split a[0..7] at mid = 3: left [${a.slice(0, 4).join(', ')}], right [${a.slice(4).join(', ')}]. Neither half is sorted yet — and we don't care. Recursion will fully sort each half before we ever try to merge them.`)
  emitSplit(0, 3, 1, `Recurse into the left half first. Split a[0..3] into [${a.slice(0, 2).join(', ')}] and [${a.slice(2, 4).join(', ')}]. One more split turns these pairs into single elements — and a single element is sorted by definition. The recursion bottoms out at depth 3.`)
  emitMerge(0, 0, 1, 2)
  emitMerge(2, 2, 3, 2)
  emitMerge(0, 1, 3, 1)
  emitSplit(4, 7, 1, `Left half a[0..3] is fully sorted. Now the right half: split a[4..7] into [${a.slice(4, 6).join(', ')}] and [${a.slice(6, 8).join(', ')}] and drive each pair down to singletons.`)
  emitMerge(4, 4, 5, 2)
  emitMerge(6, 6, 7, 2)
  emitMerge(4, 5, 7, 1)
  emitMerge(0, 3, 7, 0)

  steps.push({
    state: { arr: [...a], lo: 0, hi: 7, k: 8, rs: -1, depth: 0, phase: 'sorted' },
    description: `Done: [${a.join(', ')}] — all 8 values in ascending order. Three levels of merging, and every level touched all 8 elements exactly once: log₂ 8 = 3 levels × 8 elements = 24 placements, versus up to 28 pair-comparisons (and ~n²/2 growth) for a naive sort. That is n·log n in action.`,
    codeLine: -1,
  })

  return steps
}

function Visualizer({ step }: { step: Step<MSState> }) {
  const { arr, lo, hi, k, rs, depth, phase } = step.state
  const caption =
    phase === 'intro'
      ? 'unsorted input · n = 8'
      : phase === 'sorted'
        ? 'fully sorted · 3 merge levels'
        : `${phase === 'split' ? 'splitting' : 'merging'} · depth ${depth} · a[${lo}..${hi}]`
  return (
    <>
      <div className="viz-caption">{caption}</div>
      <div className="cells spaced">
        {arr.map((v, i) => {
          let cls = 'cell'
          if (phase === 'sorted') cls += ' done'
          else if (phase !== 'intro') {
            if (i < lo || i > hi) cls += ' dim'
            else if (i < k) cls += ' done'
            else if (rs === -1) cls += ' window'
            else if (i < rs) cls += ' active'
            else cls += ' warm'
          }
          const showL = phase === 'merge' && rs !== -1 && i === k && k < rs
          const showR = phase === 'merge' && rs !== -1 && i === rs && rs <= hi
          return (
            <div key={i} className={cls}>
              <span className="idx">{i}</span>
              {v}
              {showL && <span className="ptr mint">▲ L</span>}
              {showR && <span className="ptr amber">▲ R</span>}
            </div>
          )
        })}
      </div>
      <div className="legend">
        <span className="key"><span className="swatch mint" /> left-half front</span>
        <span className="key"><span className="swatch amber" /> right-half front</span>
        <span className="key"><span className="swatch sky" /> range being split</span>
        <span className="key"><span className="swatch" /> waiting / settled</span>
      </div>
    </>
  )
}

export const mergeSort: AlgorithmModule<MSState> = {
  id: 'merge-sort',
  name: 'Merge Sort',
  tagline: 'Split until trivially sorted, then zip sorted halves together — guaranteed n log n.',
  category: 'Sorting',
  icon: '🪄',
  problem: {
    title: 'Sort an Array — put 8 scrambled numbers in ascending order',
    statement:
      'You are handed the scrambled array [38, 27, 43, 3, 9, 82, 10, 5] and asked: rearrange these eight numbers into ascending order, producing [3, 5, 9, 10, 27, 38, 43, 82] — with a running time you can guarantee no matter how badly scrambled the input is. That exact sort is what the animation below performs, live.',
    input: 'An unsorted array of 8 numbers: [38, 27, 43, 3, 9, 82, 10, 5].',
    output: 'The same 8 numbers in ascending order: [3, 5, 9, 10, 27, 38, 43, 82].',
    naive:
      'Bubble or selection sort: sweep the array over and over, comparing adjacent values — up to 28 pair-comparisons (8·7/2) for these 8 numbers, and ~n²/2 in general. At 8 elements that is survivable; at a million elements it is ~500 billion comparisons, while merge sort needs only ~20 million — a 25,000× difference from the same starting data.',
  },
  aha:
    'Sorting chaos is hard, but merging two ALREADY-SORTED lists is almost free: the front of a sorted list is its minimum, so whichever front is smaller beats everything still waiting in BOTH lists and can be locked into its final position forever. Split until every piece is a single element — sorted by definition — and the whole job becomes log₂ n levels of these cheap zips: 8 × 3 = 24 placements here instead of n²/2 comparisons.',
  intuition: [
    'Imagine two librarians, each holding an alphabetized stack of index cards, combining their stacks into one. Each just looks at the top card of both stacks, places the alphabetically-earlier one face-down on the output pile, and repeats. Neither ever digs into the middle of a stack — the top card is always the next correct one. Merging sorted stacks is mindless; building a sorted stack from chaos is the hard part. Merge sort makes sure the librarians only ever see sorted stacks.',
    'The key insight is that one element is already sorted, and two sorted lists merge in linear time because the front of a sorted list is its minimum — whichever front is smaller beats everything remaining in BOTH lists, so it can be placed permanently without looking at anything else. Splitting in half repeatedly creates log n levels of these cheap merges, and every level processes the same n elements exactly once.',
    'Reach for this pattern when you need guaranteed O(n log n) regardless of input (quicksort can degrade), when stability matters (equal elements keep their order), when sorting linked lists (merging needs no random access), when data exceeds memory (external sorting merges sorted runs from disk), or when a problem asks you to count cross-pair relationships — inversions, reverse pairs, smaller-after-self — which fall out for free during the merge.',
  ],
  pseudocode: [
    'mergeSort(a, lo, hi):',
    '    if lo ≥ hi: return          // one element ⇒ sorted',
    '    mid ← (lo + hi) / 2',
    '    mergeSort(a, lo, mid)       // sort left half',
    '    mergeSort(a, mid + 1, hi)   // sort right half',
    '    while both halves have items:',
    '        take the smaller front → output',
    '    append the leftover half',
    '    copy output back into a[lo..hi]',
  ],
  complexity: {
    time: 'O(n log n)',
    space: 'O(n)',
    explanation:
      'Halving an array of n elements can only happen log₂ n times before every piece is a single element — so the recursion tree has log n levels. At each level the merges collectively touch every element exactly once, doing one comparison per element placed: n work per level × log n levels = n log n, no matter how scrambled the input is. The merge needs a scratch buffer as large as the range being merged, hence O(n) extra space (O(log n) recursion stack on top, which the buffer dominates).',
  },
  generateSteps,
  Visualizer,
  problems: [
    { title: 'Sort an Array', difficulty: 'Medium', leetcodeId: 912, hint: 'The canonical implementation: recurse on halves, merge with a scratch buffer — O(n²) sorts get rejected here.' },
    { title: 'Merge Two Sorted Lists', difficulty: 'Easy', leetcodeId: 21, hint: 'Just the merge step in isolation: repeatedly splice the smaller head onto the output list.' },
    { title: 'Merge k Sorted Lists', difficulty: 'Hard', leetcodeId: 23, hint: 'Merge lists pairwise like the recursion tree does — k lists collapse in log k rounds of linear merges.' },
    { title: 'Count of Smaller Numbers After Self', difficulty: 'Hard', leetcodeId: 315, hint: 'During each merge, every element taken from the right half is smaller than all remaining left-half elements — tally those jumps.' },
    { title: 'Reverse Pairs', difficulty: 'Hard', leetcodeId: 493, hint: 'Before each merge, count cross-half pairs with a[i] > 2·a[j] using two pointers over the already-sorted halves.' },
    { title: 'Sort List', difficulty: 'Medium', leetcodeId: 148, hint: 'Merge sort is THE linked-list sort: split with fast/slow pointers, merge by pointer surgery — no random access needed.' },
    { title: 'Count Inversions', difficulty: 'Medium', hint: 'Each time the merge takes from the right half, it leaps over every unmerged left element — each leap is one inversion.' },
    { title: 'Merge Sorted Array', difficulty: 'Easy', leetcodeId: 88, hint: 'The merge step run backwards: write the larger tail value into the free space at the end of the first array.' },
    { title: 'Maximum Gap', difficulty: 'Hard', leetcodeId: 164, hint: 'Demands linear-ish sorting intuition — knowing comparison sorts are stuck at n log n pushes you toward buckets/radix.' },
    { title: 'External Sort of Huge Files', difficulty: 'Medium', hint: 'Sort memory-sized chunks into runs on disk, then k-way merge the runs — merging only ever reads each run\'s front.' },
    { title: 'Global and Local Inversions', difficulty: 'Medium', leetcodeId: 775, hint: 'Global inversions are exactly what a merge-sort inversion count measures; compare that count to the local ones.' },
  ],
}
