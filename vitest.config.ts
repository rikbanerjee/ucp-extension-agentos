import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import path from 'path';

// vitest config files are processed as ESM by vite; use fileURLToPath for __dirname equivalent.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/rules/**'],
      reporter: ['text', 'json-summary'],
      thresholds: {
        lines: 90,
      },
    },
  },
  resolve: {
    alias: {
      // Match the "@/*" → "src/*" path alias in tsconfig.json
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
