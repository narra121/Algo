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
}
