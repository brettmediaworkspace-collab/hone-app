'use client'

import { auth } from '@/lib/firebase'
import { Plan } from '@/lib/subscription'

const PLAN_LABEL: Record<string, string> = {
  monthly: 'Monthly · £2.99/mo',
  annual: 'Annual · £24.99/yr',
  lifetime: 'Lifetime',
}

// Shown on Home for Pro users: current plan, upgrade paths, billing portal.
// Upgrades route through /api/checkout; the webhook auto-cancels the old
// subscription when a higher plan is paid, so nobody double-pays.
export default function ManageProCard({ plan }: { plan: Plan }) {
  const uid = () => encodeURIComponent(auth.currentUser?.uid ?? '')

  function upgrade(target: 'annual' | 'lifetime') {
    window.location.href = `/api/checkout?plan=${target}&uid=${uid()}`
  }

  return (
    <div className="bg-hone-card border border-hone-border rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-mono text-hone-muted uppercase tracking-widest">
          HONE Pro
        </p>
        <span
          className="text-xs font-mono px-2 py-0.5 rounded-full"
          style={{ backgroundColor: '#B8F53C20', color: '#B8F53C' }}
        >
          {PLAN_LABEL[plan] ?? 'Active'}
        </span>
      </div>

      {plan !== 'lifetime' && (
        <div className="flex flex-col gap-2 mt-3">
          {plan === 'monthly' && (
            <button
              onClick={() => upgrade('annual')}
              className="w-full py-3 rounded-xl text-left px-4 border transition-all active:scale-98 flex items-center justify-between"
              style={{ borderColor: '#B8F53C60', backgroundColor: '#B8F53C0d' }}
            >
              <span className="text-sm font-bold text-hone-text">
                Switch to Annual
                <span className="text-xs text-hone-muted font-normal ml-2">
                  save 30%
                </span>
              </span>
              <span className="text-sm font-bold" style={{ color: '#B8F53C' }}>→</span>
            </button>
          )}
          <button
            onClick={() => upgrade('lifetime')}
            className="w-full py-3 rounded-xl text-left px-4 border border-hone-border bg-hone-surface transition-all active:scale-98 flex items-center justify-between"
          >
            <span className="text-sm font-bold text-hone-text">
              Go Lifetime
              <span className="text-xs text-hone-muted font-normal ml-2">
                pay once, own forever
              </span>
            </span>
            <span className="text-sm font-bold text-hone-muted">→</span>
          </button>
          <p className="text-xs text-hone-muted leading-relaxed">
            Upgrading ends your current plan automatically — no double billing.
          </p>
        </div>
      )}

      <a
        href="https://polar.sh/appsplosh/portal"
        target="_blank"
        rel="noopener noreferrer"
        className="block text-xs font-mono text-hone-muted underline underline-offset-4 mt-3"
      >
        Manage billing & receipts →
      </a>
    </div>
  )
}
