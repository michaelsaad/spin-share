const KEY = 'spin-share:v1'

// The browser keeps a working copy of the current game so a refresh never
// loses it; the server (profiles + sessions) is the shared copy.
export function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Storage blocked: the app still works, it just won't remember.
  }
}
