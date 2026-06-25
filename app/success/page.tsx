'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { activatePro, Plan } from '@/lib/subscription'

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-hone-bg">
        <div className="w-12 h-12 rounded-full border-2 border-hone-border border-t-hone-lime animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}

function SuccessContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [status, setStatus] = useState<'verifying' | 'ok' | 'error'>('verifying')

  useEffect(() => {
    const sessionId = params.get('session_id')
    const plan = params.get('plan') as Plan | null

    if (!sessionId || !plan) {
      setStatus('error')
      return
    }

    fetch(`/api/verify?session_id=${sessionId}&plan=${plan}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          activatePro(plan, sessionId, data.expiresAt)
          setStatus('ok')
          setTimeout(() => router.replace('/'), 2200)
        } else {
          setStatus('error')
        }
      })
      .catch(() => setStatus('error'))
  }, [params, router])

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-hone-bg px-6 text-center">
      {status === 'verifying' && (
        <>
          <div className="w-12 h-12 rounded-full border-2 border-hone-border border-t-hone-lime animate-spin mb-6" />
          <p className="font-mono text-sm text-hone-muted uppercase tracking-widest">Activating Pro…</p>
        </>
      )}

      {status === 'ok' && (
        <>
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
            style={{ backgroundColor: '#B8F53C15', border: '1px solid #B8F53C40' }}
          >
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-3xl font-black mb-2" style={{ color: '#B8F53C' }}>Welcome to Pro</h1>
          <p className="text-sm text-hone-muted max-w-xs leading-relaxed">
            All 6 muscle groups unlocked. Unlimited sessions. Adaptive difficulty. Let&apos;s train.
          </p>
          <p className="text-xs font-mono text-hone-muted mt-6 uppercase tracking-widest animate-pulse">
            Taking you to HONE…
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <h1 className="text-xl font-black mb-3 text-hone-text">Something went wrong</h1>
          <p className="text-sm text-hone-muted max-w-xs leading-relaxed mb-6">
            Your payment may have gone through. Please contact support if Pro isn&apos;t active after a few minutes.
          </p>
          <button
            onClick={() => router.replace('/')}
            className="font-mono text-sm uppercase tracking-widest px-6 py-3 rounded-xl border border-hone-border text-hone-muted"
          >
            Go to HONE
          </button>
        </>
      )}
    </div>
  )
}
