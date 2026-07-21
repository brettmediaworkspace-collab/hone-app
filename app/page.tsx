'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadState, AppState, getMuscleColor, getGoalSplit } from '@/lib/gameState'
import { getSubscription, canStartSession, isFreeMuscle, getEffectiveSplit } from '@/lib/subscription'
import PaywallScreen from '@/components/PaywallScreen'
import SaveProgressCard from '@/components/SaveProgressCard'
import RadarChart from '@/components/RadarChart'
import Sparkline from '@/components/Sparkline'
import ManageProCard from '@/components/ManageProCard'
import MuscleGlyph from '@/components/MuscleGlyph'
import ReminderCard from '@/components/ReminderCard'
import AccountRow from '@/components/AccountRow'
import { Plan } from '@/lib/subscription'

const MUSCLE_GROUPS = ['FOCUS', 'SPEED', 'MEMORY', 'LOGIC', 'WORDS', 'CONTROL'] as const

export default function HomePage() {
  const router = useRouter()
  const [state, setState] = useState<AppState | null>(null)
  const [tab, setTab] = useState<'home' | 'progress'>('home')
  const [paywall, setPaywall] = useState<{ trigger: 'daily-limit' | 'streak' | 'general'; continueAfter?: boolean } | null>(null)
  const [proState, setProState] = useState({ isPro: false, plan: 'free' as Plan })

  useEffect(() => {
    const s = loadState()
    if (!s.profile) {
      router.replace('/onboarding')
      return
    }
    setState(s)
    setProState(getSubscription())
  }, [router])

  function handleStartSession() {
    if (!proState.isPro && !canStartSession()) {
      setPaywall({ trigger: 'daily-limit' })
      return
    }
    // Streak upsell at every 7th day for free users. This must NOT block
    // training - dismissing it starts the session, otherwise the user
    // could never train on day 7/14/21 and would lose the streak we're
    // congratulating them for.
    const streak = state?.profile?.streak ?? 0
    if (!proState.isPro && streak >= 7 && streak % 7 === 0) {
      setPaywall({ trigger: 'streak', continueAfter: true })
      return
    }
    router.push('/session')
  }

  if (!state || !state.profile) return null

  if (paywall) {
    return (
      <PaywallScreen
        trigger={paywall.trigger}
        honesScore={state.honesScore}
        streakDays={state.profile.streak}
        onClose={() => {
          const proceed = paywall.continueAfter
          setPaywall(null)
          if (proceed) router.push('/session')
        }}
      />
    )
  }

  const { profile, honesScore, muscleScores, sessionHistory, bestScores } = state
  const today = new Date()
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  const todayStr = today.toISOString().split('T')[0]
  const split = getEffectiveSplit(profile.goal, proState.isPro, todayStr)
  const lastPR = sessionHistory.find(s => s.isPersonalRecord)
  const lastPRDays = lastPR
    ? Math.floor((Date.now() - new Date(lastPR.date).getTime()) / 86400000)
    : null

  const trainedToday = profile.lastSessionDate === todayStr

  return (
    <div className="flex flex-col h-screen bg-hone-bg overflow-hidden">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {tab === 'home' ? (
          <HomeTab
            dayName={dayName}
            sessionCount={profile.sessionCount}
            honesScore={honesScore}
            muscleScores={muscleScores}
            split={split}
            streak={profile.streak}
            lastPRDays={lastPRDays}
            trainedToday={trainedToday}
            isPro={proState.isPro}
            proPlan={proState.plan}
            trainingTime={profile.trainingTime}
          onStartSession={handleStartSession}
          onShowPaywall={() => setPaywall({ trigger: 'general' })}
          />
        ) : (
          <ProgressTab
            muscleScores={muscleScores}
            sessionHistory={sessionHistory}
            bestScores={bestScores}
          />
        )}
      </div>

      {/* Bottom nav */}
      <div className="absolute bottom-0 left-0 right-0 max-w-md mx-auto">
        <div className="flex border-t border-hone-border bg-hone-bg">
          {[
            { id: 'home' as const, label: 'HOME', icon: HomeIcon },
            { id: 'progress' as const, label: 'PROGRESS', icon: ChartIcon },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className="flex-1 flex flex-col items-center gap-1 py-4 transition-colors"
              style={{ color: tab === item.id ? '#B8F53C' : '#6B6B80' }}
            >
              <item.icon active={tab === item.id} />
              <span className="text-xs font-mono uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </div>
        {/* Safe area padding */}
        <div className="h-safe-bottom bg-hone-bg" style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </div>
    </div>
  )
}

function HomeTab({
  dayName,
  sessionCount,
  honesScore,
  muscleScores,
  split,
  streak,
  lastPRDays,
  trainedToday,
  isPro,
  proPlan,
  trainingTime,
  onStartSession,
  onShowPaywall,
}: {
  dayName: string
  sessionCount: number
  honesScore: number
  muscleScores: AppState['muscleScores']
  split: string[]
  streak: number
  lastPRDays: number | null
  trainedToday: boolean
  isPro: boolean
  proPlan: Plan
  trainingTime?: string
  onStartSession: () => void
  onShowPaywall: () => void
}) {
  return (
    <div className="px-4 pt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono font-black text-base tracking-widest">
            H<span className="text-hone-green">O</span>NE
          </p>
        </div>
        <p className="text-xs font-mono text-hone-muted uppercase tracking-widest">
          {dayName} · DAY {sessionCount}
        </p>
      </div>

      <SaveProgressCard
        title="Save your progress"
        body="Create a free account so your HONE Score and streak survive this device."
      />

      {/* HONE Score card */}
      <div className="bg-hone-card border border-hone-border rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-mono text-hone-muted uppercase tracking-widest">
            Your HONE Score
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-sm">🔥</span>
            <span className="text-sm font-mono text-hone-muted whitespace-nowrap">
              {streak > 0 ? `${streak} day streak` : 'Start your streak'}
            </span>
          </div>
        </div>
        {honesScore > 0 ? (
          <div className="relative flex items-end gap-3 mb-4">
            <div
              className="absolute -inset-6 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(184,245,60,0.14), transparent 65%)' }}
            />
            <p className="relative font-mono font-black text-8xl leading-none text-hone-text">
              {honesScore}
            </p>
            <p className="relative text-hone-muted text-sm mb-2 font-mono">/ 1000</p>
          </div>
        ) : (
          <a
            href="/baseline"
            className="block rounded-2xl border border-hone-green/40 bg-hone-green/5 px-4 py-4 mb-4"
          >
            <p className="text-sm font-bold text-hone-text mb-0.5">
              No baseline yet
            </p>
            <p className="text-xs text-hone-muted leading-relaxed">
              Take the 3-minute assessment to unlock your starting score{' '}
              <span className="text-hone-green font-mono">→</span>
            </p>
          </a>
        )}

        {/* Muscle group dots */}
        <div className="grid grid-cols-3 gap-2">
          {MUSCLE_GROUPS.map(muscle => {
            const score = muscleScores[muscle]
            const color = getMuscleColor(muscle)
            const locked = !isPro && !isFreeMuscle(muscle)
            return (
              <div key={muscle} className="flex items-center gap-2">
                <MuscleGlyph
                  muscle={muscle}
                  size={18}
                  color={locked ? '#3A3A4A' : score > 0 ? color : '#4A4A58'}
                  className="flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-mono truncate" style={{ color: locked ? '#3A3A4A' : '#6B6B80' }}>
                    {muscle}{locked ? ' 🔒' : ''}
                  </p>
                  {!locked && score > 0 && (
                    <p className="text-xs font-mono font-bold" style={{ color }}>
                      {score}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Today's workout */}
      <div className="bg-hone-card border border-hone-border rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-mono text-hone-muted uppercase tracking-widest">
            Today&apos;s Workout
          </p>
          <p className="text-xs font-mono text-hone-muted">7 MIN</p>
        </div>
        {split.map((muscle, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-2.5 border-b border-hone-border last:border-0"
          >
            <span className="text-sm text-hone-muted font-mono">
              {i === 2 ? 'SET 3 · FINISHER' : `SET ${i + 1}`}
            </span>
            <span
              className="text-sm font-mono font-bold uppercase tracking-wider"
              style={{ color: getMuscleColor(muscle) }}
            >
              {muscle}
            </span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onStartSession}
        className="w-full py-5 rounded-2xl font-mono font-bold uppercase tracking-widest text-hone-bg text-base bg-hone-green mb-3 transition-opacity active:opacity-80"
      >
        {trainedToday ? 'Train Again ▶' : 'Start Today\'s Session ▶'}
      </button>

      {/* Pro upsell nudge */}
      {!isPro && (
        <button
          onClick={onShowPaywall}
          className="w-full py-3 rounded-xl border border-hone-border bg-hone-card mb-4 flex items-center justify-between px-4"
        >
          <span className="text-xs font-mono text-hone-muted uppercase tracking-widest">
            Unlock 3 more muscle groups
          </span>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ backgroundColor: '#B8F53C20', color: '#B8F53C' }}>
            PRO →
          </span>
        </button>
      )}

      {isPro && <ManageProCard plan={proPlan} />}

      <ReminderCard trainingTime={trainingTime} />

      {lastPRDays !== null && (
        <div className="flex items-center justify-end px-1">
          <span className="text-sm text-hone-muted font-mono">
            Last PR: {lastPRDays === 0 ? 'today' : `${lastPRDays}d ago`}
          </span>
        </div>
      )}

      <AccountRow />
    </div>
  )
}

function ProgressTab({
  muscleScores,
  sessionHistory,
  bestScores,
}: {
  muscleScores: AppState['muscleScores']
  sessionHistory: AppState['sessionHistory']
  bestScores: AppState['bestScores']
}) {
  return (
    <div className="px-4 pt-8">
      <h2 className="font-black text-xl mb-6">Progress</h2>

      {/* Radar - the body scan */}
      <div className="bg-hone-card border border-hone-border rounded-2xl p-4 mb-4">
        <p className="text-xs font-mono text-hone-muted uppercase tracking-widest mb-1">
          Muscle Scan
        </p>
        <RadarChart scores={muscleScores} />
        {Object.values(muscleScores).every(v => v === 0) && (
          <p className="text-xs text-hone-muted text-center -mt-2 pb-1">
            Your shape appears as you train. Six muscles. Fill the ring.
          </p>
        )}
      </div>

      {/* Score trend */}
      {sessionHistory.length >= 2 && (
        <div className="bg-hone-card border border-hone-border rounded-2xl p-4 mb-4">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-xs font-mono text-hone-muted uppercase tracking-widest">
              HONE Score Trend
            </p>
            <p className="text-xs font-mono text-hone-muted">
              last {Math.min(30, sessionHistory.length)} sessions
            </p>
          </div>
          <Sparkline
            values={[...sessionHistory].slice(0, 30).reverse().map(s => s.honesScore)}
          />
        </div>
      )}

      {/* Muscle group bars */}
      <div className="bg-hone-card border border-hone-border rounded-2xl p-5 mb-4">
        <p className="text-xs font-mono text-hone-muted uppercase tracking-widest mb-4">
          Muscle Groups
        </p>
        {MUSCLE_GROUPS.map(muscle => {
          const score = muscleScores[muscle]
          const color = getMuscleColor(muscle)
          const best = bestScores[muscle] ?? 0
          return (
            <div key={muscle} className="mb-3 last:mb-0">
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-2 text-sm font-mono font-bold" style={{ color }}>
                  <MuscleGlyph muscle={muscle} size={16} color={color} />
                  {muscle}
                </span>
                <span className="text-sm font-mono text-hone-muted">
                  {score > 0 ? score : '-'}
                  {best > 0 && <span className="text-xs text-hone-muted ml-2">PR {best}</span>}
                </span>
              </div>
              <div className="h-1.5 bg-hone-surface rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (score / 1000) * 100)}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent sessions */}
      {sessionHistory.length > 0 && (
        <div className="bg-hone-card border border-hone-border rounded-2xl p-5">
          <p className="text-xs font-mono text-hone-muted uppercase tracking-widest mb-4">
            Recent Sessions
          </p>
          {sessionHistory.slice(0, 10).map((session, i) => {
            const color = getMuscleColor(session.muscleGroup)
            const date = new Date(session.date)
            return (
              <div
                key={i}
                className="flex items-center justify-between py-2.5 border-b border-hone-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                  <div>
                    <p className="text-sm font-semibold text-hone-text">
                      {session.muscleGroup}
                      {session.isPersonalRecord && (
                        <span className="ml-2 text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: `${color}20`, color }}>
                          PR
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-hone-muted font-mono">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <p className="font-mono font-bold text-lg text-hone-text">
                  {session.sessionScore}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {sessionHistory.length === 0 && (
        <div className="bg-hone-card border border-hone-border rounded-2xl p-5 text-center">
          <p className="text-sm font-bold text-hone-text mb-1">Week 1 starts today</p>
          <p className="text-xs text-hone-muted leading-relaxed max-w-xs mx-auto">
            Every session plots a point on your trend line and reshapes your
            scan. Most people see their first score jump inside 7 days.
          </p>
        </div>
      )}
    </div>
  )
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M3 10L10 3L17 10V17H13V13H7V17H3V10Z"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.5}
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChartIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="12" width="3" height="5" rx="1" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
      <rect x="8.5" y="8" width="3" height="9" rx="1" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
      <rect x="14" y="4" width="3" height="13" rx="1" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
    </svg>
  )
}
