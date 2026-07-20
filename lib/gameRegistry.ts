import { ComponentType } from 'react'
import { TrialResult } from '@/lib/scoring'
import LockOnGame from '@/components/games/LockOnGame'
import OddOneGame from '@/components/games/OddOneGame'
import FlashGame from '@/components/games/FlashGame'
import ChoiceGame from '@/components/games/ChoiceGame'
import InhibitGame from '@/components/games/InhibitGame'
import StroopGame from '@/components/games/StroopGame'
import NBackGame from '@/components/games/NBackGame'
import SequenceGame from '@/components/games/SequenceGame'
import MatrixGame from '@/components/games/MatrixGame'
import NumberSeqGame from '@/components/games/NumberSeqGame'
import WordGame from '@/components/games/WordGame'
import WordsOddGame from '@/components/games/WordsOddGame'

// Shared prop shape every game component implements.
export interface GameProps {
  difficulty: number
  durationSecs: number
  muscleColor: string
  onComplete: (results: TrialResult[]) => void
  coachCue: string
  setNumber: number
}

// Each muscle can hold multiple game variants. Adding a new game is now
// just importing it and pushing it onto its muscle's array.
export const MUSCLE_GAMES: Record<string, ComponentType<GameProps>[]> = {
  FOCUS: [LockOnGame, OddOneGame],
  SPEED: [FlashGame, ChoiceGame],
  MEMORY: [NBackGame, SequenceGame],
  LOGIC: [MatrixGame, NumberSeqGame],
  WORDS: [WordGame, WordsOddGame],
  CONTROL: [InhibitGame, StroopGame],
}

// Rotate variants across sessions and sets so daily training doesn't
// repeat the same game. Deterministic within a set for stability.
export function pickGame(
  muscle: string,
  sessionCount: number,
  setNumber: number
): ComponentType<GameProps> {
  const variants = MUSCLE_GAMES[muscle] ?? MUSCLE_GAMES.FOCUS
  const idx = Math.abs(sessionCount + setNumber) % variants.length
  return variants[idx]
}
