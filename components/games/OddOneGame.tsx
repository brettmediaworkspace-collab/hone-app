'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { TrialResult } from '@/lib/scoring'
import { playResult } from '@/lib/feedback'

// FOCUS variant — Odd One Out. A grid of identical tiles hides one that's a
// slightly different shade; find and tap it. Trains visual search and
// selective attention, distinct from LockOn's flash-and-recall.
interface OddOneGameProps {
  difficulty: number
  durationSecs: number
  muscleColor: string
  onComplete: (results: TrialResult[]) => void
  coachCue: string
  setNumber: number
}

function gridSize(difficulty: number): number {
  if (difficulty <= 2) return 3
  if (difficulty <= 6) return 4
  return 5
}

// Alpha gap between the odd tile and the rest — shrinks as difficulty rises.
function oddDelta(difficulty: number): number {
  return Math.max(0.09, 0.32 - (difficulty - 1) * 0.02)
}

function getResponseWindow(difficulty: number): number {
  return Math.max(1400, 3000 - (difficulty - 1) * 130)
}

export default function OddOneGame({
  difficulty,
  durationSecs,
  muscleColor,
  onComplete,
  coachCue,
  setNumber,
}: OddOneGameProps) {
  const size = gridSize(difficulty)
  const total = size * size
  const responseWindow = getResponseWindow(difficulty)
  const baseAlpha = 0.4

  const [oddIndex, setOddIndex] = useState<number>(-1)
  const [feedback, setFeedback] = useState<'hit' | 'wrong' | 'miss' | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [results, setResults] = useState<TrialResult[]>([])
  const [timeLeft, setTimeLeft] = useState(durationSecs)
  const [countIn, setCountIn] = useState<number | null>(3)
  const [progressWidth, setProgressWidth] = useState(100)

  // Resolution guard — synchronous, so one answer (or miss) per trial even
  // if renders/timers race. Correctness itself is derived from the rendered
  // oddIndex passed into the click handler, so it can never disagree with
  // the tile the player actually saw.
  const answeredRef = useRef(false)
  const resultsRef = useRef<TrialResult[]>([])
  const doneRef = useRef(false)
  const trialStartRef = useRef(0)
  const trialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const alphaHex = (a: number) =>
    Math.round(Math.min(1, a) * 255).toString(16).padStart(2, '0')

  const nextTrial = useCallback(() => {
    if (doneRef.current) return
    const idx = Math.floor(Math.random() * total)
    answeredRef.current = false
    setPicked(null)
    setFeedback(null)
    setOddIndex(idx)
    trialStartRef.current = performance.now()

    trialTimeoutRef.current = setTimeout(() => {
      if (doneRef.current || answeredRef.current) return
      answeredRef.current = true
      const result: TrialResult = { correct: false, reactionTimeMs: null }
      resultsRef.current = [...resultsRef.current, result]
      setResults(r => [...r, result])
      setFeedback('miss')
      playResult(false)
      setTimeout(() => { if (!doneRef.current) nextTrial() }, 400)
    }, responseWindow)
  }, [total, responseWindow])

  const handleCell = useCallback((i: number, odd: number) => {
    if (doneRef.current || odd < 0 || answeredRef.current) return
    answeredRef.current = true
    if (trialTimeoutRef.current) clearTimeout(trialTimeoutRef.current)
    const correct = i === odd
    const rt = Math.round(performance.now() - trialStartRef.current)
    const result: TrialResult = { correct, reactionTimeMs: correct ? rt : null }
    resultsRef.current = [...resultsRef.current, result]
    setResults(r => [...r, result])
    setPicked(i)
    setFeedback(correct ? 'hit' : 'wrong')
    playResult(correct)
    setTimeout(() => { if (!doneRef.current) nextTrial() }, correct ? 260 : 420)
  }, [nextTrial])

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
      if (trialTimeoutRef.current) clearTimeout(trialTimeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const correctCount = results.filter(r => r.correct).length
  const rts = results.filter(r => r.correct && r.reactionTimeMs)
  const avgRT = rts.length > 0
    ? Math.round(rts.reduce((a, b) => a + (b.reactionTimeMs ?? 0), 0) / rts.length)
    : null
  const recentResults = results.slice(-10)

  const base = `${muscleColor}${alphaHex(baseAlpha)}`
  const odd = `${muscleColor}${alphaHex(baseAlpha + oddDelta(difficulty))}`

  return (
    <div className="flex flex-col h-full no-select select-none">
      {countIn !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-hone-bg">
          <div className="text-center">
            <p className="text-hone-muted text-sm font-mono uppercase tracking-widest mb-6">SET {setNumber} · FOCUS</p>
            <div key={countIn} className="countdown-pulse font-mono text-9xl font-bold" style={{ color: muscleColor }}>{countIn}</div>
            <p className="text-hone-muted text-sm mt-8 max-w-xs mx-auto leading-relaxed">{coachCue}</p>
          </div>
        </div>
      )}

      <div className="h-1 bg-hone-surface flex-shrink-0">
        <div className="h-full transition-none" style={{ width: `${progressWidth}%`, backgroundColor: muscleColor }} />
      </div>

      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <p className="text-xs font-mono text-hone-muted uppercase tracking-widest">SET {setNumber} · FOCUS</p>
        <p className="font-mono text-2xl font-medium tabular-nums" style={{ color: timeLeft <= 10 ? '#F5503C' : muscleColor }}>
          {String(Math.floor(timeLeft / 60))}:{String(timeLeft % 60).padStart(2, '0')}
        </p>
      </div>

      <div className="px-4 mb-2 flex-shrink-0">
        <p className="text-hone-muted text-sm">
          {feedback === 'miss' ? <span className="text-hone-red">TOO SLOW</span>
            : feedback === 'wrong' ? <span className="text-hone-red">NOT THAT ONE</span>
            : <span className="font-semibold" style={{ color: muscleColor }}>FIND THE ODD TILE</span>}
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div
          className="grid gap-2 w-full max-w-xs"
          style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
        >
          {Array.from({ length: total }).map((_, i) => {
            const isOdd = i === oddIndex
            const isPicked = picked === i
            const showWrong = isPicked && feedback === 'wrong'
            const showHit = isPicked && feedback === 'hit'
            return (
              <button
                key={i}
                onClick={() => handleCell(i, oddIndex)}
                onTouchStart={e => { e.preventDefault(); handleCell(i, oddIndex) }}
                className="aspect-square rounded-lg transition-all duration-150"
                style={{
                  backgroundColor: oddIndex < 0 ? '#141418' : isOdd ? odd : base,
                  boxShadow: showHit ? `0 0 0 2px ${muscleColor}` : showWrong ? '0 0 0 2px #F5503C' : 'none',
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
              {results.length > 0 ? Math.round((correctCount / results.length) * 100) : '—'}{results.length > 0 ? '%' : ''}
            </p>
            <p className="text-hone-muted text-xs font-mono uppercase tracking-widest mt-0.5">Accuracy</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-2xl font-medium text-hone-text">{avgRT ? `${avgRT}ms` : '—'}</p>
            <p className="text-hone-muted text-xs font-mono uppercase tracking-widest mt-0.5">Avg RT</p>
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
