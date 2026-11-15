import { isValidEmail } from './body';
import { postSignup } from './client';
import { track } from '../track';

const initialized = new WeakSet<HTMLDialogElement>();

export function initSignupDialog(): void {
  const dialog = document.querySelector<HTMLDialogElement>('[data-signup-dialog]');
  if (!dialog || initialized.has(dialog)) return;
  initialized.add(dialog);

  const form = dialog.querySelector<HTMLFormElement>('[data-signup-form]')!;
  const email = form.querySelector<HTMLInputElement>('[name="email"]')!;
  const honeypot = form.querySelector<HTMLInputElement>('[name="company_website"]')!;
  const fields = form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[data-signup-field]');
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const emailError = form.querySelector<HTMLElement>('[data-email-error]')!;
  const error = form.querySelector<HTMLElement>('[data-signup-error]')!;
  const entry = dialog.querySelector<HTMLElement>('[data-signup-entry]')!;
  const success = dialog.querySelector<HTMLElement>('[data-signup-success]')!;
  const successHeading = success.querySelector<HTMLElement>('h2')!;
  let generation = 0;
  let busy = false;
  let sessionOpen = false;
  let invoker: HTMLElement | null = null;
  let previousOverflow = '';

  function setBusy(value: boolean): void {
    busy = value;
    button.disabled = value;
    button.textContent = value ? 'Sending…' : 'Get early access';
    form.setAttribute('aria-busy', String(value));
  }

  function restoreFocus(): void {
    if (invoker?.isConnected && !invoker.closest('[inert],[hidden]') &&
        !invoker.matches(':disabled,input[type="hidden"]') &&
        invoker.matches('button,input,select,textarea,a[href],[tabindex]')) {
      invoker.focus();
      if (document.activeElement === invoker) return;
    }
    const main = document.querySelector<HTMLElement>('main');
    main?.setAttribute('tabindex', '-1');
    main?.focus();
  }

  function finishClose(): void {
    if (!sessionOpen) return;
    sessionOpen = false;
    generation++;
    setBusy(false);
    document.body.style.overflow = previousOverflow;
    restoreFocus();
  }

  function close(): void {
    if (!dialog!.open) return;
    dialog!.close();
    // Native close events are queued; invalidate a pending response immediately.
    finishClose();
  }

  for (const closeButton of dialog.querySelectorAll<HTMLButtonElement>('[data-signup-close]')) {
    closeButton.addEventListener('click', close);
  }
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener('close', () => {
    // An earlier close event must not tear down a dialog that was already reopened.
    if (!dialog.open) finishClose();
  });

  document.addEventListener('miti:open-popup', (event) => {
    if (!dialog.isConnected) return;
    const detail = (event as CustomEvent<{ trigger?: string; email?: string }>).detail;
    if (!sessionOpen) {
      invoker = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      previousOverflow = document.body.style.overflow;
      sessionOpen = true;
    }
    generation++;
    form.reset();
    setBusy(false);
    entry.hidden = false;
    success.hidden = true;
    error.hidden = true;
    emailError.textContent = '';
    email.setAttribute('aria-invalid', 'false');
    email.value = typeof detail?.email === 'string' ? detail.email : '';
    dialog.setAttribute('aria-labelledby', 'signup-title');
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = 'hidden';
    track('popup_open', { trigger: detail?.trigger ?? '' });
    (email.value ? fields[0] ?? email : email).focus();
  });

  email.addEventListener('input', () => {
    email.setAttribute('aria-invalid', 'false');
    emailError.textContent = '';
  });

  function invalidEmail(): void {
    email.setAttribute('aria-invalid', 'true');
    emailError.textContent = 'Enter a valid email address.';
    email.focus();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy || !dialog.open || entry.hidden) return;
    error.hidden = true;
    const value = email.value.trim();
    if (!isValidEmail(value)) {
      invalidEmail();
      return;
    }
    email.setAttribute('aria-invalid', 'false');
    emailError.textContent = '';
    const requestGeneration = generation;
    setBusy(true);
    const answers = Object.fromEntries(Array.from(fields, (field) => [field.name, field.value]));
    const result = await postSignup(2, { email: value, fields: answers, honeypot: honeypot.value });
    if (requestGeneration !== generation || !dialog.open) return;
    setBusy(false);
    if (result.ok) {
      track('signup_step2');
      entry.hidden = true;
      success.hidden = false;
      dialog.setAttribute('aria-labelledby', successHeading.id);
      successHeading.focus();
    } else if (result.error === 'invalid_email') {
      invalidEmail();
    } else {
      error.hidden = false;
    }
  });
}
