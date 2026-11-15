import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

it('deploys only after tests succeed on a push to main, using real repository variables', () => {
  const job = workflow().jobs.deploy;
  expect(job).toBeDefined();
  expect(job.needs).toBe('test');
  expect(job.if).toBe("github.event_name == 'push' && github.ref == 'refs/heads/main'");
  expect(job.env).toEqual({
    PUBLIC_SIGNUP_URL: '${{ vars.PUBLIC_SIGNUP_URL }}',
    PUBLIC_GA_ID: '${{ vars.PUBLIC_GA_ID }}',
    PUBLIC_SIGNUP_PLAN: '${{ vars.PUBLIC_SIGNUP_PLAN }}',
  });
  const commands = job.steps.filter((step: { run?: string }) => step.run).map((step: { run: string }) => step.run);
  expect(commands[0]).toBe('npm ci');
  expect(commands[1]).toBe('npm run build:prod');
  const deploy = job.steps.find((step: { env?: { FIREBASE_SERVICE_ACCOUNT?: string } }) => step.env?.FIREBASE_SERVICE_ACCOUNT);
  expect(deploy.env.FIREBASE_SERVICE_ACCOUNT).toBe('${{ secrets.FIREBASE_SERVICE_ACCOUNT }}');
  expect(deploy.run).toContain('umask 077');
  expect(deploy.run).toContain('GOOGLE_APPLICATION_CREDENTIALS');
  expect(deploy.run).toContain('firebase deploy --only hosting --project onolys --non-interactive');
  expect(job.steps.at(-1)).toMatchObject({ if: 'always()' });
  expect(job.steps.at(-1).run).toContain('rm -f');
  expect(job.steps.at(-1).run).toContain('$RUNNER_TEMP');
  expect(job.steps.some((step: { uses?: string }) => step.uses?.includes('upload-artifact'))).toBe(false);
});


it.each([0, 7])('removes scoped credentials after Firebase exits %s', (exitCode) => {
  const job = workflow().jobs.deploy;
  const deploy = job.steps.find((step: { env?: { FIREBASE_SERVICE_ACCOUNT?: string } }) => step.env?.FIREBASE_SERVICE_ACCOUNT);
  const dir = mkdtempSync(join(tmpdir(), 'miti-deploy-'));
  const mockNpx = join(dir, 'npx');
  try {
    writeFileSync(mockNpx, `#!/bin/sh
set -eu
test "$*" = "firebase deploy --only hosting --project onolys --non-interactive"
test "$GOOGLE_APPLICATION_CREDENTIALS" = "$RUNNER_TEMP/miti-firebase-service-account.json"
test -f "$GOOGLE_APPLICATION_CREDENTIALS"
test "$(stat -c '%a' "$GOOGLE_APPLICATION_CREDENTIALS")" = "600"
exit "$MOCK_DEPLOY_STATUS"
`);
    chmodSync(mockNpx, 0o700);
    const result = spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', deploy.run], {
      env: {
        ...process.env, PATH: `${dir}:${process.env.PATH}`, RUNNER_TEMP: dir,
        FIREBASE_SERVICE_ACCOUNT: '{"type":"service_account","private_key":"PUBLIC_TEST_FIXTURE"}',
        MOCK_DEPLOY_STATUS: String(exitCode),
      },
      encoding: 'utf8',
    });
    expect(result.status, result.stderr).toBe(exitCode);
    expect(existsSync(join(dir, 'miti-firebase-service-account.json'))).toBe(false);
    expect(result.stdout + result.stderr).not.toContain('PUBLIC_TEST_FIXTURE');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
