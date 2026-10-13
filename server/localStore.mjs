import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { handle } from './storeCore.mjs'

// The same /api/store as the Cloudflare Function, served by the local Vite
// server (dev and `spin-share`) with the documents as files on disk:
//   store-data/profiles/<id>.json, store-data/sessions/<id>.json
export function localStorePlugin(root) {
  const fileOf = (key) => join(root, `${key}.json`)
  const backend = {
    async get(key) {
      try {
        return JSON.parse(await readFile(fileOf(key), 'utf8'))
      } catch {
        return null
      }
    },
    async set(key, doc) {
      await mkdir(join(root, key.split('/')[0]), { recursive: true })
      await writeFile(fileOf(key), JSON.stringify(doc, null, 2))
    },
    del: (key) => rm(fileOf(key), { force: true }),
    async list(prefix) {
      try {
        const names = await readdir(join(root, prefix))
        return names.filter((n) => n.endsWith('.json')).map((n) => prefix + n.slice(0, -5))
      } catch {
        return []
      }
    },
  }

  const middleware = async (req, res, next) => {
    if (!req.url.startsWith('/api/store')) return next()
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const body = chunks.length ? Buffer.concat(chunks) : undefined
    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method,
      headers: req.headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : body,
    })
    const response = await handle(request, backend)
    res.statusCode = response.status
    response.headers.forEach((value, name) => res.setHeader(name, value))
    res.end(Buffer.from(await response.arrayBuffer()))
  }

  return {
    name: 'spin-share-local-store',
    configureServer: (server) => void server.middlewares.use(middleware),
    configurePreviewServer: (server) => void server.middlewares.use(middleware),
  }
}
