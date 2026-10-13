import { handle } from '../../server/storeCore.mjs'

// Cloudflare Pages Function for /api/store. Documents live in D1 (binding DB):
//   docs(key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER)
export async function onRequest({ request, env }) {
  const db = env.DB
  return handle(request, {
    async get(key) {
      const row = await db.prepare('SELECT value FROM docs WHERE key = ?').bind(key).first()
      return row ? JSON.parse(row.value) : null
    },
    async set(key, doc) {
      await db
        .prepare(
          'INSERT INTO docs (key, value, updated_at) VALUES (?, ?, ?) ' +
            'ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
        )
        .bind(key, JSON.stringify(doc), Date.now())
        .run()
    },
    async del(key) {
      await db.prepare('DELETE FROM docs WHERE key = ?').bind(key).run()
    },
    // One query for a whole list instead of one per document.
    async listDocs(prefix) {
      const { results } = await db.prepare('SELECT key, value FROM docs WHERE key LIKE ?').bind(`${prefix}%`).all()
      return results.map((r) => [r.key, JSON.parse(r.value)])
    },
  })
}
