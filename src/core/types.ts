import type { ComponentType } from 'react'

/** One immutable snapshot of an algorithm's execution. */
export interface Step<S = unknown> {
  /** Full state snapshot rendered by the algorithm's Visualizer. */
  state: S
  /** Plain-language narration of what just happened / is about to happen. */
  description: string
  /** Index into `pseudocode` to highlight, or -1 for none. */
  codeLine: number
}

export interface Problem {
  title: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  /** One line: how this pattern applies to the problem. */
  hint: string
  /** LeetCode problem number, when applicable. */
  leetcodeId?: number
}

export interface Complexity {
  time: string
  space: string
  /** Short justification of the bounds, written for intuition. */
  explanation: string
}

/** The concrete problem the animated example is solving — shown BEFORE the visualization. */
export interface ProblemSetup {
  /** Famous name of the worked example, e.g. "Two Sum II — find a pair with a given sum". */
  title: string
  /** The exact question being answered, using the same concrete data the animation uses. */
  statement: string
  /** What we are given, with the real values. */
  input: string
  /** What we must produce, with the real answer when known. */
  output: string
  /** The obvious brute-force approach and its cost, with real numbers for THIS input. */
  naive: string
}

export interface AlgorithmModule<S = any> {
  /** URL-safe id, matches the folder name, e.g. "two-pointers". */
  id: string
  name: string
  /** One-line hook shown on cards and the page header. */
  tagline: string
  /** Grouping label, e.g. "Arrays & Strings", "Graphs", "Sorting". */
  category: string
  /** Single emoji used as the card glyph. */
  icon: string
  /** The concrete worked problem — what the animation is actually solving. */
  problem: ProblemSetup
  /**
   * THE one-sentence insight that makes the solution click — the "ahh, so THAT's
   * why this works" moment. Displayed large before the animation.
   */
  aha: string
  /** Intuition paragraphs. First paragraph should be a real-world analogy. */
  intuition: string[]
  pseudocode: string[]
  complexity: Complexity
  /** Pure function producing the full deterministic step list. */
  generateSteps: () => Step<S>[]
  /** Renders one step's state. Pure w.r.t. props. */
  Visualizer: ComponentType<{ step: Step<S> }>
  /** At least 10 famous problems. */
  problems: Problem[]
}
