import { expect, test as base, type Locator, type Page } from '@playwright/test';

type Payload = { step: number; page: string; [key: string]: unknown };
const test = base.extend<{ signupRequests: Payload[] }>({
  signupRequests: [async ({ page }, use) => {
    const errors: string[] = [];
    const requests: Payload[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    // Intercept entire Apps Script hosts, including any real URL in local env files.
    await page.route((url) => ['script.google.com', 'script.googleusercontent.com'].includes(url.hostname), async (route) => {
      if (route.request().method() === 'POST') requests.push(route.request().postDataJSON() as Payload);
      await route.fulfill({ json: { ok: true }, headers: { 'Access-Control-Allow-Origin': '*' } });
    });
    await page.route((url) => /(^|\.)(googletagmanager|google-analytics)\.com$/.test(url.hostname), (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await use(requests);
    expect(errors, 'Enterprise browsing must produce no browser or console errors').toEqual([]);
  }, { auto: true }],
});

async function visit(page: Page) {
  await page.goto('/enterprise?src=enterprise-test');
  await expect(page.locator('[data-feature-tabs]')).toHaveAttribute('data-enhanced', 'true');
}

const highlightedLines = (root: Locator) => root.locator('[data-line][data-highlighted="true"]').evaluateAll((lines) => lines.map((line) => Number((line as HTMLElement).dataset.line)));

test('enterprise sections, exact copy, comparison and trailing CTAs are complete', async ({ page, signupRequests }) => {
  await visit(page);
  const main = page.locator('main');
  expect(await main.locator(':scope > section').evaluateAll((sections) => sections.map(({ id }) => id))).toEqual(['hero', 'benefits', 'features', 'evaluates', 'compare', 'team']);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Quality-check your MITI coding. Every score, backed by the session.');
  await expect(page.locator('#hero')).toContainText("We read each coded sample against its transcript and flag the scores the session doesn't support, with line references.");
  await expect(page.locator('#hero')).toContainText('Role-play or de-identified transcripts. For practice and preparation, not official MITI coding.');
  await expect(page.locator('#hero [data-hero-signup]')).toHaveCount(1);
  await expect(page.locator('#hero [data-open-popup]')).toHaveCount(0);
  await expect(page.locator('#benefits article h3')).toHaveText(['Bulk evaluations', 'Quality control', 'Fast turnaround']);
  await expect(page.locator('#benefits article p')).toHaveText([
    'Volume pricing for evaluating many samples across your team or program.',
    'Check each coded sample against its transcript. Unsupported scores are flagged with lines, which also shows new coders where they drift.',
    'Flags arrive in minutes, so second coding focuses only on disputed scores.',
  ]);
  expect(await main.evaluate((element) => element.lastElementChild?.id)).toBe('team');
  expect(await main.evaluate((element) => element.nextElementSibling?.tagName)).toBe('FOOTER');
  await expect(main).not.toContainText(/\$|accura|replace/i);
  await expect(page.locator('#features')).not.toContainText('Results in minutes, not the 1 to 2 weeks human coding takes.');

  const table = page.locator('#compare table');
  await expect(table.locator('thead th')).toHaveText(['Criterion', 'Second human coder', 'Onolys evidence check']);
  await expect(table.locator('tbody th')).toHaveText(['Checks every score', 'Points to the lines', 'Turnaround', 'Scales with volume']);
  await expect(table.locator('tbody [data-value]')).toHaveText(['Yes', 'Yes', 'Sometimes', 'Yes, linked lines', 'Days', 'Minutes', 'Needs more coders', 'Yes']);
  await expect(table.locator('tbody td[data-highlighted="true"] strong')).toHaveCount(4);
  for (const section of ['benefits', 'features', 'compare']) {
    const cta = page.locator(`#${section} > [data-open-popup]`);
    await expect(cta).toHaveAttribute('data-trigger', `section:${section}`);
    await cta.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Organization', { exact: true })).toBeVisible();
    await expect(dialog.getByLabel('Samples per month', { exact: true })).toBeVisible();
    await expect(dialog.locator('[name="how_often"]')).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  }
  await expect(page.locator('#evaluates > [data-trigger="section:evaluates"]')).toHaveCount(1);
  expect(signupRequests).toEqual([]);
});

test('QC scores, exact evidence, initial gap and click toggles agree with the transcript', async ({ page }) => {
  await visit(page);
  const root = page.locator('#ent-evidence-panel [data-highlight-root]');
  const empathy = root.locator('[data-qc-row="EMPATHY"] button');
  const cr = root.locator('[data-qc-row="CR"] button');
  const pane = root.locator('[data-transcript-pane]');
  await expect(root).toContainText('3 supported, 2 flagged for review');
  await expect(root).toContainText('Flags are for human review. The coder decides.');
  await expect(root.locator('[data-qc-status]')).toHaveText(['Supported', 'Supported', 'Supported', 'Not supported', 'Not supported']);
  await expect(empathy).toContainText('Coder 5');
  await expect(empathy).toContainText('Session supports 4');
  await expect(empathy).toContainText('Empathy 5: not supported. No complex reflections at lines 53-66; line 58 concern missed.');
  await expect(cr).toContainText('Coder 7');
  await expect(cr).toContainText('Session supports 6');
  await expect(cr).toContainText('Line 59 counted as a complex reflection; the session shows none there.');
  await expect(root).toContainText('Session complex reflections: 6 (lines 12, 19, 31, 44, 52, 67).');
  await expect(pane.locator('[data-line]')).toHaveCount(70);
  await expect(pane).toHaveAccessibleName('Coder quality-check transcript');
  await expect(root.locator('[data-highlight-status]')).toHaveAttribute('aria-live', 'polite');
  const gap = Array.from({ length: 14 }, (_, index) => index + 53);
  expect(await highlightedLines(root)).toEqual(gap);
  await expect(empathy).toHaveAttribute('aria-pressed', 'true');
  await expect(pane.locator('[data-line="58"]')).toHaveAttribute('data-missed', 'true');
  await expect(pane.locator('[data-line="58"] [data-missed-tag]')).not.toHaveAttribute('hidden');
  await empathy.click();
  expect(await highlightedLines(root)).toEqual([]);
  await expect(empathy).toHaveAttribute('aria-pressed', 'false');
  await empathy.click();
  expect(await highlightedLines(root)).toEqual(gap);
  await expect(empathy).toHaveAttribute('aria-pressed', 'true');
  await cr.click();
  expect(await highlightedLines(root)).toEqual([59]);
  await expect(cr).toHaveAttribute('aria-pressed', 'true');
  await expect(empathy).toHaveAttribute('aria-pressed', 'false');
  await expect(pane.locator('[data-missed="true"]')).toHaveCount(0);
  await cr.click();
  expect(await highlightedLines(root)).toEqual([]);
  await expect(root.locator('[data-highlight-status]')).toHaveText('Highlights cleared.');
});

test('Complete and Feedback tabs retain the shared role-play content', async ({ page }) => {
  await visit(page);
  const tabs = page.locator('[data-feature-tabs]');
  await expect(tabs.getByRole('tab')).toHaveText(['Evidence', 'Complete', 'Feedback']);
  await tabs.getByRole('tab', { name: 'Complete', exact: true }).click();
  const complete = tabs.getByRole('tabpanel', { name: 'Complete', exact: true });
  await expect(complete).toBeVisible();
  await expect(complete.locator('[data-metric] [data-value]')).toHaveText(['3.5', '4.0', '55%', '1.57', '7', '1']);
  await expect(complete.locator('[data-global]')).toHaveCount(4);
  await expect(complete.locator('[data-behavior-code]')).toHaveCount(10);
  await tabs.getByRole('tab', { name: 'Feedback', exact: true }).click();
  const feedback = tabs.getByRole('tabpanel', { name: 'Feedback', exact: true });
  await expect(feedback).toBeVisible();
  await expect(feedback.locator('[data-feedback-kind="strength"]')).toHaveCount(2);
  await expect(feedback.locator('[data-feedback-kind="next"]')).toHaveCount(2);
  await expect(feedback.locator('[data-citations]')).toHaveText(['Lines 12, 31, 44', 'Lines 25, 66', 'Lines 58, 59, 60', 'Lines 59, 41, 39, 40']);
});

test('enterprise CTA submits only the mocked step-2 enterprise context and fields', async ({ page, signupRequests }) => {
  await visit(page);
  await page.locator('#benefits > [data-open-popup]').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Organization', { exact: true })).toBeVisible();
  await expect(dialog.getByLabel('Samples per month', { exact: true })).toBeVisible();
  await expect(dialog.locator('[name="how_often"]')).toHaveCount(0);
  await dialog.getByLabel('Email', { exact: true }).fill('qc-team@example.com');
  await dialog.getByLabel('Organization', { exact: true }).fill('Example QC team');
  await dialog.getByLabel('Samples per month', { exact: true }).selectOption('10 to 50');
  await dialog.getByRole('button', { name: 'Get early access', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Thank you for signing up.' })).toBeVisible();
  expect(signupRequests).toEqual([{
    step: 2, email: 'qc-team@example.com', page: 'enterprise', src: 'enterprise-test', honeypot: '',
    organization: 'Example QC team', samples_per_month: '10 to 50',
  }]);
});

test('enterprise is noindex and the full learner response has no enterprise links', async ({ page, request }) => {
  await visit(page);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.locator('link[rel~="canonical"]')).toHaveCount(0);
  const response = await request.get('/');
  expect(response.ok()).toBe(true);
  expect(await response.text()).not.toMatch(/\bhref\s*=\s*["'][^"']*enterprise/i);
  await page.goto('/');
  await expect(page.locator('[href*="enterprise" i]')).toHaveCount(0);
});

test('360px layouts fit every tab, benefit card and labeled comparison card', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await visit(page);
  const tabs = page.locator('[data-feature-tabs]');
  for (const label of ['Evidence', 'Complete', 'Feedback']) {
    await tabs.getByRole('tab', { name: label, exact: true }).click();
    await expect(tabs.getByRole('tab', { name: label, exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.locator('[role="tabpanel"]:visible')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${label} page width`).toBe(true);
    expect(await tabs.evaluate((element) => element.scrollWidth <= element.clientWidth), `${label} feature width`).toBe(true);
  }
  const benefits = await page.locator('#benefits article').all();
  const boxes = await Promise.all(benefits.map((card) => card.boundingBox()));
  expect(boxes.every((box) => box && box.width > 250 && box.x + box.width <= 360)).toBe(true);
  expect(boxes[1]!.y).toBeGreaterThan(boxes[0]!.y + boxes[0]!.height);
  expect(boxes[2]!.y).toBeGreaterThan(boxes[1]!.y + boxes[1]!.height);
  for (const row of await page.locator('#compare tbody tr').all()) {
    await expect(row).toHaveCSS('display', 'block');
    await expect(row.locator('th h3')).toBeVisible();
    await expect(row.locator('[data-column-label]')).toHaveText(['Second human coder', 'Onolys evidence check']);
    for (const cell of await row.locator('td').all()) {
      await expect(cell).toHaveCSS('display', 'grid');
      await expect(cell.locator('[data-column-label]')).toBeVisible();
      await expect(cell.locator('[data-value]')).toBeVisible();
      expect(await cell.evaluate((element) => element.getBoundingClientRect().right <= window.innerWidth)).toBe(true);
    }
  }
});
