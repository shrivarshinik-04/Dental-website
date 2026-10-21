/**
 * Organisation, privacy and retention configuration for this test environment.
 *
 * Current law (in force): IT Act 2000 s.43A and the IT (Reasonable Security Practices
 * and Procedures and Sensitive Personal Data or Information) Rules 2011 ("SPDI Rules").
 * DPDP Act 2023 and DPDP Rules 2025: substantive provisions expected from about
 * 13 May 2027 (G.S.R. 843(E); exact day to be confirmed). See docs/audit/02-legal-matrix.md.
 *
 * ALL ORGANISATION DETAILS BELOW ARE FICTITIOUS SAMPLES (IS_SAMPLE = true). While
 * IS_SAMPLE is true, every contact block shows a "Sample details: test environment"
 * badge. Replace the values and set IS_SAMPLE to false only with real, confirmed details.
 *
 * Imported by the Next.js app and by the scripts in /scripts, so written as CommonJS.
 * Nothing here is secret: it is bundled into the browser. Keys go in .env.
 */

const IS_SAMPLE = true;

const HOURS = 'Monday to Saturday, 10am to 2pm and 5pm to 8pm IST';

// Data Fiduciary / body corporate operating the site.
const CLINIC = {
  isSample: IS_SAMPLE,
  legalName: 'Smile Dental Clinic (Sample) Pvt. Ltd.',
  tradeName: 'Smile Dental Clinic (Sample)',
  address: '[Sample address], India',
  phone: '+91 00000 00001',
  email: 'info@smiledental.example.com',
  website: 'https://smiledental.example.com',
  hours: HOURS,
  hoursShort: 'Mon–Sat 10am–2pm, 5pm–8pm'
};

// SPDI Rules 2011, Rule 5(9) (in force): Grievance Officer whose name and contact details
// are published on the website and who redresses grievances within one month.
const GRIEVANCE_OFFICER = {
  isSample: IS_SAMPLE,
  name: 'Dr. A. Sample (Grievance Officer)',
  designation: 'Grievance Officer',
  email: 'grievance@smiledental.example.com',
  phone: '+91 00000 00002',
  address: '[Sample address], India',
  hours: HOURS
};

// DPDP Act s.8(9) + DPDP Rules, Rule 9 (from about May 2027): business contact of a person
// who can answer questions about processing; quoted in every response to a rights request.
// Not a "Data Protection Officer": a DPO is required only for a notified Significant
// Data Fiduciary (s.10).
const PRIVACY_CONTACT = {
  isSample: IS_SAMPLE,
  name: 'R. Sample (Privacy Contact)',
  designation: 'Privacy Contact',
  email: 'privacy@smiledental.example.com',
  phone: '+91 00000 00003',
  address: '[Sample address], India',
  hours: HOURS
};

const APPOINTMENTS_DESK = {
  isSample: IS_SAMPLE,
  name: 'Appointments desk (Sample)',
  email: 'appointments@smiledental.example.com',
  phone: '+91 00000 00004'
};

// Owner of the breach / incident procedure (docs/BREACH-RESPONSE.md). CERT-In Directions
// 2022, direction (ii): report listed incidents to CERT-In within 6 hours of noticing.
const INCIDENT_OWNER = {
  isSample: IS_SAMPLE,
  name: 'S. Sample (Incident Owner)',
  email: 'security@smiledental.example.com',
  phone: '+91 00000 00005'
};

// Kept for existing imports: the person quoted in responses to rights requests.
const CONTACT_PERSON = PRIVACY_CONTACT;

// The Board's official complaint URL could not be verified on MeitY's or the Board's site
// (checked 21 Oct 2026). Leave url empty: the UI then shows
// "Official complaint link to be confirmed" instead of a guessed link.
const DATA_PROTECTION_BOARD = {
  name: 'Data Protection Board of India',
  url: '',
  urlPendingText: 'Official complaint link to be confirmed'
};

// Where the data is stored (DPDP s.16 / Rule 15 from about May 2027; CERT-In log
// location now). Not chosen yet.
const HOSTING = {
  isSample: IS_SAMPLE,
  provider: 'Sample hosting provider (not yet chosen)',
  location: 'India (sample; not yet confirmed)',
  // Set to true, and list the countries, if any personal data is stored or processed
  // outside India.
  crossBorder: false,
  countries: []
};

// Service providers that would receive personal data. None is configured yet; the
// privacy policy and the access summary show `configured: false` as "not yet configured".
// Before configuring one: put a contract in place and update the notice (SPDI Rules 5(3), 6).
const PROCESSORS = [
  {
    id: 'hosting',
    name: HOSTING.provider,
    purpose: 'Hosting the website and database',
    dataShared: 'All data described in our privacy policy (sensitive fields stored encrypted)',
    location: HOSTING.location,
    configured: false
  },
  {
    id: 'sms',
    name: 'SMS / WhatsApp provider (sample)',
    purpose: 'Sending one-time codes for identity verification',
    dataShared: 'Mobile number, message text',
    location: 'Not applicable',
    configured: false
  },
  {
    id: 'email',
    name: 'Email provider (sample)',
    purpose: 'Sending one-time codes and replies to requests',
    dataShared: 'Email address, message text',
    location: 'Not applicable',
    configured: false
  }
];

// ---------------------------------------------------------------------------
// s.5 / Rule 3 notice versioning. Bump NOTICE_VERSION whenever the notice text in
// src/locales/*.json changes: visitors are re-prompted and new consents point to
// the new NoticeVersion row.
// ---------------------------------------------------------------------------
const NOTICE_VERSION = '2026-10-20.1';
const NOTICE_EFFECTIVE_FROM = '2026-10-20';

const POLICY_CHANGELOG = [
  { version: '2026-10-20.1', date: '2026-10-20', change: 'First version, aligned with the DPDP Act 2023 and DPDP Rules 2025.' }
];

// s.5(3) / s.6(3): English plus languages from the Eighth Schedule. Add a locale
// file in src/locales/ and an entry here to support more.
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' }
];
const DEFAULT_LANGUAGE = 'en';

// ---------------------------------------------------------------------------
// Response periods. Rule 14(3): grievances must be answered within the period we
// publish, which may not exceed 90 days.
// ---------------------------------------------------------------------------
const MAX_GRIEVANCE_DAYS = 90;
const GRIEVANCE_RESPONSE_DAYS = Math.min(30, MAX_GRIEVANCE_DAYS);
const RIGHTS_RESPONSE_DAYS = Math.min(30, MAX_GRIEVANCE_DAYS);

// ---------------------------------------------------------------------------
// Retention (s.8(7), Rule 6(1)(e), Rule 8(3)). Used by scripts/retention.js, which
// refuses to delete logs, consent records or request records younger than
// MIN_LOG_RETENTION_DAYS whatever is set here.
// ---------------------------------------------------------------------------
const ONE_YEAR = 365;
const MIN_LOG_RETENTION_DAYS = ONE_YEAR;
const RETENTION = {
  // Booking data is kept this long after the preferred date (or after
  // cancellation/withdrawal) when the visit did not become a clinical record.
  appointmentAfterVisitDays: 30,
  // [CONFIRM WITH COUNSEL] Retention period for appointments marked as part of the
  // clinical record. Confirm against the Dental Council of India / state clinical
  // establishment rules, medico-legal limitation periods and any other law that
  // applies to the clinic. 3 years is a placeholder, not legal advice.
  clinicalRecordDays: 3 * ONE_YEAR,
  // Proof of consent (s.6(10)). Kept after the relationship ends to answer
  // disputes.
  consentRecordDays: 3 * ONE_YEAR,
  // Rule 6(1)(e) + Rule 8(3): logs for at least one year.
  auditLogDays: ONE_YEAR,
  // Closed rights requests and grievances.
  requestRecordDays: 3 * ONE_YEAR,
  // Expired one-time codes.
  otpDays: 1
};

const OTP = {
  ttlMinutes: 10,
  maxAttempts: 5,
  sessionMinutes: 15
};

// Lawful ground for each processing purpose (s.4). Shown on the privacy policy.
const PURPOSES = {
  APPOINTMENT: { ground: 'Consent (s.6)', required: true },
  APPOINTMENT_REMINDERS_SMS_WHATSAPP: { ground: 'Consent (s.6)', required: false },
  MARKETING: { ground: 'Consent (s.6)', required: false },
  FUNCTIONAL_COOKIES: { ground: 'Consent (s.6)', required: false },
  ANALYTICS_COOKIES: { ground: 'Consent (s.6)', required: false }
};

// ---------------------------------------------------------------------------
// Cookie and storage register (cookie policy + withdrawal clean-up).
// `match` is a prefix used to delete the cookie when consent is withdrawn.
// ---------------------------------------------------------------------------
const COOKIES = [
  {
    name: 'dpdp_consent',
    category: 'necessary',
    purpose: 'Remembers your cookie choices and the notice version you saw.',
    duration: '12 months',
    party: 'First-party'
  },
  {
    name: 'dpdp_aid',
    category: 'necessary',
    purpose: 'Random ID that links your cookie choices to our consent log (proof of consent, s.6(10)). Set only after you make a choice.',
    duration: '12 months',
    party: 'First-party'
  },
  {
    name: 'dpdp_rights_session',
    category: 'necessary',
    purpose: 'Keeps you signed in for 15 minutes after you verify a one-time code on the Data Rights page.',
    duration: '15 minutes',
    party: 'First-party'
  },
  {
    name: 'dpdp_minor_session (session storage)',
    category: 'necessary',
    purpose: 'Set when you book for a patient under 18, so no analytics or marketing runs for the rest of the visit.',
    duration: 'Until the tab is closed',
    party: 'First-party'
  },
  {
    name: 'dpdp_lang',
    match: 'dpdp_lang',
    category: 'functional',
    purpose: 'Remembers your preferred language between visits.',
    duration: '12 months',
    party: 'First-party'
  }
  // Example: if you enable an analytics tool, list its cookies here, e.g.
  // { name: '_ga, _ga_*', match: '_ga', category: 'analytics', purpose: '...', duration: '...', party: 'Third-party' }
];

// Pages where analytics/marketing never load, whatever the visitor chose: pages that
// collect health or identity data, and the admin area.
const NO_TRACKING_PATHS = ['/book-appointment', '/data-rights', '/grievance', '/admin'];

// Example analytics integration. Leave `src` empty to load nothing (the default).
// If you set it, add the domain to the CSP in next.config.js and list its cookies above.
const ANALYTICS = {
  src: ''
};

module.exports = {
  IS_SAMPLE,
  CLINIC,
  GRIEVANCE_OFFICER,
  PRIVACY_CONTACT,
  APPOINTMENTS_DESK,
  INCIDENT_OWNER,
  CONTACT_PERSON,
  DATA_PROTECTION_BOARD,
  HOSTING,
  PROCESSORS,
  NOTICE_VERSION,
  NOTICE_EFFECTIVE_FROM,
  POLICY_CHANGELOG,
  LANGUAGES,
  DEFAULT_LANGUAGE,
  MAX_GRIEVANCE_DAYS,
  GRIEVANCE_RESPONSE_DAYS,
  RIGHTS_RESPONSE_DAYS,
  RETENTION,
  MIN_LOG_RETENTION_DAYS,
  OTP,
  PURPOSES,
  COOKIES,
  NO_TRACKING_PATHS,
  ANALYTICS
};
