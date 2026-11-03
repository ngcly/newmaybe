import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { sharedFonts } from '@newmaybe/shared-styles/fonts';
import { clubFeatured } from '../../scripts/club-featured';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), sharedFonts(), clubFeatured()],
  server: {
    port: 4328,
  },
  build: {
    outDir: './dist',
  },
});
