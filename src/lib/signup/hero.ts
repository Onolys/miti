import { isValidEmail } from './body';
import { postSignup } from './client';
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
      button.disabled = true;
      form.setAttribute('aria-busy', 'true');

      const result = await postSignup(1, { email: value, honeypot: honeypot.value });
      busy = false;
      form.setAttribute('aria-busy', 'false');
      if (result.ok) {
        completed = true;
        track('signup_step1');
        const thanks = document.createElement('p');
        thanks.setAttribute('role', 'status');
        thanks.textContent = "Thanks. We'll reach out with early access information in a few weeks.";
        row.replaceWith(thanks);
      } else {
        button.disabled = false;
      }
      document.dispatchEvent(new CustomEvent('miti:open-popup', {
        detail: { trigger: 'hero', email: value },
      }));
    });
  }
}
