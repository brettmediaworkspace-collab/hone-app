// Write-through cloud mirror for HONE state.
//
// localStorage stays the synchronous source of truth (games and pages
// read it directly); every save is mirrored to Firestore fire-and-forget.
// On sign-in we pull the remote copy and keep whichever side has more
// training history. If Firestore is unreachable or rules aren't deployed
// yet, everything silently stays local-only.

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'
import { AppState, loadState, saveState } from '@/lib/gameState'
import { getSubscription, saveSubscription, Plan } from '@/lib/subscription'

const COLLECTION = 'hone_users'

function userDoc(uid: string) {
  return doc(db, COLLECTION, uid)
}

/** Mirror current local state to Firestore. Never throws. */
export function pushLocalState(uid?: string) {
  const id = uid ?? auth.currentUser?.uid
  if (!id) return
  const state = loadState()
  // Subscription is mirrored for visibility only - the server-verified
  // copy written by the payments webhook is the one that matters.
  setDoc(
    userDoc(id),
    {
      state,
      localSubscription: getSubscription(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  ).catch(() => {
    /* offline or rules not deployed - stay local-only */
  })
}

/**
 * Pull remote state and adopt it if it has more progress than local.
 * Returns true if remote state was adopted.
 */
export async function pullRemoteState(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(userDoc(uid))
    if (!snap.exists()) return false

    // The server-verified subscription (written only by the payments
    // webhook) always wins over the local cache - grants follow the
    // account onto new devices, revocations propagate too.
    const serverSub = snap.data()?.subscription
    if (serverSub && typeof serverSub.isPro === 'boolean') {
      saveSubscription({
        isPro: serverSub.isPro,
        plan: (serverSub.plan ?? 'free') as Plan,
        expiresAt: serverSub.expiresAt ?? null,
        stripeSessionId: serverSub.lsId ?? null,
      })
    }

    const remote = snap.data()?.state as AppState | undefined
    if (!remote?.profile) return false

    const local = loadState()
    const remoteProgress =
      (remote.sessionHistory?.length ?? 0) + (remote.honesScore > 0 ? 1 : 0)
    const localProgress =
      (local.sessionHistory?.length ?? 0) + (local.honesScore > 0 ? 1 : 0)

    if (remoteProgress > localProgress) {
      saveState(remote)
      return true
    }
    return false
  } catch {
    return false
  }
}

/**
 * Explicit "restore from account": always adopt whatever the server holds
 * for this user, with no progress comparison. Unlike pullRemoteState this
 * will overwrite local data, so only call it from a deliberate user
 * action. Returns whether saved training was found.
 */
export async function restoreFromAccount(uid: string): Promise<{ found: boolean }> {
  try {
    const snap = await getDoc(userDoc(uid))
    if (!snap.exists()) return { found: false }
    const data = snap.data()

    // Server-verified subscription comes back regardless of training data.
    const serverSub = data?.subscription
    if (serverSub && typeof serverSub.isPro === 'boolean') {
      saveSubscription({
        isPro: serverSub.isPro,
        plan: (serverSub.plan ?? 'free') as Plan,
        expiresAt: serverSub.expiresAt ?? null,
        stripeSessionId: serverSub.lsId ?? serverSub.providerId ?? null,
      })
    }

    const remote = data?.state as AppState | undefined
    if (!remote?.profile) return { found: false }
    saveState(remote)
    return { found: true }
  } catch {
    return { found: false }
  }
}
