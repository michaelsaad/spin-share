import Pinwheel from './Pinwheel'

const APP_NAME = 'Spin & Share'
const APP_TAGLINE = 'The Joy Wheel'

// App name + pinwheel mark, used in every header.
export default function Brand({ small, as: Title = 'span' }) {
  return (
    <>
      <span className={`app-mark ${small ? 'small' : ''}`}>
        <Pinwheel className="app-mark-pinwheel" />
      </span>
      <div className="brand">
        <Title className="brand-title">{APP_NAME}</Title>
        <span className="brand-sub">{APP_TAGLINE}</span>
      </div>
    </>
  )
}

export function Credit({ className = '' }) {
  return (
    <div className={`credit ${className}`} dir="ltr">
      Made with <span className="credit-heart">♥</span> by m1kllz
    </div>
  )
}
