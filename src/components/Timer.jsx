import { useEffect, useRef, useState } from 'react'
import { countdownBeep, playClip } from '../lib/sound'

const R = 44
const C = 2 * Math.PI * R

// `silent`: the copy shown in the mirror window counts down without sound.
export default function Timer({ seconds, paused, stopped, silent, onToggle }) {
  const [left, setLeft] = useState(seconds)
  const [run, setRun] = useState(0)
  const leftRef = useRef(seconds)
  const lastBeep = useRef(null)

  useEffect(() => {
    if (paused || stopped || leftRef.current <= 0) return
    let prev = performance.now()
    const id = setInterval(() => {
      const now = performance.now()
      leftRef.current = Math.max(0, leftRef.current - (now - prev) / 1000)
      prev = now
      setLeft(leftRef.current)
      const whole = Math.ceil(leftRef.current)
      if (whole > 0 && whole <= 5 && lastBeep.current !== whole) {
        lastBeep.current = whole
        if (!silent) countdownBeep()
      }
      if (leftRef.current <= 0) {
        clearInterval(id)
        if (!silent) playClip('timeup', { maxSec: 2.5 })
      }
    }, 100)
    return () => clearInterval(id)
  }, [paused, stopped, silent, run])

  const done = left <= 0
  const restart = () => {
    leftRef.current = seconds
    lastBeep.current = null
    setLeft(seconds)
    setRun((r) => r + 1)
  }

  const cls = ['timer', left <= 5 && 'urgent', done && 'done', (paused || stopped) && !done && 'paused']
  return (
    <button className={cls.filter(Boolean).join(' ')} onClick={done ? restart : onToggle} title="T: وقف / كمّل">
      <svg viewBox="0 0 100 100">
        <circle className="timer-track" cx="50" cy="50" r={R} />
        <circle
          className="timer-ring"
          cx="50"
          cy="50"
          r={R}
          strokeDasharray={C}
          strokeDashoffset={C * (1 - left / seconds)}
        />
      </svg>
      <span className="timer-num">{done ? '⏰' : Math.ceil(left)}</span>
    </button>
  )
}
