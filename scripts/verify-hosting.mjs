import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';

const hub = process.env.FIREBASE_EMULATOR_HUB ?? '127.0.0.1:4400';
const emulators = await fetch(`http://${hub}/emulators`).then((response) => response.json());
const { host, port, reservedPorts } = emulators.hosting;
assert.equal(reservedPorts.length, 1, 'Both hosting targets must be running');
const site = `http://${host}:${port}`;
const legacy = `http://${host}:${reservedPorts[0]}`;

async function checkPage(path, noindex) {
  let url = new URL(path, site);
  const visited = new Set();
  for (let count = 0; count < 4; count++) {
    assert.ok(!visited.has(url.href), `Redirect loop at ${url.href}`);
    visited.add(url.href);
    const response = await fetch(url, { redirect: 'manual' });
    if ([301, 302, 307, 308].includes(response.status)) {
      url = new URL(response.headers.get('location'), url);
      assert.equal(url.origin, site, 'Canonical redirects must stay on the local site');
      continue;
    }
    assert.equal(response.status, 200, `${path} must resolve to HTML`);
    assert.equal(response.headers.get('cache-control'), 'no-cache');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.equal(response.headers.get('x-robots-tag'), noindex ? 'noindex' : null);
    const html = await response.text();
    assert.match(html, /data-page="(learner|enterprise)"/);
    assert.equal(/name="robots" content="noindex, nofollow"/.test(html), noindex);
    console.log(`${path}: 200, ${count} canonical redirect(s), no-cache, correct noindex/security headers`);
    return;
  }
  assert.fail(`Too many canonical redirects for ${path}`);
}

await checkPage('/', false);
await checkPage('/enterprise', true);
await checkPage('/enterprise/', true);
await checkPage('/enterprise.html', true);

const asset = (await readdir(new URL('../dist/_astro/', import.meta.url))).find((file) => file.endsWith('.woff2'));
assert.ok(asset, 'The build must emit a self-hosted font');
const assetResponse = await fetch(`${site}/_astro/${asset}`);
assert.equal(assetResponse.status, 200);
assert.equal(assetResponse.headers.get('cache-control'), 'public, max-age=31536000, immutable');
console.log('/_astro font: 200, immutable one-year cache');

for (const path of ['/', '/old/path', '/another/file.html?src=campaign']) {
  const response = await fetch(`${legacy}${path}`, { redirect: 'manual' });
  assert.equal(response.status, 301);
  const destination = new URL(response.headers.get('location'));
  assert.equal(destination.origin, 'https://miti.onolys.com');
  assert.equal(destination.pathname, '/');
  console.log(`Legacy ${path}: 301 to https://miti.onolys.com`);
}
