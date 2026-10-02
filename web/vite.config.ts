import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // Só as funções puras são testadas (domain/ e api/), então basta o ambiente node.
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
