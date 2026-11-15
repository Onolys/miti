import { expect, test as base, type Locator, type Page } from '@playwright/test';

// Keep every run local even if a deployed signup URL is present in .env.local.
const test = base.extend<{ browserSafety: void }>({
  browserSafety: [async ({ page }, use) => {
    const errors: string[] = [];
    const signupRequests: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.route((url) => url.hostname === 'script.google.com' || url.hostname === 'script.googleusercontent.com', async (route) => {
      signupRequests.push(route.request().url());
      await route.fulfill({ json: { ok: true }, headers: { 'Access-Control-Allow-Origin': '*' } });
    });
    // Fulfill the analytics loader locally so blocked requests add no console noise.
    await page.route((url) => /(^|\.)(googletagmanager|google-analytics)\.com$/.test(url.hostname), (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await use();
    expect(signupRequests, 'Browsing and opening CTAs must not save a signup').toEqual([]);
    expect(errors, 'Learner page must have no browser or console errors').toEqual([]);
  }, { auto: true }],
});

async function visit(page: Page) {
  await page.goto('/');
  await expect(page.locator('[data-feature-tabs]')).toHaveAttribute('data-enhanced', 'true');
}

async function assertTab(root: Locator, label: string) {
  const tab = root.getByRole('tab', { name: label, exact: true });
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await expect(tab).toHaveAttribute('tabindex', '0');
  await expect(root.locator('[role="tab"][aria-selected="true"]')).toHaveCount(1);
  await expect(root.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);
  await expect(root.locator('[role="tabpanel"]:visible')).toHaveCount(1);
  const controls = await tab.getAttribute('aria-controls');
  await expect(root.locator(`[id="${controls}"]`)).toBeVisible();
}

const highlightedLines = (root: Locator) => root.locator('[data-line][data-highlighted="true"]').evaluateAll((rows) => rows.map((row) => Number((row as HTMLElement).dataset.line)));

test('learner sections, approved copy, comparison and CTAs are complete', async ({ page }) => {
  await visit(page);
  const main = page.locator('main');
  expect(await main.locator(':scope > section').evaluateAll((sections) => sections.map((section) => section.id))).toEqual(['hero', 'features', 'evaluates', 'compare', 'team']);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Get your MI session evaluated. See the evidence for every score.');
  await expect(page.locator('#hero')).toContainText('A full MITI 4.2.1 evaluation of your transcript: global ratings, behavior counts, summary scores and feedback, each linked to the exact lines.');
  await expect(page.locator('#hero')).not.toContainText('not official MITI coding');
  await expect(page.locator('#hero [data-hero-signup]')).toHaveCount(1);
  await expect(page.locator('#features')).toContainText('Results in minutes, not the 1 to 2 weeks human coding takes.');
  await expect(page.locator('#evaluates article')).toHaveCount(6);
  expect(await main.evaluate((element) => element.lastElementChild?.id)).toBe('team');
  expect(await main.evaluate((element) => element.nextElementSibling?.tagName)).toBe('FOOTER');
  await expect(page.locator('footer')).toContainText('Not official MITI coding and cannot be submitted as one.');
  await expect(main).not.toContainText('$');

  const table = page.locator('#compare table');
  await expect(table.locator('thead th')).toHaveText(['Criterion', 'Human MITI coding', 'AI practice chatbots', 'Onolys']);
  await expect(table.locator('tbody th')).toHaveText(['Your own session', 'Full MITI 4.2.1 incl. global ratings', 'Evidence for every score', 'Turnaround']);
  await expect(table.locator('tbody [data-value]')).toHaveText([
    'Yes', 'No, a simulated chat', 'Yes', 'Yes', 'Usually "MITI-informed"', 'Yes',
    'Sometimes', 'Rarely', 'Yes, linked lines', 'About 1 to 2 weeks', 'Instant', 'Minutes',
  ]);
  await expect(table.locator('tbody td[data-highlighted="true"] strong')).toHaveCount(4);
  for (const section of ['features', 'evaluates', 'compare']) {
    const cta = page.locator(`#${section} .cta-row > [data-open-popup]`);
    await expect(cta).toHaveAttribute('data-trigger', `section:${section}`);
    await cta.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
  }
});

test('Evidence toggles exact lines and marks the missed worry while scrolling only its pane', async ({ page }) => {
  await visit(page);
  const root = page.locator('[data-highlight-root]');
  const cr = root.locator('[data-behavior-code="CR"] button');
  const pane = root.locator('[data-transcript-pane]');
  await expect(cr).toHaveAttribute('aria-pressed', 'true');
  expect(await highlightedLines(root)).toEqual([12, 19, 31, 44, 52, 67]);
  await expect(pane.locator('[data-line]')).toHaveCount(70);
  await expect(pane).toHaveAttribute('tabindex', '0');
  await expect(pane).toHaveAccessibleName('Fictional role-play transcript');
  await expect(root.locator('[data-highlight-status]')).toHaveAttribute('aria-live', 'polite');

  await cr.click();
  expect(await highlightedLines(root)).toEqual([]);
  await expect(cr).toHaveAttribute('aria-pressed', 'false');
  await expect(root.locator('[data-highlight-status]')).toHaveText('Highlights cleared.');
  await cr.scrollIntoViewIfNeeded();
  await pane.evaluate((element) => { element.scrollTop = 0; });
  const before = await page.evaluate(() => window.scrollY);
  await cr.click();
  expect(await highlightedLines(root)).toEqual([12, 19, 31, 44, 52, 67]);
  await expect(root.locator('[data-highlight-status]')).toHaveText('6 lines highlighted: 12, 19, 31, 44, 52, 67.');
  expect(await pane.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - before)).toBeLessThanOrEqual(1);
  await expect(pane.locator('[data-line="12"] [data-line-tag]')).toHaveText('Complex reflections');
  await expect(pane.locator('[data-line="12"] [data-line-tag]')).not.toHaveAttribute('hidden');

  const empathy = root.locator('[data-global="EMPATHY"] button');
  await empathy.scrollIntoViewIfNeeded();
  const beforeEmpathy = await page.evaluate(() => window.scrollY);
  await empathy.click();
  expect(await highlightedLines(root)).toEqual([12, 31, 44]);
  await expect(root.locator('[aria-pressed="true"]')).toHaveCount(1);
  await expect(pane.locator('[data-line="58"]')).toHaveAttribute('data-missed', 'true');
  await expect(pane.locator('[data-line="58"] [data-missed-tag]')).toHaveText('not picked up');
  await expect(pane.locator('[data-line="58"] [data-missed-tag]')).not.toHaveAttribute('hidden');
  await expect(root.locator('[data-highlight-status]')).toHaveText('3 lines highlighted: 12, 31, 44. 1 line not picked up: 58.');
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - beforeEmpathy)).toBeLessThanOrEqual(1);
});

test('tabs support both arrow axes, Home, End, focus and the complete/feedback panels', async ({ page }) => {
  await visit(page);
  const root = page.locator('[data-feature-tabs]');
  const desktop = (page.viewportSize()?.width ?? 0) >= 768;
  await expect(root.getByRole('tablist')).toHaveAttribute('aria-orientation', desktop ? 'vertical' : 'horizontal');
  await assertTab(root, 'Evidence');
  await root.getByRole('tab', { name: 'Evidence', exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  await assertTab(root, 'Complete');
  await expect(root.getByRole('tab', { name: 'Complete', exact: true })).toBeFocused();
  const complete = root.getByRole('tabpanel', { name: 'Complete', exact: true });
  await expect(complete.locator('[data-level]')).toHaveText(['Fair', 'Good', 'Good', 'Fair']);
  await expect(complete.locator('[data-metric] [data-value]')).toHaveText(['3.5', '4.0', '55%', '1.57', '7', '1']);
  await expect(complete.locator('[data-global]')).toHaveCount(4);
  await expect(complete.locator('[data-behavior-code]')).toHaveCount(10);
  await expect(complete).toContainText('Reference levels from MITI 4.2.1 (fair / good). Not pass marks.');

  await page.keyboard.press('ArrowRight');
  await assertTab(root, 'Feedback');
  await expect(root.getByRole('tab', { name: 'Feedback', exact: true })).toBeFocused();
  const feedback = root.getByRole('tabpanel', { name: 'Feedback', exact: true });
  await expect(feedback.locator('[data-feedback-kind="strength"]')).toHaveCount(2);
  await expect(feedback.locator('[data-feedback-kind="next"]')).toHaveCount(2);
  await expect(feedback.locator('[data-citations]')).toHaveText(['Lines 12, 31, 44', 'Lines 25, 66', 'Lines 58, 59, 60', 'Lines 59, 41, 39, 40']);

  for (const [key, label] of [['Home', 'Evidence'], ['End', 'Feedback'], ['ArrowLeft', 'Complete'], ['ArrowUp', 'Evidence'], ['ArrowLeft', 'Feedback'], ['ArrowRight', 'Evidence']]) {
    await page.keyboard.press(key);
    await assertTab(root, label);
    await expect(root.getByRole('tab', { name: label, exact: true })).toBeFocused();
  }
});

test('360px layouts keep every tab and labeled comparison card within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await visit(page);
  const root = page.locator('[data-feature-tabs]');
  await expect(root.getByRole('tablist')).toHaveAttribute('aria-orientation', 'horizontal');
  for (const label of ['Evidence', 'Complete', 'Feedback']) {
    await root.getByRole('tab', { name: label, exact: true }).click();
    await assertTab(root, label);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${label} page width`).toBe(true);
    expect(await root.evaluate((element) => element.scrollWidth <= element.clientWidth), `${label} feature width`).toBe(true);
  }
  const rows = page.locator('#compare tbody tr');
  await expect(rows).toHaveCount(4);
  for (const row of await rows.all()) {
    await expect(row).toHaveCSS('display', 'block');
    await expect(row.locator('th h3')).toBeVisible();
    await expect(row.locator('[data-column-label]')).toHaveText(['Human MITI coding', 'AI practice chatbots', 'Onolys']);
    for (const cell of await row.locator('td').all()) {
      await expect(cell).toHaveCSS('display', 'grid');
      await expect(cell.locator('[data-column-label]')).toBeVisible();
      await expect(cell.locator('[data-value]')).toBeVisible();
      expect(await cell.evaluate((element) => element.getBoundingClientRect().right <= window.innerWidth)).toBe(true);
    }
  }
});
