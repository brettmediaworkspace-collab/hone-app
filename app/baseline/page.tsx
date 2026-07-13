'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import LockOnGame from '@/components/games/LockOnGame'
import FlashGame from '@/components/games/FlashGame'
import NBackGame from '@/components/games/NBackGame'
import { loadState, saveBaseline, getMuscleColor } from '@/lib/gameState'
import { calcSetScore, SetScore, TrialResult } from '@/lib/scoring'
import { useAuth } from '@/lib/auth'
import { playCelebration, playTick } from '@/lib/feedback'

// Three quick rounds sample three distinct muscle groups.
// MEMORY is a Pro muscle — sampling it in the baseline is deliberate:
// the reveal shows what Pro training would work on.
const ROUNDS = ['FOCUS', 'SPEED', 'MEMORY'] as const
const ROUND_SECONDS = 45
const BASELINE_DIFFICULTY = 2

type Phase =
  | 'intro'
  | 'round1'
  | 'inter1'
  | 'round2'
  | 'inter2'
  | 'round3'
  | 'analysing'
  | 'reveal'

export default function BaselinePage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('intro')
  const [scores, setScores] = useState<Record<string, SetScore>>({})
  const [name, setName] = useState('')

  useEffect(() => {
    const s = loadState()
    if (!s.profile) {
      router.replace('/onboarding')
      return
    }
    setName(s.profile.name.split(' ')[0])
  }, [router])

  function completeRound(muscle: string, results: TrialResult[], next: Phase) {
    const score = calcSetScore(results, BASELINE_DIFFICULTY)
    setScores(prev => ({ ...prev, [muscle]: score }))
    setPhase(next)
  }

  return (
    <div className="h-screen flex flex-col bg-hone-bg overflow-hidden">
      {phase === 'intro' && <IntroScreen name={name} onStart={() => setPhase('round1')} />}

      {phase === 'round1' && (
        <LockOnGame
          difficulty={BASELINE_DIFFICULTY}
          durationSecs={ROUND_SECONDS}
          muscleColor={getMuscleColor('FOCUS')}
          coachCue="Baseline round 1. Lock on. Show me where you start."
          setNumber={1}
          onComplete={r => completeRound('FOCUS', r, 'inter1')}
        />
      )}

      {phase === 'inter1' && (
        <Interstitial round={2} muscle="SPEED" onNext={() => setPhase('round2')} />
      )}

      {phase === 'round2' && (
        <FlashGame
          difficulty={BASELINE_DIFFICULTY}
          durationSecs={ROUND_SECONDS}
          muscleColor={getMuscleColor('SPEED')}
          coachCue="Round 2. Raw reaction. Don't think — fire."
          setNumber={2}
          onComplete={r => completeRound('SPEED', r, 'inter2')}
        />
      )}

      {phase === 'inter2' && (
        <Interstitial round={3} muscle="MEMORY" onNext={() => setPhase('round3')} />
      )}

      {phase === 'round3' && (
        <NBackGame
          difficulty={BASELINE_DIFFICULTY}
          durationSecs={ROUND_SECONDS}
          muscleColor={getMuscleColor('MEMORY')}
          coachCue="Last round. Working memory. Encode deliberately."
          setNumber={3}
          onComplete={r => completeRound('MEMORY', r, 'analysing')}
        />
      )}

      {phase === 'analysing' && (
        <AnalysingScreen onDone={() => setPhase('reveal')} />
      )}

      {phase === 'reveal' && <RevealScreen name={name} scores={scores} />}
    </div>
  )
}

// Shown right after the score reveal — the moment users care most about
// keeping their progress. Hidden when already linked or auth is unavailable.
function SaveScoreCard() {
  const { user, isLinked, signInWithGoogle } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  if (!user || isLinked) return null

  async function handleSave() {
    setBusy(true)
    setError(false)
    try {
      await signInWithGoogle()
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-hone-green/40 bg-hone-green/5 p-4 mb-8 text-left">
      <p className="text-sm font-bold text-hone-text mb-1">
        Don&apos;t lose this score
      </p>
      <p className="text-xs text-hone-muted leading-relaxed mb-3">
        Save your baseline to a free account — your progress syncs across
        devices.
      </p>
      <button
        onClick={handleSave}
        disabled={busy}
        className="w-full py-3 rounded-xl font-mono font-bold uppercase tracking-widest text-xs text-hone-text bg-hone-surface border border-hone-border transition-opacity active:opacity-80 disabled:opacity-50"
      >
        {busy ? 'Connecting…' : 'Continue with Google'}
      </button>
      {error && (
        <p className="text-xs text-hone-red mt-2">
          Couldn&apos;t connect — your score is saved on this device.
        </p>
      )}
    </div>
  )
}

function IntroScreen({ name, onStart }: { name: string; onStart: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center animate-slide-up">
      <p className="text-xs font-mono text-hone-muted uppercase tracking-widest mb-8">
        BASELINE ASSESSMENT
      </p>
      <h1 className="text-3xl font-black leading-tight mb-4">
        Let&apos;s find your starting score{name ? `, ${name}` : ''}.
      </h1>
      <p className="text-hone-muted text-sm leading-relaxed max-w-xs mb-10">
        Three rounds. About three minutes. FOCUS, SPEED and MEMORY — enough to
        calculate your baseline HONE Score.
      </p>

      <div className="w-full max-w-xs flex flex-col gap-2 mb-10">
        {ROUNDS.map((m, i) => (
          <div
            key={m}
            className="flex items-center justify-between bg-hone-card border border-hone-border rounded-2xl px-4 py-3"
          >
            <span className="text-xs font-mono text-hone-muted uppercase tracking-widest">
              ROUND {i + 1}
            </span>
            <span
              className="font-mono font-bold text-sm"
              style={{ color: getMuscleColor(m) }}
            >
              {m}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        className="w-full max-w-xs py-4 rounded-2xl font-mono font-bold uppercase tracking-widest text-hone-bg text-sm bg-hone-green transition-opacity active:opacity-80"
      >
        Begin round 1
      </button>
      <p className="text-hone-muted text-xs mt-4 font-mono">
        No pressure. This is day zero — everything improves from here.
      </p>
    </div>
  )
}

function Interstitial({
  round,
  muscle,
  onNext,
}: {
  round: number
  muscle: string
  onNext: () => void
}) {
  const color = getMuscleColor(muscle)
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const iv = setInterval(() => {
      playTick()
      setCountdown(c => Math.max(0, c - 1))
    }, 1000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    if (countdown === 0) onNext()
  }, [countdown, onNext])

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center animate-slide-up">
      <p className="text-xs font-mono text-hone-muted uppercase tracking-widest mb-6">
        ROUND {round} OF 3
      </p>
      <p className="font-mono font-black text-4xl mb-4" style={{ color }}>
        {muscle}
      </p>
      <p className="text-hone-muted text-sm mb-10">Get ready.</p>
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${color}15`, border: `1px solid ${color}40` }}
      >
        <span className="font-mono font-bold text-2xl" style={{ color }}>
          {countdown}
        </span>
      </div>
    </div>
  )
}

function AnalysingScreen({ onDone }: { onDone: () => void }) {
  const LINES = [
    'Measuring reaction curve…',
    'Weighting accuracy vs speed…',
    'Calculating baseline HONE Score…',
  ]
  const [lineIdx, setLineIdx] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => {
      setLineIdx(i => {
        if (i >= LINES.length - 1) {
          clearInterval(iv)
          setTimeout(onDone, 900)
          return i
        }
        return i + 1
      })
    }, 900)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDone])

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-12 h-12 rounded-full border-2 border-hone-border border-t-hone-green animate-spin mb-8" />
      <p className="text-sm font-mono text-hone-muted uppercase tracking-widest animate-pulse">
        {LINES[lineIdx]}
      </p>
    </div>
  )
}

function RevealScreen({
  name,
  scores,
}: {
  name: string
  scores: Record<string, SetScore>
}) {
  const router = useRouter()
  const baselineScores = Object.fromEntries(
    ROUNDS.map(m => [m, scores[m]?.score ?? 0])
  )
  const tested = ROUNDS.filter(m => (scores[m]?.score ?? 0) > 0)
  const honesScore =
    tested.length > 0
      ? Math.round(tested.reduce((sum, m) => sum + scores[m].score, 0) / tested.length)
      : 0

  const [displayScore, setDisplayScore] = useState(0)
  const [showDetail, setShowDetail] = useState(false)
  const savedRef = useRef(false)

  // Persist once
  useEffect(() => {
    if (savedRef.current) return
    savedRef.current = true
    saveBaseline(baselineScores)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Count up
  useEffect(() => {
    const duration = 1800
    const steps = 60
    let current = 0
    const increment = honesScore / steps
    const iv = setInterval(() => {
      current += increment
      if (current >= honesScore) {
        setDisplayScore(honesScore)
        clearInterval(iv)
        playCelebration()
        setTimeout(() => setShowDetail(true), 400)
      } else {
        setDisplayScore(Math.round(current))
      }
    }, duration / steps)
    return () => clearInterval(iv)
  }, [honesScore])

  return (
    <div className="flex-1 overflow-y-auto px-6 py-10 flex flex-col items-center text-center">
      <p className="text-xs font-mono text-hone-muted uppercase tracking-widest mb-10">
        {name ? `${name.toUpperCase()} · ` : ''}BASELINE COMPLETE
      </p>

      <p className="text-sm font-mono text-hone-muted uppercase tracking-widest mb-2">
        Your HONE Score
      </p>
      <div className="font-mono text-8xl font-black text-hone-green score-reveal mb-1">
        {displayScore}
      </div>
      <p className="text-hone-muted text-sm font-mono mb-10">/ 1000</p>

      {showDetail && (
        <div className="w-full max-w-xs animate-slide-up">
          <div className="bg-hone-card border border-hone-border rounded-2xl p-4 mb-6 text-left">
            <p className="text-xs font-mono text-hone-muted uppercase tracking-widest mb-3">
              MUSCLE BREAKDOWN
            </p>
            {ROUNDS.map(m => {
              const s = scores[m]
              const color = getMuscleColor(m)
              const pct = Math.min(100, Math.round(((s?.score ?? 0) / 1000) * 100))
              return (
                <div key={m} className="mb-3 last:mb-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs font-mono font-bold" style={{ color }}>
                      {m}
                    </span>
                    <span className="text-xs font-mono text-hone-text">
                      {s?.score ?? 0}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-hone-surface overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              )
            })}
            <p className="text-xs text-hone-muted mt-4 leading-relaxed">
              LOGIC, WORDS and CONTROL are still unmeasured — they join your
              score as you train them.
            </p>
          </div>

          <div className="bg-hone-card border border-hone-border rounded-2xl p-4 mb-6 text-left">
            <p className="text-xs font-mono text-hone-muted uppercase tracking-widest mb-2">
              KOVA
            </p>
            <p className="text-sm text-hone-text leading-relaxed">
              &ldquo;That&apos;s your floor, not your ceiling. Train daily and
              watch this number move.&rdquo;
            </p>
          </div>

          <SaveScoreCard />

          <button
            onClick={() => router.push('/')}
            className="w-full py-4 rounded-2xl font-mono font-bold uppercase tracking-widest text-hone-bg text-sm bg-hone-green transition-opacity active:opacity-80"
          >
            Start training
          </button>
        </div>
      )}
    </div>
  )
}
