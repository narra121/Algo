import type { AttemptDemo, Step } from '../../core/types'
import { Cells, Legend, VizCaption } from '../../components/vizPrimitives'
import { ARR, TARGET } from './data'

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 1: Naive — linear scan, left to right
   pseudocode index matches problem.naive.pseudocode:
     0: 'for i ← 0 .. n − 1:'
     1: '    if a[i] = target:'
     2: '        return i'
     3: 'return not found'
───────────────────────────────────────────────────────────────────────────── */

interface LinearState {
  i: number          // current probe index (-1 = intro sentinel)
  checks: number     // comparisons so far
  found: boolean
}

const NAIVE_PSEUDOCODE = [
  'for i ← 0 .. n − 1:',
  '    if a[i] = target:',
  '        return i',
  'return not found',
]

function linearSteps(): Step<LinearState>[] {
  const steps: Step<LinearState>[] = []

  // Intro — sentinel i = -1
  steps.push({
    state: { i: -1, checks: 0, found: false },
    description: `Linear scan: inspect every element from index 0 onward until we find ${TARGET}. The array is sorted — but we are about to ignore that completely.`,
    codeLine: 0,
  })

  let checks = 0
  for (let i = 0; i < ARR.length; i++) {
    checks++
    if (ARR[i] === TARGET) {
      steps.push({
        state: { i, checks, found: true },
        description: `Check ${checks}: a[${i}] = ${ARR[i]} — match! Found ${TARGET} at index ${i} after ${checks} comparisons. A sorted array offered a shortcut at every step, and we used none of it.`,
        codeLine: 2,
      })
      return steps
    }
    steps.push({
      state: { i, checks, found: false },
      description: `Check ${checks}: a[${i}] = ${ARR[i]} ≠ ${TARGET}. Move on — we learned nothing about the ${ARR.length - i - 1} elements still ahead.`,
      codeLine: 1,
    })
  }

  // Exhausted (unreachable for this input but here for completeness)
  steps.push({
    state: { i: ARR.length, checks, found: false },
    description: `Scanned all ${ARR.length} elements, ${TARGET} not found. ${checks} comparisons wasted — each eliminated exactly one candidate instead of half.`,
    codeLine: 3,
  })
  return steps
}

function LinearViz({ step }: { step: Step<LinearState> }) {
  const { i, checks, found } = step.state
  return (
    <>
      <VizCaption>
        target = {TARGET} · checks = {checks}
      </VizCaption>
      <Cells
        values={ARR}
        classFor={k =>
          found && k === i ? 'done' : k === i ? 'active' : k < i ? 'dim' : ''
        }
        pointerFor={k => (k === i ? { label: 'i', tone: 'mint' } : null)}
      />
      <Legend
        items={[
          { tone: 'mint', label: 'current probe' },
          { label: 'unchecked' },
        ]}
      />
    </>
  )
}

export const naiveDemo: AttemptDemo<LinearState> = {
  generateSteps: linearSteps,
  Visualizer: LinearViz,
}

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 2: Hash map — build an index then do O(1) lookup
   pseudocode index matches journey[0].pseudocode:
     0: 'index ← empty hash map'
     1: 'for i ← 0 .. n − 1:'
     2: '    index[a[i]] ← i'
     3: 'if target in index: return index[target]'
     4: 'return −1'
───────────────────────────────────────────────────────────────────────────── */

interface HashMapState {
  phase: 'build' | 'lookup'
  buildIdx: number     // current insert index (-1 = intro sentinel)
  map: [number, number][]  // snapshot: [value, index] pairs in insertion order
  found: boolean
  foundAt: number | null
}

function hashMapSteps(): Step<HashMapState>[] {
  const steps: Step<HashMapState>[] = []
  const map = new Map<number, number>()

  // Intro sentinel
  steps.push({
    state: { phase: 'build', buildIdx: -1, map: [], found: false, foundAt: null },
    description: `Hash-map approach: first pour all ${ARR.length} values into a map (value → index), then answer "where is ${TARGET}?" in one O(1) lookup. Watch the build cost accumulate.`,
    codeLine: 0,
  })

  // Build phase — insert every element
  for (let i = 0; i < ARR.length; i++) {
    map.set(ARR[i], i)
    steps.push({
      state: { phase: 'build', buildIdx: i, map: [...map.entries()], found: false, foundAt: null },
      description: `Insert ${i + 1}/${ARR.length}: map[${ARR[i]}] = ${i}. That is ${i + 1} write${i + 1 === 1 ? '' : 's'} before we can answer a single query.`,
      codeLine: 2,
    })
  }

  // Lookup phase
  const foundAt = map.has(TARGET) ? map.get(TARGET)! : null
  steps.push({
    state: { phase: 'lookup', buildIdx: ARR.length - 1, map: [...map.entries()], found: foundAt !== null, foundAt },
    description: foundAt !== null
      ? `Lookup: is ${TARGET} in the map? YES — index ${foundAt}, O(1). But we paid ${ARR.length} insertions + O(n) memory to get here. The array was already sorted — that IS an index, and we built a second one from scratch instead of using it.`
      : `Lookup: is ${TARGET} in the map? No. ${ARR.length} insertions, O(n) memory, and the sortedness was never consulted once.`,
    codeLine: 3,
  })

  return steps
}

function HashMapViz({ step }: { step: Step<HashMapState> }) {
  const { phase, buildIdx, map, found, foundAt } = step.state
  const mapValues = map.map(([v]) => v)
  return (
    <>
      <VizCaption>
        {phase === 'build'
          ? `building map — ${map.length} / ${ARR.length} inserted`
          : `lookup: target = ${TARGET}${foundAt !== null ? ` → index ${foundAt}` : ' → not found'}`}
      </VizCaption>
      <Cells
        values={ARR}
        classFor={k =>
          found && k === foundAt ? 'done'
          : phase === 'lookup' ? 'dim'
          : k === buildIdx ? 'active'
          : k < buildIdx ? 'dim'
          : ''
        }
        pointerFor={k =>
          phase === 'build' && k === buildIdx ? { label: 'insert', tone: 'mint' }
          : phase === 'lookup' && found && k === foundAt ? { label: 'found', tone: 'amber' }
          : null
        }
      />
      <VizCaption>
        map keys inserted: [{mapValues.join(', ')}]
      </VizCaption>
      <Legend
        items={[
          { tone: 'mint', label: 'current insert' },
          { tone: 'amber', label: 'found target' },
          { label: 'queued / done' },
        ]}
      />
    </>
  )
}

export const hashDemo: AttemptDemo<HashMapState> = {
  generateSteps: hashMapSteps,
  Visualizer: HashMapViz,
}

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 3: Jump search — leap in √n strides, scan the last block
   pseudocode index matches journey[1].pseudocode:
     0: 'step ← ⌊√n⌋, i ← step − 1'
     1: 'while i < n and a[i] < target:'
     2: '    i ← i + step'
     3: 'linear-scan the block a[i − step + 1 .. i]'
     4: 'return its index if found, else −1'
───────────────────────────────────────────────────────────────────────────── */

interface JumpState {
  phase: 'leap' | 'scan' | 'done'
  i: number         // current leap-probe index (-1 = intro sentinel)
  blockStart: number | null   // start of the linear scan block
  blockEnd: number | null     // end of the linear scan block
  scanIdx: number | null      // current index within block scan
  leaps: number     // how many stride probes so far
  probes: number    // total probes (leaps + scan checks)
  found: boolean
  foundAt: number | null
}

function jumpSteps(): Step<JumpState>[] {
  const n = ARR.length
  const step = Math.floor(Math.sqrt(n))  // 3
  const steps: Step<JumpState>[] = []

  // Intro sentinel — two steps to set the scene properly
  steps.push({
    state: { phase: 'leap', i: -1, blockStart: null, blockEnd: null, scanIdx: null, leaps: 0, probes: 0, found: false, foundAt: null },
    description: `Jump search exploits sortedness to skip elements in bulk: instead of checking one by one, leap ahead in strides of ⌊√n⌋ positions and only scan the single block where the target can hide.`,
    codeLine: 0,
  })
  steps.push({
    state: { phase: 'leap', i: step - 1, blockStart: null, blockEnd: null, scanIdx: null, leaps: 0, probes: 0, found: false, foundAt: null },
    description: `n = ${n}, so stride = ⌊√${n}⌋ = ${step}. First probe lands at index ${step - 1} (value ${ARR[step - 1]}). If it's below ${TARGET}, leap ${step} ahead; if it overshoots, back up and linearly scan that last block of ≤ ${step} cells.`,
    codeLine: 0,
  })

  // Leap phase — emit one step per probe (including the overshoot probe)
  let i = step - 1   // 2
  let leaps = 0
  let probes = 0

  while (i < n) {
    leaps++
    probes++
    if (ARR[i] === TARGET) {
      steps.push({
        state: { phase: 'done', i, blockStart: i, blockEnd: i, scanIdx: i, leaps, probes, found: true, foundAt: i },
        description: `Leap ${leaps}: probe a[${i}] = ${ARR[i]} — exact match at stride landing! Found ${TARGET} at index ${i} in ${probes} total probes. Lucky, but still √n work just to reach this point.`,
        codeLine: 1,
      })
      return steps
    }
    if (ARR[i] > TARGET) {
      // Overshot — emit the overshoot probe step, then break to block scan
      steps.push({
        state: { phase: 'leap', i, blockStart: null, blockEnd: null, scanIdx: null, leaps, probes, found: false, foundAt: null },
        description: `Leap ${leaps}: probe a[${i}] = ${ARR[i]} > ${TARGET} — overshot by ${ARR[i] - TARGET}! The fixed stride cannot exploit what it just learned: ${TARGET} must be hiding in the block just behind this probe.`,
        codeLine: 1,
      })
      break
    }
    // ARR[i] < TARGET — still below, stride forward
    steps.push({
      state: { phase: 'leap', i, blockStart: null, blockEnd: null, scanIdx: null, leaps, probes, found: false, foundAt: null },
      description: `Leap ${leaps}: probe a[${i}] = ${ARR[i]} < ${TARGET} — still below, stride forward another ${step} positions.`,
      codeLine: 1,
    })
    i += step
  }

  if (i >= n) {
    // Walked off end — last valid index is n-1
    leaps++
    probes++
    i = n  // flag
    steps.push({
      state: { phase: 'leap', i: n - 1, blockStart: null, blockEnd: null, scanIdx: null, leaps, probes, found: false, foundAt: null },
      description: `Leap ${leaps}: i = ${i} ≥ n — walked off the end. ${TARGET} must be in the final block. Back up to scan.`,
      codeLine: 1,
    })
  }

  // Block scan
  const blockEnd = Math.min(i, n - 1)
  const blockStart = Math.max(0, i - step)

  steps.push({
    state: { phase: 'scan', i: blockEnd, blockStart, blockEnd, scanIdx: blockStart, leaps, probes, found: false, foundAt: null },
    description: `Now linearly scan block a[${blockStart}..${blockEnd}] (${blockEnd - blockStart + 1} element${blockEnd - blockStart + 1 === 1 ? '' : 's'}). This is the blind spot: the stride skipped right over the answer zone.`,
    codeLine: 3,
  })

  let foundAt: number | null = null
  for (let k = blockStart; k <= blockEnd; k++) {
    probes++
    if (ARR[k] === TARGET) {
      foundAt = k
      steps.push({
        state: { phase: 'done', i: blockEnd, blockStart, blockEnd, scanIdx: k, leaps, probes, found: true, foundAt },
        description: `Scan: a[${k}] = ${ARR[k]} — found ${TARGET}! Total probes: ${probes} (${leaps} leaps + ${probes - leaps} scan check${probes - leaps === 1 ? '' : 's'}). Binary search finds the same answer in just ${Math.ceil(Math.log2(n))} probes — at a million elements, jump search still needs ~2,000 where ~20 would do.`,
        codeLine: 4,
      })
      return steps
    }
    steps.push({
      state: { phase: 'scan', i: blockEnd, blockStart, blockEnd, scanIdx: k, leaps, probes, found: false, foundAt: null },
      description: `Scan: a[${k}] = ${ARR[k]} ≠ ${TARGET}. Next.`,
      codeLine: 3,
    })
  }

  // Not found in block
  steps.push({
    state: { phase: 'done', i: blockEnd, blockStart, blockEnd, scanIdx: blockEnd, leaps, probes, found: false, foundAt: null },
    description: `Block exhausted, ${TARGET} not found. ${probes} probes total. Jump search trades binary search's perfect halving for a fixed stride that learns only the minimum from each comparison.`,
    codeLine: 4,
  })
  return steps
}

function JumpViz({ step }: { step: Step<JumpState> }) {
  const { phase, i, blockStart, blockEnd, scanIdx, leaps, probes, found, foundAt } = step.state
  return (
    <>
      <VizCaption>
        target = {TARGET} · leaps = {leaps} · total probes = {probes}
      </VizCaption>
      <Cells
        values={ARR}
        classFor={k => {
          if (found && k === foundAt) return 'done'
          if (phase === 'leap' && k === i) return 'active'
          if (phase === 'scan' && blockStart !== null && blockEnd !== null) {
            if (k === scanIdx) return 'active'
            if (k >= blockStart && k <= blockEnd) return 'warm'
            return 'dim'
          }
          if (phase === 'done' && blockStart !== null && blockEnd !== null) {
            if (k >= blockStart && k <= blockEnd && !found) return 'dim'
          }
          return ''
        }}
        pointerFor={k => {
          if (phase === 'leap' && k === i && i >= 0) return { label: 'leap', tone: 'mint' }
          if ((phase === 'scan' || phase === 'done') && k === scanIdx) return { label: 'scan', tone: found && k === foundAt ? 'amber' : 'mint' }
          return null
        }}
      />
      <Legend
        items={[
          { tone: 'mint', label: 'current probe' },
          { tone: 'amber', label: 'found target' },
          { label: 'scan block' },
        ]}
      />
    </>
  )
}

export const jumpDemo: AttemptDemo<JumpState> = {
  generateSteps: jumpSteps,
  Visualizer: JumpViz,
}
