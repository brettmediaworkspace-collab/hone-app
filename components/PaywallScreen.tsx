'use client'

import { useState } from 'react'

interface PaywallScreenProps {
  trigger: 'muscle' | 'daily-limit' | 'streak' | 'share' | 'difficulty' | 'general'
  muscleGroup?: string
  honesScore?: number
  streakDays?: number
  onClose: () => void
}

const MUSCLE_COLOR: Record<string, string> = {
  MEMORY: '#A03CF5',
  LOGIC:  '#F58A3C',
  CONTROL:'#F5503C',
}

const TRIGGER_COPY: Record<string, { headline: string; sub: string }> = {
  muscle:        { headline: 'Unlock this muscle group', sub: 'Pro unlocks all 6 cognitive muscle groups and adaptive difficulty.' },
  'daily-limit': { headline: "You've trained today", sub: "Free users get one session per day. Go Pro for unlimited sessions." },
  streak:        { headline: "Don't break your streak", sub: "Pro keeps your streak alive and unlocks full session history." },
  share:         { headline: 'Share your PR', sub: 'Pro users can share their Personal Records. Show your brain gains.' },
  difficulty:    { headline: 'Your brain is ready for more', sub: 'Free tier caps at Level 3. Pro unlocks full adaptive difficulty up to Level 12.' },
  general:       { headline: 'Unlock HONE Pro', sub: 'Get full access to all 6 muscle groups, unlimited sessions, and adaptive difficulty.' },
}

export default function PaywallScreen({
  trigger,
  muscleGroup,
  honesScore,
  streakDays,
  onClose,
}: PaywallScreenProps) {
  const [loading, setLoading] = useState<'monthly' | 'annual' | 'lifetime' | null>(null)
  const copy = TRIGGER_COPY[trigger] ?? TRIGGER_COPY.general
  const accentColor = muscleGroup ? (MUSCLE_COLOR[muscleGroup] ?? '#B8F53C') : '#B8F53C'

  async function checkout(plan: 'monthly' | 'annual' | 'lifetime') {
    setLoading(plan)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const { url, error } = await res.json()
      if (error) { alert(error); setLoading(null); return }
      window.location.href = url
    } catch {
      alert('Something went wrong. Please try again.')
      setLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-hone-bg overflow-y-auto">
      {/* Close */}
      <div className="flex justify-end px-4 pt-4 flex-shrink-0">
        <button
          onClick={onClose}
          className="text-hone-muted text-xs font-mono uppercase tracking-widest px-3 py-1.5 rounded-lg border border-hone-border"
        >
          ✕ MAYBE LATER
        </button>
      </div>

      <div className="flex flex-col items-center px-5 pt-4 pb-8">

        {/* Icon / context */}
        {muscleGroup && (
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
            style={{ backgroundColor: `${accentColor}15`, border: `1px solid ${accentColor}40` }}
          >
            <span className="font-mono font-black text-sm" style={{ color: accentColor }}>
              {muscleGroup}
            </span>
          </div>
        )}

        {trigger === 'streak' && streakDays && (
          <div className="text-4xl mb-4">🔥</div>
        )}

        {/* Headline */}
        <h1 className="text-2xl font-black text-center mb-2 leading-tight">
          {copy.headline}
        </h1>
        <p className="text-sm text-hone-muted text-center max-w-xs leading-relaxed mb-6">
          {copy.sub}
        </p>

        {/* Score anchor — show what they'd be losing */}
        {honesScore !== undefined && honesScore > 0 && (
          <div className="w-full max-w-xs bg-hone-card border border-hone-border rounded-2xl p-4 mb-6 text-center">
            <p className="text-xs font-mono text-hone-muted uppercase tracking-widest mb-1">Your HONE Score</p>
            <p className="font-mono text-3xl font-black" style={{ color: accentColor }}>{honesScore}</p>
            <p className="text-xs text-hone-muted mt-1">Pro unlocks your full score potential</p>
          </div>
        )}

        {/* Feature bullets */}
        <div className="w-full max-w-xs bg-hone-card border border-hone-border rounded-2xl p-4 mb-6">
          <p className="text-xs font-mono text-hone-muted uppercase tracking-widest mb-3">HONE Pro includes</p>
          {[
            'All 6 cognitive muscle groups',
            'Unlimited sessions per day',
            'Full adaptive difficulty (up to Level 12)',
            'Complete session history & trends',
            'PR Cards + Web Share',
            'KOVA personalised coaching',
            'Goal-based training splits',
          ].map(f => (
            <div key={f} className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold" style={{ color: '#B8F53C' }}>✓</span>
              <span className="text-sm text-hone-text">{f}</span>
            </div>
          ))}
        </div>

        {/* Pricing cards */}
        <div className="w-full max-w-xs flex flex-col gap-3 mb-4">

          {/* Annual — hero */}
          <button
            onClick={() => checkout('annual')}
            disabled={loading !== null}
            className="relative w-full rounded-2xl p-4 text-left transition-all active:scale-98 border-2"
            style={{ backgroundColor: '#0f1a08', borderColor: '#B8F53C' }}
          >
            <span
              className="absolute -top-3 left-4 text-xs font-black px-3 py-0.5 rounded-full"
              style={{ backgroundColor: '#B8F53C', color: '#0A0A0F' }}
            >
              BEST VALUE — SAVE 30%
            </span>
            <div className="flex items-center justify-between mt-1">
              <div>
                <p className="font-mono font-black text-lg text-hone-text">£24.99 / year</p>
                <p className="text-xs text-hone-muted mt-0.5">~£2.08/month · 14-day free trial</p>
              </div>
              {loading === 'annual'
                ? <span className="text-xs font-mono text-hone-muted animate-pulse">...</span>
                : <span className="text-sm font-bold" style={{ color: '#B8F53C' }}>→</span>
              }
            </div>
          </button>

          {/* Monthly */}
          <button
            onClick={() => checkout('monthly')}
            disabled={loading !== null}
            className="w-full rounded-2xl p-4 text-left border border-hone-border bg-hone-card transition-all active:scale-98"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono font-black text-lg text-hone-text">£2.99 / month</p>
                <p className="text-xs text-hone-muted mt-0.5">7-day free trial · Cancel anytime</p>
              </div>
              {loading === 'monthly'
                ? <span className="text-xs font-mono text-hone-muted animate-pulse">...</span>
                : <span className="text-sm font-bold text-hone-muted">→</span>
              }
            </div>
          </button>

          {/* Lifetime */}
          <button
            onClick={() => checkout('lifetime')}
            disabled={loading !== null}
            className="w-full rounded-2xl p-4 text-left border border-hone-border bg-hone-card transition-all active:scale-98"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono font-black text-lg text-hone-text">£59.99 once</p>
                <p className="text-xs text-hone-muted mt-0.5">Early adopter · Pay once, own forever</p>
              </div>
              {loading === 'lifetime'
                ? <span className="text-xs font-mono text-hone-muted animate-pulse">...</span>
                : <span className="text-sm font-bold text-hone-muted">→</span>
              }
            </div>
          </button>
        </div>

        <p className="text-xs text-hone-muted text-center max-w-xs leading-relaxed">
          Subscriptions renew automatically. Cancel anytime in your account settings. Payment processed securely via Stripe.
        </p>
      </div>
    </div>
  )
}
