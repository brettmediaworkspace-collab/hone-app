'use client'

// Rapid Word Classification — WORDS muscle
// A word appears. Two category buttons. Tap the correct one as fast as possible.

import { useEffect, useRef, useState, useCallback } from 'react'
import { TrialResult } from '@/lib/scoring'

interface WordGameProps {
  difficulty: number
  durationSecs: number
  muscleColor: string
  onComplete: (results: TrialResult[]) => void
  coachCue: string
  setNumber: number
}

interface WordItem {
  word: string
  correct: 0 | 1  // index into the category pair
}

interface CategoryPair {
  labels: [string, string]
  items: WordItem[]
}

const CATEGORIES: CategoryPair[] = [
  {
    labels: ['LIVING', 'NON-LIVING'],
    items: [
      { word: 'DOLPHIN', correct: 0 }, { word: 'GRANITE', correct: 1 },
      { word: 'FERN', correct: 0 }, { word: 'TUNGSTEN', correct: 1 },
      { word: 'VIPER', correct: 0 }, { word: 'CHASSIS', correct: 1 },
      { word: 'SPORE', correct: 0 }, { word: 'PISTON', correct: 1 },
      { word: 'OSPREY', correct: 0 }, { word: 'SOLVENT', correct: 1 },
      { word: 'LICHEN', correct: 0 }, { word: 'ALLOY', correct: 1 },
      { word: 'MANTIS', correct: 0 }, { word: 'VALVE', correct: 1 },
    ],
  },
  {
    labels: ['FAST', 'SLOW'],
    items: [
      { word: 'LIGHTNING', correct: 0 }, { word: 'GLACIER', correct: 1 },
      { word: 'FALCON', correct: 0 }, { word: 'MOLASSES', correct: 1 },
      { word: 'SPRINT', correct: 0 }, { word: 'DRIFT', correct: 1 },
      { word: 'BULLET', correct: 0 }, { word: 'TRUDGE', correct: 1 },
      { word: 'BLITZ', correct: 0 }, { word: 'CREEP', correct: 1 },
      { word: 'SURGE', correct: 0 }, { word: 'AMBLE', correct: 1 },
      { word: 'ROCKET', correct: 0 }, { word: 'PLOD', correct: 1 },
    ],
  },
  {
    labels: ['SHARP', 'BLUNT'],
    items: [
      { word: 'SCALPEL', correct: 0 }, { word: 'PEBBLE', correct: 1 },
      { word: 'THORN', correct: 0 }, { word: 'SPONGE', correct: 1 },
      { word: 'FANG', correct: 0 }, { word: 'PILLOW', correct: 1 },
      { word: 'RAZOR', correct: 0 }, { word: 'BLOB', correct: 1 },
      { word: 'NEEDLE', correct: 0 }, { word: 'CLAY', correct: 1 },
      { word: 'SPIKE', correct: 0 }, { word: 'PUTTY', correct: 1 },
    ],
  },
  {
    labels: ['LOUD', 'QUIET'],
    items: [
      { word: 'THUNDER', correct: 0 }, { word: 'WHISPER', correct: 1 },
      { word: 'CANNON', correct: 0 }, { word: 'MURMUR', correct: 1 },
      { word: 'ROAR', correct: 0 }, { word: 'HUM', correct: 1 },
      { word: 'BLAST', correct: 0 }, { word: 'RUSTLE', correct: 1 },
      { word: 'CLANG', correct: 0 }, { word: 'SIGH', correct: 1 },
      { word: 'BANG', correct: 0 }, { word: 'TRICKLE', correct: 1 },
      { word: 'CRASH', correct: 0 }, { word: 'DRIP', correct: 1 },
    ],
  },
  {
    labels: ['ABSTRACT', 'CONCRETE'],
    items: [
      { word: 'JUSTICE', correct: 0 }, { word: 'ANVIL', correct: 1 },
      { word: 'FREEDOM', correct: 0 }, { word: 'BRACKET', correct: 1 },
      { word: 'IRONY', correct: 0 }, { word: 'PEBBLE', correct: 1 },
      { word: 'ENVY', correct: 0 }, { word: 'LADDER', correct: 1 },
      { word: 'COURAGE', correct: 0 }, { word: 'KEYHOLE', correct: 1 },
      { word: 'VIRTUE', correct: 0 }, { word: 'SOCKET', correct: 1 },
      { word: 'PARADOX', correct: 0 }, { word: 'CANOPY', correct: 1 },
    ],
  },
  {
    labels: ['WARM', 'COLD'],
    items: [
      { word: 'EMBERS', correct: 0 }, { word: 'TUNDRA', correct: 1 },
      { word: 'SAUNA', correct: 0 }, { word: 'PERMAFROST', correct: 1 },
      { word: 'LAVA', correct: 0 }, { word: 'SLEET', correct: 1 },
      { word: 'HEARTH', correct: 0 }, { word: 'FROST', correct: 1 },
      { word: 'FORGE', correct: 0 }, { word: 'GLACIER', correct: 1 },
      { word: 'TROPICS', correct: 0 }, { word: 'ARCTIC', correct: 1 },
    ],
  },
]

function getResponseWindow(difficulty: number): number {
  return Math.max(800, 2000 - (difficulty - 1) * 110)
}

export default function WordGame({
  difficulty,
  durationSecs,
  muscleColor,
  onComplete,
  coachCue,
  setNumber,
}: WordGameProps) {
  const responseWindow = getResponseWindow(difficulty)

  const [currentPair, setCurrentPair] = useState<CategoryPair | null>(null)
  const [currentItem, setCurrentItem] = useState<WordItem | null>(null)
  const [selected, setSelected] = useState<0 | 1 | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [results, setResults] = useState<TrialResult[]>([])
  const [timeLeft, setTimeLeft] = useState(durationSecs)
  const [countIn, setCountIn] = useState<number | null>(3)
  const [progressWidth, setProgressWidth] = useState(100)

  const usedItems = useRef<Set<string>>(new Set())
  const resultsRef = useRef<TrialResult[]>([])
  const doneRef = useRef(false)
  const trialStartRef = useRef(0)
  const trialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const nextTrial = useCallback(() => {
    if (doneRef.current) return

    // Pick a category (rotate through them based on difficulty)
    const catIdx = Math.floor(Math.random() * Math.min(CATEGORIES.length, 2 + Math.floor(difficulty / 3)))
    const cat = CATEGORIES[catIdx]

    // Pick an unused item from this category
    const available = cat.items.filter(item => !usedItems.current.has(`${catIdx}:${item.word}`))
    if (available.length === 0) {
      // Reset used items for this category
      cat.items.forEach(item => usedItems.current.delete(`${catIdx}:${item.word}`))
      available.push(...cat.items)
    }
    const item = available[Math.floor(Math.random() * available.length)]
    usedItems.current.add(`${catIdx}:${item.word}`)

    setCurrentPair(cat)
    setCurrentItem(item)
    setSelected(null)
    setFeedback(null)
    trialStartRef.current = performance.now()

    trialTimeoutRef.current = setTimeout(() => {
      if (doneRef.current) return
      const result: TrialResult = { correct: false, reactionTimeMs: null }
      resultsRef.current = [...resultsRef.current, result]
      setResults(r => [...r, result])
      setFeedback('wrong')
      trialTimeoutRef.current = setTimeout(() => {
        if (!doneRef.current) nextTrial()
      }, 400)
    }, responseWindow)
  }, [difficulty, responseWindow])

  const handleSelect = useCallback((choice: 0 | 1) => {
    if (doneRef.current || feedback !== null) return
    if (trialTimeoutRef.current) clearTimeout(trialTimeoutRef.current)

    const rt = Math.round(performance.now() - trialStartRef.current)
    const correct = choice === currentItem?.correct
    const result: TrialResult = { correct, reactionTimeMs: rt }
    resultsRef.current = [...resultsRef.current, result]
    setResults(r => [...r, result])
    setSelected(choice)
    setFeedback(correct ? 'correct' : 'wrong')

    trialTimeoutRef.current = setTimeout(() => {
      if (!doneRef.current) nextTrial()
    }, 450)
  }, [feedback, currentItem, nextTrial])

  useEffect(() => {
    let cnt = 3
    setCountIn(3)
    const iv = setInterval(() => {
      cnt -= 1
      if (cnt <= 0) {
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
          const pct = Math.max(0, 100 - ((Date.now() - startTime) / (durationSecs * 1000)) * 100)
          setProgressWidth(pct)
          if (pct <= 0) clearInterval(progressRef.current!)
        }, 50)

        nextTrial()
      } else {
        setCountIn(cnt)
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
  const recentResults = results.slice(-10)

  const avgRT = (() => {
    const rts = results.filter(r => r.correct && r.reactionTimeMs).map(r => r.reactionTimeMs!)
    return rts.length > 0 ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : null
  })()

  return (
    <div className="flex flex-col h-full no-select select-none">
      {countIn !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-hone-bg">
          <div className="text-center">
            <p className="text-hone-muted text-sm font-mono uppercase tracking-widest mb-6">SET {setNumber} · WORDS</p>
            <div key={countIn} className="countdown-pulse font-mono text-9xl font-bold" style={{ color: muscleColor }}>{countIn}</div>
            <p className="text-hone-muted text-sm mt-8 max-w-xs mx-auto leading-relaxed">{coachCue}</p>
            <p className="text-xs font-mono mt-3 text-hone-muted">Classify the word. Tap the right category. Fast.</p>
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

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {/* Word display */}
        <div
          className="w-full max-w-xs rounded-2xl flex items-center justify-center mb-10 py-10 border transition-all duration-150"
          style={{
            backgroundColor: feedback === 'correct'
              ? `${muscleColor}12`
              : feedback === 'wrong'
              ? 'rgba(245,80,60,0.08)'
              : '#141418',
            borderColor: feedback === 'correct'
              ? `${muscleColor}50`
              : feedback === 'wrong'
              ? 'rgba(245,80,60,0.4)'
              : '#2A2A36',
          }}
        >
          <p
            className="font-black text-4xl tracking-widest text-center"
            style={{ color: feedback === 'correct' ? muscleColor : feedback === 'wrong' ? '#F5503C' : '#F0F0F0' }}
          >
            {currentItem?.word ?? '...'}
          </p>
        </div>

        {/* Category buttons */}
        {currentPair && (
          <div className="flex gap-3 w-full max-w-xs">
            {([0, 1] as const).map(idx => {
              const label = currentPair.labels[idx]
              const isSelected = selected === idx
              const isCorrectAnswer = currentItem?.correct === idx
              let borderColor = '#2A2A36'
              let bgColor = '#141418'
              let textColor = '#6B6B80'

              if (isSelected) {
                borderColor = feedback === 'correct' ? muscleColor : '#F5503C'
                bgColor = feedback === 'correct' ? `${muscleColor}15` : 'rgba(245,80,60,0.1)'
                textColor = feedback === 'correct' ? muscleColor : '#F5503C'
              } else if (feedback === 'wrong' && isCorrectAnswer) {
                borderColor = `${muscleColor}60`
                bgColor = `${muscleColor}08`
                textColor = muscleColor
              } else if (!feedback) {
                textColor = '#F0F0F0'
                borderColor = '#2A2A36'
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  className="flex-1 py-5 rounded-2xl border font-mono font-bold uppercase tracking-widest text-sm transition-all active:scale-95"
                  style={{ backgroundColor: bgColor, borderColor, color: textColor }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="px-4 pb-4 flex-shrink-0">
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
          <p className="text-xs text-hone-muted uppercase tracking-widest mb-1 font-mono">KOVA</p>
          <p className="text-sm text-hone-text leading-relaxed">&ldquo;{coachCue}&rdquo;</p>
        </div>
      </div>
    </div>
  )
}
