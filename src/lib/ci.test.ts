import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { parseDocument } from 'yaml';

function workflow() {
  const parsed = parseDocument(readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8'));
  expect(parsed.errors).toEqual([]);
  return parsed.toJS();
}

it('checks pushes and pull requests with a reproducible supported Node runtime', () => {
  const config = workflow();
  expect(Object.keys(config.on).sort()).toEqual(['pull_request', 'push']);
  expect(config.permissions).toEqual({ contents: 'read' });
  const steps = config.jobs.test.steps;
  expect(steps[0].uses).toBe('actions/checkout@v7');
  expect(steps.find((step: { uses?: string }) => step.uses === 'actions/setup-node@v7')?.with).toMatchObject({
    'node-version-file': '.nvmrc', cache: 'npm',
  });
});

it('runs validation before browser tests using public dummy configuration', () => {
  const job = workflow().jobs.test;
  expect(job.env).toMatchObject({
    PUBLIC_SIGNUP_URL: 'https://script.google.com/macros/s/TEST/exec',
    PUBLIC_GA_ID: 'G-TEST000000',
  });
  const commands = job.steps.filter((step: { run?: string }) => step.run).map((step: { run: string }) => step.run);
  expect(commands).toEqual([
    'npm ci', 'npm run check', 'npm test', 'npm run build',
    'npx playwright install --with-deps chromium', 'npm run test:e2e',
  ]);
  expect(job.steps.find((step: { uses?: string }) => step.uses === 'actions/upload-artifact@v7')).toMatchObject({
    if: 'failure()', with: { path: 'playwright-report/' },
  });
});
