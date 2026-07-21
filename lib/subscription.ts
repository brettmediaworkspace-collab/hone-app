// Free muscles available without Pro
export const FREE_MUSCLES = ['FOCUS', 'SPEED', 'WORDS'] as const
export const PRO_MUSCLES = ['MEMORY', 'LOGIC', 'CONTROL'] as const

export type Plan = 'free' | 'monthly' | 'annual' | 'lifetime'

export interface SubscriptionState {
  isPro: boolean
  plan: Plan
  expiresAt: string | null  // ISO date, null = lifetime or free
  stripeSessionId: string | null
  lastSessionDate: string | null  // YYYY-MM-DD - enforces 1 session/day limit
}

const KEY = 'hone:subscription'

const DEFAULT: SubscriptionState = {
  isPro: false,
  plan: 'free',
  expiresAt: null,
  stripeSessionId: null,
  lastSessionDate: null,
}

export function getSubscription(): SubscriptionState {
  if (typeof window === 'undefined') return DEFAULT
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT
    const s: SubscriptionState = JSON.parse(raw)

    // Expire subscription if past end date
    if (s.isPro && s.expiresAt && new Date(s.expiresAt) < new Date()) {
      const expired = { ...DEFAULT }
      localStorage.setItem(KEY, JSON.stringify(expired))
      return expired
    }
    return s
  } catch {
    return DEFAULT
  }
}

export function saveSubscription(update: Partial<SubscriptionState>) {
  const current = getSubscription()
  const next = { ...current, ...update }
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

export function isPro(): boolean {
  return getSubscription().isPro
}

export function isFreeMuscle(muscle: string): boolean {
  return (FREE_MUSCLES as readonly string[]).includes(muscle)
}

export function isProMuscle(muscle: string): boolean {
  return (PRO_MUSCLES as readonly string[]).includes(muscle)
}

export function canStartSession(): boolean {
  const sub = getSubscription()
  if (sub.isPro) return true
  const today = new Date().toISOString().split('T')[0]
  return sub.lastSessionDate !== today
}

export function markSessionStarted() {
  const today = new Date().toISOString().split('T')[0]
  saveSubscription({ lastSessionDate: today })
}

export function activatePro(plan: Plan, sessionId: string, expiresAt: string | null = null) {
  saveSubscription({ isPro: true, plan, stripeSessionId: sessionId, expiresAt })
}
