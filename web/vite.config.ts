import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Porta fixa: o CORS do backend libera http://localhost:5173.
  server: { port: 5173, strictPort: true },
  // Só as funções puras são testadas (domain/ e api/), então basta o ambiente node.
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
