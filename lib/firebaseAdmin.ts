// Server-only Firebase Admin init. Used by the payments webhook - the
// Admin SDK bypasses Firestore rules, which is what lets it write the
// otherwise client-locked `subscription` field.
//
// Requires FIREBASE_SERVICE_ACCOUNT env var: the full service-account
// JSON (Firebase console → Project settings → Service accounts →
// Generate new private key), pasted as one line.

import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { getMessaging, Messaging } from 'firebase-admin/messaging'

let app: App | null = null

function ensureApp(): App {
  if (!app) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env var not set')
    const creds = JSON.parse(raw)
    app = getApps().length
      ? getApps()[0]
      : initializeApp({ credential: cert(creds) })
  }
  return app
}

export function adminDb(): Firestore {
  return getFirestore(ensureApp())
}

export function adminMessaging(): Messaging {
  return getMessaging(ensureApp())
}
