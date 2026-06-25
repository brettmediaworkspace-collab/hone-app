'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Warmup from '@/components/session/Warmup'
import RestScreen from '@/components/session/RestScreen'
import SessionComplete from '@/components/session/SessionComplete'
import LockOnGame from '@/components/games/LockOnGame'
import FlashGame from '@/components/games/FlashGame'
import InhibitGame from '@/components/games/InhibitGame'
import NBackGame from '@/components/games/NBackGame'
import MatrixGame from '@/components/games/MatrixGame'
import WordGame from '@/components/games/WordGame'
import {
  loadState,
  saveSessionResult,
  getGoalSplit,
  getMuscleColor,
} from '@/lib/gameState'
import {
  calcSetScore,
  calcSessionScore,
  SetScore,
  TrialResult,
  KOVA_CUES,
  getRandomCue,
} from '@/lib/scoring'
import { getSubscription, isFreeMuscle, markSessionStarted, FREE_MUSCLES } from '@/lib/subscription'
import PaywallScreen from '@/components/PaywallScreen'

type Phase =
  | 'warmup'
  | 'set1'
  | 'rest1'
  | 'set2'
  | 'rest2'
  | 'set3'
  | 'cooldown'
  | 'complete'

const DEFAULT_SET_SCORE: SetScore = {
  accuracy: 0,
  avgReactionMs: 0,
  score: 0,
  trials: 0,
  correct: 0,
}

export default function SessionPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('warmup')
  const [split, setSplit] = useState<string[]>(['FOCUS', 'FOCUS', 'FOCUS'])
  const [difficulty, setDifficulty] = useState(3)
  const [set1Score, setSet1Score] = useState<SetScore>(DEFAULT_SET_SCORE)
  const [set2Score, setSet2Score] = useState<SetScore>(DEFAULT_SET_SCORE)
  const [set3Score, setSet3Score] = useState<SetScore>(DEFAULT_SET_SCORE)
  const [finalState, setFinalState] = useState<ReturnType<typeof saveSessionResult> | null>(null)
  const [prevHonesScore, setPrevHonesScore] = useState(0)
  const [paywallMuscle, setPaywallMuscle] = useState<string | null>(null)
  const [isPro, setIsPro] = useState(false)

  useEffect(() => {
    const state = loadState()
    setPrevHonesScore(state.honesScore)

    const sub = getSubscription()
    setIsPro(sub.isPro)

    const goal = state.profile?.goal ?? 'Sharp Mind'
    const goalSplit = getGoalSplit(goal)

    // For free users: replace locked muscles with free alternatives
    const effectiveSplit = sub.isPro
      ? goalSplit
      : goalSplit.map(m => isFreeMuscle(m) ? m : FREE_MUSCLES[Math.floor(Math.random() * FREE_MUSCLES.length)])
    setSplit(effectiveSplit)

    // Difficulty: cap at 3 for free users
    const sessionCount = state.profile?.sessionCount ?? 0
    const rawDiff = Math.min(12, Math.max(1, Math.floor(sessionCount / 3) + 2))
    setDifficulty(sub.isPro ? rawDiff : Math.min(3, rawDiff))

    markSessionStarted()
  }, [])

  const handleSet1Complete = useCallback(
    (results: TrialResult[]) => {
      const score = calcSetScore(results, difficulty)
      setSet1Score(score)
      setPhase('rest1')
    },
    [difficulty]
  )

  const handleSet2Complete = useCallback(
    (results: TrialResult[]) => {
      const score = calcSetScore(results, difficulty + 1)
      setSet2Score(score)
      setPhase('rest2')
    },
    [difficulty]
  )

  const handleSet3Complete = useCallback(
    (results: TrialResult[]) => {
      const score = calcSetScore(results, difficulty + 2)
      setSet3Score(score)
      setPhase('cooldown')
    },
    [difficulty]
  )

  const handleCooldown = useCallback(() => {
    setPhase('complete')
    // Wait for set3Score state to propagate — use a slight delay
    setTimeout(() => {
      setFinalState(prev => {
        if (prev) return prev
        // Calculate in the timeout to get latest scores
        return null
      })
    }, 50)
  }, [])

  // Persist session when we hit complete
  useEffect(() => {
    if (phase !== 'complete') return

    const sessionScore = calcSessionScore(set1Score, set2Score, set3Score)
    const muscleGroup = split[0]
    const state = loadState()
    const prevBest = state.bestScores[muscleGroup as keyof typeof state.bestScores] ?? 0
    const isPersonalRecord = sessionScore > prevBest

    const result = saveSessionResult({
      date: new Date().toISOString(),
      muscleGroup,
      set1Score: set1Score.score,
      set2Score: set2Score.score,
      set3Score: set3Score.score,
      sessionScore,
      honesScore: state.honesScore,
      isPersonalRecord,
    })

    setFinalState(result)
  }, [phase, set1Score, set2Score, set3Score, split])

  const handleEndSession = () => {
    if (confirm('End session? Progress will be lost.')) {
      router.push('/')
    }
  }

  const muscleGroup = split[0]
  const muscleColor = getMuscleColor(muscleGroup)

  // Paywall overlay — shown when a free user hits a locked muscle mid-session
  if (paywallMuscle) {
    return (
      <PaywallScreen
        trigger="muscle"
        muscleGroup={paywallMuscle}
        onClose={() => router.replace('/')}
      />
    )
  }

  return (
    <div className="h-screen flex flex-col bg-hone-bg overflow-hidden">
      {/* End session button — only during active sets */}
      {['set1', 'set2', 'set3'].includes(phase) && (
        <div className="absolute top-4 left-4 z-40">
          <button
            onClick={handleEndSession}
            className="text-hone-muted text-xs font-mono uppercase tracking-widest px-3 py-1.5 rounded-lg border border-hone-border bg-hone-card"
          >
            ✕ END
          </button>
        </div>
      )}

      {phase === 'warmup' && (
        <Warmup split={split} onComplete={() => setPhase('set1')} />
      )}

      {phase === 'set1' && (
        <GameRenderer
          muscle={split[0]}
          difficulty={difficulty}
          setNumber={1}
          onComplete={handleSet1Complete}
        />
      )}

      {phase === 'rest1' && (
        <RestScreen
          setNumber={1}
          setScore={set1Score}
          nextMuscle={split[1] ?? split[0]}
          onComplete={() => setPhase('set2')}
          onSkip={() => setPhase('set2')}
          restSeconds={30}
        />
      )}

      {phase === 'set2' && (
        <GameRenderer
          muscle={split[1] ?? split[0]}
          difficulty={difficulty + 1}
          setNumber={2}
          onComplete={handleSet2Complete}
        />
      )}

      {phase === 'rest2' && (
        <RestScreen
          setNumber={2}
          setScore={set2Score}
          nextMuscle={split[2] ?? split[0]}
          onComplete={() => setPhase('set3')}
          onSkip={() => setPhase('set3')}
          restSeconds={30}
        />
      )}

      {phase === 'set3' && (
        <GameRenderer
          muscle={split[2] ?? split[0]}
          difficulty={difficulty + 2}
          setNumber={3}
          onComplete={handleSet3Complete}
        />
      )}

      {phase === 'cooldown' && (
        <CooldownScreen
          muscleGroup={muscleGroup}
          muscleColor={muscleColor}
          onComplete={handleCooldown}
        />
      )}

      {phase === 'complete' && finalState && (
        <SessionComplete
          muscleGroup={muscleGroup}
          set1={set1Score}
          set2={set2Score}
          set3={set3Score}
          sessionScore={calcSessionScore(set1Score, set2Score, set3Score)}
          honesScore={finalState.honesScore}
          prevHonesScore={prevHonesScore}
          streak={finalState.profile?.streak ?? 1}
          isPersonalRecord={
            finalState.bestScores[muscleGroup as keyof typeof finalState.bestScores] ===
            calcSessionScore(set1Score, set2Score, set3Score)
          }
          dayNumber={finalState.profile?.sessionCount ?? 1}
          onDone={() => router.push('/')}
        />
      )}
    </div>
  )
}

function CooldownScreen({
  muscleGroup,
  muscleColor,
  onComplete,
}: {
  muscleGroup: string
  muscleColor: string
  onComplete: () => void
}) {
  const [timeLeft, setTimeLeft] = useState(30)

  useEffect(() => {
    const iv = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(iv)
          onComplete()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [onComplete])

  const INSIGHTS: Record<string, string> = {
    FOCUS: "You just stressed your anterior cingulate cortex — the region responsible for sustained attention and error-monitoring. That's the rep.",
    SPEED: "Processing speed is white matter efficiency. You just trained it.",
    MEMORY: "Working memory sits in prefrontal and parietal cortex. What you just trained is the mental workspace where thinking happens.",
    LOGIC: "Pattern recognition activates your dorsolateral prefrontal cortex. This is where strategic thinking lives.",
    WORDS: "Verbal fluency training recruits Broca's area and temporal cortex. Language circuits are being reinforced.",
    CONTROL: "Inhibitory control is the most trainable executive function. You just worked the most valuable muscle in your brain.",
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <p className="text-xs font-mono text-hone-muted uppercase tracking-widest mb-8">
        COOLDOWN
      </p>

      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-8"
        style={{ backgroundColor: `${muscleColor}15`, border: `1px solid ${muscleColor}40` }}
      >
        <p className="font-mono font-bold text-2xl" style={{ color: muscleColor }}>
          0:{String(timeLeft).padStart(2, '0')}
        </p>
      </div>

      <h2 className="text-xl font-bold mb-4">Today&apos;s insight</h2>

      <div className="bg-hone-card border border-hone-border rounded-2xl p-5 max-w-xs">
        <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: muscleColor }}>
          {muscleGroup}
        </p>
        <p className="text-sm text-hone-muted leading-relaxed">
          {INSIGHTS[muscleGroup] ?? INSIGHTS.FOCUS}
        </p>
      </div>

      <button
        onClick={onComplete}
        className="mt-8 text-hone-muted text-sm font-mono uppercase tracking-widest underline underline-offset-4"
      >
        Continue
      </button>
    </div>
  )
}

// Routes each muscle group to its corresponding game component
function GameRenderer({
  muscle,
  difficulty,
  setNumber,
  onComplete,
}: {
  muscle: string
  difficulty: number
  setNumber: number
  onComplete: (results: TrialResult[]) => void
}) {
  const color = getMuscleColor(muscle)
  const cues = KOVA_CUES.setStart[muscle as keyof typeof KOVA_CUES.setStart] ?? KOVA_CUES.setStart.FOCUS
  const cue = getRandomCue(cues)

  const commonProps = {
    difficulty,
    durationSecs: 90,
    muscleColor: color,
    onComplete,
    coachCue: cue,
    setNumber,
  }

  switch (muscle) {
    case 'SPEED':
      return <FlashGame {...commonProps} />
    case 'CONTROL':
      return <InhibitGame {...commonProps} />
    case 'MEMORY':
      return <NBackGame {...commonProps} />
    case 'LOGIC':
      return <MatrixGame {...commonProps} />
    case 'WORDS':
      return <WordGame {...commonProps} />
    case 'FOCUS':
    default:
      return <LockOnGame {...commonProps} />
  }
}
