import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'favicon.ico'],
      manifest: {
        name: 'מעקב שעות',
        short_name: 'שעות',
        description: 'מערכת מעקב שעות עבודה',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        lang: 'he',
        dir: 'rtl',
        orientation: 'portrait',
        categories: ['productivity', 'business'],
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Cache Google Sheets API responses for 1 hour (network-first)
            urlPattern: /^https:\/\/sheets\.googleapis\.com/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'google-sheets-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 3600 },
              networkTimeoutSeconds: 10,
            },
          },
          {
            // Cache GIS script with stale-while-revalidate
            urlPattern: /^https:\/\/accounts\.google\.com\/gsi\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'gis-cache',
              expiration: { maxEntries: 5, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // Disable in dev to avoid confusion
      },
    }),
  ],
});
