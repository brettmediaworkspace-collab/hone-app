// Polar webhook — grants/revokes HONE Pro server-side, same contract as
// the Lemon Squeezy route (either provider can drive the subscription).
//
// Polar signs webhooks per the Standard Webhooks spec: HMAC-SHA256 over
// `${id}.${timestamp}.${rawBody}` with the base64 secret (after the
// `whsec_` prefix), sent in webhook-id / webhook-timestamp /
// webhook-signature headers. We verify before trusting anything, then
// write the client-locked `subscription` field via the Admin SDK.
//
// The paying user's uid arrives as customer external_id (preferred) or
// checkout/order metadata `uid`, set by PaywallScreen's checkout link
// parameters. Plan comes from metadata `plan` or the product name.

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { adminDb } from '@/lib/firebaseAdmin'
import { FieldValue } from 'firebase-admin/firestore'

export const runtime = 'nodejs'

function verifySignature(req: NextRequest, rawBody: string): boolean {
  const secretRaw = process.env.POLAR_WEBHOOK_SECRET
  const id = req.headers.get('webhook-id')
  const timestamp = req.headers.get('webhook-timestamp')
  const sigHeader = req.headers.get('webhook-signature')
  if (!secretRaw || !id || !timestamp || !sigHeader) return false

  // Polar dashboard secrets are plain strings that Polar's SDK
  // base64-ENCODES before handing to the Standard Webhooks signer, while
  // the spec's whsec_ secrets are base64 to DECODE. Accept both keyings
  // so either secret format verifies.
  const stripped = secretRaw.replace(/^whsec_/, '')
  const keys = [
    Buffer.from(secretRaw, 'utf8'),     // Polar SDK: full secret incl. whsec_ prefix
    Buffer.from(stripped, 'utf8'),      // raw string sans prefix
    Buffer.from(stripped, 'base64'),    // Standard Webhooks: decoded key
  ]
  const signedContent = `${id}.${timestamp}.${rawBody}`
  const expectations = keys.map(k =>
    crypto.createHmac('sha256', k).update(signedContent).digest('base64')
  )

  // Header may contain multiple space-delimited "v1,<sig>" entries.
  return sigHeader.split(' ').some(part => {
    const sig = part.includes(',') ? part.split(',')[1] : part
    return expectations.some(expected => {
      try {
        return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
      } catch {
        return false
      }
    })
  })
}

type PolarPayload = {
  type?: string
  data?: {
    id?: string
    metadata?: Record<string, unknown>
    customer?: { external_id?: string | null; metadata?: Record<string, unknown> }
    product?: { name?: string | null }
    checkout?: { metadata?: Record<string, unknown> } | null
    current_period_end?: string | null
    subscription?: {
      current_period_end?: string | null
      metadata?: Record<string, unknown>
    } | null
  }
}

function resolveUid(p: PolarPayload): string | null {
  const d = p.data ?? {}
  return (
    d.customer?.external_id ??
    (d.metadata?.uid as string | undefined) ??
    (d.checkout?.metadata?.uid as string | undefined) ??
    (d.subscription?.metadata?.uid as string | undefined) ??
    (d.customer?.metadata?.uid as string | undefined) ??
    null
  )
}

function resolvePlan(p: PolarPayload): 'monthly' | 'annual' | 'lifetime' {
  const d = p.data ?? {}
  const meta =
    (d.metadata?.plan as string | undefined) ??
    (d.checkout?.metadata?.plan as string | undefined)
  if (meta === 'monthly' || meta === 'annual' || meta === 'lifetime') return meta
  const name = (d.product?.name ?? '').toLowerCase()
  if (name.includes('lifetime')) return 'lifetime'
  if (name.includes('annual') || name.includes('year')) return 'annual'
  return 'monthly'
}

function planExpiry(plan: string, p: PolarPayload): string | null {
  const periodEnd =
    p.data?.current_period_end ?? p.data?.subscription?.current_period_end
  if (typeof periodEnd === 'string' && periodEnd) return periodEnd
  if (plan === 'lifetime') return null
  const days = plan === 'annual' ? 365 : 30
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  if (!verifySignature(req, rawBody)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  let payload: PolarPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const event = payload.type ?? ''
  const uid = resolveUid(payload)

  if (!uid) {
    return NextResponse.json({ ok: true, note: 'no uid on event' })
  }

  const db = adminDb()
  const ref = db.collection('hone_users').doc(uid)

  // order.paid covers one-time purchases, first subscription payments and
  // renewals. subscription.active is a belt-and-braces grant.
  if (event === 'order.paid' || event === 'subscription.active') {
    const plan = resolvePlan(payload)

    const snap = await ref.get()
    const existing = snap.data()?.subscription
    if (existing?.plan === 'lifetime' && plan !== 'lifetime') {
      return NextResponse.json({ ok: true, note: 'lifetime already active' })
    }

    await ref.set(
      {
        subscription: {
          isPro: true,
          plan,
          expiresAt: planExpiry(plan, payload),
          provider: 'polar',
          providerId: payload.data?.id ?? null,
          providerEvent: event,
          updatedAt: FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    )

    // Upgrades: end any other active Polar subscription for this customer
    // so nobody pays twice (monthly keeps running until its period ends —
    // they paid for it — but won't renew).
    if (event === 'order.paid' && (plan === 'annual' || plan === 'lifetime')) {
      await cancelSupersededSubscriptions(uid, payload).catch(e =>
        console.error('[polar] auto-cancel failed', e)
      )
    }

    return NextResponse.json({ ok: true, granted: plan })
  }

  // subscription.revoked fires when access should actually end (period
  // over after cancellation, or refund). canceled-but-paid-up users keep
  // access until then, so we ignore subscription.canceled.
  if (event === 'subscription.revoked') {
    const snap = await ref.get()
    if (snap.data()?.subscription?.plan === 'lifetime') {
      return NextResponse.json({ ok: true, note: 'lifetime not revoked' })
    }
    await ref.set(
      {
        subscription: {
          isPro: false,
          plan: 'free',
          expiresAt: null,
          provider: 'polar',
          providerId: payload.data?.id ?? null,
          providerEvent: event,
          updatedAt: FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    )
    return NextResponse.json({ ok: true, revoked: true })
  }

  return NextResponse.json({ ok: true, note: `ignored event ${event}` })
}

// Cancels (at period end) every active subscription for the customer
// except the one belonging to the order that triggered this call.
async function cancelSupersededSubscriptions(uid: string, payload: PolarPayload) {
  const token = process.env.POLAR_ACCESS_TOKEN
  if (!token) return
  const keepId =
    (payload.data as { subscription_id?: string } | undefined)?.subscription_id ?? null

  const res = await fetch(
    `https://api.polar.sh/v1/subscriptions?external_customer_id=${encodeURIComponent(uid)}&active=true&limit=20`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) return
  const body = await res.json()
  const items: { id: string; cancel_at_period_end?: boolean }[] = body.items ?? []

  for (const sub of items) {
    if (sub.id === keepId || sub.cancel_at_period_end) continue
    await fetch(`https://api.polar.sh/v1/subscriptions/${sub.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cancel_at_period_end: true }),
    }).catch(() => {})
  }
}
