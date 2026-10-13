import { useCallback, useEffect, useMemo, useRef } from 'react'
import { createWheelController } from '../lib/wheelController'
import { PINWHEEL_BLADES } from '../lib/pinwheel'

const TAU = Math.PI * 2
const FONT = 'Cairo, "Segoe UI", Tahoma, sans-serif'

// Pinwheel hub: curved blades that counter-rotate while the wheel spins.

function drawPinwheel(ctx, cx, cy, s, angle) {
  const n = PINWHEEL_BLADES.length
  const seg = TAU / n
  const at = (rad, a) => [Math.cos(a) * rad, Math.sin(a) * rad]
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle)
  ctx.shadowColor = 'rgba(0,0,0,0.35)'
  ctx.shadowBlur = 5
  for (let k = 0; k < n; k++) {
    const a = k * seg
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(...at(s * 0.7, a - seg * 0.2), ...at(s, a))
    ctx.quadraticCurveTo(...at(s * 0.95, a + seg * 0.55), ...at(s * 0.45, a + seg * 0.95))
    ctx.closePath()
    ctx.fillStyle = PINWHEEL_BLADES[k]
    ctx.fill()
  }
  ctx.shadowBlur = 0
  ctx.beginPath()
  ctx.arc(0, 0, s * 0.2, 0, TAU)
  ctx.fillStyle = '#0b1d33'
  ctx.fill()
  ctx.lineWidth = s * 0.07
  ctx.strokeStyle = '#e8ac3d'
  ctx.stroke()
  ctx.restore()
}

function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let lo = 0
  let hi = text.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (ctx.measureText(text.slice(0, mid) + '…').width <= maxWidth) lo = mid
    else hi = mid - 1
  }
  return text.slice(0, lo) + '…'
}

// The rotation lives in a controller so several canvases (e.g. the laptop and
// the second-screen mirror) can show the same spin. Without one, the wheel
// gets its own (used by the setup preview).
export default function Wheel({ controller, items, palette, colors, winnerIndex, hubLabel }) {
  const ownController = useMemo(() => createWheelController(), [])
  const ctl = controller || ownController
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const sizeRef = useRef(0)
  const propsRef = useRef()
  propsRef.current = { items, palette, colors, winnerIndex, hubLabel }

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const size = sizeRef.current
    if (!canvas || !size) return
    const { items, palette, colors, winnerIndex, hubLabel } = propsRef.current
    const ctx = canvas.getContext('2d')
    const dpr = canvas.ownerDocument.defaultView?.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size, size)

    const cx = size / 2
    const cy = size / 2
    const r = size / 2 - size * 0.04
    const n = items.length
    const rot = ctl.rotation

    // Outer rim
    ctx.beginPath()
    ctx.arc(cx, cy, r + size * 0.025, 0, TAU)
    ctx.fillStyle = '#0b1d33'
    ctx.fill()
    ctx.lineWidth = size * 0.008
    ctx.strokeStyle = '#e8ac3d'
    ctx.stroke()

    if (!n) {
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, TAU)
      ctx.fillStyle = '#163a5f'
      ctx.fill()
      ctx.fillStyle = '#f9f0e1'
      ctx.font = `700 ${size * 0.06}px ${FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('فاضية', cx, cy)
      return
    }

    const seg = TAU / n
    const fontSize = Math.max(12, Math.min(r * 0.1, r * seg * 0.42))
    ctx.font = `700 ${fontSize}px ${FONT}`

    for (let i = 0; i < n; i++) {
      const start = rot + i * seg
      // Avoid two neighbouring slices with the same colour when n wraps around.
      let colorIdx = i % palette.length
      if (i === n - 1 && n > 1 && colorIdx === 0) colorIdx = 1 % palette.length
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, start, start + seg)
      ctx.closePath()
      const [bg, fg] = colors?.[i] || palette[colorIdx]
      ctx.fillStyle = bg
      ctx.fill()
      if (winnerIndex != null && winnerIndex !== i) {
        ctx.fillStyle = 'rgba(6, 16, 30, 0.6)'
        ctx.fill()
      }
      ctx.strokeStyle = 'rgba(232, 172, 61, 0.55)'
      ctx.lineWidth = Math.max(1, size * 0.003)
      ctx.stroke()

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(start + seg / 2)
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = fg
      ctx.shadowColor = fg === '#112d4a' ? 'transparent' : 'rgba(0,0,0,0.4)'
      ctx.shadowBlur = 4
      const label = fitText(ctx, items[i], r * 0.68)
      ctx.fillText(label, r - size * 0.03, 0)
      ctx.restore()
    }

    // Winner outline
    if (winnerIndex != null && winnerIndex < n) {
      const start = rot + winnerIndex * seg
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, start, start + seg)
      ctx.closePath()
      ctx.strokeStyle = '#f9f0e1'
      ctx.lineWidth = size * 0.014
      ctx.stroke()
    }

    // Rim lights
    const lights = 24
    for (let i = 0; i < lights; i++) {
      const a = (i / lights) * TAU
      ctx.beginPath()
      ctx.arc(cx + Math.cos(a) * (r + size * 0.0125), cy + Math.sin(a) * (r + size * 0.0125), size * 0.007, 0, TAU)
      ctx.fillStyle = i % 2 ? '#e8ac3d' : '#f9f0e1'
      ctx.fill()
    }

    // Hub
    const hubR = r * 0.2
    const hubGrad = ctx.createRadialGradient(cx, cy - hubR * 0.4, hubR * 0.1, cx, cy, hubR)
    hubGrad.addColorStop(0, '#1d4a78')
    hubGrad.addColorStop(1, '#0b1d33')
    ctx.beginPath()
    ctx.arc(cx, cy, hubR, 0, TAU)
    ctx.fillStyle = hubGrad
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = 14
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.lineWidth = size * 0.01
    ctx.strokeStyle = '#e8ac3d'
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx, cy, hubR * 0.86, 0, TAU)
    ctx.lineWidth = size * 0.0025
    ctx.strokeStyle = 'rgba(246, 205, 122, 0.6)'
    ctx.stroke()
    if (hubLabel) {
      ctx.fillStyle = '#f6cd7a'
      ctx.font = `900 ${hubR * 0.55}px ${FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(hubLabel, cx, cy)
    } else {
      drawPinwheel(ctx, cx, cy, hubR * 0.8, -rot * 1.6)
    }

    // Pointer (top, pointing down into the wheel)
    const pw = size * 0.05
    const top = cy - r - size * 0.035
    ctx.beginPath()
    ctx.moveTo(cx - pw / 2, top)
    ctx.lineTo(cx + pw / 2, top)
    ctx.lineTo(cx, top + pw * 1.3)
    ctx.closePath()
    ctx.fillStyle = '#e8ac3d'
    ctx.strokeStyle = '#0b1d33'
    ctx.lineWidth = size * 0.006
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = 6
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.stroke()
  }, [ctl])

  useEffect(() => ctl.subscribe(draw), [ctl, draw])

  // Keep the canvas sized to its container (crisp on HiDPI screens).
  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    // The wheel may be rendered into the mirror window, so use that window's APIs.
    const view = wrap.ownerDocument.defaultView
    const ro = new view.ResizeObserver(() => {
      const size = Math.floor(wrap.clientWidth)
      const dpr = view.devicePixelRatio || 1
      sizeRef.current = size
      canvas.width = size * dpr
      canvas.height = size * dpr
      canvas.style.width = `${size}px`
      canvas.style.height = `${size}px`
      draw()
    })
    ro.observe(wrap)
    wrap.ownerDocument.fonts?.ready.then(draw)
    return () => ro.disconnect()
  }, [draw])

  useEffect(draw, [items, palette, colors, winnerIndex, hubLabel, draw])

  return (
    <div className="wheel" ref={wrapRef}>
      <canvas ref={canvasRef} />
    </div>
  )
}
