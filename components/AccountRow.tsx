'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { restoreFromAccount } from '@/lib/cloudSync'
import { auth } from '@/lib/firebase'
import { loadState } from '@/lib/gameState'

// Shows which account you're signed into and offers an explicit restore
// that always trusts the server. Only rendered for signed-in users.
export default function AccountRow() {
  const { user, isLinked } = useAuth()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  if (!user || !isLinked) return null

  async function handleRestore() {
    const local = loadState()
    const hasLocal = (local.sessionHistory?.length ?? 0) > 0 || local.honesScore > 0
    if (
      hasLocal &&
      !confirm(
        'Replace the training on this device with whatever your account holds? Any progress made here that has not synced will be lost.'
      )
    ) {
      return
    }
    setMsg(null)
    setBusy(true)
    const uid = auth.currentUser?.uid
    const res = uid ? await restoreFromAccount(uid) : { found: false }
    if (res.found) {
      window.location.reload()
      return
    }
    setBusy(false)
    setMsg('That account has no saved training yet.')
  }

  return (
    <div className="px-1 mt-4 mb-2">
      <p className="text-xs font-mono text-hone-muted truncate">
        Signed in as {user.email ?? 'your account'}
      </p>
      <button
        onClick={handleRestore}
        disabled={busy}
        className="block text-left mt-1 text-xs font-mono text-hone-muted underline underline-offset-4 disabled:opacity-50"
      >
        {busy ? 'Restoring...' : 'Restore from account'}
      </button>
      {msg && <p className="text-xs text-hone-red mt-1">{msg}</p>}
    </div>
  )
}
