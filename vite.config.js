import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { localStorePlugin } from './server/localStore.mjs'

// On Cloudflare Pages, /api/store is a Function (functions/api/store.js, D1).
// Locally, `npm run dev` serves the same API with files under store-data/.
export default defineConfig({
  plugins: [react(), localStorePlugin(fileURLToPath(new URL('./store-data', import.meta.url)))],
  server: { port: 5173, open: false },
})
