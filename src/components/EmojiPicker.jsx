import { useEffect, useRef, useState } from 'react'

// Curated emoji for wheel slices, grouped so the right one is quick to find.
const GROUPS = [
  { label: 'تحديات', emojis: ['🎭', '🗣️', '🎤', '🎵', '🎶', '💃', '🕺', '🤸', '🎨', '✍️', '🤫', '😂', '🤔', '🙈'] },
  {
    label: 'أسئلة وكتاب',
    emojis: ['❓', '❔', '💬', '🙋', '🧠', '📖', '📜', '✝️', '⛪', '🕊️', '🙏', '💡', '📚', '🔍'],
  },
  { label: 'جوكر وهدايا', emojis: ['🃏', '🎁', '⭐', '🌟', '🏆', '🥇', '💰', '💎', '🎉', '🎊', '🍀', '🔥', '❤️'] },
  { label: 'لف وحركة', emojis: ['🔄', '🔁', '🎡', '🎯', '🎲', '⏱️', '⏳', '🚀', '⚡', '🎈', '🧩', '🎮', '👀'] },
]

export default function EmojiPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState('')
  const ref = useRef(null)

  // Close on a click outside or Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (emoji) => {
    onChange(emoji)
    setOpen(false)
  }

  return (
    <div className="emoji-picker" ref={ref}>
      <button
        type="button"
        className={`emoji-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        title="اختار إيموجي"
      >
        {value || '➕'}
      </button>
      {open && (
        <div className="emoji-panel" role="dialog" aria-label="اختار إيموجي">
          {GROUPS.map((g) => (
            <div key={g.label} className="emoji-group">
              <div className="emoji-group-label">{g.label}</div>
              <div className="emoji-grid">
                {g.emojis.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className={`emoji-option ${e === value ? 'selected' : ''}`}
                    onClick={() => pick(e)}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <form
            className="emoji-custom"
            onSubmit={(e) => {
              e.preventDefault()
              if (custom.trim()) pick(custom.trim())
              setCustom('')
            }}
          >
            <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="أو حط إيموجي تاني هنا" />
            <button type="submit" className="btn small">
              ✓
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
