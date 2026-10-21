# 01 — Architecture, stack and data-flow inventory (Phase 1, read-only)

Audit date: 21 October 2026. Branch audited: `baseline/previous-agent` (commit `c503b51`), which snapshots the
previously uncommitted work. Governing spec: `docs/REQUIREMENTS.md`.

Every item is labelled **[T]** (original template, commit `ae53633`) or **[A]** (added or changed by the previous
agent, i.e. the uncommitted prototype now in `c503b51`). Evidence is file:line or an observation from the Phase 1
crawl (Playwright/Chromium against `next dev` on :3000 and a clean `next build && next start` copy of HEAD).

This document describes what exists. It does not assert that any control is legally sufficient.

---

## 1. Summary

| Question (REQUIREMENTS §14) | Finding |
|---|---|
| Framework / router | Next.js 14.2.30, **Pages Router** (`pages/`), React 18.3.1, JavaScript only (no TypeScript) [T] |
| Did the original template have forms, a backend or a database? | **No.** One page (`pages/index.jsx`), no forms, no API routes, no DB [T] |
| Does the current tree have a database? | **Yes [A]:** Prisma 6.19.3 + SQLite file `prisma/dev.db` (gitignored). Actively used by 19 API routes, 7 admin pages, the seed and the retention script |
| Does `dev.db` hold data? | Yes: 7 DataPrincipal, 6 Appointment, 66 ConsentRecord, 8 RightsRequest, 2 Grievance, 91 AuditLog, 2 NoticeVersion. Six principals are synthetic test rows from the previous agent; **one was created later by a person using the form and cannot be confirmed synthetic** — treat the file as containing personal data |
| Authentication | [A] HTTP Basic auth for `/admin`, `/api/admin` (`middleware.js:21`), PBKDF2 hashes in env `ADMIN_USERS`, 3 roles (`src/lib/adminAuth.js`); OTP session cookie for the rights portal |
| Deployment / hosting config | **None.** No Dockerfile, `vercel.json`, Procfile, `.github/` workflows, `.nvmrc`, or `engines` field. Hosting location is unknown (placeholder in `src/config/compliance.js`) |
| CI/CD | None |
| Lint / type checks | `npm run lint` (`next lint`) stops at an **interactive ESLint setup prompt** — no ESLint config or dependency. No TypeScript, so no type check |
| Build | `next build` succeeds (verified on a clean `git archive` copy) |
| Runtime external requests | **None** observed on any public page (crawl at 1280px and 375px) |
| Server-side rendering | **Broken by the template:** `pages/_app.jsx:35,69` renders only `<div class="page-loader">` until client mount, so the server HTML of every page contains no content and the template `<title>` (§9) [T] |

## 2. Dependencies (`package.json`)

| Package | Version installed | Origin | Used by | Notes |
|---|---|---|---|---|
| next | 14.2.30 (range `^14.2.14`) | T | everything | **Critical/high advisories** (npm audit, §8). 14.x is no longer the supported line |
| react, react-dom | 18.3.1 | T | everything | |
| bootstrap | 5.3.7 | T | SCSS + `import('bootstrap')` in `pages/_app.jsx` | JS loaded dynamically on mount |
| @popperjs/core | 2.11.8 | T | not imported directly | Peer of Bootstrap dropdowns |
| animate.css | 4.1.1 | T | `pages/_app.jsx` | |
| plyr-react | 5.3.0 | T | only its CSS is imported (`pages/_app.jsx`) | **Unused component library**; no video player exists |
| prop-types | 15.8.1 | T | `FigureImage.jsx`, `Counter.jsx` | |
| react-countup | 6.5.3 | T | `Services.jsx`, `Counter.jsx` | |
| sass | 1.89.2 (dev) | T | SCSS build | |
| @prisma/client, prisma (dev) | 6.19.3 | A | DB access | High advisories via `@prisma/config`/`deepmerge-ts` (fix only in a major version) |
| zod | 4.6.7 | A | `src/lib/validation.js`, admin APIs | |
| @fontsource/lato, merriweather, manrope, noto-sans-devanagari | 5.3.0 | A | `pages/_app.jsx` | Self-hosting replaced Google Fonts (template loaded fonts.googleapis.com in `_document.jsx` and via `@import` in `_reboot.scss`) |

`npm audit --omit=dev` (21 Oct 2026): **8 vulnerabilities — 1 critical, 7 high** (`next`, `postcss` via next,
`prisma`/`@prisma/config`/`deepmerge-ts`, `immutable` via sass, `nanoid`, `source-map-js`). Detail and applicability:
`05-bugs.md` B-30.

## 3. Pages and routes

### Public pages
| Route | File | Origin | Purpose | Collects personal data? |
|---|---|---|---|---|
| `/` | `pages/index.jsx` | T (Hero/Tiles edited by A) | Marketing home: Hero, Services/Tiles, Facts | No |
| `/book-appointment` | `pages/book-appointment.jsx` | A | Appointment request form + notice + consents | **Yes** (§6) |
| `/privacy-policy` | `pages/privacy-policy.jsx` | A | Privacy policy (English only) | No |
| `/cookie-policy` | `pages/cookie-policy.jsx` | A | Cookie table generated from `COOKIES` config | No |
| `/data-rights` | `pages/data-rights.jsx` | A | OTP verification + rights dashboard | **Yes** |
| `/grievance` | `pages/grievance.jsx` | A | Grievance form (verified or unverified) | **Yes** |
| 404 | Next default | — | `public/img/404.webp` exists [T] but no `pages/404.jsx` uses it | — |

Pages linked from nav/footer that **do not exist**: About Us, Gallery, Contact Us, Sitemap, and all 8 service pages
(`05-bugs.md` B-01..B-03).

### Admin pages [A] (Basic auth + role check, `getServerSideProps`)
`/admin` (overview counts), `/admin/appointments`, `/admin/consents` (+ CSV export), `/admin/rights`,
`/admin/grievances`, `/admin/nominations`, `/admin/breaches`. Every data page writes one `AuditLog` READ row per
record shown (`src/lib/adminData.js`).

### API routes [A] (all under `pages/api/`)
| Route | Method | Auth | Writes |
|---|---|---|---|
| `appointments` | POST | public, same-origin, 5/15 min/IP | DataPrincipal, Appointment, ConsentRecord×2–3, AuditLog |
| `consent` | POST | public, same-origin, 30/10 min | ConsentRecord×3, AuditLog×3; sets cookies `dpdp_aid`, `dpdp_consent` |
| `grievances` | POST | public or rights session, 5/h | Grievance, AuditLog |
| `rights/request-otp` | POST | public, 5/15 min | OtpChallenge, AuditLog; sends OTP (stub) |
| `rights/verify-otp` | POST | public, 10/15 min | OtpChallenge, AuditLog; sets `dpdp_rights_session` |
| `rights/session` | GET | cookie | none |
| `rights/me`, `rights/download` | GET | rights session | RightsRequest(ACCESS), AuditLog |
| `rights/correct`, `consent`, `erase`, `nominate` | POST | rights session, same-origin | DataPrincipal / ConsentRecord / Appointment / Nomination, RightsRequest, AuditLog |
| `rights/logout` | POST | — | clears cookie |
| `admin/appointments`, `rights`, `grievances`, `breaches` | POST | Basic auth + role, same-origin | entity + AuditLog |
| `admin/consents-export` | GET | Basic auth + role | AuditLog(EXPORT) |

`middleware.js` (Edge) gates `/admin`, `/admin/:path*`, `/api/admin/:path*`; pages and APIs re-verify.

## 4. Components (`src/components/`)

**[T] template:** Counter, DropdownToggleLink, Facts, FigureImage (unused: no importer), Footer*, Header, Hero*,
Layout*, ListColumn, ListItemLink, Navbar*, NextLink, PageProgress, Services, SocialLinks, Tiles*, Topbar
(* = modified by A).

**[A] added:** AdminLayout, AdminRespondForm, BreachForm, ConsentGate (+`ConsentedScript`), ConsentNotice,
ContactBlock, CookieConsent, Countdown, LanguageSwitcher, PageHeader, RightsDashboard, VerifyIdentity.

**[A] libraries (`src/lib/`, 19 files):** db, crypto (AES-256-GCM, HMAC), audit, http (IP hash, in-memory rate
limiter, cookies, CSRF origin check, error wrapper), validation (zod), notify (stub), rights, rightsApi,
rightsSession, adminAuth, adminData, adminRespond, breach (draft texts), consentStore (React context), consentQuery,
consentCategories, i18n, api (fetch helper), noticeContent (CJS).
**Config:** `src/config/compliance.js` (CJS; all organisation details, all currently `[PLACEHOLDER]` values).
**Locales:** `src/locales/en.json`, `hi.json` (notice, banner, booking, rights, grievance strings).

## 5. Database (Prisma schema `prisma/schema.prisma`) [A]

10 models, 7 enums. Encrypted columns use AES-256-GCM via `src/lib/crypto.js`.

| Model | Purpose | Personal data | Encrypted fields | Used by |
|---|---|---|---|---|
| NoticeVersion | Exact notice text shown, by version+language | No | — | consent, appointments, rights/consent, seed |
| ConsentRecord | Append-only consent ledger | Pseudonymous: anonId, hashed IP, user agent, link to principal | — (no direct identifiers) | banner, booking, portal, admin |
| DataPrincipal | Person + reference ID `DP-XXXXXX` | name, phone, email | name, phone, email | booking, portal |
| Appointment | Booking request | date, slot, service, reason, minor flag, guardian | service, notes, guardianName, guardianRelationship | booking, portal, admin |
| OtpChallenge | One-time codes | code hash only | — | portal |
| RightsRequest | Request ledger | field names, outcomes | — | portal, admin |
| Grievance | Complaints | description; name/contact if unverified | description, contactName, contactDetail | grievance, admin |
| Nomination | s.14 nominee | nominee name, relationship, contact | all three | portal, admin |
| AuditLog | Access/processing log | actor, entity id, hashed IP | — | everything |
| BreachIncident | Breach register | incident narrative (may contain personal data) | — | admin only |

Model-by-model necessity is assessed in `02-legal-matrix.md` §B.2.

## 6. Data flows

```
Browser ──POST /api/appointments──> zod validation ──> Prisma tx ──> SQLite prisma/dev.db (encrypted columns)
        ──POST /api/consent───────> ConsentRecord (hashed IP, UA, anon UUID cookie)
        ──/api/rights/*───────────> OtpChallenge → notify.sendOtp() [STUB: console in dev, throws in prod]
        ──POST /api/grievances────> Grievance → notify.alertContactPerson() [STUB]
Admin (Basic auth) ──> getServerSideProps decrypts ──> HTML (no-store) + AuditLog READ rows
cron (not configured) ──> scripts/retention.js ──> deletes/anonymises rows
```
No data leaves the server: there is **no** configured SMS, WhatsApp, email, analytics, monitoring or backup
service. `instructProcessors()` and the processor-erasure hook are TODO stubs (`src/lib/notify.js`,
`scripts/retention.js:35`).

## 7. Environment variables (names only)

From `.env` (gitignored, present locally): `DATABASE_URL`, `ENCRYPTION_KEY`, `IP_HASH_SALT`, `SESSION_SECRET`,
`ADMIN_USERS`. Documented in `.env.example`. `SESSION_SECRET` is used for two purposes: signing the rights session
cookie (`src/lib/rightsSession.js:14`) and hashing OTP codes (`pages/api/rights/request-otp.js:40`). The local
`.env` holds two test admin accounts whose passwords were shared in chat during the earlier session.

## 8. External requests, cookies and browser storage

**Runtime network requests (crawl, all public pages, 1280px and 375px):** 0 third-party requests. Fonts, icons
(Unicons in `public/fonts/unicons`), images and scripts are same-origin. Outbound links only: facebook.com,
instagram.com (anchors, not requests).

**Cookies and storage** (from code; crawl confirmed none are set on first load):
| Key | Type | Set by | When | Category | HttpOnly | Notes |
|---|---|---|---|---|---|---|
| `dpdp_consent` | cookie, 12 months | `/api/consent` | after a banner choice | necessary | no | JSON of choices + notice version |
| `dpdp_aid` | cookie, 12 months | `/api/consent` | after a banner choice | necessary | yes | random UUID linking choices to ConsentRecord |
| `dpdp_rights_session` | cookie, 15 min | `/api/rights/verify-otp` | after OTP | necessary | yes | HMAC-signed principal id |
| `dpdp_lang` | cookie, 12 months | `src/lib/i18n.js:23` | language switch, only if functional consent | functional | no | **the only optional cookie** |
| `dpdp_minor_session` | sessionStorage | `src/lib/consentStore.js:24` | "patient under 18 = Yes" | necessary | — | suppresses analytics/marketing |

No analytics, advertising pixel, tag manager, localStorage key or third-party cookie exists. `ANALYTICS.src` is
empty (`src/config/compliance.js:205`), so `ConsentedScript` loads nothing.

## 9. Rendering and client behaviour

* `pages/_app.jsx:35,69` [T]: `loading` starts `true`; the page component renders only after `useEffect`. Server
  HTML for `/`, `/privacy-policy`, `/book-appointment` etc. contains no body text and the template title
  "DentalClinic – Free Next.js Template…". **Any non-JavaScript reader (search engines, accessibility tools, an
  automated assessment crawler) sees no notice, policy or contact details.**
* Bootstrap JS is imported dynamically on mount (`pages/_app.jsx`); dropdowns and offcanvas work after client-side
  navigation (crawl verified).
* scrollCue animations [T] re-initialise on route change.

## 10. Security headers (`next.config.js`) [A]

CSP (`default-src 'self'`; `script-src 'self'` (+`'unsafe-eval'` in dev); `style-src 'self' 'unsafe-inline'`;
`frame-ancestors 'none'`; `upgrade-insecure-requests` whenever `NODE_ENV=production`, line 29), HSTS 2 years +
preload (line 34, always sent), X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP,
`Cache-Control: no-store` on `/api` and `/admin`. Before the agent's change the template's `next.config.js` had no
`module.exports`, so its settings were ignored.

## 11. Logging and monitoring

| Location | What is logged | Personal data? |
|---|---|---|
| `src/lib/http.js:89` | route + error code on API failure | No |
| `src/lib/notify.js:27` | dev only: masked destination + **the OTP code** | OTP is a credential (dev only) |
| `src/lib/notify.js:36,48` | dev only: grievance ref / processor instruction with reference ID | Reference ID |
| `scripts/retention.js` | counts | No |
| Next.js request log (dev) | method + path incl. query string, e.g. `/admin/consents?reference=DP-…` | Reference IDs possible |
| `AuditLog` table | actor, action, entity id, hashed IP | Pseudonymous |
No log shipping, alerting or monitoring service is configured. Prisma query logging is off (`src/lib/db.js`).

## 12. Public assets

`public/img/hero-bg.webp`, `best-dental-hospital{,-2,-3}.webp` are size-placeholder images ("1500x1000" etc.)
shipped by the template; the agent replaced their use with CSS panels. `public/img/404.webp` unused.
`public/fonts/unicons` (icon font). No public file contains personal data or secrets (checked `public/`).
