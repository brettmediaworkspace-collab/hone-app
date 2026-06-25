'use client'

import { useEffect, useState } from 'react'

interface WarmupProps {
  split: string[]
  onComplete: () => void
}

export default function Warmup({ split, onComplete }: WarmupProps) {
  const [secondsLeft, setSecondsLeft] = useState(5)
  const [phase, setPhase] = useState<'breathe' | 'ready'>('breathe')
  const [breatheScale, setBreatheScale] = useState(1)

  useEffect(() => {
    // Breathing animation
    const breathe = setInterval(() => {
      setBreatheScale(s => (s === 1 ? 1.15 : 1))
    }, 2000)

    // Countdown
    const countdown = setInterval(() => {
      setSecondsLeft(t => {
        if (t <= 1) {
          clearInterval(countdown)
          clearInterval(breathe)
          setPhase('ready')
          setTimeout(onComplete, 1200)
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => {
      clearInterval(breathe)
      clearInterval(countdown)
    }
  }, [onComplete])

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <p className="text-xs font-mono text-hone-muted uppercase tracking-widest mb-12">
        WARM-UP · 0:00
      </p>

      {phase === 'breathe' ? (
        <>
          {/* Breathing orb */}
          <div className="relative mb-12">
            <div
              className="w-40 h-40 rounded-full border border-hone-green/30 flex items-center justify-center transition-transform duration-[2000ms] ease-in-out"
              style={{ transform: `scale(${breatheScale})` }}
            >
              <div
                className="w-28 h-28 rounded-full border border-hone-green/50 flex items-center justify-center transition-transform duration-[2000ms] ease-in-out"
                style={{ transform: `scale(${breatheScale === 1 ? 0.9 : 1})` }}
              >
                <div
                  className="w-16 h-16 rounded-full transition-all duration-[2000ms] ease-in-out"
                  style={{
                    backgroundColor: breatheScale === 1 ? 'rgba(184,245,60,0.2)' : 'rgba(184,245,60,0.5)',
                    boxShadow: breatheScale === 1
                      ? '0 0 20px rgba(184,245,60,0.2)'
                      : '0 0 40px rgba(184,245,60,0.5)',
                  }}
                />
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-3">
            {breatheScale === 1 ? 'Breathe in' : 'Breathe out'}
          </h2>
          <p className="text-hone-muted text-sm leading-relaxed mb-8 max-w-xs">
            Clear your mind. Today&apos;s session starts in{' '}
            <span className="text-hone-green font-mono">{secondsLeft}s</span>
          </p>

          {/* Today's split */}
          <div className="w-full max-w-xs bg-hone-card border border-hone-border rounded-2xl p-4">
            <p className="text-xs font-mono text-hone-muted uppercase tracking-widest mb-3">
              Today&apos;s session
            </p>
            {split.map((muscle, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-hone-border last:border-0"
              >
                <span className="text-sm font-semibold text-hone-text">
                  {i === 2 ? `SET ${i + 1} · FINISHER` : `SET ${i + 1}`}
                </span>
                <span
                  className="text-sm font-mono font-bold uppercase tracking-wider"
                  style={{
                    color:
                      muscle === 'FOCUS' ? '#B8F53C'
                      : muscle === 'SPEED' ? '#3C8BF5'
                      : muscle === 'MEMORY' ? '#A03CF5'
                      : muscle === 'LOGIC' ? '#F58A3C'
                      : muscle === 'WORDS' ? '#3CF5D1'
                      : '#F5503C',
                  }}
                >
                  {muscle}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center animate-slide-up">
          <div
            className="text-6xl font-bold font-mono mb-4"
            style={{ color: '#B8F53C' }}
          >
            GO
          </div>
          <p className="text-hone-muted">Lock in.</p>
        </div>
      )}
    </div>
  )
}
