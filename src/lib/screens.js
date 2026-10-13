import confetti from 'canvas-confetti'

// ---------- Mirror window on the second screen ----------
// "Start on the second screen" keeps the game on the laptop and opens a second
// window that shows the same game, fullscreen on the other display (like
// Windows' "Duplicate" mode, but only for this app). React renders into it
// through a portal, so both windows always show the same state.

const MIRROR_NAME = 'spin-share-display'
let mirror = null // { win, fire } — fire draws confetti inside the mirror
let otherScreen = null // cached once window-management permission is granted

function pickOther(details) {
  return (
    details.screens.find((s) => s !== details.currentScreen && !s.isPrimary) ||
    details.screens.find((s) => s !== details.currentScreen) ||
    null
  )
}

// If permission was granted before, learn the second screen up front so the
// mirror can open fullscreen straight away on the next click.
export async function warmScreens() {
  try {
    if (!('getScreenDetails' in window)) return
    const status = await navigator.permissions.query({ name: 'window-management' })
    if (status.state !== 'granted') return
    const details = await window.getScreenDetails()
    otherScreen = pickOther(details)
    details.addEventListener('screenschange', () => (otherScreen = pickOther(details)))
  } catch {
    // Not supported: the mirror just opens as a normal window.
  }
}

function writeMirrorDocument(win) {
  const doc = win.document
  doc.open()
  doc.write(
    '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">' +
      '<title>Spin & Share – العرض</title></head><body><div id="root" class="mirror"></div></body></html>',
  )
  doc.close()
  const base = doc.createElement('base')
  base.href = location.href
  doc.head.appendChild(base)
  // Same styles (and fonts) as the main window.
  for (const el of document.head.querySelectorAll('style, link[rel="stylesheet"]')) {
    doc.head.appendChild(doc.importNode(el, true))
  }
  // Confetti layer for this window.
  const canvas = doc.createElement('canvas')
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 300,
  })
  doc.body.appendChild(canvas)
  const fit = () => {
    canvas.width = win.innerWidth
    canvas.height = win.innerHeight
  }
  fit()
  win.addEventListener('resize', fit)
  return confetti.create(canvas, { resize: false })
}

async function moveToOtherScreen(win) {
  try {
    if (!('getScreenDetails' in window)) return
    const details = await window.getScreenDetails() // asks for permission the first time
    otherScreen = pickOther(details)
    if (!otherScreen || win.closed) return
    win.moveTo(otherScreen.availLeft, otherScreen.availTop)
    win.resizeTo(otherScreen.availWidth, otherScreen.availHeight)
  } catch {
    // Permission refused: the window stays where it opened; it can be dragged.
  }
}

// Must run synchronously inside a click so the browser allows the popup.
// Returns the mirror's root element to portal into, or null if blocked.
export function openMirror() {
  const s = otherScreen
  const features = s
    ? `popup,left=${s.availLeft},top=${s.availTop},width=${s.availWidth},height=${s.availHeight},fullscreen`
    : 'popup,width=1280,height=720'
  const win = window.open('', MIRROR_NAME, features)
  if (!win) return null
  const fire = writeMirrorDocument(win)
  mirror = { win, fire }
  if (!s) moveToOtherScreen(win)
  window.addEventListener('pagehide', closeMirror)
  return win
}

export function closeMirror() {
  if (mirror && !mirror.win.closed) mirror.win.close()
  mirror = null
}

function mirrorWindow() {
  return mirror && !mirror.win.closed ? mirror.win : null
}

// Every document currently showing the game.
export function displayDocs() {
  const win = mirrorWindow()
  return win ? [document, win.document] : [document]
}

export function fireConfetti(opts) {
  confetti(opts)
  if (mirrorWindow()) mirror.fire({ ...opts, zIndex: undefined })
}

export function toggleFullscreen(doc = document) {
  if (doc.fullscreenElement) return doc.exitFullscreen()
  return doc.documentElement.requestFullscreen().catch(() => {})
}
