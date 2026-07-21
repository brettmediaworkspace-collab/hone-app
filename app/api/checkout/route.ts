// Creates a Polar checkout session server-side and redirects the buyer
// to it. Static checkout links ignore metadata query params, so this is
// the only reliable way to attach the buyer's uid - which the webhook
// needs in order to grant Pro to the right account.
//
// GET /api/checkout?plan=monthly|annual|lifetime&uid=<firebase-uid>
//
// Requires POLAR_ACCESS_TOKEN (Polar → Settings → Developers → New
// token). Products are resolved by name once and cached per instance.

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const POLAR_API = 'https://api.polar.sh/v1'

type Plan = 'monthly' | 'annual' | 'lifetime'

let productCache: Record<Plan, string> | null = null

async function resolveProducts(token: string): Promise<Record<Plan, string>> {
  if (productCache) return productCache
  const res = await fetch(`${POLAR_API}/products?is_archived=false&limit=50`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`products fetch failed: ${res.status}`)
  const body = await res.json()
  const items: { id: string; name: string }[] = body.items ?? []

  const byName = (pred: (n: string) => boolean) =>
    items.find(p => pred(p.name.toLowerCase()))?.id

  const map = {
    lifetime: byName(n => n.includes('lifetime')),
    annual: byName(n => n.includes('annual') || n.includes('year')),
    monthly: byName(n => n.includes('monthly') || n.includes('month')),
  }
  if (!map.monthly || !map.annual || !map.lifetime) {
    throw new Error(
      `could not resolve all products by name; found: ${items.map(p => p.name).join(', ')}`
    )
  }
  productCache = map as Record<Plan, string>
  return productCache
}

export async function GET(req: NextRequest) {
  const token = process.env.POLAR_ACCESS_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'checkout not configured' }, { status: 503 })
  }

  const plan = req.nextUrl.searchParams.get('plan') as Plan | null
  const uid = req.nextUrl.searchParams.get('uid') ?? ''
  if (!plan || !['monthly', 'annual', 'lifetime'].includes(plan)) {
    return NextResponse.json({ error: 'invalid plan' }, { status: 400 })
  }

  try {
    const products = await resolveProducts(token)
    const origin = req.nextUrl.origin

    // Pre-fill billing country from the visitor's geo (Vercel edge
    // header) so most buyers never touch the country dropdown.
    const country = (req.headers.get('x-vercel-ip-country') ?? '').toUpperCase()
    const billingAddress = /^[A-Z]{2}$/.test(country)
      ? { customer_billing_address: { country } }
      : {}

    const res = await fetch(`${POLAR_API}/checkouts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        products: [products[plan]],
        success_url: `${origin}/success?plan=${plan}`,
        ...billingAddress,
        ...(uid
          ? {
              external_customer_id: uid,
              metadata: { uid, plan },
            }
          : { metadata: { plan } }),
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.error('[checkout] polar error', res.status, detail.slice(0, 300))
      return NextResponse.json({ error: 'checkout creation failed' }, { status: 502 })
    }

    const checkout = await res.json()
    return NextResponse.redirect(checkout.url, { status: 303 })
  } catch (e) {
    console.error('[checkout]', e)
    return NextResponse.json({ error: 'checkout creation failed' }, { status: 502 })
  }
}
