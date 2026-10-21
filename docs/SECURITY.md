# Security safeguards

How this site meets the "reasonable security safeguards" duty in **s.8(5) of the DPDP Act, 2023** and the minimum measures in **Rule 6 of the DPDP Rules, 2025**. Keep this document up to date. It is part of the evidence you would show the Data Protection Board after an incident.

## Rule 6(1)(a): encryption, obfuscation, masking

| Data | Protection | Where |
| --- | --- | --- |
| Name, phone, email (DataPrincipal) | AES-256-GCM, random IV per value | `src/lib/crypto.js` |
| Service, reason for visit, guardian details (Appointment) | AES-256-GCM | `pages/api/appointments.js` |
| Nominee details, grievance text and contact | AES-256-GCM | `pages/api/rights/nominate.js`, `pages/api/grievances.js` |
| IP addresses | Never stored. HMAC-SHA-256 with `IP_HASH_SALT` | `src/lib/http.js` |
| One-time codes | Stored only as HMAC-SHA-256 | `pages/api/rights/request-otp.js` |
| Admin passwords | PBKDF2-SHA-256, 210,000 iterations | `src/lib/adminAuth.js` |
| Data in transit | HTTPS only: HSTS (2 years, preload) and `upgrade-insecure-requests` | `next.config.js` |

**Key management.** `ENCRYPTION_KEY`, `IP_HASH_SALT` and `SESSION_SECRET` must live in your host's secret store, not in the repository. Losing `ENCRYPTION_KEY` makes encrypted data unreadable. Back it up offline, separately from the database backups. Rotating the key requires a re-encryption script: the `v1:` prefix on ciphertext exists so a `v2` key can be introduced.

## Rule 6(1)(b): access control

* `/admin/*` and `/api/admin/*` require HTTP Basic auth over HTTPS (`middleware.js`). Each page and API route checks the credentials again, plus the role (`src/lib/adminAuth.js`):
  * `admin`: everything
  * `dpo` (Grievance Officer): everything
  * `reception`: appointments only
* Create one account per person (`npm run admin:hash-password`) and never share accounts. Remove leavers from `ADMIN_USERS` the same day.
* Data Principals reach their own data only after OTP verification (Rule 14(1)). The session lasts 15 minutes in an httpOnly, SameSite=Lax cookie.
* All state-changing endpoints reject cross-site requests (Origin check in `src/lib/http.js`).

## Rule 6(1)(c): visibility of access (logging and monitoring)

* `AuditLog` records every create, read, update, delete and export of personal data, with the actor, entity, ID, time and hashed IP. Admin page views log one READ entry per record shown.
* Application logs never contain request bodies or personal data. Errors log only the route and the error code.
* **To do for the owner:** forward server logs to a monitored store and set alerts (for example, many failed OTP or admin logins).

## Rule 6(1)(d): continued processing after compromise (backups)

Recommended approach. Adapt it to your host and record what you actually do.

1. **Database.** Use the managed PostgreSQL provider's automated daily snapshots with point-in-time recovery, keep them for 30 days, store them encrypted, in India and in a different availability zone.
2. **Keys.** Keep an offline, encrypted copy of `.env` secrets (for example in a password manager vault that two people can access). It is kept separately from the database backups.
3. **Restore test.** Every quarter, restore the latest backup to a staging database, start the app against it, and confirm a known record decrypts. Write down the date and the result.
4. **Erasure and backups.** Backups expire on their normal schedule. If you restore one, re-run `npm run retention` and re-apply erasure requests logged in `RightsRequest` since the backup date before going live.

## Rule 6(1)(e): log retention

`AuditLog` and processing logs are kept for at least one year (Rule 8(3)). `scripts/retention.js` refuses to delete logs, consent records or request records younger than `MIN_LOG_RETENTION_DAYS` (365) whatever `RETENTION` says.

## Rule 6(1)(f) and (g): Processors and technical measures

* Every Processor in `PROCESSORS` (`src/config/compliance.js`) needs a written contract requiring equivalent safeguards, breach notice to you without delay, and erasure on instruction (s.8(2), s.8(7)(b)).
* `instructProcessors` in `src/lib/notify.js` and the hook in `scripts/retention.js` are TODOs. Wire them to each provider's deletion or opt-out API.

## Application hardening

* zod validation on every API input, with unknown fields rejected (`.strict()`). Control characters are stripped. Lengths are capped.
* Per-IP rate limits on every public endpoint. The limiter is in-memory, so use Redis or similar when running more than one instance.
* Security headers in `next.config.js`: CSP with only same-origin resources, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`.
* `Cache-Control: no-store` on all API and admin responses.
* CSV export escapes formula-injection characters.
* No third-party scripts, fonts or requests. Fonts are self-hosted. Anything optional loads only through `loadScriptIfConsented`.

## Breach response (s.8(6), Rule 7)

1. Contain the incident, then record it at `/admin/breaches` straight away. This starts the 72-hour clock.
2. Send the **initial intimation to the Board** and the **notice to affected Data Principals** without delay, using the generated drafts after counsel review. Click "Mark as sent" for each.
3. Send the **detailed report** within 72 hours of becoming aware (Rule 7(2)(b)). Keep all evidence.

## Production checklist

- [ ] Served only over HTTPS, with HTTP redirected to HTTPS at the host or load balancer
- [ ] PostgreSQL in India, encrypted at rest, automated backups and a quarterly restore test
- [ ] Secrets in a secret manager; `.env` not deployed from the repository
- [ ] SMS and email providers wired in `src/lib/notify.js` (OTP fails closed in production until then)
- [ ] `npm run retention` scheduled daily
- [ ] Admin accounts per person, with strong passwords; leavers removed
- [ ] Log forwarding and alerts configured
