import { defineConfig } from 'vitest/config';
import * as path from 'path';

export default defineConfig({
  plugins: [],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts', './tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.test.tsx',
        'dist/',
        'build/**/*',                 // Alternative build folder
        'src/components/ui/**/*',     // shadcn/ui components
        'coverage/**/*',              // Coverage reports
        'public/**/*',                // Static assets
        'src/vite-env.d.ts',          // Vite type definitions
        'components.json',            // shadcn/ui config
        '*.config.{js,ts}',           // Root level configs
        'src/vite-env.d.ts',          // Vite type definitions
      ],
      reportsDirectory: './coverage'
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  esbuild: {
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
  },
});
