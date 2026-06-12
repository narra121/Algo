import type { AlgorithmModule, Step, VarEntry } from '../../core/types'
import { naiveDemo, sortedHistoryDemo, topKRowDemo } from './demos'
import { STREAM, K } from './data'

/* Canonical example: Kth Largest Element in a Stream — keep a MIN-heap of size k.
   The smallest of the k kept values sits at the root, so the root IS the kth largest. */

interface HeapState {
  stream: number[]
  /** Index of the stream item currently being processed; STREAM.length once finished. */
  streamIdx: number
  /** The min-heap as a level-order array (parent of i is ⌊(i−1)/2⌋). */
  heap: number[]
  /** Heap indices currently being compared or swapped. */
  highlight: number[]
  /** True when the current stream item was rejected without entering the heap. */
  rejected: boolean
  done: boolean
}

function snap(
  streamIdx: number,
  heap: number[],
  highlight: number[],
  rejected: boolean,
  done: boolean,
): HeapState {
  return {
    stream: [...STREAM],
    streamIdx,
    heap: [...heap],
    highlight: [...highlight],
    rejected,
    done,
  }
}

/**
 * Live variables for the variables panel, named exactly as in the pseudocode.
 * Same six entries in the same order on every step; `changed` lists the names
 * this specific step assigned/modified.
 */
function heapVars(x: number | null, heap: number[], changed: string[] = []): VarEntry[] {
  const size = heap.length
  const entry = (name: string, value: string): VarEntry => ({
    name,
    value,
    ...(changed.includes(name) ? { changed: true } : {}),
  })
  return [
    entry('k', String(K)),
    entry('x', x === null ? '—' : String(x)),
    entry('heap', `[${heap.join(', ')}]`),
    entry('size', String(size)),
    entry('root', size > 0 ? String(heap[0]) : '—'),
    entry('kth-largest-so-far', size === K ? String(heap[0]) : '—'),
  ]
}

function generateSteps(): Step<HeapState>[] {
  const steps: Step<HeapState>[] = []
  const heap: number[] = []

  steps.push({
    state: snap(0, heap, [], false, false),
    description: `The question: as ${STREAM.join(', ')} arrive one at a time, what is the ${K}rd largest value seen so far — at every moment? Strategy: keep only the ${K} largest values in a MIN-heap, so the weakest of those ${K} (which IS the ${K}rd largest overall) is always sitting right at the root, ready to be read or evicted in O(1).`,
    codeLine: 0,
    vars: heapVars(null, heap, ['k', 'heap', 'size']),
  })

  for (let s = 0; s < STREAM.length; s++) {
    const x = STREAM[s]

    if (heap.length < K) {
      /* Seat available — append and sift up. */
      heap.push(x)
      const i = heap.length - 1
      if (i === 0) {
        steps.push({
          state: snap(s, heap, [0], false, false),
          description: `${x} arrives. The heap has 0 of ${K} seats filled, so ${x} walks straight in and sits at the root — nothing to compare against yet.`,
          codeLine: 3,
          vars: heapVars(x, heap, ['x', 'heap', 'size', 'root']),
        })
      } else {
        const p0 = (i - 1) >> 1
        steps.push({
          state: snap(s, heap, [i, p0], false, false),
          description: `${x} arrives — a seat is still free. Append it at index ${i} and look upward: is ${x} smaller than its parent ${heap[p0]}?`,
          codeLine: 3,
          vars: heapVars(
            x,
            heap,
            heap.length === K ? ['x', 'heap', 'size', 'kth-largest-so-far'] : ['x', 'heap', 'size'],
          ),
        })
        let j = i
        while (j > 0) {
          const p = (j - 1) >> 1
          if (heap[j] < heap[p]) {
            const child = heap[j]
            const parent = heap[p]
            heap[j] = parent
            heap[p] = child
            steps.push({
              state: snap(s, heap, [p, j], false, false),
              description: `Yes — ${child} < ${parent}, which breaks the min-heap rule (parents must be ≤ children). Swap them: ${child} bubbles up toward the root.`,
              codeLine: 3,
              vars: heapVars(
                x,
                heap,
                p === 0
                  ? heap.length === K
                    ? ['heap', 'root', 'kth-largest-so-far']
                    : ['heap', 'root']
                  : ['heap'],
              ),
            })
            j = p
          } else {
            steps.push({
              state: snap(s, heap, [j], false, false),
              description: `No — ${heap[j]} ≥ parent ${heap[p]}, so the order is already correct. ${heap[j]} stays put at index ${j}.`,
              codeLine: 3,
              vars: heapVars(x, heap),
            })
            break
          }
        }
        if (heap.length === K) {
          steps.push({
            state: snap(s, heap, [0], false, false),
            description: `The heap now holds exactly k = ${K} values: {${[...heap].sort((a, b) => a - b).join(', ')}}. From here on the root ${heap[0]} IS the ${K}rd largest seen so far — every later arrival only has to beat the root to matter.`,
            codeLine: 9,
            vars: heapVars(x, heap),
          })
        }
      }
    } else if (x <= heap[0]) {
      /* Too small to ever be top-k. */
      steps.push({
        state: snap(s, heap, [0], true, false),
        description: `${x} arrives, but ${x} ≤ root ${heap[0]} — it is smaller than ALL ${K} values we are keeping, so it can never be in the top ${K}. Rejected in one comparison, without touching the heap.`,
        codeLine: 5,
        vars: heapVars(x, heap, ['x']),
      })
    } else {
      /* Beats the threshold — evict the root and sift down. */
      const evicted = heap[0]
      steps.push({
        state: snap(s, heap, [0], false, false),
        description: `${x} arrives and the heap is full. ${x} > root ${evicted}, so ${evicted} — the weakest of our top ${K} — is now provably NOT one of the ${K} largest. Evict it.`,
        codeLine: 6,
        vars: heapVars(x, heap, ['x']),
      })
      heap[0] = x
      steps.push({
        state: snap(s, heap, [0], false, false),
        description: `${x} overwrites the root. But ${x} may be too big to sit above its children — a min-heap demands the smallest value on top, so sift it down.`,
        codeLine: 7,
        vars: heapVars(x, heap, ['heap', 'root', 'kth-largest-so-far']),
      })
      let j = 0
      for (;;) {
        const l = 2 * j + 1
        const r = 2 * j + 2
        let m = j
        if (l < heap.length && heap[l] < heap[m]) m = l
        if (r < heap.length && heap[r] < heap[m]) m = r
        if (m === j) {
          const kids = [l, r].filter((c) => c < heap.length).map((c) => heap[c])
          steps.push({
            state: snap(s, heap, [j], false, false),
            description:
              kids.length > 0
                ? `${heap[j]} is already ≤ ${kids.length === 2 ? `both children (${kids.join(' and ')})` : `its child ${kids[0]}`} — settled. The new root ${heap[0]} is the current ${K}rd largest.`
                : `${heap[j]} has no children at index ${j} — settled. The new root ${heap[0]} is the current ${K}rd largest.`,
            codeLine: 8,
            vars: heapVars(x, heap),
          })
          break
        }
        const parent = heap[j]
        const child = heap[m]
        heap[j] = child
        heap[m] = parent
        steps.push({
          state: snap(s, heap, [j, m], false, false),
          description: `${parent} is bigger than its smaller child ${child} — illegal in a min-heap. Swap with the SMALLER child so the value floating up keeps the root minimal.`,
          codeLine: 8,
          vars: heapVars(x, heap, j === 0 ? ['heap', 'root', 'kth-largest-so-far'] : ['heap']),
        })
        j = m
      }
    }
  }

  steps.push({
    state: snap(STREAM.length, heap, [0], false, true),
    description: `Stream exhausted — the answer is ${heap[0]}, the ${K}rd largest of all ${STREAM.length} items. The heap kept only {${[...heap].sort((a, b) => b - a).join(', ')}}: ${K} slots of memory instead of ${STREAM.length}, two arrivals (2 and 7) dismissed with a single comparison each, and no repair ever walked more than log₂ ${K} ≈ 2 levels — while the naive plan would have re-sorted a growing list after every one of the ${STREAM.length} arrivals (36 values shuffled) just to read off one number.`,
    codeLine: 9,
    vars: heapVars(null, heap, ['x']),
  })

  return steps
}

/* Fixed layout for a heap of size ≤ 3 drawn as a binary tree. */
const NODE_POS = [
  { x: 150, y: 40 },
  { x: 80, y: 112 },
  { x: 220, y: 112 },
] as const

function Visualizer({ step }: { step: Step<HeapState> }) {
  const { stream, streamIdx, heap, highlight, rejected, done } = step.state
  const kth = heap.length === K ? heap[0] : null

  const nodeCls = (i: number) => {
    if (highlight.includes(i)) return 'node warm'
    if (i === 0) return 'node active'
    return 'node'
  }
  const edgeCls = (child: number) => (highlight.includes(child) ? 'edge warm' : 'edge')

  return (
    <>
      <div className="viz-caption">
        k = {K} · kth largest so far = {kth !== null ? kth : '—'}
      </div>
      <div className="cells spaced">
        {stream.map((v, i) => {
          const isCurrent = !done && i === streamIdx
          let cls = 'cell'
          if (isCurrent && rejected) cls += ' bad'
          else if (isCurrent) cls += ' warm'
          else if (done || i < streamIdx) cls += ' dim'
          return (
            <div key={i} className={cls}>
              <span className="idx">{i}</span>
              {v}
              {isCurrent && (
                <span className={rejected ? 'ptr rose' : 'ptr amber'}>
                  {rejected ? '✕ REJECTED' : '▲ CURRENT'}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <svg className="viz-svg" viewBox="0 0 300 155" width={300} role="img" aria-label="min-heap as a binary tree">
        {heap.length > 1 && (
          <line className={edgeCls(1)} x1={NODE_POS[0].x} y1={NODE_POS[0].y} x2={NODE_POS[1].x} y2={NODE_POS[1].y} />
        )}
        {heap.length > 2 && (
          <line className={edgeCls(2)} x1={NODE_POS[0].x} y1={NODE_POS[0].y} x2={NODE_POS[2].x} y2={NODE_POS[2].y} />
        )}
        {heap.map((v, i) => (
          <g key={i}>
            <circle className={nodeCls(i)} cx={NODE_POS[i].x} cy={NODE_POS[i].y} r={22} />
            <text x={NODE_POS[i].x} y={NODE_POS[i].y + 5} textAnchor="middle" fontSize={15} fontWeight={600}>
              {v}
            </text>
          </g>
        ))}
        {heap.length === 0 && (
          <text x={150} y={82} textAnchor="middle" fontSize={12} opacity={0.5}>
            heap is empty
          </text>
        )}
      </svg>
      <div className="legend">
        <span className="key"><span className="swatch mint" /> root = kth largest</span>
        <span className="key"><span className="swatch amber" /> comparing / sifting</span>
        <span className="key"><span className="swatch rose" /> rejected item</span>
        <span className="key"><span className="swatch" /> waiting in stream</span>
      </div>
    </>
  )
}

export const heap: AlgorithmModule<HeapState> = {
  id: 'heap',
  name: 'Heap / Priority Queue',
  tagline: 'A self-organizing pile where the most important item always floats to the top.',
  category: 'Trees & Heaps',
  icon: '⛰️',
  problem: {
    title: 'Kth Largest Element in a Stream — k = 3',
    statement:
      'Numbers arrive one at a time: 3, 1, 5, 12, 2, 11, 9, 7. After EVERY arrival you must be able to answer instantly: what is the 3rd largest value seen so far? By the final arrival the answer is 9, because the three largest are 12, 11, and 9. That exact question is what the animation below is solving, one arrival at a time.',
    input: 'A stream of 8 numbers — 3, 1, 5, 12, 2, 11, 9, 7 — and k = 3.',
    output: 'The 3rd largest value seen so far, after every arrival. Final answer: 9 (the kept top three are 12, 11, 9).',
    naive: {
      description:
        'Store every number ever seen and re-sort the whole list after each arrival: for this tiny stream that is 8 sorts over lists of size 1, 2, …, 8 — 36 values shuffled to extract one number — and all 8 values held in memory forever.',
      pseudocode: [
        'seen ← empty list',
        'for each x in stream:',
        '    append x to seen',
        '    sort seen in descending order',
        '    answer ← seen[k − 1]',
      ],
      time: 'O(n log n) per arrival',
      space: 'O(n)',
      issues:
        'Every arrival pays to re-order ALL history just to read off one value, and the previous sort is discarded as if it never happened. Memory grows forever even though only the top k = 3 numbers can ever matter. For a million-item stream that is a million stored numbers and a full million-element re-sort per tick — versus a 3-slot heap doing at most two swaps per arrival.',
      demo: naiveDemo,
    },
  },
  aha:
    'You never need the top 3 in order — you only need their WEAKEST member, and a min-heap pins exactly that value to its root: any arrival that cannot beat the root is provably outside the top 3 and can be thrown away forever after a single comparison, so a stream of any length needs just 3 slots of memory and at most log₂ 3 swaps per arrival instead of storing and sorting everything.',
  journey: [
    {
      title: 'Stop re-sorting — keep the history sorted and insert into place',
      spark:
        'The naive plan throws away a perfectly sorted list after every arrival, then rebuilds it from scratch. So never re-sort: the list is already in order — just slide each newcomer into its slot.',
      pseudocode: [
        'seen ← empty list, kept descending',
        'for each x in stream:',
        '    binary-search for x’s slot',
        '    shift the tail right, drop x in',
        '    answer ← seen[k − 1]',
      ],
      time: 'O(n) per arrival',
      space: 'O(n)',
      verdict: 'partial',
      breaks:
        'Correct, and cheaper: inserting 3, 1, 5, 12, 2, 11, 9, 7 one by one costs 18 shifted values plus a handful of binary-search probes, versus the 36 values the re-sorts shuffled. But look at the final list — 12, 11, 9, 7, 5, 3, 2, 1. We are carefully filing 7, 5, 3, 2, 1: five values sitting BELOW slot 3. A stream only ever adds, so once a value falls out of the top 3 it can never climb back — those five are dead weight we keep paying to keep in order, and the list still grows forever.',
      insight:
        'Only the top k = 3 values can ever be the answer; the moment something drops below them it is irrelevant for good. So store exactly 3, and decide at the door: reject the newcomer, or evict the weakest.',
      demo: sortedHistoryDemo,
    },
    {
      title: 'Keep only the top 3, in a sorted row',
      spark:
        'Then cap the memory at 3. Hold the three largest in order, compare each arrival against the weakest of them, and if it wins, drop that weakest and slide the newcomer into its place.',
      pseudocode: [
        'top ← sorted row of k = 3, descending',
        'for each x in stream:',
        '    if x ≤ top[k − 1]: reject x',
        '    else: drop top[k − 1],',
        '          slide x into its slot',
        '    answer ← top[k − 1]',
      ],
      time: 'O(n k)',
      space: 'O(k)',
      verdict: 'partial',
      breaks:
        'This is nearly the answer: memory is pinned at 3 slots, and 2 and 7 are turned away with one comparison each against the weakest. But watch what the sorted row spends its effort on — when 11 arrives we slide it between 12 and 5 to keep [12, 11, 5] perfectly ordered, yet the order of 12 versus 11 is never read: every rejection, every eviction, and every answer touches ONLY the weakest slot. With k = 3 the slides are cheap; with k = 1000 each accepted arrival shifts up to 999 values to maintain an ordering nobody ever asks about.',
      insight:
        'You never use the full order of the kept k — every operation reads just their MINIMUM. So keep the order deliberately lazy: any structure that pins the minimum somewhere findable and repairs itself in fewer than k steps wins.',
      demo: topKRowDemo,
    },
    {
      title: 'A min-heap of size 3 — total order traded for one pinned minimum',
      spark:
        'A min-heap is exactly that lazy structure: the only rule is parent ≤ children — nothing about siblings — so the minimum of the kept 3 always sits at the root, and any repair walks just one short root-to-leaf path.',
      pseudocode: [
        'min-heap ← empty, k ← 3',
        'for each x in stream:',
        '    if heap.size < k:',
        '        append x, sift-up while x < parent',
        '    else if x ≤ heap.root:',
        '        reject x — smaller than every kept value',
        '    else:',
        '        overwrite root with x',
        '        sift-down while x > smaller child',
        'kth-largest-so-far = heap.root',
      ],
      time: 'O(n log k)',
      space: 'O(k)',
      verdict: 'optimal',
      breaks:
        'Nothing is wasted now: memory is exactly 3 slots however long the stream runs, 2 and 7 are dismissed with a single comparison against the root, and across all 8 arrivals no repair ever walks more than log₂ 3 ≈ 2 levels — the heap never spends a comparison establishing order it will not read, because the lazy invariant guarantees only the one fact every operation needs: the weakest kept value is at the root.',
      insight:
        'The root of a size-k min-heap IS the kth largest — the weakest member of the elite, pinned where one glance reads it and one comparison defends it. That is exactly the aha below.',
      demo: { generateSteps, Visualizer },
    },
  ],
  intuition: [
    'Picture a tiny VIP lounge with exactly 3 seats and a bouncer at the door. The bouncer does not memorize everyone inside — he only remembers the LEAST impressive guest currently seated. When someone new shows up, one glance settles it: less impressive than that weakest guest? Turned away. More impressive? The weakest guest is escorted out and the newcomer takes a seat, after which the bouncer quickly re-checks who the new weakest guest is.',
    "The key insight is the heap invariant: every parent is ≤ its children (in a min-heap), so the global minimum is always at the root — no searching required. The invariant is deliberately LAZY: it says nothing about the order of siblings, which is exactly why it is so cheap to maintain. Insert at the bottom and sift up, or replace the root and sift down — either repair walks one root-to-leaf path, just O(log n) swaps, instead of re-sorting everything. For top-k specifically, a min-heap of size k makes the root the admission threshold: beat the root or you provably cannot be in the top k.",
    'Reach for a heap whenever you repeatedly need the min or max of a collection that keeps changing: streaming top-k, k-way merging of sorted lists, schedulers that always run the most urgent task, simulations that pop the next event in time order, and running medians (with two heaps back to back). If you only need the extreme once, just scan; if you need it again and again amid inserts and removals, that is the heap signal.',
  ],
  pseudocode: [
    'min-heap ← empty, k ← 3',
    'for each x in stream:',
    '    if heap.size < k:',
    '        append x, sift-up while x < parent',
    '    else if x ≤ heap.root:',
    '        reject x — smaller than every kept value',
    '    else:',
    '        overwrite root with x',
    '        sift-down while x > smaller child',
    'kth-largest-so-far = heap.root',
  ],
  complexity: {
    time: 'O(n log k)',
    space: 'O(k)',
    explanation:
      'A heap of k items is a complete binary tree of height ⌊log₂ k⌋, and every repair (sift-up or sift-down) walks at most one root-to-leaf path — so each of the n stream arrivals costs at most log k swaps, often just one O(1) comparison against the root when the item is rejected. We never store more than the k survivors, hence O(k) space; sorting the whole stream would cost O(n log n) time and O(n) space for an answer that only ever needed k numbers.',
  },
  generateSteps,
  Visualizer,
  problems: [
    { title: 'Kth Largest Element in a Stream', difficulty: 'Easy', leetcodeId: 703, hint: 'The canonical pattern: a min-heap of size k whose root is always the answer.' },
    { title: 'Kth Largest Element in an Array', difficulty: 'Medium', leetcodeId: 215, hint: 'Same min-heap-of-size-k trick offline: feed all n elements through and read the root.' },
    { title: 'Top K Frequent Elements', difficulty: 'Medium', leetcodeId: 347, hint: 'Count frequencies, then keep a size-k min-heap keyed on frequency so rare elements fall out.' },
    { title: 'Merge k Sorted Lists', difficulty: 'Hard', leetcodeId: 23, hint: 'A heap of k list-heads always pops the globally smallest next node in O(log k).' },
    { title: 'Find Median from Data Stream', difficulty: 'Hard', leetcodeId: 295, hint: 'Two heaps — a max-heap for the lower half, a min-heap for the upper — keep the median at their roots.' },
    { title: 'Task Scheduler', difficulty: 'Medium', leetcodeId: 621, hint: 'A max-heap on remaining counts always schedules the most frequent task that is off cooldown.' },
    { title: 'K Closest Points to Origin', difficulty: 'Medium', leetcodeId: 973, hint: 'Keep a size-k MAX-heap on distance; any point farther than the root can never be among the k closest.' },
    { title: 'Last Stone Weight', difficulty: 'Easy', leetcodeId: 1046, hint: 'A max-heap pops the two heaviest stones to smash, then pushes back their difference.' },
    { title: 'Meeting Rooms II', difficulty: 'Medium', leetcodeId: 253, hint: 'A min-heap of room end-times: reuse the earliest-freeing room or open a new one.' },
    { title: 'Ugly Number II', difficulty: 'Medium', leetcodeId: 264, hint: 'Pop the smallest ugly number so far and push its ×2, ×3, ×5 multiples, deduplicating as you go.' },
    { title: 'Smallest Range Covering Elements from K Lists', difficulty: 'Hard', leetcodeId: 632, hint: 'A min-heap of one cursor per list tracks the current min; advance it while tracking the max to shrink the range.' },
  ],
}
