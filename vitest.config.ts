import { getViteConfig } from 'astro/config';
import 'vitest/config';

export default getViteConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,ts}', 'apps-script/**/*.{test,spec}.{js,ts}'],
  },
});
