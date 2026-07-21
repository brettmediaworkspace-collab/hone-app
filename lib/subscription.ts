// Free muscles available without Pro
import { getGoalSplit } from '@/lib/gameState'

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

// Deterministic per-day RNG so Home's preview and the session itself agree
// on which muscles a free user will actually train.
function seededRandom(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * The split a user will actually train today. Pro users get their goal
 * split; free users get locked muscles swapped for unused free ones -
 * deterministically per day, so the Home preview matches the session.
 */
export function getEffectiveSplit(goal: string, isPro: boolean, dateKey: string): string[] {
  const goalSplit = getGoalSplit(goal)
  if (isPro) return goalSplit
  const used = new Set(goalSplit.filter(m => isFreeMuscle(m)))
  const rand = seededRandom(`${dateKey}|${goal}`)
  const pool = (FREE_MUSCLES as readonly string[])
    .filter(m => !used.has(m))
    .sort(() => rand() - 0.5)
  let next = 0
  return goalSplit.map(m =>
    isFreeMuscle(m) ? m : (pool[next++] ?? FREE_MUSCLES[next % FREE_MUSCLES.length])
  )
}
