# 06 — Test results, unresolved issues and evidence checklist (Phase 6)

Date: 21 October 2026. Branch: `fix/dpdpa-audit` (baseline `c503b51`). First written at `8475124`; updated after
the plain-language copy (Task A) and the parent or guardian details (Task B). Deliverables 10 and 11 of
`docs/REQUIREMENTS.md` §16.

This report records what was tested and how. It does not state that the site complies with any law: several
conclusions depend on the legal confirmations listed in §4.

## 1. Checks run

| Check | Command | Result |
|---|---|---|
| Production build | `npm run build` (into `.next-test`) | **Pass**: compiled, no errors or warnings |
| Lint | `npm run lint` (ESLint 8, `next/core-web-vitals`) | **Pass**: 0 problems |
| Type check | — | **Not applicable**: JavaScript project, no TypeScript |
| End-to-end tests | `npm test` (Playwright 1.64.1, production build, synthetic `prisma/test.db`) | **Pass**: 76 passed, 0 failed; stored-data check over every record the run creates: no problems |
| Dependency audit | `npm audit --omit=dev` | **Fail (residual, assessed)**: 5 findings (1 critical, 4 high) in `next`, bundled `postcss`, and the Prisma CLI; none in a feature this site uses (see `docs/SECURITY.md` "Dependency status") |
| Manual: production build over plain HTTP by IP | scratch build, Chromium at `http://<wsl-ip>:3100` | **Pass**: no HTTPS upgrade, styles and scripts load, banner renders |
| Manual: `X-Forwarded-For` spoofing without `TRUST_PROXY` | 7 requests with different spoofed IPs | **Pass**: 6th request rate-limited (429) |

The server log shows occasional `[WebServer] Error: aborted` lines during the run: requests the browser cancelled
on navigation or reload (e.g. in-flight analytics calls). They are not failures.

## 2. Results against REQUIREMENTS §15 and the prompt's §4–§5

Status values as required: Pass · Fail · Not implemented · Not applicable · Needs legal confirmation.

| # | Case | Status | Evidence (test or check) |
|---|---|---|---|
| 1 | Privacy notice visible before consent, readable without JavaScript | Pass | `privacy.spec.js` "notice, policy and contact details are in the server HTML" |
| 2 | Notice accurate for the law in force (SPDI Rules / s.43A) and labels DPDP as future | Pass (content) / **Needs legal confirmation** (legal positions in `02` §C) | same test checks "Laws that apply to us", the Act and Rules by title, "May 2027", no compliance claim |
| 3 | Sample details clearly marked | Pass | same test ("Sample details: test environment"); `crawl.spec.js` |
| 4 | Form data minimisation | Pass | `privacy.spec.js` "booking form collects only the listed fields; the API rejects anything else" |
| 5 | Consent captured with timestamp, purpose, notice version, evidence | Pass | `privacy.spec.js` "booking through the UI …" (ConsentRecord + NoticeVersion with substituted details) |
| 6 | Consent formality for sensitive data ("in writing", SPDI Rule 5(1)) | **Needs legal confirmation** | — |
| 7 | Withdrawal is easy and stops processing | Pass | `rights.spec.js` (withdraw → appointments CANCELLED, WITHDRAWN row); `privacy.spec.js` analytics withdrawal erases events and cookie |
| 8 | Withdrawal propagated to processors | Not applicable (no processor configured); hook **Not implemented** | `src/lib/notify.js` TODO |
| 9 | Optional marketing choices | Not applicable (removed, decision D3; no marketing process exists) | `privacy.spec.js` child test (only the appointment consent box exists) |
| 10 | Optional analytics choice actually gates processing (decision D1) | Pass | `privacy.spec.js` "analytics: off by default …", "server ignores analytics events without current consent" |
| 11 | Rights requests: verify, review, correct, nominate, download, erase | Pass | `rights.spec.js` "rights portal end to end through the UI" |
| 12 | Erasure respects legally required records and explains why | Pass (mechanism) / **Needs legal confirmation** (clinical-record period) | `rights.spec.js` "erasure keeps visits marked as part of the clinical record" |
| 13 | No account enumeration via the OTP request | Pass | `rights.spec.js` "one-time code request does not reveal …" |
| 14 | Returning patient: one reference ID only after verification | Pass | `rights.spec.js` "returning patient keeps one reference ID …" |
| 15 | Grievance with reference and due date within one month (SPDI Rule 5(9)) | Pass | `rights.spec.js` "grievance without a reference ID …" |
| 16 | Retention job deletes expired data; dry run changes nothing | Pass | `security.spec.js` "retention job …" |
| 17 | Retention scheduled | **Not implemented** (owner action; cron/systemd examples in `docs/RETENTION.md`) | — |
| 18 | DPDP Rules 8(3) one-year processing-record hold | **Needs legal confirmation** (option exists, off) | `PROCESSING_RECORD_HOLD` |
| 19 | Security headers | Pass | `security.spec.js` "security headers", "FORCE_HTTPS adds HSTS …" |
| 20 | Input validation and CSRF protection | Pass | `security.spec.js` "input validation …", "cross-site requests are blocked" |
| 21 | Rate limiting | Pass | `security.spec.js` "public endpoints are rate-limited per client" |
| 22 | Admin access boundaries and login throttling | Pass | `admin.spec.js` "access boundaries by role", "failed sign-ins are throttled …" |
| 23 | Staff views and exports audited | Pass | `admin.spec.js` "viewing personal data … is audited", "consent ledger CSV export … audited" |
| 24 | No secrets or database files served | Pass | `security.spec.js` "no secrets or database files are served" |
| 25 | External data flows on first load | Pass (none) | `privacy.spec.js` "first load: no cookies, no browser storage, no third-party requests" |
| 26 | Error handling | Pass | `privacy.spec.js` "error handling …"; `crawl.spec.js` 404 |
| 27 | Child-data safeguards (guardian, no optional choices, analytics off) | Pass (design) / **Needs legal confirmation** (Fourth Schedule exemption; formal verification of guardianship) | `privacy.spec.js` "child safeguards …"; `guardian.spec.js` (5 tests, see row 37) |
| 28 | Incident handling: CERT-In 6-hour clock, procedure, owner | Pass (register and procedure) / **Not implemented** (CERT-In Point of Contact registration, automated detection) | `admin.spec.js` "incident register …"; `docs/BREACH-RESPONSE.md` |
| 29 | Deployment configuration: `FORCE_HTTPS`, `TRUST_PROXY`, `DEMO_MODE` guard | Pass | `security.spec.js` "DEMO_MODE is refused …"; manual HTTP-by-IP check |
| 30 | HTTPS hosting in India, backups, 180-day infrastructure logs | **Not implemented** (no hosting chosen) | `docs/SECURITY.md` "Not implemented" |
| 31 | Every link and button works; no `#` dead ends; no 404s | Pass | `crawl.spec.js` (10 pages, desktop and phone) |
| 32 | Bootstrap JS after client-side navigation, 375px | Pass | `interactions.spec.js` desktop and phone menu tests |
| 33 | Tabs/toggles: keyboard, focus, ARIA, state | Pass | `interactions.spec.js` banner, language, booking, grievance, admin tests |
| 34 | Zero console errors or warnings on every page | Pass | `crawl.spec.js` |
| 35 | Node version pinned, setup documented | Pass | `.nvmrc`, `engines`, README |
| 36 | Public text names laws by title only, with no section, rule or schedule numbers (English and Hindi, every public page, banner, booking form with the child option, rights dashboard, API messages); banner asks again after the notice changes | Pass | `plain-language.spec.js` |
| 37 | Parent or guardian details for a patient under 18: section hidden by default, shown inline for a minor with a polite announcement and focus on the first field, cleared when switched back; keyboard order and 375px; client and server validation with field-level errors; an adult's crafted guardian fields not stored; encrypted at rest; no analytics; consent given by the guardian, linked to the booking, current notice version; one-time code to the guardian's contact; shown, corrected and erased through the rights page; staff views audited | Pass | `guardian.spec.js`; `rights.spec.js` "returning patient …" |
| 38 | Every form validated against its API and the database: required fields, invalid input, consent handling, successful submissions read back from the database (decrypted, field by field) and error responses (400/401/403/405/409), for booking (adult and under 18), cookie banner, rights sign-in, correction, nomination, consent withdrawal, download, erasure, grievance (with and without a reference ID) and the admin appointment, grievance, rights, incident and consent-filter forms | Pass | `forms.spec.js` (25 tests; runs only against the synthetic `prisma/test.db`) |
| 39 | Stored data organised and consistent: every encrypted column holds ciphertext, each booking has its consent row given by the right person, consent rows match their notice language, guardians only on bookings for under-18 patients, corrections log field names only, no personal data in logs | Pass | `npm run data:check` (`scripts/check-data.js`); `data-check.spec.js`; suite teardown over all test data |

## 3. Defect status (`05-bugs.md`)

| Fixed in | Defects |
|---|---|
| `ad631f1` transport | B-09, B-10, B-20 |
| `51a905a` OTP | B-17, B-18 |
| `b61e211` limiter | B-21, B-22 |
| `ce1f53d` server rendering | B-08, B-26 |
| `193b618` sample data | B-05, B-06, B-07 |
| `f94464f` analytics + banner | B-11, B-12, B-13, B-15 |
| `4521e3e` navigation | B-01, B-02, B-03, B-04, B-32 |
| `4441771` accessibility | B-14, B-16 |
| `d8aeebe` admin layout | B-31 |
| `a0445e1` keys | B-23 |
| `880687e` returning patients | B-19 |
| `db0b422` retention | B-27 (documented; scheduling is an owner action) |
| `9bca248` tooling | B-24, B-25 |
| `c989760` dependencies | B-28 |
| `170848e` Next patch | B-30 (partly: residual advisories documented) |
| Open | B-29 (Prisma `package.json#prisma` deprecation: harmless on Prisma 6) |

Found and fixed during Phase 5 (`efc7673`): `/admin` returned 500 for wrong or throttled credentials; duplicate
`consent-notice-title` ids on the booking page.

## 4. Unresolved issues

### Needs legal or organisational confirmation
1. Exact commencement day of the Nov 2026 and May 2027 groups (G.S.R. 843(E) says "one year" / "eighteen months
   from the date of publication").
2. Whether a website checkbox with a stored record satisfies SPDI Rule 5(1) "consent in writing through letter or
   Fax or email" for health information, or an emailed confirmation is needed.
3. Whether the operator is a "body corporate" under IT Act s.43A (and so subject to the SPDI Rules).
4. Booking basis after May 2027: consent vs DPDP s.7(a) legitimate use.
5. Scope of DPDP Rules 8(3) one-year retention for booking data and erasure requests.
6. Fourth Schedule Part A item 1: whether the clinic is a "clinical establishment" (CEA 2010 adoption in the state)
   and a dentist a "healthcare professional" (NCAHP Act 2021 s.2(j)); guardian consent for minors before then.
7. Clinical-record retention period (placeholder 3 years).
8. Data Protection Board official complaint URL (site shows "official complaint link to be confirmed").
9. Real organisation details, Grievance Officer, privacy contact, hosting and processors (all samples now).
10. Professional review of the Hindi text, including the rewritten notice and the new guardian strings
    (`booking.guardian*`, `rights.contactHint`, `rights.fields.guardian*`); policy pages are English only.
11. **Formal verification of guardianship.** The form takes the guardian's declaration only: no date of birth, ID
    documents or proof of guardianship are collected (by design, to collect as little as possible). Whether a
    declaration is enough, or whether the clinic must verify guardianship (DPDP Rule 10 "verifiable consent", from
    about May 2027; or at the clinic on the day of the visit), needs legal confirmation.

### Technical, not implemented in this phase
12. No SMS/email provider: production verification relies on `DEMO_MODE` with `ALLOW_DEMO_IN_PROD`, which is only
    acceptable in a closed test environment with synthetic data.
13. Processor stop/erase hooks are documented TODOs (no processor exists).
14. Hosting: HTTPS, India region, backups and restore tests, 180-day infrastructure logs, NTP, CERT-In Point of
    Contact registration, log forwarding and alerting.
15. Next.js 15.5 / Prisma 7 upgrades to clear the residual `npm audit` findings.
16. Rate limiting is in-memory (single instance); a shared store is needed for more than one instance.
17. Admin authentication is HTTP Basic with role checks and throttling; no MFA or SSO.
18. Unverified grievances (no reference ID) are accepted without verification (rate-limited).
19. Legacy `APPOINTMENT_REMINDERS_SMS_WHATSAPP` / `MARKETING` enum values remain so older ledger rows stay readable.
20. Template marketing copy (e.g. Lorem ipsum in the home Services section, "10 Years of Dental Excellence") is
    unchanged sample content.
21. **`prisma/dev.db` contains one record created through the form by a person after the previous agent's tests;
    it may be real personal data.** Reset it yourself with `npx prisma migrate reset` (not run by the agent).
22. No booking confirmations are sent automatically (no SMS or email provider). For a patient under 18, staff see
    the guardian's mobile and email in `/admin/appointments` and use them; one-time codes for the rights page go to
    the guardian's contact.

## 5. Evidence checklist for the Zycato assessment (deliverable 11)

| Control | Where to see it | File(s) | Database table / log |
|---|---|---|---|
| Law in force vs future provisions | `/privacy-policy` "Laws that apply to us" and "What changes in 2027" | `pages/privacy-policy.jsx`; `docs/audit/02-legal-matrix.md` | — |
| Notice before consent (itemised data, purpose, recipients, choices, contacts) | `/book-appointment` (also without JavaScript) | `src/components/ConsentNotice.jsx`, `src/locales/en.json`, `hi.json` | `NoticeVersion` (text + substituted details + hash) |
| Notice versioning | Policy change log; `/admin/consents` notice column | `src/config/compliance.js` (`NOTICE_VERSION`, `POLICY_CHANGELOG`) | `NoticeVersion`, `ConsentRecord.noticeVersionId` |
| Language option (English + Hindi) | Language switcher on banner and forms | `src/lib/i18n.js` | `ConsentRecord.language` |
| Consent capture (unticked, single required purpose) | `/book-appointment` | `pages/book-appointment.jsx`, `pages/api/appointments.js` | `ConsentRecord` (channel `APPOINTMENT_FORM`) |
| Consent evidence export | `/admin/consents` → Export CSV | `pages/api/admin/consents-export.js` | `ConsentRecord`; `AuditLog` (EXPORT) |
| Withdrawal and its effect | `/data-rights` → Withdraw; footer "Cookie settings" → Reject all | `pages/api/rights/consent.js`, `pages/api/consent.js`, `src/lib/analytics.js` | `ConsentRecord` (WITHDRAWN), `Appointment.status` CANCELLED, `AnalyticsEvent` erased, `AuditLog` |
| Cookie and storage register | `/cookie-policy` | `src/config/compliance.js` (`COOKIES`) | Browser: `dpdp_consent`, `dpdp_aid`, `dpdp_lang`, `dc_vid` |
| Consent-gated analytics | Banner "Analytics" toggle; `/admin/analytics` | `public/js/analytics.js`, `pages/api/analytics.js`, `src/lib/consentStore.js` | `AnalyticsEvent` |
| No third-party requests | Browser network tab on first load | `next.config.js` (CSP), `pages/_app.jsx` (self-hosted fonts) | — |
| Grievance Officer and privacy contact | Footer contact block on every page; `/contact` | `src/components/ContactBlock.jsx`, `src/config/compliance.js` | — |
| Grievance redressal (one month) | `/grievance`; `/admin/grievances` (SLA countdown) | `pages/api/grievances.js`, `src/lib/deadlines.js` | `Grievance.dueDate`, `escalationNote` |
| Review, correction, erasure, nomination, download | `/data-rights` (with `DEMO_MODE` in the test environment) | `pages/api/rights/*`, `src/lib/rights.js` | `RightsRequest`, `DataPrincipal.erasedAt`, `AuditLog` |
| Identity verification | `/data-rights` step 1 | `pages/api/rights/request-otp.js`, `verify-otp.js`, `src/lib/rightsSession.js` | `OtpChallenge` (hash only), `AuditLog` (OTP_SENT, VERIFIED) |
| Data minimisation and validation | Booking form fields | `src/lib/validation.js` | — |
| Encryption at rest | — | `src/lib/crypto.js` | `DataPrincipal`, `Appointment`, `Grievance` columns start with `v1:` |
| Access control and least privilege | `/admin` as `admin` vs `reception` | `src/lib/adminAuth.js`, `src/lib/adminGuard.js`, `middleware.js` | `AuditLog` (READ, UPDATE, EXPORT) |
| Security headers | Response headers of any page | `next.config.js`, `src/lib/env.js` | — |
| Retention | `docs/RETENTION.md` | `scripts/retention.js`, `RETENTION` in config | `AuditLog` (RETENTION_RUN, DELETE) |
| Incident handling | `/admin/breaches`; `docs/BREACH-RESPONSE.md` | `src/lib/breach.js` | `BreachIncident` (`certInReportedAt`, deadlines) |
| Children: parent or guardian details | `/book-appointment` → "under 18? Yes"; `/data-rights` (sign in with the guardian's contact); `/admin/appointments` | `pages/book-appointment.jsx`, `src/components/GuardianFields.jsx`, `src/lib/validation.js` (`appointmentSchema`), `src/lib/rights.js` (`contactsFor`), `src/lib/consentStore.js` | `Appointment.patientIsMinor`, `guardianName`, `guardianRelationship`, `guardianPhone`, `guardianEmail` (encrypted); `ConsentRecord.givenByGuardian`, `appointmentId`; `AuditLog` entity `GuardianDetails` (READ) |
| Plain-language public text | Any public page, in English and Hindi | `pages/privacy-policy.jsx`, `src/locales/*.json` (citations kept in code comments and `docs/`) | — |
| Third parties and processors | `/privacy-policy` §5 ("not yet configured") | `docs/audit/04-third-parties.md`, `PROCESSORS` in config | — |
| Sample-data disclosure | Badge beside every contact block | `src/components/SampleBadge.jsx` | `NoticeVersion.content.vars.isSample` |
| Test evidence | `npm test` output; `test-results/results.json` | `tests/e2e/*.spec.js`, `playwright.config.js` | synthetic `prisma/test.db` |
