import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

const allowedHosts = process.env.VITE_ALLOWED_HOSTS?.split(',') ?? []

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
  ],

  test: {
    globals: true,
  },

  define: {
    // Polyfill for libraries that expect Node.js `global` (e.g., react-mathquill)
    global: 'globalThis',
  },

  base: '/apvd/',

  optimizeDeps: {
    // esbuild breaks WASM imports; must exclude from pre-bundling
    exclude: ['@apvd/wasm'],
  },

  server: {
    port: 5183,
    fs: {
      // Allow serving files from node_modules
      allow: ['..', '../../shapes'],
    },
    ...(allowedHosts.length > 0 && { allowedHosts }),
  },

  preview: {
    port: 5183,
  },

  build: {
    outDir: 'dist',
  },

  worker: {
    format: 'es',
    plugins: () => [
      wasm(),
      topLevelAwait(),
    ],
  },

  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },

  resolve: {
    alias: {
      // Handle next-utils imports that don't depend on Next.js
      'next-utils/objs': '/src/lib/objs.ts',
    },
  },
})