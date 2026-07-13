'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth'

// Prompts unlinked users to attach their progress to a Google account.
// Rendered on the baseline reveal and the Home screen; hides itself once
// linked or when auth is unavailable.
export default function SaveProgressCard({
  title = "Don't lose this score",
  body = 'Save your baseline to a free account — your progress syncs across devices.',
}: {
  title?: string
  body?: string
}) {
  const { user, isLinked, signInWithGoogle } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [justLinked, setJustLinked] = useState(false)

  if (!user || (isLinked && !justLinked)) return null

  if (justLinked) {
    return (
      <div className="rounded-2xl border border-hone-green/40 bg-hone-green/5 p-4 mb-4 text-left">
        <p className="text-sm font-bold" style={{ color: '#B8F53C' }}>
          ✓ Progress saved to your account
        </p>
      </div>
    )
  }

  async function handleSave() {
    setBusy(true)
    setError(false)
    try {
      await signInWithGoogle()
      setJustLinked(true)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-hone-green/40 bg-hone-green/5 p-4 mb-4 text-left">
      <p className="text-sm font-bold text-hone-text mb-1">{title}</p>
      <p className="text-xs text-hone-muted leading-relaxed mb-3">{body}</p>
      <button
        onClick={handleSave}
        disabled={busy}
        className="w-full py-3 rounded-xl font-mono font-bold uppercase tracking-widest text-xs text-hone-text bg-hone-surface border border-hone-border transition-opacity active:opacity-80 disabled:opacity-50"
      >
        {busy ? 'Connecting…' : 'Continue with Google'}
      </button>
      {error && (
        <p className="text-xs text-hone-red mt-2">
          Couldn&apos;t connect — your progress is saved on this device.
        </p>
      )}
    </div>
  )
}
