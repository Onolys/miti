import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { expect, it } from 'vitest';
import SignupDialog from './SignupDialog.astro';
import { signupFields } from '../data/signup-fields';
import Learner from '../pages/index.astro';
import Enterprise from '../pages/enterprise.astro';

it.each(['learner', 'enterprise'] as const)('renders a labelled native dialog with the %s field configuration', async (page) => {
  const container = await AstroContainer.create();
  const document = new JSDOM(await container.renderToString(SignupDialog, { props: { page } })).window.document;
  const dialog = document.querySelector('dialog')!;
  expect(dialog.open).toBe(false);
  expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe('Get early access');
  expect(dialog.textContent).toContain('Tell us a bit about you. Everything except email is optional.');
  expect(dialog.querySelector('[data-signup-entry] button[data-signup-close]')?.getAttribute('aria-label')).toBe('Close');
  const form = dialog.querySelector('form')!;
  expect(form.hasAttribute('novalidate')).toBe(true);
  expect(form.getAttribute('method')).toBe('post');
  expect(form.getAttribute('action')).toBe('#');
  const email = form.querySelector<HTMLInputElement>('[name="email"]')!;
  expect(email.required).toBe(true);
  expect(email.type).toBe('email');
  expect(email.autocomplete).toBe('email');
  expect(email.inputMode).toBe('email');
  expect(form.querySelector('input,select,textarea')).toBe(email);
  const fields = Array.from(form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[data-signup-field]'));
  expect(fields.map((field) => field.name)).toEqual(signupFields[page].map(({ key }) => key));
  for (const field of [email, ...fields]) {
    expect(form.querySelector(`label[for="${field.id}"]`)?.textContent).toBeTruthy();
    expect(field.required).toBe(field === email);
  }
  for (const field of fields.filter((field) => field.tagName === 'SELECT') as HTMLSelectElement[]) {
    expect(field.options[0].textContent).toBe('Select…');
    expect(field.options[0].value).toBe('');
    expect(Array.from(field.options).slice(1).every((option) => option.value === option.textContent)).toBe(true);
  }
  expect(form.querySelector('[name="company_website"]')?.closest('[aria-hidden="true"][inert]')).not.toBeNull();
  expect(form.querySelector('[data-signup-error]')?.getAttribute('role')).toBe('alert');
  const success = dialog.querySelector<HTMLElement>('[data-signup-success]')!;
  expect(success.hidden).toBe(true);
  expect(success.querySelector('h2')?.textContent).toBe('Thank you for signing up.');
  expect(success.querySelector('h2')?.getAttribute('tabindex')).toBe('-1');
});

it.each([
  [Learner, 'learner'], [Enterprise, 'enterprise'],
] as const)('mounts one correctly configured dialog in Base for %s', async (component, page) => {
  const container = await AstroContainer.create();
  const document = new JSDOM(await container.renderToString(component)).window.document;
  expect(document.querySelectorAll('dialog[data-signup-dialog]')).toHaveLength(1);
  expect(document.querySelector('dialog [name="how_often"]') !== null).toBe(page === 'learner');
  expect(document.querySelector('dialog [name="organization"]') !== null).toBe(page === 'enterprise');
});
