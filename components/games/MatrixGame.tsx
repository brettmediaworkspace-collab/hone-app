'use client'

// Pattern Matrix - LOGIC muscle
// 3×3 grid of shape+colour combos, bottom-right cell missing.
// Each row uses one shape; each column uses one colour. Pick the missing cell.

import { useEffect, useRef, useState, useCallback } from 'react'
import { TrialResult } from '@/lib/scoring'
import { playResult } from '@/lib/feedback'

interface MatrixGameProps {
  difficulty: number
  durationSecs: number
  muscleColor: string
  onComplete: (results: TrialResult[]) => void
  coachCue: string
  setNumber: number
}

type Shape = 'circle' | 'square' | 'triangle' | 'diamond' | 'hexagon'

const ALL_SHAPES: Shape[] = ['circle', 'square', 'triangle', 'diamond', 'hexagon']
const ALL_COLORS = ['#B8F53C', '#3C8BF5', '#A03CF5', '#F58A3C', '#3CF5D1', '#F5503C', '#F0F0F0']

interface Cell { shape: Shape; color: string }

function ShapeCell({ shape, color, size = 28 }: { shape: Shape; color: string; size?: number }) {
  switch (shape) {
    case 'circle':
      return <svg width={size} height={size} viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill={color} /></svg>
    case 'square':
      return <svg width={size} height={size} viewBox="0 0 40 40"><rect x="5" y="5" width="30" height="30" rx="4" fill={color} /></svg>
    case 'triangle':
      return <svg width={size} height={size} viewBox="0 0 40 40"><polygon points="20,4 36,36 4,36" fill={color} /></svg>
    case 'diamond':
      return <svg width={size} height={size} viewBox="0 0 40 40"><polygon points="20,3 37,20 20,37 3,20" fill={color} /></svg>
    case 'hexagon':
      return <svg width={size} height={size} viewBox="0 0 40 40"><polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill={color} /></svg>
  }
}

function generateProblem(difficulty: number): { grid: (Cell | null)[][]; answer: Cell; distractors: Cell[] } {
  // Pick 3 shapes and 3 colors (more overlap at higher difficulty)
  const shapes = shuffle(ALL_SHAPES).slice(0, 3) as [Shape, Shape, Shape]
  const colors = shuffle(ALL_COLORS).slice(0, 3) as [string, string, string]

  // Build 3×3 grid: row i uses shapes[i], col j uses colors[j]
  const fullGrid: Cell[][] = shapes.map(shape =>
    colors.map(color => ({ shape, color }))
  )

  // Remove bottom-right cell (the answer)
  const answer = fullGrid[2][2]
  const grid: (Cell | null)[][] = fullGrid.map((row, r) =>
    row.map((cell, c) => (r === 2 && c === 2 ? null : cell))
  )

  // Generate distractors - wrong shape+color combos
  const distractors: Cell[] = []
  const used = new Set([`${answer.shape}:${answer.color}`])

  // At low difficulty: distractors are obviously different
  // At high difficulty: distractors share one attribute with answer
  const pool: Cell[] = []
  for (const s of ALL_SHAPES) {
    for (const c of ALL_COLORS) {
      const key = `${s}:${c}`
      if (!used.has(key)) pool.push({ shape: s, color: c })
    }
  }

  if (difficulty <= 4) {
    // Easy distractors: completely different shape AND color
    const easy = pool.filter(c => c.shape !== answer.shape && c.color !== answer.color)
    distractors.push(...shuffle(easy).slice(0, 3))
  } else {
    // Hard: 1-2 distractors share shape OR color (but not both)
    const shareShape = pool.filter(c => c.shape === answer.shape && c.color !== answer.color)
    const shareColor = pool.filter(c => c.shape !== answer.shape && c.color === answer.color)
    const combined = shuffle([...shareShape, ...shareColor])
    distractors.push(...combined.slice(0, 2))
    const remaining = pool.filter(c => !distractors.includes(c))
    distractors.push(...shuffle(remaining).slice(0, 1))
  }

  // Ensure we have exactly 3 distractors
  while (distractors.length < 3) {
    const fallback = pool.find(c => !distractors.some(d => d.shape === c.shape && d.color === c.color))
    if (fallback) distractors.push(fallback)
    else break
  }

  return { grid, answer, distractors: distractors.slice(0, 3) }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function MatrixGame({
  difficulty,
  durationSecs,
  muscleColor,
  onComplete,
  coachCue,
  setNumber,
}: MatrixGameProps) {
  const responseWindow = Math.max(3000, 7000 - (difficulty - 1) * 350)

  const [problem, setProblem] = useState<ReturnType<typeof generateProblem> | null>(null)
  const [choices, setChoices] = useState<Cell[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [results, setResults] = useState<TrialResult[]>([])
  const [timeLeft, setTimeLeft] = useState(durationSecs)
  const [countIn, setCountIn] = useState<number | null>(3)
  const [progressWidth, setProgressWidth] = useState(100)

  const resultsRef = useRef<TrialResult[]>([])
  const doneRef = useRef(false)
  const trialStartRef = useRef(0)
  const trialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const nextProblem = useCallback(() => {
    if (doneRef.current) return
    const p = generateProblem(difficulty)
    const allChoices = shuffle([p.answer, ...p.distractors])
    setProblem(p)
    setChoices(allChoices)
    setSelected(null)
    setFeedback(null)
    trialStartRef.current = performance.now()

    trialTimeoutRef.current = setTimeout(() => {
      if (doneRef.current) return
      // Timeout - miss
      const result: TrialResult = { correct: false, reactionTimeMs: null }
      resultsRef.current = [...resultsRef.current, result]
      setResults(r => [...r, result])
      setFeedback('wrong')
      playResult(false)
      trialTimeoutRef.current = setTimeout(() => {
        if (!doneRef.current) nextProblem()
      }, 500)
    }, responseWindow)
  }, [difficulty, responseWindow])

  const handleSelect = useCallback((idx: number, cell: Cell) => {
    if (doneRef.current || feedback !== null || selected !== null) return
    if (trialTimeoutRef.current) clearTimeout(trialTimeoutRef.current)

    const rt = Math.round(performance.now() - trialStartRef.current)
    const correct = cell.shape === problem?.answer.shape && cell.color === problem?.answer.color
    const result: TrialResult = { correct, reactionTimeMs: rt }
    resultsRef.current = [...resultsRef.current, result]
    setResults(r => [...r, result])
    setSelected(idx)
    setFeedback(correct ? 'correct' : 'wrong')
    playResult(correct)

    trialTimeoutRef.current = setTimeout(() => {
      if (!doneRef.current) nextProblem()
    }, 600)
  }, [feedback, selected, problem, nextProblem])

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

        nextProblem()
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
  const cellSize = 56

  return (
    <div className="flex flex-col h-full no-select select-none">
      {countIn !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-hone-bg">
          <div className="text-center">
            <p className="text-hone-muted text-sm font-mono uppercase tracking-widest mb-6">SET {setNumber} · LOGIC</p>
            <div key={countIn} className="countdown-pulse font-mono text-9xl font-bold" style={{ color: muscleColor }}>{countIn}</div>
            <p className="text-hone-muted text-sm mt-8 max-w-xs mx-auto leading-relaxed">{coachCue}</p>
            <p className="text-xs font-mono mt-3 text-hone-muted">Find the pattern. Pick what completes the grid.</p>
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

      <div className="px-4 mb-3 flex-shrink-0">
        <p className="text-sm text-hone-muted">
          <span className="font-semibold text-hone-text">Complete the pattern</span>
          <span className="text-hone-muted"> - find what goes in the missing cell</span>
        </p>
      </div>

      {/* Matrix grid */}
      <div className="flex-1 flex items-center justify-center px-4">
        {problem && (
          <div className="flex flex-col items-center gap-8 w-full">
            {/* 3×3 grid */}
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)', maxWidth: 220 }}>
              {problem.grid.map((row, r) =>
                row.map((cell, c) => (
                  <div
                    key={`${r}-${c}`}
                    className="aspect-square flex items-center justify-center rounded-xl border"
                    style={{
                      backgroundColor: cell ? '#1E1E26' : feedback === 'correct' ? `${muscleColor}15` : '#141418',
                      borderColor: cell ? '#2A2A36' : feedback === 'correct' ? muscleColor : feedback === 'wrong' ? '#F5503C' : `${muscleColor}60`,
                      width: cellSize,
                      height: cellSize,
                    }}
                  >
                    {cell ? (
                      <ShapeCell shape={cell.shape} color={cell.color} size={28} />
                    ) : (
                      feedback === 'correct' && selected !== null ? (
                        <ShapeCell shape={choices[selected].shape} color={choices[selected].color} size={28} />
                      ) : (
                        <span className="font-mono text-lg font-bold" style={{ color: `${muscleColor}80` }}>?</span>
                      )
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Answer choices */}
            <div className="grid grid-cols-4 gap-2 w-full max-w-xs">
              {choices.map((cell, idx) => {
                const isCorrect = cell.shape === problem.answer.shape && cell.color === problem.answer.color
                let borderColor = '#2A2A36'
                let bgColor = '#141418'

                if (selected === idx) {
                  borderColor = isCorrect ? muscleColor : '#F5503C'
                  bgColor = isCorrect ? `${muscleColor}15` : 'rgba(245,80,60,0.1)'
                } else if (feedback === 'wrong' && isCorrect) {
                  borderColor = muscleColor
                  bgColor = `${muscleColor}10`
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(idx, cell)}
                    className="aspect-square flex items-center justify-center rounded-xl border transition-all active:scale-95"
                    style={{ backgroundColor: bgColor, borderColor, width: cellSize, height: cellSize }}
                  >
                    <ShapeCell shape={cell.shape} color={cell.color} size={28} />
                  </button>
                )
              })}
            </div>
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
              {results.length > 0 ? Math.round((correctCount / results.length) * 100) : '-'}{results.length > 0 ? '%' : ''}
            </p>
            <p className="text-hone-muted text-xs font-mono uppercase tracking-widest mt-0.5">Accuracy</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-2xl font-medium text-hone-text">{correctCount}/{results.length}</p>
            <p className="text-hone-muted text-xs font-mono uppercase tracking-widest mt-0.5">Score</p>
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
