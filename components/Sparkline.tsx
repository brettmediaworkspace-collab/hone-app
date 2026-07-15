'use client'

// HONE Score trend over recent sessions. Pure SVG, no deps.
export default function Sparkline({
  values,
  height = 56,
}: {
  values: number[] // chronological, oldest first
  height?: number
}) {
  if (values.length < 2) return null

  const w = 320
  const pad = 6
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(1, max - min)

  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2)
    const y = pad + (1 - (v - min) / span) * (height - pad * 2)
    return [x, y] as const
  })

  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${height - 1} L${pts[0][0].toFixed(1)},${height - 1} Z`
  const [lx, ly] = pts[pts.length - 1]

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${height}`} role="img" aria-label="Score trend">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B8F53C" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#B8F53C" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-fill)" />
      <path d={line} fill="none" stroke="#B8F53C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="3.5" fill="#B8F53C" />
    </svg>
  )
}
