let ctx = null
let muted = false
let lastTick = 0

export function setMuted(value) {
  muted = value
}

function audio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// Must be called from a user gesture so the browser allows audio.
export function unlockAudio() {
  audio()
}

function blip(freq, start, length, volume, type = 'triangle') {
  const c = audio()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(volume, start)
  gain.gain.exponentialRampToValueAtTime(0.001, start + length)
  osc.connect(gain).connect(c.destination)
  osc.start(start)
  osc.stop(start + length + 0.02)
}

export function tick() {
  if (muted) return
  const now = performance.now()
  if (now - lastTick < 35) return
  lastTick = now
  blip(1700, audio().currentTime, 0.04, 0.22)
}

export function winSound() {
  if (muted) return
  const t = audio().currentTime
  ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => blip(f, t + i * 0.11, 0.35, 0.28))
  blip(1046.5, t + 0.5, 0.8, 0.22, 'sine')
}

// ---------- Recorded clips (assets/sounds, from mixkit.co) ----------

// Imported so Vite fingerprints and bundles them with the app.
const CLIP_URLS = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/sounds/*.mp3', { eager: true, query: '?url', import: 'default' })).map(
    ([path, url]) => [path.split('/').pop().replace('.mp3', ''), url],
  ),
)

const clips = {}
const stopTimers = {}

function clip(name) {
  if (!clips[name]) {
    clips[name] = new Audio(CLIP_URLS[name])
    clips[name].preload = 'auto'
  }
  return clips[name]
}

export function preloadClips(names) {
  names.forEach((n) => clip(n).load())
}

// Plays a clip from the start; `maxSec` fades it out early (for long loops).
export function playClip(name, { maxSec, volume = 1 } = {}) {
  if (muted) return
  const a = clip(name)
  clearInterval(stopTimers[name])
  a.pause()
  a.currentTime = 0
  a.volume = volume
  a.play().catch(() => {})
  if (maxSec) {
    const t0 = performance.now()
    stopTimers[name] = setInterval(() => {
      const left = maxSec - (performance.now() - t0) / 1000
      if (left <= 0) {
        a.pause()
        clearInterval(stopTimers[name])
      } else if (left < 0.8) {
        a.volume = volume * (left / 0.8)
      }
    }, 50)
  }
}

export function countdownBeep() {
  if (muted) return
  blip(880, audio().currentTime, 0.12, 0.25, 'square')
}
