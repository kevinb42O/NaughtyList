import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const APP_ICON_VERSION = '20260511-ratslogo'

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
      includeAssets: ['ratslogo.png'],
      manifest: {
        name: '21rats',
        short_name: '21rats',
        description:
          'A B21 and Building 21 DMZ reputation tracker for operators, clans, hostile patterns, and squad intel.',
        theme_color: '#111827',
        background_color: '#030712',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: `/ratslogo.png?v=${APP_ICON_VERSION}`,
            sizes: '400x400',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
})
