/**
 * Form-validation regression tests: every form on the site and the API behind it.
 * For each form: required fields, invalid input, consent handling, a successful submission
 * whose stored values are read back from the database (decrypted) and compared field by
 * field, and the expected error responses (400 / 401 / 403 / 405 / 409).
 *
 * Runs only against the suite's synthetic database (prisma/test.db, rebuilt by
 * tests/e2e/prepare-db.js on every run) with throwaway keys; never prisma/dev.db.
 * Synthetic data only: names "Test ...", example.com emails, 9000xxxxxx numbers.
 */
const path = require('path');
const { test, expect } = require('@playwright/test');
const config = require('../../playwright.config');
const {
  ADMIN,
  DESK,
  NOTICE_VERSION,
  apiClient,
  bookViaApi,
  bookingBody,
  consentCookie,
  db,
  decrypt,
  futureDate,
  newContext,
  testPhone,
  verifyViaApi
} = require('./helpers');

const { TEST_DB } = config;

/** One request from its own client (own IP, so per-client rate limits never interfere). */
const send = async (playwright, baseURL, method, url, data, options = {}) => {
  const client = await apiClient(playwright, baseURL, options);
  const res = await client.fetch(url, { method, ...(data !== undefined && { data }) });
  const text = await res.text();
  await client.dispose();
  let json = {};
  try {
    json = JSON.parse(text);
  } catch {
    json = {};
  }
  return { status: res.status(), json, text };
};
const post = (playwright, baseURL, url, data, options) => send(playwright, baseURL, 'POST', url, data, options);

const counts = async () => ({
  principals: await db().dataPrincipal.count(),
  appointments: await db().appointment.count(),
  consents: await db().consentRecord.count(),
  grievances: await db().grievance.count(),
  requests: await db().rightsRequest.count(),
  breaches: await db().breachIncident.count(),
  otps: await db().otpChallenge.count()
});

const istMidnight = (yyyyMmDd) => new Date(`${yyyyMmDd}T00:00:00+05:30`).getTime();
const formatted = (phone) => `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
const principalOf = (referenceId) => db().dataPrincipal.findUnique({ where: { referenceId } });

/** Books an adult appointment and signs in to the rights page; the returned client holds the session. */
const signedIn = async (playwright, baseURL, overrides = {}) => {
  const client = await apiClient(playwright, baseURL);
  const phone = testPhone();
  const booked = await bookViaApi(client, baseURL, { phone, ...overrides });
  expect(booked.status).toBe(201);
  expect(await verifyViaApi(client, baseURL, booked.referenceId, phone)).toBe(200);
  const principal = await principalOf(booked.referenceId);
  return { client, phone, referenceId: booked.referenceId, principal };
};

// ---------------------------------------------------------------------------------------
// Isolation
// ---------------------------------------------------------------------------------------

test('isolation: the test server and the test database client use prisma/test.db, never dev.db', async ({ playwright, baseURL }) => {
  const serverUrl = config.webServer.env.DATABASE_URL;
  expect(serverUrl).toBe(`file:${TEST_DB}`);
  expect(path.basename(TEST_DB)).toBe('test.db');
  expect(serverUrl).not.toMatch(/dev\.db/);
  // A booking made through the server is found by the test client in test.db.
  const name = `Test Isolation Canary ${Date.now()}`;
  const client = await apiClient(playwright, baseURL);
  const booked = await bookViaApi(client, baseURL, { name });
  await client.dispose();
  expect(booked.status).toBe(201);
  expect(decrypt((await principalOf(booked.referenceId)).name)).toBe(name);
});

// ---------------------------------------------------------------------------------------
// Appointment booking: /book-appointment → POST /api/appointments
// ---------------------------------------------------------------------------------------

test.describe('booking form', () => {
  test('UI: each required field shows its message and nothing is sent until the form is valid', async ({ browser, baseURL }) => {
    const ctx = await newContext(browser);
    await ctx.addCookies([consentCookie(baseURL)]);
    const page = await ctx.newPage();
    let posts = 0;
    page.on('request', (r) => r.url().includes('/api/appointments') && r.method() === 'POST' && (posts += 1));
    await page.goto('/book-appointment', { waitUntil: 'networkidle' });
    const submit = () => page.getByRole('button', { name: 'Request appointment' }).click();

    await submit();
    const required = {
      isMinor: 'Please tell us whether the patient is under 18.',
      name: "Please enter the patient's name.",
      phone: 'Please enter a valid 10-digit mobile number.',
      service: 'Please choose a service.',
      preferredDate: 'Please choose a date from today onwards.',
      preferredSlot: 'Please choose a time.',
      consentAppointment: 'We need your consent to book the appointment.'
    };
    for (const [field, message] of Object.entries(required)) await expect(page.locator(`#error-${field}`), field).toHaveText(message);
    await expect(page.locator('#error-email')).toHaveCount(0); // optional
    expect(posts).toBe(0);

    // Invalid values.
    await page.check('#field-isMinor-no');
    await page.fill('#field-name', 'Test Booking Ui');
    await page.fill('#field-phone', '12345');
    await page.fill('#field-email', 'not-an-email');
    await page.selectOption('#field-service', 'Orthodontics');
    await page.fill('#field-preferredDate', '2020-01-01');
    await page.selectOption('#field-preferredSlot', 'MORNING');
    await submit();
    for (const field of ['phone', 'email', 'preferredDate', 'consentAppointment']) await expect(page.locator(`#error-${field}`), field).toBeVisible();
    for (const field of ['isMinor', 'name', 'service', 'preferredSlot']) await expect(page.locator(`#error-${field}`), field).toHaveCount(0);
    await expect(page.locator('#field-phone')).toBeFocused();
    expect(posts).toBe(0);

    // Valid.
    const phone = testPhone();
    await page.fill('#field-phone', phone);
    await page.fill('#field-email', 'test.booking.ui@example.com');
    await page.fill('#field-preferredDate', futureDate(7));
    await expect(page.locator('#field-consentAppointment')).not.toBeChecked();
    await page.check('#field-consentAppointment');
    await submit();
    const ref = (await page.locator('.alert-success strong').first().textContent()).trim();
    expect(posts).toBe(1);
    const principal = await principalOf(ref);
    expect([decrypt(principal.name), decrypt(principal.phone), decrypt(principal.email)]).toEqual(['Test Booking Ui', phone, 'test.booking.ui@example.com']);
    await ctx.close();
  });

  test('API: a valid adult booking is stored exactly as entered (normalised, encrypted) with its consent record', async ({ playwright, baseURL }) => {
    const phone = testPhone();
    const date = futureDate(10);
    const body = bookingBody({
      name: '  Test Adult Stored  ',
      phone: formatted(phone),
      email: ' Test.Adult.Stored@Example.COM ',
      service: 'Orthodontics',
      preferredDate: date,
      preferredSlot: 'EVENING',
      reason: 'Synthetic reason\nsecond line',
      language: 'hi'
    });
    const res = await post(playwright, baseURL, '/api/appointments', body);
    expect(res.status).toBe(201);
    expect(Object.keys(res.json).sort()).toEqual(['referenceId', 'reused']);
    expect(res.json.referenceId).toMatch(/^DP-[A-Z0-9]{6}$/);
    expect(res.json.reused).toBe(false);

    const principal = await db().dataPrincipal.findUnique({
      where: { referenceId: res.json.referenceId },
      include: { appointments: true, consents: { include: { noticeVersion: true } } }
    });
    for (const field of ['name', 'phone', 'email']) expect(principal[field], field).toMatch(/^v1:/);
    expect(decrypt(principal.name)).toBe('Test Adult Stored'); // trimmed
    expect(decrypt(principal.phone)).toBe(phone); // +91 and spaces removed
    expect(decrypt(principal.email)).toBe('test.adult.stored@example.com'); // trimmed, lower case
    expect(principal.erasedAt).toBeNull();

    expect(principal.appointments).toHaveLength(1);
    const appt = principal.appointments[0];
    expect(appt.preferredDate.getTime()).toBe(istMidnight(date));
    expect(appt.preferredSlot).toBe('EVENING');
    expect(decrypt(appt.service)).toBe('Orthodontics');
    expect(decrypt(appt.notes)).toBe('Synthetic reason\nsecond line'); // newline kept
    expect([appt.status, appt.patientIsMinor, appt.legallyRequired]).toEqual(['REQUESTED', false, false]);
    expect([appt.guardianName, appt.guardianRelationship, appt.guardianPhone, appt.guardianEmail]).toEqual([null, null, null, null]);

    expect(principal.consents).toHaveLength(1);
    const consent = principal.consents[0];
    expect(consent).toMatchObject({
      purpose: 'APPOINTMENT',
      status: 'GIVEN',
      channel: 'APPOINTMENT_FORM',
      language: 'hi',
      givenByGuardian: false,
      appointmentId: null
    });
    expect(consent.noticeVersion.version).toBe(NOTICE_VERSION);
    expect(consent.ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(consent.userAgent).toBeTruthy();

    const audit = await db().auditLog.findMany({ where: { entityId: { in: [principal.id, appt.id] }, action: 'CREATE' } });
    expect(audit.map((a) => a.entity).sort()).toEqual(['Appointment', 'ConsentRecord', 'DataPrincipal']);
  });

  test('API: optional fields left empty are stored as empty; control characters are removed; Hindi text is kept', async ({ playwright, baseURL }) => {
    const res = await post(playwright, baseURL, '/api/appointments', bookingBody({ name: 'टेस्ट\u0007मरीज़', email: '', reason: '' }));
    expect(res.status).toBe(201);
    const principal = await db().dataPrincipal.findUnique({ where: { referenceId: res.json.referenceId }, include: { appointments: true } });
    expect(decrypt(principal.name)).toBe('टेस्ट मरीज़');
    expect(principal.email).toBeNull();
    expect(principal.appointments[0].notes).toBeNull();
  });

  test('API: a booking for a patient under 18 stores the guardian details and not the patient\'s own contact', async ({ playwright, baseURL }) => {
    const guardianPhone = testPhone();
    const res = await post(
      playwright,
      baseURL,
      '/api/appointments',
      bookingBody({
        name: 'Test Minor Stored',
        phone: testPhone(), // crafted: must be discarded for a minor
        email: 'test.minor.own@example.com', // crafted: must be discarded
        isMinor: true,
        guardianName: ' Test Guardian Stored ',
        guardianRelationship: 'LEGAL_GUARDIAN',
        guardianPhone: formatted(guardianPhone),
        guardianEmail: 'Test.Guardian.Stored@Example.com',
        guardianDeclaration: true
      })
    );
    expect(res.status).toBe(201);
    const principal = await db().dataPrincipal.findUnique({ where: { referenceId: res.json.referenceId }, include: { appointments: true, consents: true } });
    expect(decrypt(principal.name)).toBe('Test Minor Stored');
    expect([principal.phone, principal.email]).toEqual([null, null]);
    const appt = principal.appointments[0];
    expect(appt.patientIsMinor).toBe(true);
    expect([decrypt(appt.guardianName), decrypt(appt.guardianRelationship), decrypt(appt.guardianPhone), decrypt(appt.guardianEmail)]).toEqual([
      'Test Guardian Stored',
      'LEGAL_GUARDIAN',
      guardianPhone,
      'test.guardian.stored@example.com'
    ]);
    expect(principal.consents).toHaveLength(1);
    expect(principal.consents[0]).toMatchObject({ purpose: 'APPOINTMENT', status: 'GIVEN', givenByGuardian: true, appointmentId: appt.id });
  });

  const REJECTED = [
    ['name missing', { name: undefined }, 400, ['name']],
    ['name only spaces', { name: '   ' }, 400, ['name']],
    ['name over 100 characters', { name: 'T'.repeat(101) }, 400, ['name']],
    ['adult without a mobile number', { phone: '' }, 400, ['phone']],
    ['mobile too short', { phone: '98765' }, 400, ['phone']],
    ['mobile not starting 6-9', { phone: '5123456789' }, 400, ['phone']],
    ['mobile with letters', { phone: '98765abcde' }, 400, ['phone']],
    ['invalid email', { email: 'not-an-email' }, 400, ['email']],
    ['service missing', { service: undefined }, 400, ['service']],
    ['service not offered', { service: 'Test Unknown Service' }, 400, ['service']],
    ['date missing', { preferredDate: undefined }, 400, ['preferredDate']],
    ['date in another format', { preferredDate: '21/10/2030' }, 400, ['preferredDate']],
    ['date in the past', { preferredDate: '2020-01-01' }, 400, ['preferredDate']],
    ['date more than 180 days ahead', { preferredDate: futureDate(200) }, 400, ['preferredDate']],
    ['time missing', { preferredSlot: undefined }, 400, ['preferredSlot']],
    ['time not offered', { preferredSlot: 'NIGHT' }, 400, ['preferredSlot']],
    ['reason over 300 characters', { reason: 'r'.repeat(301) }, 400, ['reason']],
    ['age question unanswered', { isMinor: undefined }, 400, ['isMinor']],
    ['age answer not true/false', { isMinor: 'no' }, 400, ['isMinor']],
    ['appointment consent not ticked', { consents: { APPOINTMENT: false } }, 400, ['consents']],
    ['consent missing', { consents: undefined }, 400, ['consents']],
    ['an extra consent that is not offered', { consents: { APPOINTMENT: true, MARKETING: true } }, 400, []],
    ['a field that is not on the form', { dateOfBirth: '2010-01-01' }, 400, []],
    ['minor without guardian details', { isMinor: true }, 400, ['guardianName', 'guardianRelationship', 'guardianPhone', 'guardianDeclaration']],
    ['minor with guardian details but no declaration', { isMinor: true, guardianName: 'Test Guardian', guardianRelationship: 'PARENT', guardianPhone: '9000000001' }, 400, ['guardianDeclaration']],
    ['unsupported language', { language: 'fr' }, 400, ['language']],
    ['old notice version', { noticeVersion: '2020-01-01.1' }, 409, null]
  ];

  test('API: invalid or incomplete bookings are rejected with field-level errors and store nothing', async ({ playwright, baseURL }) => {
    const before = await counts();
    for (const [label, overrides, status, fields] of REJECTED) {
      const body = bookingBody({ name: 'Test Rejected Booking', ...overrides });
      const res = await post(playwright, baseURL, '/api/appointments', body);
      expect(res.status, label).toBe(status);
      expect(res.json.error, label).toBeTruthy();
      if (fields?.length) expect(res.json.fields, label).toEqual(expect.arrayContaining(fields));
      expect(res.text, `${label}: response must not echo input`).not.toContain('Test Rejected Booking');
    }
    expect(await counts()).toEqual(before);
  });

  test('API: wrong method, cross-site and malformed requests are refused', async ({ playwright, baseURL }) => {
    const before = await counts();
    expect((await send(playwright, baseURL, 'GET', '/api/appointments')).status).toBe(405);
    const crossSite = await post(playwright, baseURL, '/api/appointments', bookingBody(), { extraHTTPHeaders: { Origin: 'https://attacker.example.com' } });
    expect(crossSite.status).toBe(403);
    const malformed = await post(playwright, baseURL, '/api/appointments', '{not json', { extraHTTPHeaders: { 'Content-Type': 'application/json' } });
    expect(malformed.status).toBeGreaterThanOrEqual(400);
    expect(malformed.text).not.toMatch(/\bat \w+ \(|node_modules|prisma/i);
    expect(await counts()).toEqual(before);
  });
});

// ---------------------------------------------------------------------------------------
// Cookie banner: POST /api/consent
// ---------------------------------------------------------------------------------------

test.describe('cookie banner', () => {
  test('UI: "Reject all" records a refusal for each optional category against the browser\'s ID', async ({ browser }) => {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.getByRole('dialog').getByRole('button', { name: 'Reject all' }).click();
    await expect.poll(async () => (await ctx.cookies()).some((c) => c.name === 'dpdp_aid')).toBe(true);
    const anonymousId = (await ctx.cookies()).find((c) => c.name === 'dpdp_aid').value;
    const rows = await db().consentRecord.findMany({ where: { anonymousId }, include: { noticeVersion: true } });
    expect(rows.map((r) => [r.purpose, r.status, r.channel]).sort()).toEqual([
      ['ANALYTICS_COOKIES', 'DENIED', 'COOKIE_BANNER'],
      ['FUNCTIONAL_COOKIES', 'DENIED', 'COOKIE_BANNER']
    ]);
    expect(rows.every((r) => r.noticeVersion.version === NOTICE_VERSION && r.dataPrincipalId === null)).toBe(true);
    await ctx.close();
  });

  test('API: choices are stored per category; switching one off later is recorded as a withdrawal', async ({ playwright, baseURL }) => {
    const client = await apiClient(playwright, baseURL);
    const first = await client.post('/api/consent', { data: { choices: { functional: true, analytics: false }, language: 'en', noticeVersion: NOTICE_VERSION } });
    expect(first.status()).toBe(200);
    const json = await first.json();
    expect(json).toMatchObject({ version: NOTICE_VERSION, choices: { functional: true, analytics: false } });
    const cookies = (await client.storageState()).cookies;
    const anonymousId = cookies.find((c) => c.name === 'dpdp_aid').value;
    expect(anonymousId).toMatch(/^[0-9a-f-]{36}$/);
    expect(cookies.find((c) => c.name === 'dpdp_aid').httpOnly).toBe(true);
    const stored = JSON.parse(decodeURIComponent(cookies.find((c) => c.name === 'dpdp_consent').value));
    expect(stored).toMatchObject({ v: NOTICE_VERSION, c: { functional: true, analytics: false } });

    const statuses = async () =>
      Object.fromEntries(
        (await db().consentRecord.findMany({ where: { anonymousId }, orderBy: { timestamp: 'asc' } })).map((r) => [r.purpose, r.status])
      );
    expect(await statuses()).toEqual({ FUNCTIONAL_COOKIES: 'GIVEN', ANALYTICS_COOKIES: 'DENIED' });

    const second = await client.post('/api/consent', { data: { choices: { functional: false, analytics: false }, language: 'hi', noticeVersion: NOTICE_VERSION } });
    expect(second.status()).toBe(200);
    expect(await statuses()).toEqual({ FUNCTIONAL_COOKIES: 'WITHDRAWN', ANALYTICS_COOKIES: 'DENIED' }); // latest per purpose
    expect(await db().consentRecord.count({ where: { anonymousId } })).toBe(4); // ledger appended, never updated
    expect(await db().consentRecord.count({ where: { anonymousId, language: 'hi' } })).toBe(2);
    await client.dispose();
  });

  test('API: invalid choices are rejected and store nothing', async ({ playwright, baseURL }) => {
    const valid = { choices: { functional: false, analytics: false }, language: 'en', noticeVersion: NOTICE_VERSION };
    const before = await counts();
    const cases = [
      ['choices missing', { ...valid, choices: undefined }, 400],
      ['a choice that is not true/false', { ...valid, choices: { functional: 'yes', analytics: false } }, 400],
      ['a category that does not exist', { ...valid, choices: { functional: false, analytics: false, marketing: true } }, 400],
      ['a category missing', { ...valid, choices: { functional: true } }, 400],
      ['unsupported language', { ...valid, language: 'fr' }, 400],
      ['notice version missing', { ...valid, noticeVersion: undefined }, 400],
      ['extra field', { ...valid, visitorId: 'x' }, 400],
      ['old notice version', { ...valid, noticeVersion: '2020-01-01.1' }, 409]
    ];
    for (const [label, body, status] of cases) expect((await post(playwright, baseURL, '/api/consent', body)).status, label).toBe(status);
    expect((await post(playwright, baseURL, '/api/consent', valid, { extraHTTPHeaders: { Origin: 'https://attacker.example.com' } })).status).toBe(403);
    expect((await send(playwright, baseURL, 'GET', '/api/consent')).status).toBe(405);
    expect(await counts()).toEqual(before);
  });
});

// ---------------------------------------------------------------------------------------
// Data Rights: sign-in (one-time code) and the dashboard forms
// ---------------------------------------------------------------------------------------

test.describe('data rights forms', () => {
  test('sign-in: request and verify a one-time code; bad input is rejected; the code is stored only as a hash', async ({ playwright, baseURL }) => {
    const phone = testPhone();
    const booker = await apiClient(playwright, baseURL);
    const { referenceId } = await bookViaApi(booker, baseURL, { name: 'Test Otp User', phone });
    await booker.dispose();
    const principal = await principalOf(referenceId);
    const challenges = () => db().otpChallenge.findMany({ where: { dataPrincipalId: principal.id }, orderBy: { createdAt: 'asc' } });

    const rejected = [
      ['reference ID in the wrong format', { referenceId: 'XYZ', contact: phone }],
      ['contact neither phone nor email', { referenceId, contact: 'abc' }],
      ['both missing', {}],
      ['extra field', { referenceId, contact: phone, name: 'Test' }]
    ];
    for (const [label, body] of rejected) {
      const res = await post(playwright, baseURL, '/api/rights/request-otp', body);
      expect(res.status, label).toBe(400);
      expect(res.json.demo, label).toBeUndefined();
    }
    expect((await post(playwright, baseURL, '/api/rights/request-otp', { referenceId, contact: phone }, { extraHTTPHeaders: { Origin: 'https://attacker.example.com' } })).status).toBe(403);

    // Well-formed but not matching: same answer, no code, nothing stored.
    const wrong = await post(playwright, baseURL, '/api/rights/request-otp', { referenceId, contact: testPhone() });
    expect(wrong.status).toBe(200);
    expect(wrong.json.demo).toBeUndefined();
    expect(await challenges()).toHaveLength(0);

    const client = await apiClient(playwright, baseURL);
    const sent = await client.post('/api/rights/request-otp', { data: { referenceId: referenceId.toLowerCase(), contact: formatted(phone) } });
    expect(sent.status()).toBe(200);
    const code = (await sent.json()).demo.code;
    expect(code).toMatch(/^\d{6}$/);
    const [challenge] = await challenges();
    expect(challenge).toMatchObject({ channel: 'phone', attempts: 0, consumedAt: null });
    expect(challenge.codeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(challenge.codeHash).not.toContain(code);
    expect(challenge.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const verify = (body) => client.post('/api/rights/verify-otp', { data: body });
    expect((await verify({ referenceId, code: '12ab' })).status()).toBe(400);
    expect((await verify({ referenceId, code: String((Number(code) + 1) % 1e6).padStart(6, '0') })).status()).toBe(400);
    expect((await challenges())[0].attempts).toBe(1);
    expect((await verify({ referenceId: 'DP-ZZZZZ9', code })).status()).toBe(400);
    const ok = await verify({ referenceId, code });
    expect(ok.status()).toBe(200);
    expect((await client.storageState()).cookies.some((c) => c.name === 'dpdp_rights_session' && c.httpOnly)).toBe(true);
    expect((await challenges())[0].consumedAt).not.toBeNull();
    expect((await verify({ referenceId, code })).status()).toBe(400); // single use
    await client.dispose();
  });

  test('every dashboard action needs a verified session', async ({ playwright, baseURL }) => {
    for (const [method, url, data] of [
      ['GET', '/api/rights/me'],
      ['GET', '/api/rights/download'],
      ['POST', '/api/rights/correct', { type: 'CORRECTION', name: 'Test' }],
      ['POST', '/api/rights/consent', { purpose: 'APPOINTMENT', action: 'WITHDRAW', language: 'en' }],
      ['POST', '/api/rights/nominate', { name: 'Test', relationship: 'Sibling', contact: 'nominee@example.com' }],
      ['POST', '/api/rights/erase', { confirm: true, language: 'en' }]
    ]) {
      expect((await send(playwright, baseURL, method, url, data)).status, url).toBe(401);
    }
  });

  test('correction form: invalid input rejected; valid changes stored; only the changed field names are logged', async ({ playwright, baseURL }) => {
    const { client, principal } = await signedIn(playwright, baseURL, { name: 'Test Correct User' });
    const correct = async (body) => {
      const res = await client.post('/api/rights/correct', { data: body });
      return { status: res.status(), json: await res.json() };
    };
    const rejected = [
      ['invalid mobile', { type: 'CORRECTION', phone: '123' }, ['phone']],
      ['empty name', { type: 'CORRECTION', name: '' }, ['name']],
      ['invalid email', { type: 'CORRECTION', email: 'bad' }, ['email']],
      ['unknown request type', { type: 'DELETE', name: 'Test' }, ['type']],
      ['type missing', { name: 'Test' }, ['type']],
      ['field that cannot be corrected', { type: 'CORRECTION', dateOfBirth: '2000-01-01' }, []]
    ];
    for (const [label, body, fields] of rejected) {
      const res = await correct(body);
      expect(res.status, label).toBe(400);
      if (fields.length) expect(res.json.fields, label).toEqual(expect.arrayContaining(fields));
    }
    expect((await correct({ type: 'CORRECTION' })).json.error).toBe('Nothing to change.');
    expect((await correct({ type: 'CORRECTION', guardianPhone: '9000000002' })).status).toBe(400); // no booking for a minor
    expect(decrypt((await db().dataPrincipal.findUnique({ where: { id: principal.id } })).name)).toBe('Test Correct User'); // unchanged

    const newPhone = testPhone();
    const ok = await correct({ type: 'COMPLETION', name: 'Test Corrected Name', phone: formatted(newPhone), email: 'Test.Corrected@Example.com' });
    expect(ok.status).toBe(200);
    expect(ok.json.summary.personalData).toMatchObject({ name: 'Test Corrected Name', phone: newPhone, email: 'test.corrected@example.com' });
    const updated = await db().dataPrincipal.findUnique({ where: { id: principal.id } });
    expect([decrypt(updated.name), decrypt(updated.phone), decrypt(updated.email)]).toEqual(['Test Corrected Name', newPhone, 'test.corrected@example.com']);
    const request = await db().rightsRequest.findFirst({ where: { dataPrincipalId: principal.id, type: 'COMPLETION' } });
    expect(JSON.parse(request.payload).fields.sort()).toEqual(['email', 'name', 'phone']);
    expect(request.payload).not.toContain('Corrected');

    expect((await correct({ type: 'UPDATE', email: '' })).status).toBe(200); // optional email can be removed
    expect((await db().dataPrincipal.findUnique({ where: { id: principal.id } })).email).toBeNull();
    await client.dispose();
  });

  test('nomination form: invalid input rejected; the nominee is stored encrypted', async ({ playwright, baseURL }) => {
    const { client, principal } = await signedIn(playwright, baseURL, { name: 'Test Nominating User' });
    const nominate = async (body) => {
      const res = await client.post('/api/rights/nominate', { data: body });
      return { status: res.status(), json: await res.json() };
    };
    for (const [label, body, fields] of [
      ['all empty', { name: '', relationship: '', contact: '' }, ['name', 'relationship', 'contact']],
      ['contact neither phone nor email', { name: 'Test Nominee', relationship: 'Sibling', contact: 'abc' }, ['contact']],
      ['relationship over 50 characters', { name: 'Test Nominee', relationship: 'r'.repeat(51), contact: 'nominee@example.com' }, ['relationship']],
      ['extra field', { name: 'Test Nominee', relationship: 'Sibling', contact: 'nominee@example.com', address: 'x' }, []]
    ]) {
      const res = await nominate(body);
      expect(res.status, label).toBe(400);
      if (fields.length) expect(res.json.fields, label).toEqual(expect.arrayContaining(fields));
    }
    expect(await db().rightsRequest.count({ where: { dataPrincipalId: principal.id, type: 'NOMINATION' } })).toBe(0);

    expect((await nominate({ name: 'Test Nominee', relationship: 'Sibling', contact: 'Test.Nominee@Example.com' })).status).toBe(200);
    const request = await db().rightsRequest.findFirst({ where: { dataPrincipalId: principal.id, type: 'NOMINATION' } });
    const { nominee } = JSON.parse(request.payload);
    expect(nominee).toMatch(/^v1:/);
    expect(JSON.parse(decrypt(nominee))).toEqual({ name: 'Test Nominee', relationship: 'Sibling', contact: 'test.nominee@example.com' });
    await client.dispose();
  });

  test('consent withdrawal: only valid changes accepted; withdrawal recorded and the booking cancelled', async ({ playwright, baseURL }) => {
    const { client, principal } = await signedIn(playwright, baseURL, { name: 'Test Withdrawing User' });
    const change = async (body) => {
      const res = await client.post('/api/rights/consent', { data: body });
      return { status: res.status(), json: await res.json() };
    };
    for (const [label, body, error] of [
      ['purpose that does not exist', { purpose: 'ANALYTICS', action: 'WITHDRAW', language: 'en' }],
      ['action that does not exist', { purpose: 'APPOINTMENT', action: 'PAUSE', language: 'en' }],
      ['language missing', { purpose: 'APPOINTMENT', action: 'WITHDRAW' }],
      ['give the appointment consent here', { purpose: 'APPOINTMENT', action: 'GIVE', language: 'en' }, 'To book again, please use the appointment form.'],
      ['give a purpose no longer offered', { purpose: 'MARKETING', action: 'GIVE', language: 'en' }, 'This option is no longer offered.'],
      ['withdraw something never given', { purpose: 'MARKETING', action: 'WITHDRAW', language: 'en' }, 'This consent is not currently given.']
    ]) {
      const res = await change(body);
      expect(res.status, label).toBe(400);
      if (error) expect(res.json.error, label).toBe(error);
    }
    expect(await db().consentRecord.count({ where: { dataPrincipalId: principal.id } })).toBe(1);

    expect((await change({ purpose: 'APPOINTMENT', action: 'WITHDRAW', language: 'en' })).status).toBe(200);
    const latest = await db().consentRecord.findFirst({ where: { dataPrincipalId: principal.id }, orderBy: { timestamp: 'desc' }, include: { noticeVersion: true } });
    expect(latest).toMatchObject({ purpose: 'APPOINTMENT', status: 'WITHDRAWN', channel: 'PREFERENCE_CENTRE', language: 'en' });
    expect(latest.noticeVersion.version).toBe(NOTICE_VERSION);
    expect((await db().appointment.findMany({ where: { dataPrincipalId: principal.id } })).map((a) => a.status)).toEqual(['CANCELLED']);
    expect(await db().rightsRequest.count({ where: { dataPrincipalId: principal.id, type: 'WITHDRAW_CONSENT' } })).toBe(1);
    expect((await change({ purpose: 'APPOINTMENT', action: 'WITHDRAW', language: 'en' })).json.error).toBe('This consent is not currently given.');
    await client.dispose();
  });

  test('download returns the stored data as a JSON file', async ({ playwright, baseURL }) => {
    const { client, referenceId, phone } = await signedIn(playwright, baseURL, { name: 'Test Download User', email: 'test.download@example.com' });
    const res = await client.get('/api/rights/download');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-disposition']).toBe(`attachment; filename="my-data-${referenceId}.json"`);
    expect(res.headers()['cache-control']).toContain('no-store');
    const data = await res.json();
    expect(data.referenceId).toBe(referenceId);
    expect(data.personalData).toMatchObject({ name: 'Test Download User', phone, email: 'test.download@example.com' });
    expect(data.appointments).toHaveLength(1);
    await client.dispose();
  });

  test('erasure form: needs explicit confirmation; then erases the personal data and ends the session', async ({ playwright, baseURL }) => {
    const { client, principal, referenceId } = await signedIn(playwright, baseURL, { name: 'Test Erasing User' });
    for (const [label, body] of [
      ['not confirmed', { confirm: false, language: 'en' }],
      ['confirmation as text', { confirm: 'yes', language: 'en' }],
      ['language missing', { confirm: true }],
      ['extra field', { confirm: true, language: 'en', reason: 'x' }]
    ]) {
      expect((await client.post('/api/rights/erase', { data: body })).status(), label).toBe(400);
    }
    expect(decrypt((await principalOf(referenceId)).name)).toBe('Test Erasing User'); // untouched

    const res = await client.post('/api/rights/erase', { data: { confirm: true, language: 'en' } });
    expect(res.status()).toBe(200);
    expect((await res.json()).result).toMatchObject({ fullyErased: true, erased: { appointments: 1, contactDetails: ['name', 'phone', 'email'] } });
    const erased = await principalOf(referenceId);
    expect([erased.name, erased.phone, erased.email]).toEqual([null, null, null]);
    expect(erased.erasedAt).not.toBeNull();
    expect(await db().appointment.count({ where: { dataPrincipalId: principal.id } })).toBe(0);
    expect(await db().rightsRequest.findFirst({ where: { dataPrincipalId: principal.id, type: 'ERASURE' } })).toMatchObject({ status: 'COMPLETED' });
    expect((await client.get('/api/rights/me')).status()).toBe(401);
    await client.dispose();
  });
});

// ---------------------------------------------------------------------------------------
// Grievance: /grievance → POST /api/grievances
// ---------------------------------------------------------------------------------------

test.describe('grievance form', () => {
  test('UI without a reference ID: submit stays disabled until required fields are filled; server asks for contact details', async ({ browser, baseURL }) => {
    const ctx = await newContext(browser);
    await ctx.addCookies([consentCookie(baseURL)]);
    const page = await ctx.newPage();
    await page.goto('/grievance', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: "I don't have a reference ID" }).click();
    const submit = page.getByRole('button', { name: 'Submit grievance' });
    const grievancesBefore = await db().grievance.count();
    await expect(submit).toBeDisabled();
    await page.selectOption('#g-category', 'SECURITY');
    await expect(submit).toBeDisabled();
    await page.fill('#g-description', '   ');
    await expect(submit).toBeDisabled();
    await page.fill('#g-description', 'Synthetic grievance via the form.');
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page.locator('form').getByRole('alert')).toHaveText('Please give your name and a mobile number or email for our reply.');
    expect(await db().grievance.count()).toBe(grievancesBefore);

    await page.fill('#g-name', 'Test Grievance Ui');
    await page.fill('#g-contact', 'Test.Grievance.Ui@Example.com');
    await submit.click();
    const ref = (await page.locator('.alert-success strong').first().textContent()).trim();
    const g = await db().grievance.findUnique({ where: { referenceNumber: ref } });
    expect([decrypt(g.contactName), decrypt(g.contactDetail), decrypt(g.description)]).toEqual([
      'Test Grievance Ui',
      'test.grievance.ui@example.com',
      'Synthetic grievance via the form.'
    ]);
    expect([g.category, g.verified, g.status, g.dataPrincipalId]).toEqual(['SECURITY', false, 'OPEN', null]);
    await ctx.close();
  });

  test('API: valid grievance stored with a due date within one month; invalid ones rejected and nothing stored', async ({ playwright, baseURL }) => {
    const phone = testPhone();
    const valid = { name: 'Test Complainant Api', contactDetail: formatted(phone), category: 'CONSENT', description: 'Synthetic complaint\nwith two lines.', language: 'en' };
    const before = await counts();
    for (const [label, body, fields] of [
      ['name missing', { ...valid, name: '' }, ['name', 'contactDetail']],
      ['contact missing', { ...valid, contactDetail: '' }, ['name', 'contactDetail']],
      ['contact neither phone nor email', { ...valid, contactDetail: 'abc' }, ['contactDetail']],
      ['category missing', { ...valid, category: undefined }, ['category']],
      ['category that does not exist', { ...valid, category: 'BILLING' }, ['category']],
      ['description empty', { ...valid, description: '  ' }, ['description']],
      ['description over 2000 characters', { ...valid, description: 'd'.repeat(2001) }, ['description']],
      ['language missing', { ...valid, language: undefined }, ['language']],
      ['extra field', { ...valid, priority: 'high' }, []]
    ]) {
      const res = await post(playwright, baseURL, '/api/grievances', body);
      expect(res.status, label).toBe(400);
      if (fields.length) expect(res.json.fields, label).toEqual(expect.arrayContaining(fields));
    }
    expect((await post(playwright, baseURL, '/api/grievances', valid, { extraHTTPHeaders: { Origin: 'https://attacker.example.com' } })).status).toBe(403);
    expect((await send(playwright, baseURL, 'GET', '/api/grievances')).status).toBe(405);
    expect(await counts()).toEqual(before);

    const res = await post(playwright, baseURL, '/api/grievances', valid);
    expect(res.status).toBe(201);
    expect(res.json.referenceNumber).toMatch(/^GRV-[A-Z0-9]{8}$/);
    expect(res.json.verified).toBe(false);
    const g = await db().grievance.findUnique({ where: { referenceNumber: res.json.referenceNumber } });
    expect(decrypt(g.contactName)).toBe('Test Complainant Api');
    expect(decrypt(g.contactDetail)).toBe(phone); // normalised to 10 digits
    expect(decrypt(g.description)).toBe('Synthetic complaint\nwith two lines.');
    const oneMonth = new Date(g.createdAt);
    oneMonth.setMonth(oneMonth.getMonth() + 1);
    expect(g.dueDate.getTime()).toBeGreaterThan(g.createdAt.getTime());
    expect(g.dueDate.getTime()).toBeLessThanOrEqual(oneMonth.getTime());
    expect(new Date(res.json.dueDate).getTime()).toBe(g.dueDate.getTime());
    expect(g.escalationNote).toBe(res.json.escalationNote);
  });

  test('API with a verified session: linked to the person; no separate name or contact stored', async ({ playwright, baseURL }) => {
    const { client, principal } = await signedIn(playwright, baseURL, { name: 'Test Verified Complainant' });
    const res = await client.post('/api/grievances', {
      data: { name: 'Test Ignored Name', contactDetail: 'ignored@example.com', category: 'ACCESS', description: 'Synthetic verified complaint.', language: 'en' }
    });
    expect(res.status()).toBe(201);
    const json = await res.json();
    expect(json.verified).toBe(true);
    const g = await db().grievance.findUnique({ where: { referenceNumber: json.referenceNumber } });
    expect([g.dataPrincipalId, g.verified, g.contactName, g.contactDetail, g.category]).toEqual([principal.id, true, null, null, 'ACCESS']);
    expect(decrypt(g.description)).toBe('Synthetic verified complaint.');
    await client.dispose();
  });
});

// ---------------------------------------------------------------------------------------
// Admin forms
// ---------------------------------------------------------------------------------------

test.describe('admin forms', () => {
  const admin = (playwright, baseURL, who = ADMIN, extra = {}) => apiClient(playwright, baseURL, { httpCredentials: { ...who, send: 'always' }, ...extra });

  test('appointment status and clinical-record switch: valid changes stored, invalid ones rejected, roles enforced', async ({ playwright, baseURL }) => {
    const booker = await apiClient(playwright, baseURL);
    const { referenceId } = await bookViaApi(booker, baseURL, { name: 'Test Admin Booking' });
    await booker.dispose();
    const appt = await db().appointment.findFirst({ where: { dataPrincipal: { referenceId } } });
    const reload = () => db().appointment.findUnique({ where: { id: appt.id } });

    expect((await post(playwright, baseURL, '/api/admin/appointments', { id: appt.id, status: 'CONFIRMED' })).status).toBe(401);
    const desk = await admin(playwright, baseURL, DESK);
    expect((await desk.post('/api/admin/appointments', { data: { id: appt.id, status: 'CONFIRMED' } })).status()).toBe(200);
    expect((await reload()).status).toBe('CONFIRMED');
    await desk.dispose();

    const client = await admin(playwright, baseURL);
    for (const [label, body] of [
      ['status that does not exist', { id: appt.id, status: 'DONE' }],
      ['clinical-record flag as text', { id: appt.id, legallyRequired: 'yes' }],
      ['id missing', { status: 'COMPLETED' }],
      ['extra field', { id: appt.id, status: 'COMPLETED', notes: 'x' }]
    ]) {
      expect((await client.post('/api/admin/appointments', { data: body })).status(), label).toBe(400);
    }
    expect((await reload()).status).toBe('CONFIRMED');
    const crossSite = await admin(playwright, baseURL, ADMIN, { extraHTTPHeaders: { Origin: 'https://attacker.example.com' } });
    expect((await crossSite.post('/api/admin/appointments', { data: { id: appt.id, status: 'CANCELLED' } })).status()).toBe(403);
    await crossSite.dispose();

    expect((await client.post('/api/admin/appointments', { data: { id: appt.id, status: 'COMPLETED' } })).status()).toBe(200);
    expect((await client.post('/api/admin/appointments', { data: { id: appt.id, legallyRequired: true } })).status()).toBe(200);
    const done = await reload();
    expect([done.status, done.legallyRequired]).toEqual(['COMPLETED', true]);
    expect(done.completedAt).not.toBeNull();
    const audit = await db().auditLog.findMany({ where: { entity: 'Appointment', entityId: appt.id, action: 'UPDATE' } });
    expect(audit.map((a) => a.detail).sort()).toEqual(['legallyRequired', 'status', 'status,completedAt']);
    await client.dispose();
  });

  test('grievance response form (UI and API): response stored with the contact footer; invalid input rejected', async ({ browser, playwright, baseURL }) => {
    const created = await post(playwright, baseURL, '/api/grievances', {
      name: 'Test Admin Grievance',
      contactDetail: 'test.admin.grievance@example.com',
      category: 'OTHER',
      description: 'Synthetic grievance for the admin form.',
      language: 'en'
    });
    const g = await db().grievance.findUnique({ where: { referenceNumber: created.json.referenceNumber } });
    const reload = () => db().grievance.findUnique({ where: { id: g.id } });

    const desk = await admin(playwright, baseURL, DESK);
    expect((await desk.post('/api/admin/grievances', { data: { id: g.id, status: 'COMPLETED', response: 'x' } })).status()).toBe(403);
    await desk.dispose();
    const client = await admin(playwright, baseURL);
    for (const [label, body] of [
      ['empty response', { id: g.id, status: 'COMPLETED', response: '   ' }],
      ['status that does not exist', { id: g.id, status: 'CLOSED', response: 'Synthetic' }],
      ['response over 2000 characters', { id: g.id, status: 'COMPLETED', response: 'r'.repeat(2001) }],
      ['extra field', { id: g.id, status: 'COMPLETED', response: 'Synthetic', notify: true }]
    ]) {
      expect((await client.post('/api/admin/grievances', { data: body })).status(), label).toBe(400);
    }
    expect((await reload()).status).toBe('OPEN');

    expect((await client.post('/api/admin/grievances', { data: { id: g.id, status: 'IN_PROGRESS', response: 'Synthetic: looking into it.' } })).status()).toBe(200);
    const progress = await reload();
    expect([progress.status, progress.resolution, progress.resolvedAt]).toEqual(['IN_PROGRESS', null, null]);
    await client.dispose();

    // Through the admin page form.
    const ctx = await newContext(browser, { httpCredentials: ADMIN });
    const page = await ctx.newPage();
    await page.goto('/admin/grievances', { waitUntil: 'networkidle' });
    const row = page.locator('tr', { hasText: created.json.referenceNumber });
    await expect(row.getByRole('button', { name: 'Save' })).toBeDisabled(); // response required
    await row.getByPlaceholder('Response to the Data Principal').fill('Synthetic resolution from the admin form.');
    await row.getByRole('combobox', { name: 'New status' }).selectOption('COMPLETED');
    await row.getByRole('button', { name: 'Save' }).click();
    await expect.poll(async () => (await reload()).status).toBe('COMPLETED');
    const resolved = await reload();
    expect(resolved.resolution.startsWith('Synthetic resolution from the admin form.')).toBe(true);
    expect(resolved.resolution).toContain('Contact: ');
    expect(resolved.resolution).toContain(resolved.escalationNote);
    expect(resolved.resolvedAt).not.toBeNull();
    await ctx.close();
  });

  test('rights request response: stored as the response message with the contact footer', async ({ playwright, baseURL }) => {
    const { client: person, principal } = await signedIn(playwright, baseURL, { name: 'Test Admin Rights' });
    await person.post('/api/rights/nominate', { data: { name: 'Test Nominee', relationship: 'Sibling', contact: 'nominee@example.com' } });
    await person.dispose();
    const request = await db().rightsRequest.findFirst({ where: { dataPrincipalId: principal.id, type: 'NOMINATION' } });

    const client = await admin(playwright, baseURL);
    expect((await client.post('/api/admin/rights', { data: { id: request.id, status: 'OPEN', response: 'Synthetic' } })).status()).toBe(400);
    expect((await client.post('/api/admin/rights', { data: { id: request.id, status: 'PARTIALLY_COMPLETED', response: '' } })).status()).toBe(400);
    expect((await client.post('/api/admin/rights', { data: { id: request.id, status: 'PARTIALLY_COMPLETED', response: 'Synthetic partial response.' } })).status()).toBe(200);
    const stored = await db().rightsRequest.findUnique({ where: { id: request.id } });
    expect(stored.status).toBe('PARTIALLY_COMPLETED');
    expect(JSON.parse(stored.response).message).toMatch(/^Synthetic partial response\.\n\nContact: /);
    expect(stored.respondedAt).not.toBeNull();
    await client.dispose();
  });

  test('incident form (UI and API): required fields enforced; values stored; 72-hour report deadline computed; milestones recorded', async ({ browser, playwright, baseURL }) => {
    const detectedAt = new Date(Date.now() - 2 * 3600000);
    detectedAt.setSeconds(0, 0);
    const valid = {
      detectedAt: detectedAt.toISOString(),
      occurredAt: new Date(detectedAt.getTime() - 3600000).toISOString(),
      incidentType: 'xi',
      location: 'Test system',
      description: 'Synthetic incident description.',
      nature: 'Synthetic unauthorised access.',
      extent: 'Synthetic test records only.',
      affectedCount: 3,
      likelyImpact: 'Synthetic impact.'
    };
    const desk = await admin(playwright, baseURL, DESK);
    expect((await desk.post('/api/admin/breaches', { data: valid })).status()).toBe(403);
    await desk.dispose();

    const client = await admin(playwright, baseURL);
    const before = await counts();
    for (const [label, body] of [
      ['description missing', { ...valid, description: '' }],
      ['nature missing', { ...valid, nature: undefined }],
      ['extent missing', { ...valid, extent: '  ' }],
      ['detected time not a date', { ...valid, detectedAt: 'not a date' }],
      ['negative count', { ...valid, affectedCount: -1 }],
      ['count not a number', { ...valid, affectedCount: 'many' }],
      ['incident type that does not exist', { ...valid, incidentType: 'zzz' }],
      ['extra field', { ...valid, reporter: 'x' }]
    ]) {
      expect((await client.post('/api/admin/breaches', { data: body })).status(), label).toBe(400);
    }
    expect(await counts()).toEqual(before);

    const res = await client.post('/api/admin/breaches', { data: valid });
    expect(res.status()).toBe(201);
    const { id } = await res.json();
    const reload = () => db().breachIncident.findUnique({ where: { id } });
    const incident = await reload();
    expect(incident).toMatchObject({
      status: 'OPEN',
      incidentType: 'xi',
      location: 'Test system',
      description: valid.description,
      nature: valid.nature,
      extent: valid.extent,
      affectedCount: 3,
      likelyImpact: 'Synthetic impact.',
      mitigation: null
    });
    expect(incident.detectedAt.getTime()).toBe(detectedAt.getTime());
    expect(incident.occurredAt.toISOString()).toBe(valid.occurredAt);
    expect(incident.detailedReportDueAt.getTime()).toBe(detectedAt.getTime() + 72 * 3600000);

    expect((await client.post('/api/admin/breaches', { data: { ...valid, id, action: 'update', affectedCount: 5, mitigation: 'Synthetic mitigation.' } })).status()).toBe(200);
    expect(await reload()).toMatchObject({ affectedCount: 5, mitigation: 'Synthetic mitigation.' });
    expect((await client.post('/api/admin/breaches', { data: { id, action: 'mark', milestone: 'notAMilestone' } })).status()).toBe(400);
    expect((await client.post('/api/admin/breaches', { data: { id, action: 'mark', milestone: 'certInReportedAt' } })).status()).toBe(200);
    expect((await client.post('/api/admin/breaches', { data: { id, action: 'mark', milestone: 'boardIntimatedAt' } })).status()).toBe(200);
    const marked = await reload();
    expect(marked.certInReportedAt).not.toBeNull();
    expect(marked.status).toBe('BOARD_INTIMATED');
    expect((await client.post('/api/admin/breaches', { data: { id, action: 'close', extra: 1 } })).status()).toBe(400);
    expect((await client.post('/api/admin/breaches', { data: { id, action: 'close' } })).status()).toBe(200);
    expect((await reload()).status).toBe('CLOSED');
    await client.dispose();

    // Through the admin page form: browser validation blocks a missing required field.
    const ctx = await newContext(browser, { httpCredentials: ADMIN });
    const page = await ctx.newPage();
    await page.goto('/admin/breaches', { waitUntil: 'networkidle' });
    const countBefore = await db().breachIncident.count();
    await page.getByText('Record a new incident').click(); // collapsed section
    await page.fill('#new-description', 'Synthetic incident from the admin form.');
    await page.getByRole('button', { name: 'Record incident' }).click();
    expect(await page.locator('#new-nature').evaluate((el) => el.validity.valueMissing)).toBe(true);
    expect(await db().breachIncident.count()).toBe(countBefore);
    await page.fill('#new-nature', 'Synthetic nature.');
    await page.fill('#new-extent', 'Synthetic extent.');
    await page.fill('#new-affectedCount', '2');
    await page.getByRole('button', { name: 'Record incident' }).click();
    await expect.poll(() => db().breachIncident.count()).toBe(countBefore + 1);
    const fromForm = await db().breachIncident.findFirst({ where: { description: 'Synthetic incident from the admin form.' } });
    expect(fromForm).toMatchObject({ nature: 'Synthetic nature.', extent: 'Synthetic extent.', affectedCount: 2, status: 'OPEN' });
    await ctx.close();
  });

  test('consent ledger filter form: filters apply; unknown values are ignored; export follows the filter', async ({ browser, playwright, baseURL }) => {
    const booker = await apiClient(playwright, baseURL);
    const { referenceId } = await bookViaApi(booker, baseURL, { name: 'Test Filter User' });
    await booker.dispose();
    const client = await admin(playwright, baseURL);
    const csv = async (query) => (await (await client.get(`/api/admin/consents-export?${query}`)).text()).trim().split('\n');
    const own = await csv(`reference=${referenceId}`);
    expect(own).toHaveLength(2); // header + the booking's consent
    expect(own[1]).toContain(referenceId);
    expect(own[1]).toContain('APPOINTMENT');
    expect(await csv(`reference=${referenceId}&status=WITHDRAWN`)).toHaveLength(1); // header only
    expect(await csv(`reference=${referenceId}&purpose=NOT_A_PURPOSE`)).toHaveLength(2); // unknown value ignored
    expect(await csv('reference=DP-ZZZZZ9')).toHaveLength(1);
    await client.dispose();

    const ctx = await newContext(browser, { httpCredentials: ADMIN });
    const page = await ctx.newPage();
    await page.goto('/admin/consents', { waitUntil: 'networkidle' });
    await page.fill('#f-reference', referenceId.toLowerCase());
    await page.selectOption('#f-status', 'GIVEN');
    await page.getByRole('button', { name: 'Filter' }).click();
    await page.waitForURL(/reference=/);
    expect(new URL(page.url()).searchParams.get('status')).toBe('GIVEN');
    await expect(page.locator('#f-reference')).toHaveValue(referenceId); // normalised to upper case
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.locator('tbody tr')).toContainText(referenceId);
    await ctx.close();
  });
});
