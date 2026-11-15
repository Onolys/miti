import { isValidEmail } from './body';
import { postSignup, warmUp, type SignupResult } from './client';
import { setPendingStep1 } from './pending';
import { setSubmitting } from './spinner';
import { track } from '../track';

const initialized = new WeakSet<HTMLFormElement>();

export function initHeroForms(root: ParentNode = document): void {
  for (const form of root.querySelectorAll<HTMLFormElement>('[data-hero-signup]')) {
    if (initialized.has(form)) continue;
    initialized.add(form);

    const email = form.querySelector<HTMLInputElement>('[name="email"]')!;
    const honeypot = form.querySelector<HTMLInputElement>('[name="company_website"]')!;
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    const error = form.querySelector<HTMLElement>('[data-email-error]')!;
    const row = form.querySelector<HTMLElement>('[data-hero-row]')!;
    let busy = false;
    let completed = false;

    email.addEventListener('focus', () => warmUp(), { once: true });

    email.addEventListener('input', () => {
      email.setAttribute('aria-invalid', 'false');
      error.textContent = '';
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (busy || completed) return;
      const value = email.value.trim();
      if (!isValidEmail(value)) {
        email.setAttribute('aria-invalid', 'true');
        error.textContent = 'Enter a valid email address.';
        email.focus();
        return;
      }
      email.setAttribute('aria-invalid', 'false');
      error.textContent = '';
      busy = true;
      setSubmitting(button, true);
      form.setAttribute('aria-busy', 'true');

      // Optimistic: open the popup now; step 1 continues in the background.
      const request: Promise<SignupResult> = postSignup(1, { email: value, honeypot: honeypot.value });
      setPendingStep1(request);
      document.dispatchEvent(new CustomEvent('miti:open-popup', {
        detail: { trigger: 'hero', email: value },
      }));

      const result = await request;
      busy = false;
      form.setAttribute('aria-busy', 'false');
      if (result.ok) {
        completed = true;
        track('signup_step1');
        const done = document.createElement('p');
        done.className = 'hero-signup-success';
        done.setAttribute('role', 'status');
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('viewBox', '0 0 20 20');
        icon.setAttribute('width', '20');
        icon.setAttribute('height', '20');
        icon.setAttribute('aria-hidden', 'true');
        icon.setAttribute('focusable', 'false');
        const mark = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        mark.setAttribute('d', 'M4 10.5l4 4 8-9');
        mark.setAttribute('fill', 'none');
        mark.setAttribute('stroke', 'currentColor');
        mark.setAttribute('stroke-width', '2.4');
        mark.setAttribute('stroke-linecap', 'round');
        mark.setAttribute('stroke-linejoin', 'round');
        icon.append(mark);
        const text = document.createElement('span');
        text.textContent = 'You have been signed up for early access.';
        done.append(icon, text);
        row.replaceWith(done);
      } else {
        setSubmitting(button, false);
        error.textContent = 'Something went wrong. Try again, or email tejitpabari99@gmail.com.';
      }
    });
  }
}
