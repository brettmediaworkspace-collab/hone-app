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
  const [done, setDone] = useState(false)

  useEffect(() => {
    const plan = params.get('plan') as Plan | null
    if (plan && ['monthly', 'annual', 'lifetime'].includes(plan)) {
      // Lemon Squeezy is Merchant of Record — payment is confirmed by their redirect
      const expiresAt = plan === 'lifetime' ? null
        : plan === 'annual'
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      activatePro(plan, 'ls_' + Date.now(), expiresAt)
    }
    setDone(true)
    setTimeout(() => router.replace('/'), 2200)
  }, [params, router])

  if (!done) return null

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-hone-bg px-6 text-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{ backgroundColor: '#B8F53C15', border: '1px solid #B8F53C40' }}
      >
        <span className="text-3xl" style={{ color: '#B8F53C' }}>✓</span>
      </div>
      <h1 className="text-3xl font-black mb-2" style={{ color: '#B8F53C' }}>
        Welcome to Pro
      </h1>
      <p className="text-sm text-hone-muted max-w-xs leading-relaxed">
        All 6 muscle groups unlocked. Unlimited sessions. Adaptive difficulty up to Level 12.
      </p>
      <p className="text-xs font-mono text-hone-muted mt-6 uppercase tracking-widest animate-pulse">
        Taking you to HONE…
      </p>
    </div>
  )
}
