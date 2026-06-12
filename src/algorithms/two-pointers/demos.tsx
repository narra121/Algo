import type { AttemptDemo, Step, VarEntry } from '../../core/types'
import { Cells, Legend, VizCaption } from '../../components/vizPrimitives'
import { ARR, TARGET } from './data'

const fmtIdx = (i: number) => `${i} (=${ARR[i]})`

/* ---------- demo 1: brute force — check every pair ---------- */

interface BFState {
  i: number
  j: number
  sum: number | null
  checks: number
  hit: boolean
}

function bfVars(
  i: number,
  j: number,
  sum: number | null,
  checks: number,
  changed: { i?: boolean; j?: boolean; sum?: boolean } = {},
): VarEntry[] {
  return [
    { name: 'i', value: i < 0 ? '—' : fmtIdx(i), changed: changed.i },
    { name: 'j', value: j < 0 ? '—' : fmtIdx(j), changed: changed.j },
    { name: 'a[i] + a[j]', value: sum === null ? '—' : String(sum), changed: changed.sum },
    { name: 'target', value: String(TARGET) },
    { name: 'checks', value: String(checks), changed: checks > 0 },
  ]
}

function bruteSteps(): Step<BFState>[] {
  const steps: Step<BFState>[] = []
  steps.push({
    state: { i: -1, j: -1, sum: null, checks: 0, hit: false },
    description: `Check every pair until one sums to ${TARGET}. With ${ARR.length} numbers that is up to ${(ARR.length * (ARR.length - 1)) / 2} pair-checks. Start: pair up the first two.`,
    codeLine: 0,
    vars: bfVars(-1, -1, null, 0),
  })
  let checks = 0
  for (let i = 0; i < ARR.length - 1; i++) {
    for (let j = i + 1; j < ARR.length; j++) {
      checks++
      const sum = ARR[i] + ARR[j]
      const iJustMoved = j === i + 1
      if (sum === TARGET) {
        steps.push({
          state: { i, j, sum, checks, hit: true },
          description: `${ARR[i]} + ${ARR[j]} = ${sum} — found it! But it took ${checks} checks to get here, and nothing learned from the first ${checks - 1} failures helped.`,
          codeLine: 3,
          vars: bfVars(i, j, sum, checks, { i: iJustMoved, j: true, sum: true }),
        })
        return steps
      }
      steps.push({
        state: { i, j, sum, checks, hit: false },
        description: `Check ${checks}: ${ARR[i]} + ${ARR[j]} = ${sum} ≠ ${TARGET}. ${sum < TARGET ? 'Too small' : 'Too big'} — but the loops learn nothing from that, they just grind on${iJustMoved && i > 0 ? ` (outer loop restarts the inner scan from j = ${j})` : ''}.`,
        codeLine: 2,
        vars: bfVars(i, j, sum, checks, { i: iJustMoved, j: true, sum: true }),
      })
    }
  }
  return steps
}

function BruteViz({ step }: { step: Step<BFState> }) {
  const { i, j, sum, checks, hit } = step.state
  return (
    <>
      <VizCaption>
        target = {TARGET} · checks so far = {checks}
        {sum !== null && ` · current sum = ${sum}`}
      </VizCaption>
      <Cells
        values={ARR}
        classFor={k => (hit && (k === i || k === j) ? 'done' : k === i ? 'active' : k === j ? 'warm' : k < i ? 'dim' : '')}
        pointerFor={k => (k === i ? { label: 'i', tone: 'mint' } : k === j ? { label: 'j', tone: 'amber' } : null)}
      />
      <Legend items={[{ tone: 'mint', label: 'outer i' }, { tone: 'amber', label: 'inner j' }, { label: 'not yet paired' }]} />
    </>
  )
}

export const naiveDemo: AttemptDemo<BFState> = { generateSteps: bruteSteps, Visualizer: BruteViz }

/* ---------- demo 2: hash set of complements ---------- */

interface HSState {
  idx: number
  seen: number[]
  want: number | null
  found: boolean
}

function hsVars(
  x: number | null,
  want: number | null,
  seen: number[],
  changed: { x?: boolean; want?: boolean; seen?: boolean } = {},
): VarEntry[] {
  return [
    { name: 'x', value: x === null ? '—' : String(x), changed: changed.x },
    { name: 'target − x', value: want === null ? '—' : String(want), changed: changed.want },
    { name: 'seen', value: `{${seen.join(', ')}}`, changed: changed.seen },
  ]
}

function hashSteps(): Step<HSState>[] {
  const steps: Step<HSState>[] = []
  steps.push({
    state: { idx: -1, seen: [], want: null, found: false },
    description: `One pass, no re-scanning: for each number x ask "have I already seen ${TARGET} − x?". The hash set starts empty.`,
    codeLine: 0,
    vars: hsVars(null, null, [], { seen: true }),
  })
  const seen = new Set<number>()
  for (let idx = 0; idx < ARR.length; idx++) {
    const x = ARR[idx]
    const want = TARGET - x
    // `seen` was extended with the previous x AFTER the previous step was
    // snapshotted, so this step is where the panel shows (and highlights) the add.
    const seenGrew = idx > 0
    if (seen.has(want)) {
      steps.push({
        state: { idx, seen: [...seen], want, found: true },
        description: `At ${x}: is ${TARGET} − ${x} = ${want} in the set? YES — ${want} + ${x} = ${TARGET}, found in ${idx + 1} steps. (A different valid pair than 11 + 23 — the set answers with whichever partner it met first.) Cost: the set itself, O(n) extra memory — and the sortedness was never used.`,
        codeLine: 2,
        vars: hsVars(x, want, [...seen], { x: true, want: true, seen: seenGrew }),
      })
      return steps
    }
    steps.push({
      state: { idx, seen: [...seen], want, found: false },
      description: `At ${x}: is ${TARGET} − ${x} = ${want} in the set {${[...seen].join(', ')}}? No — remember ${x} and move on.`,
      codeLine: 3,
      vars: hsVars(x, want, [...seen], { x: true, want: true, seen: seenGrew }),
    })
    seen.add(x)
  }
  return steps
}

function HashViz({ step }: { step: Step<HSState> }) {
  const { idx, seen, want, found } = step.state
  return (
    <>
      <VizCaption>
        target = {TARGET}
        {want !== null && ` · looking for ${want} in the set`}
      </VizCaption>
      <Cells
        values={ARR}
        classFor={k => (found && (k === idx || ARR[k] === want) ? 'done' : k === idx ? 'active' : k < idx ? 'dim' : '')}
        pointerFor={k => (k === idx ? { label: 'x', tone: 'mint' } : null)}
      />
      <VizCaption>seen = {`{ ${seen.join(', ')} }`} — O(n) extra memory</VizCaption>
      <Legend items={[{ tone: 'mint', label: 'current x' }, { label: 'already in the set' }]} />
    </>
  )
}

export const hashDemo: AttemptDemo<HSState> = { generateSteps: hashSteps, Visualizer: HashViz }

/* ---------- demo 3: binary-search each complement ---------- */

interface BSCState {
  i: number
  lo: number
  hi: number
  mid: number | null
  want: number
  probes: number
  found: boolean
}

function bscVars(
  i: number,
  want: number,
  lo: number,
  hi: number,
  mid: number | null,
  probes: number,
  changed: { i?: boolean; want?: boolean; lo?: boolean; hi?: boolean; mid?: boolean; probes?: boolean } = {},
): VarEntry[] {
  return [
    { name: 'i', value: fmtIdx(i), changed: changed.i },
    { name: 'want', value: String(want), changed: changed.want },
    { name: 'lo', value: String(lo), changed: changed.lo },
    { name: 'hi', value: String(hi), changed: changed.hi },
    { name: 'mid', value: mid === null ? '—' : fmtIdx(mid), changed: changed.mid },
    { name: 'probes', value: String(probes), changed: changed.probes },
  ]
}

function bsearchSteps(): Step<BSCState>[] {
  const steps: Step<BSCState>[] = []
  let probes = 0
  steps.push({
    state: { i: 0, lo: 1, hi: ARR.length - 1, mid: null, want: TARGET - ARR[0], probes, found: false },
    description: `No extra memory this time: for each x, binary-search the rest of the array for ${TARGET} − x. First up: x = ${ARR[0]}, hunting for ${TARGET - ARR[0]} in indices 1..${ARR.length - 1}.`,
    codeLine: 0,
    vars: bscVars(0, TARGET - ARR[0], 1, ARR.length - 1, null, probes, { i: true, want: true, lo: true, hi: true }),
  })
  for (let i = 0; i < ARR.length - 1; i++) {
    const want = TARGET - ARR[i]
    let lo = i + 1
    let hi = ARR.length - 1
    // Track what the previous pushed step displayed, so each probe can
    // highlight exactly which bound that probe's verdict moved.
    let loMoved = false
    let hiMoved = false
    if (i > 0) {
      steps.push({
        state: { i, lo, hi, mid: null, want, probes, found: false },
        description: `Exhausted the range without finding ${TARGET - ARR[i - 1]}. Next x = ${ARR[i]}, so now hunt for ${want} in indices ${lo}..${hi}. Notice: the wanted partner only ever shrinks — yet this search restarts blind from the middle anyway.`,
        codeLine: 1,
        vars: bscVars(i, want, lo, hi, null, probes, { i: true, want: true, lo: true, hi: true }),
      })
    }
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      probes++
      if (ARR[mid] === want) {
        steps.push({
          state: { i, lo, hi, mid, want, probes, found: true },
          description: `Probe ${probes}: a[${mid}] = ${ARR[mid]} — that IS ${want}! ${ARR[i]} + ${ARR[mid]} = ${TARGET}, found with ${probes} probes total. Correct and memory-free, but every search forgot what the previous one ruled out.`,
          codeLine: 2,
          vars: bscVars(i, want, lo, hi, mid, probes, { lo: loMoved, hi: hiMoved, mid: true, probes: true }),
        })
        return steps
      }
      steps.push({
        state: { i, lo, hi, mid, want, probes, found: false },
        description: `Probe ${probes}: midpoint of ${lo}..${hi} is index ${mid}, and a[${mid}] = ${ARR[mid]} ${ARR[mid] < want ? '<' : '>'} ${want} — ${ARR[mid] < want ? `too small, so ${want} can only be right of ${mid}; search the right half` : `too big, so ${want} can only be left of ${mid}; search the left half`}.`,
        codeLine: 1,
        vars: bscVars(i, want, lo, hi, mid, probes, { lo: loMoved, hi: hiMoved, mid: true, probes: true }),
      })
      if (ARR[mid] < want) {
        lo = mid + 1
        loMoved = true
        hiMoved = false
      } else {
        hi = mid - 1
        hiMoved = true
        loMoved = false
      }
    }
  }
  return steps
}

function BsearchViz({ step }: { step: Step<BSCState> }) {
  const { i, lo, hi, mid, want, probes, found } = step.state
  return (
    <>
      <VizCaption>
        x = {ARR[i]} · hunting {want} · probes = {probes}
      </VizCaption>
      <Cells
        values={ARR}
        classFor={k =>
          found && (k === i || k === mid) ? 'done' : k === i ? 'active' : k === mid ? 'warm' : k > i && k >= lo && k <= hi ? '' : 'dim'
        }
        pointerFor={k => (k === i ? { label: 'x', tone: 'mint' } : k === mid ? { label: 'mid', tone: 'amber' } : null)}
      />
      <Legend items={[{ tone: 'mint', label: 'fixed x' }, { tone: 'amber', label: 'probe' }, { label: 'live search range' }]} />
    </>
  )
}

export const bsearchDemo: AttemptDemo<BSCState> = { generateSteps: bsearchSteps, Visualizer: BsearchViz }
