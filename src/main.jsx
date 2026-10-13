import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import '@fontsource/cairo/400.css'
import '@fontsource/cairo/600.css'
import '@fontsource/cairo/700.css'
import '@fontsource/cairo/900.css'
import './styles.css'
import { pinwheelIcon } from './lib/pinwheel'

// Favicon drawn from the pinwheel (no image file needed).
const icon = document.createElement('link')
icon.rel = 'icon'
icon.href = pinwheelIcon()
document.head.appendChild(icon)

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
