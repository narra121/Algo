/* Canonical graph shared by the main visualizer and all demos. */

export const NODES = ['A', 'B', 'C', 'D', 'E', 'F'] as const
export type NodeId = (typeof NODES)[number]

export const SOURCE: NodeId = 'A'

/** Fixed SVG layout (viewBox 0 0 460 260). */
export const POS: Record<NodeId, { x: number; y: number }> = {
  A: { x: 40,  y: 130 },
  B: { x: 160, y: 50  },
  C: { x: 160, y: 210 },
  D: { x: 300, y: 50  },
  E: { x: 300, y: 210 },
  F: { x: 420, y: 130 },
}

/** Undirected weighted edges [u, v, w]. */
export const EDGES: ReadonlyArray<readonly [NodeId, NodeId, number]> = [
  ['A', 'B', 4],
  ['A', 'C', 2],
  ['B', 'C', 1],
  ['B', 'D', 5],
  ['C', 'D', 8],
  ['C', 'E', 5],
  ['D', 'E', 2],
  ['D', 'F', 6],
  ['E', 'F', 3],
]

export function neighborsOf(u: NodeId): Array<{ v: NodeId; w: number }> {
  const out: Array<{ v: NodeId; w: number }> = []
  for (const [a, b, w] of EDGES) {
    if (a === u) out.push({ v: b, w })
    else if (b === u) out.push({ v: a, w })
  }
  return out
}
