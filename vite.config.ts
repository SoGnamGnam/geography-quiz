import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      // Icons are generated at build time from public/icon.svg
      // (pwa-assets.config.ts) and injected into the manifest and <head>.
      pwaAssets: { config: true },
      manifest: {
        name: 'World Quiz',
        short_name: 'World Quiz',
        description: 'Quiz di geografia personalizzabile, open source e offline',
        lang: 'it',
        theme_color: '#1d4ed8',
        background_color: '#ffffff',
        display: 'standalone',
      },
      workbox: {
        // Precache everything, including the lazy-loaded JSON datasets,
        // so the app works fully offline after the first visit.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,json}'],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
})
