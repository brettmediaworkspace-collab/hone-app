import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-06-24.dahlia' })
}

// Map plan → your Stripe Price IDs (set these in .env.local)
const PRICE_IDS: Record<string, string> = {
  monthly:  process.env.STRIPE_PRICE_MONTHLY!,
  annual:   process.env.STRIPE_PRICE_ANNUAL!,
  lifetime: process.env.STRIPE_PRICE_LIFETIME!,
}

export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json()

    if (!PRICE_IDS[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const stripe = getStripe()
    const isLifetime = plan === 'lifetime'
    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.hone.appsplosh.com'

    const session = await stripe.checkout.sessions.create({
      mode: isLifetime ? 'payment' : 'subscription',
      line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url: `${origin}/?cancelled=1`,
      allow_promotion_codes: true,
      ...(isLifetime ? {} : {
        subscription_data: {
          trial_period_days: plan === 'annual' ? 14 : 7,
        },
      }),
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
