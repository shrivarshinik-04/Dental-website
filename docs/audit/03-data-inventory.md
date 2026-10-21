# 03 — Personal-data collection and processing inventory (Phase 2)

Scope: every form, input and automatic collection point in `baseline/previous-agent` (`c503b51`).
"Basis now" = IT Act s.43A + SPDI Rules 2011 (in force). "Basis May 2027" = DPDP Act ss.4–7 (not yet operative).
Retention values come from `RETENTION` in `src/config/compliance.js`; **none is legally confirmed** and the
retention job is not scheduled (`05-bugs.md` B-27).

Common to every server submission: TLS only if the host provides HTTPS (none configured); zod validation
(`src/lib/validation.js`); same-origin check; in-memory rate limit keyed on a spoofable IP (B-20); errors return a
generic message (`src/lib/http.js:89`). Storage is SQLite `prisma/dev.db` on the app host (location unknown).
**Recipients:** clinic staff via `/admin` (role-limited). **No third-party recipient is configured.**

## 1. Appointment booking — `/book-appointment` → `POST /api/appointments`

| Field | Purpose | Necessary? | Basis now | Basis May 2027 | Storage | Retention (config) |
|---|---|---|---|---|---|---|
| Patient name | Identify the patient, call to confirm | Yes | Consent captured (SPDI 5(1) applies to the health part of the record) | Consent today; s.7(a) candidate (`02` C.3) | `DataPrincipal.name`, encrypted | Erased 30 days after the visit unless marked clinical record; clinical record 3 years (placeholder) |
| Mobile number | Confirm/change appointment; OTP for rights | Yes | as above | as above | `DataPrincipal.phone`, encrypted | as above |
| Email | Optional confirmations; OTP alternative | **No** (optional) | as above | as above | `DataPrincipal.email`, encrypted | as above |
| Service | Book the right slot/clinician | Yes, but **reveals health condition → SPDI** (Rule 3(iii)/(v)) | SPDI consent | Consent or s.7(a) | `Appointment.service`, encrypted | as above |
| Preferred date, slot | Scheduling | Yes | as above | as above | `Appointment.preferredDate/Slot`, plain | as above |
| Reason for visit (free text, optional) | Prepare for the visit | **No**; risk of over-collection of medical history | SPDI consent | Consent | `Appointment.notes`, encrypted | as above |
| Is the patient under 18? | Trigger guardian flow and child safeguards | Yes (safeguard) | — | s.9 (May 2027) | `Appointment.patientIsMinor` | as above |
| Guardian name, relationship | Consent on behalf of a child | Yes when minor | Guardian gives consent (capacity: **Needs legal confirmation**) | s.9 / Rule 12 exemption | `Appointment.guardian*`, encrypted | as above |
| Guardian declaration | Evidence the adult is the parent/guardian | Yes when minor | Evidence | s.9(1) / Rule 10 (if not exempt) | Not stored as a field; implied by `givenByGuardian` on consent rows | — |
| Consent: appointment (required) | Evidence of consent | Yes (current SPDI requirement) | SPDI 5(1) | s.6(10) | `ConsentRecord` | 3 years after erasure (ledger) |
| Consent: SMS/WhatsApp reminders (optional) | **Gates nothing**: no reminder system exists | No | — | — | `ConsentRecord` | 3 years |
| Consent: marketing (optional, adults only) | **Gates nothing**: no marketing system exists | No | — | — | `ConsentRecord` | 3 years |
| Language, notice version | Prove which notice was shown | Yes (evidence) | — | s.6(10) | `ConsentRecord.language`, `noticeVersionId` | 3 years |
| *Automatic:* hashed IP (HMAC), user agent | Consent evidence; abuse control | Proportionate | Legitimate business need (security) | s.6(10) evidence | `ConsentRecord.ipHash/userAgent`, `AuditLog.ipHash` | 3 years / 1 year |
| *Generated:* reference ID `DP-XXXXXX` | Identifier for rights requests | Yes | — | Rule 14(5) | `DataPrincipal.referenceId` | Kept on the anonymised record |

Destinations: browser → Next.js API route → SQLite. Shown to staff on `/admin/appointments` (decrypted, audited).
**Gap:** staff cannot see the reminder/marketing choices, so even a manual reminder could ignore them.

## 2. Cookie banner — `CookieConsent` → `POST /api/consent`

| Field | Purpose | Necessary? | Basis | Storage | Retention |
|---|---|---|---|---|---|
| Choices: functional / analytics / marketing | Record the choice | Only if an optional tracker exists (none does except `dpdp_lang`) | Consent (design choice) | `ConsentRecord` ×3 per click; cookie `dpdp_consent` | Ledger 3 years; cookie 12 months |
| Anonymous ID (UUID) | Link choices to the ledger | Only with the ledger | — | Cookie `dpdp_aid` (HttpOnly), `ConsentRecord.anonymousId` | 12 months / 3 years |
| Hashed IP, user agent | Evidence | Questionable for a banner that gates almost nothing | — | `ConsentRecord`, `AuditLog` | 3 years / 1 year |

See `02-legal-matrix.md` C.1 (Option A removes this collection point).

## 3. Rights portal — `/data-rights`

| Step / field | Purpose | Necessary? | Storage | Retention |
|---|---|---|---|---|
| Reference ID + registered phone or email (`/api/rights/request-otp`) | Identify and select the OTP channel | Yes | Not stored (compared with the decrypted record) | — |
| One-time code (`/api/rights/verify-otp`) | Verify identity | Yes | `OtpChallenge.codeHash` (HMAC); dev console prints the code (B-18) | 1 day |
| Session cookie `dpdp_rights_session` | Keep verified for 15 minutes | Yes | Cookie (HttpOnly, signed) | 15 minutes |
| Corrected name / phone / email | Correction, completion, update | Yes | `DataPrincipal` (encrypted); `RightsRequest.payload` stores field names only | as booking |
| Consent change (purpose, withdraw/give) | Withdrawal / re-grant | Yes | `ConsentRecord`, `RightsRequest` | 3 years |
| Erase confirmation | Erasure request | Yes | `RightsRequest.response` (counts, retained reason) | 3 years after closure |
| Nominee name, relationship, contact | s.14 nomination | Yes for the feature | `Nomination` (encrypted) | Until replaced or erased |
| Download (JSON) | Access copy | Yes | `RightsRequest`, `AuditLog(EXPORT)` | 3 years / 1 year |

## 4. Grievance — `/grievance` → `POST /api/grievances`

| Field | Purpose | Necessary? | Storage | Retention |
|---|---|---|---|---|
| (Verified path) link to principal | Tie complaint to the record | Yes | `Grievance.dataPrincipalId` | 3 years after resolution |
| (Unverified path) name, phone/email | Reply to the complainant | Yes | `Grievance.contactName/contactDetail` (encrypted) | 3 years after resolution |
| Category | Triage | Yes | `Grievance.category` | as above |
| Description (≤ 2000 chars) | The complaint | Yes; hint discourages medical detail | `Grievance.description` (encrypted) | as above |
| *Generated:* reference `GRV-XXXXXXXX`, due date (+30 days) | Tracking; SPDI 5(9) one month | Yes | `Grievance` | as above |

## 5. Admin area — `/admin/*`

| Data | Purpose | Storage | Notes |
|---|---|---|---|
| Basic-auth credentials | Staff authentication | Env `ADMIN_USERS` (PBKDF2 hashes); browser caches credentials per session | No lockout (B-22) |
| Appointment status, clinical-record flag | Operations; blocks erasure | `Appointment` | Audited |
| Rights/grievance responses (free text) | Reply to the person | `RightsRequest.response`, `Grievance.resolution` (**not encrypted**) | May contain personal data typed by staff |
| Breach narrative (11 free-text fields) | Breach register | `BreachIncident` (**not encrypted**) | Decorative module (`02` D.3) |
| Viewing any record | — | `AuditLog` READ per record | 1 year minimum |

## 6. Browser storage (no server submission)
| Key | Purpose | Lifetime |
|---|---|---|
| `dpdp_lang` cookie | Language preference (only with functional consent) | 12 months |
| `dpdp_minor_session` (sessionStorage) | Keep analytics/marketing off after a child booking | Tab session |
| `dpdp_consent` cookie (readable by JS) | Choices + notice version | 12 months |

## 7. Logs and other stores
| Store | Contents | Personal data | Retention |
|---|---|---|---|
| `AuditLog` | actor, action, entity id, hashed IP | Pseudonymous | ≥ 365 days (enforced minimum) |
| Server stdout (dev) | OTP code, masked destination, reference IDs in paths | Yes (dev) | Terminal only |
| Backups | **None exist** | — | — |
| Uploaded files | None (no upload feature) | — | — |
| `prisma/dev.db` (local) | 7 principals; 1 possibly real | Yes | Until reset (only you should run `prisma migrate reset`) |
