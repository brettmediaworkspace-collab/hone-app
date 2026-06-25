'use client'

import { useEffect, useState } from 'react'
import { SetScore } from '@/lib/scoring'

interface RestScreenProps {
  setNumber: number
  setScore: SetScore
  nextMuscle: string
  onComplete: () => void
  onSkip: () => void
  restSeconds?: number
}

const REST_CUES = [
  "Solid. You're adapting. Next set: stay locked.",
  "Breathe. Next set is the finisher — maximum effort.",
  "That's the work. Reset and go again.",
  "Consistency over time. One more set.",
]

export default function RestScreen({
  setNumber,
  setScore,
  nextMuscle,
  onComplete,
  onSkip,
  restSeconds = 30,
}: RestScreenProps) {
  const [timeLeft, setTimeLeft] = useState(restSeconds)
  const cue = REST_CUES[Math.floor(Math.random() * REST_CUES.length)]

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

  const muscleColor =
    nextMuscle === 'FOCUS' ? '#B8F53C'
    : nextMuscle === 'SPEED' ? '#3C8BF5'
    : nextMuscle === 'MEMORY' ? '#A03CF5'
    : nextMuscle === 'LOGIC' ? '#F58A3C'
    : nextMuscle === 'WORDS' ? '#3CF5D1'
    : '#F5503C'

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <p className="text-xs font-mono text-hone-muted uppercase tracking-widest mb-8">
        SET {setNumber} COMPLETE
      </p>

      {/* Set score */}
      <div className="mb-2">
        <div
          className="text-8xl font-black font-mono score-reveal"
          style={{ color: setScore.accuracy >= 70 ? '#B8F53C' : '#F0F0F0' }}
        >
          {setScore.accuracy}%
        </div>
        <p className="text-hone-muted text-sm mt-1">THIS SET</p>
      </div>

      <div className="w-16 border-t border-hone-border my-6" />

      {/* Rest timer */}
      <p className="text-xs font-mono text-hone-muted uppercase tracking-widest mb-2">REST</p>
      <p className="font-mono text-5xl text-hone-blue tabular-nums mb-6">
        0:{String(timeLeft).padStart(2, '0')}
      </p>

      {/* Progress bar */}
      <div className="w-48 h-0.5 bg-hone-border rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-hone-blue rounded-full transition-none"
          style={{
            width: `${(timeLeft / restSeconds) * 100}%`,
          }}
        />
      </div>

      {/* Coach note */}
      <div className="w-full max-w-xs bg-hone-card border border-hone-border rounded-2xl p-4 mb-6 text-left">
        <p className="text-xs font-mono text-hone-muted uppercase tracking-widest mb-2">
          KOVA
        </p>
        <p className="text-sm text-hone-text leading-relaxed">&ldquo;{cue}&rdquo;</p>
      </div>

      {/* Next set preview */}
      <div className="w-full max-w-xs text-left mb-8">
        <p className="text-xs font-mono text-hone-muted uppercase tracking-widest mb-2">
          NEXT SET
        </p>
        <div className="flex items-center justify-between bg-hone-card border border-hone-border rounded-xl p-3">
          <div>
            <p
              className="font-mono font-bold text-base uppercase tracking-wider"
              style={{ color: muscleColor }}
            >
              {nextMuscle}
              {setNumber === 2 ? ' · FINISHER' : ''}
            </p>
            <p className="text-hone-muted text-xs mt-0.5">
              {setNumber === 2 ? '90 SEC · MAXIMUM EFFORT' : '90 SEC'}
            </p>
          </div>
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: muscleColor }}
          />
        </div>
      </div>

      {/* Skip rest */}
      <button
        onClick={onSkip}
        className="text-hone-muted text-sm underline underline-offset-4"
      >
        Skip rest
      </button>
    </div>
  )
}
