/* The one concrete input every animation and demo on this page solves.
   8 nodes (0–7); unions arrive in this order:
   (0,1) (2,3) (4,5) (6,7) (1,3) (5,7) (3,7).
   The query "are 0 and 4 connected?" is asked after the 6th union (before (3,7)). */

export const N = 8

export const UNIONS: [number, number][] = [
  [0, 1],
  [2, 3],
  [4, 5],
  [6, 7],
  [1, 3],
  [5, 7],
  [3, 7],
]

/** The connectivity query issued after the 6th union (before union(3,7)). */
export const QUERY: [number, number] = [0, 4]
