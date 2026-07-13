// Lemon Squeezy webhook — the ONLY path that grants or revokes HONE Pro.
//
// LS signs each request with HMAC-SHA256 over the raw body using the
// webhook's signing secret (LEMONSQUEEZY_WEBHOOK_SECRET). We verify the
// X-Signature header before trusting anything, then write the
// server-authoritative `subscription` field on hone_users/{uid} via the
// Admin SDK (clients are blocked from that field by Firestore rules).
//
// The paying user's uid + chosen plan arrive in checkout custom data
// (checkout[custom][uid], checkout[custom][plan]) set by PaywallScreen.

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { adminDb } from '@/lib/firebaseAdmin'
import { FieldValue } from 'firebase-admin/firestore'

export const runtime = 'nodejs'

const GRANT_EVENTS = new Set([
  'order_created',
  'subscription_created',
  'subscription_payment_success',
  'subscription_resumed',
  'subscription_unpaused',
])

const REVOKE_EVENTS = new Set(['subscription_expired'])

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET
  if (!secret || !signature) return false
  const digest = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')
  try {
    return crypto.timingSafeEqual(
      Buffer.from(digest, 'hex'),
      Buffer.from(signature, 'hex')
    )
  } catch {
    return false
  }
}

function planExpiry(plan: string, attributes: Record<string, unknown>): string | null {
  // Prefer LS's own renewal date when present (subscriptions).
  const renewsAt = attributes?.renews_at
  if (typeof renewsAt === 'string' && renewsAt) return renewsAt
  if (plan === 'lifetime') return null
  const days = plan === 'annual' ? 365 : 30
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  if (!verifySignature(rawBody, req.headers.get('x-signature'))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  let payload: {
    meta?: { event_name?: string; custom_data?: { uid?: string; plan?: string } }
    data?: { id?: string; attributes?: Record<string, unknown> }
  }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const event = payload.meta?.event_name ?? ''
  const uid = payload.meta?.custom_data?.uid
  const plan = payload.meta?.custom_data?.plan ?? 'monthly'
  const attributes = payload.data?.attributes ?? {}

  if (!uid) {
    // No uid means the checkout wasn't started from the app — nothing to
    // grant. Acknowledge so LS doesn't retry forever.
    return NextResponse.json({ ok: true, note: 'no uid in custom_data' })
  }

  const db = adminDb()
  const ref = db.collection('hone_users').doc(uid)

  if (GRANT_EVENTS.has(event)) {
    // Lifetime is a one-off order; don't let a later subscription event
    // downgrade it.
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
          expiresAt: planExpiry(plan, attributes),
          lsId: payload.data?.id ?? null,
          lsEvent: event,
          updatedAt: FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    )
    return NextResponse.json({ ok: true, granted: plan })
  }

  if (REVOKE_EVENTS.has(event)) {
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
          lsId: payload.data?.id ?? null,
          lsEvent: event,
          updatedAt: FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    )
    return NextResponse.json({ ok: true, revoked: true })
  }

  return NextResponse.json({ ok: true, note: `ignored event ${event}` })
}
