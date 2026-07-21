'use client'

import { useEffect, useState } from 'react'
import {
  pushSupported,
  permissionState,
  needsHomeScreenInstall,
  enableReminders,
} from '@/lib/notifications'

const WINDOW_LABEL: Record<string, string> = {
  morning: 'each morning',
  afternoon: 'each afternoon',
  evening: 'each evening',
}

// Opt-in for daily streak reminders. Hides itself once enabled, when the
// browser can't do push, or if the user has previously blocked notifications.
export default function ReminderCard({ trainingTime }: { trainingTime?: string }) {
  const [state, setState] = useState<'checking' | 'offer' | 'ios' | 'busy' | 'on' | 'hidden'>('checking')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const perm = permissionState()
      if (perm === 'granted') { if (!cancelled) setState('hidden'); return }
      if (perm === 'denied') { if (!cancelled) setState('hidden'); return }
      if (needsHomeScreenInstall()) { if (!cancelled) setState('ios'); return }
      const ok = await pushSupported()
      if (!cancelled) setState(ok ? 'offer' : 'hidden')
    })()
    return () => { cancelled = true }
  }, [])

  if (state === 'checking' || state === 'hidden') return null

  if (state === 'ios') {
    return (
      <div className="rounded-2xl border border-hone-border bg-hone-card p-4 mb-4">
        <p className="text-sm font-bold text-hone-text mb-1">Get daily reminders</p>
        <p className="text-xs text-hone-muted leading-relaxed">
          On iPhone, tap Share then <span className="text-hone-text">Add to Home Screen</span>.
          Open HONE from there and you can switch on a nudge {WINDOW_LABEL[trainingTime ?? 'morning']}.
        </p>
      </div>
    )
  }

  if (state === 'on') {
    return (
      <div className="rounded-2xl border p-4 mb-4" style={{ borderColor: '#B8F53C66', backgroundColor: '#B8F53C0d' }}>
        <p className="text-sm font-bold" style={{ color: '#B8F53C' }}>
          ✓ Reminders on
        </p>
        <p className="text-xs text-hone-muted leading-relaxed mt-1">
          We&apos;ll nudge you {WINDOW_LABEL[trainingTime ?? 'morning']} if you haven&apos;t trained.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border p-4 mb-4" style={{ borderColor: '#B8F53C4d', backgroundColor: '#B8F53C0a' }}>
      <p className="text-sm font-bold text-hone-text mb-1">Never break your streak</p>
      <p className="text-xs text-hone-muted leading-relaxed mb-3">
        A single nudge {WINDOW_LABEL[trainingTime ?? 'morning']} if you haven&apos;t trained yet.
        No spam, and you can turn it off any time.
      </p>
      <button
        disabled={state === 'busy'}
        onClick={async () => {
          setError(null)
          setState('busy')
          const res = await enableReminders()
          if (res.ok) { setState('on'); return }
          setState('offer')
          setError(
            res.reason === 'denied'
              ? 'Notifications are blocked in your browser settings.'
              : res.reason === 'not-signed-in'
              ? 'Sign in first so reminders follow your account.'
              : 'Could not enable reminders - please try again.'
          )
        }}
        className="w-full py-3 rounded-xl font-mono font-bold uppercase tracking-widest text-xs text-hone-bg transition-opacity active:opacity-80 disabled:opacity-50"
        style={{ backgroundColor: '#B8F53C' }}
      >
        {state === 'busy' ? 'Enabling...' : 'Remind me daily'}
      </button>
      {error && <p className="text-xs text-hone-red mt-2">{error}</p>}
    </div>
  )
}
