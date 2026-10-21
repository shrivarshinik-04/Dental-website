/**
 * REQUIREMENTS §9 / §15 security headers, input validation, CSRF protection, rate limiting,
 * secret exposure, deployment flags (FORCE_HTTPS, DEMO_MODE guard) and the retention job.
 */
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { test, expect } = require('@playwright/test');
const { TEST_DB } = require('../../playwright.config');
const { bookingBody, db, newContext } = require('./helpers');

const ROOT = path.join(__dirname, '..', '..');

test('security headers (test build without FORCE_HTTPS)', async ({ request }) => {
  const headers = (await request.get('/')).headers();
  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['content-security-policy']).not.toContain('upgrade-insecure-requests');
  expect(headers['strict-transport-security']).toBeUndefined();
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toContain('camera=()');
  expect(headers['x-powered-by']).toBeUndefined();
  expect((await request.get('/api/rights/session')).headers()['cache-control']).toContain('no-store');
});

test('FORCE_HTTPS adds HSTS and upgrade-insecure-requests in production config', async () => {
  const out = execFileSync(process.execPath, ['-e', "require('./next.config.js').headers().then(h => console.log(JSON.stringify(h[0].headers.map(x => x.key))))"], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: 'production', FORCE_HTTPS: 'true', DEMO_MODE: '' }
  }).toString();
  expect(JSON.parse(out)).toEqual(expect.arrayContaining(['Strict-Transport-Security', 'Cross-Origin-Opener-Policy']));
});

test('DEMO_MODE is refused in production without the explicit override', async () => {
  const run = (extra) => spawnSync(process.execPath, ['-e', "require('./next.config.js')"], { cwd: ROOT, env: { ...process.env, NODE_ENV: 'production', DEMO_MODE: 'true', ALLOW_DEMO_IN_PROD: '', ...extra } });
  expect(run({}).status).not.toBe(0);
  expect(run({ ALLOW_DEMO_IN_PROD: 'true' }).status).toBe(0);
});

test('input validation rejects bad values and unknown fields', async ({ browser, baseURL }) => {
  const ctx = await newContext(browser);
  const badPhone = await ctx.request.post('/api/appointments', { data: bookingBody({ phone: '12345' }), headers: { Origin: baseURL } });
  expect(badPhone.status()).toBe(400);
  expect((await badPhone.json()).fields).toContain('phone');
  const extra = await ctx.request.post('/api/appointments', { data: { ...bookingBody(), admin: true }, headers: { Origin: baseURL } });
  expect(extra.status()).toBe(400);
  const pastDate = await ctx.request.post('/api/appointments', { data: bookingBody({ preferredDate: '2020-01-01' }), headers: { Origin: baseURL } });
  expect(pastDate.status()).toBe(400);
  await ctx.close();
});

test('cross-site requests are blocked', async ({ request }) => {
  const res = await request.post('/api/appointments', { data: bookingBody(), headers: { Origin: 'https://attacker.example' } });
  expect(res.status()).toBe(403);
});

test('public endpoints are rate-limited per client', async ({ browser, baseURL }) => {
  const ctx = await newContext(browser);
  const statuses = [];
  for (let i = 0; i < 6; i += 1) statuses.push((await ctx.request.post('/api/appointments', { data: {}, headers: { Origin: baseURL } })).status());
  expect(statuses.slice(0, 5)).toEqual([400, 400, 400, 400, 400]);
  expect(statuses[5]).toBe(429);
  await ctx.close();
});

test('no secrets or database files are served', async ({ request }) => {
  for (const p of ['/.env', '/.env.example', '/prisma/test.db', '/prisma/schema.prisma', '/next.config.js']) {
    expect((await request.get(p)).status(), p).toBe(404);
  }
  const html = await (await request.get('/')).text();
  expect(html).not.toContain(process.env.E2E_ENCRYPTION_KEY);
  expect(html).not.toContain(process.env.E2E_SESSION_SECRET);
});

test('retention job: dry run changes nothing; real run deletes expired booking data', async () => {
  const principal = await db().dataPrincipal.create({ data: { referenceId: `DP-RT${Date.now().toString(36).slice(-4).toUpperCase()}`, name: 'v1:x', phone: 'v1:y' } });
  await db().appointment.create({ data: { dataPrincipalId: principal.id, preferredDate: new Date(Date.now() - 40 * 864e5), preferredSlot: 'MORNING', service: 'v1:s' } });
  const env = { ...process.env, DATABASE_URL: `file:${TEST_DB}` };
  const dry = execFileSync(process.execPath, ['scripts/retention.js', '--dry-run'], { cwd: ROOT, env }).toString();
  expect(dry).toContain('(dry run)');
  expect(await db().appointment.count({ where: { dataPrincipalId: principal.id } })).toBe(1);
  execFileSync(process.execPath, ['scripts/retention.js'], { cwd: ROOT, env });
  expect(await db().appointment.count({ where: { dataPrincipalId: principal.id } })).toBe(0);
  const after = await db().dataPrincipal.findUnique({ where: { id: principal.id } });
  expect(after.erasedAt).not.toBeNull();
  expect(await db().auditLog.count({ where: { action: 'RETENTION_RUN' } })).toBeGreaterThan(0);
});
