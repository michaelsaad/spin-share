// Face-down cards (solitaire style). The player picks one; it flips over.
import Pinwheel from './Pinwheel'

// Pinwheels sway gently on every card; the hovered/selected card spins, and
// the picked one spins fast before it flips. Hover goes through the shared
// cursor (not CSS :hover) so both screens show the same card.
export default function CardPicker({ count, cursor, picking, flipped, emoji, onPick, onHover }) {
  const locked = picking != null || flipped != null
  return (
    <div className="cards" style={{ '--n': count }} onMouseLeave={() => onHover?.(null)}>
      {Array.from({ length: count }, (_, i) => {
        const cls = [
          'card',
          cursor === i && !locked && 'focus',
          picking === i && 'picking',
          flipped === i && 'flipped',
          locked && picking !== i && flipped !== i && 'gone',
        ]
        return (
          <button
            key={i}
            className={cls.filter(Boolean).join(' ')}
            style={{ animationDelay: `${i * 45}ms`, '--i': i }}
            onClick={() => onPick(i)}
            onMouseEnter={() => onHover?.(i)}
            disabled={locked}
          >
            <span className="card-inner">
              <span className="card-back">
                <Pinwheel className="card-pinwheel" />
                <span className="card-num">{i + 1}</span>
              </span>
              <span className="card-front">{emoji}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
