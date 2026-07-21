'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { TrialResult } from '@/lib/scoring'
import { playResult } from '@/lib/feedback'

// MEMORY variant - Sequence Recall (Corsi-style). Watch tiles light up, then
// tap them back in the same order. Trains spatial working-memory span,
// distinct from NBackGame's running match.
interface SequenceGameProps {
  difficulty: number
  durationSecs: number
  muscleColor: string
  onComplete: (results: TrialResult[]) => void
  coachCue: string
  setNumber: number
}

const TILES = 9 // 3x3 grid

function spanFor(difficulty: number): number {
  return Math.min(8, 2 + Math.round(difficulty / 2))
}
function flashDur(difficulty: number): number {
  return Math.max(280, 520 - difficulty * 18)
}

export default function SequenceGame({
  difficulty, durationSecs, muscleColor, onComplete, coachCue, setNumber,
}: SequenceGameProps) {
  const span = spanFor(difficulty)

  const [phase, setPhase] = useState<'show' | 'input'>('show')
  const [active, setActive] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<'hit' | 'wrong' | 'miss' | null>(null)
  const [results, setResults] = useState<TrialResult[]>([])
  const [timeLeft, setTimeLeft] = useState(durationSecs)
  const [countIn, setCountIn] = useState<number | null>(3)
  const [progressWidth, setProgressWidth] = useState(100)

  const seqRef = useRef<number[]>([])
  const nextTrialRef = useRef<() => void>(() => {})
  const inputPosRef = useRef(0)
  const inputStartRef = useRef(0)
  const answeredRef = useRef(false)
  const resultsRef = useRef<TrialResult[]>([])
  const doneRef = useRef(false)
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const finishTrial = useCallback((correct: boolean, kind: 'hit' | 'wrong' | 'miss') => {
    if (answeredRef.current) return
    answeredRef.current = true
    if (inputTimeoutRef.current) clearTimeout(inputTimeoutRef.current)
    const rt = correct ? Math.round(performance.now() - inputStartRef.current) : null
    const result: TrialResult = { correct, reactionTimeMs: rt }
    resultsRef.current = [...resultsRef.current, result]
    setResults(r => [...r, result])
    setFeedback(kind)
    playResult(correct)
    setTimeout(() => { if (!doneRef.current) nextTrialRef.current() }, correct ? 550 : 700)
  }, [])

  const nextTrial = useCallback(() => {
    if (doneRef.current) return
    // Build sequence with no immediate repeats.
    const seq: number[] = []
    let prev = -1
    for (let i = 0; i < span; i++) {
      let t = Math.floor(Math.random() * TILES)
      if (t === prev) t = (t + 1) % TILES
      seq.push(t); prev = t
    }
    seqRef.current = seq
    inputPosRef.current = 0
    answeredRef.current = false
    setFeedback(null)
    setPhase('show')
    setActive(null)

    const fd = flashDur(difficulty)
    const gap = 200
    let i = 0
    const step = () => {
      if (doneRef.current) return
      if (i >= seq.length) {
        setActive(null)
        setPhase('input')
        inputStartRef.current = performance.now()
        // Whole-input safety timeout.
        inputTimeoutRef.current = setTimeout(() => finishTrial(false, 'miss'), span * 2200 + 1500)
        return
      }
      setActive(seq[i])
      showTimeoutRef.current = setTimeout(() => {
        setActive(null)
        showTimeoutRef.current = setTimeout(() => { i++; step() }, gap)
      }, fd)
    }
    showTimeoutRef.current = setTimeout(step, 500)
  }, [span, difficulty, finishTrial])

  // Keep the ref pointed at the latest nextTrial (breaks the
  // finishTrial ↔ nextTrial cycle without stale closures).
  useEffect(() => { nextTrialRef.current = nextTrial }, [nextTrial])

  const handleTile = useCallback((i: number) => {
    if (doneRef.current || phase !== 'input' || answeredRef.current) return
    const seq = seqRef.current
    const expected = seq[inputPosRef.current]
    // brief tap highlight
    setActive(i)
    setTimeout(() => setActive(a => (a === i ? null : a)), 160)
    if (i === expected) {
      inputPosRef.current += 1
      if (inputPosRef.current >= seq.length) finishTrial(true, 'hit')
    } else {
      finishTrial(false, 'wrong')
    }
  }, [phase, finishTrial])

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
              if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current)
              if (inputTimeoutRef.current) clearTimeout(inputTimeoutRef.current)
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
        nextTrial()
      } else {
        setCountIn(n)
      }
    }, 900)
    return () => {
      clearInterval(iv)
      clearInterval(timerRef.current!)
      clearInterval(progressRef.current!)
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current)
      if (inputTimeoutRef.current) clearTimeout(inputTimeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const correctCount = results.filter(r => r.correct).length
  const rts = results.filter(r => r.correct && r.reactionTimeMs)
  const avgRT = rts.length > 0
    ? Math.round(rts.reduce((a, b) => a + (b.reactionTimeMs ?? 0), 0) / rts.length)
    : null
  const recentResults = results.slice(-10)

  return (
    <div className="flex flex-col h-full no-select select-none">
      {countIn !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-hone-bg">
          <div className="text-center">
            <p className="text-hone-muted text-sm font-mono uppercase tracking-widest mb-6">SET {setNumber} · MEMORY</p>
            <div key={countIn} className="countdown-pulse font-mono text-9xl font-bold" style={{ color: muscleColor }}>{countIn}</div>
            <p className="text-hone-muted text-sm mt-8 max-w-xs mx-auto leading-relaxed">{coachCue}</p>
          </div>
        </div>
      )}

      <div className="h-1 bg-hone-surface flex-shrink-0">
        <div className="h-full transition-none" style={{ width: `${progressWidth}%`, backgroundColor: muscleColor }} />
      </div>

      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <p className="text-xs font-mono text-hone-muted uppercase tracking-widest">SET {setNumber} · MEMORY</p>
        <p className="font-mono text-2xl font-medium tabular-nums" style={{ color: timeLeft <= 10 ? '#F5503C' : muscleColor }}>
          {String(Math.floor(timeLeft / 60))}:{String(timeLeft % 60).padStart(2, '0')}
        </p>
      </div>

      <div className="px-4 mb-2 flex-shrink-0">
        <p className="text-hone-muted text-sm">
          {feedback === 'miss' ? <span className="text-hone-red">SEQUENCE LOST</span>
            : feedback === 'wrong' ? <span className="text-hone-red">WRONG ORDER</span>
            : phase === 'show' ? <span className="font-semibold" style={{ color: muscleColor }}>WATCH THE SEQUENCE</span>
            : <span className="font-semibold" style={{ color: muscleColor }}>TAP IT BACK IN ORDER</span>}
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
          {Array.from({ length: TILES }).map((_, i) => {
            const on = active === i
            return (
              <button
                key={i}
                onClick={() => handleTile(i)}
                onTouchStart={e => { e.preventDefault(); handleTile(i) }}
                disabled={phase === 'show'}
                className="aspect-square rounded-2xl border transition-all duration-100"
                style={{
                  borderColor: on ? muscleColor : '#2A2A36',
                  backgroundColor: on ? muscleColor : `${muscleColor}14`,
                  boxShadow: on ? `0 0 24px ${muscleColor}80` : 'none',
                }}
              />
            )
          })}
        </div>
      </div>

      <div className="px-4 pb-4 flex-shrink-0 mt-3">
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
              {results.length > 0 ? Math.round((correctCount / results.length) * 100) : '-'}{results.length > 0 ? '%' : ''}
            </p>
            <p className="text-hone-muted text-xs font-mono uppercase tracking-widest mt-0.5">Recalled</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-2xl font-medium text-hone-text">{span}</p>
            <p className="text-hone-muted text-xs font-mono uppercase tracking-widest mt-0.5">Span</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-2xl font-medium text-hone-blue">LVL {difficulty}</p>
            <p className="text-hone-muted text-xs font-mono uppercase tracking-widest mt-0.5">Difficulty</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-hone-border">
          <p className="text-xs text-hone-muted uppercase tracking-widest mb-1 font-mono">KOVA</p>
          <p className="text-sm text-hone-text leading-relaxed">&ldquo;{coachCue}&rdquo;</p>
        </div>
      </div>
    </div>
  )
}
