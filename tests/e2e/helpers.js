/**
 * Shared helpers for the e2e tests. Synthetic data only (names "Test ...", example.com,
 * +91 9000000xxx numbers).
 */
const { PrismaClient } = require('@prisma/client');
const { NOTICE_VERSION } = require('../../src/config/compliance');
const { TEST_DB } = require('../../playwright.config');

const ADMIN = { username: 'e2e-admin', password: 'e2e-admin-password-1' };
const DESK = { username: 'e2e-desk', password: 'e2e-desk-password-1' };

let ipCounter = 0;
/** A distinct client IP per call (the test server trusts X-Forwarded-For). */
const uniqueIp = () => {
  ipCounter += 1;
  return `10.${process.pid % 250}.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`;
};

const newContext = (browser, options = {}) =>
  browser.newContext({ ...options, extraHTTPHeaders: { 'X-Forwarded-For': uniqueIp(), ...(options.extraHTTPHeaders || {}) } });

/** Consent cookie as the banner would set it, to start a page without the banner. */
const consentCookie = (baseURL, choices = { functional: false, analytics: false }) => ({
  name: 'dpdp_consent',
  value: encodeURIComponent(JSON.stringify({ v: NOTICE_VERSION, c: choices, ts: new Date().toISOString() })),
  url: baseURL
});

let prisma;
const db = () => {
  if (!prisma) prisma = new PrismaClient({ datasources: { db: { url: `file:${TEST_DB}` } } });
  return prisma;
};

/** Records console errors and warnings for a page. */
const watchConsole = (page) => {
  const messages = [];
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && messages.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => messages.push(`pageerror: ${e.message}`));
  return messages;
};

const futureDate = (days = 3) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);

let phoneCounter = 0;
const testPhone = () => {
  phoneCounter += 1;
  return `9000${String(process.pid % 1000).padStart(3, '0')}${String(phoneCounter).padStart(3, '0')}`;
};

const bookingBody = (overrides = {}) => ({
  name: 'Test Patient',
  phone: testPhone(),
  email: '',
  service: 'Cavity Filling',
  preferredDate: futureDate(),
  preferredSlot: 'MORNING',
  reason: '',
  isMinor: false,
  guardianName: '',
  guardianRelationship: null,
  guardianPhone: '',
  guardianEmail: '',
  guardianDeclaration: false,
  consents: { APPOINTMENT: true },
  language: 'en',
  noticeVersion: NOTICE_VERSION,
  ...overrides
});

/** Books through the API with the context's request client; returns { referenceId, body }. */
const bookViaApi = async (request, baseURL, overrides = {}) => {
  const body = bookingBody(overrides);
  const res = await request.post('/api/appointments', { data: body, headers: { Origin: baseURL } });
  const json = await res.json();
  return { status: res.status(), referenceId: json.referenceId, body, json };
};

/** Verifies identity via the demo one-time code; the session cookie lands in the context. */
const verifyViaApi = async (request, baseURL, referenceId, contact) => {
  const sent = await request.post('/api/rights/request-otp', { data: { referenceId, contact }, headers: { Origin: baseURL } });
  const code = (await sent.json()).demo?.code;
  const res = await request.post('/api/rights/verify-otp', { data: { referenceId, code }, headers: { Origin: baseURL } });
  return res.status();
};

module.exports = { ADMIN, DESK, NOTICE_VERSION, uniqueIp, newContext, consentCookie, db, watchConsole, futureDate, testPhone, bookingBody, bookViaApi, verifyViaApi };
