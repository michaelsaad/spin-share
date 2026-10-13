const TAU = Math.PI * 2
// Canvas angle of the pointer (top of the wheel).
const POINTER = -Math.PI / 2

const mod = (a, m) => ((a % m) + m) % m

function randomIndex(n) {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] % n
}

export const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4)

// Index of the segment currently under the pointer.
export function indexAtRotation(rotation, n) {
  const seg = TAU / n
  return Math.floor(mod(POINTER - rotation, TAU) / seg) % n
}

// Final rotation that lands segment `index` under the pointer after a few full turns.
export function targetRotation(current, index, n, turns) {
  const seg = TAU / n
  const jitter = (Math.random() - 0.5) * seg * 0.7
  const desired = POINTER - (index + 0.5) * seg + jitter
  return current + mod(desired - current, TAU) + TAU * turns
}

// Random index where each option's chance is proportional to its weight.
// Falls back to a plain random pick if every weight is zero.
export function weightedIndex(weights) {
  const total = weights.reduce((a, w) => a + Math.max(0, w), 0)
  if (total <= 0) return randomIndex(weights.length)
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  let r = (buf[0] / 2 ** 32) * total
  for (let i = 0; i < weights.length; i++) {
    r -= Math.max(0, weights[i])
    if (r < 0) return i
  }
  return weights.length - 1
}
