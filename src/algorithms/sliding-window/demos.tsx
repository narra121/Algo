import type { AttemptDemo, Step } from '../../core/types'
import { Cells, Legend, VizCaption } from '../../components/vizPrimitives'
import { S, CHARS } from './data'

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 1: Naive — enumerate every substring, test each for repeats
   codeLine indexes problem.naive.pseudocode:
     0: 'best ← 0'
     1: 'for i ← 0 .. n − 1:'
     2: '    for j ← i .. n − 1:'
     3: '        if s[i..j] has no repeated letter:'
     4: '            best ← max(best, j − i + 1)'
     5: 'return best'
───────────────────────────────────────────────────────────────────────────── */

interface NaiveState {
  /** Left bound of the substring under inspection (-1 = intro). */
  i: number
  /** Right bound of the substring under inspection (-1 = intro). */
  j: number
  /** Snapshot of the substring text being tested, '' when not yet started. */
  sub: string
  /** Whether the current substring is duplicate-free. */
  clean: boolean
  /** Best length found so far. */
  best: number
  /** How many substrings have been checked so far. */
  checked: number
  /** True on the final summary step. */
  done: boolean
}

function naiveSteps(): Step<NaiveState>[] {
  const steps: Step<NaiveState>[] = []
  const n = CHARS.length // 9
  const totalSubs = (n * (n + 1)) / 2 // 45

  // Sentinel intro
  steps.push({
    state: { i: -1, j: -1, sub: '', clean: false, best: 0, checked: 0, done: false },
    description: `Brute force: test every substring of "${S}" for repeated characters. With n = ${n} there are ${totalSubs} substrings — start at the top-left corner and grind right and down.`,
    codeLine: 0,
  })

  let best = 0
  let checked = 0
  const SHOW_LIMIT = 9 // emit real steps for the first 9 checks, then truncate

  outer: for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      checked++
      const sub = S.slice(i, j + 1)
      const seen = new Set(sub)
      const clean = seen.size === sub.length
      if (clean && sub.length > best) best = sub.length

      if (checked <= SHOW_LIMIT) {
        steps.push({
          state: { i, j, sub, clean, best, checked, done: false },
          description: clean
            ? `Check ${checked}: s[${i}..${j}] = "${sub}" — no repeats, length ${sub.length}. best = ${best}.`
            : `Check ${checked}: s[${i}..${j}] = "${sub}" — duplicate found. Discard. (Everything we just verified about the first ${sub.length - 1} characters is thrown away too.)`,
          codeLine: clean ? 4 : 3,
        })
      }

      if (checked === SHOW_LIMIT) break outer
    }
  }

  // Finish the actual computation silently so we can report the true final answer
  let realBest = best
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const sub = S.slice(i, j + 1)
      const seen = new Set(sub)
      if (seen.size === sub.length && sub.length > realBest) realBest = sub.length
    }
  }

  // Truncation step
  steps.push({
    state: { i: 8, j: 8, sub: S[8], clean: true, best: realBest, checked: totalSubs, done: false },
    description: `…and so on — ${totalSubs} substrings checked in total. Every fresh start at index i throws away everything verified for index i − 1.`,
    codeLine: 2,
  })

  // Final verdict
  steps.push({
    state: { i: -1, j: -1, sub: '', clean: false, best: realBest, checked: totalSubs, done: true },
    description: `Done. Longest duplicate-free substring: length ${realBest}. Cost: ${totalSubs} substring checks touching ~165 characters — for a 9-letter string.`,
    codeLine: 5,
  })

  return steps
}

function NaiveViz({ step }: { step: Step<NaiveState> }) {
  const { i, j, best, checked, clean, done, sub } = step.state
  return (
    <>
      <VizCaption>
        {done
          ? `answer = ${best} · ${checked} substrings checked`
          : `checked = ${checked} · best = ${best}${sub ? ` · current = "${sub}"` : ''}`}
      </VizCaption>
      <Cells
        values={CHARS}
        classFor={k => {
          if (done) return ''
          if (i < 0) return ''
          if (k === i && k === j) return clean ? 'done' : 'warm'
          if (k >= i && k <= j) return clean ? 'done' : 'warm'
          if (k < i) return 'dim'
          return ''
        }}
        pointerFor={k => {
          if (i < 0) return null
          if (k === i && k === j) return { label: 'i·j', tone: 'mint' }
          if (k === i) return { label: 'i', tone: 'mint' }
          if (k === j) return { label: 'j', tone: 'amber' }
          return null
        }}
      />
      <Legend
        items={[
          { tone: 'mint', label: 'left bound i' },
          { tone: 'amber', label: 'right bound j' },
          { label: 'substring under test' },
        ]}
      />
    </>
  )
}

export const naiveDemo: AttemptDemo<NaiveState> = { generateSteps: naiveSteps, Visualizer: NaiveViz }

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 2: Gap approach — measure the gaps between repeated letters (verdict: fail)
   codeLine indexes journey[0].pseudocode:
     0: 'pos ← positions of every letter'
     1: 'best ← 0'
     2: 'for each letter with ≥ 2 occurrences:'
     3: '    for consecutive occurrences p, q:'
     4: '        best ← max(best, q − p)'
     5: 'return best'
───────────────────────────────────────────────────────────────────────────── */

interface GapState {
  /** Map snapshot: letter → sorted list of positions. */
  positions: [string, number[]][]
  /** Letter currently being processed ('' = not started / done). */
  letter: string
  /** The pair of consecutive positions being compared right now. */
  p: number
  q: number
  /** Gap value for this pair (q − p). */
  gap: number
  /** Best gap found so far. */
  best: number
  /** True on the final counterexample / verdict step. */
  done: boolean
  /** The wrong predicted answer (shown on verdict). */
  predicted: number
}

function gapSteps(): Step<GapState>[] {
  const steps: Step<GapState>[] = []

  // Build positions map
  const posMap = new Map<string, number[]>()
  for (let k = 0; k < CHARS.length; k++) {
    const c = CHARS[k]
    if (!posMap.has(c)) posMap.set(c, [])
    posMap.get(c)!.push(k)
  }
  // Only letters with ≥ 2 occurrences
  const repeated: [string, number[]][] = []
  for (const [ch, pos] of posMap.entries()) {
    if (pos.length >= 2) repeated.push([ch, pos])
  }
  // Sort for deterministic order: a, b, c
  repeated.sort((x, y) => x[0].localeCompare(y[0]))

  const posSnapshot: [string, number[]][] = [...posMap.entries()].sort((x, y) => x[0].localeCompare(y[0]))

  // Step 1: sentinel — describe the idea
  steps.push({
    state: { positions: [], letter: '', p: -1, q: -1, gap: 0, best: 0, done: false, predicted: 0 },
    description: `Idea: only a repeated letter can ruin a stretch, so skip testing substrings entirely. Record where each letter appears, then the longest clean run is just the biggest gap between two occurrences of the same letter.`,
    codeLine: 1,
  })

  // Step 2: show the completed position map
  steps.push({
    state: { positions: posSnapshot, letter: '', p: -1, q: -1, gap: 0, best: 0, done: false, predicted: 0 },
    description: `Scan "${S}" once: 'a' → [0,4,7]; 'b' → [1,3,8]; 'c' → [2,6]; 'd' → [5]. Letters with only one occurrence ('d') can never break a stretch — ignore them. Now measure the gaps for a, b, c.`,
    codeLine: 0,
  })

  let best = 0

  // Process each repeated letter — emit a "start letter" intro + each pair
  for (const [ch, pos] of repeated) {
    // Intro step for this letter
    steps.push({
      state: { positions: posSnapshot, letter: ch, p: pos[0], q: pos[1], gap: 0, best, done: false, predicted: 0 },
      description: `'${ch}' occurs at [${pos.join(', ')}] — ${pos.length - 1} consecutive pair${pos.length - 1 === 1 ? '' : 's'} to check.`,
      codeLine: 2,
    })

    for (let k = 0; k + 1 < pos.length; k++) {
      const p = pos[k]
      const q = pos[k + 1]
      const gap = q - p
      const improved = gap > best
      if (improved) best = gap

      steps.push({
        state: { positions: posSnapshot, letter: ch, p, q, gap, best, done: false, predicted: 0 },
        description: improved
          ? `'${ch}': indices ${p} and ${q}, gap = ${q} − ${p} = ${gap}. Stretch "${S.slice(p, q)}" (indices ${p}–${q - 1}) holds '${ch}' only once. New best = ${best}.`
          : `'${ch}': indices ${p} and ${q}, gap = ${q} − ${p} = ${gap}. Doesn't beat best = ${best}.`,
        codeLine: improved ? 4 : 3,
      })
    }
  }

  // Verdict: the wrong answer and the counterexample
  // Best gap = 5 (b: 3→8, stretch indices 3–7 = "badca")
  // But "badca" has 'a' at both index 4 and 7
  steps.push({
    state: { positions: posSnapshot, letter: 'b', p: 3, q: 8, gap: 5, best, done: true, predicted: best },
    description: `Algorithm returns ${best}. But the winning stretch "badca" (indices 3–7) contains 'a' at BOTH index 4 and index 7 — passing b's gap test while failing a's. The gap idea certifies one letter; it says nothing about every other letter inside the stretch. Predicted: ${best}. Real answer: 4.`,
    codeLine: 5,
  })

  return steps
}

function GapViz({ step }: { step: Step<GapState> }) {
  const { positions, letter, p, q, best, done, predicted } = step.state
  return (
    <>
      <VizCaption>
        {done
          ? `predicted = ${predicted} (WRONG) · real answer = 4`
          : `best gap so far = ${best}${letter ? ` · processing '${letter}'` : ''}`}
      </VizCaption>
      <Cells
        values={CHARS}
        classFor={k => {
          if (done) {
            // Highlight the counterexample stretch (3–7) with 'a' at 4 and 7 as bad
            if (k === 4 || k === 7) return 'warm' // 'a' at both positions — the clash
            if (k >= 3 && k <= 7) return 'done'   // the promised stretch
            return 'dim'
          }
          if (p < 0) return ''
          if (k === p || k === q) return 'active'
          if (k > p && k < q) return 'window'
          return 'dim'
        }}
        pointerFor={k => {
          if (done) {
            if (k === 4) return { label: 'a!', tone: 'amber' }
            if (k === 7) return { label: 'a!', tone: 'amber' }
            return null
          }
          if (p < 0) return null
          if (k === p) return { label: 'p', tone: 'mint' }
          if (k === q) return { label: 'q', tone: 'amber' }
          return null
        }}
      />
      <div className="legend">
        <span className="key"><span className="swatch mint" /> first occurrence (p)</span>
        <span className="key"><span className="swatch amber" /> next occurrence (q) / hidden clash</span>
        <span className="key"><span className="swatch sky" /> gap interior</span>
      </div>
      {positions.length > 0 && (
        <VizCaption>
          {positions.map(([ch, pos]) => `'${ch}': [${pos.join(', ')}]`).join(' · ')}
        </VizCaption>
      )}
    </>
  )
}

export const gapDemo: AttemptDemo<GapState> = { generateSteps: gapSteps, Visualizer: GapViz }

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 3: Hash-set approach — extend each start with a set (verdict: partial)
   codeLine indexes journey[1].pseudocode:
     0: 'best ← 0'
     1: 'for i ← 0 .. n − 1:'
     2: '    seen ← empty set'
     3: '    for j ← i .. n − 1:'
     4: '        if s[j] in seen: break'
     5: '        add s[j] to seen'
     6: '    best ← max(best, size of seen)'
───────────────────────────────────────────────────────────────────────────── */

interface SetState {
  /** Current outer index (start of window). */
  i: number
  /** Current inner index (right edge). -1 = not started. */
  j: number
  /** Snapshot of the current set contents. */
  seen: string[]
  /** Character that triggered the break, or null. */
  clash: string | null
  /** Best length found so far. */
  best: number
  /** How many characters examined so far across all starts. */
  examined: number
  /** True on the final verdict step. */
  done: boolean
}

function setSteps(): Step<SetState>[] {
  const steps: Step<SetState>[] = []
  const n = CHARS.length // 9

  // Compute honest stats up front (not emitted as steps — used in descriptions)
  let totalExamined = 0
  let trueBest = 0
  const perStart: number[] = []
  for (let i = 0; i < n; i++) {
    const s2 = new Set<string>()
    let count = 0
    for (let j = i; j < n; j++) {
      count++
      if (s2.has(CHARS[j])) { break }
      s2.add(CHARS[j])
    }
    perStart.push(count)
    totalExamined += count
    if (s2.size > trueBest) trueBest = s2.size
  }

  // Step 1: Sentinel intro
  steps.push({
    state: { i: -1, j: -1, seen: [], clash: null, best: 0, examined: 0, done: false },
    description: `Hash-set approach: from each start i, walk right adding characters to a set; stop at the first repeat. Correct — but the set is cleared and rebuilt ${n} times, rediscovering facts already proven.`,
    codeLine: 0,
  })

  let best = 0
  let examined = 0

  // Show i=0 in full: walk 'a','b','c' then hit 'b' clash → 4 chars examined, len 3
  const i0 = 0
  {
    const seen0 = new Set<string>()
    steps.push({
      state: { i: i0, j: -1, seen: [], clash: null, best, examined, done: false },
      description: `Start i=0: clear the set, scan right from '${CHARS[i0]}'.`,
      codeLine: 2,
    })
    let j = i0
    for (; j < n; j++) {
      const c = CHARS[j]
      examined++
      if (seen0.has(c)) {
        steps.push({ state: { i: i0, j, seen: [...seen0], clash: c, best, examined, done: false }, description: `j=${j}: '${c}' already in {${[...seen0].join(', ')}} — stop. Run "abc", length 3.`, codeLine: 4 })
        break
      }
      seen0.add(c)
      steps.push({ state: { i: i0, j, seen: [...seen0], clash: null, best, examined, done: false }, description: `j=${j}: add '${c}' → {${[...seen0].join(', ')}}.`, codeLine: 5 })
    }
    if (seen0.size > best) best = seen0.size
    steps.push({ state: { i: i0, j: Math.min(j, n - 1), seen: [...seen0], clash: j < n ? CHARS[j] : null, best, examined, done: false }, description: `End start 0: length ${seen0.size}, best = ${best}.`, codeLine: 6 })
  }
  // i=0 contributed: 4 chars, 4 steps in inner loop + 2 = 6 steps total

  // Show i=2 in full: 'c','b','a','d' admitted, 'c' clash → len 4, new best
  const i2 = 2
  {
    // Update examined for i=1 silently
    const seen1 = new Set<string>()
    for (let j = 1; j < n; j++) {
      examined++
      if (seen1.has(CHARS[j])) break
      seen1.add(CHARS[j])
    }
    if (seen1.size > best) best = seen1.size

    const seen2 = new Set<string>()
    steps.push({
      state: { i: i2, j: -1, seen: [], clash: null, best, examined, done: false },
      description: `Start i=2: set cleared — even though start 1's run "bc" is still fresh in memory. Scan from '${CHARS[i2]}'.`,
      codeLine: 2,
    })
    let j = i2
    for (; j < n; j++) {
      const c = CHARS[j]
      examined++
      if (seen2.has(c)) {
        steps.push({ state: { i: i2, j, seen: [...seen2], clash: c, best, examined, done: false }, description: `j=${j}: '${c}' already in {${[...seen2].join(', ')}} — stop. Run "cbad", length 4.`, codeLine: 4 })
        break
      }
      seen2.add(c)
      steps.push({ state: { i: i2, j, seen: [...seen2], clash: null, best, examined, done: false }, description: `j=${j}: add '${c}' → {${[...seen2].join(', ')}}.`, codeLine: 5 })
    }
    if (seen2.size > best) best = seen2.size
    steps.push({ state: { i: i2, j: Math.min(j, n - 1), seen: [...seen2], clash: j < n ? CHARS[j] : null, best, examined, done: false }, description: `End start 2: "cbad", length ${seen2.size}. New best = ${best}!`, codeLine: 6 })
  }

  // Show i=3 start — highlight the redundant rebuild
  const i3 = 3
  {
    const seen3 = new Set<string>()
    steps.push({
      state: { i: i3, j: -1, seen: [], clash: null, best, examined, done: false },
      description: `Start i=3: set cleared again. "bad" (indices 3–5) was certified duplicate-free just a moment ago from start 2 — yet b, a, d will all be re-proven from scratch.`,
      codeLine: 2,
    })
    let j = i3
    for (; j < n; j++) {
      examined++
      if (seen3.has(CHARS[j])) {
        steps.push({ state: { i: i3, j, seen: [...seen3], clash: CHARS[j], best, examined, done: false }, description: `j=${j}: '${CHARS[j]}' already in {${[...seen3].join(', ')}} — stop. Length ${seen3.size}.`, codeLine: 4 })
        break
      }
      seen3.add(CHARS[j])
      steps.push({ state: { i: i3, j, seen: [...seen3], clash: null, best, examined, done: false }, description: `j=${j}: re-prove '${CHARS[j]}' → {${[...seen3].join(', ')}}.`, codeLine: 5 })
    }
    if (seen3.size > best) best = seen3.size
  }

  // Silently finish remaining starts
  for (let i = 4; i < n; i++) {
    const s = new Set<string>()
    for (let j = i; j < n; j++) {
      examined++
      if (s.has(CHARS[j])) break
      s.add(CHARS[j])
    }
    if (s.size > best) best = s.size
  }

  // Final verdict
  steps.push({
    state: { i: -1, j: -1, seen: [], clash: null, best: trueBest, examined: totalExamined, done: true },
    description: `Answer: ${trueBest} ("cbad", indices 2–5). Correct — but ${perStart.join(' + ')} = ${totalExamined} character examinations, the set rebuilt ${n} times. The window approach needs ~18 pointer moves to cover the same ground.`,
    codeLine: -1,
  })

  return steps
}

function SetViz({ step }: { step: Step<SetState> }) {
  const { i, j, seen, clash, best, done } = step.state
  return (
    <>
      <VizCaption>
        {done
          ? `answer = ${best} · correct but rebuilds the set 9 times`
          : `best = ${best} · set = {${seen.join(', ')}}`}
      </VizCaption>
      <Cells
        values={CHARS}
        classFor={k => {
          if (done) return ''
          if (i < 0) return ''
          if (clash !== null && k === j) return 'warm'          // clash character
          if (k >= i && (j < 0 ? k === i : k <= j)) return 'done' // in set (accepted)
          if (k < i) return 'dim'
          return ''
        }}
        pointerFor={k => {
          if (i < 0 || done) return null
          if (k === i && k === j) return { label: 'i·j', tone: 'mint' }
          if (k === i) return { label: 'i', tone: 'mint' }
          if (k === j) return { label: 'j', tone: clash !== null ? 'amber' : 'mint' }
          return null
        }}
      />
      <Legend
        items={[
          { tone: 'mint', label: 'start i / extending j' },
          { tone: 'amber', label: 'clash — break' },
          { label: 'in set (accepted)' },
        ]}
      />
    </>
  )
}

export const setDemo: AttemptDemo<SetState> = { generateSteps: setSteps, Visualizer: SetViz }
