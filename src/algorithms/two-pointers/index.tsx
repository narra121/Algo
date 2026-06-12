import type { AlgorithmModule, Step, VarEntry } from '../../core/types'
import { bsearchDemo, hashDemo, naiveDemo } from './demos'
import { ARR, TARGET } from './data'

/* Canonical example: Two Sum II — find two numbers in a sorted array summing to a target. */

interface TPState {
  arr: number[]
  left: number
  right: number
  sum: number | null
  verdict: 'low' | 'high' | 'hit' | null
}

const fmtIdx = (i: number) => `${i} (=${ARR[i]})`

function tpVars(
  left: number,
  right: number,
  sum: number | null,
  changed: { left?: boolean; right?: boolean; sum?: boolean } = {},
): VarEntry[] {
  return [
    { name: 'left', value: fmtIdx(left), changed: changed.left },
    { name: 'right', value: fmtIdx(right), changed: changed.right },
    { name: 'sum', value: sum === null ? '—' : String(sum), changed: changed.sum },
    { name: 'target', value: String(TARGET) },
  ]
}

function generateSteps(): Step<TPState>[] {
  const steps: Step<TPState>[] = []
  let left = 0
  let right = ARR.length - 1

  steps.push({
    state: { arr: ARR, left, right, sum: null, verdict: null },
    description: `Array is sorted. Place LEFT at the smallest value (${ARR[left]}) and RIGHT at the largest (${ARR[right]}). Target sum = ${TARGET}.`,
    codeLine: 0,
    vars: tpVars(left, right, null, { left: true, right: true }),
  })

  while (left < right) {
    const sum = ARR[left] + ARR[right]
    if (sum === TARGET) {
      steps.push({
        state: { arr: ARR, left, right, sum, verdict: 'hit' },
        description: `${ARR[left]} + ${ARR[right]} = ${sum} — exactly the target! Found the pair at indices ${left} and ${right} without checking all ${(ARR.length * (ARR.length - 1)) / 2} combinations.`,
        codeLine: 3,
        vars: tpVars(left, right, sum, { sum: true }),
      })
      return steps
    }
    const movedLeft = sum < TARGET
    if (movedLeft) {
      steps.push({
        state: { arr: ARR, left, right, sum, verdict: 'low' },
        description: `${ARR[left]} + ${ARR[right]} = ${sum} < ${TARGET}. Too small — ${ARR[right]} is the largest partner ${ARR[left]} will ever get, so ${ARR[left]} can never reach ${TARGET} with anyone. Discard LEFT, move it right.`,
        codeLine: 4,
        vars: tpVars(left, right, sum, { sum: true }),
      })
      left++
      steps.push({
        state: { arr: ARR, left, right, sum: null, verdict: null },
        description: `LEFT advances to index ${left} (=${ARR[left]}); ${ARR[left - 1]} is permanently out. ${right - left + 1} candidates remain between the pointers — one comparison, one elimination.`,
        codeLine: 1,
        vars: tpVars(left, right, sum, { left: true }),
      })
    } else {
      steps.push({
        state: { arr: ARR, left, right, sum, verdict: 'high' },
        description: `${ARR[left]} + ${ARR[right]} = ${sum} > ${TARGET}. Too big — ${ARR[left]} is the smallest partner ${ARR[right]} will ever get, so ${ARR[right]} overshoots ${TARGET} with everyone. Discard RIGHT, move it left.`,
        codeLine: 5,
        vars: tpVars(left, right, sum, { sum: true }),
      })
      right--
      steps.push({
        state: { arr: ARR, left, right, sum: null, verdict: null },
        description: `RIGHT retreats to index ${right} (=${ARR[right]}); ${ARR[right + 1]} is permanently out. ${right - left + 1} candidates remain between the pointers — one comparison, one elimination.`,
        codeLine: 1,
        vars: tpVars(left, right, sum, { right: true }),
      })
    }
  }
  return steps
}

function Visualizer({ step }: { step: Step<TPState> }) {
  const { arr, left, right, sum, verdict } = step.state
  return (
    <>
      <div className="viz-caption">
        target = {TARGET}
        {sum !== null && ` · current sum = ${sum}`}
      </div>
      <div className="cells spaced">
        {arr.map((v, i) => {
          const isL = i === left
          const isR = i === right
          let cls = 'cell'
          if (verdict === 'hit' && (isL || isR)) cls += ' done'
          else if (isL) cls += ' active'
          else if (isR) cls += ' warm'
          else if (i < left || i > right) cls += ' dim'
          return (
            <div key={i} className={cls}>
              <span className="idx">{i}</span>
              {v}
              {isL && <span className="ptr mint">▲ LEFT</span>}
              {isR && !isL && <span className="ptr amber">▲ RIGHT</span>}
            </div>
          )
        })}
      </div>
      <div className="legend">
        <span className="key"><span className="swatch mint" /> left pointer</span>
        <span className="key"><span className="swatch amber" /> right pointer</span>
        <span className="key"><span className="swatch" /> still possible</span>
      </div>
    </>
  )
}

export const twoPointers: AlgorithmModule<TPState> = {
  id: 'two-pointers',
  name: 'Two Pointers',
  tagline: 'Squeeze a sorted array from both ends, eliminating one candidate per comparison.',
  category: 'Arrays & Strings',
  icon: '🤏',
  problem: {
    title: 'Two Sum II — find the pair with a given sum',
    statement:
      'You are handed the sorted array [2, 5, 8, 11, 15, 19, 23, 28] and asked: do two of these numbers add up to exactly 34 — and which two? That exact question is what the animation below is solving, live.',
    input: 'A sorted array of 8 numbers, and a target sum of 34.',
    output: 'The two numbers (and their positions) that sum to 34 — here, 11 + 23.',
    naive: {
      description:
        'The obvious approach: check every possible pair until one sums to 34. For these 8 numbers that is up to 28 pair-checks — and it completely ignores that someone already sorted the array for us.',
      pseudocode: [
        'for i ← 0 .. n − 2:',
        '    for j ← i + 1 .. n − 1:',
        '        if a[i] + a[j] = target:',
        '            return (i, j)',
        'return nothing',
      ],
      time: 'O(n²)',
      space: 'O(1)',
      issues:
        'The nested loops learn nothing from failure: discovering 2 + 5 is too small tells it nothing about 2 + 8, so every pair gets its own check. Double the array and the work quadruples — at n = 10,000 that is ~50 million checks where 10,000 would do. Worst of all, the sorted order (the one thing that could prune pairs wholesale) is never used.',
      demo: naiveDemo,
    },
  },
  aha:
    'In a sorted array, one check of the two ends is a verdict you can act on forever: if the sum is too small, the smallest number is too small for EVERY partner — so throw it away. Each check permanently kills one number, so n numbers need only n checks instead of n².',
  journey: [
    {
      title: 'Remember what you have seen — a hash set of complements',
      spark:
        'The brute force re-scans the array for every i. So stop re-scanning: walk the array ONCE, and for each number x ask "have I already seen 34 − x?" — a hash set answers that instantly.',
      pseudocode: [
        'seen ← empty hash set',
        'for each x in a:',
        '    if (target − x) in seen: return the pair',
        '    add x to seen',
        'return nothing',
      ],
      time: 'O(n)',
      space: 'O(n)',
      verdict: 'partial',
      breaks:
        'It actually works — by the time the walk reaches 23 it asks "seen 34 − 23 = 11?", and yes: found in 6 steps instead of up to 28 pair-checks. But it pays for the speed with O(n) extra memory, and notice what it never touched: the array is ALREADY SORTED, and this solution would run exactly the same on a shuffled array. We are buying with memory what the sortedness gives us for free.',
      insight:
        'One pass with no re-checking is the right speed — keep that. But find a way to let the sorted order, not a hash set, answer "is the partner here?"',
      demo: hashDemo,
    },
    {
      title: 'Use the sortedness — binary-search each complement',
      spark:
        'Sorted array means binary search. For each number x, binary-search the rest of the array for 34 − x: no extra memory, and each lookup is log n instead of a full scan.',
      pseudocode: [
        'for i ← 0 .. n − 1:',
        '    j ← binarySearch(a, target − a[i], from i+1)',
        '    if j found: return (i, j)',
        'return nothing',
      ],
      time: 'O(n log n)',
      space: 'O(1)',
      verdict: 'partial',
      breaks:
        'Also correct, and memory-free: 8 elements × ~3 probes ≈ 24 probes in the worst case. But watch the searches: for x = 2 we hunt for 32, for x = 5 we hunt for 29, for x = 8 we hunt for 26… the wanted complement only ever moves LEFT as x moves right — yet every binary search forgets this and restarts blind from the middle, re-exploring territory the previous search already ruled out.',
      insight:
        'The partner we need drifts in ONE direction as x grows. So do not restart the search each time — keep a second pointer parked where the last search ended, and only ever walk it one way.',
      demo: bsearchDemo,
    },
    {
      title: 'Two pointers — squeeze from both ends',
      spark:
        'Put one finger on the smallest number and one on the largest, and let every comparison evict one of them: too small means the left number is useless forever, too big means the right one is.',
      pseudocode: [
        'left ← 0, right ← n − 1',
        'while left < right:',
        '    sum ← a[left] + a[right]',
        '    if sum = target: return (left, right)',
        '    if sum < target: left ← left + 1',
        '    else:            right ← right − 1',
      ],
      time: 'O(n)',
      space: 'O(1)',
      verdict: 'optimal',
      breaks:
        'Nothing is wasted now: 2 + 28 = 30 < 34 evicts 2 from EVERY future pair, because 28 was its best possible partner. One comparison, one permanent elimination — for these 8 numbers the answer (11 + 23) arrives in just 4 comparisons instead of up to 28, with zero extra memory.',
      insight:
        'Each end-comparison is a verdict you can act on forever — which is exactly the aha below.',
      demo: { generateSteps, Visualizer },
    },
  ],
  intuition: [
    'Imagine two people standing at opposite ends of a sorted bookshelf, looking for two books whose page counts add to exactly 30. If the current pair totals too few pages, the person at the thin end steps inward; too many, the thick-end person steps inward. They never need to backtrack.',
    'The key insight is monotonicity: because the array is sorted, when the sum is too small the leftmost element can never form the answer with ANYTHING (its best partner — the largest remaining — was just tried). So it can be discarded forever. Each comparison kills one element, so n elements need at most n comparisons.',
    'Reach for this pattern whenever a sorted order (or the option to sort) lets you make an irreversible decision at the boundaries: pair sums, container areas, palindromes, deduplication, merging.',
  ],
  pseudocode: [
    'left ← 0, right ← n − 1',
    'while left < right:',
    '    sum ← a[left] + a[right]',
    '    if sum = target: return (left, right)',
    '    if sum < target: left ← left + 1',
    '    else:            right ← right − 1',
  ],
  complexity: {
    time: 'O(n)',
    space: 'O(1)',
    explanation:
      'The pointers only ever move toward each other, and every loop iteration moves one of them by one step. They can move at most n times in total before they meet — so at most n comparisons. No extra memory beyond the two indices.',
  },
  generateSteps,
  Visualizer,
  problems: [
    { title: 'Two Sum II — Input Array Is Sorted', difficulty: 'Medium', leetcodeId: 167, hint: 'The canonical squeeze: move left up when the sum is small, right down when large.' },
    { title: 'Valid Palindrome', difficulty: 'Easy', leetcodeId: 125, hint: 'Pointers walk inward from both ends comparing characters, skipping non-alphanumerics.' },
    { title: 'Container With Most Water', difficulty: 'Medium', leetcodeId: 11, hint: 'Always move the shorter wall inward — the taller one can never be the limiting factor again.' },
    { title: '3Sum', difficulty: 'Medium', leetcodeId: 15, hint: 'Fix one number, then run the two-pointer squeeze on the rest for each fixed value.' },
    { title: 'Trapping Rain Water', difficulty: 'Hard', leetcodeId: 42, hint: 'Track max wall heights from both ends; the side with the lower max bounds the water there.' },
    { title: 'Remove Duplicates from Sorted Array', difficulty: 'Easy', leetcodeId: 26, hint: 'Slow pointer marks the write position, fast pointer scans for the next new value.' },
    { title: 'Move Zeroes', difficulty: 'Easy', leetcodeId: 283, hint: 'Slow pointer marks where the next non-zero lands; fast pointer finds non-zeros.' },
    { title: 'Sort Colors (Dutch National Flag)', difficulty: 'Medium', leetcodeId: 75, hint: 'Three pointers partition the array into 0s, 1s, and 2s in one pass.' },
    { title: 'Merge Sorted Array', difficulty: 'Easy', leetcodeId: 88, hint: 'Pointers start at the ENDS of both arrays and write the larger value backwards.' },
    { title: 'Linked List Cycle (Floyd)', difficulty: 'Easy', leetcodeId: 141, hint: 'Fast/slow pointers: if there is a loop, the fast runner must lap the slow one.' },
    { title: 'Squares of a Sorted Array', difficulty: 'Easy', leetcodeId: 977, hint: 'Largest square is at one of the two ends; compare and write backwards.' },
    { title: 'Is Subsequence', difficulty: 'Easy', leetcodeId: 392, hint: 'One pointer per string; advance both on match, only the haystack pointer otherwise.' },
  ],
}
