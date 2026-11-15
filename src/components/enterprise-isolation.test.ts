import { readFileSync } from 'node:fs';
import { matchesGlob } from 'node:path';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import Enterprise from '../pages/enterprise.astro';
import Learner from '../pages/index.astro';

interface HeaderPolicy {
  source: string;
  headers: { key: string; value: string }[];
}

describe('enterprise search and navigation isolation', () => {
  it('marks enterprise noindex and nofollow without adding a canonical URL', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Enterprise);
    const doc = new JSDOM(html).window.document;
    const robots = doc.querySelectorAll('meta[name="robots"]');
    expect(robots).toHaveLength(1);
    expect(robots[0].getAttribute('content')?.split(/\s*,\s*/).sort()).toEqual(['nofollow', 'noindex']);
    expect(doc.querySelector('link[rel~="canonical"]')).toBeNull();
  });

  it('links enterprise only from the learner header and footer, with no robots exclusion', async () => {
    const container = await AstroContainer.create();
    const doc = new JSDOM(await container.renderToString(Learner)).window.document;
    const links = Array.from(doc.querySelectorAll('[href*="enterprise" i]'));
    expect(links.map((link) => link.closest('header, footer, main')?.tagName)).toEqual(['HEADER', 'FOOTER']);
    expect(doc.querySelector('main [href*="enterprise" i]')).toBeNull();
    expect(doc.querySelector('dialog')).not.toBeNull();
    for (const robots of doc.querySelectorAll('meta[name="robots"]')) {
      expect(robots.getAttribute('content')).not.toMatch(/noindex|nofollow/i);
    }
  });

  it('uses one Firebase robots-header policy that covers every enterprise alias and excludes learner URLs', () => {
    const config = JSON.parse(readFileSync(new URL('../../firebase.json', import.meta.url), 'utf8'));
    const site = config.hosting.find((entry: { target: string }) => entry.target === 'miti');
    const policies: HeaderPolicy[] = site.headers;
    const robotsPolicies = policies.filter(({ headers }) => headers.some(({ key }) => key.toLowerCase() === 'x-robots-tag'));
    expect(robotsPolicies).toHaveLength(1);
    const headersAt = (path: string) => robotsPolicies
      .filter(({ source }) => matchesGlob(path, source))
      .flatMap(({ headers }) => headers.filter(({ key }) => key.toLowerCase() === 'x-robots-tag'));
    for (const path of ['/enterprise', '/enterprise/', '/enterprise.html']) {
      const headers = headersAt(path);
      expect(headers, path).toHaveLength(1);
      expect(headers[0].value.toLowerCase().split(/\s*,\s*/)).toContain('noindex');
    }
    for (const path of ['/', '/index.html', '/enterprise-example', '/other/enterprise']) {
      expect(headersAt(path), path).toEqual([]);
    }
  });
});
