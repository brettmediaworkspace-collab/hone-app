'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { TrialResult } from '@/lib/scoring'
import { playResult } from '@/lib/feedback'

// SPEED variant - Choice Reaction. An arrow points left or right; tap the
// matching side as fast as you can. Adds a decision step over FlashGame's
// simple detection, so it trains choice reaction time.
interface ChoiceGameProps {
  difficulty: number
  durationSecs: number
  muscleColor: string
  onComplete: (results: TrialResult[]) => void
  coachCue: string
  setNumber: number
}

type Dir = 'left' | 'right'

function getResponseWindow(difficulty: number): number {
  return Math.max(650, 1600 - (difficulty - 1) * 75)
}

export default function ChoiceGame({
  difficulty,
  durationSecs,
  muscleColor,
  onComplete,
  coachCue,
  setNumber,
}: ChoiceGameProps) {
  const responseWindow = getResponseWindow(difficulty)

  const [dir, setDir] = useState<Dir | null>(null)
  const [feedback, setFeedback] = useState<'hit' | 'miss' | 'wrong' | null>(null)
  const [flashSide, setFlashSide] = useState<Dir | null>(null)
  const [results, setResults] = useState<TrialResult[]>([])
  const [timeLeft, setTimeLeft] = useState(durationSecs)
  const [countIn, setCountIn] = useState<number | null>(3)
  const [progressWidth, setProgressWidth] = useState(100)

  // Resolution guard - one answer per trial. Correctness is derived from
  // the rendered `dir` passed into the handler, so it can't disagree with
  // the arrow the player saw.
  const answeredRef = useRef(false)
  const resultsRef = useRef<TrialResult[]>([])
  const doneRef = useRef(false)
  const trialStartRef = useRef(0)
  const trialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const nextTrial = useCallback(() => {
    if (doneRef.current) return
    const d: Dir = Math.random() < 0.5 ? 'left' : 'right'
    answeredRef.current = false
    setDir(d)
    setFeedback(null)
    trialStartRef.current = performance.now()

    trialTimeoutRef.current = setTimeout(() => {
      if (doneRef.current || answeredRef.current) return
      answeredRef.current = true
      const result: TrialResult = { correct: false, reactionTimeMs: null }
      resultsRef.current = [...resultsRef.current, result]
      setResults(r => [...r, result])
      setFeedback('miss')
      playResult(false)
      setDir(null)
      setTimeout(() => { if (!doneRef.current) nextTrial() }, 280)
    }, responseWindow)
  }, [responseWindow])

  const handleSide = useCallback((side: Dir, shown: Dir | null) => {
    if (doneRef.current || !shown || answeredRef.current) return
    answeredRef.current = true
    if (trialTimeoutRef.current) clearTimeout(trialTimeoutRef.current)
    const correct = side === shown
    const rt = Math.round(performance.now() - trialStartRef.current)
    const result: TrialResult = { correct, reactionTimeMs: correct ? rt : null }
    resultsRef.current = [...resultsRef.current, result]
    setResults(r => [...r, result])
    setFeedback(correct ? 'hit' : 'wrong')
    setFlashSide(side)
    setTimeout(() => setFlashSide(null), 200)
    playResult(correct)
    setDir(null)
    setTimeout(() => { if (!doneRef.current) nextTrial() }, correct ? 200 : 320)
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
              setDir(null)
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

  const Chevron = ({ d }: { d: Dir }) => (
    <svg width="96" height="96" viewBox="0 0 24 24" fill="none"
      style={{ transform: d === 'left' ? 'rotate(180deg)' : 'none' }}>
      <path d="M8 4l8 8-8 8" stroke={muscleColor} strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  return (
    <div className="flex flex-col h-full no-select select-none">
      {countIn !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-hone-bg">
          <div className="text-center">
            <p className="text-hone-muted text-sm font-mono uppercase tracking-widest mb-6">SET {setNumber} · SPEED</p>
            <div key={countIn} className="countdown-pulse font-mono text-9xl font-bold" style={{ color: muscleColor }}>{countIn}</div>
            <p className="text-hone-muted text-sm mt-8 max-w-xs mx-auto leading-relaxed">{coachCue}</p>
          </div>
        </div>
      )}

      <div className="h-1 bg-hone-surface flex-shrink-0">
        <div className="h-full transition-none" style={{ width: `${progressWidth}%`, backgroundColor: muscleColor }} />
      </div>

      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <p className="text-xs font-mono text-hone-muted uppercase tracking-widest">SET {setNumber} · SPEED</p>
        <p className="font-mono text-2xl font-medium tabular-nums" style={{ color: timeLeft <= 10 ? '#F5503C' : muscleColor }}>
          {String(Math.floor(timeLeft / 60))}:{String(timeLeft % 60).padStart(2, '0')}
        </p>
      </div>

      <div className="px-4 mb-2 flex-shrink-0">
        <p className="text-hone-muted text-sm">
          {dir ? <span className="font-semibold" style={{ color: muscleColor }}>TAP THE SIDE IT POINTS</span>
            : feedback === 'miss' ? <span className="text-hone-red">TOO SLOW</span>
            : feedback === 'wrong' ? <span className="text-hone-red">WRONG SIDE</span>
            : <span className="text-hone-muted">-</span>}
        </p>
      </div>

      {/* Two tap zones with the arrow centered */}
      <div className="flex-1 relative mx-4 rounded-2xl overflow-hidden border border-hone-border">
        <div className="absolute inset-0 flex">
          <button
            className="flex-1 h-full transition-colors"
            style={{ backgroundColor: flashSide === 'left' ? `${muscleColor}22` : '#141418' }}
            onClick={() => handleSide('left', dir)}
            onTouchStart={e => { e.preventDefault(); handleSide('left', dir) }}
            aria-label="left"
          />
          <div className="w-px h-full bg-hone-border" />
          <button
            className="flex-1 h-full transition-colors"
            style={{ backgroundColor: flashSide === 'right' ? `${muscleColor}22` : '#141418' }}
            onClick={() => handleSide('right', dir)}
            onTouchStart={e => { e.preventDefault(); handleSide('right', dir) }}
            aria-label="right"
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {dir ? <Chevron d={dir} /> : <div className="w-8 h-8 rounded-full border border-hone-border opacity-20" />}
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
            <p className="text-hone-muted text-xs font-mono uppercase tracking-widest mt-0.5">Accuracy</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-2xl font-medium text-hone-text">{avgRT ? `${avgRT}ms` : '-'}</p>
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
