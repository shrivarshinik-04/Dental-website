# Security controls (test environment)

What this site implements, mapped to the security requirements that apply now and to those expected later. It
describes controls; it does not claim that they are sufficient for any law. Organisation details are samples.

- **In force now:** IT Act 2000 s.43A and SPDI Rules 2011, Rule 8 (reasonable security practices and a documented
  information security programme); CERT-In Directions of 28 April 2022 (6-hour incident reporting; logs kept 180
  days within India).
- **Expected from about 13 May 2027 (date to be confirmed):** DPDP Act 2023 s.8(5) and DPDP Rules 2025, Rule 6.

## Implemented in the application

| Area | Control | Where |
|---|---|---|
| Encryption at rest | Name, phone, email, service, reason for visit, guardian details, nominee details and grievance text: AES-256-GCM, random IV per value | `src/lib/crypto.js` |
| Hashing | IP addresses never stored: HMAC-SHA-256 with `IP_HASH_SALT`. One-time codes stored only as HMAC. Admin passwords: PBKDF2-SHA-256, 210,000 iterations | `src/lib/http.js`, `pages/api/rights/request-otp.js`, `src/lib/adminAuth.js` |
| Transport | With `NODE_ENV=production` and `FORCE_HTTPS=true`: HSTS (2 years), `upgrade-insecure-requests`, COOP, `Secure` cookies. Without the flag (plain-HTTP test deployments) these are not sent | `next.config.js`, `src/lib/env.js` |
| Client IP | `X-Forwarded-For` used only with `TRUST_PROXY=true`; otherwise the socket address (prevents spoofing past rate limits) | `src/lib/http.js` |
| Access control | `/admin/*` and `/api/admin/*`: HTTP Basic auth, roles `admin`, `dpo`, `reception`; verified and role-checked server-side on every request; 10 failed sign-ins per IP → blocked for 15 minutes | `middleware.js`, `src/lib/adminGuard.js` |
| Data subject verification | One-time code to the registered phone or email; 15-minute signed HttpOnly session. `DEMO_MODE` shows codes on screen (refused in production unless `ALLOW_DEMO_IN_PROD=true`) | `pages/api/rights/*`, `src/lib/rightsSession.js`, `src/lib/notify.js` |
| CSRF | State-changing endpoints reject cross-site requests (Origin/Referer check); cookies `SameSite=Lax` | `src/lib/http.js` |
| Input handling | zod validation on every API input, unknown fields rejected, control characters stripped, lengths capped; React output encoding | `src/lib/validation.js` |
| Abuse control | Per-IP rate limits on public endpoints; swappable store (in-memory: single instance only) | `src/lib/rateLimit.js` |
| Logging | `AuditLog` records every create, read, update, delete and export of personal data by staff and by the system (identifiers and hashed IP only). Application logs carry no request bodies or personal data; one-time codes are never logged | `src/lib/audit.js`, `src/lib/http.js` |
| Headers | CSP limited to same origin, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`; `Cache-Control: no-store` on API and admin responses | `next.config.js` |
| Exports | CSV export escapes spreadsheet formula injection | `pages/api/admin/consents-export.js` |
| Third parties | No third-party script, font or request; fonts self-hosted | `pages/_app.jsx` |

## Not implemented (owner actions)

| Item | Requirement | Recommended approach |
|---|---|---|
| Documented information security programme and audit | SPDI Rule 8 | Adopt IS/ISO/IEC 27001 or an approved code; record policies and an annual audit |
| HTTPS hosting in India | SPDI Rule 8; CERT-In (iv) | Host in India, terminate TLS, redirect HTTP→HTTPS, build with `FORCE_HTTPS=true` |
| Backups | Availability (DPDP Rule 6(1)(d) from May 2027) | Managed PostgreSQL in India with daily encrypted snapshots, 30-day retention; keep `ENCRYPTION_KEY` backed up separately; quarterly restore test. Expired backups are the only deletion path for backup copies; re-apply erasure requests after any restore |
| Infrastructure logs for 180 days within India | CERT-In (iv) | Configure at the host; `AuditLog` covers the application only |
| Clock synchronisation | CERT-In (i) | NTP with NIC/NPL servers at the host |
| Shared rate-limit store | Multiple instances | Implement the store interface in `src/lib/rateLimit.js` over Redis |
| Key management | — | Keep `ENCRYPTION_KEY`, `IP_HASH_SALT`, `SESSION_SECRET` in a secret manager; the `v1:` ciphertext prefix allows key rotation with a re-encryption script |
| Log forwarding and alerting | SPDI Rule 8 | Forward server logs; alert on repeated failed sign-ins and one-time-code failures |

## Incidents

See `docs/BREACH-RESPONSE.md` (CERT-In report within 6 hours of noticing, now; DPDP Rule 7 notices from about May
2027).

## Dependency status

`npm audit` findings and their applicability are tracked in `docs/audit/05-bugs.md` (B-30). Next.js is patched
within the 14.2 line; advisories fixed only in Next 15 / Prisma 7 are documented with their applicability.
