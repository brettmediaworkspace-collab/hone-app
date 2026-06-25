import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-06-24.dahlia' })
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id')
  const plan = req.nextUrl.searchParams.get('plan') as 'monthly' | 'annual' | 'lifetime' | null

  if (!sessionId || !plan) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 402 })
    }

    // For subscriptions, get the expiry date
    let expiresAt: string | null = null
    if (plan !== 'lifetime' && session.subscription) {
      const sub = session.subscription as Stripe.Subscription & { current_period_end?: number }
      // If in trial, expires when trial ends; otherwise use period end
      const endTs = sub.trial_end ?? sub.current_period_end ?? null
      if (endTs) expiresAt = new Date(endTs * 1000).toISOString()
    }

    return NextResponse.json({ ok: true, plan, expiresAt, sessionId })
  } catch (err) {
    console.error('Stripe verify error:', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
