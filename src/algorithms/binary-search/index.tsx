import type { AlgorithmModule, Step, VarEntry } from '../../core/types'
import { naiveDemo, hashDemo, jumpDemo } from './demos'
import { ARR, TARGET } from './data'

/* Canonical example: find target 37 in a sorted array by repeatedly halving the search space. */

interface BSState {
  arr: number[]
  lo: number
  hi: number
  /** Index currently being probed, or null when between probes. */
  mid: number | null
  /** Outcome of comparing a[mid] with the target. */
  verdict: 'less' | 'greater' | 'equal' | null
  /** Index where the target was found, or null. */
  found: number | null
  /** Search-space sizes so far, e.g. [12, 6, 2] — rendered in the caption. */
  history: number[]
}

function generateSteps(): Step<BSState>[] {
  const steps: Step<BSState>[] = []
  let lo = 0
  let hi = ARR.length - 1
  let history = [ARR.length]
  let probes = 0
  let foundAt: number | null = null

  const snap = (mid: number | null, verdict: BSState['verdict'], found: number | null): BSState => ({
    arr: [...ARR],
    lo,
    hi,
    mid,
    verdict,
    found,
    history: [...history],
  })

  /** Last mid the algorithm computed — the variable keeps its value between probes. */
  let curMid: number | null = null

  const mkVars = (changed: string[] = []): VarEntry[] => {
    const c = (n: string) => (changed.includes(n) ? { changed: true } : {})
    return [
      { name: 'lo', value: String(lo), ...c('lo') },
      { name: 'hi', value: String(hi), ...c('hi') },
      { name: 'mid', value: curMid === null ? '—' : String(curMid), ...c('mid') },
      { name: 'a[mid]', value: curMid === null ? '—' : String(ARR[curMid]), ...c('a[mid]') },
      { name: 'target', value: String(TARGET), ...c('target') },
    ]
  }

  steps.push({
    state: snap(null, null, null),
    description: `The array is SORTED — that one fact is the superpower. We're hunting for ${TARGET} among ${ARR.length} values, and sortedness means one comparison can condemn an entire half.`,
    codeLine: 0,
    vars: [
      { name: 'lo', value: '—' },
      { name: 'hi', value: '—' },
      { name: 'mid', value: '—' },
      { name: 'a[mid]', value: '—' },
      { name: 'target', value: String(TARGET), changed: true },
    ],
  })
  steps.push({
    state: snap(null, null, null),
    description: `Place LO at index 0 (value ${ARR[0]}) and HI at index ${ARR.length - 1} (value ${ARR[ARR.length - 1]}). The invariant: if ${TARGET} exists at all, it lives somewhere in [LO, HI]. Everything outside is provably wrong.`,
    codeLine: 0,
    vars: mkVars(['lo', 'hi']),
  })
  steps.push({
    state: snap(null, null, null),
    description: `${ARR.length} candidates remain. A linear scan might need ${ARR.length} looks; halving needs at most ⌈log₂ ${ARR.length}⌉ = ${Math.ceil(Math.log2(ARR.length))} probes. Let the questioning begin.`,
    codeLine: 1,
    vars: mkVars(),
  })

  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const v = ARR[mid]
    probes++
    curMid = mid

    steps.push({
      state: snap(mid, null, null),
      description: `mid = ⌊(${lo} + ${hi}) / 2⌋ = ${mid}. Probe the exact middle of what's left: a[${mid}] = ${v}. One number is about to answer for ${hi - lo + 1} candidates.`,
      codeLine: 2,
      vars: mkVars(['mid', 'a[mid]']),
    })

    if (v === TARGET) {
      foundAt = mid
      steps.push({
        state: snap(mid, 'equal', null),
        description: `${v} vs ${TARGET} — an exact match! The probe landed directly on the target.`,
        codeLine: 3,
        vars: mkVars(),
      })
      steps.push({
        state: snap(mid, 'equal', mid),
        description: `Return index ${mid}. Found in just ${probes} probes instead of up to ${ARR.length} linear looks — every question erased half the world.`,
        codeLine: 3,
        vars: mkVars(),
      })
      break
    }

    if (v < TARGET) {
      steps.push({
        state: snap(mid, 'less', null),
        description: `${v} < ${TARGET}. Because the array is sorted, every value at index ≤ ${mid} is at most ${v} — all of them are too small. The entire left half is guilty by association.`,
        codeLine: 4,
        vars: mkVars(),
      })
      lo = mid + 1
      history = [...history, hi - lo + 1]
      steps.push({
        state: snap(null, null, null),
        description: `Discard everything up through index ${mid} forever and jump LO to ${lo}. One comparison, half the candidates gone — search space: ${history.join(' → ')}.`,
        codeLine: 4,
        vars: mkVars(['lo']),
      })
    } else {
      steps.push({
        state: snap(mid, 'greater', null),
        description: `${v} > ${TARGET}. Sortedness cuts the other way too: every value at index ≥ ${mid} is at least ${v} — all too big. The right half can never hold ${TARGET}.`,
        codeLine: 5,
        vars: mkVars(),
      })
      hi = mid - 1
      history = [...history, hi - lo + 1]
      steps.push({
        state: snap(null, null, null),
        description: `Discard indices ${mid}…${ARR.length - 1} forever and pull HI down to ${hi}. Search space: ${history.join(' → ')}.`,
        codeLine: 5,
        vars: mkVars(['hi']),
      })
    }

    steps.push({
      state: snap(null, null, null),
      description: `LO ≤ HI still holds, so ${hi - lo + 1} candidate${hi - lo + 1 === 1 ? '' : 's'} remain between a[${lo}] = ${ARR[lo]} and a[${hi}] = ${ARR[hi]}. Ask the same question of the new, smaller world.`,
      codeLine: 1,
      vars: mkVars(),
    })
  }

  steps.push({
    state: snap(null, foundAt !== null ? 'equal' : null, foundAt),
    description: `Recap: ${probes} probes did what a linear scan needs up to ${ARR.length} looks for — the search space shrank ${history.join(' → ')} → found at index ${foundAt}. Doubling the array to ${ARR.length * 2} elements would cost just ONE more probe — that is what O(log n) feels like.`,
    codeLine: -1,
    vars: mkVars(),
  })
  return steps
}

function Visualizer({ step }: { step: Step<BSState> }) {
  const { arr, lo, hi, mid, verdict, found, history } = step.state
  return (
    <>
      <div className="viz-caption">
        target = {TARGET} · space: {history.join(' → ')}
        {found !== null && ` → found @ ${found}`}
      </div>
      <div className="cells spaced">
        {arr.map((v, i) => {
          const isLo = i === lo
          const isHi = i === hi
          const isMid = i === mid
          let cls = 'cell'
          if (found !== null && i === found) cls += ' done'
          else if (isMid && verdict === 'equal') cls += ' done'
          else if (isMid && verdict !== null) cls += ' warm'
          else if (isMid) cls += ' active'
          else if (i < lo || i > hi) cls += ' dim'
          const labels: string[] = []
          if (isLo) labels.push('LO')
          if (isMid) labels.push('MID')
          if (isHi) labels.push('HI')
          const ptrColor = isLo ? 'mint' : isMid ? 'sky' : 'amber'
          return (
            <div key={i} className={cls}>
              <span className="idx">{i}</span>
              {v}
              {labels.length > 0 && <span className={`ptr ${ptrColor}`}>▲ {labels.join('·')}</span>}
            </div>
          )
        })}
      </div>
      <div className="legend">
        <span className="key"><span className="swatch mint" /> lo pointer / probing mid</span>
        <span className="key"><span className="swatch amber" /> hi pointer / comparing</span>
        <span className="key"><span className="swatch" /> still possible</span>
        <span className="key"><span className="swatch sky" /> mid marker</span>
      </div>
    </>
  )
}

export const binarySearch: AlgorithmModule<BSState> = {
  id: 'binary-search',
  name: 'Binary Search',
  tagline: 'Halve the search space with every question — find anything in a sorted world in log n.',
  category: 'Search',
  icon: '🎯',
  problem: {
    title: 'Classic lookup — find the index of 37 in a sorted array',
    statement:
      'You are handed the sorted array [3, 8, 12, 19, 23, 28, 37, 41, 56, 64, 72, 89] and asked one question: does 37 appear in it — and at what index? That exact hunt is what the animation below performs, live.',
    input: 'A sorted array of 12 numbers, and the target value 37.',
    output: 'The index where 37 lives — here, index 6, reached after only 3 probes.',
    naive: {
      description:
        'Linear scan, left to right: 3? no. 8? no. 12? no… You would inspect 7 elements one by one just to reach 37, and all 12 if the target were absent — all while ignoring the gift that someone already sorted the data.',
      pseudocode: [
        'for i ← 0 .. n − 1:',
        '    if a[i] = target:',
        '        return i',
        'return not found',
      ],
      time: 'O(n)',
      space: 'O(1)',
      issues:
        'Each look eliminates exactly ONE candidate: after checking 3, you still know nothing about the other 11 elements. The scan throws away the one thing sortedness offers — that a single comparison against the middle could rule out half the array at once. On a million-element array that is up to 1,000,000 looks where 20 would do, and the gap doubles every time the data doubles.',
      demo: naiveDemo,
    },
  },
  aha:
    'Because the array is sorted, the middle element answers for its entire half: when the probe finds 28 < 37, every one of the 6 values to its left is even smaller — so all of them are thrown away forever on a single comparison. Halving like that pins 37 down in 3 probes instead of 12, and would find anything in a BILLION elements in about 30.',
  journey: [
    {
      title: 'Build a hash map — make the lookup instant',
      spark:
        'Slow lookups? The classic fix is a hash map: pour all 12 values in once, and "where is 37?" becomes an O(1) question. Dictionaries exist for exactly this.',
      pseudocode: [
        'index ← empty hash map',
        'for i ← 0 .. n − 1:',
        '    index[a[i]] ← i',
        'if target in index: return index[target]',
        'return −1',
      ],
      time: 'O(n) build, O(1) lookup',
      space: 'O(n)',
      verdict: 'partial',
      breaks:
        'It answers correctly — but look at the bill. Building the map touches all 12 elements (12 insertions plus O(n) memory) before the single instant lookup, so for one question the total work is WORSE than the scan\'s 7 looks. And notice what it never used: the array is ALREADY SORTED, and this code runs identically on a shuffled copy. We are paying memory for speed the sortedness should hand us for free.',
      insight:
        'A side index is wasted effort when the data is already organized — sorted order IS an index. Use the order itself to skip elements, instead of inspecting every one.',
      demo: hashDemo,
    },
    {
      title: 'Jump search — leap in √n strides, scan the last block',
      spark:
        'If the values only ever increase, you don\'t have to look at every element — leap ahead in strides of ⌊√12⌋ = 3, and only when a probe overshoots 37 do you stop and walk through that one small block.',
      pseudocode: [
        'step ← ⌊√n⌋, i ← step − 1',
        'while i < n and a[i] < target:',
        '    i ← i + step',
        'linear-scan the block a[i − step + 1 .. i]',
        'return its index if found, else −1',
      ],
      time: 'O(√n)',
      space: 'O(1)',
      verdict: 'partial',
      breaks:
        'Genuinely faster: probe a[2] = 12, a[5] = 28, a[8] = 56 — overshot! — then scan the block and hit a[6] = 37. Four looks instead of seven. But the stride is blind to what it learns: when a[5] = 28 came back too small, that verdict condemned EVERYTHING left of index 5 — yet the fixed stride only credits it with clearing 3 cells. At a million elements, jump search still needs ~2,000 looks where 20 would do.',
      insight:
        'Each probe\'s verdict speaks for everything on one side of it — so stop eliminating fixed-size blocks and eliminate a constant FRACTION of whatever remains. The probe that splits the survivors evenly is the middle one.',
      demo: jumpDemo,
    },
    {
      title: 'Binary search — probe the middle, halve the world',
      spark:
        'Always probe the exact middle of whatever is still alive: whichever way the comparison goes, the sorted order lets that single answer erase half of the remaining candidates at once.',
      pseudocode: [
        'lo ← 0, hi ← n − 1',
        'while lo ≤ hi:',
        '    mid ← ⌊(lo + hi) / 2⌋',
        '    if a[mid] = target: return mid',
        '    if a[mid] < target: lo ← mid + 1',
        '    else:               hi ← mid − 1',
        'return −1   ▸ exhausted: target absent',
      ],
      time: 'O(log n)',
      space: 'O(1)',
      verdict: 'optimal',
      breaks:
        'Nothing is wasted now: one three-way comparison can never rule out more than half the candidates, and probing the middle rules out EXACTLY half, every time. Watch it on this array: a[5] = 28 < 37 kills six values at once, a[8] = 56 > 37 kills four more, and the third probe lands on 37 at index 6 — the space shrinks 12 → 6 → 2 → found, in 3 probes with zero extra memory. Doubling the array would cost just one more.',
      insight:
        'The middle element answers for its entire half — which is exactly the aha below.',
      demo: { generateSteps, Visualizer },
    },
  ],
  intuition: [
    'Think of guessing a number between 1 and 100 when every guess earns a "higher" or "lower". Nobody guesses 1, 2, 3… — you guess 50, then 75 or 25, then keep splitting. Seven guesses always suffice, because each answer throws away half of everything you haven\'t tried. Looking up "marmalade" in a dictionary works the same way: open to the middle, see "n", and never touch the back half again.',
    'The key insight is the invariant: at every moment, IF the target exists, it lies between LO and HI — and sortedness makes the middle element speak for its whole half. When a[mid] is too small, everything left of mid is even smaller, so all of it is provably wrong at once. One three-way comparison (smaller / equal / bigger) converts a single peek into the elimination of half the remaining candidates, and nothing eliminated ever needs a second look.',
    'Reach for binary search whenever the data is sorted — or, more powerfully, whenever ANY monotonic yes/no question splits the space into a block of "no"s followed by a block of "yes"es. "Can Koko finish at speed k?" and "Can we ship in D days with capacity c?" are monotonic, so you binary-search the ANSWER itself, even though no array is in sight.',
  ],
  pseudocode: [
    'lo ← 0, hi ← n − 1',
    'while lo ≤ hi:',
    '    mid ← ⌊(lo + hi) / 2⌋',
    '    if a[mid] = target: return mid',
    '    if a[mid] < target: lo ← mid + 1',
    '    else:               hi ← mid − 1',
    'return −1   ▸ exhausted: target absent',
  ],
  complexity: {
    time: 'O(log n)',
    space: 'O(1)',
    explanation:
      'After k probes, at most n/2ᵏ candidates survive — the space halves every time, never less. It hits a single candidate when 2ᵏ ≥ n, i.e. k = ⌈log₂ n⌉. Run it backwards for the intuition: DOUBLING the input only adds one extra probe, so a billion elements fall in about 30 questions. Only the two boundary indices are stored, hence constant space.',
  },
  generateSteps,
  Visualizer,
  problems: [
    { title: 'Binary Search', difficulty: 'Easy', leetcodeId: 704, hint: 'The textbook form: lo/hi/mid on a sorted array, exactly as animated here.' },
    { title: 'Search Insert Position', difficulty: 'Easy', leetcodeId: 35, hint: 'When the loop ends without a hit, LO is already sitting at the insertion point.' },
    { title: 'First Bad Version', difficulty: 'Easy', leetcodeId: 278, hint: 'Versions form FFFF…TTTT under isBadVersion — binary-search the first TRUE, no array needed.' },
    { title: 'Search in Rotated Sorted Array', difficulty: 'Medium', leetcodeId: 33, hint: 'At every mid, one half is still perfectly sorted — test which one, and whether the target lies inside it.' },
    { title: 'Find Minimum in Rotated Sorted Array', difficulty: 'Medium', leetcodeId: 153, hint: 'Compare a[mid] with a[hi]: the minimum always hides on the unsorted side of the pivot.' },
    { title: 'Find First and Last Position of Element in Sorted Array', difficulty: 'Medium', leetcodeId: 34, hint: 'Run two biased searches — one that keeps going left on equality, one that keeps going right.' },
    { title: 'Search a 2D Matrix', difficulty: 'Medium', leetcodeId: 74, hint: 'Row-major order makes the matrix one long sorted array: map mid to (mid / cols, mid % cols).' },
    { title: 'Koko Eating Bananas', difficulty: 'Medium', leetcodeId: 875, hint: 'Binary-search the eating SPEED: "can she finish in h hours at speed k?" is monotonic in k.' },
    { title: 'Capacity To Ship Packages Within D Days', difficulty: 'Medium', leetcodeId: 1011, hint: 'Binary-search the ship capacity between max(weight) and sum(weights); feasibility only improves as capacity grows.' },
    { title: 'Median of Two Sorted Arrays', difficulty: 'Hard', leetcodeId: 4, hint: 'Binary-search the partition point of the shorter array so both left halves hold exactly half the elements.' },
    { title: 'Find Peak Element', difficulty: 'Medium', leetcodeId: 162, hint: 'Always step toward the bigger neighbor of mid — an uphill walk on a halved interval must end at a peak.' },
  ],
}
