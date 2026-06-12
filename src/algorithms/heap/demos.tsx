import type { AttemptDemo, Step, VarEntry } from '../../core/types'
import { Cells, Legend, VizCaption } from '../../components/vizPrimitives'
import { STREAM, K } from './data'

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 1: Naive — re-sort the full history after every arrival
   pseudocode indexes match problem.naive.pseudocode:
     0: 'seen ← empty list'
     1: 'for each x in stream:'
     2: '    append x to seen'
     3: '    sort seen in descending order'
     4: '    answer ← seen[k − 1]'
───────────────────────────────────────────────────────────────────────────── */

interface NaiveState {
  /** Items seen so far, in arrival order (for the stream row). */
  streamSoFar: number[]
  /** The seen list after sorting — what we display. */
  seen: number[]
  /** Current answer (seen[k-1]) or null before first sort. */
  answer: number | null
  /** Running total of values shuffled across all sorts. */
  totalShuffled: number
  /** Phase: 'intro' | 'append' | 'sort' | 'read' | 'done' */
  phase: 'intro' | 'append' | 'sort' | 'read' | 'done'
}

/**
 * Live variables for the naive demo, named as in problem.naive.pseudocode.
 * Same five entries in the same order on every step; `changed` lists the
 * names this specific step assigned/modified.
 */
function naiveVars(
  x: number | null,
  seen: number[],
  answer: number | null,
  totalShuffled: number,
  changed: string[] = [],
): VarEntry[] {
  const entry = (name: string, value: string): VarEntry => ({
    name,
    value,
    ...(changed.includes(name) ? { changed: true } : {}),
  })
  return [
    entry('k', String(K)),
    entry('x', x === null ? '—' : String(x)),
    entry('seen', `[${seen.join(', ')}]`),
    entry('answer', answer === null ? '—' : String(answer)),
    entry('values shuffled', String(totalShuffled)),
  ]
}

function naiveSteps(): Step<NaiveState>[] {
  const steps: Step<NaiveState>[] = []
  const seen: number[] = []
  let totalShuffled = 0
  let answerVar: number | null = null

  // Intro sentinel
  steps.push({
    state: { streamSoFar: [], seen: [], answer: null, totalShuffled: 0, phase: 'intro' },
    description: `Re-sort everything on every arrival. With ${STREAM.length} items arriving one at a time, we pay for sorts over lists of size 1, 2, …, ${STREAM.length} — that is ${STREAM.length * (STREAM.length + 1) / 2} total values shuffled just to read off one number each time. Start: seen list is empty.`,
    codeLine: 0,
    vars: naiveVars(null, [], null, 0, ['k', 'seen']),
  })

  for (let s = 0; s < STREAM.length; s++) {
    const x = STREAM[s]

    // Append step
    seen.push(x)
    steps.push({
      state: { streamSoFar: STREAM.slice(0, s + 1), seen: [...seen], answer: seen.length > K ? seen[K - 1] : null, totalShuffled, phase: 'append' },
      description: `${x} arrives — append it to seen. List is now [${seen.join(', ')}] (${seen.length} item${seen.length === 1 ? '' : 's'}). About to re-sort all ${seen.length} value${seen.length === 1 ? '' : 's'}.`,
      codeLine: 2,
      vars: naiveVars(x, [...seen], answerVar, totalShuffled, ['x', 'seen']),
    })

    // Sort step — linear "values shuffled" proxy: sorting n kept values counts n shuffles
    const sortCost = seen.length
    totalShuffled += sortCost
    seen.sort((a, b) => b - a)
    steps.push({
      state: { streamSoFar: STREAM.slice(0, s + 1), seen: [...seen], answer: seen.length >= K ? seen[K - 1] : null, totalShuffled, phase: 'sort' },
      description: `Sort ${seen.length} value${seen.length === 1 ? '' : 's'} descending → [${seen.join(', ')}]. That is sort #${s + 1} of ${STREAM.length}, shuffling ${sortCost} value${sortCost === 1 ? '' : 's'} (${totalShuffled} total so far). The previous sort's order is thrown away as if it never happened.`,
      codeLine: 3,
      vars: naiveVars(x, [...seen], answerVar, totalShuffled, ['seen', 'values shuffled']),
    })

    // Read answer step — only when we have at least K items
    if (seen.length >= K) {
      const ans = seen[K - 1]
      answerVar = ans
      steps.push({
        state: { streamSoFar: STREAM.slice(0, s + 1), seen: [...seen], answer: ans, totalShuffled, phase: 'read' },
        description: `Read seen[k − 1] = seen[${K - 1}] = ${ans} — that is the ${K}rd largest so far. Correct, but we re-sorted ${seen.length} value${seen.length === 1 ? '' : 's'} to learn one number, and we are keeping all ${seen.length} values in memory even though only the top ${K} can ever matter.`,
        codeLine: 4,
        vars: naiveVars(x, [...seen], answerVar, totalShuffled, ['answer']),
      })
    }
  }

  steps.push({
    state: { streamSoFar: [...STREAM], seen: [...seen], answer: seen[K - 1], totalShuffled, phase: 'done' },
    description: `Stream exhausted. Final answer: ${seen[K - 1]}. Total cost: ${totalShuffled} values shuffled across ${STREAM.length} sorts (lists of size 1 through ${STREAM.length}), all ${STREAM.length} values kept in memory. A min-heap of size ${K} would have used ${K} slots of memory and at most log₂ ${K} ≈ 2 swaps per arrival — with no wasted re-sorting.`,
    codeLine: 4,
    vars: naiveVars(null, [...seen], answerVar, totalShuffled, ['x']),
  })

  return steps
}

function NaiveViz({ step }: { step: Step<NaiveState> }) {
  const { streamSoFar, seen, answer, totalShuffled, phase } = step.state
  const streamLen = streamSoFar.length
  return (
    <>
      <VizCaption>
        k = {K} · answer so far = {answer !== null ? answer : '—'} · total shuffled = {totalShuffled}
      </VizCaption>
      <Cells
        values={STREAM}
        classFor={k =>
          k < streamLen - 1 ? 'dim'
          : k === streamLen - 1 && phase !== 'intro' ? 'active'
          : ''
        }
        pointerFor={k =>
          k === streamLen - 1 && phase !== 'intro' ? { label: 'new', tone: 'mint' } : null
        }
      />
      {seen.length > 0 && (
        <>
          <VizCaption>seen list (sorted descending) — {seen.length} item{seen.length === 1 ? '' : 's'}</VizCaption>
          <Cells
            values={seen}
            classFor={k =>
              phase === 'read' && k === K - 1 ? 'active'
              : k < K ? 'warm'
              : 'dim'
            }
            pointerFor={k =>
              k === K - 1 && phase === 'read' ? { label: `k-1=${K-1}`, tone: 'mint' } : null
            }
          />
        </>
      )}
      <Legend
        items={[
          { tone: 'mint', label: 'latest arrival (pointer)' },
          { tone: 'amber', label: 'top k kept' },
          { tone: 'mint', label: 'answer = seen[k−1]' },
          { label: 'dead weight below k' },
        ]}
      />
    </>
  )
}

export const naiveDemo: AttemptDemo<NaiveState> = { generateSteps: naiveSteps, Visualizer: NaiveViz }

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 2: Sorted history — insert into place instead of re-sorting
   pseudocode indexes match journey[0].pseudocode:
     0: 'seen ← empty list, kept descending'
     1: 'for each x in stream:'
     2: '    binary-search for x's slot'
     3: '    shift the tail right, drop x in'
     4: '    answer ← seen[k − 1]'
───────────────────────────────────────────────────────────────────────────── */

interface SortedHistState {
  streamSoFar: number[]
  /** Sorted descending list so far. */
  list: number[]
  /** Insertion slot found by binary search (-1 = intro). */
  insertSlot: number | null
  /** Number of shifts for the current insertion. */
  shiftsCurrent: number
  /** Running total of shifts across all insertions. */
  shiftsTotal: number
  answer: number | null
  phase: 'intro' | 'search' | 'shift' | 'read' | 'done'
}

/**
 * Live variables for the sorted-history demo, named as in journey[0].pseudocode.
 * Same seven entries in the same order on every step.
 */
function sortedHistVars(
  x: number | null,
  list: number[],
  slot: number | null,
  shifts: number | null,
  shiftsTotal: number,
  answer: number | null,
  changed: string[] = [],
): VarEntry[] {
  const entry = (name: string, value: string): VarEntry => ({
    name,
    value,
    ...(changed.includes(name) ? { changed: true } : {}),
  })
  return [
    entry('k', String(K)),
    entry('x', x === null ? '—' : String(x)),
    entry('seen', `[${list.join(', ')}]`),
    entry('slot', slot === null ? '—' : String(slot)),
    entry('shifts', shifts === null ? '—' : String(shifts)),
    entry('total shifts', String(shiftsTotal)),
    entry('answer', answer === null ? '—' : String(answer)),
  ]
}

function sortedHistSteps(): Step<SortedHistState>[] {
  const steps: Step<SortedHistState>[] = []
  const list: number[] = []
  let shiftsTotal = 0
  let answerVar: number | null = null

  // Intro sentinel
  steps.push({
    state: { streamSoFar: [], list: [], insertSlot: null, shiftsCurrent: 0, shiftsTotal: 0, answer: null, phase: 'intro' },
    description: `Never re-sort: the list is already in descending order after each arrival, so the next newcomer only needs to find its slot and slide in. Binary search finds the slot in O(log n); the shift is the real cost — up to n items shuffled one step each.`,
    codeLine: 0,
    vars: sortedHistVars(null, [], null, null, 0, null, ['k', 'seen']),
  })

  for (let s = 0; s < STREAM.length; s++) {
    const x = STREAM[s]

    // Binary search for insertion slot (descending order: find first index where list[idx] < x)
    let slot = list.length
    let lo = 0
    let hi = list.length - 1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (list[mid] <= x) {
        slot = mid
        hi = mid - 1
      } else {
        lo = mid + 1
      }
    }

    const shiftsCurrent = list.length - slot

    // Binary search step
    steps.push({
      state: { streamSoFar: STREAM.slice(0, s + 1), list: [...list], insertSlot: slot, shiftsCurrent, shiftsTotal, answer: list.length >= K ? list[K - 1] : null, phase: 'search' },
      description: `${x} arrives. Binary-search the sorted list [${list.length > 0 ? list.join(', ') : 'empty'}] for ${x}'s slot → index ${slot}. Making room there means shifting ${shiftsCurrent} item${shiftsCurrent === 1 ? '' : 's'} one place to the right.`,
      codeLine: 2,
      vars: sortedHistVars(x, [...list], slot, shiftsCurrent, shiftsTotal, answerVar, ['x', 'slot', 'shifts']),
    })

    // Perform insertion
    list.splice(slot, 0, x)
    shiftsTotal += shiftsCurrent

    // Shift/insert step
    steps.push({
      state: { streamSoFar: STREAM.slice(0, s + 1), list: [...list], insertSlot: slot, shiftsCurrent, shiftsTotal, answer: list.length >= K ? list[K - 1] : null, phase: 'shift' },
      description: `Shift ${shiftsCurrent} item${shiftsCurrent === 1 ? '' : 's'} right, drop ${x} at index ${slot}. List is now [${list.join(', ')}]. Shifts so far: ${shiftsTotal} total.`,
      codeLine: 3,
      vars: sortedHistVars(
        x, [...list], slot, shiftsCurrent, shiftsTotal, answerVar,
        shiftsCurrent > 0 ? ['seen', 'total shifts'] : ['seen'],
      ),
    })

    if (list.length >= K) {
      answerVar = list[K - 1]
      steps.push({
        state: { streamSoFar: STREAM.slice(0, s + 1), list: [...list], insertSlot: slot, shiftsCurrent, shiftsTotal, answer: list[K - 1], phase: 'read' },
        description: `Read list[k − 1] = list[${K - 1}] = ${list[K - 1]} — that is the ${K}rd largest so far. Notice: we're keeping ${list.length} value${list.length === 1 ? '' : 's'} but only list[${K - 1}] is ever read; every value below slot ${K - 1} is dead weight we keep shifting around.`,
        codeLine: 4,
        vars: sortedHistVars(x, [...list], slot, shiftsCurrent, shiftsTotal, answerVar, ['answer']),
      })
    }
  }

  steps.push({
    state: { streamSoFar: [...STREAM], list: [...list], insertSlot: null, shiftsCurrent: 0, shiftsTotal, answer: list[K - 1], phase: 'done' },
    description: `Stream exhausted. Final answer: ${list[K - 1]}. Total shifts: ${shiftsTotal} (versus ${STREAM.length * (STREAM.length + 1) / 2} for re-sorting). Better — but we maintained [${list.slice(K).join(', ')}] below the top ${K}: ${list.length - K} dead values kept perfectly ordered just in case, and the list still grows without bound.`,
    codeLine: 4,
    vars: sortedHistVars(null, [...list], null, null, shiftsTotal, answerVar, ['x']),
  })

  return steps
}

function SortedHistViz({ step }: { step: Step<SortedHistState> }) {
  const { streamSoFar, list, insertSlot, shiftsTotal, answer, phase } = step.state
  const streamLen = streamSoFar.length
  return (
    <>
      <VizCaption>
        k = {K} · answer = {answer !== null ? answer : '—'} · total shifts = {shiftsTotal}
      </VizCaption>
      <Cells
        values={STREAM}
        classFor={k =>
          k < streamLen - 1 ? 'dim'
          : k === streamLen - 1 && phase !== 'intro' ? 'active'
          : ''
        }
        pointerFor={k =>
          k === streamLen - 1 && phase !== 'intro' ? { label: 'new', tone: 'mint' } : null
        }
      />
      {list.length > 0 && (
        <>
          <VizCaption>sorted history — {list.length} item{list.length === 1 ? '' : 's'} kept</VizCaption>
          <Cells
            values={list}
            classFor={k =>
              phase === 'shift' && k === insertSlot ? 'active'
              : k < K ? 'warm'
              : 'dim'
            }
            pointerFor={k => {
              if (phase === 'shift' && k === insertSlot) return { label: 'inserted', tone: 'mint' }
              if (k === K - 1 && phase === 'read') return { label: 'answer', tone: 'sky' }
              return null
            }}
          />
        </>
      )}
      <Legend
        items={[
          { tone: 'mint', label: 'latest arrival (pointer)' },
          { tone: 'amber', label: 'top k (useful)' },
          { tone: 'mint', label: 'just inserted' },
          { tone: 'sky', label: 'answer = list[k−1]' },
          { label: 'dead weight below k' },
        ]}
      />
    </>
  )
}

export const sortedHistoryDemo: AttemptDemo<SortedHistState> = { generateSteps: sortedHistSteps, Visualizer: SortedHistViz }

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 3: Top-K row — keep only the k largest, sorted
   pseudocode indexes match journey[1].pseudocode:
     0: 'top ← sorted row of k = 3, descending'
     1: 'for each x in stream:'
     2: '    if x ≤ top[k − 1]: reject x'
     3: '    else: drop top[k − 1],'
     4: '          slide x into its slot'
     5: '    answer ← top[k − 1]'
───────────────────────────────────────────────────────────────────────────── */

interface TopKRowState {
  streamSoFar: number[]
  /** Current top-k row, descending, max K items. */
  top: number[]
  /** Was the current item rejected? */
  rejected: boolean
  /** Slot where item was inserted (null if rejected or not yet known). */
  insertSlot: number | null
  /** Number of shifts for this insertion. */
  shiftsCurrent: number
  /** Total shifts across all insertions. */
  shiftsTotal: number
  /** Total rejections. */
  rejections: number
  answer: number | null
  phase: 'intro' | 'compare' | 'reject' | 'insert' | 'read' | 'done'
}

/**
 * Live variables for the top-k-row demo, named as in journey[1].pseudocode.
 * Same seven entries in the same order on every step.
 */
function topKRowVars(
  x: number | null,
  top: number[],
  shiftsTotal: number,
  rejections: number,
  answer: number | null,
  changed: string[] = [],
): VarEntry[] {
  const entry = (name: string, value: string): VarEntry => ({
    name,
    value,
    ...(changed.includes(name) ? { changed: true } : {}),
  })
  return [
    entry('k', String(K)),
    entry('x', x === null ? '—' : String(x)),
    entry('top', `[${top.join(', ')}]`),
    entry('top[k−1]', top.length >= K ? String(top[K - 1]) : '—'),
    entry('total shifts', String(shiftsTotal)),
    entry('rejections', String(rejections)),
    entry('answer', answer === null ? '—' : String(answer)),
  ]
}

function topKRowSteps(): Step<TopKRowState>[] {
  const steps: Step<TopKRowState>[] = []
  const top: number[] = []
  let shiftsTotal = 0
  let rejections = 0
  let answerVar: number | null = null

  // Intro sentinel
  steps.push({
    state: { streamSoFar: [], top: [], rejected: false, insertSlot: null, shiftsCurrent: 0, shiftsTotal: 0, rejections: 0, answer: null, phase: 'intro' },
    description: `Cap memory at ${K} slots: keep only the top ${K} largest values in descending order. Each new arrival either beats the weakest of the ${K} and slides in, or is rejected outright. This bounds memory but still maintains full sort order — watch what that costs.`,
    codeLine: 0,
    vars: topKRowVars(null, [], 0, 0, null, ['k', 'top']),
  })

  for (let s = 0; s < STREAM.length; s++) {
    const x = STREAM[s]
    const threshold = top.length >= K ? top[K - 1] : null

    // Compare step
    if (threshold !== null) {
      steps.push({
        state: { streamSoFar: STREAM.slice(0, s + 1), top: [...top], rejected: false, insertSlot: null, shiftsCurrent: 0, shiftsTotal, rejections, answer: top.length >= K ? top[K - 1] : null, phase: 'compare' },
        description: `${x} arrives. The row is full: [${top.join(', ')}]. Compare ${x} against weakest = top[${K - 1}] = ${threshold}.`,
        codeLine: top.length >= K ? 2 : 1,
        vars: topKRowVars(x, [...top], shiftsTotal, rejections, answerVar, ['x']),
      })
    }

    if (top.length >= K && x <= top[K - 1]) {
      // Reject
      rejections++
      steps.push({
        state: { streamSoFar: STREAM.slice(0, s + 1), top: [...top], rejected: true, insertSlot: null, shiftsCurrent: 0, shiftsTotal, rejections, answer: top[K - 1], phase: 'reject' },
        description: `${x} ≤ ${threshold} — rejected in one comparison. ${x} cannot displace any of the current top ${K}. The row stays [${top.join(', ')}]. ${rejections} rejection${rejections === 1 ? '' : 's'} so far.`,
        codeLine: 2,
        vars: topKRowVars(x, [...top], shiftsTotal, rejections, answerVar, ['rejections']),
      })
    } else {
      // Evict weakest if full, then insert into sorted position
      const wasFull = top.length >= K
      const prevThreshold = wasFull ? top[K - 1] : null
      if (wasFull) {
        top.pop() // remove weakest
      }

      // Find insertion slot (descending)
      let slot = top.length
      for (let i = 0; i < top.length; i++) {
        if (top[i] < x) { slot = i; break }
      }
      const shiftsCurrent = top.length - slot
      top.splice(slot, 0, x)
      shiftsTotal += shiftsCurrent

      const newThreshold = top.length >= K ? top[K - 1] : null
      const insertChanged = ['top']
      if (threshold === null) insertChanged.unshift('x') // no compare step preceded this insert
      if (newThreshold !== prevThreshold) insertChanged.push('top[k−1]')
      if (shiftsCurrent > 0) insertChanged.push('total shifts')

      steps.push({
        state: { streamSoFar: STREAM.slice(0, s + 1), top: [...top], rejected: false, insertSlot: slot, shiftsCurrent, shiftsTotal, rejections, answer: top.length >= K ? top[K - 1] : null, phase: 'insert' },
        description: !wasFull
          ? `${x} arrives — row has ${top.length - 1} of ${K} slots filled; ${x} slides into slot ${slot}. Row: [${top.join(', ')}]. ${shiftsCurrent} shift${shiftsCurrent === 1 ? '' : 's'} (${shiftsTotal} total).`
          : `${x} > ${prevThreshold} — evict the weakest (${prevThreshold}), slide ${x} into slot ${slot} with ${shiftsCurrent} shift${shiftsCurrent === 1 ? '' : 's'}. Row: [${top.join(', ')}]. Total shifts: ${shiftsTotal}.`,
        codeLine: 4,
        vars: topKRowVars(x, [...top], shiftsTotal, rejections, answerVar, insertChanged),
      })

      if (top.length >= K) {
        answerVar = top[K - 1]
        steps.push({
          state: { streamSoFar: STREAM.slice(0, s + 1), top: [...top], rejected: false, insertSlot: slot, shiftsCurrent, shiftsTotal, rejections, answer: top[K - 1], phase: 'read' },
          description: `Answer: top[${K - 1}] = ${top[K - 1]}. The row [${top.join(', ')}] is kept in full sorted order, but only the weakest slot at index ${K - 1} is ever read — the ordering of [${top.slice(0, K - 1).join(', ')}] above it is never consulted. Pure overhead when k grows large.`,
          codeLine: 5,
          vars: topKRowVars(x, [...top], shiftsTotal, rejections, answerVar, ['answer']),
        })
      }
    }
  }

  steps.push({
    state: { streamSoFar: [...STREAM], top: [...top], rejected: false, insertSlot: null, shiftsCurrent: 0, shiftsTotal, rejections, answer: top[K - 1], phase: 'done' },
    description: `Stream exhausted. Final answer: ${top[K - 1]} (top row: [${top.join(', ')}]). ${rejections} item${rejections === 1 ? '' : 's'} rejected outright; ${shiftsTotal} total shifts to maintain full order in a row nobody reads top-to-bottom. A min-heap gives the same answer with at most log₂ ${K} ≈ 2 swaps per arrival — never maintaining order that is not asked about.`,
    codeLine: 5,
    vars: topKRowVars(null, [...top], shiftsTotal, rejections, answerVar, ['x']),
  })

  return steps
}

function TopKRowViz({ step }: { step: Step<TopKRowState> }) {
  const { streamSoFar, top, rejected, insertSlot, shiftsTotal, rejections, answer, phase } = step.state
  const streamLen = streamSoFar.length
  const currentVal = streamLen > 0 ? STREAM[streamLen - 1] : null
  return (
    <>
      <VizCaption>
        k = {K} · answer = {answer !== null ? answer : '—'} · shifts = {shiftsTotal} · rejections = {rejections}
      </VizCaption>
      <Cells
        values={STREAM}
        classFor={k =>
          k < streamLen - 1 ? 'dim'
          : k === streamLen - 1 && phase !== 'intro' ? (rejected ? 'bad' : 'active')
          : ''
        }
        pointerFor={k =>
          k === streamLen - 1 && phase !== 'intro'
            ? { label: rejected ? 'REJECTED' : 'new', tone: rejected ? 'rose' : 'mint' }
            : null
        }
      />
      {top.length > 0 && (
        <>
          <VizCaption>top-{K} row (descending) — {top.length} / {K} slots</VizCaption>
          <Cells
            values={top}
            classFor={k =>
              phase === 'insert' && k === insertSlot ? 'active'
              : k === K - 1 ? 'warm'
              : k < K - 1 ? ''
              : 'dim'
            }
            pointerFor={k => {
              if (phase === 'insert' && k === insertSlot && currentVal !== null) return { label: String(currentVal), tone: 'mint' }
              if (k === K - 1 && (phase === 'read' || phase === 'done')) return { label: 'answer', tone: 'sky' }
              return null
            }}
          />
        </>
      )}
      <Legend
        items={[
          { tone: 'mint', label: 'latest arrival (pointer)' },
          { tone: 'rose', label: 'rejected (below threshold)' },
          { tone: 'mint', label: 'just inserted' },
          { tone: 'amber', label: 'threshold = top[k−1]' },
          { tone: 'sky', label: 'answer = top[k−1]' },
        ]}
      />
    </>
  )
}

export const topKRowDemo: AttemptDemo<TopKRowState> = { generateSteps: topKRowSteps, Visualizer: TopKRowViz }

/* ─────────────────────────────────────────────────────────────────────────────
   Demo 4: Optimal — min-heap of size k
   Re-uses generateSteps / Visualizer from index.tsx IS NOT allowed (no import
   of ./index). The heap optimal demo is wired directly in index.tsx as:
     demo: { generateSteps, Visualizer }
   (the main module's own functions). This file exports only the three
   sub-optimal demos above.
───────────────────────────────────────────────────────────────────────────── */
