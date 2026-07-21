'use client'

// Daily streak reminders via Web Push (FCM). The client's only jobs are:
// ask permission, mint a device token, and store it on the user's doc.
// The actual sending is done server-side by /api/cron/reminders.
//
// iOS note: Safari only supports web push when the PWA has been added to
// the Home Screen, so isSupported() returns false in a normal iOS tab.

import { getMessaging, getToken, isSupported } from 'firebase/messaging'
import { doc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'

const SW_URL = '/firebase-messaging-sw.js'
const SW_SCOPE = '/firebase-cloud-messaging-push-scope'

export async function pushSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return false
  if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) return false
  try {
    return await isSupported()
  } catch {
    return false
  }
}

export function permissionState(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

/** True on iOS Safari outside an installed PWA, where push can't work yet. */
export function needsHomeScreenInstall(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua)
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  return isIOS && !standalone
}

export async function enableReminders(): Promise<{ ok: boolean; reason?: string }> {
  const uid = auth.currentUser?.uid
  if (!uid) return { ok: false, reason: 'not-signed-in' }
  if (!(await pushSupported())) return { ok: false, reason: 'unsupported' }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { ok: false, reason: 'denied' }

  try {
    // Own scope so we don't clobber the app's caching service worker.
    const registration = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE })
    const messaging = getMessaging()
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    })
    if (!token) return { ok: false, reason: 'no-token' }

    await setDoc(
      doc(db, 'hone_users', uid),
      {
        reminders: {
          enabled: true,
          tokens: arrayUnion(token),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
        },
      },
      { merge: true }
    )
    return { ok: true }
  } catch (e) {
    console.error('[reminders] enable failed', e)
    return { ok: false, reason: 'error' }
  }
}

export async function disableReminders(): Promise<void> {
  const uid = auth.currentUser?.uid
  if (!uid) return
  try {
    const registration = await navigator.serviceWorker.getRegistration(SW_SCOPE)
    let token: string | null = null
    if (registration && (await pushSupported())) {
      try {
        token = await getToken(getMessaging(), {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: registration,
        })
      } catch {
        /* token may already be gone */
      }
    }
    await setDoc(
      doc(db, 'hone_users', uid),
      {
        reminders: {
          enabled: false,
          ...(token ? { tokens: arrayRemove(token) } : {}),
        },
      },
      { merge: true }
    )
  } catch (e) {
    console.error('[reminders] disable failed', e)
  }
}
