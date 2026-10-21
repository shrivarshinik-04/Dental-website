/**
 * REQUIREMENTS §7 / §15 rights-request handling: identity verification, review, correction,
 * withdrawal (and that processing stops), nomination, download, erasure (full and with
 * legally required records kept), grievance with a due date within one month.
 */
const { test, expect } = require('@playwright/test');
const { ADMIN, bookViaApi, consentCookie, db, newContext, testPhone, verifyViaApi, watchConsole } = require('./helpers');

test('rights portal end to end through the UI', async ({ browser, baseURL }) => {
  const ctx = await newContext(browser);
  await ctx.addCookies([consentCookie(baseURL)]);
  const phone = testPhone();
  const { referenceId } = await bookViaApi(ctx.request, baseURL, { name: 'Test Rights User', phone });
  const page = await ctx.newPage();
  const messages = watchConsole(page);
  await page.goto('/data-rights', { waitUntil: 'networkidle' });
  await page.fill('#verify-reference', referenceId);
  await page.fill('#verify-contact', phone);
  await page.getByRole('button', { name: 'Send one-time code' }).click();
  const demo = page.getByRole('note').filter({ hasText: 'Codes are not sent' });
  await expect(demo).toBeVisible();
  const code = (await demo.locator('strong').textContent()).trim();
  await page.fill('#verify-code', code);
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.getByRole('heading', { name: 'Your data' })).toBeVisible();
  await expect(page.getByText('Test Rights User')).toBeVisible();

  // Correct / complete
  await page.fill('#profile-email', 'rights.user@example.com');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Done' })).toContainText('R. Sample (Privacy Contact)');

  // Withdraw the appointment consent: one click, and processing stops (booking cancelled)
  const principal = await db().dataPrincipal.findUnique({ where: { referenceId } });
  await page.getByRole('button', { name: 'Withdraw' }).click();
  await expect(page.getByText('Withdrawn').first()).toBeVisible();
  const appts = await db().appointment.findMany({ where: { dataPrincipalId: principal.id } });
  expect(appts.every((a) => a.status === 'CANCELLED')).toBe(true);
  const last = await db().consentRecord.findFirst({ where: { dataPrincipalId: principal.id }, orderBy: { timestamp: 'desc' } });
  expect([last.status, last.channel]).toEqual(['WITHDRAWN', 'PREFERENCE_CENTRE']);

  // Nominate
  await page.fill('#nominee-name', 'Test Nominee');
  await page.fill('#nominee-relationship', 'Sibling');
  await page.fill('#nominee-contact', 'nominee@example.com');
  await page.getByRole('button', { name: 'Save nominee' }).click();
  await expect(page.getByText('Current nominee:')).toBeVisible();

  // Download
  const download = await ctx.request.get('/api/rights/download');
  expect(download.headers()['content-disposition']).toContain(referenceId);
  const json = await download.json();
  expect(json.referenceId).toBe(referenceId);
  expect(json.contact.name).toBe('R. Sample (Privacy Contact)');

  // Erase everything (no clinical record)
  await page.check('#erase-confirm');
  await page.getByRole('button', { name: 'Erase my data' }).click();
  await expect(page.getByText('All your personal data has been erased')).toBeVisible();
  const erased = await db().dataPrincipal.findUnique({ where: { referenceId } });
  expect([erased.name, erased.phone, erased.email]).toEqual([null, null, null]);
  expect(erased.erasedAt).not.toBeNull();
  expect(messages).toEqual([]);
  await ctx.close();
});

test('erasure keeps visits marked as part of the clinical record and explains why', async ({ browser, baseURL }) => {
  const ctx = await newContext(browser);
  const phone = testPhone();
  const { referenceId } = await bookViaApi(ctx.request, baseURL, { phone });
  const principal = await db().dataPrincipal.findUnique({ where: { referenceId }, include: { appointments: true } });
  const admin = await newContext(browser, { httpCredentials: ADMIN });
  const marked = await admin.request.post('/api/admin/appointments', {
    data: { id: principal.appointments[0].id, status: 'COMPLETED', legallyRequired: true },
    headers: { Origin: baseURL }
  });
  expect(marked.status()).toBe(200);
  expect(await verifyViaApi(ctx.request, baseURL, referenceId, phone)).toBe(200);
  const res = await ctx.request.post('/api/rights/erase', { data: { confirm: true, language: 'en' }, headers: { Origin: baseURL } });
  const body = await res.json();
  expect(body.result.fullyErased).toBe(false);
  expect(body.result.retained.legalBasis).toContain('SPDI Rules 2011, Rule 5(4)');
  expect(await db().appointment.count({ where: { dataPrincipalId: principal.id } })).toBe(1);
  await admin.close();
  await ctx.close();
});

test('one-time code request does not reveal whether the details match', async ({ browser, baseURL }) => {
  const ctx = await newContext(browser);
  const { referenceId } = await bookViaApi(ctx.request, baseURL);
  const res = await ctx.request.post('/api/rights/request-otp', { data: { referenceId, contact: '9000999999' }, headers: { Origin: baseURL } });
  expect(res.status()).toBe(200);
  expect(Object.keys(await res.json()).sort()).toEqual(['contact', 'ok']);
  await ctx.close();
});

test('grievance without a reference ID gets a reference and a due date within one month', async ({ browser, baseURL }) => {
  const ctx = await newContext(browser);
  await ctx.addCookies([consentCookie(baseURL)]);
  const page = await ctx.newPage();
  await page.goto('/grievance', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: "I don't have a reference ID" }).click();
  await page.fill('#g-name', 'Test Complainant');
  await page.fill('#g-contact', 'complainant@example.com');
  await page.selectOption('#g-category', 'OTHER');
  await page.fill('#g-description', 'Synthetic test grievance.');
  await page.getByRole('button', { name: 'Submit grievance' }).click();
  const ref = (await page.locator('.alert-success strong').first().textContent()).trim();
  expect(ref).toMatch(/^GRV-/);
  await expect(page.getByText('We will reply by')).toBeVisible();
  const g = await db().grievance.findUnique({ where: { referenceNumber: ref } });
  const oneMonth = new Date(g.createdAt);
  oneMonth.setMonth(oneMonth.getMonth() + 1);
  expect(g.dueDate.getTime()).toBeLessThanOrEqual(oneMonth.getTime());
  expect(g.contactDetail).toMatch(/^v1:/);
  await ctx.close();
});
