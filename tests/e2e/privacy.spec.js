/**
 * REQUIREMENTS §15: notice visibility, form minimisation, consent capture and evidence,
 * consent withdrawal and processing changes, optional choices, external data flows,
 * child safeguards, error handling. Synthetic data only.
 */
const { test, expect } = require('@playwright/test');
const { NOTICE_VERSION, bookViaApi, bookingBody, consentCookie, db, futureDate, newContext, testPhone, watchConsole } = require('./helpers');

test('first load: no cookies, no browser storage, no third-party requests', async ({ browser, baseURL }) => {
  const ctx = await newContext(browser);
  const page = await ctx.newPage();
  const external = [];
  page.on('request', (r) => !r.url().startsWith(baseURL) && !r.url().startsWith('data:') && external.push(r.url()));
  await page.goto('/', { waitUntil: 'networkidle' });
  expect(external).toEqual([]);
  expect(await ctx.cookies()).toEqual([]);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  await ctx.close();
});

test('notice, policy and contact details are in the server HTML (readable without JavaScript)', async ({ request, browser }) => {
  const booking = await (await request.get('/book-appointment')).text();
  for (const text of ['Privacy notice', 'Personal data we collect here', 'Who receives it', 'Dr. A. Sample (Grievance Officer)', 'Sample details: test environment']) {
    expect(booking, text).toContain(text);
  }
  const policy = await (await request.get('/privacy-policy')).text();
  for (const text of ['Laws that apply to us', 'Information Technology Act, 2000', 'May 2027', 'Not yet configured', 'CERT-In']) expect(policy, text).toContain(text);
  expect(policy).not.toMatch(/we (are|remain) (fully )?compliant/i);
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/book-appointment');
  await expect(page.getByRole('heading', { name: 'Privacy notice' })).toBeVisible();
  await expect(page.locator('.page-loader')).toBeHidden();
  await ctx.close();
});

test('booking form collects only the listed fields; the API rejects anything else', async ({ browser, baseURL }) => {
  const ctx = await newContext(browser);
  await ctx.addCookies([consentCookie(baseURL)]);
  const page = await ctx.newPage();
  await page.goto('/book-appointment', { waitUntil: 'networkidle' });
  const ids = await page.locator('form input, form select, form textarea').evaluateAll((els) => els.map((e) => e.id).sort());
  expect(ids).toEqual(
    ['field-consentAppointment', 'field-email', 'field-isMinor', 'field-isMinor-no', 'field-name', 'field-phone', 'field-preferredDate', 'field-preferredSlot', 'field-reason', 'field-service'].sort()
  );
  const res = await ctx.request.post('/api/appointments', { data: { ...bookingBody(), dateOfBirth: '2000-01-01' }, headers: { Origin: baseURL } });
  expect(res.status()).toBe(400);
  await ctx.close();
});

test('booking through the UI: required consent, notice version and evidence recorded; sensitive fields encrypted', async ({ browser, baseURL }) => {
  const ctx = await newContext(browser);
  await ctx.addCookies([consentCookie(baseURL)]);
  const page = await ctx.newPage();
  const messages = watchConsole(page);
  let posts = 0;
  page.on('request', (r) => r.url().includes('/api/appointments') && r.method() === 'POST' && (posts += 1));
  await page.goto('/book-appointment', { waitUntil: 'networkidle' });
  await page.fill('#field-name', 'Test Patient Ui');
  await page.fill('#field-phone', testPhone());
  await page.selectOption('#field-service', 'Orthodontics');
  await page.fill('#field-preferredDate', futureDate(5));
  await page.selectOption('#field-preferredSlot', 'EVENING');
  await page.fill('#field-reason', 'Synthetic test reason');
  await page.check('#field-isMinor-no');
  await expect(page.locator('#field-consentAppointment')).not.toBeChecked();
  await page.getByRole('button', { name: 'Request appointment' }).click();
  expect(posts).toBe(0); // blocked without the required consent
  await expect(page.locator('#error-consentAppointment')).toBeVisible();
  await page.check('#field-consentAppointment');
  await page.getByRole('button', { name: 'Request appointment' }).click();
  const ref = (await page.locator('.alert-success strong').first().textContent()).trim();
  expect(ref).toMatch(/^DP-[A-Z0-9]{6}$/);

  const principal = await db().dataPrincipal.findUnique({
    where: { referenceId: ref },
    include: { appointments: true, consents: { include: { noticeVersion: true } } }
  });
  expect(principal.name).toMatch(/^v1:/);
  expect(principal.appointments[0].notes).toMatch(/^v1:/);
  expect(principal.appointments[0].service).toMatch(/^v1:/);
  expect(principal.consents).toHaveLength(1);
  const consent = principal.consents[0];
  expect([consent.purpose, consent.status, consent.channel]).toEqual(['APPOINTMENT', 'GIVEN', 'APPOINTMENT_FORM']);
  expect(consent.noticeVersion.version).toBe(NOTICE_VERSION);
  expect(JSON.parse(consent.noticeVersion.content).vars.isSample).toBe(true);
  expect(consent.ipHash).toMatch(/^[0-9a-f]{64}$/);
  expect(messages).toEqual([]);
  await ctx.close();
});

test('analytics: off by default, opt-in records page views, withdrawal stops processing and erases data', async ({ browser }) => {
  const ctx = await newContext(browser);
  const page = await ctx.newPage();
  const requests = [];
  page.on('request', (r) => requests.push(new URL(r.url()).pathname));
  await page.goto('/', { waitUntil: 'networkidle' });
  expect(requests).not.toContain('/js/analytics.js');
  await page.getByRole('dialog').getByRole('button', { name: 'Accept all' }).click();
  await expect.poll(async () => (await ctx.cookies()).find((c) => c.name === 'dc_vid')?.value || null).not.toBeNull();
  const visitorId = (await ctx.cookies()).find((c) => c.name === 'dc_vid').value;
  await expect.poll(() => db().analyticsEvent.count({ where: { visitorId } })).toBe(1);
  await page.locator('a[href="/privacy-policy"]').first().click();
  await page.waitForURL('**/privacy-policy');
  await expect.poll(() => db().analyticsEvent.count({ where: { visitorId } })).toBe(2);
  await page.locator('nav a[href="/book-appointment"]').first().click(); // no-tracking page
  await page.waitForURL('**/book-appointment');
  await page.waitForTimeout(1000);
  expect(await db().analyticsEvent.count({ where: { visitorId } })).toBe(2);
  await page.getByRole('button', { name: /Cookie settings/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reject all' }).click();
  await expect.poll(() => db().analyticsEvent.count({ where: { visitorId } })).toBe(0);
  await expect.poll(async () => (await ctx.cookies()).some((c) => c.name === 'dc_vid')).toBe(false);
  const ledger = await db().consentRecord.findMany({ where: { purpose: 'ANALYTICS_COOKIES' }, orderBy: { timestamp: 'desc' }, take: 1 });
  expect(ledger[0].status).toBe('WITHDRAWN');
  await ctx.close();
});

test('the server ignores analytics events without current consent', async ({ request, baseURL }) => {
  const visitorId = '11111111-2222-4333-8444-555555555555';
  const res = await request.post('/api/analytics', { data: { path: '/' }, headers: { Origin: baseURL, Cookie: `dc_vid=${visitorId}` } });
  expect(res.status()).toBe(204);
  expect(await db().analyticsEvent.count({ where: { visitorId } })).toBe(0);
});

test('child safeguards: guardian required, no optional choices, analytics stopped for the session', async ({ browser, baseURL }) => {
  const ctx = await newContext(browser);
  const noGuardian = await bookViaApi(ctx.request, baseURL, { isMinor: true });
  expect(noGuardian.status).toBe(400);
  expect(noGuardian.json.fields).toEqual(expect.arrayContaining(['guardianName', 'guardianRelationship', 'guardianDeclaration']));
  const page = await ctx.newPage();
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByRole('dialog').getByRole('button', { name: 'Accept all' }).click();
  await expect.poll(async () => (await ctx.cookies()).some((c) => c.name === 'dc_vid')).toBe(true);
  const visitorId = (await ctx.cookies()).find((c) => c.name === 'dc_vid').value;
  await page.goto('/book-appointment', { waitUntil: 'networkidle' });
  await page.check('#field-isMinor');
  await expect(page.locator('#field-guardianName')).toBeVisible();
  await expect(page.locator('form input[type="checkbox"][id^="field-consent"]')).toHaveCount(1);
  await expect.poll(() => db().analyticsEvent.count({ where: { visitorId } })).toBe(0); // erased
  await page.goto('/about', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  expect(await db().analyticsEvent.count({ where: { visitorId } })).toBe(0);
  await page.getByRole('button', { name: /Cookie settings/ }).click();
  await expect(page.getByRole('dialog').getByRole('switch', { name: /Analytics/ })).toBeDisabled();
  await ctx.close();
});

test('error handling: generic messages, no stack traces, correct status codes', async ({ request, baseURL }) => {
  const bad = await request.post('/api/appointments', { data: 'not json', headers: { Origin: baseURL, 'Content-Type': 'application/json' } });
  expect([400, 500]).toContain(bad.status());
  const text = await bad.text();
  expect(text).not.toMatch(/\bat \w+ \(|node_modules|prisma/i);
  expect((await request.get('/api/appointments')).status()).toBe(405);
});
