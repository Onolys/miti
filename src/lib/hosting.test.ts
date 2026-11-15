import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const readJson = (path: string) => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'));

it('serves the build and redirects every legacy-domain path through separate targets', () => {
  const { hosting } = readJson('firebase.json');
  expect(hosting).toHaveLength(2);
  const site = hosting.find((entry: { target: string }) => entry.target === 'miti');
  expect(site).toMatchObject({ public: 'dist', cleanUrls: true, trailingSlash: false });
  const redirect = hosting.find((entry: { target: string }) => entry.target === 'redirect');
  expect(redirect).toMatchObject({
    public: 'redirect',
    redirects: [{ source: '**', destination: 'https://miti.onolys.com', type: 301 }],
  });
});

it('protects HTML freshness while caching hashed assets and limiting noindex to enterprise', () => {
  const site = readJson('firebase.json').hosting.find((entry: { target: string }) => entry.target === 'miti');
  const header = (source: string, key: string) => site.headers.find((entry: { source: string }) => entry.source === source)?.headers.find((entry: { key: string }) => entry.key === key)?.value;
  expect(header('**', 'Cache-Control')).toBe('no-cache');
  expect(header('/_astro/**', 'Cache-Control')).toBe('public, max-age=31536000, immutable');
  expect(header('/fonts/**', 'Cache-Control')).toBe('public, max-age=31536000, immutable');
  expect(header('**', 'X-Content-Type-Options')).toBe('nosniff');
  expect(header('**', 'Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  const noindex = site.headers.filter((entry: { headers: { key: string }[] }) => entry.headers.some((header) => header.key === 'X-Robots-Tag'));
  expect(noindex).toHaveLength(1);
  expect(noindex[0].source).toBe('/enterprise{,/,.html}');
  expect(noindex[0].headers).toEqual([{ key: 'X-Robots-Tag', value: 'noindex' }]);
});

it('maps both logical hosting targets and includes a redirect stub', () => {
  const config = readJson('.firebaserc');
  const project = config.projects.default;
  expect(config.targets[project].hosting.miti).toHaveLength(1);
  expect(config.targets[project].hosting.redirect).toHaveLength(1);
  expect(config.targets[project].hosting.miti).not.toEqual(config.targets[project].hosting.redirect);
  expect(readFileSync(new URL('../../redirect/index.html', import.meta.url), 'utf8')).toContain('<!doctype html>');
});
