// The pinwheel is the app's mark: the wheel hubs, card backs, header logo
// and browser-tab icon all use it.
export const PINWHEEL_BLADES = ['#e8ac3d', '#f9f0e1', '#c98a2b', '#f6cd7a', '#e8ac3d', '#f9f0e1']

const n = PINWHEEL_BLADES.length
const seg = (Math.PI * 2) / n
const at = (r, a) => `${(50 + Math.cos(a) * r).toFixed(2)} ${(50 + Math.sin(a) * r).toFixed(2)}`

// SVG paths on a 100×100 box.
export const BLADE_PATHS = PINWHEEL_BLADES.map((color, k) => {
  const a = k * seg - Math.PI / 2
  return {
    color,
    d: `M50 50 Q${at(32, a - seg * 0.2)} ${at(46, a)} Q${at(44, a + seg * 0.55)} ${at(21, a + seg * 0.95)} Z`,
  }
})

// Favicon: the pinwheel on a navy disc.
export function pinwheelIcon() {
  const blades = BLADE_PATHS.map((b) => `<path d="${b.d}" fill="${b.color}"/>`).join('')
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<circle cx="50" cy="50" r="49" fill="#0b1d33" stroke="#e8ac3d" stroke-width="3"/>` +
    `<g transform="translate(50 50) scale(0.92) translate(-50 -50)">${blades}</g>` +
    `<circle cx="50" cy="50" r="9" fill="#0b1d33" stroke="#e8ac3d" stroke-width="3"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
