# 04 — Third parties, processors and external services (Phase 2)

REQUIREMENTS §11. Status as of `baseline/previous-agent` (`c503b51`), checked by code review and by a browser crawl
of every public page (no third-party request observed at runtime).

Note: being widely used does not make a service compliant. Every row marked "contract" requires a written
agreement that you, not this code, must put in place.

## 1. Runtime services (process visitor or patient data)

| Service | Category | Status | Purpose | Data shared | Personal data? | Configuration / location | Legal and contractual considerations |
|---|---|---|---|---|---|---|---|
| Hosting provider (`HOSTING.provider`) | Hosting, data storage | **Unknown / not chosen**; currently a developer machine (WSL) | Run Next.js and store SQLite | Everything in `03-data-inventory.md` | Yes, incl. SPDI | `src/config/compliance.js` placeholders | SPDI Rule 8 security; CERT-In (iv) 180-day logs within India; hosting region decides DPDP s.16/Rule 15 (May 2027). Contract needed |
| SMS / WhatsApp provider | Messaging | **Not configured** (`src/lib/notify.js` stub; throws in production) | OTP, reminders | Phone number, message text (OTP; reminder would reveal appointment) | Yes | `PROCESSORS` placeholder | SPDI Rule 6 / processor contract; DLT registration for SMS in India (TRAI; **Needs confirmation** by the provider) |
| Email provider | Messaging | **Not configured** | OTP, replies | Email address, message text | Yes | `PROCESSORS` placeholder | As above |
| Data Protection Board of India | Regulator (link only) | Official URL **unverified** | Complaint route (from May 2027) | None sent by the site | No | `DATA_PROTECTION_BOARD.url` placeholder → broken link (B-05) | Show "Official complaint link to be confirmed" |
| CERT-In | Regulator (incident reporting) | Not referenced anywhere | 6-hour incident reports (Directions (ii)) | Incident details when reporting | Possibly | — | Add to the breach procedure (`02` D.3) |

## 2. Content and embedded resources

| Item | Status | Data shared | Notes |
|---|---|---|---|
| Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`) | **Removed** by the previous agent (template loaded them in `pages/_document.jsx` and `src/assets/scss/theme/_reboot.scss`) | None now | Fonts self-hosted via `@fontsource/*` (npm packages bundled at build) |
| Unicons icon font | Self-hosted in `public/fonts/unicons` [T] | None | — |
| Images | Self-hosted `public/img` [T] | None | Placeholders (see `01` §12) |
| Gallery photos (Unsplash) | Downloaded once and **served from this site** (`public/img/gallery/`, credits in `CREDITS.md`) | None at runtime; photographer credit links are outbound links only | Unsplash License: free to use, no permission needed |
| Analytics, ads, tag managers, pixels, maps, video embeds | **None** | — | `ANALYTICS.src` empty; plyr-react installed but no player rendered |
| Facebook, Instagram | **Outbound links only** (Topbar, footer, mobile menu) | Only if the visitor clicks: the browser sends the site origin as Referer (`strict-origin-when-cross-origin`) | Links point to generic `facebook.com` / `instagram.com`, not a clinic page (B-06) |

## 3. Development and build-time services (no patient data)

| Service | When | Data sent | Notes |
|---|---|---|---|
| npm registry | `npm install` | Package requests; `npm audit` sends the dependency tree | No personal data |
| Prisma engine binaries / Prisma checkpoint | `prisma generate`, CLI use | Engine download; anonymous CLI version-check telemetry unless `CHECKPOINT_DISABLE=1` | Not disabled in the repo; developer-machine metadata only |
| Next.js telemetry (Vercel) | `next dev`, `next build` | Anonymous usage telemetry unless `NEXT_TELEMETRY_DISABLED=1` | Not disabled in the repo; no patient data. Consider disabling in CI and docs |
| GitHub (`themixlyweb/nextjs-dental-website-template`) | Source origin | Source code only | `origin` remote |
| Playwright / Chromium | Audit only, kept in the session scratchpad, not added to the repo | None | Will be proposed as a dev dependency in Phase 3 for the §6 tests |

## 4. Processors listed in the privacy policy vs reality

`pages/privacy-policy.jsx:190-221` renders the `PROCESSORS` array (hosting, SMS/WhatsApp, email) as processors that
"act only on our instructions under a written contract". **None of these contracts or integrations exists.** The
policy must describe only services actually in use, or state clearly that they are not yet configured (prompt §5:
"SMS/email processor (marked 'not yet configured')").

## 5. Withdrawal and erasure propagation

`instructProcessors()` (`src/lib/notify.js`) and the retention hook (`scripts/retention.js:35`) only log a TODO.
Because no processor receives data today, nothing is actually missed, but the UI and policy currently state that
processors are instructed to stop or erase (`02-legal-matrix.md` D.2).
