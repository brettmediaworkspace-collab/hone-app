'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { TrialResult } from '@/lib/scoring'

// Go/No-Go task: tap GO shapes, ignore NO-GO shapes
// GO = circle, NO-GO = everything else
// False alarm (tapping no-go) = -2 penalty

interface InhibitGameProps {
  difficulty: number
  durationSecs: number
  muscleColor: string
  onComplete: (results: TrialResult[]) => void
  coachCue: string
  setNumber: number
}

type Shape = 'circle' | 'square' | 'triangle' | 'diamond' | 'hexagon'
type TrialPhase = 'stimulus' | 'feedback' | 'iti'

const GO_SHAPE: Shape = 'circle'

// At higher difficulty, more no-go trials (harder to inhibit when rare go signals needed)
function getNoGoRatio(difficulty: number): number {
  return Math.min(0.65, 0.35 + (difficulty - 1) * 0.025)
}

function getStimulusDuration(difficulty: number): number {
  return Math.max(600, 1200 - (difficulty - 1) * 55)
}

function ShapeLarge({ shape, color, size = 120 }: { shape: Shape; color: string; size?: number }) {
  const s = size * 0.72
  switch (shape) {
    case 'circle':
      return (
        <svg width={size} height={size} viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="44" fill={color} />
        </svg>
      )
    case 'square':
      return (
        <svg width={size} height={size} viewBox="0 0 120 120">
          <rect x={60 - s / 2} y={60 - s / 2} width={s} height={s} rx="8" fill={color} />
        </svg>
      )
    case 'triangle':
      return (
        <svg width={size} height={size} viewBox="0 0 120 120">
          <polygon points="60,14 104,100 16,100" fill={color} />
        </svg>
      )
    case 'diamond':
      return (
        <svg width={size} height={size} viewBox="0 0 120 120">
          <polygon points="60,10 106,60 60,110 14,60" fill={color} />
        </svg>
      )
    case 'hexagon':
      return (
        <svg width={size} height={size} viewBox="0 0 120 120">
          <polygon points="60,8 104,32 104,80 60,104 16,80 16,32" fill={color} />
        </svg>
      )
  }
}

const NO_GO_SHAPES: Shape[] = ['square', 'triangle', 'diamond', 'hexagon']

export default function InhibitGame({
  difficulty,
  durationSecs,
  muscleColor,
  onComplete,
  coachCue,
  setNumber,
}: InhibitGameProps) {
  const noGoRatio = getNoGoRatio(difficulty)
  const stimulusDuration = getStimulusDuration(difficulty)

  const [currentShape, setCurrentShape] = useState<Shape | null>(null)
  const [trialPhase, setTrialPhase] = useState<TrialPhase>('iti')
  const [feedback, setFeedback] = useState<'correct' | 'false-alarm' | 'miss' | null>(null)
  const [results, setResults] = useState<TrialResult[]>([])
  const [timeLeft, setTimeLeft] = useState(durationSecs)
  const [countIn, setCountIn] = useState<number | null>(3)
  const [progressWidth, setProgressWidth] = useState(100)
  const [tapped, setTapped] = useState(false)

  const resultsRef = useRef<TrialResult[]>([])
  const doneRef = useRef(false)
  const trialStartRef = useRef(0)
  const trialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentShapeRef = useRef<Shape | null>(null)
  const tappedRef = useRef(false)

  const nextTrial = useCallback(() => {
    if (doneRef.current) return

    // Inter-trial interval
    setTrialPhase('iti')
    setCurrentShape(null)
    setFeedback(null)
    setTapped(false)
    tappedRef.current = false

    trialTimeoutRef.current = setTimeout(() => {
      if (doneRef.current) return

      // Pick shape
      const isGoTrial = Math.random() > noGoRatio
      const shape: Shape = isGoTrial
        ? GO_SHAPE
        : NO_GO_SHAPES[Math.floor(Math.random() * NO_GO_SHAPES.length)]

      currentShapeRef.current = shape
      setCurrentShape(shape)
      setTrialPhase('stimulus')
      trialStartRef.current = performance.now()

      // Auto-advance after stimulus duration
      trialTimeoutRef.current = setTimeout(() => {
        if (doneRef.current) return
        const didTap = tappedRef.current
        const isGo = currentShapeRef.current === GO_SHAPE

        let result: TrialResult
        if (isGo && !didTap) {
          // Miss: should have tapped but didn't
          result = { correct: false, reactionTimeMs: null }
          setFeedback('miss')
        } else if (!isGo && !didTap) {
          // Correct inhibition
          result = { correct: true, reactionTimeMs: null }
          setFeedback('correct')
        } else {
          // Was handled by tap handler already
          result = { correct: isGo, reactionTimeMs: null }
        }

        if (!didTap) {
          resultsRef.current = [...resultsRef.current, result]
          setResults(r => [...r, result])
        }

        setTrialPhase('feedback')
        trialTimeoutRef.current = setTimeout(() => {
          if (!doneRef.current) nextTrial()
        }, 300)
      }, stimulusDuration)
    }, 250)
  }, [noGoRatio, stimulusDuration])

  const handleTap = useCallback(() => {
    if (doneRef.current || trialPhase !== 'stimulus' || tappedRef.current) return
    tappedRef.current = true
    setTapped(true)

    const rt = Math.round(performance.now() - trialStartRef.current)
    const isGo = currentShapeRef.current === GO_SHAPE

    const result: TrialResult = {
      correct: isGo,
      reactionTimeMs: isGo ? rt : null,
    }
    resultsRef.current = [...resultsRef.current, result]
    setResults(r => [...r, result])
    setFeedback(isGo ? 'correct' : 'false-alarm')
  }, [trialPhase])

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
  const totalTrials = results.length
  const recentResults = results.slice(-10)
  const falseAlarms = results.filter(r => !r.correct && r.reactionTimeMs === null).length

  let instructionEl
  if (trialPhase === 'stimulus' && currentShape === GO_SHAPE) {
    instructionEl = <span className="font-bold" style={{ color: muscleColor }}>TAP</span>
  } else if (trialPhase === 'stimulus') {
    instructionEl = <span className="text-hone-muted font-bold">HOLD</span>
  } else if (feedback === 'false-alarm') {
    instructionEl = <span className="text-hone-red font-bold">FALSE ALARM</span>
  } else if (feedback === 'miss') {
    instructionEl = <span className="text-hone-muted">MISSED</span>
  } else {
    instructionEl = <span className="text-hone-muted">—</span>
  }

  // Shape display colour
  let shapeColor = '#2A2A36'
  if (trialPhase === 'stimulus') {
    shapeColor = currentShape === GO_SHAPE ? muscleColor : '#6B6B80'
  } else if (feedback === 'correct') {
    shapeColor = muscleColor
  } else if (feedback === 'false-alarm') {
    shapeColor = '#F5503C'
  } else if (feedback === 'miss') {
    shapeColor = '#F5503C'
  }

  return (
    <div className="flex flex-col h-full no-select select-none">
      {countIn !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-hone-bg">
          <div className="text-center">
            <p className="text-hone-muted text-sm font-mono uppercase tracking-widest mb-6">
              SET {setNumber} · CONTROL
            </p>
            <div key={countIn} className="countdown-pulse font-mono text-9xl font-bold" style={{ color: muscleColor }}>
              {countIn}
            </div>
            <div className="mt-8 max-w-xs mx-auto">
              <p className="text-hone-muted text-sm mb-4 leading-relaxed">{coachCue}</p>
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center border-2" style={{ borderColor: muscleColor }}>
                    <ShapeLarge shape="circle" color={muscleColor} size={36} />
                  </div>
                  <p className="text-xs font-mono uppercase tracking-widest" style={{ color: muscleColor }}>TAP</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center border-2 border-hone-border">
                    <ShapeLarge shape="square" color="#6B6B80" size={36} />
                  </div>
                  <p className="text-xs font-mono uppercase tracking-widest text-hone-muted">HOLD</p>
                </div>
              </div>
            </div>
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

      <div className="px-4 mb-4 flex-shrink-0 flex items-center gap-3">
        <p className="text-sm">{instructionEl}</p>
        <p className="text-xs font-mono text-hone-muted ml-auto">
          TAP ● · HOLD ALL ELSE
        </p>
      </div>

      {/* Main game area */}
      <div
        className="flex-1 flex items-center justify-center cursor-pointer active:scale-95 transition-transform duration-75"
        onClick={handleTap}
        onTouchEnd={e => { e.preventDefault(); handleTap() }}
      >
        <div
          className="relative flex items-center justify-center rounded-full transition-all duration-150"
          style={{
            width: 180,
            height: 180,
            backgroundColor: currentShape ? `${shapeColor}15` : 'transparent',
            boxShadow: trialPhase === 'stimulus' && currentShape === GO_SHAPE
              ? `0 0 40px ${muscleColor}40`
              : feedback === 'false-alarm'
              ? '0 0 40px rgba(245,80,60,0.3)'
              : 'none',
          }}
        >
          {currentShape ? (
            <ShapeLarge shape={currentShape} color={shapeColor} size={120} />
          ) : (
            <div className="w-16 h-16 rounded-full border-2 border-hone-border opacity-20" />
          )}

          {/* Tap hint for go trial */}
          {trialPhase === 'stimulus' && currentShape === GO_SHAPE && !tapped && (
            <div
              className="absolute inset-0 rounded-full border-2 animate-ping opacity-30"
              style={{ borderColor: muscleColor }}
            />
          )}
        </div>
      </div>

      {/* Bottom stats */}
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
              {totalTrials > 0 ? Math.round((correctCount / totalTrials) * 100) : '—'}{totalTrials > 0 ? '%' : ''}
            </p>
            <p className="text-hone-muted text-xs font-mono uppercase tracking-widest mt-0.5">Accuracy</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-2xl font-medium" style={{ color: falseAlarms > 0 ? '#F5503C' : '#F0F0F0' }}>
              {falseAlarms}
            </p>
            <p className="text-hone-muted text-xs font-mono uppercase tracking-widest mt-0.5">False alarms</p>
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
