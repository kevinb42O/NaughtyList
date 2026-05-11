import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const APP_ICON_VERSION = '20260511'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      includeAssets: [
        'naughtylist.png',
        'naughtylist-180.png',
        'naughtylist-192.png',
        'naughtylist-512.png',
        'notification-badge.svg',
      ],
      manifest: {
        name: 'The Naughty List',
        short_name: 'Naughty List',
        description:
          'A local-first Building 21 reputation tracker for operators, clans, and repeat problems.',
        theme_color: '#111827',
        background_color: '#030712',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: `/naughtylist-192.png?v=${APP_ICON_VERSION}`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `/naughtylist-512.png?v=${APP_ICON_VERSION}`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `/naughtylist-512.png?v=${APP_ICON_VERSION}`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
})
