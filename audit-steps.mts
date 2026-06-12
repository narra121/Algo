import { algorithms } from './src/algorithms/registry'
import type { Step } from './src/core/types'

const TRUNC = /(…and so on|and so on —|skipping (the|subsets)|skip the remaining|silently|follow the same pattern|continue the same pattern)/i

let failures = 0
let generators = 0
let totalSteps = 0

function audit(owner: string, steps: Step[]) {
  generators++
  totalSteps += steps.length
  const varSets = new Set<string>()
  steps.forEach((s, i) => {
    if (!s.vars?.length) {
      console.log(`FAIL ${owner} step ${i}: no vars`)
      failures++
      return
    }
    varSets.add(s.vars.map(v => v.name).join('|'))
    if (TRUNC.test(s.description)) {
      console.log(`FAIL ${owner} step ${i}: truncation phrase -> ${s.description.slice(0, 100)}`)
      failures++
    }
  })
  if (varSets.size > 1) {
    console.log(`WARN ${owner}: ${varSets.size} distinct var-name sets (panel may jump)`)
  }
  console.log(`ok   ${owner}: ${steps.length} steps, vars on all`)
}

for (const a of algorithms) {
  audit(`${a.id} / main`, a.generateSteps())
  if (a.problem.naive.demo) audit(`${a.id} / naive`, a.problem.naive.demo.generateSteps())
  a.journey.forEach((j, i) => {
    if (j.demo) audit(`${a.id} / journey[${i}] ${j.title.slice(0, 30)}`, j.demo.generateSteps())
  })
}

console.log(`\n${generators} generators, ${totalSteps} total steps, ${failures} failures`)
if (failures > 0) process.exit(1)
