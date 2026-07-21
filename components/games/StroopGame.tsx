'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { TrialResult } from '@/lib/scoring'
import { playResult } from '@/lib/feedback'

// CONTROL variant - Stroop. A colour word is printed in a different ink;
// tap the INK colour, not the word. Trains inhibitory control, distinct
// from InhibitGame's go/no-go.
interface StroopGameProps {
  difficulty: number
  durationSecs: number
  muscleColor: string
  onComplete: (results: TrialResult[]) => void
  coachCue: string
  setNumber: number
}

const COLOURS: { name: string; hex: string }[] = [
  { name: 'RED', hex: '#F5503C' },
  { name: 'BLUE', hex: '#3C8BF5' },
  { name: 'GREEN', hex: '#5FD06E' },
  { name: 'YELLOW', hex: '#F5D93C' },
  { name: 'PURPLE', hex: '#A03CF5' },
  { name: 'ORANGE', hex: '#F58A3C' },
]

function getResponseWindow(difficulty: number): number {
  return Math.max(1500, 3400 - (difficulty - 1) * 150)
}

function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

interface Trial { word: string; ink: string; options: string[]; answerPos: number }

function makeTrial(difficulty: number): Trial {
  const count = difficulty <= 5 ? 4 : 6
  const wi = Math.floor(Math.random() * COLOURS.length)
  let ki = Math.floor(Math.random() * COLOURS.length)
  if (ki === wi) ki = (ki + 1) % COLOURS.length
  const word = COLOURS[wi].name
  const ink = COLOURS[ki].hex
  const inkName = COLOURS[ki].name
  // Options always include the ink (answer) and the word (the tempting trap).
  const others = shuffle(COLOURS.filter((_, i) => i !== wi && i !== ki).map(c => c.name))
  const opts = shuffle([inkName, COLOURS[wi].name, ...others].slice(0, count))
  if (!opts.includes(inkName)) opts[0] = inkName
  const options = shuffle(opts)
  return { word, ink, options, answerPos: options.indexOf(inkName) }
}

export default function StroopGame({
  difficulty, durationSecs, muscleColor, onComplete, coachCue, setNumber,
}: StroopGameProps) {
  const responseWindow = getResponseWindow(difficulty)

  const [trial, setTrial] = useState<Trial | null>(null)
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
    setTrial(makeTrial(difficulty))
    trialStartRef.current = performance.now()
    trialTimeoutRef.current = setTimeout(() => {
      if (doneRef.current || answeredRef.current) return
      answeredRef.current = true
      const result: TrialResult = { correct: false, reactionTimeMs: null }
      resultsRef.current = [...resultsRef.current, result]
      setResults(r => [...r, result])
      setFeedback('miss')
      playResult(false)
      setTimeout(() => { if (!doneRef.current) nextTrial() }, 450)
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
    setTimeout(() => { if (!doneRef.current) nextTrial() }, correct ? 300 : 500)
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
            <p className="text-hone-muted text-sm font-mono uppercase tracking-widest mb-6">SET {setNumber} · CONTROL</p>
            <div key={countIn} className="countdown-pulse font-mono text-9xl font-bold" style={{ color: muscleColor }}>{countIn}</div>
            <p className="text-hone-muted text-sm mt-8 max-w-xs mx-auto leading-relaxed">{coachCue}</p>
          </div>
        </div>
      )}

      <div className="h-1 bg-hone-surface flex-shrink-0">
        <div className="h-full transition-none" style={{ width: `${progressWidth}%`, backgroundColor: muscleColor }} />
      </div>

      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <p className="text-xs font-mono text-hone-muted uppercase tracking-widest">SET {setNumber} · CONTROL</p>
        <p className="font-mono text-2xl font-medium tabular-nums" style={{ color: timeLeft <= 10 ? '#F5503C' : muscleColor }}>
          {String(Math.floor(timeLeft / 60))}:{String(timeLeft % 60).padStart(2, '0')}
        </p>
      </div>

      <div className="px-4 mb-2 flex-shrink-0">
        <p className="text-hone-muted text-sm">
          {feedback === 'miss' ? <span className="text-hone-red">TOO SLOW</span>
            : feedback === 'wrong' ? <span className="text-hone-red">READ THE INK, NOT THE WORD</span>
            : <span className="font-semibold" style={{ color: muscleColor }}>TAP THE INK COLOUR</span>}
        </p>
      </div>

      {/* Stimulus word in its ink colour */}
      <div className="px-4 flex items-center justify-center" style={{ minHeight: 120 }}>
        {trial && (
          <span className="font-black text-6xl tracking-tight" style={{ color: trial.ink }}>
            {trial.word}
          </span>
        )}
      </div>

      {/* Options */}
      <div className="flex-1 flex items-start justify-center px-4 pt-4">
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
          {trial?.options.map((name, i) => {
            const isPicked = picked === i
            const showWrong = isPicked && feedback === 'wrong'
            const showHit = isPicked && feedback === 'hit'
            return (
              <button
                key={i}
                onClick={() => handlePick(i, trial.answerPos)}
                onTouchStart={e => { e.preventDefault(); handlePick(i, trial.answerPos) }}
                className="py-4 rounded-2xl border font-mono text-lg font-bold tracking-widest transition-all"
                style={{
                  borderColor: showHit ? muscleColor : showWrong ? '#F5503C' : '#2A2A36',
                  backgroundColor: showHit ? `${muscleColor}18` : showWrong ? '#F5503C18' : '#141418',
                  color: '#F0F0F0',
                }}
              >
                {name}
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
