/**
 * Read-only data-quality check: confirms that what the forms and the cookie banner stored is
 * complete, encrypted where it should be, well-formed and correctly linked. It never changes
 * the database and never prints personal data: only check names, counts and record IDs.
 *
 *   npm run data:check             # the database in DATABASE_URL (.env), key from ENCRYPTION_KEY
 *
 * Exit code 1 if any ERROR is found; WARN marks older records made before a later change
 * (for example bookings for a patient under 18 made before the guardian's mobile was asked).
 * The e2e suite runs the same checks over prisma/test.db after every run (tests/e2e/teardown.js).
 * See docs/DATA-MODEL.md for what each table holds.
 */
const crypto = require('crypto');
const { LANGUAGES } = require('../src/config/compliance');

const PHONE = /^[6-9]\d{9}$/;
const EMAIL = /^[^\s@A-Z]+@[^\s@A-Z]+\.[^\s@A-Z]+$/; // stored in lower case
const HEX64 = /^[0-9a-f]{64}$/;
const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);
const RELATIONSHIPS = ['PARENT', 'LEGAL_GUARDIAN'];
const LEGACY_RELATIONSHIPS = ['MOTHER', 'FATHER'];
const COOKIE_PURPOSES = ['FUNCTIONAL_COOKIES', 'ANALYTICS_COOKIES'];
const LEGACY_FORM_PURPOSES = ['APPOINTMENT_REMINDERS_SMS_WHATSAPP', 'MARKETING'];
const GRIEVANCE_CATEGORIES = ['CONSENT', 'ACCESS', 'CORRECTION', 'SECURITY', 'OTHER'];
const CORRECTABLE = ['name', 'phone', 'email', 'guardianName', 'guardianPhone', 'guardianEmail'];
const RESOLVED = ['COMPLETED', 'PARTIALLY_COMPLETED', 'REJECTED'];
// A booking and its consent record are written in one transaction.
const SAME_TRANSACTION_MS = 60 * 1000;

/** Decrypts the "v1:<iv>:<tag>:<ciphertext>" format written by src/lib/crypto.js. */
const decrypter = (base64Key) => {
  const key = Buffer.from(base64Key || '', 'base64');
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY is missing or not 32 bytes (base64)');
  return (payload) => {
    const [version, iv, tag, ciphertext] = String(payload).split(':');
    if (version !== 'v1' || !iv || !tag || !ciphertext) throw new Error('not encrypted');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
  };
};

const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

/**
 * Runs every check. Returns [{ check, checked, errors: [{ id, problem }], warnings: [...] }].
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ key: string }} options base64 ENCRYPTION_KEY
 */
const checkData = async (prisma, { key }) => {
  const decrypt = decrypter(key);
  const results = [];
  const check = (name) => {
    const result = { check: name, checked: 0, errors: [], warnings: [] };
    results.push(result);
    return {
      count: (n = 1) => (result.checked += n),
      error: (id, problem) => result.errors.push({ id, problem }),
      warn: (id, problem) => result.warnings.push({ id, problem })
    };
  };

  const principals = await prisma.dataPrincipal.findMany({ include: { appointments: true } });
  const appointments = await prisma.appointment.findMany();
  const consents = await prisma.consentRecord.findMany({ include: { noticeVersion: { select: { language: true } } } });
  const notices = await prisma.noticeVersion.findMany();
  const grievances = await prisma.grievance.findMany();
  const requests = await prisma.rightsRequest.findMany();
  const otps = await prisma.otpChallenge.findMany();
  const audits = await prisma.auditLog.findMany({ select: { id: true, actor: true, ipHash: true, detail: true } });
  const events = await prisma.analyticsEvent.findMany({ select: { id: true, path: true, referrerOrigin: true } });

  // Decrypts one stored value; records an error (with the column, never the value) if it is not
  // ciphertext made with this key. Returns the plaintext or null.
  const open = (c, id, column, value) => {
    if (value === null || value === undefined) return null;
    try {
      return decrypt(value);
    } catch {
      c.error(id, `${column} is not encrypted with this key`);
      return null;
    }
  };

  // ---- People (booking form; correction form) ----
  const people = check('People: encrypted, complete and well-formed');
  const plain = new Map();
  for (const p of principals) {
    people.count();
    const name = open(people, p.id, 'name', p.name);
    const phone = open(people, p.id, 'phone', p.phone);
    const email = open(people, p.id, 'email', p.email);
    plain.set(p.id, { name, phone, email });
    if (!/^DP-[A-Z0-9]{6}$/.test(p.referenceId)) people.error(p.id, 'reference ID has the wrong format');
    if (p.erasedAt) {
      if (p.name || p.phone || p.email) people.error(p.id, 'erased, but name, phone or email is still stored');
      continue;
    }
    if (!name?.trim()) people.error(p.id, 'name missing');
    if (phone !== null && !PHONE.test(phone)) people.error(p.id, 'phone is not a 10-digit Indian mobile number');
    if (email !== null && !EMAIL.test(email)) people.error(p.id, 'email is not a valid lower-case address');
    const minorOnly = p.appointments.length > 0 && p.appointments.every((a) => a.patientIsMinor);
    const legallyKept = p.appointments.some((a) => a.legallyRequired);
    if (!phone && !minorOnly && !legallyKept && p.appointments.length) people.error(p.id, 'adult patient without a mobile number');
    if (minorOnly && (p.phone || p.email)) people.error(p.id, 'patient under 18 has their own phone or email stored');
  }

  // ---- Bookings (booking form) ----
  const bookings = check('Bookings: encrypted, guardian details only for under-18 patients');
  for (const a of appointments) {
    bookings.count();
    const service = open(bookings, a.id, 'service', a.service);
    open(bookings, a.id, 'notes', a.notes);
    const guardian = {
      name: open(bookings, a.id, 'guardianName', a.guardianName),
      relationship: open(bookings, a.id, 'guardianRelationship', a.guardianRelationship),
      phone: open(bookings, a.id, 'guardianPhone', a.guardianPhone),
      email: open(bookings, a.id, 'guardianEmail', a.guardianEmail)
    };
    if (!service?.trim()) bookings.error(a.id, 'service missing');
    if (!['MORNING', 'EVENING'].includes(a.preferredSlot)) bookings.error(a.id, 'time slot is not MORNING or EVENING');
    if (a.status === 'COMPLETED' && !a.completedAt) bookings.error(a.id, 'completed without a completion time');
    if (!a.patientIsMinor) {
      if (a.guardianName || a.guardianRelationship || a.guardianPhone || a.guardianEmail) bookings.error(a.id, 'adult booking holds guardian details');
      continue;
    }
    if (!guardian.name?.trim()) bookings.error(a.id, 'under-18 booking without the guardian\'s name');
    if (LEGACY_RELATIONSHIPS.includes(guardian.relationship)) bookings.warn(a.id, 'older relationship value (Mother/Father)');
    else if (!RELATIONSHIPS.includes(guardian.relationship)) bookings.error(a.id, 'guardian relationship missing or not Parent / Legal guardian');
    if (!guardian.phone) bookings.warn(a.id, 'under-18 booking without the guardian\'s mobile (made before it was asked)');
    else if (!PHONE.test(guardian.phone)) bookings.error(a.id, 'guardian mobile is not a 10-digit Indian mobile number');
    if (guardian.email !== null && !EMAIL.test(guardian.email)) bookings.error(a.id, 'guardian email is not a valid lower-case address');
  }

  // ---- Consent behind each booking ----
  const linked = check('Bookings: each has its appointment consent, given by the right person');
  const formConsents = consents.filter((c) => c.channel === 'APPOINTMENT_FORM' && c.purpose === 'APPOINTMENT');
  for (const a of appointments) {
    linked.count();
    const candidates = formConsents.filter(
      (c) => c.dataPrincipalId === a.dataPrincipalId && Math.abs(c.timestamp - a.createdAt) <= SAME_TRANSACTION_MS
    );
    const consent = candidates.find((c) => c.appointmentId === a.id) || candidates[0];
    if (!consent) {
      linked.error(a.id, 'no appointment consent recorded with this booking');
      continue;
    }
    if (consent.status !== 'GIVEN') linked.error(a.id, 'appointment consent was not given');
    if (consent.givenByGuardian !== a.patientIsMinor) linked.error(a.id, 'consent "given by guardian" does not match the patient\'s age answer');
    if (a.patientIsMinor && consent.appointmentId !== a.id) linked.warn(a.id, 'guardian consent not linked to the booking (made before the link existed)');
  }

  // ---- Consent ledger (booking form, cookie banner, Data Rights page) ----
  const ledger = check('Consent ledger: who, what, how and which notice');
  const appointmentById = new Map(appointments.map((a) => [a.id, a]));
  for (const c of consents) {
    ledger.count();
    if (Boolean(c.dataPrincipalId) === Boolean(c.anonymousId)) ledger.error(c.id, 'must belong to either a person or a browser ID, not both or neither');
    if (c.channel === 'COOKIE_BANNER') {
      if (!COOKIE_PURPOSES.includes(c.purpose)) ledger.error(c.id, 'cookie banner record with a non-cookie purpose');
      if (!c.anonymousId) ledger.error(c.id, 'cookie banner record without a browser ID');
    } else {
      if (COOKIE_PURPOSES.includes(c.purpose)) ledger.error(c.id, `${c.channel} record with a cookie purpose`);
      if (!c.dataPrincipalId) ledger.error(c.id, `${c.channel} record without a person`);
      if (LEGACY_FORM_PURPOSES.includes(c.purpose)) ledger.warn(c.id, 'purpose no longer offered (older record)');
    }
    if (c.anonymousId && !/^[0-9a-f-]{36}$/.test(c.anonymousId)) ledger.error(c.id, 'browser ID is not a UUID');
    if (!LANGUAGE_CODES.includes(c.language)) ledger.error(c.id, 'unsupported language');
    if (c.language !== c.noticeVersion.language) ledger.error(c.id, 'language differs from the notice version it points to');
    if (c.ipHash !== null && !HEX64.test(c.ipHash)) ledger.error(c.id, 'IP is not stored as a hash');
    if (c.appointmentId) {
      const a = appointmentById.get(c.appointmentId);
      if (!a || a.dataPrincipalId !== c.dataPrincipalId || !a.patientIsMinor || !c.givenByGuardian)
        ledger.error(c.id, 'linked booking is not this person\'s booking for a patient under 18');
    }
  }

  // ---- Notice versions ----
  const noticeCheck = check('Notice versions: stored text unchanged since it was shown');
  for (const n of notices) {
    noticeCheck.count();
    if (crypto.createHash('sha256').update(n.content).digest('hex') !== n.contentHash) noticeCheck.error(n.id, 'text does not match its hash');
    if (!LANGUAGE_CODES.includes(n.language)) noticeCheck.error(n.id, 'unsupported language');
  }

  // ---- Grievances (grievance form; admin response form) ----
  const grievanceCheck = check('Grievances: encrypted, linked or with contact details, due within one month');
  for (const g of grievances) {
    grievanceCheck.count();
    const name = open(grievanceCheck, g.id, 'contactName', g.contactName);
    const contact = open(grievanceCheck, g.id, 'contactDetail', g.contactDetail);
    const description = open(grievanceCheck, g.id, 'description', g.description);
    if (!/^GRV-[A-Z0-9]{8}$/.test(g.referenceNumber)) grievanceCheck.error(g.id, 'reference number has the wrong format');
    if (!description?.trim()) grievanceCheck.error(g.id, 'description missing');
    if (!GRIEVANCE_CATEGORIES.includes(g.category)) grievanceCheck.error(g.id, 'unknown category');
    if (g.verified) {
      if (g.contactName || g.contactDetail) grievanceCheck.error(g.id, 'verified complaint also stores a separate name or contact');
    } else if (!name?.trim() || !(PHONE.test(contact || '') || EMAIL.test(contact || ''))) {
      grievanceCheck.error(g.id, 'unverified complaint without a name and a valid phone or email for the reply');
    }
    if (g.verified && !g.dataPrincipalId) grievanceCheck.error(g.id, 'verified complaint not linked to a person');
    if (!(g.dueDate > g.createdAt && g.dueDate <= addMonths(g.createdAt, 1))) grievanceCheck.error(g.id, 'due date not within one month');
    if (RESOLVED.includes(g.status) && (!g.resolution || !g.resolvedAt)) grievanceCheck.error(g.id, 'closed without a response or time');
    if (!RESOLVED.includes(g.status) && g.resolvedAt) grievanceCheck.error(g.id, 'open but has a resolution time');
  }

  // ---- Rights requests (Data Rights page; admin response form) ----
  const requestCheck = check('Rights requests: linked to the person; only field names or encrypted nominees stored');
  const principalById = new Map(principals.map((p) => [p.id, p]));
  for (const r of requests) {
    requestCheck.count();
    const owner = r.dataPrincipalId && principalById.get(r.dataPrincipalId);
    if (owner && owner.referenceId !== r.identifierProvided) requestCheck.error(r.id, 'identifier differs from the person\'s reference ID');
    if (!['OTP_PHONE', 'OTP_EMAIL'].includes(r.verificationMethod)) requestCheck.error(r.id, 'unknown verification method');
    let payload = null;
    try {
      payload = r.payload ? JSON.parse(r.payload) : null;
      if (r.response) JSON.parse(r.response);
    } catch {
      requestCheck.error(r.id, 'payload or response is not valid JSON');
    }
    if (['CORRECTION', 'COMPLETION', 'UPDATE'].includes(r.type)) {
      const keys = Object.keys(payload || {});
      if (keys.some((k) => k !== 'fields') || !(payload?.fields || []).every((f) => CORRECTABLE.includes(f)))
        requestCheck.error(r.id, 'correction stores more than the names of the changed fields');
    }
    // Erasure clears payload.nominee but keeps the request record.
    if (r.type === 'NOMINATION' && payload?.nominee) {
      const nominee = open(requestCheck, r.id, 'payload.nominee', payload.nominee);
      try {
        const n = nominee && JSON.parse(nominee);
        if (n && (!n.name || !n.relationship || !n.contact)) requestCheck.error(r.id, 'nominee incomplete');
      } catch {
        requestCheck.error(r.id, 'nominee is not valid JSON');
      }
    }
    if (RESOLVED.includes(r.status) && !r.respondedAt) requestCheck.error(r.id, 'closed without a response time');
  }

  // ---- One-time codes (Data Rights sign-in) ----
  const otpCheck = check('One-time codes: stored only as a hash');
  for (const o of otps) {
    otpCheck.count();
    if (!HEX64.test(o.codeHash)) otpCheck.error(o.id, 'code is not stored as a hash');
    if (!['phone', 'email'].includes(o.channel)) otpCheck.error(o.id, 'unknown channel');
    if (!(o.expiresAt > o.createdAt)) otpCheck.error(o.id, 'expires before it was created');
  }

  // ---- Audit log and analytics: no personal data ----
  const logCheck = check('Audit log and analytics: identifiers only, no personal data');
  const phoneLike = /(?<!\d)[6-9]\d{9}(?!\d)/;
  const emailLike = /[^\s@]+@[^\s@]+\.[^\s@]+/;
  for (const l of audits) {
    logCheck.count();
    if (l.ipHash !== null && !HEX64.test(l.ipHash)) logCheck.error(l.id, 'IP is not stored as a hash');
    if (phoneLike.test(l.detail || '') || emailLike.test(l.detail || '')) logCheck.error(l.id, 'detail looks like a phone number or email');
    if (!/^(public|data-principal:DP-[A-Z0-9]{6}|admin:[\w.-]+|system:[\w-]+)$/.test(l.actor)) logCheck.error(l.id, 'unrecognised actor');
  }
  for (const e of events) {
    logCheck.count();
    if (!e.path.startsWith('/') || e.path.includes('?')) logCheck.error(e.id, 'analytics path is not a bare path');
    if (e.referrerOrigin && !/^https?:\/\/[^/]+$/.test(e.referrerOrigin)) logCheck.error(e.id, 'referrer is more than an origin');
  }

  return results;
};

const main = async () => {
  try {
    // Loads .env the same way Next.js does (@next/env ships with next); existing variables win.
    require('@next/env').loadEnvConfig(process.cwd(), false, { info: () => {}, error: console.error });
  } catch {
    // Variables may already be set in the environment.
  }
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const results = await checkData(prisma, { key: process.env.ENCRYPTION_KEY });
    let errors = 0;
    for (const r of results) {
      errors += r.errors.length;
      const state = r.errors.length ? 'ERROR' : r.warnings.length ? 'WARN ' : 'OK   ';
      console.log(`${state} ${r.check} (${r.checked} checked, ${r.errors.length} errors, ${r.warnings.length} warnings)`);
      for (const { id, problem } of [...r.errors, ...r.warnings.map((w) => ({ ...w, problem: `warning: ${w.problem}` }))]) {
        console.log(`        ${id}: ${problem}`);
      }
    }
    console.log(errors ? `\n${errors} problem(s) found.` : '\nNo problems found.');
    process.exitCode = errors ? 1 : 0;
  } finally {
    await prisma.$disconnect();
  }
};

if (require.main === module) {
  main().catch((err) => {
    console.error(`data check failed: ${err.message}`);
    process.exitCode = 2;
  });
}

module.exports = { checkData };
