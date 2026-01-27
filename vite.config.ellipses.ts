import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Separate Vite config for the legacy ellipses demo
// This is a frozen snapshot of an earlier approach to the project
export default defineConfig({
  plugins: [react()],
  root: 'ellipses',
  base: '/apvd/ellipses/',
  build: {
    outDir: '../dist/ellipses',
    emptyOutDir: true,
  },
})
