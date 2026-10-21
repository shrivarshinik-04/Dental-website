/**
 * The stored-data check (scripts/check-data.js, `npm run data:check`): passes on data made
 * through the forms, and catches badly stored rows. The bad rows are written straight into
 * the synthetic prisma/test.db and removed again before the test ends.
 */
const { test, expect } = require('@playwright/test');
const { checkData } = require('../../scripts/check-data');
const { NOTICE_VERSION, apiClient, bookViaApi, db, testPhone } = require('./helpers');

const run = () => checkData(db(), { key: process.env.E2E_ENCRYPTION_KEY });
const errorsFor = (results, id) => results.flatMap((r) => r.errors.filter((e) => e.id === id).map((e) => e.problem));

test('data stored through every kind of form passes the check', async ({ playwright, baseURL }) => {
  const client = await apiClient(playwright, baseURL);
  expect((await bookViaApi(client, baseURL, { name: 'Test Check Adult', email: 'test.check@example.com', reason: 'Synthetic' })).status).toBe(201);
  await client.dispose();
  const guardian = await apiClient(playwright, baseURL);
  const minor = await bookViaApi(guardian, baseURL, {
    name: 'Test Check Child',
    phone: '',
    isMinor: true,
    guardianName: 'Test Check Guardian',
    guardianRelationship: 'PARENT',
    guardianPhone: testPhone(),
    guardianDeclaration: true
  });
  expect(minor.status).toBe(201);
  await guardian.dispose();
  const banner = await apiClient(playwright, baseURL);
  await banner.post('/api/consent', { data: { choices: { functional: true, analytics: false }, language: 'hi', noticeVersion: NOTICE_VERSION } });
  await banner.dispose();
  const complainant = await apiClient(playwright, baseURL);
  await complainant.post('/api/grievances', {
    data: { name: 'Test Check Complainant', contactDetail: 'complainant.check@example.com', category: 'OTHER', description: 'Synthetic.', language: 'en' }
  });
  await complainant.dispose();

  const results = await run();
  expect(results.map((r) => r.check)).toHaveLength(9);
  expect(results.every((r) => r.checked > 0 || /One-time codes|Rights requests/.test(r.check))).toBe(true);
  expect(results.flatMap((r) => r.errors.map((e) => `${r.check}: ${e.problem}`))).toEqual([]);
});

test('badly stored rows are reported by ID, without their contents', async () => {
  const notice = await db().noticeVersion.findFirst({ where: { version: NOTICE_VERSION, language: 'en' } });
  const created = { principal: null, appointment: null, consent: null, grievance: null };
  try {
    // A person whose phone was written without encryption.
    created.principal = await db().dataPrincipal.create({ data: { referenceId: 'DP-TAMP01', name: 'Test Plain Name', phone: '9000000099' } });
    // An adult booking holding guardian details, with no consent record.
    created.appointment = await db().appointment.create({
      data: { dataPrincipalId: created.principal.id, preferredDate: new Date(), preferredSlot: 'NIGHT', service: 'Plain service', guardianName: 'Test Plain Guardian' }
    });
    // A cookie-banner record with a booking purpose, in a language different from its notice.
    created.consent = await db().consentRecord.create({
      data: { anonymousId: '00000000-0000-4000-8000-000000000000', purpose: 'APPOINTMENT', status: 'GIVEN', channel: 'COOKIE_BANNER', language: 'hi', noticeVersionId: notice.id }
    });
    // A "verified" complaint linked to nobody, due in two months.
    created.grievance = await db().grievance.create({
      data: {
        referenceNumber: 'GRV-BAD',
        verified: true,
        category: 'BILLING',
        description: 'Synthetic plain description',
        dueDate: new Date(Date.now() + 61 * 864e5),
        escalationNote: 'Synthetic'
      }
    });

    const results = await run();
    expect(errorsFor(results, created.principal.id)).toEqual(
      expect.arrayContaining(['name is not encrypted with this key', 'phone is not encrypted with this key'])
    );
    expect(errorsFor(results, created.appointment.id)).toEqual(
      expect.arrayContaining([
        'service is not encrypted with this key',
        'guardianName is not encrypted with this key',
        'time slot is not MORNING or EVENING',
        'adult booking holds guardian details',
        'no appointment consent recorded with this booking'
      ])
    );
    expect(errorsFor(results, created.consent.id)).toEqual(
      expect.arrayContaining(['cookie banner record with a non-cookie purpose', 'language differs from the notice version it points to'])
    );
    expect(errorsFor(results, created.grievance.id)).toEqual(
      expect.arrayContaining([
        'reference number has the wrong format',
        'description is not encrypted with this key',
        'unknown category',
        'verified complaint not linked to a person',
        'due date not within one month'
      ])
    );
    // Reports never contain the stored values.
    expect(JSON.stringify(results)).not.toMatch(/Test Plain|9000000099|Plain service|Synthetic plain/);
  } finally {
    if (created.grievance) await db().grievance.delete({ where: { id: created.grievance.id } });
    if (created.consent) await db().consentRecord.delete({ where: { id: created.consent.id } });
    if (created.appointment) await db().appointment.delete({ where: { id: created.appointment.id } });
    if (created.principal) await db().dataPrincipal.delete({ where: { id: created.principal.id } });
  }
});
