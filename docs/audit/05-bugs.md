# 05 — Defects found in Phase 1 (read-only)

Method: static review plus a Playwright/Chromium crawl from the home page of every internal link (1280px and 375px),
interaction checks (dropdowns, offcanvas, banner, toggles, language switcher, forms, keyboard), admin access checks,
and a production build served over HTTP (by `localhost` and by IP). To avoid database writes, the crawl did **not**
press Accept/Reject, submit forms, or open admin pages that log record views; those paths are covered in Phase 5.

Severity: **H** = breaks a privacy control, a collection point or core navigation, or a security weakness;
**M** = incorrect behaviour or accessibility failure with a workaround; **L** = cosmetic or hygiene.
Origin: **T** = original template, **A** = previous agent.

Console result: **0 errors and 0 hydration warnings** on all 6 public pages. One recurring **warning** (B-16).

| ID | Sev | Origin | File:line | Symptom | Cause | Proposed fix |
|---|---|---|---|---|---|---|
| B-01 | H | T | `src/components/Navbar.jsx:74,94,97` | "About Us", "Gallery", "Contact Us" go to `/#` (crawl) | `href="#"`; no such pages exist | Either create minimal pages (content from the template's sections) or remove the items. Decision needed (Phase 3) |
| B-02 | H | T | `src/components/Navbar.jsx:86` | All 8 Services dropdown items go to `<current page>#`, e.g. `/book-appointment#` (crawl at 375px) | `href="#"` in the map over `services` | Link to anchors on the home Services section or to service pages, or make them non-links |
| B-03 | H | T/A | `src/components/Footer.jsx:22`; `src/data.js:3-10,16-20` | Footer "About Us", "Gallery", "Contact Us", "Sitemap" and all 8 service links go to `/#` | `href={href \|\| '#'}` fallback; `usefulLinks` and `services` lack `href` | Give each entry a real `href` or drop it; add a sitemap page or remove "Sitemap" |
| B-04 | L | T | `src/components/DropdownToggleLink.jsx:9` | Services toggle is `<a href="#">` | Anchor used as a button | Render a `<button type="button">` with `aria-expanded` |
| B-05 | H | A | `src/config/compliance.js:41`; used at `src/components/ConsentNotice.jsx:71`, `pages/privacy-policy.jsx:332`, `pages/grievance.jsx:81`, `pages/api/grievances.js:22` | "Data Protection Board of India" link resolves to `/[https://DATA-PROTECTION-BOARD-OFFICIAL-URL]` → 404, on every page that shows the notice | Placeholder string used as `href` | URL not verifiable on MeitY/Board sites (see `02-legal-matrix.md`): show plain text "Official complaint link to be confirmed", no link |
| B-06 | H | T/A | `src/components/Topbar.jsx:4-10`; `Navbar.jsx:115-120`; `Footer.jsx:56,79,84-91`; `Hero.jsx:34`; `src/config/compliance.js:15-34` | Pages present `company@gmail.com` (a plausible real Gmail address), `+91 12345 67890`, a US street address, Lorem ipsum, "an SEO-optimized dental website template", and `[CONTACT PERSON NAME]`-style placeholders as if they were real organisational details | Template sample content; agent placeholders | Replace with clearly fictitious sample data (`example.com`, `+91 00000 0000x`, "(Sample)") from one config and show a "Sample details: test environment" badge (REQUIREMENTS §4D; prompt §5) |
| B-07 | M | T | `src/components/Navbar.jsx:120` | Mobile menu shows "+9180008 50036" but dials `tel:+911234567890` | Mismatched literal | Read both from config |
| B-08 | **H** | T | `pages/_app.jsx:35,69` | Server HTML of **every** page contains only `<div class="page-loader">` and the template `<title>`; no notice, policy text or contact block without JavaScript | `loading` state defaults to `true`; component renders only after mount | Render `<Component>` on the server; keep the loader as a CSS overlay removed on mount. Required for crawlers / non-JS assessment tools to see the notice |
| B-09 | **H** | A | `next.config.js:29,34` | Production build served over plain HTTP **by IP or hostname**: every CSS/JS/image request is upgraded to `https://` and fails (`ERR_SSL_PROTOCOL_ERROR`); page unstyled, no JS, no banner. Works on `http://localhost` only (Chromium exempts localhost) | `upgrade-insecure-requests` and HSTS are emitted whenever `NODE_ENV=production` | Emit both only when `NODE_ENV=production` **and** `FORCE_HTTPS=true` (prompt §4) |
| B-10 | **H** | A | `src/lib/http.js:71` | Same HTTP-by-IP setup: `dpdp_consent`, `dpdp_aid`, `dpdp_rights_session` carry `Secure` and are dropped by the browser, so the banner reappears on every page and the rights portal can never stay signed in | `Secure` added whenever `NODE_ENV=production` | Tie `Secure` to the same `FORCE_HTTPS` flag (or to `x-forwarded-proto`) |
| B-11 | **H** | A | `src/components/CookieConsent.jsx:53` | At 375px the banner (530px of 812px, z-index 1080) sits above the open offcanvas menu (Bootstrap z-index 1045): "Book Appointment" and contact links in the menu **cannot be tapped** until a cookie choice is made (crawl: "subtree intercepts pointer events") — a de-facto cookie wall on mobile | z-index above the offcanvas; tall fixed banner | Lower z-index below the offcanvas or hide the banner while the menu is open; make the banner compact on mobile |
| B-12 | M | A | `src/components/CookieConsent.jsx:53-59` | At all widths, the fixed banner covers the bottom of the page; footer "Cookie settings" and the contact block are unclickable while it is open | No page padding reserved for the banner | Add bottom padding equal to banner height while open, or make the banner dismissible to a compact bar |
| B-13 | M | T/A | theme `.btn` focus styles; `CookieConsent.jsx` buttons | Keyboard focus on "Accept all"/"Reject all" shows **no visible indicator** (`outline: none`, `box-shadow: none`) | Theme suppresses focus outline | Add a `:focus-visible` outline for buttons and links (WCAG 2.4.7) |
| B-14 | M | T | `src/components/Navbar.jsx:130-133` | Hamburger has no `aria-controls`/`aria-expanded`; **Esc does not close the offcanvas** after it is opened by tap (crawl) | Missing attributes; focus not moved into the offcanvas | Add `aria-controls="offcanvas-nav"`, `aria-expanded`, `aria-label`; let Bootstrap manage focus |
| B-15 | L | A | `src/components/CookieConsent.jsx` switches | Category toggles are native checkboxes styled as switches without `role="switch"` | — | Add `role="switch"` (state is already exposed via `checked`) |
| B-16 | M | T | `src/components/Navbar.jsx:33,54`; Footer logo | Console **warning on every page**: "Image with src …/logo.webp has either width or height modified, but not the other" | CSS sets one dimension | Add `style={{ height: 'auto' }}` or matching width/height |
| B-17 | **H** | A | `src/lib/notify.js:26`; `pages/api/rights/request-otp.js:36,44` | In production OTP sending throws → API 500 after an `OtpChallenge` row is created; **rights portal and verified grievances unusable** in any production-mode test deployment | Stub provider; row written before send | Add `DEMO_MODE` (on-screen OTP with "Test environment" label; refused in production unless `ALLOW_DEMO_IN_PROD=true`); create the challenge only after a successful send |
| B-18 | M | A | `src/lib/notify.js:27` | Dev console prints the OTP code with a masked destination | Console fallback | Replace with `DEMO_MODE` on-screen display; never log codes |
| B-19 | M | A | `pages/api/appointments.js:58-60` | Every booking creates a new `DataPrincipal` and reference ID; a returning patient has several | No matching logic | Reuse the principal only after a **verified** phone/email match (OTP), never on an unverified match (prompt §4) |
| B-20 | **H** | A | `src/lib/http.js:12` | Client IP is taken from `X-Forwarded-For` unconditionally: any client can spoof it, **bypassing every rate limit** and falsifying the hashed IP stored as consent evidence | No trusted-proxy setting | Use `X-Forwarded-For` only when `TRUST_PROXY=true`; otherwise the socket address |
| B-21 | M | A | `src/lib/http.js:26-48` | Rate limiter is per-process memory; resets on restart; not shared across instances; not swappable | Design | Keep for one instance, document it, and put it behind a small interface so a shared store can be plugged in (prompt §4) |
| B-22 | **H** | A | `middleware.js:10` | No rate limit or lockout on admin Basic auth: unlimited password guessing | Middleware only verifies | Add per-IP failure throttling for `/admin` and `/api/admin` |
| B-23 | L | A | `src/lib/rightsSession.js:14`; `pages/api/rights/request-otp.js:40` | `SESSION_SECRET` used both to sign sessions and to hash OTPs | Key reuse | Derive two keys (HKDF) or add an `OTP_SECRET` |
| B-24 | M | A | `package.json` | `npm run lint` stops at an interactive ESLint setup prompt; cannot run in CI | No ESLint config/dependency | Add `eslint` + `eslint-config-next` and `.eslintrc.json` (dependency change: Phase 3) |
| B-25 | M | T | repo root | No `.nvmrc`, no `engines`; Node not installed on the host machine | — | Add `.nvmrc` (20), `"engines": {"node": ">=18"}`, README install steps incl. proxy/apt (prompt §4) |
| B-26 | L | T | `src/theme/ThemeProvider.jsx:20` | `typeof window === undefined` is always false (compares to the value `undefined`, not the string) | Typo | `typeof window === 'undefined'` |
| B-27 | M | A | `scripts/retention.js`; no scheduler | Retention job exists but nothing schedules it | No deployment/cron config | Document and provide a cron/systemd example, or a protected admin "run now" action (decision in Phase 3) |
| B-28 | L | T | `package.json` | `plyr-react` installed, only its CSS imported; `FigureImage.jsx` unused | Template leftovers | Remove after approval (dependency change) |
| B-29 | L | A | `package.json:38` | Prisma warns `package.json#prisma` is deprecated | Seed configured in package.json | Leave (works on Prisma 6) or move to `prisma.config` when Prisma is upgraded |
| B-30 | **H** | T/A | `package-lock.json` | `npm audit --omit=dev`: 1 critical, 7 high. `next@14.2.30`: 5 advisories fixed in **14.2.35** (patch); the rest are fixed only in 15.5.x. Several do not apply (App Router, Server Actions, i18n middleware, rewrites, image optimizer with `images.unoptimized: true` — **verify** whether `/_next/image` still answers). `prisma`/`@prisma/config`: fix only in Prisma 7 (major); dev/CLI tooling | Outdated versions | Phase 3: bump `next` to 14.2.35 now (patch); decide separately on Next 15.5.x and Prisma 7 (majors); run `npm audit fix` for transitive non-breaking fixes |
| B-31 | L | A | `pages/admin/*` via `pages/_app.jsx` | Admin pages render inside the public layout, including the cookie banner and public footer | Single layout | Skip `Layout`/banner for `/admin` routes |
| B-32 | L | T | no `pages/404.jsx` | Unknown URLs show the Next default 404 without site navigation; `public/img/404.webp` unused | — | Add a simple branded 404 page |

## Checks that passed (no defect)

| Area | Observation |
|---|---|
| Internal links to existing pages | 6 public pages return 200; `/api/rights/download` without a session returns 401 |
| Bootstrap after client-side navigation | Desktop dropdown and mobile offcanvas/dropdown open after navigating away and back; no leftover backdrop or scroll lock |
| Keyboard on banner | Accept, Reject, Customise reachable by Tab; Enter opens Customise; Space toggles a category; necessary switch disabled and checked |
| Language switcher | `aria-pressed` updates; banner text and `<html lang>` switch to Hindi; choice not persisted without functional consent (by design) |
| Booking form | Empty submit blocked client-side with no request; focus moves to the first invalid field; errors linked via `aria-describedby` |
| Grievance page | Mode toggle exposes `aria-pressed`; submit disabled until category and description are filled |
| Admin boundaries | No credentials → 401; wrong password → 401; `reception` role → 403 on `/admin/consents` and the CSV export; `admin` → 200 |
| Horizontal overflow at 375px | None on any public page |
| First-load cookies / storage | None set; no localStorage/sessionStorage keys |
