export interface UserProfile {
  name: string
  goal: string
  trainingTime: 'morning' | 'afternoon' | 'evening'
  streak: number
  lastSessionDate: string | null
  sessionCount: number
}

export interface MuscleScores {
  FOCUS: number
  SPEED: number
  MEMORY: number
  LOGIC: number
  WORDS: number
  CONTROL: number
}

export interface SessionResult {
  date: string
  muscleGroup: string
  set1Score: number
  set2Score: number
  set3Score: number
  sessionScore: number
  honesScore: number
  isPersonalRecord: boolean
}

export interface AppState {
  profile: UserProfile | null
  muscleScores: MuscleScores
  honesScore: number
  sessionHistory: SessionResult[]
  bestScores: Partial<MuscleScores>
}

const DEFAULT_STATE: AppState = {
  profile: null,
  muscleScores: { FOCUS: 0, SPEED: 0, MEMORY: 0, LOGIC: 0, WORDS: 0, CONTROL: 0 },
  honesScore: 0,
  sessionHistory: [],
  bestScores: {},
}

export function loadState(): AppState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = localStorage.getItem('hone:state')
    if (!raw) return DEFAULT_STATE
    return { ...DEFAULT_STATE, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_STATE
  }
}

export function saveState(state: AppState): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('hone:state', JSON.stringify(state))
}

export function saveProfile(profile: UserProfile): AppState {
  const state = loadState()
  const next = { ...state, profile }
  saveState(next)
  return next
}

export function saveSessionResult(result: SessionResult): AppState {
  const state = loadState()

  const muscleKey = result.muscleGroup as keyof MuscleScores
  const prev = state.bestScores[muscleKey] ?? 0
  const isNewPR = result.sessionScore > prev

  const updatedBests = isNewPR
    ? { ...state.bestScores, [muscleKey]: result.sessionScore }
    : state.bestScores

  const updatedMuscle = {
    ...state.muscleScores,
    [muscleKey]: Math.round(
      state.muscleScores[muscleKey] * 0.3 + result.sessionScore * 0.7
    ),
  }

  const honesScore = calcHonesScore(updatedMuscle)

  const today = new Date().toISOString().split('T')[0]
  const lastDate = state.profile?.lastSessionDate
  const streak =
    lastDate === today
      ? state.profile?.streak ?? 1
      : lastDate === getPrevDay(today)
      ? (state.profile?.streak ?? 0) + 1
      : 1

  const profile = state.profile
    ? {
        ...state.profile,
        lastSessionDate: today,
        streak,
        sessionCount: (state.profile.sessionCount ?? 0) + 1,
      }
    : state.profile

  const next: AppState = {
    ...state,
    profile,
    muscleScores: updatedMuscle,
    honesScore,
    bestScores: updatedBests,
    sessionHistory: [result, ...state.sessionHistory].slice(0, 100),
  }
  saveState(next)
  return next
}

function getPrevDay(dateStr: string): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

export function calcHonesScore(muscles: MuscleScores): number {
  const values = Object.values(muscles)
  const active = values.filter(v => v > 0)
  if (active.length === 0) return 0
  const avg = active.reduce((a, b) => a + b, 0) / active.length
  return Math.round(avg)
}

export function getMuscleColor(muscle: string): string {
  const map: Record<string, string> = {
    FOCUS: '#B8F53C',
    SPEED: '#3C8BF5',
    MEMORY: '#A03CF5',
    LOGIC: '#F58A3C',
    WORDS: '#3CF5D1',
    CONTROL: '#F5503C',
  }
  return map[muscle] ?? '#B8F53C'
}

export function getGoalSplit(goal: string): string[] {
  const splits: Record<string, string[]> = {
    'Sharp Mind': ['FOCUS', 'MEMORY', 'LOGIC'],
    'Executive Focus': ['FOCUS', 'CONTROL', 'SPEED'],
    'Creative Edge': ['WORDS', 'LOGIC', 'MEMORY'],
    'Fast Reactions': ['SPEED', 'CONTROL', 'FOCUS'],
    'Deep Memory': ['MEMORY', 'LOGIC', 'WORDS'],
  }
  return splits[goal] ?? ['FOCUS', 'SPEED', 'MEMORY']
}
