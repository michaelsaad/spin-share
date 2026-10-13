import { BLADE_PATHS } from '../lib/pinwheel'

// SVG version of the wheel hub's pinwheel (card backs and the app logo).
export default function Pinwheel({ className }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <g className="pinwheel-blades">
        {BLADE_PATHS.map((b, k) => (
          <path key={k} d={b.d} fill={b.color} />
        ))}
      </g>
      <circle cx="50" cy="50" r="9" fill="#0b1d33" stroke="#e8ac3d" strokeWidth="3" />
    </svg>
  )
}
