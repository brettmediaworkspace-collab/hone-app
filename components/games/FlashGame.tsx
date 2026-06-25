'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { TrialResult } from '@/lib/scoring'

interface FlashGameProps {
  difficulty: number
  durationSecs: number
  muscleColor: string
  onComplete: (results: TrialResult[]) => void
  coachCue: string
  setNumber: number
}

interface Target {
  x: number
  y: number
  id: number
  size: number
}

function getTargetSize(difficulty: number): number {
  return Math.max(52, 80 - (difficulty - 1) * 2.5)
}

function getResponseWindow(difficulty: number): number {
  return Math.max(600, 1400 - (difficulty - 1) * 70)
}

export default function FlashGame({
  difficulty,
  durationSecs,
  muscleColor,
  onComplete,
  coachCue,
  setNumber,
}: FlashGameProps) {
  const targetSize = getTargetSize(difficulty)
  const responseWindow = getResponseWindow(difficulty)

  const [target, setTarget] = useState<Target | null>(null)
  const [feedback, setFeedback] = useState<'hit' | 'miss' | null>(null)
  const [results, setResults] = useState<TrialResult[]>([])
  const [timeLeft, setTimeLeft] = useState(durationSecs)
  const [countIn, setCountIn] = useState<number | null>(3)
  const [progressWidth, setProgressWidth] = useState(100)
  const [tapRipple, setTapRipple] = useState<{ x: number; y: number; id: number } | null>(null)

  const resultsRef = useRef<TrialResult[]>([])
  const doneRef = useRef(false)
  const trialStartRef = useRef(0)
  const trialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const arenaRef = useRef<HTMLDivElement>(null)
  const targetIdRef = useRef(0)

  const spawnTarget = useCallback(() => {
    if (doneRef.current) return
    const arena = arenaRef.current
    if (!arena) return
    const rect = arena.getBoundingClientRect()
    const pad = targetSize / 2 + 12
    const x = pad + Math.random() * (rect.width - pad * 2)
    const y = pad + Math.random() * (rect.height - pad * 2)
    targetIdRef.current += 1
    setTarget({ x, y, id: targetIdRef.current, size: targetSize })
    setFeedback(null)
    trialStartRef.current = performance.now()

    trialTimeoutRef.current = setTimeout(() => {
      if (doneRef.current) return
      const result: TrialResult = { correct: false, reactionTimeMs: null }
      resultsRef.current = [...resultsRef.current, result]
      setResults(r => [...r, result])
      setFeedback('miss')
      setTarget(null)
      setTimeout(() => {
        if (!doneRef.current) spawnTarget()
      }, 250)
    }, responseWindow)
  }, [targetSize, responseWindow])

  const handleTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (doneRef.current || !target) return
      if (trialTimeoutRef.current) clearTimeout(trialTimeoutRef.current)

      const rt = Math.round(performance.now() - trialStartRef.current)

      // Ripple effect
      const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY
      const rect = arenaRef.current?.getBoundingClientRect()
      if (rect) {
        setTapRipple({ x: (clientX ?? 0) - rect.left, y: (clientY ?? 0) - rect.top, id: Date.now() })
        setTimeout(() => setTapRipple(null), 400)
      }

      const result: TrialResult = { correct: true, reactionTimeMs: rt }
      resultsRef.current = [...resultsRef.current, result]
      setResults(r => [...r, result])
      setFeedback('hit')
      setTarget(null)

      setTimeout(() => {
        if (!doneRef.current) spawnTarget()
      }, 180)
    },
    [target, spawnTarget]
  )

  useEffect(() => {
    let n = 3
    setCountIn(3)
    const iv = setInterval(() => {
      n -= 1
      if (n <= 0) {
        clearInterval(iv)
        setCountIn(null)

        timerRef.current = setInterval(() => {
          setTimeLeft(t => {
            if (t <= 1) {
              clearInterval(timerRef.current!)
              clearInterval(progressRef.current!)
              doneRef.current = true
              if (trialTimeoutRef.current) clearTimeout(trialTimeoutRef.current)
              setTarget(null)
              setTimeout(() => onComplete(resultsRef.current), 400)
              return 0
            }
            return t - 1
          })
        }, 1000)

        const startTime = Date.now()
        progressRef.current = setInterval(() => {
          const elapsed = Date.now() - startTime
          const pct = Math.max(0, 100 - (elapsed / (durationSecs * 1000)) * 100)
          setProgressWidth(pct)
          if (pct <= 0) clearInterval(progressRef.current!)
        }, 50)

        spawnTarget()
      } else {
        setCountIn(n)
      }
    }, 900)

    return () => {
      clearInterval(iv)
      clearInterval(timerRef.current!)
      clearInterval(progressRef.current!)
      if (trialTimeoutRef.current) clearTimeout(trialTimeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const correctCount = results.filter(r => r.correct).length
  const avgRT = results.filter(r => r.correct && r.reactionTimeMs).length > 0
    ? Math.round(results.filter(r => r.correct && r.reactionTimeMs!).reduce((a, b) => a + (b.reactionTimeMs ?? 0), 0) / results.filter(r => r.correct).length)
    : null
  const recentResults = results.slice(-10)

  return (
    <div className="flex flex-col h-full no-select select-none">
      {/* Count-in overlay */}
      {countIn !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-hone-bg">
          <div className="text-center">
            <p className="text-hone-muted text-sm font-mono uppercase tracking-widest mb-6">
              SET {setNumber} · SPEED
            </p>
            <div key={countIn} className="countdown-pulse font-mono text-9xl font-bold" style={{ color: muscleColor }}>
              {countIn}
            </div>
            <p className="text-hone-muted text-sm mt-8 max-w-xs mx-auto leading-relaxed">{coachCue}</p>
          </div>
        </div>
      )}

      {/* Timer bar */}
      <div className="h-1 bg-hone-surface flex-shrink-0">
        <div className="h-full transition-none" style={{ width: `${progressWidth}%`, backgroundColor: muscleColor }} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <p className="text-xs font-mono text-hone-muted uppercase tracking-widest">SET {setNumber} · SPEED</p>
        <p className="font-mono text-2xl font-medium tabular-nums" style={{ color: timeLeft <= 10 ? '#F5503C' : muscleColor }}>
          {String(Math.floor(timeLeft / 60))}:{String(timeLeft % 60).padStart(2, '0')}
        </p>
      </div>

      {/* Instruction */}
      <div className="px-4 mb-2 flex-shrink-0">
        <p className="text-hone-muted text-sm">
          {target ? <span className="font-semibold" style={{ color: muscleColor }}>TAP THE TARGET</span>
            : feedback === 'miss' ? <span className="text-hone-red">TOO SLOW</span>
            : <span className="text-hone-muted">—</span>}
        </p>
      </div>

      {/* Arena */}
      <div
        ref={arenaRef}
        className="flex-1 relative overflow-hidden mx-4 rounded-2xl bg-hone-card border border-hone-border"
        onClick={handleTap}
        onTouchStart={e => { e.preventDefault(); handleTap(e) }}
      >
        {/* Target */}
        {target && (
          <div
            key={target.id}
            className="absolute rounded-full flex items-center justify-center transition-none"
            style={{
              width: target.size,
              height: target.size,
              left: target.x - target.size / 2,
              top: target.y - target.size / 2,
              backgroundColor: `${muscleColor}20`,
              border: `2px solid ${muscleColor}`,
              boxShadow: `0 0 20px ${muscleColor}60, 0 0 40px ${muscleColor}30`,
            }}
          >
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: muscleColor }} />
          </div>
        )}

        {/* Tap ripple */}
        {tapRipple && (
          <div
            key={tapRipple.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 60,
              height: 60,
              left: tapRipple.x - 30,
              top: tapRipple.y - 30,
              border: `2px solid ${muscleColor}`,
              opacity: 0,
              animation: 'ripple 0.4s ease-out forwards',
            }}
          />
        )}

        {/* Miss overlay */}
        {feedback === 'miss' && !target && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="font-mono font-bold text-hone-red text-2xl opacity-60">MISS</p>
          </div>
        )}

        {/* Empty state hint */}
        {!target && feedback !== 'miss' && countIn === null && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-8 h-8 rounded-full border border-hone-border opacity-20" />
          </div>
        )}

        <style>{`
          @keyframes ripple {
            0% { transform: scale(0.5); opacity: 0.8; }
            100% { transform: scale(2.5); opacity: 0; }
          }
        `}</style>
      </div>

      {/* Stats */}
      <div className="px-4 pb-4 flex-shrink-0 mt-3">
        {/* Score dots */}
        <div className="flex gap-1.5 justify-center mb-3">
          {Array.from({ length: Math.max(10, recentResults.length) }).map((_, i) => {
            const r = recentResults[i]
            if (!r) return <div key={i} className="w-3 h-3 rounded-full bg-hone-border" />
            return <div key={i} className="w-3 h-3 rounded-full score-dot-fill" style={{ backgroundColor: r.correct ? muscleColor : '#F5503C' }} />
          })}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-center">
            <p className="font-mono text-2xl font-medium" style={{ color: muscleColor }}>
              {results.length > 0 ? Math.round((correctCount / results.length) * 100) : '—'}{results.length > 0 ? '%' : ''}
            </p>
            <p className="text-hone-muted text-xs font-mono uppercase tracking-widest mt-0.5">Accuracy</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-2xl font-medium text-hone-text">
              {avgRT ? `${avgRT}ms` : '—'}
            </p>
            <p className="text-hone-muted text-xs font-mono uppercase tracking-widest mt-0.5">Avg RT</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-2xl font-medium text-hone-blue">LVL {difficulty}</p>
            <p className="text-hone-muted text-xs font-mono uppercase tracking-widest mt-0.5">Difficulty</p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-hone-border">
          <p className="text-xs text-hone-muted uppercase tracking-widest mb-1 font-mono">VERA</p>
          <p className="text-sm text-hone-text leading-relaxed">&ldquo;{coachCue}&rdquo;</p>
        </div>
      </div>
    </div>
  )
}
