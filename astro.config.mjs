import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  // File output works with Firebase cleanUrls + trailingSlash: false.
  build: { format: 'file' },
});
