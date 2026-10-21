/**
 * End-to-end tests (Phase 5). Runs a production build against a separate synthetic
 * database (prisma/test.db) with throwaway secrets generated per run — never the real .env
 * values or prisma/dev.db. Builds into .next-test so a running `next dev` is not disturbed.
 *
 *   npx playwright install chromium   # once per machine
 *   npm test
 */
const crypto = require('crypto');
const path = require('path');
const { defineConfig } = require('@playwright/test');

const PORT = 3200;
const TEST_DB = path.join(__dirname, 'prisma', 'test.db');

// Generated once in the main process; workers inherit them through the environment.
const once = (name, make) => {
  if (!process.env[name]) process.env[name] = make();
  return process.env[name];
};
const passwordEntry = (username, role, password) => {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, 210000, 32, 'sha256');
  return `${username}:${role}:pbkdf2.210000.${salt.toString('base64url')}.${hash.toString('base64url')}`;
};

const serverEnv = {
  NODE_ENV: 'production',
  NEXT_DIST_DIR: '.next-test',
  NEXT_TELEMETRY_DISABLED: '1',
  CHECKPOINT_DISABLE: '1',
  DATABASE_URL: `file:${TEST_DB}`,
  ENCRYPTION_KEY: once('E2E_ENCRYPTION_KEY', () => crypto.randomBytes(32).toString('base64')),
  IP_HASH_SALT: once('E2E_IP_HASH_SALT', () => crypto.randomBytes(32).toString('hex')),
  SESSION_SECRET: once('E2E_SESSION_SECRET', () => crypto.randomBytes(32).toString('hex')),
  ADMIN_USERS: once('E2E_ADMIN_USERS', () =>
    [
      passwordEntry('e2e-admin', 'admin', 'e2e-admin-password-1'),
      passwordEntry('e2e-desk', 'reception', 'e2e-desk-password-1')
    ].join(',')
  ),
  // Test environment only: on-screen one-time codes in a production build.
  DEMO_MODE: 'true',
  ALLOW_DEMO_IN_PROD: 'true',
  // Each test sends its own X-Forwarded-For so rate limits do not leak between tests.
  TRUST_PROXY: 'true'
};

module.exports = defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90000,
  reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }]],
  // After all tests: check everything the run stored in prisma/test.db (scripts/check-data.js).
  globalTeardown: './tests/e2e/teardown.js',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'off' },
  webServer: {
    command: `node tests/e2e/prepare-db.js && npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 600000,
    env: serverEnv,
    stdout: 'ignore',
    stderr: 'pipe'
  }
});

module.exports.TEST_DB = TEST_DB;
