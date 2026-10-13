import { displayDocs } from './screens'

// Emoji rain + screen shake, done with plain DOM so they sit above everything.
// Each effect is drawn in every window showing the game (laptop + mirror),
// with the same random layout so both screens match.
export function emojiRain(emojis, { count = 36, slow = false } = {}) {
  const drops = Array.from({ length: count }, () => ({
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
    left: Math.random() * 100,
    size: 32 + Math.random() * 48,
    duration: (slow ? 4 : 2) + Math.random() * 2,
    delay: Math.random() * (slow ? 2 : 1),
    drift: (Math.random() - 0.5) * 160,
    turn: (Math.random() - 0.5) * 720,
  }))
  for (const doc of displayDocs()) {
    const layer = doc.createElement('div')
    layer.className = 'emoji-layer'
    for (const d of drops) {
      const drop = doc.createElement('span')
      drop.className = 'emoji-drop'
      drop.textContent = d.emoji
      drop.style.left = `${d.left}vw`
      drop.style.fontSize = `${d.size}px`
      drop.style.animationDuration = `${d.duration}s`
      drop.style.animationDelay = `${d.delay}s`
      drop.style.setProperty('--drift', `${d.drift}px`)
      drop.style.setProperty('--turn', `${d.turn}deg`)
      layer.appendChild(drop)
    }
    doc.body.appendChild(layer)
    setTimeout(() => layer.remove(), slow ? 8500 : 6000)
  }
}

export function shake() {
  for (const doc of displayDocs()) {
    const root = doc.getElementById('root')
    if (!root) continue
    root.classList.remove('shake')
    void root.offsetWidth
    root.classList.add('shake')
    setTimeout(() => root.classList.remove('shake'), 650)
  }
}

// Big floating text (e.g. "+1 ⭐ name") that rises and fades.
export function floatText(text) {
  for (const doc of displayDocs()) {
    const el = doc.createElement('div')
    el.className = 'float-text'
    el.textContent = text
    doc.body.appendChild(el)
    setTimeout(() => el.remove(), 1900)
  }
}

export function shuffled(list) {
  const a = list.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
