export interface TrialResult {
  correct: boolean
  reactionTimeMs: number | null
}

export interface SetScore {
  accuracy: number      // 0-100
  avgReactionMs: number // average RT for correct trials
  score: number         // 0-1000 composite
  trials: number
  correct: number
}

export function calcSetScore(trials: TrialResult[], difficulty: number): SetScore {
  const total = trials.length
  if (total === 0) return { accuracy: 0, avgReactionMs: 0, score: 0, trials: 0, correct: 0 }

  const correctTrials = trials.filter(t => t.correct)
  const accuracy = Math.round((correctTrials.length / total) * 100)

  const rts = correctTrials
    .map(t => t.reactionTimeMs)
    .filter((rt): rt is number => rt !== null)

  const avgReactionMs = rts.length > 0
    ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length)
    : 1500

  // Speed score: 1500ms = 0, 200ms = 100 (capped)
  const speedScore = Math.max(0, Math.min(100, Math.round((1 - (avgReactionMs - 200) / 1300) * 100)))

  // Composite: accuracy matters more than speed
  const raw = accuracy * 0.65 + speedScore * 0.35

  // Difficulty multiplier: harder difficulty = higher ceiling
  const diffBonus = 1 + (difficulty - 1) * 0.05
  const score = Math.min(1000, Math.round(raw * 10 * diffBonus))

  return { accuracy, avgReactionMs, score, trials: total, correct: correctTrials.length }
}

export function calcSessionScore(set1: SetScore, set2: SetScore, set3: SetScore): number {
  // Finisher (set3) counts double - max effort set
  const weighted = (set1.score + set2.score + set3.score * 2) / 4
  return Math.round(weighted)
}

export const KOVA_CUES = {
  warmup: [
    "Lock in. Seven minutes. No distractions.",
    "You're about to play your hardest round.",
    "Performance starts with presence. Let's go.",
  ],
  setStart: {
    FOCUS: [
      "Stay locked to the target. Don't anticipate - react.",
      "Your job is attention. Nothing else matters right now.",
      "Peripheral vision off. Lock on.",
    ],
    SPEED: [
      "Faster. Don't think - fire.",
      "Reaction is the whole game here.",
      "Every millisecond counts.",
    ],
    MEMORY: [
      "Encode deliberately. Recall confidently.",
      "See it once. Own it.",
      "Hold it, then land it.",
    ],
    LOGIC: [
      "Patterns everywhere. Find them.",
      "Slow is smooth. Smooth is fast.",
      "Reason clearly under pressure.",
    ],
    WORDS: [
      "Language is precision. Be precise.",
      "Fluency under pressure - that's the skill.",
      "Read fast. Pick fast.",
    ],
    CONTROL: [
      "Inhibit the impulse. Choose the response.",
      "Control is strength. Demonstrate it.",
      "Pause. Then act. That's the technique.",
    ],
  },
  rest: [
    "Solid. Breathe out. Reset.",
    "You dropped on reps 7–9 - next set: maximum effort.",
    "Nice consistency so far. One more set.",
    "Consistency builds the score. Stay consistent.",
  ],
  complete: [
    "Session done. That's one more rep your competition didn't do.",
    "Seven minutes. Done. Come back tomorrow.",
    "Session's in. See you tomorrow.",
  ],
  personalRecord: [
    "Personal record. Nicely played.",
    "New benchmark. This is your floor now.",
    "You just raised the bar. Literally.",
  ],
}

export function getRandomCue(cues: string[]): string {
  return cues[Math.floor(Math.random() * cues.length)]
}
