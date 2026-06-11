# AlgoLens — See Algorithms Think

An interactive TypeScript + React app for building **intuition** about the 12 essential
DSA algorithm patterns behind the most famous interview problems.

For every pattern:

- 🎬 **Step-by-step animated visualization** of a canonical example — play, pause, step,
  scrub, and change speed, with each step narrated in plain English.
- 📜 **Pseudocode** with the currently-executing line highlighted in sync.
- 💡 **Intuition**: a real-world analogy, the key invariant, and when to reach for the pattern.
- ⏱️ **Time & space complexity** with a why-it-holds explanation.
- 🏆 **10+ famous problems** (LeetCode classics) with how-the-pattern-applies hints —
  130+ problems in total.

## Patterns

Two Pointers · Sliding Window · Binary Search · BFS · DFS & Backtracking ·
Dynamic Programming · Merge Sort · Quick Sort · Heap/Priority Queue · Union-Find ·
Dijkstra · Topological Sort

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

## Architecture

Each algorithm is a self-contained module in `src/algorithms/<id>/` exporting an
`AlgorithmModule` (see `src/core/types.ts`): a pure `generateSteps()` producing immutable
state snapshots, a `Visualizer` that renders one snapshot, intuition/complexity copy, and
the problem list. A shared step player (`src/core/useStepPlayer.ts`) drives every
visualization. New patterns are added by dropping in a module and registering it in
`src/algorithms/registry.ts`, which also enforces the ≥10-problems contract at load time.

`verify_app.py` is a Playwright smoke test that walks every page through every step and
fails on any console/page error.
