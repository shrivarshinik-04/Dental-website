# Data model: what each form stores, and where

Schema: `prisma/schema.prisma`. Encryption: `src/lib/crypto.js` (AES-256-GCM, values start with `v1:`).
Retention periods: `RETENTION` in `src/config/compliance.js`, applied by `scripts/retention.js`
(see `RETENTION.md`).

Check that stored data is complete, encrypted and correctly linked (read-only, prints IDs only):

```bash
npm run data:check
```

The e2e suite runs the same checks over every record its tests store (`tests/e2e/teardown.js`).

## How the tables fit together

```
DataPrincipal (one per patient; reference ID DP-XXXXXX)
 ├── Appointment        one per booking; guardian details on bookings for a patient under 18
 ├── ConsentRecord      one per consent decision (append-only)  ──► NoticeVersion (text shown)
 │                       └── appointmentId ──► the booking whose guardian gave the consent
 ├── RightsRequest      one per Data Rights action (access, correction, erasure, withdrawal, nominee)
 ├── Grievance          complaints made after signing in (others have no person link)
 └── OtpChallenge       one-time sign-in codes (hash only)

ConsentRecord (anonymousId) cookie-banner choices, linked to a random browser ID, not a person
AuditLog                    who viewed or changed what (IDs only)
AnalyticsEvent              page views, only after opting in (random visitor ID)
BreachIncident              incident register (staff only)
```

Rules that keep the data in order:

- **Personal data is encrypted** in every column marked "encrypted" below; IP addresses are stored only as a
  keyed hash; one-time codes only as a hash.
- **The consent ledger is append-only.** Each grant, refusal or withdrawal adds a row; the latest row per person
  (or browser ID) and purpose is the current state. Each row points to the exact notice version and language shown.
- **Every booking has its consent row**, written in the same database transaction. For a patient under 18 the row
  is marked `givenByGuardian` and linked to the booking that holds the guardian's details.
- **Validation happens before anything is stored** (`src/lib/validation.js`); fields that do not apply (guardian
  fields for an adult, the patient's own contact for a child) are discarded, so they never reach the database.

## Booking form (`/book-appointment` → `POST /api/appointments`)

| Field | Table.column | Stored as |
|---|---|---|
| Patient's full name | `DataPrincipal.name` | encrypted, trimmed |
| Mobile number (adult) | `DataPrincipal.phone` | encrypted, 10 digits (`+91`, spaces removed) |
| Email (adult, optional) | `DataPrincipal.email` | encrypted, lower case; empty → null |
| Under 18? | `Appointment.patientIsMinor` | true / false |
| Guardian's full name, relationship | `Appointment.guardianName`, `guardianRelationship` | encrypted (`PARENT` / `LEGAL_GUARDIAN`) |
| Guardian's mobile, email (optional) | `Appointment.guardianPhone`, `guardianEmail` | encrypted, normalised as above |
| Guardian's declaration | `ConsentRecord.givenByGuardian = true`, `ConsentRecord.appointmentId` | — |
| Service | `Appointment.service` | encrypted (reveals a health condition) |
| Preferred date, time | `Appointment.preferredDate` (midnight IST), `preferredSlot` | plain (`MORNING` / `EVENING`) |
| Reason for visit (optional) | `Appointment.notes` | encrypted; empty → null |
| Consent tick | `ConsentRecord` (purpose `APPOINTMENT`, status `GIVEN`, channel `APPOINTMENT_FORM`) | with notice version, language, IP hash, browser type |
| — (generated) | `DataPrincipal.referenceId`, `Appointment.status = REQUESTED` | — |

For a patient under 18, `DataPrincipal.phone` and `email` stay null: the guardian's contact on the booking is used
for one-time codes and for staff to confirm.

## Cookie banner (`POST /api/consent`)

| Field | Table.column | Stored as |
|---|---|---|
| Functional / Analytics choice | `ConsentRecord` × 2 (purposes `FUNCTIONAL_COOKIES`, `ANALYTICS_COOKIES`) | `GIVEN`, `DENIED`, or `WITHDRAWN` if switched off after being given |
| Browser ID | `ConsentRecord.anonymousId`; cookie `dpdp_aid` | random UUID, no link to a person |
| Notice version, language | `ConsentRecord.noticeVersionId`, `language`; cookie `dpdp_consent` | — |

## Data Rights page (`/data-rights`)

| Form | Stored in | Notes |
|---|---|---|
| Sign-in: reference ID + mobile or email | `OtpChallenge` | code stored as a keyed hash; nothing stored if the details do not match |
| Correction (name, phone, email; guardian details) | `DataPrincipal` or `Appointment` columns (encrypted); `RightsRequest` type `CORRECTION` / `COMPLETION` / `UPDATE` | the request keeps only the **names** of the changed fields |
| Withdraw consent | new `ConsentRecord` (`WITHDRAWN`, channel `PREFERENCE_CENTRE`); `Appointment.status = CANCELLED`; `RightsRequest` `WITHDRAW_CONSENT` | |
| Nominee | `RightsRequest` type `NOMINATION`, `payload.nominee` encrypted | latest one is the current nominee |
| Download | `RightsRequest` type `ACCESS` | |
| Erase | `DataPrincipal` name/phone/email → null, `erasedAt`; bookings deleted unless part of the clinical record; `RightsRequest` `ERASURE` | consent rows are kept as proof |

## Grievance form (`/grievance` → `POST /api/grievances`)

| Field | Table.column | Stored as |
|---|---|---|
| Name, contact (without a reference ID) | `Grievance.contactName`, `contactDetail` | encrypted; contact normalised |
| Signed in | `Grievance.dataPrincipalId`, `verified = true` | no separate name or contact |
| Category, description | `Grievance.category`, `description` | description encrypted |
| — (generated) | `referenceNumber` (GRV-XXXXXXXX), `dueDate` (within one month), `escalationNote` | |

## Staff forms (`/admin`)

| Form | Stored in |
|---|---|
| Appointment status, clinical-record switch | `Appointment.status`, `completedAt`, `legallyRequired` |
| Grievance response | `Grievance.status`, `resolution` (response + contact + escalation note), `resolvedAt` |
| Rights request response | `RightsRequest.status`, `response.message`, `respondedAt` |
| Incident form | `BreachIncident` (plain text: do not enter patient details); report deadline = detected + 72 h |

Every staff view, change and export is logged in `AuditLog` (views of guardian details as entity `GuardianDetails`).

## Applying schema changes to an existing database

```bash
npx prisma migrate deploy   # applies only new migrations; keeps existing rows
```

Migrations are additive. The latest, `lookup_indexes`, only adds indexes for lookups by person and by booking.
