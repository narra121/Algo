import type { AlgorithmModule } from '../core/types'
import { twoPointers } from './two-pointers'
import { slidingWindow } from './sliding-window'
import { binarySearch } from './binary-search'
import { bfs } from './bfs'
import { dfsBacktracking } from './dfs-backtracking'
import { dynamicProgramming } from './dynamic-programming'
import { mergeSort } from './merge-sort'
import { quickSort } from './quick-sort'
import { heap } from './heap'
import { unionFind } from './union-find'
import { dijkstra } from './dijkstra'
import { topologicalSort } from './topological-sort'

export const algorithms: AlgorithmModule[] = [
  twoPointers,
  slidingWindow,
  binarySearch,
  bfs,
  dfsBacktracking,
  dynamicProgramming,
  mergeSort,
  quickSort,
  heap,
  unionFind,
  dijkstra,
  topologicalSort,
]

// Build-time contract checks: every pattern ships ≥10 problems and ≥1 step.
for (const a of algorithms) {
  if (a.problems.length < 10) {
    throw new Error(`AlgoLens: "${a.id}" has only ${a.problems.length} problems (need ≥10)`)
  }
  if (a.generateSteps().length < 1) {
    throw new Error(`AlgoLens: "${a.id}" generated no steps`)
  }
  if (a.journey.length < 2) {
    throw new Error(`AlgoLens: "${a.id}" has only ${a.journey.length} journey attempts (need ≥2)`)
  }
  const lastIdx = a.journey.length - 1
  a.journey.forEach((j, i) => {
    if ((j.verdict === 'optimal') !== (i === lastIdx)) {
      throw new Error(`AlgoLens: "${a.id}" journey must end with exactly one 'optimal' attempt`)
    }
  })

  const checkDemo = (
    owner: string,
    demo: import('../core/types').AttemptDemo | undefined,
    pseudocode: string[],
  ) => {
    if (!demo) throw new Error(`AlgoLens: ${owner} is missing its demo`)
    const steps = demo.generateSteps()
    if (steps.length < 2) throw new Error(`AlgoLens: ${owner} demo has ${steps.length} steps (need ≥2)`)
    steps.forEach((s, i) => {
      if (!s.description.trim()) throw new Error(`AlgoLens: ${owner} demo step ${i} has empty narration`)
      if (s.codeLine < -1 || s.codeLine >= pseudocode.length) {
        throw new Error(
          `AlgoLens: ${owner} demo step ${i} codeLine ${s.codeLine} out of range (pseudocode has ${pseudocode.length} lines)`,
        )
      }
    })
  }
  checkDemo(`"${a.id}" naive`, a.problem.naive.demo, a.problem.naive.pseudocode)
  a.journey.forEach((j, i) => checkDemo(`"${a.id}" journey[${i}]`, j.demo, j.pseudocode))
}
