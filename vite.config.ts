import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  build: {
    // Ensure .well-known files are copied to dist
    copyPublicDir: true,
    rollupOptions: {
      // Make sure .well-known files are not ignored
      external: [],
      output: {
        // Preserve the .well-known directory structure
        assetFileNames: (assetInfo) => {
          // Keep .well-known files in their original path
          if (assetInfo.name && assetInfo.name.includes('.well-known/')) {
            return assetInfo.name
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    }
  },
  // Ensure dev server serves .well-known files correctly
  server: {
    fs: {
      // Allow serving files from .well-known
      allow: ['..']
    }
  }
})