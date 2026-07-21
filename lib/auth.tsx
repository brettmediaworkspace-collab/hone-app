'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  linkWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  User,
  AuthError,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { pullRemoteState, pushLocalState } from '@/lib/cloudSync'
import { setSyncListener } from '@/lib/gameState'

interface AuthContextValue {
  user: User | null
  /** True once Firebase has resolved the initial auth state. */
  ready: boolean
  /** True when signed in with a real (non-anonymous) account. */
  isLinked: boolean
  /** Sign in with Google - links the anonymous account if one exists. */
  signInWithGoogle: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  ready: false,
  isLinked: false,
  signInWithGoogle: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Mirror every local save to Firestore while mounted.
    setSyncListener(() => pushLocalState())

    const unsub = onAuthStateChanged(auth, async u => {
      if (u) {
        setUser(u)
        setReady(true)
        // Merge cloud state on sign-in (linked accounts may have data
        // from another device).
        if (!u.isAnonymous) await pullRemoteState(u.uid)
        pushLocalState(u.uid)
        return
      }
      // No user: try anonymous sign-in so progress can sync silently.
      // If the provider isn't enabled yet (or offline), the app keeps
      // working localStorage-only.
      try {
        await signInAnonymously(auth)
      } catch {
        setUser(null)
        setReady(true)
      }
    })
    return () => {
      setSyncListener(null)
      unsub()
    }
  }, [])

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider()
    // Always offer the account chooser. Without this Google silently
    // reuses the current session, so there's no way to pick a different
    // account (or to sign in at all if the wrong one is remembered).
    provider.setCustomParameters({ prompt: 'select_account' })
    if (auth.currentUser?.isAnonymous) {
      try {
        // Upgrade the anonymous account in place - keeps uid and data.
        await linkWithPopup(auth.currentUser, provider)
        return
      } catch (e: unknown) {
        const code = (e as { code?: string })?.code
        if (code !== 'auth/credential-already-in-use') throw e
        // This Google identity already owns an account (e.g. the user is
        // signing in on a second device). Reuse the credential from the
        // error rather than opening a second popup, which browsers often
        // block because it isn't a direct response to a click.
        const cred = GoogleAuthProvider.credentialFromError(e as AuthError)
        if (cred) {
          await signInWithCredential(auth, cred)
          return
        }
      }
    }
    await signInWithPopup(auth, provider)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        ready,
        isLinked: !!user && !user.isAnonymous,
        signInWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
