import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: false, // Important: don't wipe the popup build
    outDir: 'dist',
    lib: {
      entry: resolve(__dirname, 'src/content/index.tsx'),
      name: 'AuraContent',
      fileName: () => 'src/content/index.js',
      formats: ['iife'] // IIFE forces bundling of all dependencies
    },
    rollupOptions: {
      output: {
        // Ensure we don't split chunks
        inlineDynamicImports: true,
      }
    }
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  }
})
