// Tiny open JSON store for profiles and sessions. No auth on purpose: the
// data is a youth-meeting game (names, questions, scores).
//
//   GET    /api/store?prefix=profiles/   -> list (summaries)
//   GET    /api/store?key=sessions/<id>  -> one document
//   PUT    /api/store?key=...            -> save (JSON body)
//   DELETE /api/store?key=...            -> delete
//
// The same handler runs as a Cloudflare Pages Function (D1, functions/api/store.js)
// and inside the local Vite server (files on disk); only the `backend` differs.
// A backend gives get/set/del plus either list(prefix) -> keys or
// listDocs(prefix) -> [key, doc] pairs.

const KEY_RE = /^(profiles|sessions)\/[A-Za-z0-9_\-.]{1,80}$/
const PREFIXES = ['profiles/', 'sessions/']
const MAX_BYTES = 2_000_000

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
  })
const empty = (status) => new Response(null, { status, headers: CORS })

// Lists send summaries only, so the home screen stays fast as sessions grow.
function summarize(prefix, key, doc) {
  const id = key.slice(prefix.length)
  if (prefix === 'profiles/') {
    const segments = doc.segments || []
    return {
      id,
      name: doc.name,
      updatedAt: doc.updatedAt,
      players: (doc.players || []).length,
      slices: segments.length,
      questions: segments.reduce((n, s) => n + (s.questions?.length || 0), 0),
    }
  }
  const events = doc.events || []
  return {
    id,
    profileId: doc.profileId,
    profileName: doc.profileName,
    startedAt: doc.startedAt,
    updatedAt: doc.updatedAt,
    turns: events.filter((e) => e.type === 'turn').length,
    scores: doc.state?.scores || {},
  }
}

export async function handle(req, backend) {
  if (req.method === 'OPTIONS') return empty(204)
  const url = new URL(req.url)
  const key = url.searchParams.get('key')
  const prefix = url.searchParams.get('prefix')
  try {
    if (req.method === 'GET' && prefix) {
      if (!PREFIXES.includes(prefix)) return json({ error: 'bad prefix' }, 400)
      const docs = backend.listDocs
        ? await backend.listDocs(prefix)
        : await Promise.all((await backend.list(prefix)).map(async (k) => [k, await backend.get(k)]))
      return json(docs.filter(([, d]) => d).map(([k, d]) => summarize(prefix, k, d)))
    }
    if (!key || !KEY_RE.test(key)) return json({ error: 'bad key' }, 400)
    if (req.method === 'GET') {
      const doc = await backend.get(key)
      return doc ? json(doc) : json({ error: 'not found' }, 404)
    }
    if (req.method === 'PUT') {
      const text = await req.text()
      if (text.length > MAX_BYTES) return json({ error: 'too big' }, 413)
      const doc = JSON.parse(text)
      if (!doc || typeof doc !== 'object') return json({ error: 'bad body' }, 400)
      await backend.set(key, doc)
      return empty(204)
    }
    if (req.method === 'DELETE') {
      await backend.del(key)
      return empty(204)
    }
    return json({ error: 'method not allowed' }, 405)
  } catch (err) {
    return json({ error: String(err?.message || err) }, 500)
  }
}
