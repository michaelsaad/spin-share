// Client for /api/store (profiles + sessions): a Cloudflare Function on the
// deployed site, the Vite plugin in dev. If it can't be reached the game keeps
// working from the browser's own storage.

async function call(method, params, body) {
  const res = await fetch(`/api/store?${new URLSearchParams(params)}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  if (res.status === 404 && method === 'GET') return null
  if (!res.ok) throw new Error(`store ${res.status}`)
  return res.status === 204 ? null : res.json()
}

export const listProfiles = () => call('GET', { prefix: 'profiles/' })
export const listSessions = () => call('GET', { prefix: 'sessions/' })
export const getProfile = (id) => call('GET', { key: `profiles/${id}` })
export const getSession = (id) => call('GET', { key: `sessions/${id}` })
export const putProfile = (doc) => call('PUT', { key: `profiles/${doc.id}` }, doc)
export const putSession = (doc) => call('PUT', { key: `sessions/${doc.id}` }, doc)
export const deleteProfile = (id) => call('DELETE', { key: `profiles/${id}` })
export const deleteSession = (id) => call('DELETE', { key: `sessions/${id}` })

const pad = (n) => String(n).padStart(2, '0')
// Ids sort by time and stay valid as file / blob names.
export function newId(prefix) {
  const d = new Date()
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  return `${prefix}-${stamp}-${Math.random().toString(36).slice(2, 6)}`
}
