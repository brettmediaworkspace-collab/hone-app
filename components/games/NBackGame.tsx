'use client'

// N-Back working memory task
// Show shapes one at a time. Tap MATCH if current shape = shape shown N steps ago.

import { useEffect, useRef, useState, useCallback } from 'react'
import { TrialResult } from '@/lib/scoring'
import { playResult } from '@/lib/feedback'

interface NBackGameProps {
  difficulty: number
  durationSecs: number
  muscleColor: string
  onComplete: (results: TrialResult[]) => void
  coachCue: string
  setNumber: number
}

type Shape = 'circle' | 'square' | 'triangle' | 'diamond' | 'hexagon'
type TrialPhase = 'stimulus' | 'response' | 'feedback' | 'iti'

const SHAPES: Shape[] = ['circle', 'square', 'triangle', 'diamond', 'hexagon']
const COLORS = ['#B8F53C', '#3C8BF5', '#A03CF5', '#F58A3C', '#3CF5D1']

function getNValue(difficulty: number): number {
  return difficulty <= 4 ? 2 : 3
}

function getMatchRate(): number {
  return 0.35 // 35% of trials are matches
}

function ShapeDisplay({ shape, color, size = 100 }: { shape: Shape; color: string; size?: number }) {
  switch (shape) {
    case 'circle':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill={color} />
        </svg>
      )
    case 'square':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100">
          <rect x="12" y="12" width="76" height="76" rx="8" fill={color} />
        </svg>
      )
    case 'triangle':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100">
          <polygon points="50,8 92,88 8,88" fill={color} />
        </svg>
      )
    case 'diamond':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100">
          <polygon points="50,6 94,50 50,94 6,50" fill={color} />
        </svg>
      )
    case 'hexagon':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100">
          <polygon points="50,4 90,26 90,74 50,96 10,74 10,26" fill={color} />
        </svg>
      )
  }
}

export default function NBackGame({
  difficulty,
  durationSecs,
  muscleColor,
  onComplete,
  coachCue,
  setNumber,
}: NBackGameProps) {
  const n = getNValue(difficulty)
  const stimulusDuration = Math.max(600, 1000 - (difficulty - 1) * 35)
  const responseDuration = Math.max(800, 1400 - (difficulty - 1) * 55)

  const [phase, setPhase] = useState<TrialPhase>('iti')
  const [currentItem, setCurrentItem] = useState<{ shape: Shape; colorIdx: number } | null>(null)
  const [isMatch, setIsMatch] = useState(false)
  const [feedback, setFeedback] = useState<'hit' | 'correct-reject' | 'miss' | 'false-alarm' | null>(null)
  const [results, setResults] = useState<TrialResult[]>([])
  const [timeLeft, setTimeLeft] = useState(durationSecs)
  const [countIn, setCountIn] = useState<number | null>(3)
  const [progressWidth, setProgressWidth] = useState(100)
  const [nLabel] = useState(`${n}-BACK`)
  const [tapped, setTapped] = useState(false)

  const sequenceRef = useRef<{ shape: Shape; colorIdx: number }[]>([])
  const resultsRef = useRef<TrialResult[]>([])
  const doneRef = useRef(false)
  const isMatchRef = useRef(false)
  const tappedRef = useRef(false)
  const trialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const nextTrial = useCallback(() => {
    if (doneRef.current) return

    // Generate next item
    const seq = sequenceRef.current
    const shouldMatch = seq.length >= n && Math.random() < getMatchRate()
    let newItem: { shape: Shape; colorIdx: number }

    if (shouldMatch) {
      newItem = { ...seq[seq.length - n] }
    } else {
      // Ensure it doesn't accidentally match
      let shape: Shape, colorIdx: number
      do {
        shape = SHAPES[Math.floor(Math.random() * SHAPES.length)]
        colorIdx = Math.floor(Math.random() * COLORS.length)
        const nBack = seq.length >= n ? seq[seq.length - n] : null
        if (!nBack || shape !== nBack.shape || colorIdx !== nBack.colorIdx) break
      } while (false)
      newItem = { shape: shape!, colorIdx: colorIdx! }
    }

    sequenceRef.current = [...seq, newItem]
    const trialIsMatch = seq.length >= n &&
      seq[seq.length - n].shape === newItem.shape &&
      seq[seq.length - n].colorIdx === newItem.colorIdx

    isMatchRef.current = trialIsMatch
    setIsMatch(trialIsMatch)
    setCurrentItem(newItem)
    setPhase('stimulus')
    setFeedback(null)
    setTapped(false)
    tappedRef.current = false

    // After stimulus duration → response phase
    trialTimeoutRef.current = setTimeout(() => {
      if (doneRef.current) return
      setCurrentItem(null)
      setPhase('response')

      // After response window → evaluate
      trialTimeoutRef.current = setTimeout(() => {
        if (doneRef.current) return
        const didTap = tappedRef.current
        const wasMatch = isMatchRef.current

        let result: TrialResult
        let fb: typeof feedback

        if (wasMatch && didTap) {
          result = { correct: true, reactionTimeMs: responseDuration - 100 }
          fb = 'hit'
        } else if (!wasMatch && !didTap) {
          result = { correct: true, reactionTimeMs: null }
          fb = 'correct-reject'
        } else if (wasMatch && !didTap) {
          result = { correct: false, reactionTimeMs: null }
          fb = 'miss'
        } else {
          result = { correct: false, reactionTimeMs: null }
          fb = 'false-alarm'
        }

        resultsRef.current = [...resultsRef.current, result]
        setResults(r => [...r, result])
        setFeedback(fb)
        if (fb !== 'correct-reject') playResult(result.correct)
        setPhase('feedback')

        trialTimeoutRef.current = setTimeout(() => {
          if (!doneRef.current) nextTrial()
        }, 300)
      }, responseDuration)
    }, stimulusDuration)
  }, [n, stimulusDuration, responseDuration])

  const handleTap = useCallback(() => {
    if (doneRef.current || phase !== 'response' || tappedRef.current) return
    tappedRef.current = true
    setTapped(true)
    const wasMatch = isMatchRef.current
    const result: TrialResult = { correct: wasMatch, reactionTimeMs: wasMatch ? 400 : null }
    resultsRef.current = [...resultsRef.current, result]
    setResults(r => [...r, result])
    setFeedback(wasMatch ? 'hit' : 'false-alarm')
    playResult(wasMatch)

    if (trialTimeoutRef.current) clearTimeout(trialTimeoutRef.current)
    trialTimeoutRef.current = setTimeout(() => {
      if (!doneRef.current) {
        setPhase('feedback')
        trialTimeoutRef.current = setTimeout(() => {
          if (!doneRef.current) nextTrial()
        }, 250)
      }
    }, 50)
  }, [phase, nextTrial])

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

  let instructionText = '-'
  let instructionColor = '#6B6B80'
  if (phase === 'stimulus') {
    instructionText = `REMEMBER THIS`
    instructionColor = muscleColor
  } else if (phase === 'response') {
    instructionText = tapped ? 'MATCH ✓' : `DID IT MATCH ${nLabel}?`
    instructionColor = tapped ? muscleColor : '#F0F0F0'
  } else if (feedback === 'hit') {
    instructionText = 'CORRECT MATCH'
    instructionColor = muscleColor
  } else if (feedback === 'false-alarm') {
    instructionText = 'FALSE ALARM'
    instructionColor = '#F5503C'
  } else if (feedback === 'miss') {
    instructionText = 'MISSED IT'
    instructionColor = '#F5503C'
  } else if (feedback === 'correct-reject') {
    instructionText = 'GOOD HOLD'
    instructionColor = muscleColor
  }

  const shapeColor = currentItem ? COLORS[currentItem.colorIdx] : muscleColor

  return (
    <div className="flex flex-col h-full no-select select-none">
      {countIn !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-hone-bg">
          <div className="text-center">
            <p className="text-hone-muted text-sm font-mono uppercase tracking-widest mb-6">
              SET {setNumber} · MEMORY · {nLabel}
            </p>
            <div key={countIn} className="countdown-pulse font-mono text-9xl font-bold" style={{ color: muscleColor }}>
              {countIn}
            </div>
            <p className="text-hone-muted text-sm mt-8 max-w-xs mx-auto leading-relaxed">{coachCue}</p>
            <p className="text-xs font-mono mt-4" style={{ color: muscleColor }}>
              TAP if current shape = shape {n} steps ago
            </p>
          </div>
        </div>
      )}

      <div className="h-1 bg-hone-surface flex-shrink-0">
        <div className="h-full transition-none" style={{ width: `${progressWidth}%`, backgroundColor: muscleColor }} />
      </div>

      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <div>
          <p className="text-xs font-mono text-hone-muted uppercase tracking-widest">SET {setNumber} · MEMORY</p>
          <p className="text-xs font-mono mt-0.5" style={{ color: muscleColor }}>{nLabel}</p>
        </div>
        <p className="font-mono text-2xl font-medium tabular-nums" style={{ color: timeLeft <= 10 ? '#F5503C' : muscleColor }}>
          {String(Math.floor(timeLeft / 60))}:{String(timeLeft % 60).padStart(2, '0')}
        </p>
      </div>

      {/* N-back sequence preview - last N items (blurred) */}
      <div className="px-4 mb-2 flex-shrink-0">
        <div className="flex gap-1.5 items-center">
          <p className="text-xs font-mono text-hone-muted uppercase tracking-widest mr-2">SEQUENCE</p>
          {sequenceRef.current.slice(-Math.max(n + 1, 5)).map((item, i, arr) => {
            const isNBack = i === arr.length - n - 1
            return (
              <div
                key={i}
                className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  backgroundColor: isNBack ? `${COLORS[item.colorIdx]}20` : 'rgba(255,255,255,0.04)',
                  border: isNBack ? `1px solid ${COLORS[item.colorIdx]}60` : '1px solid #2A2A36',
                  opacity: i === arr.length - 1 ? 0 : 1,
                }}
              >
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: COLORS[item.colorIdx] }} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Main stimulus + response area */}
      <div
        className="flex-1 flex flex-col items-center justify-center cursor-pointer"
        onClick={handleTap}
        onTouchEnd={e => { e.preventDefault(); handleTap() }}
      >
        {/* Shape display */}
        <div
          className="w-44 h-44 rounded-3xl flex items-center justify-center mb-6 transition-all duration-150"
          style={{
            backgroundColor: currentItem ? `${COLORS[currentItem.colorIdx]}12` : '#141418',
            border: currentItem
              ? `2px solid ${COLORS[currentItem.colorIdx]}50`
              : '2px solid #2A2A36',
            boxShadow: currentItem ? `0 0 30px ${COLORS[currentItem.colorIdx]}20` : 'none',
          }}
        >
          {currentItem ? (
            <ShapeDisplay shape={currentItem.shape} color={shapeColor} size={96} />
          ) : (
            <div className="text-center">
              {phase === 'response' && !tapped ? (
                <div>
                  <p className="font-mono font-bold text-2xl" style={{ color: muscleColor }}>TAP</p>
                  <p className="text-xs text-hone-muted font-mono mt-1">if it matched {n} ago</p>
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl border-2 border-hone-border opacity-20" />
              )}
            </div>
          )}
        </div>

        {/* Instruction */}
        <p className="font-semibold text-base" style={{ color: instructionColor }}>
          {instructionText}
        </p>

        {/* Tap hint ring during response */}
        {phase === 'response' && !tapped && (
          <div
            className="mt-4 w-16 h-16 rounded-full border-2 flex items-center justify-center"
            style={{ borderColor: `${muscleColor}40` }}
          >
            <div className="w-8 h-8 rounded-full animate-pulse" style={{ backgroundColor: `${muscleColor}30` }} />
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
