import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// For GitHub Pages project sites the app is served from /<repo>/.
// Override with VITE_BASE if you deploy elsewhere (e.g. '/' for a custom domain).
const base = process.env.VITE_BASE ?? '/look-at-head-/';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
  },
});
