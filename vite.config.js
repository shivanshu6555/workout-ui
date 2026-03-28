import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // This tells the PWA to cache your app shell so it loads offline
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      // This is the metadata that makes it look like a native app on your phone
      manifest: {
        name: 'My Workout Tracker',
        short_name: 'Workouts',
        description: 'Track progressive overload offline',
        theme_color: '#1e293b', // A nice dark mode slate color
        background_color: '#0f172a',
        display: 'standalone', // This hides the browser URL bar
        icons: [
          {
            src: 'pwa-192x192.png', // We'll need to generate these later
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  // This proxy prevents CORS errors when talking to your local .NET API during development
  server: {
    proxy: {
      '/api': {
        target: '*', // Change this to your .NET port
        changeOrigin: true,
        secure: false,
      }
    }
  }
})