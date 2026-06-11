# AlgoLens — "The Road to the Insight" (Approach Journey)

**Date:** 2026-06-11
**Status:** Approved (guided reveal stepper, text + concrete numbers)

## Problem

Each AlgoLens page currently jumps from "② brute force hurts" straight to "③ the aha
moment". A student reading it sees *that* the optimal solution exists, but not *how
anyone would ever invent it*. Real problem-solving is a sequence of tempting wrong
turns, each of which fails in an instructive way. The page should walk that path.

## Goal

Between the brute-force section and the aha banner, show a chain of attempts:

> brute force → plausible idea #2 (flawed) → plausible idea #3 (better, still flawed)
> → … → optimal

Each attempt is something a real student would genuinely try. Each one's flaw is
demonstrated on the page's own concrete input. Each one salvages exactly one insight
that the next attempt is built on, so the chain reads as a derivation that lands on
the existing aha banner.

## Interaction model — guided reveal stepper

- Node 0 = the brute force, auto-derived from the existing `problem.naive` data.
  Rendered already-revealed (the student just read section ②).
- The current attempt shows: title, **spark** (the natural thought that leads here),
  pseudocode, complexity chips. Below it, a prompt: *"🤔 will this work? — reveal
  where it breaks"*.
- Clicking reveals **breaks** (the flaw, with real numbers) and **insight** (the
  lesson carried forward), then unlocks the next attempt.
- Locked attempts render as "Attempt N — ???".
- The final attempt has `verdict: 'optimal'`; its reveal confirms success and hands
  off visually to the aha banner directly below.
- State is per-page-visit React state (no persistence — YAGNI).

## Data contract

`src/core/types.ts`:

```ts
export interface JourneyAttempt {
  /** Short name of the idea, e.g. "Sort, then binary-search each complement". */
  title: string
  /** The natural thought process that gets a student to this idea. 1–2 sentences. */
  spark: string
  /** 3–7 lines of pseudocode. */
  pseudocode: string[]
  time: string
  space: string
  /** fail = incorrect; partial = correct but suboptimal; optimal = the answer. */
  verdict: 'fail' | 'partial' | 'optimal'
  /**
   * Where it goes wrong, demonstrated with THIS page's concrete input values and
   * real operation counts. For 'fail': a concrete counterexample. For 'partial':
   * a concrete cost comparison. For 'optimal': why nothing is wasted. Hidden
   * until the student reveals it.
   */
  breaks: string
  /** The one salvaged lesson the NEXT attempt is built on (or, for the optimal
   *  attempt, the bridge sentence into the aha banner). */
  insight: string
}
```

`AlgorithmModule` gains `journey: JourneyAttempt[]` (required; 2–4 entries).

## Components

- **`src/components/JourneyPanel.tsx`** (new): the stepper. Props:
  `{ naive: NaiveApproach, journey: JourneyAttempt[] }`. Internal state:
  `revealed: number` (count of attempts whose flaw has been revealed).
- **`AlgorithmPage.tsx`**: insert `<JourneyPanel/>` as section
  "③ The road to the insight" between the naive card and the aha banner.
  Renumber: aha → ④, watch → ⑤.
- **`styles.css`**: stepper rail, node states (complete / current / locked),
  verdict accents reusing existing chip colors (bad / warm / time).

## Guardrails

`registry.ts` build-time contract: every algorithm has `journey.length >= 2`,
last entry `verdict === 'optimal'`, and no non-last entry is `'optimal'`.

## Content quality bar (goes verbatim into authoring-agent prompts)

1. Attempts are **genuinely tempting** — what real students try (sort it, hash it,
   greedy, recurse, precompute, BFS instead of DFS…), never strawmen.
2. Flaws use the page's **actual input values** and real counts ("28 pair-checks
   for 8 elements"), not abstract big-O alone.
3. The **insight chain is load-bearing**: attempt N+1 must visibly use attempt N's
   insight; the last insight must read as the setup line for the page's `aha`.
4. `fail` ⇒ concrete counterexample. `partial` ⇒ concrete cost comparison against
   the optimal.
5. Tone matches the existing pages: direct, concrete, no fluff.

## Rollout

1. **Pilot (main session):** types + JourneyPanel + page integration + CSS +
   hand-written two-pointers journey. Validates the design end-to-end.
2. **Fan-out:** one subagent per remaining algorithm (11 total, parallel — each
   edits only its own `src/algorithms/<id>/index.tsx`, so no conflicts). Each agent
   first reasons about the plausible wrong turns *for its specific algorithm and
   worked example*, then authors and implements the `journey` array.
3. **Verify:** `tsc --noEmit` / `vite build` + registry contract + content spot
   review of every journey chain.
