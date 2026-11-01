import { defineConfig } from 'vitest/config'
import swc from 'unplugin-swc'

// Nest's dependency injection reads constructor types from decorator metadata, which
// esbuild (Vitest's default) doesn't emit. SWC does.
export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
  plugins: [swc.vite({ module: { type: 'es6' } })],
})
