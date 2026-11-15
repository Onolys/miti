import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { expect, it } from 'vitest';
import CtaButton from './CtaButton.astro';
import Section from './Section.astro';
import Analytics from './Analytics.astro';
import Footer from './Footer.astro';
import Learner from '../pages/index.astro';
import Enterprise from '../pages/enterprise.astro';

async function render(component: Parameters<AstroContainer['renderToString']>[0], props = {}, slots = {}) {
  const container = await AstroContainer.create();
  return new JSDOM(await container.renderToString(component, { props, slots })).window.document;
}

it('renders the shared CTA with the popup contract', async () => {
  const doc = await render(CtaButton, { trigger: 'hero' });
  const button = doc.querySelector('button')!;
  expect(button.type).toBe('button');
  expect(button.hasAttribute('data-open-popup')).toBe(true);
  expect(button.dataset.trigger).toBe('hero');
  expect(button.textContent).toBe('Get early access');
});

it('places a section CTA after its content and supports disabling it', async () => {
  const doc = await render(Section, { id: 'features', heading: 'Features' }, { default: '<p>Content</p>' });
  const section = doc.querySelector('section')!;
  expect(section.id).toBe('features');
  expect(section.querySelector('h2')?.textContent).toBe('Features');
  expect(section.lastElementChild?.getAttribute('data-trigger')).toBe('section:features');
  const noCta = await render(Section, { id: 'team', cta: false }, { default: '<p>Team</p>' });
  expect(noCta.querySelector('section')?.textContent).toContain('Team');
  expect(noCta.querySelector('[data-open-popup]')).toBeNull();
});

it('omits analytics scripts when no GA ID is provided', async () => {
  const doc = await render(Analytics);
  expect(doc.querySelector('script')).toBeNull();
});

it('loads GA asynchronously and configures the supplied ID', async () => {
  const doc = await render(Analytics, { gaId: 'G-TEST000000' });
  const external = doc.querySelector('script[src]')!;
  expect(external.getAttribute('src')).toBe('https://www.googletagmanager.com/gtag/js?id=G-TEST000000');
  expect(external.hasAttribute('async')).toBe(true);
  expect(doc.documentElement.textContent).toContain('G-TEST000000');
});

it('renders the exact limits/privacy footer and email link', async () => {
  const doc = await render(Footer);
  expect(Array.from(doc.querySelectorAll('footer p'), (p) => p.textContent?.trim()).join(' ')).toBe(
    'Not official MITI coding and cannot be submitted as one. Use it to practice and prepare. Role-play or de-identified transcripts only. Questions? Reach out to tejitpabari99@gmail.com',
  );
  expect(doc.querySelector('a')?.getAttribute('href')).toBe('mailto:tejitpabari99@gmail.com');
  expect(doc.querySelectorAll('a')).toHaveLength(1);
});

it.each([
  [Learner, 'learner', false],
  [Enterprise, 'enterprise', true],
] as const)('renders the page shell with correct indexing and navigation (%s)', async (component, page, noindex) => {
  const doc = await render(component);
  expect(doc.documentElement.lang).toBe('en');
  expect(doc.body.dataset.page).toBe(page);
  expect(doc.querySelector('main')).not.toBeNull();
  expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')).toBeTruthy();
  expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null).toBe(noindex ? 'noindex, nofollow' : null);
  expect(doc.querySelector('header a')?.getAttribute('href')).toBe('#top');
  expect(doc.querySelector('header [data-open-popup]')?.getAttribute('data-trigger')).toBe('topbar');
  expect(doc.querySelector('footer')).not.toBeNull();
});
