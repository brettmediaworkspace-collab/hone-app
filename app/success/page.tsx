'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { doc, onSnapshot } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { saveSubscription, Plan } from '@/lib/subscription'
import SaveProgressCard from '@/components/SaveProgressCard'

// Post-checkout landing. Pro is granted ONLY by the Polar
// webhook writing hone_users/{uid}.subscription server-side; this page
// just watches for that write and mirrors it into the local cache.
// Visiting /success directly grants nothing.

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-hone-bg">
          <div className="w-12 h-12 rounded-full border-2 border-hone-border border-t-hone-green animate-spin" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  )
}

type Status = 'waiting' | 'confirmed' | 'slow'

function SuccessContent() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('waiting')

  useEffect(() => {
    let unsubDoc: (() => void) | null = null

    const slowTimer = setTimeout(() => {
      setStatus(s => (s === 'waiting' ? 'slow' : s))
    }, 20000)

    const unsubAuth = onAuthStateChanged(auth, user => {
      if (!user || unsubDoc) return
      unsubDoc = onSnapshot(doc(db, 'hone_users', user.uid), snap => {
        const sub = snap.data()?.subscription
        if (sub?.isPro) {
          // Mirror the server-verified subscription into the local cache
          // the rest of the app reads synchronously.
          saveSubscription({
            isPro: true,
            plan: (sub.plan ?? 'monthly') as Plan,
            expiresAt: sub.expiresAt ?? null,
            stripeSessionId: sub.lsId ?? null,
          })
          setStatus('confirmed')
          clearTimeout(slowTimer)
          setTimeout(() => router.replace('/'), 6000)
        }
      })
    })

    return () => {
      unsubAuth()
      unsubDoc?.()
      clearTimeout(slowTimer)
    }
  }, [router])

  if (status === 'confirmed') {
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
          All 6 rounds unlocked. Unlimited sessions. Adaptive difficulty
          up to Level 12.
        </p>
        <div className="w-full max-w-xs mt-8 text-left">
          <SaveProgressCard
            title="Protect your purchase"
            body="Link a free account so Pro follows you to any device - even if you lose this one."
          />
        </div>
        <p className="text-xs font-mono text-hone-muted mt-4 uppercase tracking-widest animate-pulse">
          Taking you to HONE…
        </p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-hone-bg px-6 text-center">
      <div className="w-12 h-12 rounded-full border-2 border-hone-border border-t-hone-green animate-spin mb-8" />
      <p className="text-sm font-mono text-hone-muted uppercase tracking-widest mb-3">
        Confirming your payment…
      </p>
      {status === 'slow' && (
        <>
          <p className="text-xs text-hone-muted max-w-xs leading-relaxed mb-6">
            This is taking longer than usual. Your payment is safe - Pro
            unlocks automatically within a few minutes, even if you close
            this page. If it doesn&rsquo;t, contact office@appsplosh.com and
            we&rsquo;ll sort it fast.
          </p>
          <button
            onClick={() => router.replace('/')}
            className="py-3 px-8 rounded-2xl font-mono font-bold uppercase tracking-widest text-xs text-hone-text bg-hone-card border border-hone-border"
          >
            Back to HONE
          </button>
        </>
      )}
    </div>
  )
}
