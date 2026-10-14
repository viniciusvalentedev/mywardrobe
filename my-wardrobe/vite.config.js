import process from 'node:process'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { API_CACHE, IMAGE_CACHE } from './src/lib/cacheNames.js'

const PINK = '#ffd3e2'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const supabase = (env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['my-wardrobe-app-icon.svg', 'my-wardrobe-mark.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'My Wardrobe',
          short_name: 'Wardrobe',
          description: 'Seu guarda-roupa, seus conjuntos e o que você usou em cada dia.',
          lang: 'pt-BR',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          theme_color: PINK,
          background_color: PINK,
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // app shell: tudo que o build gera. Os modelos do removedor de fundo vêm de fora e não entram.
          globPatterns: ['**/*.{js,css,html,svg,png}'],
          globIgnores: ['**/ort*'],
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            // dados: sempre a rede primeiro; o cache só responde sem conexão.
            // Só GET entra aqui, e o login (/auth/v1/) nunca passa pelo cache.
            {
              urlPattern: new RegExp(`^${supabase}/rest/v1/`),
              handler: 'NetworkFirst',
              options: {
                cacheName: API_CACHE,
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 },
                cacheableResponse: { statuses: [200] },
              },
            },
            // fotos das peças: o endereço muda quando a foto muda, então o cache pode responder primeiro
            {
              urlPattern: new RegExp(`^${supabase}/storage/v1/object/public/`),
              handler: 'CacheFirst',
              options: {
                cacheName: IMAGE_CACHE,
                expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30, purgeOnQuotaError: true },
                cacheableResponse: { statuses: [200] },
                // com CORS a resposta não é opaca: dá para ver o status e ela não pesa na cota
                fetchOptions: { mode: 'cors', credentials: 'omit' },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
      }),
    ],
  }
})
