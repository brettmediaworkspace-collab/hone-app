'use client'

import { useState } from 'react'
import { auth } from '@/lib/firebase'
import { Plan, getSubscription } from '@/lib/subscription'

// Collapsed by default - a subscriber doesn't need their plan pushed at
// them every visit. Tapping the green button reveals the three tiers with
// the current one marked; tapping again hides them.
// Upgrades route through /api/checkout; the webhook auto-cancels the old
// subscription when a higher plan is paid, so nobody double-pays.

const TIERS: { id: Plan; name: string; price: string; blurb: string }[] = [
  { id: 'monthly', name: 'Monthly', price: '£2.99/mo', blurb: 'Cancel anytime' },
  { id: 'annual', name: 'Annual', price: '£24.99/yr', blurb: 'Save 30%' },
  { id: 'lifetime', name: 'Lifetime', price: '£99.99 once', blurb: 'Pay once, own forever' },
]

const RANK: Record<string, number> = { monthly: 0, annual: 1, lifetime: 2 }

export default function ManageProCard({ plan }: { plan: Plan }) {
  const [open, setOpen] = useState(false)
  const rank = RANK[plan] ?? 0
  const expiresAt = getSubscription().expiresAt
  const renewText =
    plan === 'lifetime'
      ? 'Yours forever - nothing renews.'
      : expiresAt
      ? `Renews ${new Date(expiresAt).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}`
      : null

  function upgrade(target: Plan) {
    const uid = encodeURIComponent(auth.currentUser?.uid ?? '')
    window.location.href = `/api/checkout?plan=${target}&uid=${uid}`
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full py-3 rounded-2xl font-mono font-bold uppercase tracking-widest text-hone-bg text-sm flex items-center justify-center gap-2 transition-opacity active:opacity-80"
        style={{ backgroundColor: '#ba6b32' }}
      >
        Your Membership
        <span className="text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="bg-hone-card border border-hone-border rounded-2xl p-4 mt-2">
          {renewText && (
            <p className="text-xs font-mono text-hone-muted mb-3">{renewText}</p>
          )}

          <div className="flex flex-col gap-2">
            {TIERS.map(tier => {
              const isCurrent = tier.id === plan
              const isUpgrade = RANK[tier.id] > rank

              if (isCurrent) {
                return (
                  <div
                    key={tier.id}
                    className="w-full py-3 px-4 rounded-xl border-2 flex items-center justify-between"
                    style={{ borderColor: '#B8F53C', backgroundColor: '#B8F53C0d' }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-hone-text">
                        {tier.name}
                        <span className="text-xs text-hone-muted font-normal ml-2">
                          {tier.price}
                        </span>
                      </p>
                      <p className="text-xs text-hone-muted">{tier.blurb}</p>
                    </div>
                    <span
                      className="text-xs font-mono font-bold px-2.5 py-1 rounded-full uppercase tracking-widest"
                      style={{ backgroundColor: '#B8F53C', color: '#0A0A0F' }}
                    >
                      ✓ Your plan
                    </span>
                  </div>
                )
              }

              if (isUpgrade) {
                return (
                  <button
                    key={tier.id}
                    onClick={() => upgrade(tier.id)}
                    className="w-full py-3 px-4 rounded-xl border border-hone-border bg-hone-surface transition-all active:scale-98 flex items-center justify-between text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-hone-text">
                        {tier.name}
                        <span className="text-xs text-hone-muted font-normal ml-2">
                          {tier.price}
                        </span>
                      </p>
                      <p className="text-xs text-hone-muted">{tier.blurb}</p>
                    </div>
                    <span className="text-xs font-mono font-bold" style={{ color: '#B8F53C' }}>
                      UPGRADE →
                    </span>
                  </button>
                )
              }

              // Lower tier than current - included, dimmed
              return (
                <div
                  key={tier.id}
                  className="w-full py-3 px-4 rounded-xl border border-hone-border/50 flex items-center justify-between opacity-50"
                >
                  <p className="text-sm font-bold text-hone-muted">
                    {tier.name}
                    <span className="text-xs font-normal ml-2">{tier.price}</span>
                  </p>
                  <span className="text-xs font-mono text-hone-muted">included</span>
                </div>
              )
            })}
          </div>

          <p className="text-xs text-hone-muted leading-snug mt-3">
            {rank < 2 &&
              'Upgrading ends your current plan automatically - no double billing. - '}
            <a
              href="https://polar.sh/appsplosh/portal"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 whitespace-nowrap"
            >
              Manage billing &amp; receipts →
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
