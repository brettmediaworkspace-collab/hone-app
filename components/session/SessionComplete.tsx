'use client'

import { useEffect, useRef, useState } from 'react'
import { SetScore } from '@/lib/scoring'
import { getMuscleColor } from '@/lib/gameState'
import { isPro as getIsPro } from '@/lib/subscription'
import { playCelebration, playSetComplete } from '@/lib/feedback'
import PaywallScreen from '@/components/PaywallScreen'

interface SessionCompleteProps {
  muscleGroup: string
  set1: SetScore
  set2: SetScore
  set3: SetScore
  sessionScore: number
  honesScore: number
  prevHonesScore: number
  streak: number
  isPersonalRecord: boolean
  dayNumber: number
  onDone: () => void
}

export default function SessionComplete({
  muscleGroup,
  set1,
  set2,
  set3,
  sessionScore,
  honesScore,
  prevHonesScore,
  streak,
  isPersonalRecord,
  dayNumber,
  onDone,
}: SessionCompleteProps) {
  const color = getMuscleColor(muscleGroup)
  const [displayScore, setDisplayScore] = useState(0)
  const [showPRCard, setShowPRCard] = useState(false)
  const [isPRFlashing, setIsPRFlashing] = useState(false)
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Count up score
    const target = sessionScore
    const duration = 1200
    const steps = 40
    const increment = target / steps
    let current = 0

    countRef.current = setInterval(() => {
      current += increment
      if (current >= target) {
        setDisplayScore(target)
        clearInterval(countRef.current!)
        if (isPersonalRecord) {
          playCelebration()
          setTimeout(() => setIsPRFlashing(true), 400)
        } else {
          playSetComplete()
        }
      } else {
        setDisplayScore(Math.round(current))
      }
    }, duration / steps)

    return () => clearInterval(countRef.current!)
  }, [sessionScore, isPersonalRecord])

  const delta = honesScore - prevHonesScore
  const sets = [set1, set2, set3]

  const KOVA_NOTES = [
    `${muscleGroup} is responding. Keep the pressure on.`,
    `${set3.accuracy > set1.accuracy ? 'You peaked on the finisher - that\'s elite adaptation.' : 'You\'ll find more in the finisher. We\'ll train it.'}`,
    `Session done. ${streak} days straight. The score reflects it.`,
  ]
  const kova = KOVA_NOTES[Math.floor(Math.random() * KOVA_NOTES.length)]

  return (
    <div className={`flex flex-col h-full ${isPRFlashing ? 'pr-flash' : ''}`}>
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <p className="text-xs font-mono text-hone-muted uppercase tracking-widest mb-6 text-center">
          SESSION COMPLETE
        </p>

        {/* Main score card */}
        <div
          className="rounded-2xl border p-6 mb-4 text-center"
          style={{ borderColor: isPersonalRecord ? color : '#2A2A36', backgroundColor: '#141418' }}
        >
          {isPersonalRecord && (
            <div
              className="inline-block text-xs font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4"
              style={{ backgroundColor: `${color}20`, color }}
            >
              ★ PERSONAL RECORD
            </div>
          )}

          <p className="text-xs text-hone-muted font-mono uppercase tracking-widest mb-1">
            SESSION SCORE
          </p>
          <div
            className="font-mono text-8xl font-black score-reveal"
            style={{ color: sessionScore >= 600 ? color : '#F0F0F0' }}
          >
            {displayScore}
          </div>
          <p className="text-hone-muted text-sm mt-1 font-mono">/ 1000</p>
        </div>

        {/* Set breakdown */}
        <div className="bg-hone-card border border-hone-border rounded-2xl p-4 mb-4">
          {sets.map((set, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2.5 border-b border-hone-border last:border-0"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-1 h-6 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <div>
                  <p className="text-sm font-semibold text-hone-text">
                    {i === 2 ? 'FINISHER' : `SET ${i + 1}`}
                  </p>
                  <p className="text-xs text-hone-muted font-mono">
                    {set.correct}/{set.trials} correct
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className="font-mono font-bold text-lg"
                  style={{ color: set.accuracy >= 70 ? color : '#F0F0F0' }}
                >
                  {set.accuracy}%
                </p>
                <p className="text-xs text-hone-muted font-mono">
                  {set.avgReactionMs > 0 ? `${set.avgReactionMs}ms` : '-'}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* HONE Score */}
        <div className="bg-hone-card border border-hone-border rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-hone-muted uppercase tracking-widest mb-1">
                HONE SCORE
              </p>
              <p className="font-mono text-4xl font-black text-hone-text">
                {honesScore}
              </p>
            </div>
            <div className="text-right">
              {delta !== 0 && (
                <p
                  className="font-mono font-bold text-lg"
                  style={{ color: delta > 0 ? '#B8F53C' : '#F5503C' }}
                >
                  {delta > 0 ? '+' : ''}{delta}
                </p>
              )}
              <p className="text-xs text-hone-muted font-mono">vs. previous</p>
            </div>
          </div>
        </div>

        {/* KOVA */}
        <div className="bg-hone-card border border-hone-border rounded-2xl p-4 mb-6">
          <p className="text-xs font-mono text-hone-muted uppercase tracking-widest mb-2">
            KOVA
          </p>
          <p className="text-sm text-hone-text leading-relaxed">&ldquo;{kova}&rdquo;</p>
        </div>

        {/* Stats row */}
        <div className="flex justify-around mb-6">
          <div className="text-center">
            <p className="font-mono text-2xl font-bold text-hone-green">{streak}</p>
            <p className="text-xs text-hone-muted font-mono uppercase tracking-widest">Streak</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-2xl font-bold text-hone-text">DAY {dayNumber}</p>
            <p className="text-xs text-hone-muted font-mono uppercase tracking-widest">Training</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-2xl font-bold" style={{ color }}>
              {muscleGroup}
            </p>
            <p className="text-xs text-hone-muted font-mono uppercase tracking-widest">Muscle</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-6 flex flex-col gap-3 flex-shrink-0">
        {isPersonalRecord && (
          <button
            onClick={() => setShowPRCard(true)}
            className="w-full py-4 rounded-2xl font-mono font-bold uppercase tracking-widest text-hone-bg text-sm transition-opacity active:opacity-80"
            style={{ backgroundColor: color }}
          >
            Share PR Card
          </button>
        )}
        <button
          onClick={onDone}
          className="w-full py-4 rounded-2xl font-mono font-bold uppercase tracking-widest text-hone-text text-sm bg-hone-card border border-hone-border transition-opacity active:opacity-80"
        >
          Done
        </button>
      </div>

      {/* PR Card overlay */}
      {showPRCard && (
        <PRCardOverlay
          muscleGroup={muscleGroup}
          score={sessionScore}
          streak={streak}
          dayNumber={dayNumber}
          color={color}
          onClose={() => setShowPRCard(false)}
        />
      )}
    </div>
  )
}

function ShareActions({
  muscleGroup, score, dayNumber, color, onClose,
}: { muscleGroup: string; score: number; dayNumber: number; color: string; onClose: () => void }) {
  const [showPaywall, setShowPaywall] = useState(false)
  const pro = getIsPro()

  if (showPaywall) {
    return <PaywallScreen trigger="share" muscleGroup={muscleGroup} onClose={() => setShowPaywall(false)} />
  }

  return (
    <div className="mt-4 flex gap-3">
      <button onClick={onClose} className="flex-1 py-3 rounded-xl font-mono text-sm text-hone-muted border border-hone-border">
        Close
      </button>
      <button
        className="flex-1 py-3 rounded-xl font-mono font-bold text-sm text-hone-bg"
        style={{ backgroundColor: color }}
        onClick={() => {
          if (!pro) { setShowPaywall(true); return }
          if (navigator.share) {
            navigator.share({
              title: `HONE - ${muscleGroup} Personal Record`,
              text: `Just hit ${score} on ${muscleGroup}. Day ${dayNumber}. #HONE`,
              url: 'https://hone.appsplosh.com',
            })
          }
        }}
      >
        {pro ? 'Share' : '🔒 Share'}
      </button>
    </div>
  )
}

function PRCardOverlay({
  muscleGroup,
  score,
  streak,
  dayNumber,
  color,
  onClose,
}: {
  muscleGroup: string
  score: number
  streak: number
  dayNumber: number
  color: string
  onClose: () => void
}) {
  const month = new Date().toLocaleString('default', { month: 'short', year: '2-digit' })

  const KOVA_QUOTES: Record<string, string> = {
    FOCUS: "Attention isn't a gift. It's a muscle. You just maxed it.",
    SPEED: "Reaction time trained is reaction time earned.",
    MEMORY: "What you encode deliberately, you own permanently.",
    LOGIC: "Patterns reveal themselves to the patient mind.",
    WORDS: "Language is power. You just got more of it.",
    CONTROL: "Control is strength. You demonstrated it.",
  }

  return (
    <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
      <div className="w-full max-w-xs">
        {/* PR Card */}
        <div
          id="pr-card"
          className="bg-hone-bg border rounded-2xl p-6 aspect-square flex flex-col justify-between"
          style={{ borderColor: color }}
        >
          <div>
            <p className="font-mono font-black text-sm tracking-widest">
              H<span style={{ color }}>O</span>NE
            </p>
          </div>
          <div className="border-t border-hone-border pt-4">
            <p className="font-mono font-bold text-xl uppercase tracking-widest mb-2" style={{ color }}>
              {muscleGroup}
            </p>
            <p className="font-mono font-black text-8xl text-hone-text leading-none mb-1">
              {score}
            </p>
            <p
              className="font-mono font-bold text-sm uppercase tracking-widest"
              style={{ color }}
            >
              PERSONAL RECORD
            </p>
          </div>
          <div>
            <div className="border-t border-hone-border pt-4 mb-3">
              <p className="text-xs text-hone-muted leading-relaxed italic">
                &ldquo;{KOVA_QUOTES[muscleGroup] ?? KOVA_QUOTES.FOCUS}&rdquo;
                <br />
                <span className="text-hone-muted not-italic">- KOVA, Your Coach</span>
              </p>
            </div>
            <p className="text-xs font-mono text-hone-muted">
              DAY {dayNumber} · STREAK {streak} · {month.toUpperCase()}
            </p>
            <p className="text-xs font-mono text-hone-muted/50 mt-1">
              HONE · honeyourmind.app
            </p>
          </div>
        </div>

        {/* Actions */}
        <ShareActions
          muscleGroup={muscleGroup}
          score={score}
          dayNumber={dayNumber}
          color={color}
          onClose={onClose}
        />
      </div>
    </div>
  )
}
