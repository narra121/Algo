import type { AlgorithmModule, Step } from '../../core/types'

/* Canonical example: Longest Substring Without Repeating Characters on s = "abcbadcab". */

const S = 'abcbadcab'
const CHARS = S.split('')

interface SWState {
  chars: string[]
  /** Left edge of the window (inclusive). */
  left: number
  /** Index R is currently looking at; -1 before the scan begins. */
  right: number
  /** Whether chars[right] has actually been admitted into the window yet. */
  inWindow: boolean
  /** Index of the earlier occurrence causing a clash, or null when conflict-free. */
  dupIndex: number | null
  best: number
  /** Span of the best window found so far (inclusive); -1 when none yet. */
  bestL: number
  bestR: number
  done: boolean
}

function snapshot(partial: Omit<SWState, 'chars'>): SWState {
  return { chars: [...CHARS], ...partial }
}

function generateSteps(): Step<SWState>[] {
  const steps: Step<SWState>[] = []
  const seen = new Set<string>()
  let left = 0
  let best = 0
  let bestL = -1
  let bestR = -1

  steps.push({
    state: snapshot({ left, right: -1, inWindow: false, dupIndex: null, best, bestL, bestR, done: false }),
    description: `Find the longest run of unique characters in "${S}". The window starts empty: L waits at index 0, R is about to scan, best = 0. Invariant: the window NEVER contains a repeat.`,
    codeLine: 0,
  })

  for (let right = 0; right < CHARS.length; right++) {
    const c = CHARS[right]

    if (seen.has(c)) {
      let dupIndex = -1
      for (let i = left; i < right; i++) if (CHARS[i] === c) dupIndex = i

      steps.push({
        state: snapshot({ left, right, inWindow: false, dupIndex, best, bestL, bestR, done: false }),
        description: `R reaches '${c}' at index ${right} — but '${c}' already sits inside the window at index ${dupIndex}. Admitting it would break the no-repeat invariant, so the window must shrink from the left first.`,
        codeLine: 2,
      })

      while (seen.has(c)) {
        const evicted = CHARS[left]
        seen.delete(evicted)
        left++
        const fixed = !seen.has(c)
        steps.push({
          state: snapshot({ left, right, inWindow: false, dupIndex: fixed ? null : dupIndex, best, bestL, bestR, done: false }),
          description: fixed
            ? `Evict '${evicted}' — that was the duplicate itself. L slides to index ${left} and the clash is gone. Note we never re-examined anything: L only ever moves forward.`
            : `Evict '${evicted}' from the left; L slides to index ${left}. The old '${c}' is still inside, so the clash isn't fixed yet — keep shrinking.`,
          codeLine: 3,
        })
      }
    }

    seen.add(c)
    const len = right - left + 1
    const improved = len > best
    if (improved) {
      best = len
      bestL = left
      bestR = right
    }
    const winStr = S.slice(left, right + 1)
    steps.push({
      state: snapshot({ left, right, inWindow: true, dupIndex: null, best, bestL, bestR, done: false }),
      description: improved
        ? `'${c}' enters safely — the window "${winStr}" (indices ${left}–${right}) is duplicate-free. Length ${len} beats the old record: best = ${best}.`
        : `'${c}' enters safely. Window "${winStr}" (indices ${left}–${right}) has length ${len}, which doesn't beat best = ${best} — but only a duplicate-free window can ever grow, so the shrinking was still worth it.`,
      codeLine: improved ? 5 : 4,
    })
  }

  steps.push({
    state: snapshot({ left, right: CHARS.length - 1, inWindow: true, dupIndex: null, best, bestL, bestR, done: true }),
    description: `Scan complete. The longest duplicate-free substring is "${S.slice(bestL, bestR + 1)}" (indices ${bestL}–${bestR}), length ${best}. L and R each moved forward at most ${S.length} times — about ${2 * S.length} pointer moves total, instead of testing all ${(S.length * (S.length + 1)) / 2} substrings.`,
    codeLine: 6,
  })

  return steps
}

function Visualizer({ step }: { step: Step<SWState> }) {
  const { chars, left, right, inWindow, dupIndex, best, bestL, bestR, done } = step.state
  const windowEnd = inWindow ? right : right - 1
  const winStr = windowEnd >= left ? chars.slice(left, windowEnd + 1).join('') : ''
  const bestStr = bestL >= 0 ? chars.slice(bestL, bestR + 1).join('') : '—'

  return (
    <>
      <div className="viz-caption">
        {done
          ? `answer = ${best} · best window = "${bestStr}"`
          : `window = "${winStr}" · len = ${winStr.length} · best = ${best}${bestL >= 0 ? ` ("${bestStr}")` : ''}`}
      </div>
      <div className="cells spaced">
        {chars.map((ch, i) => {
          const isL = i === left
          const isR = right >= 0 && i === right
          let cls = 'cell'
          if (done && i >= bestL && i <= bestR) cls += ' done'
          else if (dupIndex !== null && i === dupIndex) cls += ' bad'
          else if (isR && !inWindow) cls += ' warm'
          else if (right >= 0 && i >= left && i <= windowEnd) cls += ' window'
          else if (i < left) cls += ' dim'
          return (
            <div key={i} className={cls}>
              <span className="idx">{i}</span>
              {ch}
              {isL && isR && <span className="ptr mint">▲ L·R</span>}
              {isL && !isR && <span className="ptr mint">▲ L</span>}
              {isR && !isL && <span className="ptr sky">▲ R</span>}
            </div>
          )
        })}
      </div>
      <div className="legend">
        <span className="key"><span className="swatch sky" /> inside window</span>
        <span className="key"><span className="swatch amber" /> incoming char</span>
        <span className="key"><span className="swatch rose" /> duplicate clash</span>
        <span className="key"><span className="swatch mint" /> best window (at end)</span>
      </div>
    </>
  )
}

export const slidingWindow: AlgorithmModule<SWState> = {
  id: 'sliding-window',
  name: 'Sliding Window',
  tagline: 'Grow and shrink a window over the data so every element is touched at most twice.',
  category: 'Arrays & Strings',
  icon: '🪟',
  intuition: [
    'Imagine reading a long banner through a stretchy picture frame you slide along the wall. You pull the right edge forward to take in one new letter at a time, and the moment the frame holds something it shouldn\'t — say, the same letter twice — you drag the left edge forward just far enough to fix it. You never lift the frame off the wall and you never slide either edge backwards.',
    'The key insight is that both edges only move forward, so every element enters the window once and leaves it at most once. The inner "shrink" loop looks nested, but its total cost across the WHOLE run is bounded by how far the left edge can travel — at most n steps. The invariant you maintain (here: no repeated character) is restored after every extension, which means the best answer is always one of the windows you actually held.',
    'Reach for this pattern when the problem asks about contiguous subarrays or substrings — longest, shortest, count, max sum — under a constraint that shrinking can only help (removing elements never turns a valid window invalid). If the constraint behaves that way, you can replace checking all O(n²) windows with one linear two-edged sweep.',
  ],
  pseudocode: [
    'best ← 0; left ← 0; seen ← empty set',
    'for right ← 0 .. n − 1:',
    '    while s[right] in seen:',
    '        evict s[left] from seen; left ← left + 1',
    '    add s[right] to seen',
    '    best ← max(best, right − left + 1)',
    'return best',
  ],
  complexity: {
    time: 'O(n)',
    space: 'O(min(n, k)) for an alphabet of size k',
    explanation:
      'It looks like a nested loop, but charge each unit of work to a pointer move: R advances exactly n times, and the inner while loop only ever advances L, which can also move at most n times in total across the entire run. So the "nested" shrinking is amortized — at most 2n pointer moves overall. The set holds only characters currently inside the window, which is capped by the alphabet size (or n, whichever is smaller).',
  },
  generateSteps,
  Visualizer,
  problems: [
    { title: 'Longest Substring Without Repeating Characters', difficulty: 'Medium', leetcodeId: 3, hint: 'The canonical window: extend right, evict from the left until the incoming character is unique again.' },
    { title: 'Minimum Window Substring', difficulty: 'Hard', leetcodeId: 76, hint: 'Grow until the window covers all required characters, then shrink greedily to find the smallest valid cover.' },
    { title: 'Sliding Window Maximum', difficulty: 'Hard', leetcodeId: 239, hint: 'A fixed-size window plus a monotonic deque whose front always holds the current window\'s maximum.' },
    { title: 'Longest Repeating Character Replacement', difficulty: 'Medium', leetcodeId: 424, hint: 'A window is valid while (length − count of its most frequent letter) ≤ k replacements; shrink when it isn\'t.' },
    { title: 'Permutation in String', difficulty: 'Medium', leetcodeId: 567, hint: 'Slide a fixed window the size of the pattern and compare letter-frequency counts as characters enter and leave.' },
    { title: 'Find All Anagrams in a String', difficulty: 'Medium', leetcodeId: 438, hint: 'Same fixed-size frequency window as #567, but record every position where the counts match.' },
    { title: 'Maximum Average Subarray I', difficulty: 'Easy', leetcodeId: 643, hint: 'Fixed window of size k: add the entering element, subtract the leaving one — never re-sum the window.' },
    { title: 'Fruit Into Baskets', difficulty: 'Medium', leetcodeId: 904, hint: 'Longest window containing at most 2 distinct values; shrink from the left when a third type appears.' },
    { title: 'Subarray Product Less Than K', difficulty: 'Medium', leetcodeId: 713, hint: 'Keep the running product < k by shrinking; every valid window ending at R adds (R − L + 1) subarrays.' },
    { title: 'Minimum Size Subarray Sum', difficulty: 'Medium', leetcodeId: 209, hint: 'Grow until the sum reaches the target, then shrink while it still does — recording the shortest valid length.' },
    { title: 'Max Consecutive Ones III', difficulty: 'Medium', leetcodeId: 1004, hint: 'Longest window containing at most k zeros; when a (k+1)th zero enters, advance L past the oldest zero.' },
  ],
}
