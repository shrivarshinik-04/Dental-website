# 07 — Proposed implementation plan (Phase 3, for approval)

Deliverables 7 and 8 of `docs/REQUIREMENTS.md` §16: changes prioritised by risk and dependency, files to modify,
new files, and dependency changes with reasons. Based on `01`–`05` in this folder. **Nothing here is implemented
until approved.** Decisions D1–D5 (section 4) change the scope of some items; both branches are described.

Ground rules for Phase 4 (from the prompt and REQUIREMENTS §2):
- Small commits on `fix/dpdpa-audit`, one concern each; messages describe the change and never claim compliance.
- No `prisma migrate reset`, no deletion of `prisma/dev.db`; schema changes are additive or drop only empty tables,
  via new migrations (`prisma migrate dev --name …`). You run any reset yourself.
- Synthetic data only in tests. No secret values printed or committed.
- UI and docs label every DPDP provision as **commencing on or about 13 May 2027 (date to be confirmed)** and cite
  the SPDI Rules / IT Act s.43A / CERT-In for current obligations.

## 1. Changes by priority

Columns: **Risk** (H/M/L) · **Basis** (layer and requirement; see `02-legal-matrix.md`) · **Defects** (`05-bugs.md`).

### P1 — current-law exposure, broken collection points, security (do first)

| ID | Change | Risk | Basis | Defects | Files modified | New files |
|---|---|---|---|---|---|---|
| P1.1 | **Server-render page content.** Render `<Component>` during SSR; keep the loader as a CSS overlay removed on mount; per-page `<title>` appears in server HTML | H | SPDI Rules 4, 5(3), 5(9) (now): policy, notice and contact must be visible | B-08, B-26 | `pages/_app.jsx`, `src/theme/ThemeProvider.jsx` | — |
| P1.2 | **Sample organisation data + badge.** All organisation details in `src/config/compliance.js` with `isSample: true` and clearly fictitious values: "Smile Dental Clinic (Sample) Pvt. Ltd.", "[Sample address], India", `@smiledental.example.com` addresses, `+91 00000 0000x` numbers, "Dr. A. Sample (Grievance Officer)", "R. Sample (Privacy Contact)", appointments desk, hosting (sample), SMS/email "not yet configured", grievance period 30 days. A `SampleBadge` ("Sample details: test environment") renders beside every contact block while `isSample` is true. Topbar, mobile menu, footer and hero read from config; remove Lorem ipsum, the US address, `company@gmail.com` and the "SEO-optimized template" copy | H | SPDI 5(9) (now); REQUIREMENTS §4D; prompt §5 | B-06, B-07 | `src/config/compliance.js`, `src/components/ContactBlock.jsx`, `Topbar.jsx`, `Navbar.jsx`, `Footer.jsx`, `Hero.jsx` | `src/components/SampleBadge.jsx` |
| P1.3 | **Rewrite legal text by layer.** Privacy policy restructured: (a) "Current law" — IT Act s.43A, SPDI Rules 3–5, 8; Grievance Officer with one-month redress; CERT-In; (b) "DPDP Act 2023 and Rules 2025 — expected to apply from about 13 May 2027 (date to be confirmed)" — rights, Board, children, breach notice, 90-day ceiling. Remove unsupported claims (backups; processors under contract; processors instructed on withdrawal). Board link replaced by text "Official complaint link to be confirmed". Same treatment in the notice, grievance page, grievance API escalation note, locales (en + hi). README and `docs/SECURITY.md`: remove compliance language ("a clinic needs", "how this site meets"); describe controls as implemented, not as compliance | H | SPDI Rule 4 (now); REQUIREMENTS §2, §3 | B-05; `02` D.1, D.2 | `pages/privacy-policy.jsx`, `pages/cookie-policy.jsx`, `pages/grievance.jsx`, `pages/api/grievances.js`, `src/components/ConsentNotice.jsx`, `src/locales/en.json`, `src/locales/hi.json`, `README.md`, `docs/SECURITY.md` | — |
| P1.4 | **HTTPS only when asked.** `upgrade-insecure-requests` and HSTS only when `NODE_ENV=production` **and** `FORCE_HTTPS=true`; the cookie `Secure` flag follows the same flag | H | Test-environment usability; SPDI Rule 8 (secure transport when deployed with TLS) | B-09, B-10 | `next.config.js`, `src/lib/http.js`, `src/lib/i18n.js`, `.env.example` | — |
| P1.5 | **Trusted proxy.** Use `X-Forwarded-For` only when `TRUST_PROXY=true`, otherwise the socket address; fixes rate-limit bypass and falsified IP hashes in consent evidence | H | SPDI Rule 8 (now) | B-20 | `src/lib/http.js`, `.env.example` | — |
| P1.6 | **Admin brute-force throttle + swappable limiter.** Extract the limiter behind `createRateLimiter({ store })` (in-memory store by default, documented single-instance limitation); throttle failed Basic-auth attempts per IP in middleware (e.g. 10 / 15 min → 429) | H | SPDI Rule 8 (now) | B-21, B-22 | `middleware.js`, `src/lib/http.js` | `src/lib/rateLimit.js` |
| P1.7 | **`DEMO_MODE` for OTP.** `DEMO_MODE=true` shows the code on screen in a box labelled "Test environment — code shown because DEMO_MODE is on". Server refuses to start demo mode when `NODE_ENV=production` unless `ALLOW_DEMO_IN_PROD=true` (startup check + per-request guard). Codes are never logged. The challenge row is created only after a successful send; otherwise a clear 503 "verification is not available" message | H | REQUIREMENTS §7 (proportionate verification); prompt §4 | B-17, B-18 | `src/lib/notify.js`, `pages/api/rights/request-otp.js`, `src/components/VerifyIdentity.jsx`, `README.md`, `.env.example` | `src/lib/env.js` (env validation) |
| P1.8 | **Grievance deadline = one month.** Due date = earlier of 30 days and one calendar month from receipt; shown on the confirmation page and admin SLA | M | SPDI Rule 5(9) (now) | `02` E-10 | `pages/api/grievances.js`, `src/config/compliance.js` | — |
| P1.9 | **Patch Next.js** to 14.2.35 (fixes 5 advisories); run `npm audit fix` for non-breaking transitive fixes; record residual advisories with applicability (image optimizer confirmed disabled: `/_next/image` returns 404) | H | SPDI Rule 8 (now) | B-30 | `package.json`, `package-lock.json`, `docs/SECURITY.md` | — |
| P1.10 | **Breach handling** — per decision D2. Either way: a written procedure covering detection, owner, containment, evidence, **CERT-In report within 6 hours** (now), and DPDP Rule 7 notices (from May 2027) | H | CERT-In Directions (ii) (now); REQUIREMENTS §10 | `02` D.3 | D2-dependent (§4) | `docs/BREACH-RESPONSE.md` |

### P2 — decorative controls and collection-point honesty

| ID | Change | Risk | Basis | Files modified | New files |
|---|---|---|---|---|---|
| P2.1 | **Cookie banner** per decision D1 (Option A or B). In both cases fix the mobile wall (banner below the offcanvas, compact on mobile), reserve page space so the footer stays clickable, and add a visible keyboard focus style | H | REQUIREMENTS §4C, §5 | D1-dependent; `src/styles/style.css` | — |
| P2.2 | **Reminder and marketing consents** per decision D3 | M | SPDI 5(5); REQUIREMENTS §5 | D3-dependent | — |
| P2.3 | **Navigation** per decision D4: every nav/footer link goes to a real page or anchor, or is removed; Services dropdown toggle becomes a `<button>`; branded 404 page | H | REQUIREMENTS §4 (prompt §4) | `src/components/Navbar.jsx`, `DropdownToggleLink.jsx`, `Footer.jsx`, `src/data.js` | `pages/404.jsx` (+ D4 pages) |
| P2.4 | **Processor statements**: `PROCESSORS` entries carry `configured: false`; policy and access summary show "not yet configured"; `instructProcessors` stays a documented TODO with no UI claim | M | SPDI 5(3), Rule 6 | `src/config/compliance.js`, `pages/privacy-policy.jsx`, `src/lib/rights.js`, locales | — |

### P3 — correctness, data model, accessibility, tooling

| ID | Change | Risk | Files modified | New files |
|---|---|---|---|---|
| P3.1 | **Retention**: label `RETENTION` items by legal source; add `minimumHoldDays: 365` for May 2027 Rule 8(3)/Rule 6(1)(e) as a configurable hold (restricted, not deleted; **needs legal confirmation**, off until confirmed); erasure responses never promise immediate deletion from backups; cron and systemd examples | M | `src/config/compliance.js`, `scripts/retention.js`, `src/lib/rights.js`, `docs/SECURITY.md` | `docs/RETENTION.md` |
| P3.2 | **Returning patients**: optional "I have a reference ID" on the booking form → OTP → booking attaches to the existing principal; no merge on an unverified match | M | `pages/book-appointment.jsx`, `pages/api/appointments.js`, `src/lib/rightsSession.js` | — |
| P3.3 | **Nomination** per decision D5 (merge into `RightsRequest` payload; migration drops the empty `Nomination` table) | L | `prisma/schema.prisma`, `pages/api/rights/nominate.js`, `src/lib/rights.js`, `pages/admin/nominations.jsx` | `prisma/migrations/<ts>_merge_nomination/` |
| P3.4 | **Accessibility**: hamburger `aria-controls`/`aria-expanded`/Esc; `role="switch"`; `:focus-visible` outlines; booking radio `aria-invalid` | M | `Navbar.jsx`, `CookieConsent.jsx`, `book-appointment.jsx`, `src/styles/style.css` | — |
| P3.5 | **Console warnings**: logo image aspect ratio | L | `Navbar.jsx`, `Footer.jsx` | — |
| P3.6 | **Admin layout**: `/admin/*` without the public header, footer and banner | L | `pages/_app.jsx`, `src/components/AdminLayout.jsx` | — |
| P3.7 | **Separate OTP key**: derive OTP and session keys via HKDF from `SESSION_SECRET` (no new env var needed) | L | `src/lib/crypto.js`, `src/lib/rightsSession.js`, `pages/api/rights/*otp.js` | — |
| P3.8 | **Node & tooling**: `.nvmrc` (20), `"engines": {"node": ">=18"}`, ESLint config, README setup for Node via nvm, apt (NodeSource) or behind a corporate proxy (`npm config set proxy/https-proxy`, `NODE_EXTRA_CA_CERTS`), and `NEXT_TELEMETRY_DISABLED`/`CHECKPOINT_DISABLE` | M | `package.json`, `README.md` | `.nvmrc`, `.eslintrc.json` |
| P3.9 | Remove unused `plyr-react` CSS import and package; delete unused `FigureImage.jsx` | L | `pages/_app.jsx`, `package.json` | — |

### P4 — tests (Phase 5)

| ID | Change | New files |
|---|---|---|
| P4.1 | Playwright config with a `webServer` that builds and starts the app in `DEMO_MODE` against a separate SQLite test database (`file:./test.db`, never `dev.db`); synthetic data only | `playwright.config.js`, `tests/e2e/helpers.js`, `.env.test.example` |
| P4.2 | Link crawl from home: every internal link returns 200; zero console errors **and warnings** on every page | `tests/e2e/crawl.spec.js` |
| P4.3 | Interaction test: every button, tab, toggle, dropdown and the offcanvas at 375px and 1280px, incl. keyboard (Tab/Enter/Space/Esc) and `aria-*` state | `tests/e2e/interactions.spec.js` |
| P4.4 | REQUIREMENTS §15 cases: notice visibility (incl. server HTML without JS); form minimisation; consent capture and evidence; withdrawal stops processing; optional marketing; rights requests (access, correct, erase, nominate, download); retention job (dry run against the test DB); security headers (with and without `FORCE_HTTPS`); validation; admin access boundaries and throttle; first-load external requests; error handling; minor safeguards; build | `tests/e2e/privacy.spec.js`, `tests/e2e/rights.spec.js`, `tests/e2e/admin.spec.js`, `tests/e2e/security.spec.js` |
| P4.5 | `npm test` script; results recorded as Pass / Fail / Not implemented / Not applicable / Needs legal confirmation in `docs/audit/06-results.md`, with the Zycato evidence checklist | `docs/audit/06-results.md` |

## 2. Dependency changes (reason required by REQUIREMENTS §2)

| Package | Change | Type | Reason |
|---|---|---|---|
| `next` | 14.2.30 → **14.2.35** | runtime, patch | Fixes 5 advisories (incl. 2 high DoS). No API change |
| transitive (`immutable`, `nanoid`, `source-map-js`) | `npm audit fix` (non-breaking only) | transitive | Known high advisories with semver-compatible fixes |
| `eslint`, `eslint-config-next@14` | add | dev | `npm run lint` currently cannot run (B-24); REQUIREMENTS §15 asks to run lint |
| `@playwright/test` | add | dev | Phase 5 browser tests (prompt §6). Browsers installed per machine, not committed |
| `plyr-react` | remove | runtime | Unused; reduces surface (optional, P3.9) |
| **Not proposed:** `next@15.5.x`, `prisma@7` | — | major | Major upgrades risk breaking the template (REQUIREMENTS §2: don't replace the framework). Residual advisories documented with applicability: App Router, Server Actions, rewrites, i18n middleware and the image optimizer are not used; Prisma advisories affect the CLI config loader, not runtime queries |

No new runtime dependency is added. Option B of D1 would add a self-hosted analytics script, not an npm package
(see §4).

## 3. Commit order (dependency-aware)

1. P1.4, P1.5 (transport and IP) → 2. P1.7 + `env.js` → 3. P1.6 → 4. P1.1 → 5. P1.2 → 6. P1.3 + P2.4 →
7. P1.8 → 8. P1.9 (dependency commit on its own) → 9. D1/P2.1 → 10. D2/P1.10 → 11. D3/P2.2 → 12. D4/P2.3 →
13. P3.x (one commit each) → 14. P4 tests → 15. `06-results.md`.
Each commit: build passes; the affected flow is checked manually before moving on.

## 4. Decisions required

| ID | Question | Options | Recommendation | Files affected |
|---|---|---|---|---|
| **D1** | Cookie banner | **A.** Replace with an essential-only notice: a short footer line plus a "Cookie settings" link to the cookie policy, which states that only strictly necessary cookies are used. Language becomes session-only (no optional cookie). Remove anonymous cookie consent rows (`/api/consent`, `dpdp_aid`, cookie `ConsentRecord`s), `ConsentGate`, `ConsentedScript`. **B.** Keep the banner and add a real, self-hosted, first-party analytics script (e.g. a small page-view counter served from `/api/metrics` storing aggregate counts only) loaded only via `loadScriptIfConsented`, so the toggle demonstrably starts and stops real processing; remove the unused "Marketing" category | **A**, unless the Zycato test needs a consent-gated tracker | A: `CookieConsent.jsx` → `CookieNotice.jsx`, `consentStore.js`, `i18n.js`, `Layout.jsx`, `Footer.jsx`, `cookie-policy.jsx`, `pages/api/consent.js` (delete), `ConsentGate.jsx` (delete), config `COOKIES`. B: `CookieConsent.jsx`, `consentStore.js`, `public/js/metrics.js`, `pages/api/metrics.js`, `next.config.js` |
| **D2** | Breach module | **Connect:** keep the admin register, add a named owner (from config), a 6-hour CERT-In clock alongside the 72-hour DPDP clock (labelled May 2027), a CERT-In report draft, and link it to `docs/BREACH-RESPONSE.md`. **Remove:** delete the admin page, API, `src/lib/breach.js` and the `BreachIncident` table (0 rows); keep only the written procedure | **Remove**, unless the test environment will exercise an incident drill through the admin UI | Connect: `pages/admin/breaches.jsx`, `src/lib/breach.js`, `BreachForm.jsx`. Remove: those files + `pages/api/admin/breaches.js`, schema migration |
| **D3** | Reminder (SMS/WhatsApp) and marketing consents on the booking form | **Remove** both until a real process exists (only the required consent remains). **Keep:** show each patient's current reminder/marketing status on `/admin/appointments` and in the CSV export, and document a manual process that must check it before any send | **Remove** (nothing processes them; REQUIREMENTS §5 forbids decorative consent) | `book-appointment.jsx`, `api/appointments.js`, `validation.js`, locales, `RightsDashboard.jsx`, `privacy-policy.jsx` |
| **D4** | Nav items with no page (About Us, Gallery, Contact Us, Sitemap, 8 services) | **Create** minimal pages: About (template text), Contact (sample details from config), a Services page with an anchor per service, Sitemap; drop Gallery (no images). **Remove** the dead items and point "Services" to the home Services section | **Create** (keeps the template's navigation; small static pages, no data collection) | `Navbar.jsx`, `Footer.jsx`, `src/data.js`; Create adds `pages/about.jsx`, `pages/contact.jsx`, `pages/services.jsx`, `pages/sitemap.jsx` |
| **D5** | Nomination table | **Merge** into `RightsRequest` (type NOMINATION, encrypted payload) or **keep** | **Merge** (0 rows; one less table) | see P3.3 |

## 5. Items that stay open after implementation (need legal or organisational confirmation)

1. Exact commencement day of the Nov 2026 and May 2027 groups (13th or 14th).
2. Whether a website checkbox (with a stored record) meets SPDI Rule 5(1) "consent in writing through letter or
   Fax or email", or an emailed confirmation is needed.
3. Whether the operator is a "body corporate" under IT Act s.43A.
4. Scope of the one-year retention in DPDP Rule 8(3) for booking data and erasure requests (from May 2027).
5. Fourth Schedule Part A item 1: whether the clinic is a "clinical establishment" (CEA 2010 adoption in the state)
   and a dentist a "healthcare professional" (NCAHP Act 2021 s.2(j)); guardian consent for minors before then.
6. Clinical-record retention period.
7. Data Protection Board official complaint URL.
8. Real organisation details, hosting region, processors and contracts (all sample values until then).

## 6. Decisions recorded (21 Oct 2026)

| ID | Decision | Resulting scope |
|---|---|---|
| D1 | **B — keep the banner with a real analytics script** | Categories become **Strictly necessary**, **Functional** (`dpdp_lang`) and **Analytics**; "Marketing" is removed (D3). New first-party analytics: `public/js/analytics.js` (self-hosted, same origin, loaded only through `loadScriptIfConsented('analytics', …)`) sets cookie `dc_vid` (random ID, 12 months, analytics category) and sends page path, timestamp and referrer origin to `POST /api/analytics`. Stored in a new `AnalyticsEvent` table (visitor ID, path, referrer origin, timestamp; **no IP, no user agent**), retained 90 days by the retention job. Never runs on `NO_TRACKING_PATHS` or in a minor's session. **Withdrawal** deletes `dc_vid`, stops the script (page reload) and calls `DELETE /api/analytics` to erase that visitor's events. Admin page `/admin/analytics` shows aggregate counts only. Cookie register, cookie policy, notice and CSP (`connect-src 'self'` already sufficient) updated. Consent rows for the banner stay (they now evidence consent to real processing) |
| D2 | **Connect the breach module** | Keep the admin register; add `INCIDENT_OWNER` (sample) in config, a **6-hour CERT-In clock** (now) beside the 72-hour DPDP Rule 7 clock (labelled "from May 2027"), a CERT-In report draft (incident type per Annexure I, time noticed, systems, contact), a `certInReportedAt` field (additive migration), and links to `docs/BREACH-RESPONSE.md`, which names the owner, escalation steps and evidence preservation |
| D3 | **Remove reminder and marketing consents** | Booking form keeps only the required appointment consent; purposes `APPOINTMENT_REMINDERS_SMS_WHATSAPP` and `MARKETING` removed from the form, API, validation, locales, rights dashboard and policy. Enum values are kept so existing ledger rows remain readable (no destructive migration) |
| D4 | **Create minimal pages** | `pages/about.jsx`, `pages/contact.jsx` (sample details from config, no form), `pages/services.jsx` (one anchor per service), `pages/sitemap.jsx`; Gallery removed from nav and footer; every nav/footer item gets a real `href` |
| D5 | Not answered — default **merge Nomination into RightsRequest** (P3.3) unless you object | — |

Dependency impact of the decisions: none (the analytics script is local code, not a package).
