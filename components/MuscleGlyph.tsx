import { getMuscleColor } from '@/lib/gameState'

// Geometric marks, one per muscle group. Stroked, brand-consistent,
// legible from 16px up. Colour comes from the muscle unless overridden.
export default function MuscleGlyph({
  muscle,
  size = 20,
  color,
  className,
}: {
  muscle: string
  size?: number
  color?: string
  className?: string
}) {
  const stroke = color ?? getMuscleColor(muscle)
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke,
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  }

  switch (muscle) {
    case 'FOCUS': // crosshair - selective attention
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="1.6" fill={stroke} stroke="none" />
          <path d="M12 1.5V4M12 20v2.5M1.5 12H4M20 12h2.5" />
        </svg>
      )
    case 'SPEED': // bolt - reaction speed
      return (
        <svg {...common}>
          <path d="M13 2 4 13.5h6l-1 8.5 9-12.5h-6l1-7.5Z" />
        </svg>
      )
    case 'MEMORY': // stacked layers - encoding depth
      return (
        <svg {...common}>
          <path d="M12 3 20.5 7.5 12 12 3.5 7.5 12 3Z" />
          <path d="M3.5 12 12 16.5 20.5 12" />
          <path d="M3.5 16.5 12 21 20.5 16.5" />
        </svg>
      )
    case 'LOGIC': // decision tree - reasoning
      return (
        <svg {...common}>
          <circle cx="12" cy="5" r="2.5" />
          <circle cx="5" cy="19" r="2.5" />
          <circle cx="19" cy="19" r="2.5" />
          <path d="M11 7.2 6 16.6M13 7.2 18 16.6" />
        </svg>
      )
    case 'WORDS': // speech - verbal fluency
      return (
        <svg {...common}>
          <path d="M4 5h16a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-8l-4.5 3.5V16H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
          <path d="M7.5 10.5h.01M12 10.5h.01M16.5 10.5h.01" />
        </svg>
      )
    case 'CONTROL': // brake in hexagon - inhibitory control
      return (
        <svg {...common}>
          <path d="M12 2.5 20 7v10l-8 4.5L4 17V7l8-4.5Z" />
          <rect x="9" y="9" width="6" height="6" rx="1.2" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7" />
        </svg>
      )
  }
}
