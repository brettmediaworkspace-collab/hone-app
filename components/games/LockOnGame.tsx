'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { TrialResult } from '@/lib/scoring'

type Shape = 'circle' | 'square' | 'triangle' | 'diamond' | 'hexagon'
type Phase = 'ready' | 'highlight' | 'response' | 'feedback' | 'complete'

interface Cell {
  id: number
  shape: Shape
}

interface LockOnGameProps {
  difficulty: number         // 1-12
  durationSecs: number       // total set duration
  muscleColor: string
  onComplete: (results: TrialResult[]) => void
  coachCue: string
  setNumber: number
}

const SHAPES: Shape[] = ['circle', 'square', 'triangle', 'diamond', 'hexagon']

function getGridSize(difficulty: number): number {
  if (difficulty <= 2) return 3
  if (difficulty <= 5) return 4
  return 5
}

function getHighlightDuration(difficulty: number): number {
  // 1200ms at diff 1 → 400ms at diff 12
  return Math.max(400, 1200 - (difficulty - 1) * 70)
}

function getResponseWindow(difficulty: number): number {
  // 2000ms at diff 1 → 800ms at diff 12
  return Math.max(800, 2000 - (difficulty - 1) * 100)
}

function ShapeIcon({ shape, size = 32 }: { shape: Shape; size?: number }) {
  const s = size * 0.72
  switch (shape) {
    case 'circle':
      return (
        <svg width={size} height={size} viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="15" fill="currentColor" />
        </svg>
      )
    case 'square':
      return (
        <svg width={size} height={size} viewBox="0 0 40 40">
          <rect x={20 - s / 2} y={20 - s / 2} width={s} height={s} rx="3" fill="currentColor" />
        </svg>
      )
    case 'triangle':
      return (
        <svg width={size} height={size} viewBox="0 0 40 40">
          <polygon points="20,6 35,34 5,34" fill="currentColor" />
        </svg>
      )
    case 'diamond':
      return (
        <svg width={size} height={size} viewBox="0 0 40 40">
          <polygon points="20,5 35,20 20,35 5,20" fill="currentColor" />
        </svg>
      )
    case 'hexagon':
      return (
        <svg width={size} height={size} viewBox="0 0 40 40">
          <polygon points="20,4 34,12 34,28 20,36 6,28 6,12" fill="currentColor" />
        </svg>
      )
  }
}

export default function LockOnGame({
  difficulty,
  durationSecs,
  muscleColor,
  onComplete,
  coachCue,
  setNumber,
}: LockOnGameProps) {
  const gridSize = getGridSize(difficulty)
  const totalCells = gridSize * gridSize
  const highlightDuration = getHighlightDuration(difficulty)
  const responseWindow = getResponseWindow(difficulty)

  const [cells, setCells] = useState<Cell[]>([])
  const [phase, setPhase] = useState<Phase>('ready')
  const [highlightedId, setHighlightedId] = useState<number | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [feedbackCorrect, setFeedbackCorrect] = useState<boolean | null>(null)
  const [results, setResults] = useState<TrialResult[]>([])
  const [timeLeft, setTimeLeft] = useState(durationSecs)
  const [countIn, setCountIn] = useState<number | null>(3)
  const [progressWidth, setProgressWidth] = useState(100)

  const trialStartRef = useRef<number>(0)
  const correctIdRef = useRef<number>(-1)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const resultsRef = useRef<TrialResult[]>([])
  const doneRef = useRef(false)
  const trialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const generateGrid = useCallback(() => {
    const newCells: Cell[] = Array.from({ length: totalCells }, (_, i) => ({
      id: i,
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    }))
    setCells(newCells)
    return newCells
  }, [totalCells])

  const runTrial = useCallback(
    (currentCells: Cell[]) => {
      if (doneRef.current) return

      const targetId = Math.floor(Math.random() * currentCells.length)
      correctIdRef.current = targetId
      setHighlightedId(targetId)
      setSelectedId(null)
      setFeedbackCorrect(null)
      setPhase('highlight')

      trialTimeoutRef.current = setTimeout(() => {
        if (doneRef.current) return
        setHighlightedId(null)
        setPhase('response')
        trialStartRef.current = performance.now()

        trialTimeoutRef.current = setTimeout(() => {
          if (doneRef.current) return
          // timeout — count as miss
          const result: TrialResult = { correct: false, reactionTimeMs: null }
          resultsRef.current = [...resultsRef.current, result]
          setResults(r => [...r, result])
          setFeedbackCorrect(false)
          setPhase('feedback')

          trialTimeoutRef.current = setTimeout(() => {
            if (doneRef.current) return
            const newCells = generateGrid()
            runTrial(newCells)
          }, 350)
        }, responseWindow)
      }, highlightDuration)
    },
    [generateGrid, highlightDuration, responseWindow]
  )

  const handleCellTap = useCallback(
    (id: number) => {
      if (phase !== 'response' || doneRef.current) return

      if (trialTimeoutRef.current) clearTimeout(trialTimeoutRef.current)

      const rt = Math.round(performance.now() - trialStartRef.current)
      const correct = id === correctIdRef.current
      const result: TrialResult = { correct, reactionTimeMs: rt }
      resultsRef.current = [...resultsRef.current, result]
      setResults(r => [...r, result])
      setSelectedId(id)
      setFeedbackCorrect(correct)
      setHighlightedId(correctIdRef.current)
      setPhase('feedback')

      trialTimeoutRef.current = setTimeout(() => {
        if (doneRef.current) return
        const newCells = generateGrid()
        runTrial(newCells)
      }, 350)
    },
    [phase, generateGrid, runTrial]
  )

  // Count-in
  useEffect(() => {
    let n = 3
    setCountIn(3)
    const iv = setInterval(() => {
      n -= 1
      if (n <= 0) {
        clearInterval(iv)
        setCountIn(null)
        const initialCells = generateGrid()
        // Start timer
        timerRef.current = setInterval(() => {
          setTimeLeft(t => {
            if (t <= 1) {
              clearInterval(timerRef.current!)
              doneRef.current = true
              if (trialTimeoutRef.current) clearTimeout(trialTimeoutRef.current)
              setTimeout(() => onComplete(resultsRef.current), 400)
              return 0
            }
            return t - 1
          })
        }, 1000)

        // Progress bar
        const startTime = Date.now()
        progressRef.current = setInterval(() => {
          const elapsed = Date.now() - startTime
          const pct = Math.max(0, 100 - (elapsed / (durationSecs * 1000)) * 100)
          setProgressWidth(pct)
          if (pct <= 0) clearInterval(progressRef.current!)
        }, 50)

        runTrial(initialCells)
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
  const totalTrials = results.length
  const dotCount = Math.min(10, totalTrials)
  const recentResults = results.slice(-10)

  return (
    <div className="flex flex-col h-full no-select select-none">
      {/* Count-in overlay */}
      {countIn !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-hone-bg">
          <div className="text-center">
            <p className="text-hone-muted text-sm font-mono uppercase tracking-widest mb-6">
              SET {setNumber} · FOCUS
            </p>
            <div
              key={countIn}
              className="countdown-pulse font-mono text-9xl font-bold"
              style={{ color: muscleColor }}
            >
              {countIn}
            </div>
            <p className="text-hone-muted text-sm mt-8 max-w-xs mx-auto leading-relaxed">
              {coachCue}
            </p>
          </div>
        </div>
      )}

      {/* Timer bar */}
      <div className="h-1 bg-hone-surface flex-shrink-0">
        <div
          className="h-full transition-none"
          style={{
            width: `${progressWidth}%`,
            backgroundColor: muscleColor,
            transitionTimingFunction: 'linear',
          }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <div>
          <p className="text-xs font-mono text-hone-muted uppercase tracking-widest">
            SET {setNumber} · FOCUS
          </p>
        </div>
        <div className="text-right">
          <p
            className="font-mono text-2xl font-medium tabular-nums"
            style={{ color: timeLeft <= 10 ? '#F5503C' : muscleColor }}
          >
            {String(Math.floor(timeLeft / 60)).padStart(1, '0')}:
            {String(timeLeft % 60).padStart(2, '0')}
          </p>
        </div>
      </div>

      {/* Task instruction */}
      <div className="px-4 mb-3 flex-shrink-0">
        <p className="text-hone-muted text-sm">
          {phase === 'highlight' ? (
            <span style={{ color: muscleColor }} className="font-semibold">
              MEMORISE THE SHAPE
            </span>
          ) : phase === 'response' ? (
            <span className="text-hone-text font-semibold">TAP IT</span>
          ) : (
            <span className="text-hone-muted">—</span>
          )}
        </p>
      </div>

      {/* Game grid */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div
          className="grid gap-2 w-full"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            maxWidth: gridSize === 3 ? 300 : gridSize === 4 ? 340 : 360,
          }}
        >
          {cells.map(cell => {
            const isHighlighted = cell.id === highlightedId
            const isSelected = cell.id === selectedId
            const isCorrectReveal =
              phase === 'feedback' && cell.id === correctIdRef.current

            let cellClass =
              'aspect-square flex items-center justify-center rounded-xl border border-hone-border transition-all duration-150 cursor-pointer active:scale-95 '

            if (isHighlighted) {
              cellClass += 'shape-highlight border-transparent '
            } else if (isSelected && feedbackCorrect === false) {
              cellClass += 'shape-wrong border-transparent '
            } else if (isCorrectReveal) {
              cellClass += 'shape-correct border-transparent '
            } else {
              cellClass += 'bg-hone-card hover:bg-hone-surface '
            }

            const iconColor = isHighlighted
              ? muscleColor
              : isCorrectReveal
              ? muscleColor
              : isSelected && feedbackCorrect === false
              ? '#F5503C'
              : '#3A3A4A'

            return (
              <button
                key={cell.id}
                className={cellClass}
                onClick={() => handleCellTap(cell.id)}
                onTouchEnd={e => {
                  e.preventDefault()
                  handleCellTap(cell.id)
                }}
              >
                <div style={{ color: iconColor }}>
                  <ShapeIcon shape={cell.shape} size={gridSize === 5 ? 28 : 34} />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Score dots + stats */}
      <div className="px-4 pb-4 flex-shrink-0">
        {/* Score dots */}
        <div className="flex gap-1.5 justify-center mb-3">
          {Array.from({ length: Math.max(10, totalTrials) }).map((_, i) => {
            const result = recentResults[i]
            if (!result) {
              return (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full bg-hone-border"
                />
              )
            }
            return (
              <div
                key={i}
                className="w-3 h-3 rounded-full score-dot-fill"
                style={{ backgroundColor: result.correct ? muscleColor : '#F5503C' }}
              />
            )
          })}
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between">
          <div className="text-center">
            <p className="font-mono text-2xl font-medium" style={{ color: muscleColor }}>
              {totalTrials > 0 ? Math.round((correctCount / totalTrials) * 100) : '—'}
              {totalTrials > 0 ? '%' : ''}
            </p>
            <p className="text-hone-muted text-xs font-mono uppercase tracking-widest mt-0.5">
              Accuracy
            </p>
          </div>
          <div className="text-center">
            <p className="font-mono text-2xl font-medium text-hone-text">
              {correctCount}/{totalTrials}
            </p>
            <p className="text-hone-muted text-xs font-mono uppercase tracking-widest mt-0.5">
              Score
            </p>
          </div>
          <div className="text-center">
            <p className="font-mono text-2xl font-medium text-hone-blue">
              LVL {difficulty}
            </p>
            <p className="text-hone-muted text-xs font-mono uppercase tracking-widest mt-0.5">
              Difficulty
            </p>
          </div>
        </div>

        {/* Coach cue */}
        <div className="mt-3 pt-3 border-t border-hone-border">
          <p className="text-xs text-hone-muted uppercase tracking-widest mb-1 font-mono">
            KOVA
          </p>
          <p className="text-sm text-hone-text leading-relaxed">
            &ldquo;{coachCue}&rdquo;
          </p>
        </div>
      </div>
    </div>
  )
}
