// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SignupResult } from '../client';

const { postSignup, track } = vi.hoisted(() => ({ postSignup: vi.fn(), track: vi.fn() }));
vi.mock('../client', () => ({ postSignup }));
vi.mock('../../track', () => ({ track }));

beforeEach(() => {
  postSignup.mockReset();
  track.mockReset();
  document.body.style.overflow = 'auto';
  document.body.innerHTML = `<button id="invoker">Get early access</button><main>Page content</main>
    <dialog data-signup-dialog aria-labelledby="signup-title">
      <div data-signup-entry>
        <header><h2 id="signup-title">Get early access</h2><button data-signup-close aria-label="Close">×</button></header>
        <form data-signup-form novalidate aria-busy="false">
          <input name="email" type="email" aria-invalid="false" aria-describedby="email-error">
          <p id="email-error" data-email-error aria-live="polite"></p>
          <select name="role" data-signup-field><option value="">Select…</option><option>Researcher</option></select>
          <textarea name="anything_else" data-signup-field></textarea>
          <input name="company_website" tabindex="-1">
          <p data-signup-error role="alert" hidden>Something went wrong. Try again, or email <a href="mailto:tejitpabari99@gmail.com">tejitpabari99@gmail.com</a>.</p>
          <button type="submit">Get early access</button>
        </form>
      </div>
      <div data-signup-success hidden><h2 id="signup-success-title" tabindex="-1">Thank you for signing up.</h2><button data-signup-close>Close</button></div>
    </dialog>`;
  // jsdom does not implement the native dialog methods.
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.open = true; }),
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true, value: vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
      this.dispatchEvent(new Event('close'));
    }),
  });
});

afterEach(() => {
  document.querySelector('dialog')?.close();
  vi.restoreAllMocks();
});

function controls() {
  return {
    dialog: document.querySelector('dialog')!,
    invoker: document.getElementById('invoker')!,
    main: document.querySelector('main')!,
    form: document.querySelector('form')!,
    email: document.querySelector<HTMLInputElement>('[name="email"]')!,
    role: document.querySelector<HTMLSelectElement>('[name="role"]')!,
    answer: document.querySelector<HTMLTextAreaElement>('[name="anything_else"]')!,
    button: document.querySelector<HTMLButtonElement>('button[type="submit"]')!,
    emailError: document.querySelector<HTMLElement>('[data-email-error]')!,
    error: document.querySelector<HTMLElement>('[data-signup-error]')!,
    entry: document.querySelector<HTMLElement>('[data-signup-entry]')!,
    success: document.querySelector<HTMLElement>('[data-signup-success]')!,
  };
}

async function initialize(email = '', trigger = 'topbar') {
  const { initSignupDialog } = await import('../dialog');
  initSignupDialog();
  const elements = controls();
  elements.invoker.focus();
  open(email, trigger);
  return elements;
}

function open(email = '', trigger = 'topbar') {
  document.dispatchEvent(new CustomEvent('miti:open-popup', { detail: { trigger, email } }));
}

function submit(form: HTMLFormElement) {
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

describe('signup dialog', () => {
  it('opens natively, locks scrolling, focuses an empty email and tracks only the trigger', async () => {
    const { dialog, email } = await initialize();
    expect(dialog.open).toBe(true);
    expect(dialog.showModal).toHaveBeenCalledTimes(1);
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.activeElement).toBe(email);
    expect(track).toHaveBeenCalledExactlyOnceWith('popup_open', { trigger: 'topbar' });
    dialog.click();
    expect(dialog.open).toBe(true);
  });

  it('prefills email and focuses the first optional field', async () => {
    const { email, role } = await initialize('Person@example.com', 'hero');
    expect(email.value).toBe('Person@example.com');
    expect(document.activeElement).toBe(role);
    expect(track).toHaveBeenCalledExactlyOnceWith('popup_open', { trigger: 'hero' });
  });

  it.each(['', 'bad-email', '=a@b.co'])('blocks invalid email %j locally', async (value) => {
    const { form, email, emailError } = await initialize(value);
    submit(form);
    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(emailError.textContent).toBe('Enter a valid email address.');
    expect(document.activeElement).toBe(email);
    expect(postSignup).not.toHaveBeenCalled();
    email.dispatchEvent(new Event('input'));
    expect(email.getAttribute('aria-invalid')).toBe('false');
    expect(emailError.textContent).toBe('');
  });

  it.each([true, false])('posts answers and honeypot once and focuses the success heading (confirmed: %s)', async (confirmed) => {
    let finish!: (result: SignupResult) => void;
    postSignup.mockReturnValue(new Promise<SignupResult>((resolve) => { finish = resolve; }));
    const { dialog, form, role, answer, button, entry, success } = await initialize('Person@example.com');
    role.value = 'Researcher';
    answer.value = 'Some private feedback';
    document.querySelector<HTMLInputElement>('[name="company_website"]')!.value = 'bot';
    submit(form);
    submit(form);
    expect(postSignup).toHaveBeenCalledExactlyOnceWith(2, {
      email: 'Person@example.com', honeypot: 'bot', fields: { role: 'Researcher', anything_else: 'Some private feedback' },
    });
    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe('Sending…');
    expect(form.getAttribute('aria-busy')).toBe('true');
    finish({ ok: true, confirmed });
    await vi.waitFor(() => expect(success.hidden).toBe(false));
    expect(entry.hidden).toBe(true);
    expect(document.activeElement).toBe(success.querySelector('h2'));
    expect(dialog.getAttribute('aria-labelledby')).toBe('signup-success-title');
    expect(track.mock.calls).toEqual([['popup_open', { trigger: 'topbar' }], ['signup_step2']]);
    submit(form);
    expect(postSignup).toHaveBeenCalledTimes(1);
  });

  it('shows the mailto fallback, keeps answers and allows retry after a server error', async () => {
    postSignup.mockResolvedValue({ ok: false, error: 'network' });
    const { form, email, role, answer, button, error } = await initialize('Person@example.com');
    role.value = 'Researcher';
    answer.value = 'My feedback';
    submit(form);
    await vi.waitFor(() => expect(error.hidden).toBe(false));
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.textContent).toBe('Something went wrong. Try again, or email tejitpabari99@gmail.com.');
    expect(error.querySelector('a')?.getAttribute('href')).toBe('mailto:tejitpabari99@gmail.com');
    expect(email.value).toBe('Person@example.com');
    expect(role.value).toBe('Researcher');
    expect(answer.value).toBe('My feedback');
    expect(button.disabled).toBe(false);
    expect(button.textContent).toBe('Get early access');
    expect(form.getAttribute('aria-busy')).toBe('false');
    expect(track).toHaveBeenCalledTimes(1);
    submit(form);
    await vi.waitFor(() => expect(postSignup).toHaveBeenCalledTimes(2));
  });

  it('puts invalid_email at the email field instead of showing the general error', async () => {
    postSignup.mockResolvedValue({ ok: false, error: 'invalid_email' });
    const { form, email, emailError, error, button } = await initialize('Person@example.com');
    submit(form);
    await vi.waitFor(() => expect(email.getAttribute('aria-invalid')).toBe('true'));
    expect(emailError.textContent).toBe('Enter a valid email address.');
    expect(document.activeElement).toBe(email);
    expect(error.hidden).toBe(true);
    expect(button.disabled).toBe(false);
  });

  it.each(['button', 'cancel', 'native'] as const)('closes via %s and restores the invoker and original scroll style', async (method) => {
    const { dialog, invoker } = await initialize();
    if (method === 'button') dialog.querySelector<HTMLButtonElement>('[data-signup-close]')!.click();
    if (method === 'cancel') dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    if (method === 'native') dialog.close();
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(invoker);
    expect(document.body.style.overflow).toBe('auto');
  });

  it.each(['removed', 'disabled', 'body'] as const)('falls back to main when the invoker is %s', async (state) => {
    const { dialog, invoker, main } = await initialize();
    if (state === 'removed') invoker.remove();
    if (state === 'disabled') (invoker as HTMLButtonElement).disabled = true;
    if (state === 'body') {
      dialog.close();
      invoker.blur();
      open();
    }
    dialog.close();
    expect(document.activeElement).toBe(main);
    expect(main.getAttribute('tabindex')).toBe('-1');
  });

  it('starts fresh after success, clearing answers, errors and the honeypot', async () => {
    postSignup.mockResolvedValue({ ok: true, confirmed: true });
    const { dialog, form, email, role, answer, error, entry, success } = await initialize('old@example.com');
    role.value = 'Researcher';
    answer.value = 'Old answer';
    document.querySelector<HTMLInputElement>('[name="company_website"]')!.value = 'bot';
    submit(form);
    await vi.waitFor(() => expect(success.hidden).toBe(false));
    success.querySelector<HTMLButtonElement>('[data-signup-close]')!.click();
    open();
    expect(dialog.open).toBe(true);
    expect(email.value).toBe('');
    expect(role.value).toBe('');
    expect(answer.value).toBe('');
    expect(document.querySelector<HTMLInputElement>('[name="company_website"]')!.value).toBe('');
    expect(error.hidden).toBe(true);
    expect(entry.hidden).toBe(false);
    expect(success.hidden).toBe(true);
    expect(document.activeElement).toBe(email);
    expect(dialog.getAttribute('aria-labelledby')).toBe('signup-title');
  });

  it('ignores a response that arrives after close', async () => {
    let finish!: (result: SignupResult) => void;
    postSignup.mockReturnValue(new Promise<SignupResult>((resolve) => { finish = resolve; }));
    const { dialog, form, success } = await initialize('Person@example.com');
    submit(form);
    dialog.querySelector<HTMLButtonElement>('[data-signup-close]')!.click();
    finish({ ok: true, confirmed: true });
    await Promise.resolve();
    expect(dialog.open).toBe(false);
    expect(success.hidden).toBe(true);
    expect(track.mock.calls).toEqual([['popup_open', { trigger: 'topbar' }]]);
  });

  it('ignores an old response without clearing a new submission busy state after reopen', async () => {
    const pending: Array<(result: SignupResult) => void> = [];
    postSignup.mockImplementation(() => new Promise<SignupResult>((resolve) => { pending.push(resolve); }));
    const { dialog, form, email, button, error, success } = await initialize('old@example.com');
    submit(form);
    dialog.querySelector<HTMLButtonElement>('[data-signup-close]')!.click();
    open('new@example.com');
    submit(form);
    expect(postSignup).toHaveBeenCalledTimes(2);
    pending[0]({ ok: false, error: 'invalid_email' });
    await Promise.resolve();
    expect(email.value).toBe('new@example.com');
    expect(email.getAttribute('aria-invalid')).toBe('false');
    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe('Sending…');
    expect(form.getAttribute('aria-busy')).toBe('true');
    expect(error.hidden).toBe(true);
    pending[1]({ ok: true, confirmed: true });
    await vi.waitFor(() => expect(success.hidden).toBe(false));
    expect(track.mock.calls).toEqual([
      ['popup_open', { trigger: 'topbar' }], ['popup_open', { trigger: 'topbar' }], ['signup_step2'],
    ]);
  });

  it('initializes once even when called repeatedly', async () => {
    const { dialog } = await initialize();
    const { initSignupDialog } = await import('../dialog');
    initSignupDialog();
    dialog.close();
    open();
    expect(track).toHaveBeenCalledTimes(2);
  });
});
