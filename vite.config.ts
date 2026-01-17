import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
  ],
  base: '/apvd/',
  server: {
    port: 5180,
    fs: {
      // Allow serving files from the shapes workspace dependency
      allow: ['..'],
    },
  },
  preview: {
    port: 5180,
  },
  build: {
    outDir: 'dist',
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
  optimizeDeps: {
    exclude: ['apvd'],
  },
})
