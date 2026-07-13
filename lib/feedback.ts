// Audio + haptic feedback for gameplay.
//
// Web Audio blips synthesised on the fly — no assets, ~zero latency.
// Haptics via navigator.vibrate where available (Android; iOS Safari
// ignores it silently). Respects a persisted mute flag.

let ctx: AudioContext | null = null

function audioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!ctx) ctx = new AudioContext()
    // Browsers suspend contexts created before a user gesture; games are
    // tap-driven so this resumes on first interaction.
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  } catch {
    return null
  }
}

export function isMuted(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem('hone:muted') === '1'
}

export function setMuted(muted: boolean) {
  localStorage.setItem('hone:muted', muted ? '1' : '0')
}

function tone(
  freq: number,
  durationMs: number,
  {
    type = 'sine' as OscillatorType,
    gain = 0.08,
    delayMs = 0,
    glideTo = 0,
  } = {}
) {
  const ac = audioCtx()
  if (!ac || isMuted()) return
  const t0 = ac.currentTime + delayMs / 1000
  const t1 = t0 + durationMs / 1000
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t1)
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(gain, t0 + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, t1)
  osc.connect(g).connect(ac.destination)
  osc.start(t0)
  osc.stop(t1 + 0.01)
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern)
    } catch {
      /* unsupported */
    }
  }
}

/** Short bright tick — correct answer. */
export function playCorrect() {
  tone(880, 90, { type: 'sine', gain: 0.07 })
  tone(1320, 70, { type: 'sine', gain: 0.04, delayMs: 30 })
  vibrate(10)
}

/** Low dull thud — wrong answer / miss. */
export function playWrong() {
  tone(160, 140, { type: 'triangle', gain: 0.09, glideTo: 110 })
  vibrate([30, 40, 30])
}

/** Convenience for the common branch shape in games. */
export function playResult(correct: boolean) {
  if (correct) playCorrect()
  else playWrong()
}

/** Rising three-note hit — set complete. */
export function playSetComplete() {
  tone(523, 110, { gain: 0.06 })
  tone(659, 110, { gain: 0.06, delayMs: 110 })
  tone(784, 200, { gain: 0.07, delayMs: 220 })
  vibrate(40)
}

/** Bigger arpeggio + shimmer — personal record / score reveal. */
export function playCelebration() {
  tone(523, 120, { gain: 0.07 })
  tone(659, 120, { gain: 0.07, delayMs: 100 })
  tone(784, 120, { gain: 0.07, delayMs: 200 })
  tone(1047, 320, { gain: 0.08, delayMs: 300 })
  tone(1568, 260, { type: 'sine', gain: 0.03, delayMs: 340 })
  vibrate([40, 60, 40, 60, 80])
}

/** Soft single tick — countdowns and interstitials. */
export function playTick() {
  tone(660, 50, { gain: 0.04 })
}
