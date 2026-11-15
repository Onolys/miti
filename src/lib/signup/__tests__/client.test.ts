// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const endpoint = 'https://script.google.com/macros/s/TEST/exec';
const data = { email: '  Person@example.com ', honeypot: '', fields: { role: 'Researcher' } };
const fetchMock = vi.fn<typeof fetch>();

function response(body: unknown, ok = true): Response {
  return { ok, json: vi.fn().mockResolvedValue(body) } as unknown as Response;
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('PUBLIC_SIGNUP_URL', endpoint);
  vi.stubEnv('PUBLIC_SIGNUP_PLAN', 'A');
  vi.stubEnv('DEV', false);
  document.body.dataset.page = 'enterprise';
  window.history.replaceState({}, '', '/enterprise?src=partner');
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('postSignup Plan A', () => {
  it('posts the built body with only the text/plain header and follows redirects', async () => {
    fetchMock.mockResolvedValue(response({ ok: true }));
    const { postSignup } = await import('../client');
    expect(await postSignup(2, data)).toEqual({ ok: true, confirmed: true });
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'text/plain' }, redirect: 'follow',
      signal: expect.any(AbortSignal),
      body: JSON.stringify({ step: 2, email: 'Person@example.com', page: 'enterprise', src: 'partner', honeypot: '', role: 'Researcher' }),
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('returns the server error without retrying', async () => {
    fetchMock.mockResolvedValue(response({ ok: false, error: 'invalid_email' }));
    const { postSignup } = await import('../client');
    expect(await postSignup(1, data)).toEqual({ ok: false, error: 'invalid_email' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([null, {}, { ok: 'true' }, { ok: false }])('rejects malformed JSON response %j', async (body) => {
    fetchMock.mockResolvedValue(response(body));
    const { postSignup } = await import('../client');
    expect(await postSignup(1, data)).toEqual({ ok: false, error: 'bad_response' });
  });

  it('rejects non-JSON responses', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: vi.fn().mockRejectedValue(new SyntaxError('HTML')) } as unknown as Response);
    const { postSignup } = await import('../client');
    expect(await postSignup(1, data)).toEqual({ ok: false, error: 'bad_response' });
  });

  it('requires HTTP success even if JSON says ok:true', async () => {
    fetchMock.mockResolvedValue(response({ ok: true }, false));
    const { postSignup } = await import('../client');
    expect(await postSignup(1, data)).toEqual({ ok: false, error: 'http_error' });
  });

  it('fails network errors without retrying', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { postSignup } = await import('../client');
    expect(await postSignup(1, data)).toEqual({ ok: false, error: 'network' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['fetch', 'body'] as const)('aborts after 12 seconds including a stalled %s', async (stall) => {
    const pending = new Promise<never>(() => {});
    fetchMock.mockImplementation(() => stall === 'fetch'
      ? pending
      : Promise.resolve({ ok: true, json: () => pending } as unknown as Response));
    const { postSignup } = await import('../client');
    const result = postSignup(1, data);
    await vi.advanceTimersByTimeAsync(11_999);
    const signal = fetchMock.mock.calls[0][1]?.signal;
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toEqual({ ok: false, error: 'timeout' });
    expect(signal?.aborted).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([true, false])('retries busy once after one second (second response ok: %s)', async (succeeds) => {
    fetchMock.mockResolvedValueOnce(response({ ok: false, error: 'busy' }))
      .mockResolvedValueOnce(response(succeeds ? { ok: true } : { ok: false, error: 'busy' }));
    const { postSignup } = await import('../client');
    const result = postSignup(2, data);
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toEqual(succeeds ? { ok: true, confirmed: true } : { ok: false, error: 'busy' });
    await vi.advanceTimersByTimeAsync(20_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1]?.body).toBe(fetchMock.mock.calls[0][1]?.body);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('postSignup Plan B', () => {
  it('treats an opaque resolution as unconfirmed success without reading the body', async () => {
    vi.stubEnv('PUBLIC_SIGNUP_PLAN', 'B');
    const json = vi.fn().mockRejectedValue(new Error('opaque'));
    fetchMock.mockResolvedValue({ ok: false, type: 'opaque', json } as unknown as Response);
    const { postSignup } = await import('../client');
    expect(await postSignup(1, data)).toEqual({ ok: true, confirmed: false });
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, redirect: 'follow' });
    expect(json).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('fails a rejected request without retrying', async () => {
    vi.stubEnv('PUBLIC_SIGNUP_PLAN', 'B');
    fetchMock.mockRejectedValue(new TypeError('offline'));
    const { postSignup } = await import('../client');
    expect(await postSignup(1, data)).toEqual({ ok: false, error: 'network' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('postSignup without an endpoint', () => {
  it('warns once in dev, logs each body and succeeds after 300ms without a request', async () => {
    vi.stubEnv('PUBLIC_SIGNUP_URL', undefined);
    vi.stubEnv('DEV', true);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { postSignup } = await import('../client');
    const first = postSignup(1, data);
    const settled = vi.fn();
    void first.then(settled);
    await vi.advanceTimersByTimeAsync(299);
    expect(settled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(await first).toEqual({ ok: true, confirmed: false });
    const second = postSignup(2, data);
    await vi.advanceTimersByTimeAsync(300);
    expect(await second).toEqual({ ok: true, confirmed: false });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledTimes(2);
    expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({ step: 1, email: 'Person@example.com' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails outside dev without exposing submitted data in logs', async () => {
    vi.stubEnv('PUBLIC_SIGNUP_URL', undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { postSignup } = await import('../client');
    expect(await postSignup(1, data)).toEqual({ ok: false, error: 'not_configured' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps the client timeout above the 5 second server lock wait so busy replies can arrive', async () => {
    const { REQUEST_TIMEOUT_MS } = await import('../client');
    expect(REQUEST_TIMEOUT_MS).toBeGreaterThanOrEqual(5_000 + 5_000);
  });

  it('warms up the endpoint with one fire-and-forget GET per page load and ignores errors', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    const { warmUp } = await import('../client');
    warmUp();
    warmUp();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(endpoint);
    expect(fetchMock.mock.calls[0][1]?.method).toBe('GET');
    await vi.advanceTimersByTimeAsync(0);
  });

  it('skips the warm-up when the URL is unset', async () => {
    vi.stubEnv('PUBLIC_SIGNUP_URL', '');
    const { warmUp } = await import('../client');
    warmUp();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
