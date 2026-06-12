/* Shared constants for topological-sort index.tsx and demos.tsx. */

export type NodeId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'

export const NODES: NodeId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

export const NAME: Record<NodeId, string> = {
  A: 'Intro to CS',
  B: 'Calculus',
  C: 'Data Structures',
  D: 'Discrete Math',
  E: 'Algorithms',
  F: 'Databases',
  G: 'Capstone',
}

/** prerequisite → dependent: an arrow u → v means "u must come before v". */
export const EDGES: { from: NodeId; to: NodeId }[] = [
  { from: 'A', to: 'C' },
  { from: 'A', to: 'D' },
  { from: 'B', to: 'D' },
  { from: 'C', to: 'E' },
  { from: 'C', to: 'F' },
  { from: 'D', to: 'E' },
  { from: 'E', to: 'G' },
  { from: 'F', to: 'G' },
]

/** Fixed left-to-right layered positions for the DAG SVG (viewBox 0 0 570 240). */
export const R = 20
export const POS: Record<NodeId, { x: number; y: number }> = {
  A: { x: 60, y: 70 },
  B: { x: 60, y: 170 },
  C: { x: 210, y: 70 },
  D: { x: 210, y: 170 },
  F: { x: 360, y: 70 },
  E: { x: 360, y: 170 },
  G: { x: 510, y: 120 },
}
