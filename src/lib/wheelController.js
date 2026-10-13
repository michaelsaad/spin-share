import { easeOutQuart, indexAtRotation, targetRotation } from './spin'
import { tick } from './sound'

const TAU = Math.PI * 2

// One wheel's rotation, shared by every <Wheel> that shows it (the laptop
// window and the mirror window on the second screen draw the same spin).
export function createWheelController() {
  const views = new Set()
  const ctl = {
    rotation: 0,
    subscribe(draw) {
      views.add(draw)
      return () => views.delete(draw)
    },
    redraw() {
      views.forEach((draw) => draw())
    },
    spin(index, n, durationSec) {
      const start = ctl.rotation
      const end = targetRotation(start, index, n, Math.round(durationSec * 1.1) + 3)
      const ms = durationSec * 1000
      let last = indexAtRotation(start, n)
      return new Promise((resolve) => {
        const t0 = performance.now()
        let done = false
        const finish = () => {
          if (done) return
          done = true
          ctl.rotation = end % TAU
          ctl.redraw()
          resolve()
        }
        const frame = (now) => {
          if (done) return
          const t = Math.min(1, (now - t0) / ms)
          ctl.rotation = start + (end - start) * easeOutQuart(t)
          const idx = indexAtRotation(ctl.rotation, n)
          if (idx !== last) {
            last = idx
            tick()
          }
          ctl.redraw()
          if (t < 1) requestAnimationFrame(frame)
          else finish()
        }
        requestAnimationFrame(frame)
        // Browsers pause animation frames in background windows; never leave a spin hanging.
        setTimeout(finish, ms + 400)
      })
    },
  }
  return ctl
}
