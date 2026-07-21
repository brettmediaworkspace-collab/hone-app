'use client'

import { getMuscleColor } from '@/lib/gameState'

const MUSCLES = ['FOCUS', 'SPEED', 'MEMORY', 'LOGIC', 'WORDS', 'CONTROL'] as const

// Six-axis "body scan" radar of the muscle groups. Pure SVG, no deps.
// Untrained muscles render as a ghost ring so new users see the shape
// of what they're building rather than an empty box.
export default function RadarChart({
  scores,
  size = 280,
}: {
  scores: { [K in (typeof MUSCLES)[number]]: number }
  size?: number
}) {
  const cx = size / 2
  const cy = size / 2
  const maxR = size / 2 - 44 // leave room for labels
  const angle = (i: number) => (Math.PI / 3) * i - Math.PI / 2

  const point = (i: number, r: number): [number, number] => [
    cx + r * Math.cos(angle(i)),
    cy + r * Math.sin(angle(i)),
  ]

  const ringPath = (frac: number) =>
    MUSCLES.map((_, i) => point(i, maxR * frac))
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(' ') + ' Z'

  const values = MUSCLES.map(m => Math.max(0, Math.min(1000, scores[m] ?? 0)))
  const trained = values.some(v => v > 0)
  // Floor tiny values so the shape stays legible
  const dataPath =
    values
      .map((v, i) => point(i, maxR * Math.max(0.06, v / 1000)))
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(' ') + ' Z'

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Muscle group radar chart"
    >
      {/* grid rings */}
      {[0.25, 0.5, 0.75, 1].map(f => (
        <path key={f} d={ringPath(f)} fill="none" stroke="#2A2A36" strokeWidth="1" />
      ))}
      {/* spokes */}
      {MUSCLES.map((_, i) => {
        const [x, y] = point(i, maxR)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#2A2A36" strokeWidth="1" />
      })}

      {/* data */}
      {trained ? (
        <>
          <path d={dataPath} fill="#B8F53C" fillOpacity="0.12" stroke="#B8F53C" strokeWidth="2" strokeLinejoin="round" />
          {values.map((v, i) => {
            if (v <= 0) return null
            const [x, y] = point(i, maxR * Math.max(0.06, v / 1000))
            return <circle key={i} cx={x} cy={y} r="3.5" fill={getMuscleColor(MUSCLES[i])} />
          })}
        </>
      ) : (
        <path d={ringPath(0.55)} fill="none" stroke="#6B6B80" strokeWidth="1.5" strokeDasharray="4 5" />
      )}

      {/* labels + values */}
      {MUSCLES.map((m, i) => {
        const [x, y] = point(i, maxR + 24)
        const v = values[i]
        return (
          <g key={m} textAnchor="middle">
            <text
              x={x}
              y={y}
              fill={v > 0 ? getMuscleColor(m) : '#6B6B80'}
              fontSize="10"
              fontFamily="DM Mono, monospace"
              fontWeight="700"
              letterSpacing="1"
            >
              {m}
            </text>
            <text
              x={x}
              y={y + 13}
              fill={v > 0 ? '#F0F0F0' : '#3A3A4A'}
              fontSize="10"
              fontFamily="DM Mono, monospace"
            >
              {v > 0 ? v : '-'}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
