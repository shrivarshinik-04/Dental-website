/**
 * Parent or guardian details for a patient under 18: the inline form section (announced,
 * focus moved, keyboard, 375px), client and server validation, adults never store guardian
 * data, encryption at rest, no analytics, consent given by the guardian against the current
 * notice, and the rights portal / admin (OTP to the guardian, correction, erasure, audit of views).
 * Synthetic data only.
 */
const { test, expect } = require('@playwright/test');
const { ADMIN, NOTICE_VERSION, bookViaApi, consentCookie, db, futureDate, newContext, testPhone, verifyViaApi, watchConsole } = require('./helpers');

const guardian = (overrides = {}) => ({
  isMinor: true,
  name: 'Test Child Patient',
  phone: '',
  email: '',
  guardianName: 'Test Guardian',
  guardianRelationship: 'PARENT',
  guardianPhone: testPhone(),
  guardianEmail: 'test.guardian@example.com',
  guardianDeclaration: true,
  ...overrides
});

const GUARDIAN_IDS = ['#field-guardianName', '#field-guardianRelationship', '#field-guardianPhone', '#field-guardianEmail', '#field-guardianDeclaration'];

/** Selects a radio with the keyboard (focus + Space), as a keyboard user would. */
const pressRadio = async (page, selector) => {
  await page.focus(selector);
  await page.keyboard.press('Space');
  await expect(page.locator(selector)).toBeChecked();
};

const appointmentFor = async (referenceId) =>
  db().appointment.findFirst({ where: { dataPrincipal: { referenceId } }, orderBy: { createdAt: 'desc' }, include: { guardian: true } });

test('section is hidden by default, appears for a minor (announced, focus moved) and is cleared when switched back to adult', async ({ browser, baseURL }) => {
  const ctx = await newContext(browser);
  await ctx.addCookies([consentCookie(baseURL)]);
  const page = await ctx.newPage();
  const messages = watchConsole(page);
  await page.goto('/book-appointment', { waitUntil: 'networkidle' });
  for (const id of GUARDIAN_IDS) await expect(page.locator(id)).toHaveCount(0);
  // Before an answer is chosen, the form says that "Yes" asks for the guardian's details.
  await expect(page.locator('#hint-isMinor')).toHaveText("If you choose Yes, we will ask for the parent or guardian's details instead of the patient's contact details.");
  await expect(page.locator('fieldset:has(#field-isMinor)')).toHaveAttribute('aria-describedby', /hint-isMinor/);
  await expect(page.locator('#guardian-live')).toHaveAttribute('aria-live', 'polite');
  await expect(page.locator('#guardian-live')).toHaveText('');

  await pressRadio(page, '#field-isMinor');
  for (const id of GUARDIAN_IDS) await expect(page.locator(id)).toBeVisible();
  await expect(page.locator('#guardian-live')).toHaveText('Parent or guardian details are now needed below.');
  await expect(page.locator('#field-guardianName')).toBeFocused();
  await expect(page.locator('#field-guardianDeclaration')).not.toBeChecked();
  await expect(page.locator('#field-phone')).toHaveCount(0); // the patient's own contact is not asked for
  await expect(page.locator('label[for="field-consentAppointment"]')).toContainText("As the patient's parent or legal guardian");

  await page.keyboard.type('Test Guardian');
  await page.fill('#field-guardianPhone', '9000000001');
  await page.check('#field-guardianDeclaration');
  await pressRadio(page, '#field-isMinor-no');
  for (const id of GUARDIAN_IDS) await expect(page.locator(id)).toHaveCount(0);
  await expect(page.locator('#field-phone')).toBeVisible();
  await expect(page.locator('#guardian-live')).toHaveText('');

  await pressRadio(page, '#field-isMinor');
  await expect(page.locator('#field-guardianName')).toHaveValue('');
  await expect(page.locator('#field-guardianPhone')).toHaveValue('');
  await expect(page.locator('#field-guardianDeclaration')).not.toBeChecked();
  expect(messages).toEqual([]);
  await ctx.close();
});

test('client validation blocks a minor booking with missing guardian details and focuses the first problem', async ({ browser, baseURL }) => {
  const ctx = await newContext(browser);
  await ctx.addCookies([consentCookie(baseURL)]);
  const page = await ctx.newPage();
  let posts = 0;
  page.on('request', (r) => r.url().includes('/api/appointments') && r.method() === 'POST' && (posts += 1));
  await page.goto('/book-appointment', { waitUntil: 'networkidle' });
  await pressRadio(page, '#field-isMinor');
  await page.fill('#field-name', 'Test Child Patient');
  await page.fill('#field-guardianName', 'Test Guardian');
  await page.selectOption('#field-guardianRelationship', 'LEGAL_GUARDIAN');
  await page.fill('#field-guardianPhone', '12345'); // invalid
  await page.selectOption('#field-service', 'Orthodontics');
  await page.fill('#field-preferredDate', futureDate(4));
  await page.selectOption('#field-preferredSlot', 'MORNING');
  await page.check('#field-consentAppointment');
  await page.getByRole('button', { name: 'Request appointment' }).click();
  expect(posts).toBe(0);
  await expect(page.locator('#field-guardianPhone')).toBeFocused();
  await expect(page.locator('#field-guardianPhone')).toHaveAttribute('aria-describedby', /error-guardianPhone/);
  await expect(page.locator('#error-guardianPhone')).toBeVisible();
  await expect(page.locator('#error-guardianDeclaration')).toBeVisible();
  await ctx.close();
});

test('keyboard-only minor booking at 375px: no overflow, labelled fields, consent given by the guardian with the current notice, encrypted at rest, no analytics', async ({ browser, baseURL }) => {
  const ctx = await newContext(browser, { viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  const messages = watchConsole(page);
  const analyticsPosts = [];
  let erasedAnalytics = false;
  page.on('request', (r) => {
    if (!r.url().includes('/api/analytics')) return;
    if (r.method() === 'POST') analyticsPosts.push(r.url());
    if (r.method() === 'DELETE') erasedAnalytics = true;
  });

  // Analytics allowed by the visitor beforehand, and running on an ordinary page.
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByRole('dialog').getByRole('button', { name: 'Accept all' }).click();
  await expect.poll(() => analyticsPosts.length).toBeGreaterThan(0);

  await page.goto('/book-appointment', { waitUntil: 'networkidle' });
  const before = analyticsPosts.length;
  await pressRadio(page, '#field-isMinor');
  const g = guardian({ guardianRelationship: 'LEGAL_GUARDIAN' });
  // From the guardian's name, Tab moves through the section in order.
  await expect(page.locator('#field-guardianName')).toBeFocused();
  await page.keyboard.type(g.guardianName);
  await page.keyboard.press('Tab');
  await expect(page.locator('#field-guardianRelationship')).toBeFocused();
  await page.selectOption('#field-guardianRelationship', g.guardianRelationship);
  await page.keyboard.press('Tab');
  await expect(page.locator('#field-guardianPhone')).toBeFocused();
  await page.keyboard.type(g.guardianPhone);
  await page.keyboard.press('Tab');
  await expect(page.locator('#field-guardianEmail')).toBeFocused();
  await page.keyboard.type(g.guardianEmail);
  await page.keyboard.press('Tab');
  await expect(page.locator('#field-guardianDeclaration')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('#field-guardianDeclaration')).toBeChecked();

  // Every guardian field has an accessible name; nothing is wider than the screen.
  for (const label of [/Guardian's full name/, /Relationship to the patient/, /Guardian's mobile number/, /Guardian's email/, /I am 18 or older/]) {
    await expect(page.getByLabel(label)).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.fill('#field-name', g.name);
  await page.selectOption('#field-service', 'Orthodontics');
  await page.fill('#field-preferredDate', futureDate(6));
  await page.selectOption('#field-preferredSlot', 'EVENING');
  await page.focus('#field-consentAppointment');
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Request appointment' }).focus();
  await page.keyboard.press('Enter');
  const ref = (await page.locator('.alert-success strong').first().textContent()).trim();
  expect(ref).toMatch(/^DP-[A-Z0-9]{6}$/);

  // Stored encrypted; the patient's own contact is not stored.
  const principal = await db().dataPrincipal.findUnique({ where: { referenceId: ref } });
  expect([principal.phone, principal.email]).toEqual([null, null]);
  const appt = await appointmentFor(ref);
  expect(appt.patientIsMinor).toBe(true);
  // Guardian details are in their own table, linked to the booking and the patient; none on the booking itself.
  expect(Object.keys(appt).filter((k) => k.startsWith('guardian') && k !== 'guardian')).toEqual([]);
  expect([appt.guardian.appointmentId, appt.guardian.dataPrincipalId]).toEqual([appt.id, principal.id]);
  for (const [column, field] of [['name', 'guardianName'], ['relationship', 'guardianRelationship'], ['phone', 'guardianPhone'], ['email', 'guardianEmail']]) {
    expect(appt.guardian[column], column).toMatch(/^v1:/);
    expect(appt.guardian[column]).not.toContain(g[field]);
  }

  // Consent given by the guardian, linked to the booking, against the current notice.
  const consents = await db().consentRecord.findMany({ where: { dataPrincipalId: principal.id }, include: { noticeVersion: true } });
  expect(consents).toHaveLength(1);
  expect([consents[0].purpose, consents[0].status, consents[0].givenByGuardian, consents[0].appointmentId]).toEqual(['APPOINTMENT', 'GIVEN', true, appt.id]);
  expect(consents[0].noticeVersion.version).toBe(NOTICE_VERSION);

  // No analytics during or after a booking for a child in this session; earlier data erased.
  await page.goto('/about', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  expect(analyticsPosts.length).toBe(before);
  expect(erasedAnalytics).toBe(true);
  expect(messages).toEqual([]);
  await ctx.close();
});

test('server: field-level 400s for a minor without guardian details; an adult\'s crafted guardian fields are discarded', async ({ browser, baseURL }) => {
  const ctx = await newContext(browser);
  const missing = await bookViaApi(ctx.request, baseURL, guardian({ guardianPhone: '', guardianDeclaration: false }));
  expect(missing.status).toBe(400);
  expect(missing.json.fields).toEqual(expect.arrayContaining(['guardianPhone', 'guardianDeclaration']));
  expect(missing.json.fields).not.toContain('guardianName');
  const badRelationship = await bookViaApi(ctx.request, baseURL, guardian({ guardianRelationship: 'NEIGHBOUR', guardianEmail: 'not-an-email' }));
  expect(badRelationship.status).toBe(400);
  expect(badRelationship.json.fields).toEqual(expect.arrayContaining(['guardianRelationship', 'guardianEmail']));

  const adult = await bookViaApi(ctx.request, baseURL, {
    name: 'Test Adult Patient',
    guardianName: 'Test Crafted Guardian',
    guardianRelationship: 'PARENT',
    guardianPhone: testPhone(),
    guardianEmail: 'crafted@example.com',
    guardianDeclaration: true
  });
  expect(adult.status).toBe(201);
  const appt = await appointmentFor(adult.referenceId);
  expect(appt.patientIsMinor).toBe(false);
  expect(appt.guardian).toBeNull(); // no guardian record for an adult
  expect(await db().guardian.count({ where: { dataPrincipalId: appt.dataPrincipalId } })).toBe(0);
  const consent = await db().consentRecord.findFirst({ where: { dataPrincipal: { referenceId: adult.referenceId } } });
  expect([consent.givenByGuardian, consent.appointmentId]).toEqual([false, null]);
  await ctx.close();
});

test('rights portal: one-time code to the guardian, details shown, corrected and erased; admin views are audited', async ({ browser, baseURL }) => {
  const ctx = await newContext(browser);
  await ctx.addCookies([consentCookie(baseURL)]);
  const g = guardian();
  const booked = await bookViaApi(ctx.request, baseURL, g);
  expect(booked.status).toBe(201);
  const appt = await appointmentFor(booked.referenceId);

  // Staff viewing the booking list is logged as a view of the guardian's details.
  const admin = await newContext(browser, { httpCredentials: ADMIN });
  expect((await admin.request.get('/admin/appointments')).status()).toBe(200);
  const viewed = await db().auditLog.findFirst({ where: { entity: 'Guardian', entityId: appt.guardian.id, action: 'READ' } });
  expect(viewed.actor).toBe(`admin:${ADMIN.username}`);
  await admin.close();

  // The code goes to the guardian's contact; an unrelated number gets nothing.
  expect(await verifyViaApi(ctx.request, baseURL, booked.referenceId, testPhone())).not.toBe(200);
  const page = await ctx.newPage();
  await page.goto('/data-rights', { waitUntil: 'networkidle' });
  await expect(page.locator('#verify-contact-hint')).toContainText("parent or guardian's mobile number or email");
  await page.fill('#verify-reference', booked.referenceId);
  await page.fill('#verify-contact', g.guardianEmail);
  await page.getByRole('button', { name: 'Send one-time code' }).click();
  const demo = page.getByRole('note').filter({ hasText: 'Codes are not sent' });
  const code = (await demo.locator('strong').textContent()).trim();
  await page.fill('#verify-code', code);
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.getByRole('heading', { name: 'Your data', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: new RegExp(`Test Guardian \\(Parent\\), ${g.guardianPhone}, ${g.guardianEmail}`) })).toBeVisible();

  // The patient's own phone and email are not kept for a patient under 18, so they cannot be added here.
  await expect(page.locator('#profile-phone')).toHaveCount(0);
  await expect(page.locator('#profile-email')).toHaveCount(0);
  const own = await ctx.request.post('/api/rights/correct', { data: { type: 'COMPLETION', phone: testPhone() }, headers: { Origin: baseURL } });
  expect(own.status()).toBe(400);
  expect((await db().dataPrincipal.findUnique({ where: { id: appt.dataPrincipalId } })).phone).toBeNull();

  // Correct the guardian's mobile; the new number then works for sign-in.
  const newPhone = testPhone();
  await expect(page.locator('#profile-guardianPhone')).toHaveValue(g.guardianPhone);
  await page.fill('#profile-guardianPhone', newPhone);
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Done' })).toBeVisible();
  const corrected = await appointmentFor(booked.referenceId);
  expect(corrected.guardian.phone).toMatch(/^v1:/);
  expect(corrected.guardian.phone).not.toBe(appt.guardian.phone);
  const request = await db().rightsRequest.findFirst({ where: { dataPrincipalId: appt.dataPrincipalId, type: 'CORRECTION' } });
  expect(request).not.toBeNull();
  const other = await newContext(browser);
  expect(await verifyViaApi(other.request, baseURL, booked.referenceId, newPhone)).toBe(200);
  await other.close();

  // Erasure removes the booking and with it the guardian's details.
  const erased = await ctx.request.post('/api/rights/erase', { data: { confirm: true, language: 'en' }, headers: { Origin: baseURL } });
  expect(erased.status()).toBe(200);
  expect(await db().appointment.count({ where: { id: appt.id } })).toBe(0);
  expect(await db().guardian.count({ where: { id: appt.guardian.id } })).toBe(0); // deleted with the booking
  const consent = await db().consentRecord.findFirst({ where: { dataPrincipalId: appt.dataPrincipalId } });
  expect(consent.appointmentId).toBeNull(); // proof of consent kept, link to the deleted booking cleared
  const again = await newContext(browser);
  expect(await verifyViaApi(again.request, baseURL, booked.referenceId, newPhone)).not.toBe(200);
  await again.close();
  await ctx.close();
});
