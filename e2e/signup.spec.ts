import { expect, test as base, type Page } from '@playwright/test';

type Payload = { step: number; email: string; page: string; src: string; honeypot: string; [key: string]: unknown };
type Reply = { ok: boolean; error?: string };
type Backend = {
  requests: Payload[];
  respond: (body: Payload) => Reply | Promise<Reply>;
};

const test = base.extend<{ backend: Backend }>({
  backend: [async ({ page }, use) => {
    const backend: Backend = { requests: [], respond: () => ({ ok: true }) };
    // Intercept the whole hostname: an accidentally configured real deployment is still mocked.
    await page.route((url) => url.hostname === 'script.google.com' || url.hostname === 'script.googleusercontent.com', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.abort();
        return;
      }
      const payload = route.request().postDataJSON() as Payload;
      backend.requests.push(payload);
      const response = await backend.respond(payload);
      await route.fulfill({ json: response, headers: { 'Access-Control-Allow-Origin': '*' } });
    });
    await page.route((url) => /(^|\.)(googletagmanager|google-analytics)\.com$/.test(url.hostname), (route) => route.abort());
    await use(backend);
  }, { auto: true }],
});

const dialog = (page: Page) => page.getByRole('dialog');
const email = (page: Page) => dialog(page).getByRole('textbox', { name: 'Email', exact: true });
const submit = (page: Page) => dialog(page).getByRole('button', { name: 'Get early access', exact: true });
const topbar = (page: Page) => page.locator('[data-open-popup][data-trigger="topbar"]');

async function visit(page: Page, path = '/') {
  await page.goto(`${path}?src=signup-test`);
  // A click before the bundled modules load would not exercise the popup handler.
  await page.waitForFunction(() => typeof window.gtag === 'function');
}

async function events(page: Page) {
  return page.evaluate(() => window.dataLayer.map((item) => Array.from(item as ArrayLike<unknown>)).filter((item) => item[0] === 'event'));
}

function deferredReply() {
  let resolve!: (reply: Reply) => void;
  const promise = new Promise<Reply>((finish) => { resolve = finish; });
  return { promise, resolve };
}

test('hero success saves both steps, preserves context, sends no PII to analytics and reopens fresh', async ({ page, context, backend }) => {
  await visit(page);
  const hero = page.locator('[data-hero-signup]');
  await hero.getByRole('textbox', { name: 'Email' }).fill('person@example.com');
  await hero.getByRole('button').click();
  await expect(hero.getByRole('status')).toHaveText('You have been signed up for early access.');
  await expect(hero.getByRole('status')).toHaveCSS('background-color', 'rgb(229, 244, 236)');
  await expect(dialog(page)).toBeVisible();
  await expect(email(page)).toHaveValue('person@example.com');
  await expect(dialog(page).getByLabel('Role', { exact: true })).toBeFocused();
  await dialog(page).getByLabel('Role', { exact: true }).selectOption('Researcher');
  await dialog(page).getByLabel('Anything else').fill('Private feedback');
  await submit(page).click();
  await expect(dialog(page).getByRole('heading', { name: 'Thank you for signing up.' })).toBeFocused();
  expect(backend.requests).toEqual([
    { step: 1, email: 'person@example.com', page: 'learner', src: 'signup-test', honeypot: '' },
    { step: 2, email: 'person@example.com', page: 'learner', src: 'signup-test', honeypot: '', role: 'Researcher', anything_else: 'Private feedback' },
  ]);
  expect(await events(page)).toEqual([
    ['event', 'popup_open', { trigger: 'hero', page: 'learner', src: 'signup-test' }],
    ['event', 'signup_step1', { page: 'learner', src: 'signup-test' }],
    ['event', 'signup_step2', { page: 'learner', src: 'signup-test' }],
  ]);
  await dialog(page).getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator('main')).toBeFocused();
  // The success line must still be visible once the popup is closed.
  await expect(hero.getByRole('status')).toBeVisible();
  await expect(hero.getByRole('status')).toHaveText('You have been signed up for early access.');
  await topbar(page).click();
  await expect(email(page)).toHaveValue('');
  await expect(email(page)).toBeFocused();
  await expect(dialog(page).getByLabel('Role', { exact: true })).toHaveValue('');
  await expect(dialog(page).getByLabel('Anything else')).toHaveValue('');
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length, document.cookie])).toEqual([0, 0, '']);
  expect(await context.cookies()).toEqual([]);
});

test('hero failure still opens the popup and allows the second step to save', async ({ page, backend }) => {
  backend.respond = (body) => body.step === 1 ? { ok: false, error: 'server' } : { ok: true };
  await visit(page);
  const hero = page.locator('[data-hero-signup]');
  await hero.getByRole('textbox', { name: 'Email' }).fill('person@example.com');
  await hero.getByRole('button').click();
  await expect(email(page)).toHaveValue('person@example.com');
  await expect(hero.getByRole('status')).toHaveCount(0);
  await expect(hero.getByRole('button')).toBeEnabled();
  await expect(hero.getByRole('button')).toHaveText('Get early access');
  await submit(page).click();
  await expect(dialog(page).getByRole('heading', { name: 'Thank you for signing up.' })).toBeVisible();
  expect(backend.requests.map(({ step }) => step)).toEqual([1, 2]);
  expect((await events(page)).map((item) => item[1])).toEqual(['popup_open', 'signup_step2']);
});

for (const trigger of ['topbar', 'team']) {
  test(`${trigger} CTA opens an empty form, Esc returns focus and Tab stays in the modal`, async ({ page, backend }) => {
    await visit(page);
    const invoker = page.locator(`[data-open-popup][data-trigger="${trigger}"]`);
    await invoker.click();
    await expect(email(page)).toBeFocused();
    await expect(email(page)).toHaveValue('');
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
    // Traverse more controls than exist, in both directions, including the wrap boundaries.
    for (const key of ['Tab', 'Shift+Tab']) {
      for (let count = 0; count < 12; count++) {
        await page.keyboard.press(key);
        const focus = await dialog(page).evaluate((element) => ({ inside: element.contains(document.activeElement), active: document.activeElement?.tagName }));
        expect(focus.inside, `${key} ${count}: active element ${focus.active}`).toBe(true);
      }
    }
    await page.keyboard.press('Escape');
    await expect(dialog(page)).not.toBeVisible();
    await expect(invoker).toBeFocused();
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
    expect(backend.requests).toEqual([]);
    expect(await events(page)).toEqual([['event', 'popup_open', { trigger, page: 'learner', src: 'signup-test' }]]);
  });
}

for (const invalid of ['', 'not-an-email', '=person@example.com']) {
  test(`invalid email ${JSON.stringify(invalid)} stays local in hero and popup`, async ({ page, backend }) => {
    await visit(page);
    const hero = page.locator('[data-hero-signup]');
    await hero.getByRole('textbox', { name: 'Email' }).fill(invalid);
    await hero.getByRole('button').click();
    await expect(hero.locator('[data-email-error]')).toHaveText('Enter a valid email address.');
    await expect(dialog(page)).not.toBeVisible();
    await topbar(page).click();
    await email(page).fill(invalid);
    await submit(page).click();
    await expect(email(page)).toHaveAttribute('aria-invalid', 'true');
    await expect(email(page)).toBeFocused();
    await expect(dialog(page).locator('[data-email-error]')).toHaveText('Enter a valid email address.');
    expect(backend.requests).toEqual([]);
  });
}

test('server failure retains answers and offers mailto, while invalid_email points to the email field', async ({ page, backend }) => {
  backend.respond = () => ({ ok: false, error: 'server' });
  await visit(page);
  await topbar(page).click();
  await email(page).fill('person@example.com');
  await dialog(page).getByLabel('Anything else').fill('Keep my answer');
  await submit(page).click();
  const error = dialog(page).getByRole('alert');
  await expect(error).toHaveText('Something went wrong. Try again, or email tejitpabari99@gmail.com.');
  await expect(error.getByRole('link')).toHaveAttribute('href', 'mailto:tejitpabari99@gmail.com');
  await expect(email(page)).toHaveValue('person@example.com');
  await expect(dialog(page).getByLabel('Anything else')).toHaveValue('Keep my answer');
  await expect(submit(page)).toBeEnabled();
  backend.respond = () => ({ ok: false, error: 'invalid_email' });
  await submit(page).click();
  await expect(email(page)).toHaveAttribute('aria-invalid', 'true');
  await expect(email(page)).toBeFocused();
  await expect(error).not.toBeVisible();
  expect((await events(page)).map((item) => item[1])).toEqual(['popup_open']);
});

test('each form sends one request while busy, including repeated Enter', async ({ page, backend }) => {
  const heroPending = deferredReply();
  const popupPending = deferredReply();
  backend.respond = (body) => body.step === 1 ? heroPending.promise : popupPending.promise;
  await visit(page);
  const hero = page.locator('[data-hero-signup]');
  const heroEmail = hero.getByRole('textbox', { name: 'Email' });
  await heroEmail.fill('person@example.com');
  await heroEmail.press('Enter');
  await expect(hero).toHaveAttribute('aria-busy', 'true');
  await heroEmail.press('Enter');
  await expect(hero.getByRole('button')).toBeDisabled();
  await expect(hero.getByRole('button', { name: 'Submitting' })).toBeDisabled();
  expect(backend.requests).toHaveLength(1);
  // The popup is already open while step 1 is still pending.
  await expect(email(page)).toHaveValue('person@example.com');
  heroPending.resolve({ ok: true });
  await expect(hero.getByRole('status')).toBeVisible();
  await submit(page).click();
  await expect(dialog(page).getByRole('button', { name: 'Submitting' })).toBeDisabled();
  await email(page).press('Enter');
  await expect(dialog(page).locator('form')).toHaveAttribute('aria-busy', 'true');
  expect(backend.requests).toHaveLength(2);
  popupPending.resolve({ ok: true });
  await expect(dialog(page).getByRole('heading', { name: 'Thank you for signing up.' })).toBeVisible();
  expect(backend.requests).toHaveLength(2);
});

test('late hero response preserves answers and a queued step 2 save in the open popup', async ({ page, backend }) => {
  const heroPending = deferredReply();
  const popupPending = deferredReply();
  backend.respond = (body) => body.step === 1 ? heroPending.promise : popupPending.promise;
  await visit(page);
  const hero = page.locator('[data-hero-signup]');
  await hero.getByRole('textbox', { name: 'Email' }).fill('hero@example.com');
  await hero.getByRole('button').click();
  await expect.poll(() => backend.requests.length).toBe(1);
  // The hero popup is already open (modal) while step 1 is pending.
  await email(page).fill('popup@example.com');
  await dialog(page).getByLabel('Role', { exact: true }).selectOption('Researcher');
  const answer = dialog(page).getByLabel('Anything else');
  await answer.fill('Keep my answers');
  await submit(page).click();
  await expect(dialog(page).getByRole('button', { name: 'Submitting' })).toBeDisabled();
  // Step 2 waits for step 1 so the Sheet sees them in order.
  expect(backend.requests).toHaveLength(1);
  await answer.focus();

  heroPending.resolve({ ok: true });
  await expect.poll(() => backend.requests.length).toBe(2);

  await expect(hero.getByRole('status')).toBeAttached();
  await expect(email(page)).toHaveValue('popup@example.com');
  await expect(dialog(page).getByLabel('Role', { exact: true })).toHaveValue('Researcher');
  await expect(answer).toHaveValue('Keep my answers');
  await expect(answer).toBeFocused();
  await expect(dialog(page).getByRole('button', { name: 'Submitting' })).toBeDisabled();
  await expect(dialog(page).locator('form')).toHaveAttribute('aria-busy', 'true');
  await email(page).press('Enter');
  expect(backend.requests).toHaveLength(2);
  popupPending.resolve({ ok: true });
  await expect(dialog(page).getByRole('heading', { name: 'Thank you for signing up.' })).toBeFocused();
  expect(backend.requests[1]).toMatchObject({ step: 2, email: 'popup@example.com', role: 'Researcher', anything_else: 'Keep my answers' });
  expect((await events(page)).map((item) => item[1])).toEqual(['popup_open', 'signup_step1', 'signup_step2']);
  await dialog(page).getByRole('button', { name: 'Close', exact: true }).click();
  // The hero button that opened the popup was replaced by the success line, so focus falls back to main.
  await expect(page.locator('main')).toBeFocused();
});

test('enterprise renders its fields, submits page context and keeps honeypots inert', async ({ page, backend }) => {
  await visit(page, '/enterprise');
  for (const honeypot of await page.locator('[name="company_website"]').all()) {
    await expect(honeypot).toHaveAttribute('tabindex', '-1');
    expect(await honeypot.evaluate((element) => Boolean(element.closest('[inert][aria-hidden="true"]')))).toBe(true);
  }
  await topbar(page).click();
  await expect(dialog(page).locator('[name="how_often"]')).toHaveCount(0);
  await expect(dialog(page).getByLabel('Organization', { exact: true })).toBeVisible();
  await expect(dialog(page).getByLabel('Number of coders or learners')).toBeVisible();
  await email(page).fill('org@example.com');
  await dialog(page).getByLabel('Organization', { exact: true }).fill('Example organization');
  await dialog(page).getByLabel('Role', { exact: true }).selectOption('Coding service lead');
  await submit(page).click();
  await expect(dialog(page).getByRole('heading', { name: 'Thank you for signing up.' })).toBeVisible();
  expect(backend.requests).toEqual([{ step: 2, email: 'org@example.com', page: 'enterprise', src: 'signup-test', honeypot: '', organization: 'Example organization', role: 'Coding service lead' }]);
  expect(await events(page)).toEqual([
    ['event', 'popup_open', { trigger: 'topbar', page: 'enterprise', src: 'signup-test' }],
    ['event', 'signup_step2', { page: 'enterprise', src: 'signup-test' }],
  ]);
});

test('dialog fits the viewport and keeps its header and submit visible while the fields scroll', async ({ page, isMobile }) => {
  await visit(page, '/enterprise');
  await topbar(page).click();
  const bounds = await dialog(page).boundingBox();
  const viewport = page.viewportSize()!;
  expect(bounds).not.toBeNull();
  if (isMobile) {
    expect(bounds!.x).toBe(0);
    expect(bounds!.y).toBe(0);
    expect(bounds!.width).toBe(viewport.width);
    expect(bounds!.height).toBe(viewport.height);
  } else {
    expect(bounds!.width).toBe(480);
    expect(bounds!.x).toBeCloseTo((viewport.width - 480) / 2, 0);
    expect(bounds!.height).toBeLessThanOrEqual(viewport.height - 48);
  }
  await dialog(page).getByLabel('Anything else').scrollIntoViewIfNeeded();
  await expect(dialog(page).getByRole('heading', { name: 'Get early access' })).toBeInViewport();
  await expect(submit(page)).toBeInViewport();
  expect(await email(page).evaluate((element) => getComputedStyle(element).fontSize)).toBe('16px');
});

test('closing a pending save and reopening ignores the old response', async ({ page, backend }) => {
  const pending = deferredReply();
  backend.respond = () => pending.promise;
  await visit(page);
  await topbar(page).click();
  await email(page).fill('old@example.com');
  await submit(page).click();
  await expect.poll(() => backend.requests.length).toBe(1);
  await dialog(page).getByRole('button', { name: 'Close', exact: true }).click();
  await topbar(page).click();
  await email(page).fill('new@example.com');
  // Waiting for the intercepted response ensures the old request actually settled.
  const settled = page.waitForResponse((response) => new URL(response.url()).hostname === 'script.google.com');
  pending.resolve({ ok: true });
  await (await settled).finished();
  await expect(email(page)).toHaveValue('new@example.com');
  await expect(submit(page)).toBeEnabled();
  await expect(dialog(page).getByRole('heading', { name: 'Thank you for signing up.' })).toHaveCount(0);
  backend.respond = () => ({ ok: true });
  await submit(page).click();
  await expect(dialog(page).getByRole('heading', { name: 'Thank you for signing up.' })).toBeVisible();
  expect((await events(page)).map((item) => item[1])).toEqual(['popup_open', 'popup_open', 'signup_step2']);
});
