import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Use relative asset paths ('./') so the app works on GitHub Pages
// regardless of the repo-name casing in the URL. Combined with HashRouter
// this makes the static build portable to any subpath.
const base = process.env.VITE_BASE ?? './';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
  },
});
