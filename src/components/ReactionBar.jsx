import { playClip } from '../lib/sound'
import { emojiRain, shake } from '../lib/effects'
import { fireConfetti } from '../lib/screens'

export const REACTIONS = [
  { emoji: '😂', label: 'ضحك', sound: 'laugh', rain: ['😂', '🤣', '😆'] },
  { emoji: '👏', label: 'تصفيق', sound: 'applause', maxSec: 6, rain: ['👏', '🎉', '🙌'], confetti: true },
  { emoji: '🥁', label: 'طبلة', sound: 'drumroll' },
  { emoji: '❌', label: 'غلط', sound: 'wrong', rain: ['❌'], count: 18, shake: true },
  { emoji: '🎺', label: 'خسارة', sound: 'trombone', rain: ['😢', '💔'] },
  { emoji: '🦗', label: 'صراصير', sound: 'crickets', maxSec: 5, rain: ['🦗'], count: 12, slow: true },
]

export function fireReaction(r) {
  playClip(r.sound, { maxSec: r.maxSec })
  if (r.rain) emojiRain(r.rain, { count: r.count, slow: r.slow })
  if (r.confetti) fireConfetti({ particleCount: 150, spread: 120, origin: { y: 0.7 }, zIndex: 300 })
  if (r.shake) shake()
}

export default function ReactionBar() {
  return (
    <div className="reactions">
      {REACTIONS.map((r, i) => (
        <button key={r.sound} className="reaction" onClick={() => fireReaction(r)} title={r.label}>
          <span className="reaction-emoji">{r.emoji}</span>
          <kbd>{i + 1}</kbd>
        </button>
      ))}
    </div>
  )
}
