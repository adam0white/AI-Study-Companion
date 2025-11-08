/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
    alias: {
      'cloudflare:workers': path.resolve(__dirname, './src/test/mocks/cloudflare-workers.ts'),
    },
    // Resource management - prevent memory leaks and runaway threads
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 1,
      },
    },
    // Force exit after tests complete
    teardownTimeout: 10000,
    hookTimeout: 10000,
    testTimeout: 15000,
    // Disable watch mode by default
    watch: false,
    // Clean up mocks between tests
    clearMocks: true,
    restoreMocks: true,
  },
})
