// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SignupResult } from '../client';

const { postSignup, track } = vi.hoisted(() => ({ postSignup: vi.fn(), track: vi.fn() }));
vi.mock('../client', () => ({ postSignup }));
vi.mock('../../track', () => ({ track }));

beforeEach(() => {
  postSignup.mockReset();
  track.mockReset();
  document.body.innerHTML = `<form data-hero-signup novalidate>
    <div data-hero-row><label for="hero-email">Email</label><input id="hero-email" name="email" type="email" aria-describedby="hero-error" aria-invalid="false"><button type="submit">Get early access</button></div>
    <p id="hero-error" data-email-error aria-live="polite"></p>
    <div aria-hidden="true" inert><input type="text" name="company_website" tabindex="-1" autocomplete="off"></div>
  </form>`;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function controls() {
  return {
    form: document.querySelector('form')!,
    email: document.querySelector<HTMLInputElement>('[name="email"]')!,
    button: document.querySelector('button')!,
    error: document.querySelector<HTMLElement>('[data-email-error]')!,
  };
}

async function initialize() {
  const { initHeroForms } = await import('../hero');
  initHeroForms();
  return controls();
}

function submit(form: HTMLFormElement) {
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

describe('hero email capture', () => {
  it.each(['', 'bad-email', '=a@b.co', 'a'.repeat(250) + '@b.co'])('blocks invalid email %j with an accessible field error', async (value) => {
    const { form, email, error } = await initialize();
    email.value = value;
    const opened = vi.fn();
    document.addEventListener('miti:open-popup', opened, { once: true });
    submit(form);
    expect(postSignup).not.toHaveBeenCalled();
    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(error.textContent).toBe('Enter a valid email address.');
    expect(document.activeElement).toBe(email);
    expect(opened).not.toHaveBeenCalled();
    document.removeEventListener('miti:open-popup', opened);
  });

  it('clears the field error when the email is edited', async () => {
    const { form, email, error } = await initialize();
    submit(form);
    email.value = 'a@b.co';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    expect(email.getAttribute('aria-invalid')).toBe('false');
    expect(error.textContent).toBe('');
  });

  it('guards repeated submits, sends the honeypot and replaces the row before opening the popup on success', async () => {
    let finish!: (result: SignupResult) => void;
    postSignup.mockReturnValue(new Promise<SignupResult>((resolve) => { finish = resolve; }));
    const { form, email, button } = await initialize();
    email.value = '  Person@example.com ';
    document.querySelector<HTMLInputElement>('[name="company_website"]')!.value = 'bot';
    const opened = vi.fn((event: Event) => {
      expect(document.querySelector('[data-hero-row]')).toBeNull();
      expect(document.querySelector('[role="status"]')?.textContent).toBe("Thanks. We'll reach out with early access information in a few weeks.");
      expect((event as CustomEvent).detail).toEqual({ trigger: 'hero', email: 'Person@example.com' });
    });
    document.addEventListener('miti:open-popup', opened, { once: true });
    submit(form);
    submit(form);
    expect(postSignup).toHaveBeenCalledExactlyOnceWith(1, { email: 'Person@example.com', honeypot: 'bot' });
    expect(button.disabled).toBe(true);
    expect(form.getAttribute('aria-busy')).toBe('true');
    expect(opened).not.toHaveBeenCalled();
    finish({ ok: true, confirmed: true });
    await vi.waitFor(() => expect(opened).toHaveBeenCalledTimes(1));
    expect(track).toHaveBeenCalledExactlyOnceWith('signup_step1');
    expect(form.getAttribute('aria-busy')).toBe('false');
    submit(form);
    expect(postSignup).toHaveBeenCalledTimes(1);
  });

  it('opens the popup after a failed hero save, leaves the form usable and shows no error', async () => {
    postSignup.mockResolvedValue({ ok: false, error: 'network' });
    const { form, email, button, error } = await initialize();
    email.value = 'Person@example.com';
    const opened = vi.fn();
    document.addEventListener('miti:open-popup', opened, { once: true });
    submit(form);
    await vi.waitFor(() => expect(opened).toHaveBeenCalledTimes(1));
    expect((opened.mock.calls[0][0] as CustomEvent).detail).toEqual({ trigger: 'hero', email: 'Person@example.com' });
    expect(document.querySelector('[data-hero-row]')).not.toBeNull();
    expect(document.querySelector('[role="status"]')).toBeNull();
    expect(button.disabled).toBe(false);
    expect(form.getAttribute('aria-busy')).toBe('false');
    expect(error.textContent).toBe('');
    expect(email.value).toBe('Person@example.com');
    expect(track).not.toHaveBeenCalled();
    submit(form);
    await vi.waitFor(() => expect(postSignup).toHaveBeenCalledTimes(2));
  });

  it('treats an unconfirmed Plan B result as success', async () => {
    postSignup.mockResolvedValue({ ok: true, confirmed: false });
    const { form, email } = await initialize();
    email.value = 'a@b.co';
    submit(form);
    await vi.waitFor(() => expect(track).toHaveBeenCalledExactlyOnceWith('signup_step1'));
    expect(document.querySelector('[role="status"]')).not.toBeNull();
  });

  it('binds each form only once if initialized again', async () => {
    postSignup.mockResolvedValue({ ok: false, error: 'network' });
    const { form, email } = await initialize();
    const { initHeroForms } = await import('../hero');
    initHeroForms();
    email.value = 'a@b.co';
    submit(form);
    await vi.waitFor(() => expect(form.getAttribute('aria-busy')).toBe('false'));
    expect(postSignup).toHaveBeenCalledTimes(1);
  });
});
