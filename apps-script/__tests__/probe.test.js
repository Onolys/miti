import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';

const probePath = new URL('../probe.html', import.meta.url);

async function loadProbe(fetchMock) {
  const html = await readFile(probePath, 'utf8');
  return new JSDOM(html, {
    url: 'http://127.0.0.1:4322/probe.html',
    runScripts: 'dangerously',
    beforeParse(window) { window.fetch = fetchMock; },
  });
}

function submit(dom) {
  const document = dom.window.document;
  document.querySelector('#endpoint').value = 'https://script.google.com/macros/s/test/exec';
  document.querySelector('#email').value = 'probe@example.com';
  document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
}

describe('local Apps Script browser probe', () => {
  it('loads over a local static HTTP origin', async () => {
    const html = await readFile(probePath, 'utf8');
    const server = createServer((request, response) => {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(html);
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/probe.html`);
      expect(response.status).toBe(200);
      expect(await response.text()).toContain('id="endpoint"');
    } finally {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it('sends the exact Plan A request and prints response status, type and parsed JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200, type: 'cors', ok: true, json: async () => ({ ok: true }) });
    const dom = await loadProbe(fetchMock);
    try {
      submit(dom);
      await vi.waitFor(() => expect(dom.window.document.querySelector('#result').textContent).toContain('Readable success'));
      expect(fetchMock).toHaveBeenCalledOnce();
      const [endpoint, options] = fetchMock.mock.calls[0];
      expect(endpoint).toBe('https://script.google.com/macros/s/test/exec');
      expect(options).toEqual({
        method: 'POST', headers: { 'Content-Type': 'text/plain' }, redirect: 'follow',
        body: JSON.stringify({ step: 1, email: 'probe@example.com', page: 'learner', src: 'probe', honeypot: '' }),
      });
      const output = dom.window.document.querySelector('#result').textContent;
      expect(output).toContain('HTTP status: 200');
      expect(output).toContain('Response type: cors');
      expect(output).toContain('"ok": true');
    } finally { dom.window.close(); }
  });

  it('shows a failing URL error and permits another attempt', async () => {
    const dom = await loadProbe(vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    try {
      submit(dom);
      await vi.waitFor(() => expect(dom.window.document.querySelector('#result').textContent).toContain('Failed to fetch'));
      expect(dom.window.document.querySelector('button').disabled).toBe(false);
    } finally { dom.window.close(); }
  });

  it('renders untrusted response data as text and identifies backend failures', async () => {
    const dom = await loadProbe(vi.fn().mockResolvedValue({ status: 200, type: 'cors', ok: true, json: async () => ({ ok: false, error: '<img src=x onerror=alert(1)>' }) }));
    try {
      submit(dom);
      await vi.waitFor(() => expect(dom.window.document.querySelector('#result').textContent).toContain('Readable response, but saving failed'));
      expect(dom.window.document.querySelector('#result').textContent).toContain('<img');
      expect(dom.window.document.querySelector('#result img')).toBeNull();
    } finally { dom.window.close(); }
  });

  it('retains HTTP diagnostics when the response is not JSON', async () => {
    const dom = await loadProbe(vi.fn().mockResolvedValue({ status: 403, type: 'cors', ok: false, json: async () => { throw new SyntaxError('Unexpected token <'); } }));
    try {
      submit(dom);
      await vi.waitFor(() => expect(dom.window.document.querySelector('#result').textContent).toContain('Unexpected token <'));
      expect(dom.window.document.querySelector('#result').textContent).toContain('HTTP status: 403');
    } finally { dom.window.close(); }
  });
});
