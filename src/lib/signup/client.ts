import { SIGNUP_PLAN, SIGNUP_URL } from '../config';
import { buildBody, type SignupData } from './body';

export type SignupResult =
  | { ok: true; confirmed: boolean }
  | { ok: false; error: string };

let warnedAboutMissingUrl = false;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function send(body: string): Promise<SignupResult> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Signup request timed out'));
    }, 10_000);
  });

  async function request(): Promise<SignupResult> {
    const response = await fetch(SIGNUP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body,
      redirect: 'follow',
      signal: controller.signal,
      ...(SIGNUP_PLAN === 'B' ? { mode: 'no-cors' as const } : {}),
    });
    if (SIGNUP_PLAN === 'B') return { ok: true, confirmed: false };

    let result: unknown;
    try {
      result = await response.json();
    } catch (error) {
      if (controller.signal.aborted) throw error;
      return { ok: false, error: 'bad_response' };
    }
    if (!response.ok) return { ok: false, error: 'http_error' };
    if (result === null || typeof result !== 'object') return { ok: false, error: 'bad_response' };
    if ('ok' in result && result.ok === true) return { ok: true, confirmed: true };
    if ('ok' in result && result.ok === false && 'error' in result && typeof result.error === 'string') {
      return { ok: false, error: result.error };
    }
    return { ok: false, error: 'bad_response' };
  }

  try {
    // Keep the deadline active through response.json(), including a stalled response body.
    return await Promise.race([request(), deadline]);
  } catch {
    return { ok: false, error: controller.signal.aborted ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}

export async function postSignup(step: 1 | 2, data: SignupData): Promise<SignupResult> {
  const body = buildBody(step, data);
  if (!SIGNUP_URL) {
    if (!import.meta.env.DEV) return { ok: false, error: 'not_configured' };
    if (!warnedAboutMissingUrl) {
      console.warn('PUBLIC_SIGNUP_URL is unset. Signup requests are simulated in development.');
      warnedAboutMissingUrl = true;
    }
    console.log(body);
    await delay(300);
    return { ok: true, confirmed: false };
  }

  const result = await send(body);
  if (!result.ok && result.error === 'busy') {
    await delay(1_000);
    return send(body);
  }
  return result;
}
