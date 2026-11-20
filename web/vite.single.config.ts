// Builds ONE self-contained file, dist-single/UnderGrid.html, that opens by double-click (no install, no server).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  publicDir: false,
  build: { outDir: 'dist-single', assetsInlineLimit: 100_000_000, cssCodeSplit: false, emptyOutDir: true },
  define: { __SINGLE_FILE__: 'true' },
});
