import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://miti.onolys.com',
  output: 'static',
  // File output works with Firebase cleanUrls + trailingSlash: false.
  build: { format: 'file' },
});
