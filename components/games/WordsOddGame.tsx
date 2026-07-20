'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { TrialResult } from '@/lib/scoring'
import { playResult } from '@/lib/feedback'

// WORDS variant — Odd Word Out. Three words share a category, one doesn't.
// Tap the outlier. Trains semantic categorisation, distinct from WordGame's
// synonym/antonym matching.
interface WordsOddGameProps {
  difficulty: number
  durationSecs: number
  muscleColor: string
  onComplete: (results: TrialResult[]) => void
  coachCue: string
  setNumber: number
}

const CATEGORIES: string[][] = [
  ['apple', 'pear', 'mango', 'plum', 'peach', 'grape', 'cherry', 'lemon'],
  ['tiger', 'otter', 'eagle', 'shark', 'horse', 'zebra', 'camel', 'moose'],
  ['amber', 'crimson', 'violet', 'indigo', 'olive', 'maroon', 'coral', 'teal'],
  ['elbow', 'ankle', 'wrist', 'spine', 'thumb', 'liver', 'knee', 'jaw'],
  ['copper', 'silver', 'bronze', 'nickel', 'cobalt', 'zinc', 'iron', 'tin'],
  ['thunder', 'drizzle', 'breeze', 'frost', 'hail', 'storm', 'mist', 'cloud'],
  ['hammer', 'wrench', 'chisel', 'pliers', 'drill', 'clamp', 'file', 'saw'],
  ['violin', 'cello', 'flute', 'oboe', 'piano', 'drum', 'harp', 'tuba'],
  ['saturn', 'venus', 'mars', 'pluto', 'neptune', 'mercury', 'uranus', 'earth'],
  ['cotton', 'linen', 'velvet', 'denim', 'silk', 'wool', 'satin', 'suede'],
]

function optionCount(difficulty: number): number {
  return difficulty <= 4 ? 4 : difficulty <= 8 ? 5 : 6
}

function getResponseWindow(difficulty: number): number {
  return Math.max(2200, 4600 - (difficulty - 1) * 190)
}

function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

export default function WordsOddGame({
  difficulty,
  durationSecs,
  muscleColor,
  onComplete,
  coachCue,
  setNumber,
}: WordsOddGameProps) {
  const count = optionCount(difficulty)
  const responseWindow = getResponseWindow(difficulty)

  const [words, setWords] = useState<string[]>([])
  const [oddPos, setOddPos] = useState<number>(-1)
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
    // Two distinct categories: count-1 words from A, 1 odd from B.
    const ci = Math.floor(Math.random() * CATEGORIES.length)
    let cj = Math.floor(Math.random() * CATEGORIES.length)
    if (cj === ci) cj = (cj + 1) % CATEGORIES.length
    const fromA = shuffle(CATEGORIES[ci]).slice(0, count - 1)
    const odd = shuffle(CATEGORIES[cj])[0]
    const arr = shuffle([...fromA, odd])
    const pos = arr.indexOf(odd)

    answeredRef.current = false
    setPicked(null)
    setFeedback(null)
    setWords(arr)
    setOddPos(pos)
    trialStartRef.current = performance.now()

    trialTimeoutRef.current = setTimeout(() => {
      if (doneRef.current || answeredRef.current) return
      answeredRef.current = true
      const result: TrialResult = { correct: false, reactionTimeMs: null }
      resultsRef.current = [...resultsRef.current, result]
      setResults(r => [...r, result])
      setFeedback('miss')
      playResult(false)
      setTimeout(() => { if (!doneRef.current) nextTrial() }, 500)
    }, responseWindow)
  }, [count, responseWindow])

  const handlePick = useCallback((i: number, odd: number) => {
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
    setTimeout(() => { if (!doneRef.current) nextTrial() }, correct ? 350 : 550)
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
            <p className="text-hone-muted text-sm font-mono uppercase tracking-widest mb-6">SET {setNumber} · WORDS</p>
            <div key={countIn} className="countdown-pulse font-mono text-9xl font-bold" style={{ color: muscleColor }}>{countIn}</div>
            <p className="text-hone-muted text-sm mt-8 max-w-xs mx-auto leading-relaxed">{coachCue}</p>
          </div>
        </div>
      )}

      <div className="h-1 bg-hone-surface flex-shrink-0">
        <div className="h-full transition-none" style={{ width: `${progressWidth}%`, backgroundColor: muscleColor }} />
      </div>

      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <p className="text-xs font-mono text-hone-muted uppercase tracking-widest">SET {setNumber} · WORDS</p>
        <p className="font-mono text-2xl font-medium tabular-nums" style={{ color: timeLeft <= 10 ? '#F5503C' : muscleColor }}>
          {String(Math.floor(timeLeft / 60))}:{String(timeLeft % 60).padStart(2, '0')}
        </p>
      </div>

      <div className="px-4 mb-3 flex-shrink-0">
        <p className="text-hone-muted text-sm">
          {feedback === 'miss' ? <span className="text-hone-red">TOO SLOW</span>
            : feedback === 'wrong' ? <span className="text-hone-red">NOT THE ODD ONE</span>
            : <span className="font-semibold" style={{ color: muscleColor }}>TAP THE WORD THAT DOESN&rsquo;T BELONG</span>}
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-xs flex flex-col gap-3">
          {words.map((w, i) => {
            const isPicked = picked === i
            const showWrong = isPicked && feedback === 'wrong'
            const showHit = isPicked && feedback === 'hit'
            return (
              <button
                key={`${w}-${i}`}
                onClick={() => handlePick(i, oddPos)}
                onTouchStart={e => { e.preventDefault(); handlePick(i, oddPos) }}
                className="w-full py-4 rounded-2xl border text-lg font-semibold capitalize transition-all"
                style={{
                  borderColor: showHit ? muscleColor : showWrong ? '#F5503C' : '#2A2A36',
                  backgroundColor: showHit ? `${muscleColor}18` : showWrong ? '#F5503C18' : '#141418',
                  color: '#F0F0F0',
                }}
              >
                {w}
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
