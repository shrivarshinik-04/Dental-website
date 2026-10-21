# Incident and personal data breach response procedure

Operational procedure for this site (test environment; people and contacts are samples from
`src/config/compliance.js`). The admin register at `/admin/breaches` records each step and when it was done.

| Role | Who (sample) | Responsibility |
|---|---|---|
| Incident owner and CERT-In Point of Contact | `INCIDENT_OWNER`: S. Sample, security@smiledental.example.com, +91 00000 00005 | Runs this procedure; sends the CERT-In report; keeps the register |
| Grievance Officer | `GRIEVANCE_OFFICER` | Handles complaints from affected people |
| Privacy contact | `PRIVACY_CONTACT` | Named in notices to affected people (from about May 2027) |
| Clinic administrator (`admin` role) | — | Decides on containment that affects clinic operations |

## Obligations and deadlines

| When | What | Source | Status |
|---|---|---|---|
| Within **6 hours of noticing** | Report the incident to CERT-In (incident@cert-in.org.in, 1800-11-4949) if it is a type listed in Annexure I (includes data breach, data leak, unauthorised access to IT systems/data, attacks on servers or applications) | CERT-In Directions No. 20(3)/2022-CERT-In, 28 Apr 2022, direction (ii) | **In force** |
| Once, and on change | Register the Point of Contact with CERT-In (info@cert-in.org.in) with name, designation, organisation, address, email, mobile, office phone, fax | Same, direction (iii), Annexure II | **In force** — owner action, not yet done (sample details) |
| Ongoing | Keep logs of all ICT systems for 180 days within India and provide them with the report | Same, direction (iv) | **In force** — hosting not configured yet |
| Without delay | Tell each affected person what happened, the likely consequences, what we are doing, what they can do, and whom to contact | DPDP Rules 2025, Rule 7(1) | From about 13 May 2027 (to be confirmed) |
| Without delay, then within **72 hours** | Intimate the Data Protection Board; then send the detailed report | DPDP Rules 2025, Rule 7(2) | From about 13 May 2027 (to be confirmed) |
| — | Compensation liability for negligent security of sensitive personal data | IT Act 2000 s.43A | In force |

## Steps

1. **Detect and escalate.** Anyone who suspects an incident (unexpected admin activity in `AuditLog`, repeated
   failed sign-ins, data seen where it should not be, a lost laptop with the database or `.env`) tells the incident
   owner immediately. Note the time you noticed it: the 6-hour clock starts then.
2. **Record.** The owner records the incident at `/admin/breaches` straight away (time noticed, incident type
   from Annexure I, what is known). The page shows the 6-hour countdown and a CERT-In report draft.
3. **Contain.** Stop the leak: revoke or rotate credentials (`ADMIN_USERS`, `SESSION_SECRET`), take the affected
   service offline if needed, block the source. Do not delete evidence.
4. **Preserve evidence.** Copy the `AuditLog` rows, server logs and the affected records' identifiers to a secure
   location before any clean-up; do not run `scripts/retention.js` until the investigation is closed.
5. **Report to CERT-In within 6 hours.** Review the draft, check the current format on www.cert-in.org.in, send
   it, and click "Mark as sent now" for the CERT-In step.
6. **Assess personal-data impact.** Which data categories (`docs/audit/03-data-inventory.md`), how many people,
   whether sensitive personal data (service, reason for visit) was involved, whether encrypted fields were exposed
   together with `ENCRYPTION_KEY`.
7. **From about May 2027:** send the Rule 7 intimations to affected people and the Board without delay and the
   detailed report within 72 hours, using the drafts; record each send.
8. **Remediate and close.** Record root cause, findings and remedial measures in the register, fix the cause,
   and close the incident. Review this procedure.

## Limits

- Detection is manual: there is no automated alerting yet (see `docs/SECURITY.md`, "Not implemented").
- The drafts are starting points; have counsel review notices to individuals and the Board.
