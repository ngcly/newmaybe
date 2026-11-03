import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { sharedFonts } from '@newmaybe/shared-styles/fonts';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), sharedFonts()],
  build: {
    outDir: './dist',
  },
});
