'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { TrialResult } from '@/lib/scoring'
import { playResult } from '@/lib/feedback'

// LOGIC variant - Number Sequence. Infer the rule and pick what comes next.
// Trains inductive reasoning, distinct from MatrixGame's shape/colour logic.
interface NumberSeqGameProps {
  difficulty: number
  durationSecs: number
  muscleColor: string
  onComplete: (results: TrialResult[]) => void
  coachCue: string
  setNumber: number
}

function getResponseWindow(difficulty: number): number {
  return Math.max(2600, 5200 - (difficulty - 1) * 210)
}

function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

interface Puzzle { seq: number[]; answer: number; options: number[]; oddPos: number }

function makePuzzle(difficulty: number): Puzzle {
  const rnd = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1))
  let seq: number[] = []
  let answer = 0

  const kind = difficulty <= 3 ? rnd(0, 1) : difficulty <= 7 ? rnd(0, 2) : rnd(0, 3)
  if (kind === 0) {
    // arithmetic
    const start = rnd(1, 9), step = rnd(2, 5 + Math.floor(difficulty / 2))
    seq = [0, 1, 2, 3].map(i => start + i * step)
    answer = start + 4 * step
  } else if (kind === 1) {
    // increasing step
    const start = rnd(1, 6), k = rnd(1, 3)
    let v = start, s = k
    seq = [v]
    for (let i = 0; i < 3; i++) { v += s; seq.push(v); s += 1 }
    answer = v + s
  } else if (kind === 2) {
    // geometric
    const start = rnd(1, 4), r = rnd(2, 3)
    seq = [0, 1, 2, 3].map(i => start * r ** i)
    answer = start * r ** 4
  } else {
    // alternating add
    const start = rnd(1, 8), a = rnd(2, 5), b = rnd(3, 7)
    let v = start
    seq = [v]
    for (let i = 0; i < 3; i++) { v += i % 2 === 0 ? a : b; seq.push(v) }
    answer = v + (3 % 2 === 0 ? a : b)
  }

  // Distractors near the answer, unique.
  const gap = Math.max(1, Math.round((seq[seq.length - 1] - seq[seq.length - 2]) / 2))
  const pool = new Set<number>([answer])
  const cands = [answer + gap, answer - gap, answer + 1, answer - 1, answer + 2 * gap, Math.round(answer * 1.5)]
  for (const c of cands) { if (c > 0 && !pool.has(c)) pool.add(c); if (pool.size >= 4) break }
  while (pool.size < 4) pool.add(answer + pool.size + rnd(3, 9))
  const options = shuffle(Array.from(pool))
  return { seq, answer, options, oddPos: options.indexOf(answer) }
}

export default function NumberSeqGame({
  difficulty, durationSecs, muscleColor, onComplete, coachCue, setNumber,
}: NumberSeqGameProps) {
  const responseWindow = getResponseWindow(difficulty)

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [feedback, setFeedback] = useState<'hit' | 'wrong' | 'miss' | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [results, setResults] = useState<TrialResult[]>([])
  const [timeLeft, setTimeLeft] = useState(durationSecs)
  const [countIn, setCountIn] = useState<number | null>(3)
  const [progressWidth, setProgressWidth] = useState(100)

  const answeredRef = useRef(false)
  const resultsRef = useRef<TrialResult[]>([])
  const doneRef = useRef(false)
  const trialStartRef = useRef(0)
  const trialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const nextTrial = useCallback(() => {
    if (doneRef.current) return
    answeredRef.current = false
    setPicked(null)
    setFeedback(null)
    setPuzzle(makePuzzle(difficulty))
    trialStartRef.current = performance.now()
    trialTimeoutRef.current = setTimeout(() => {
      if (doneRef.current || answeredRef.current) return
      answeredRef.current = true
      const result: TrialResult = { correct: false, reactionTimeMs: null }
      resultsRef.current = [...resultsRef.current, result]
      setResults(r => [...r, result])
      setFeedback('miss')
      playResult(false)
      setTimeout(() => { if (!doneRef.current) nextTrial() }, 550)
    }, responseWindow)
  }, [difficulty, responseWindow])

  const handlePick = useCallback((i: number, ans: number) => {
    if (doneRef.current || ans < 0 || answeredRef.current) return
    answeredRef.current = true
    if (trialTimeoutRef.current) clearTimeout(trialTimeoutRef.current)
    const correct = i === ans
    const rt = Math.round(performance.now() - trialStartRef.current)
    const result: TrialResult = { correct, reactionTimeMs: correct ? rt : null }
    resultsRef.current = [...resultsRef.current, result]
    setResults(r => [...r, result])
    setPicked(i)
    setFeedback(correct ? 'hit' : 'wrong')
    playResult(correct)
    setTimeout(() => { if (!doneRef.current) nextTrial() }, correct ? 380 : 600)
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

  return (
    <div className="flex flex-col h-full no-select select-none">
      {countIn !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-hone-bg">
          <div className="text-center">
            <p className="text-hone-muted text-sm font-mono uppercase tracking-widest mb-6">SET {setNumber} · LOGIC</p>
            <div key={countIn} className="countdown-pulse font-mono text-9xl font-bold" style={{ color: muscleColor }}>{countIn}</div>
            <p className="text-hone-muted text-sm mt-8 max-w-xs mx-auto leading-relaxed">{coachCue}</p>
          </div>
        </div>
      )}

      <div className="h-1 bg-hone-surface flex-shrink-0">
        <div className="h-full transition-none" style={{ width: `${progressWidth}%`, backgroundColor: muscleColor }} />
      </div>

      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <p className="text-xs font-mono text-hone-muted uppercase tracking-widest">SET {setNumber} · LOGIC</p>
        <p className="font-mono text-2xl font-medium tabular-nums" style={{ color: timeLeft <= 10 ? '#F5503C' : muscleColor }}>
          {String(Math.floor(timeLeft / 60))}:{String(timeLeft % 60).padStart(2, '0')}
        </p>
      </div>

      <div className="px-4 mb-2 flex-shrink-0">
        <p className="text-hone-muted text-sm">
          {feedback === 'miss' ? <span className="text-hone-red">TOO SLOW</span>
            : feedback === 'wrong' ? <span className="text-hone-red">WRONG</span>
            : <span className="font-semibold" style={{ color: muscleColor }}>WHAT COMES NEXT?</span>}
        </p>
      </div>

      {/* Sequence */}
      <div className="px-4 flex items-center justify-center" style={{ minHeight: 96 }}>
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {puzzle?.seq.map((v, i) => (
            <span key={i} className="font-mono text-3xl font-black text-hone-text">
              {v}<span className="text-hone-muted mx-1">·</span>
            </span>
          ))}
          <span className="font-mono text-3xl font-black" style={{ color: muscleColor }}>?</span>
        </div>
      </div>

      {/* Options */}
      <div className="flex-1 flex items-start justify-center px-4 pt-4">
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
          {puzzle?.options.map((v, i) => {
            const isPicked = picked === i
            const showWrong = isPicked && feedback === 'wrong'
            const showHit = isPicked && feedback === 'hit'
            return (
              <button
                key={i}
                onClick={() => handlePick(i, puzzle.oddPos)}
                onTouchStart={e => { e.preventDefault(); handlePick(i, puzzle.oddPos) }}
                className="py-5 rounded-2xl border font-mono text-2xl font-bold transition-all"
                style={{
                  borderColor: showHit ? muscleColor : showWrong ? '#F5503C' : '#2A2A36',
                  backgroundColor: showHit ? `${muscleColor}18` : showWrong ? '#F5503C18' : '#141418',
                  color: '#F0F0F0',
                }}
              >
                {v}
              </button>
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
