'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveProfile, loadState } from '@/lib/gameState'
import { useAuth } from '@/lib/auth'
import { restoreFromAccount } from '@/lib/cloudSync'
import { auth } from '@/lib/firebase'

type Step = 'hook' | 'name' | 'goal' | 'time' | 'ready'

const GOALS = [
  { id: 'Sharp Mind', label: 'Sharp Mind', desc: 'Balanced across all 6 groups', split: 'FOCUS + MEMORY + LOGIC' },
  { id: 'Executive Focus', label: 'Executive Focus', desc: 'For deep work and decision-making', split: 'FOCUS + CONTROL + SPEED' },
  { id: 'Creative Edge', label: 'Creative Edge', desc: 'Language, pattern & imagination', split: 'WORDS + LOGIC + MEMORY' },
  { id: 'Fast Reactions', label: 'Fast Reactions', desc: 'Processing speed & reflex precision', split: 'SPEED + CONTROL + FOCUS' },
  { id: 'Deep Memory', label: 'Deep Memory', desc: 'Encoding, recall & retention', split: 'MEMORY + LOGIC + WORDS' },
]

const TIMES = [
  { id: 'morning' as const, label: 'Morning', sub: '6am – 9am' },
  { id: 'afternoon' as const, label: 'Afternoon', sub: '12pm – 3pm' },
  { id: 'evening' as const, label: 'Evening', sub: '6pm – 9pm' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('hook')
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [time, setTime] = useState<'morning' | 'afternoon' | 'evening'>('morning')
  const { signInWithGoogle } = useAuth()
  const [restoring, setRestoring] = useState(false)
  const [restoreError, setRestoreError] = useState<string | null>(null)

  // Returning users on a new device: sign in and pull their existing
  // training data rather than being forced through onboarding again.
  async function handleRestore() {
    setRestoreError(null)
    setRestoring(true)
    try {
      await signInWithGoogle()
      const uid = auth.currentUser?.uid
      if (uid) await restoreFromAccount(uid)
      if (loadState().profile) {
        router.replace('/')
        return
      }
      const who = auth.currentUser?.email
      setRestoreError(
        who
          ? `Signed in as ${who}, but that account has no saved training. If you use a different Google account on your phone, try again and pick that one.`
          : 'No saved training found for that account.'
      )
    } catch {
      setRestoreError('Could not sign in - please try again.')
    }
    setRestoring(false)
  }

  const handleComplete = () => {
    saveProfile({
      name,
      goal,
      trainingTime: time,
      streak: 0,
      lastSessionDate: null,
      sessionCount: 0,
    })
    router.push('/baseline')
  }

  return (
    <div className="h-screen flex flex-col bg-hone-bg overflow-hidden">
      {step === 'hook' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center animate-slide-up">
          <div className="mb-12">
            <p className="font-mono font-black text-lg tracking-widest mb-16">
              H<span className="text-hone-green">O</span>NE
            </p>
            <h1 className="text-4xl font-black leading-tight mb-6">
              You train your body.
              <br />
              <span className="text-hone-muted">What about your mind?</span>
            </h1>
            <p className="text-hone-muted text-base leading-relaxed">
              7 minutes a day. 6 cognitive muscle groups. One score to beat.
            </p>
          </div>

          <button
            onClick={() => setStep('name')}
            className="w-full max-w-xs py-4 rounded-2xl font-mono font-bold uppercase tracking-widest text-hone-bg text-sm bg-hone-green transition-opacity active:opacity-80"
          >
            Start my assessment
          </button>

          <p className="text-hone-muted text-xs mt-4 font-mono">Free · No credit card</p>

          <button
            onClick={handleRestore}
            disabled={restoring}
            className="mt-6 text-sm text-hone-muted underline underline-offset-4 disabled:opacity-50"
          >
            {restoring ? 'Signing in...' : 'Already training? Sign in'}
          </button>
          {restoreError && (
            <p className="text-xs text-hone-red mt-2 max-w-xs">{restoreError}</p>
          )}
          <p className="text-hone-muted/60 text-xs mt-6 font-mono">
            <a href="/terms" className="underline">Terms</a>
            {' · '}
            <a href="/privacy" className="underline">Privacy</a>
            {' · '}
            <a href="/refunds" className="underline">Refunds</a>
          </p>
        </div>
      )}

      {step === 'name' && (
        <div className="flex-1 flex flex-col justify-center px-6 animate-slide-up">
          <p className="text-xs font-mono text-hone-muted uppercase tracking-widest mb-8">
            1 / 3
          </p>
          <h2 className="text-3xl font-black mb-2">What should KOVA call you?</h2>
          <p className="text-hone-muted text-sm mb-8">Your coach wants to know your name.</p>

          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="First name"
            autoFocus
            className="w-full bg-hone-card border border-hone-border rounded-2xl px-5 py-4 text-hone-text text-lg font-medium placeholder:text-hone-muted focus:outline-none focus:border-hone-green transition-colors"
          />

          <button
            onClick={() => setStep('goal')}
            disabled={!name.trim()}
            className="mt-6 w-full py-4 rounded-2xl font-mono font-bold uppercase tracking-widest text-hone-bg text-sm bg-hone-green disabled:opacity-30 disabled:cursor-not-allowed transition-opacity active:opacity-80"
          >
            Next
          </button>
        </div>
      )}

      {step === 'goal' && (
        <div className="flex-1 flex flex-col px-6 py-8 overflow-y-auto animate-slide-up">
          <p className="text-xs font-mono text-hone-muted uppercase tracking-widest mb-8">
            2 / 3
          </p>
          <h2 className="text-3xl font-black mb-2">What&apos;s your training goal?</h2>
          <p className="text-hone-muted text-sm mb-6">
            KOVA will build your daily split around this.
          </p>

          <div className="flex flex-col gap-3 mb-8">
            {GOALS.map(g => (
              <button
                key={g.id}
                onClick={() => setGoal(g.id)}
                className="w-full text-left p-4 rounded-2xl border transition-all"
                style={{
                  borderColor: goal === g.id ? '#B8F53C' : '#2A2A36',
                  backgroundColor: goal === g.id ? 'rgba(184,245,60,0.08)' : '#141418',
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-base text-hone-text">{g.label}</p>
                    <p className="text-hone-muted text-xs mt-0.5">{g.desc}</p>
                  </div>
                  {goal === g.id && (
                    <div className="w-5 h-5 rounded-full bg-hone-green flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L4 7L9 1" stroke="#0A0A0F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>
                <p className="text-xs font-mono text-hone-muted mt-2 uppercase tracking-widest">
                  {g.split}
                </p>
              </button>
            ))}
          </div>

          <button
            onClick={() => setStep('time')}
            disabled={!goal}
            className="w-full py-4 rounded-2xl font-mono font-bold uppercase tracking-widest text-hone-bg text-sm bg-hone-green disabled:opacity-30 disabled:cursor-not-allowed transition-opacity active:opacity-80"
          >
            Next
          </button>
        </div>
      )}

      {step === 'time' && (
        <div className="flex-1 flex flex-col justify-center px-6 animate-slide-up">
          <p className="text-xs font-mono text-hone-muted uppercase tracking-widest mb-8">
            3 / 3
          </p>
          <h2 className="text-3xl font-black mb-2">When do you train?</h2>
          <p className="text-hone-muted text-sm mb-8">
            KOVA will remind you when it&apos;s time.
          </p>

          <div className="flex flex-col gap-3 mb-8">
            {TIMES.map(t => (
              <button
                key={t.id}
                onClick={() => setTime(t.id)}
                className="w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between"
                style={{
                  borderColor: time === t.id ? '#B8F53C' : '#2A2A36',
                  backgroundColor: time === t.id ? 'rgba(184,245,60,0.08)' : '#141418',
                }}
              >
                <div>
                  <p className="font-bold text-base text-hone-text">{t.label}</p>
                  <p className="text-hone-muted text-xs mt-0.5 font-mono">{t.sub}</p>
                </div>
                {time === t.id && (
                  <div className="w-5 h-5 rounded-full bg-hone-green flex items-center justify-center flex-shrink-0">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L4 7L9 1" stroke="#0A0A0F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => setStep('ready')}
            className="w-full py-4 rounded-2xl font-mono font-bold uppercase tracking-widest text-hone-bg text-sm bg-hone-green transition-opacity active:opacity-80"
          >
            Let&apos;s go
          </button>
        </div>
      )}

      {step === 'ready' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center animate-slide-up">
          <p className="font-mono font-black text-lg tracking-widest mb-12">
            H<span className="text-hone-green">O</span>NE
          </p>

          <div className="mb-12">
            <p className="text-hone-muted text-sm font-mono uppercase tracking-widest mb-4">
              You&apos;re ready, {name.split(' ')[0]}.
            </p>
            <h2 className="text-4xl font-black mb-2">Sharpen daily.</h2>
            <p className="text-hone-muted text-base leading-relaxed mt-4">
              First: a 3-minute baseline assessment.
              <br />Three rounds. One starting score.
            </p>
          </div>

          <div className="w-full max-w-xs bg-hone-card border border-hone-border rounded-2xl p-5 mb-8 text-left">
            <p className="text-xs font-mono text-hone-muted uppercase tracking-widest mb-3">
              Your profile
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-hone-muted">Name</span>
                <span className="text-hone-text font-medium">{name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-hone-muted">Goal</span>
                <span className="text-hone-text font-medium">{goal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-hone-muted">Training time</span>
                <span className="text-hone-text font-medium capitalize">{time}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleComplete}
            className="w-full max-w-xs py-4 rounded-2xl font-mono font-bold uppercase tracking-widest text-hone-bg text-sm bg-hone-green transition-opacity active:opacity-80"
          >
            Get my baseline score
          </button>
        </div>
      )}
    </div>
  )
}
