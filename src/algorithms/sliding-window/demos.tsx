import type { AttemptDemo, Step, VarEntry } from '../../core/types'
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

function naiveVars(o: {
  i: number
  j: number
  sub: string
  best: number
  checked: number
  changed?: Partial<Record<'i' | 'j' | 'sub' | 'best' | 'checked', boolean>>
}): VarEntry[] {
  const ch = o.changed ?? {}
  return [
    { name: 'i', value: o.i < 0 ? '—' : String(o.i), changed: ch.i },
    { name: 'j', value: o.j < 0 ? '—' : String(o.j), changed: ch.j },
    { name: 's[i..j]', value: o.sub ? `"${o.sub}"` : '—', changed: ch.sub },
    { name: 'best', value: String(o.best), changed: ch.best },
    { name: 'checked', value: String(o.checked), changed: ch.checked },
  ]
}

/** First letter that occurs twice in s[i..j], with both indices — or null if clean. */
function firstDuplicate(i: number, j: number): { ch: string; first: number; second: number } | null {
  const firstPos = new Map<string, number>()
  for (let k = i; k <= j; k++) {
    const c = CHARS[k]
    if (firstPos.has(c)) return { ch: c, first: firstPos.get(c)!, second: k }
    firstPos.set(c, k)
  }
  return null
}

function naiveSteps(): Step<NaiveState>[] {
  const steps: Step<NaiveState>[] = []
  const n = CHARS.length // 9
  const totalSubs = (n * (n + 1)) / 2 // 45

  steps.push({
    state: { i: -1, j: -1, sub: '', clean: false, best: 0, checked: 0, done: false },
    description: `Brute force: test every substring of "${S}" for repeated characters. With n = ${n} there are ${totalSubs} substrings — start at the top-left corner and grind right and down, checking every single one.`,
    codeLine: 0,
    vars: naiveVars({ i: -1, j: -1, sub: '', best: 0, checked: 0, changed: { best: true, checked: true } }),
  })

  let best = 0
  let checked = 0

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      checked++
      const sub = S.slice(i, j + 1)
      const dup = firstDuplicate(i, j)
      const clean = dup === null
      const improved = clean && sub.length > best
      if (improved) best = sub.length

      const newStart = j === i && i > 0
      const prefix = newStart
        ? `New start i = ${i} — everything verified for start ${i - 1} is forgotten and the scan begins again. `
        : ''

      let body: string
      if (improved) {
        body = `Check ${checked}: s[${i}..${j}] = "${sub}" — all ${sub.length} characters are distinct, and length ${sub.length} beats the old record: best = ${best}.`
      } else if (clean) {
        body = `Check ${checked}: s[${i}..${j}] = "${sub}" — no repeats, length ${sub.length}, but best is already ${best}, so nothing changes.`
      } else {
        body = `Check ${checked}: s[${i}..${j}] = "${sub}" — '${dup!.ch}' appears at both index ${dup!.first} and index ${dup!.second}, so it is rejected. best stays ${best}.`
      }

      steps.push({
        state: { i, j, sub, clean, best, checked, done: false },
        description: prefix + body,
        codeLine: improved ? 4 : 3,
        vars: naiveVars({
          i, j, sub, best, checked,
          changed: { i: j === i, j: true, sub: true, best: improved, checked: true },
        }),
      })
    }
  }

  steps.push({
    state: { i: -1, j: -1, sub: '', clean: false, best, checked, done: true },
    description: `Done. All ${totalSubs} substrings were actually checked, touching ~165 characters in total, and the longest duplicate-free one has length ${best} ("cbad", indices 2–5) — every fresh start at index i threw away everything already verified for index i − 1.`,
    codeLine: 5,
    vars: naiveVars({ i: -1, j: -1, sub: '', best, checked }),
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
          { tone: 'amber', label: 'substring under test' },
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

function gapVars(o: {
  pos: string
  letter: string
  p: number
  q: number
  gap: number
  best: number
  changed?: Partial<Record<'pos' | 'letter' | 'p' | 'q' | 'gap' | 'best', boolean>>
}): VarEntry[] {
  const ch = o.changed ?? {}
  return [
    { name: 'pos', value: o.pos || '—', changed: ch.pos },
    { name: 'letter', value: o.letter ? `'${o.letter}'` : '—', changed: ch.letter },
    { name: 'p', value: o.p < 0 ? '—' : String(o.p), changed: ch.p },
    { name: 'q', value: o.q < 0 ? '—' : String(o.q), changed: ch.q },
    { name: 'gap', value: o.gap < 0 ? '—' : String(o.gap), changed: ch.gap },
    { name: 'best', value: String(o.best), changed: ch.best },
  ]
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
  const posStr = `{${posSnapshot.map(([ch, pos]) => `${ch}:[${pos.join(',')}]`).join(', ')}}`

  // Step 1: sentinel — describe the idea
  steps.push({
    state: { positions: [], letter: '', p: -1, q: -1, gap: 0, best: 0, done: false, predicted: 0 },
    description: `Idea: only a repeated letter can ruin a stretch, so skip testing substrings entirely. Record where each letter appears, then the longest clean run is just the biggest gap between two occurrences of the same letter.`,
    codeLine: 1,
    vars: gapVars({ pos: '', letter: '', p: -1, q: -1, gap: -1, best: 0, changed: { best: true } }),
  })

  // Step 2: show the completed position map
  steps.push({
    state: { positions: posSnapshot, letter: '', p: -1, q: -1, gap: 0, best: 0, done: false, predicted: 0 },
    description: `Scan "${S}" once: 'a' → [0,4,7]; 'b' → [1,3,8]; 'c' → [2,6]; 'd' → [5]. Letters with only one occurrence ('d') can never break a stretch — ignore them. Now measure the gaps for a, b, c.`,
    codeLine: 0,
    vars: gapVars({ pos: posStr, letter: '', p: -1, q: -1, gap: -1, best: 0, changed: { pos: true } }),
  })

  let best = 0

  // Process each repeated letter — emit a "start letter" intro + each pair
  for (const [ch, pos] of repeated) {
    // Intro step for this letter
    steps.push({
      state: { positions: posSnapshot, letter: ch, p: pos[0], q: pos[1], gap: 0, best, done: false, predicted: 0 },
      description: `'${ch}' occurs at [${pos.join(', ')}] — ${pos.length - 1} consecutive pair${pos.length - 1 === 1 ? '' : 's'} to check. Point p at index ${pos[0]} and q at index ${pos[1]}.`,
      codeLine: 2,
      vars: gapVars({ pos: posStr, letter: ch, p: pos[0], q: pos[1], gap: -1, best, changed: { letter: true, p: true, q: true, gap: true } }),
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
        vars: gapVars({ pos: posStr, letter: ch, p, q, gap, best, changed: { p: k > 0, q: k > 0, gap: true, best: improved } }),
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
    vars: gapVars({ pos: posStr, letter: 'b', p: 3, q: 8, gap: 5, best }),
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
      <Legend
        items={[
          { tone: 'mint', label: 'first occurrence (p)' },
          { tone: 'amber', label: 'next occurrence (q) / hidden clash' },
          { tone: 'sky', label: 'gap interior' },
        ]}
      />
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

function setVars(o: {
  i: number
  j: number
  seen: string[]
  best: number
  examined: number
  changed?: Partial<Record<'i' | 'j' | 'seen' | 'best' | 'examined', boolean>>
}): VarEntry[] {
  const ch = o.changed ?? {}
  return [
    { name: 'i', value: o.i < 0 ? '—' : String(o.i), changed: ch.i },
    { name: 'j', value: o.j < 0 ? '—' : String(o.j), changed: ch.j },
    { name: 's[j]', value: o.j < 0 ? '—' : `'${CHARS[o.j]}'`, changed: ch.j },
    { name: 'seen', value: `{${o.seen.join(', ')}}`, changed: ch.seen },
    { name: 'best', value: String(o.best), changed: ch.best },
    { name: 'examined', value: String(o.examined), changed: ch.examined },
  ]
}

function setSteps(): Step<SetState>[] {
  const steps: Step<SetState>[] = []
  const n = CHARS.length // 9

  // Step 1: Sentinel intro
  steps.push({
    state: { i: -1, j: -1, seen: [], clash: null, best: 0, examined: 0, done: false },
    description: `Hash-set approach: from each start i, walk right adding characters to a set; stop at the first repeat. Correct — but the set is cleared and rebuilt ${n} times, rediscovering facts already proven.`,
    codeLine: 0,
    vars: setVars({ i: -1, j: -1, seen: [], best: 0, examined: 0, changed: { best: true, examined: true } }),
  })

  let best = 0
  let examined = 0
  let prevLen = 0
  const perStart: number[] = []

  for (let i = 0; i < n; i++) {
    const seen = new Set<string>()

    // Start step — name the waste when the previous run already certified this region
    const overlapEnd = i - 1 + prevLen - 1 // last index certified by the previous start
    const overlap = i > 0 && overlapEnd >= i ? S.slice(i, overlapEnd + 1) : ''
    steps.push({
      state: { i, j: -1, seen: [], clash: null, best, examined, done: false },
      description:
        i === 0
          ? `Start i=0: the set is empty — scan right from '${CHARS[0]}'.`
          : overlap
            ? `Start i=${i}: the set is cleared and the scan restarts from '${CHARS[i]}' — even though "${overlap}" (indices ${i}–${overlapEnd}) was certified duplicate-free a moment ago during start ${i - 1}. Every one of those characters will now be re-proven.`
            : `Start i=${i}: clear the set and scan right from '${CHARS[i]}'.`,
      codeLine: 2,
      vars: setVars({ i, j: -1, seen: [], best, examined, changed: { i: true, j: true, seen: true } }),
    })

    let j = i
    let clashChar: string | null = null
    for (; j < n; j++) {
      const c = CHARS[j]
      examined++
      if (seen.has(c)) {
        clashChar = c
        const firstIdx = S.indexOf(c, i)
        steps.push({
          state: { i, j, seen: [...seen], clash: c, best, examined, done: false },
          description: `j=${j}: '${c}' is already in {${[...seen].join(', ')}} — it entered back at index ${firstIdx} — so the run dies here. "${S.slice(i, j)}" from start ${i} has length ${j - i}.`,
          codeLine: 4,
          vars: setVars({ i, j, seen: [...seen], best, examined, changed: { j: true, examined: true } }),
        })
        break
      }
      seen.add(c)
      steps.push({
        state: { i, j, seen: [...seen], clash: null, best, examined, done: false },
        description: `j=${j}: '${c}' is not in the set — admit it. seen = {${[...seen].join(', ')}}, run so far "${S.slice(i, j + 1)}".`,
        codeLine: 5,
        vars: setVars({ i, j, seen: [...seen], best, examined, changed: { j: true, seen: true, examined: true } }),
      })
    }
    perStart.push(Math.min(j, n - 1) - i + 1)

    const len = seen.size
    const improved = len > best
    if (improved) best = len
    steps.push({
      state: { i, j: Math.min(j, n - 1), seen: [...seen], clash: clashChar, best, examined, done: false },
      description: improved
        ? `End start ${i}: run "${S.slice(i, i + len)}"${clashChar === null ? ' reached the end of the string with no repeat' : ''} — length ${len}. New best = ${best}!`
        : `End start ${i}: run "${S.slice(i, i + len)}"${clashChar === null ? ' reached the end of the string' : ''}, length ${len} — doesn't beat best = ${best}.`,
      codeLine: 6,
      vars: setVars({ i, j: Math.min(j, n - 1), seen: [...seen], best, examined, changed: { best: improved } }),
    })

    prevLen = len
  }

  // Final verdict — after every start was actually played out
  steps.push({
    state: { i: -1, j: -1, seen: [], clash: null, best, examined, done: true },
    description: `Answer: ${best} ("cbad", indices 2–5). Correct — but ${perStart.join(' + ')} = ${examined} character examinations and ${n} set rebuilds, where the sliding window needs ~18 pointer moves. The fix: when a repeat kills a run, keep the still-clean contents and evict from the LEFT instead of restarting.`,
    codeLine: 6,
    vars: setVars({ i: -1, j: -1, seen: [], best, examined }),
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
