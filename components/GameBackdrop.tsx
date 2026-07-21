// Subtle per-muscle background texture behind each game, so every muscle
// group reads as visually distinct at a glance. Pure CSS gradients in the
// muscle's accent colour at very low opacity - no assets, theme-safe.
export default function GameBackdrop({
  muscle,
  color,
}: {
  muscle: string
  color: string
}) {
  const c = color
  let backgroundImage = ''
  let backgroundSize = 'auto'

  switch (muscle) {
    case 'FOCUS': // concentric rings - a target
      backgroundImage = `repeating-radial-gradient(circle at 50% 42%, ${c}14 0 1px, transparent 1px 30px)`
      break
    case 'SPEED': // diagonal motion streaks
      backgroundImage = `repeating-linear-gradient(115deg, ${c}12 0 2px, transparent 2px 24px)`
      break
    case 'MEMORY': // node dot-grid
      backgroundImage = `radial-gradient(${c}1f 1.3px, transparent 1.4px)`
      backgroundSize = '24px 24px'
      break
    case 'LOGIC': // orthogonal grid
      backgroundImage = `repeating-linear-gradient(0deg, ${c}0f 0 1px, transparent 1px 26px), repeating-linear-gradient(90deg, ${c}0f 0 1px, transparent 1px 26px)`
      break
    case 'WORDS': // ruled baselines
      backgroundImage = `repeating-linear-gradient(0deg, ${c}14 0 1.5px, transparent 1.5px 18px)`
      break
    case 'CONTROL': // crosshatch mesh
      backgroundImage = `repeating-linear-gradient(60deg, ${c}12 0 1px, transparent 1px 22px), repeating-linear-gradient(-60deg, ${c}12 0 1px, transparent 1px 22px)`
      break
    default:
      backgroundImage = 'none'
  }

  return (
    <div
      aria-hidden
      className="absolute inset-0 z-0 pointer-events-none"
      style={{
        backgroundImage,
        backgroundSize,
        // Fade the texture toward the edges so it never competes with the
        // game content in the centre.
        maskImage: 'radial-gradient(ellipse at 50% 45%, black 30%, transparent 92%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 50% 45%, black 30%, transparent 92%)',
      }}
    />
  )
}
