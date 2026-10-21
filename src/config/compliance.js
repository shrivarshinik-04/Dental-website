/**
 * Compliance configuration: DPDP Act 2023 and DPDP Rules 2025.
 *
 * Every `[PLACEHOLDER]` the clinic owner must fill in lives in this file (see the
 * checklist in README.md). It is imported by the Next.js app and by the cron
 * scripts in /scripts, so it is written as CommonJS on purpose.
 *
 * Nothing in here is secret: it is bundled into the browser. Keys go in .env.
 */

// ---------------------------------------------------------------------------
// Who we are: the Data Fiduciary (s.2(i)).
// ---------------------------------------------------------------------------
const CLINIC = {
  legalName: '[CLINIC LEGAL NAME]',
  tradeName: 'Dental Clinic',
  address: '[REGISTERED ADDRESS, CITY, STATE, PIN]',
  phone: '[CLINIC PHONE]',
  email: '[CLINIC EMAIL]',
  website: '[https://YOUR-DOMAIN.in]'
};

// ---------------------------------------------------------------------------
// s.8(9) + Rule 9: business contact of the person who can answer questions about
// processing. Also acts as the grievance officer for s.13. Must be published
// prominently on the website and quoted in every response to a rights request.
// ---------------------------------------------------------------------------
const CONTACT_PERSON = {
  name: '[CONTACT PERSON NAME]',
  designation: 'Grievance Officer / Data Protection Contact',
  email: '[privacy@YOUR-DOMAIN.in]',
  phone: '[CONTACT PHONE]',
  address: '[POSTAL ADDRESS FOR PRIVACY QUERIES]',
  hours: 'Monday to Saturday, 10am to 6pm IST'
};

// s.13(3): the Data Principal may approach the Board after exhausting our grievance
// mechanism. [CONFIRM] the Board's official complaint URL before going live.
const DATA_PROTECTION_BOARD = {
  name: 'Data Protection Board of India',
  url: '[https://DATA-PROTECTION-BOARD-OFFICIAL-URL]'
};

// ---------------------------------------------------------------------------
// s.16 + Rule 15: where the data is stored and processed.
// ---------------------------------------------------------------------------
const HOSTING = {
  provider: '[HOSTING PROVIDER]',
  location: '[HOSTING REGION, e.g. Mumbai, India]',
  // Set to true if any personal data is stored or processed outside India. Then
  // list the countries in the privacy policy and check them against any
  // restriction notified by the Central Government under s.16(1) / Rule 15.
  crossBorder: false,
  countries: []
};

// s.8(2): Data Processors engaged under a valid contract. Shown on the privacy
// policy and in the s.11(1)(b) access summary.
const PROCESSORS = [
  {
    id: 'hosting',
    name: '[HOSTING PROVIDER]',
    purpose: 'Hosting the website and database',
    dataShared: 'All data described in our privacy notice (stored encrypted)',
    location: '[HOSTING REGION]'
  },
  {
    id: 'sms',
    name: '[SMS / WHATSAPP PROVIDER]',
    purpose: 'Sending one-time codes and, if you opt in, appointment reminders',
    dataShared: 'Phone number, message text',
    location: '[PROVIDER REGION]'
  },
  {
    id: 'email',
    name: '[EMAIL PROVIDER]',
    purpose: 'Sending one-time codes and replies to your requests',
    dataShared: 'Email address, message text',
    location: '[PROVIDER REGION]'
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
  CLINIC,
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
