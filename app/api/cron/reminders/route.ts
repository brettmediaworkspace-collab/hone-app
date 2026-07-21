// Daily streak reminders. Runs hourly (Vercel Cron) and pushes to users
// whose local time has reached their chosen training window and who
// haven't trained yet today.
//
// Two nudge types, at most one of each per user per local day:
//   primary    - at their preferred window (morning 08:00 / afternoon
//                13:00 / evening 19:00 local)
//   streak-save- at 20:00 local, only if a streak of 3+ is about to break
//
// Protected by CRON_SECRET (Vercel Cron sends it as a bearer token).

import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminMessaging } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const WINDOW_HOUR: Record<string, number> = {
  morning: 8,
  afternoon: 13,
  evening: 19,
}
const SAVE_HOUR = 20
const MAX_USERS_PER_RUN = 500

function localParts(timezone: string, now: Date): { date: string; hour: number } {
  let tz = timezone
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz })
  } catch {
    tz = 'UTC'
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
    })
      .formatToParts(now)
      .map(p => [p.type, p.value])
  ) as Record<string, string>
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: parseInt(parts.hour, 10) % 24,
  }
}

function buildMessage(type: 'primary' | 'save', streak: number, name: string) {
  const who = name ? `${name}, ` : ''
  if (type === 'save') {
    return {
      title: `Your ${streak}-day streak ends at midnight`,
      body: 'One 7-minute session saves it.',
    }
  }
  if (streak >= 1) {
    return {
      title: `Keep your ${streak}-day streak alive`,
      body: `${who}7 minutes is all it takes.`.trim(),
    }
  }
  return {
    title: 'Time to train',
    body: '7 minutes. Six muscle groups. One score to beat.',
  }
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const db = adminDb()
  const now = new Date()

  // Test mode: ?test=1&uid=<uid> sends immediately to one user, ignoring
  // the time window and the once-per-day guard, so push delivery can be
  // verified without waiting for the real window. Still secret-protected
  // and never writes lastSent.
  const isTest = !!req.nextUrl.searchParams.get('test')
  const testEmail = req.nextUrl.searchParams.get('email')
  let testUid = isTest ? req.nextUrl.searchParams.get('uid') : null

  // Convenience: ?test=1&email=you@example.com resolves the uid for you,
  // so there's no need to dig the document ID out of Firestore.
  if (isTest && !testUid && testEmail) {
    const match = await db.collection('hone_users').where('email', '==', testEmail).limit(1).get()
    if (match.empty) {
      return NextResponse.json(
        { ok: false, error: `no account found for ${testEmail} - sign in and tap "Remind me daily" first` },
        { status: 404 }
      )
    }
    testUid = match.docs[0].id
  }

  if (testUid) {
    const docSnap = await db.collection('hone_users').doc(testUid).get()
    const tokens: string[] = docSnap.data()?.reminders?.tokens ?? []
    if (!tokens.length) {
      return NextResponse.json({ ok: false, uid: testUid, error: 'no push tokens on this account - tap "Remind me daily" in the app first' }, { status: 404 })
    }
    const res = await adminMessaging().sendEachForMulticast({
      tokens,
      notification: { title: 'HONE test reminder', body: 'Push is working. Real nudges arrive at your training time.' },
      webpush: {
        notification: { icon: '/icon-192.png', badge: '/icon-192.png', tag: 'hone-streak-reminder' },
        fcmOptions: { link: 'https://app.hone.appsplosh.com' },
      },
    })
    return NextResponse.json({
      ok: true,
      test: true,
      uid: testUid,
      tokens: tokens.length,
      sent: res.successCount,
      failed: res.failureCount,
      errors: res.responses.filter(r => !r.success).map(r => (r.error as { code?: string })?.code ?? 'unknown'),
    })
  }

  const snap = await db
    .collection('hone_users')
    .where('reminders.enabled', '==', true)
    .limit(MAX_USERS_PER_RUN)
    .get()

  let considered = 0
  let sent = 0
  let cleaned = 0

  for (const docSnap of snap.docs) {
    considered++
    const data = docSnap.data() ?? {}
    const reminders = data.reminders ?? {}
    const profile = data.state?.profile
    const tokens: string[] = Array.isArray(reminders.tokens) ? reminders.tokens : []
    if (!profile || tokens.length === 0) continue

    const { date: today, hour } = localParts(reminders.timezone ?? 'UTC', now)

    // Already trained today - nothing to nudge.
    if (profile.lastSessionDate === today) continue

    const streak: number = profile.streak ?? 0
    const targetHour = WINDOW_HOUR[profile.trainingTime as string] ?? WINDOW_HOUR.morning

    let type: 'primary' | 'save' | null = null
    if (hour === targetHour) type = 'primary'
    else if (hour === SAVE_HOUR && streak >= 3) type = 'save'
    if (!type) continue

    // One of each type per local day.
    if (reminders.lastSent?.[type] === today) continue

    const { title, body } = buildMessage(type, streak, profile.name ?? '')
    const res = await adminMessaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      webpush: {
        notification: { icon: '/icon-192.png', badge: '/icon-192.png', tag: 'hone-streak-reminder' },
        fcmOptions: { link: 'https://app.hone.appsplosh.com' },
      },
    })

    // Drop tokens the browser has revoked so we stop retrying them.
    const dead: string[] = []
    res.responses.forEach((r, i) => {
      const code = (r.error as { code?: string } | undefined)?.code ?? ''
      if (!r.success && (code.includes('registration-token-not-registered') || code.includes('invalid-argument'))) {
        dead.push(tokens[i])
      }
    })

    const update: Record<string, unknown> = {
      [`reminders.lastSent.${type}`]: today,
    }
    if (dead.length) {
      update['reminders.tokens'] = tokens.filter(t => !dead.includes(t))
      cleaned += dead.length
    }
    await docSnap.ref.update(update)
    if (res.successCount > 0) sent++
  }

  return NextResponse.json({ ok: true, considered, sent, cleanedTokens: cleaned })
}
