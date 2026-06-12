/* Shared constants for index.tsx and demos.tsx — the one concrete maze every
   animation and demo on this page solves. */

export const ROWS = 6
export const COLS = 8

/** '#' = wall, 'S' = start, 'T' = target, '.' = open floor. */
export const MAZE: string[] = [
  'S..#....',
  '.#.#.##.',
  '.#......',
  '.####.#.',
  '....#.#.',
  '..#...#T',
]

export const START = 0            // idx(0,0)
export const TARGET = 5 * COLS + 7  // idx(5,7)

export const isWall = (r: number, c: number): boolean => MAZE[r][c] === '#'
export const idx = (r: number, c: number): number => r * COLS + c
