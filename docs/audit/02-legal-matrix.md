# 02 — Legal applicability matrix and gap assessment (Phase 2)

Prepared 21 October 2026 for a **test environment** used to evaluate privacy controls. This is an engineering
gap assessment, not legal advice. Every conclusion marked **Needs legal confirmation** must be reviewed by counsel.
Nothing in this document, the UI or the README should be read as a statement that the site is compliant.

## A. Sources checked (official texts)

| Instrument | Source used | Status of check |
|---|---|---|
| DPDP Act 2023 (No. 22 of 2023), Gazette 11 Aug 2023 | MeitY copy of the Gazette: `meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf` (indiacode.nic.in returned 403 to automated fetches) | Read: ss.5–15, 44, Schedule |
| Commencement notification **G.S.R. 843(E)**, 13 Nov 2025 | `meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf` (Gazette Extraordinary No. 757) | Read in full |
| DPDP Rules 2025, **G.S.R. 846(E)**, 13 Nov 2025 | `meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf` | Read: Rules 1, 3, 6–9, 12, 14, 15; Third, Fourth, Seventh Schedules |
| Corrigendum **G.S.R. 892(E)**, 10 Dec 2025 | `meity.gov.in/static/uploads/2025/12/3c7ebbae0e5456f493f486e6845df86b.pdf` | Read in full |
| IT (Reasonable Security Practices and Procedures and SPDI) Rules 2011, **G.S.R. 313(E)**, 11 Apr 2011 | Scan of the Gazette notification hosted by PRS India (`prsindia.org/files/bills_acts/bills_parliament/2011/IT_Rules_2011.pdf`); the MeitY legacy URL no longer resolves | Read: Rules 3–5 |
| IT Act 2000, s.43A | **Not fetched** (indiacode blocked). Existence and pending omission confirmed by DPDP Act s.44(2)(a) | s.43A wording and the "body corporate" definition: **Needs legal confirmation** |
| CERT-In Directions No. 20(3)/2022-CERT-In, 28 Apr 2022 | `cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf` | Read: directions (ii), (iv); effective 60 days after issue |
| Data Protection Board complaint URL | Searched MeitY and Board sources; **no official URL found** | Show "Official complaint link to be confirmed" |

### Commencement (verified text)
G.S.R. 843(E) appoints:
- **(a)** the date of publication (**13 Nov 2025**) for s.1(2), s.2, ss.18–26, 35, 38–43, 44(1) and 44(3);
- **(b)** "one year from the date of publication" for s.6(9) and s.27(1)(d);
- **(c)** "eighteen months from the date of publication" for ss.3–5, 6(1)–(8) and (10), 7–10, 11–17, 27 (except
  27(1)(d)), 28–34, 36, 37 and 44(2).

DPDP Rules, Rule 1: Rules 1, 2, 17–21 from publication; **Rule 4** one year after; **Rules 3, 5–16, 22, 23**
eighteen months after. G.S.R. 892(E) corrected Rule 1's "of this Gazette" to "in the Official Gazette".

Neither notification prints the later calendar dates. Computed from 13 Nov 2025 they are **13 Nov 2026** and
**13 May 2027**. Whether each group takes effect on the 13th itself or the following day depends on how "from"
is counted (General Clauses Act 1897, s.9 excludes the first day of a period). **Needs legal confirmation.**
This document labels the layers **Now**, **Nov 2026** and **May 2027**.

Consequence: until DPDP s.44(2) commences, **IT Act s.43A and the SPDI Rules 2011 remain the operative privacy
rules for this site**, together with the CERT-In Directions.

## B. Requirements matrix

Type: **E** explicit statutory · **C** conditional legal requirement · **S** recommended security practice ·
**D** project design choice. Evidence refers to `baseline/previous-agent` (`c503b51`).

### B.1 In force now

| Provision | Layer | Type | Applies to this site? | Evidence in code | Gap |
|---|---|---|---|---|---|
| DPDP s.1(2), s.2 (definitions), ss.18–26 (Board), 35, 38–43, 44(1), 44(3) | Now | E | In force but **impose no obligation on this website** | — | None. Definitions ("Data Fiduciary", "Data Principal") may be used descriptively |
| IT Act s.43A (compensation for negligent failure to maintain reasonable security for SPDI) | Now | E/C | Yes, **if** the operator is a "body corporate" (understood to include firms and sole proprietorships; **Needs legal confirmation**) | Encryption `src/lib/crypto.js`; access control `src/lib/adminAuth.js`; audit log | Security programme not documented against SPDI Rule 8; `docs/SECURITY.md:3` frames everything as DPDP s.8(5)/Rule 6 (not yet operative) |
| SPDI Rule 3(iii),(v): health condition and medical records/history are SPDI | Now | E | **Yes**: "Reason for visit" (`notes`) and the chosen treatment (`service`) can reveal a health condition; guardian/minor flag is personal data | Fields in `pages/book-appointment.jsx`; encrypted `Appointment.service`, `notes` | Classify and disclose them as SPDI in the privacy policy |
| SPDI Rule 4: published privacy policy (practices; types of SPDI; purpose; disclosures; Rule 8 security practices) | Now | E | Yes | `pages/privacy-policy.jsx` exists | Written entirely under DPDP (not yet operative); never mentions s.43A/SPDI; **invisible in server HTML** (B-08); organisation details are placeholders (B-06); claims unsupported controls (D.2) |
| SPDI Rule 5(1): consent "in writing through letter or Fax or email" regarding purpose **before** collecting SPDI | Now | E | Yes, for health information | Separate unticked checkbox, recorded with notice version, IP hash, UA (`pages/api/appointments.js`) | Whether a website checkbox satisfies "in writing … email" is **Needs legal confirmation** (often argued via IT Act s.10A; consider an emailed confirmation) |
| SPDI Rule 5(2): collect SPDI only for a lawful purpose and only if necessary | Now | E | Yes | Reason is optional with a "no detailed history" hint; service list is fixed | Consider dropping free-text reason, or keeping it optional with a stricter hint (D) |
| SPDI Rule 5(3): person knows the fact of collection, purpose, **intended recipients**, name and address of the collecting and retaining agency | Now | E | Yes | `ConsentNotice` lists data and purposes | Recipients (processors) and the clinic's name and address are placeholders; processor list describes services not actually used (D.3) |
| SPDI Rule 5(4): do not retain SPDI longer than required | Now | E | Yes | `RETENTION` in `src/config/compliance.js`; `scripts/retention.js` | Retention job never scheduled (B-27); periods unconfirmed |
| SPDI Rule 5(5): use only for the collected purpose | Now | E | Yes | Purposes separated | Reminder and marketing consents gate **no actual processing** (D.3) |
| SPDI Rule 5(6): review and correct on request | Now | E | Yes | `/data-rights` correct/completion; download | Works only with OTP, which fails in production (B-17) |
| SPDI Rule 5(7): option not to provide; withdrawal "in writing" | Now | E | Yes | Optional fields; one-click withdrawal in portal; banner | Acceptable (more permissive than written withdrawal). Note the clinic may decline the service if required data is withdrawn |
| SPDI Rule 5(9): designate a **Grievance Officer**, publish name and contact on the website, redress **within one month** | Now | E | Yes | `ContactBlock` (footer, notices); `GRIEVANCE_RESPONSE_DAYS = 30` | Name/contact are placeholders (B-06); **30 days can exceed one month** for grievances received in late January–February: compute the due date as one calendar month or the earlier of the two |
| SPDI Rule 6: prior permission before disclosing SPDI to a third party | Now | C | Only when a processor (SMS/email/host) receives SPDI | No processor configured; `PROCESSORS` lists placeholders | Before configuring any provider, cover it in the notice and contract (Needs legal confirmation on processor vs third party) |
| SPDI Rule 8: reasonable security practices, documented information security programme (e.g. IS/ISO/IEC 27001 or an approved code), audited | Now | E/C | Yes, if s.43A applies | Technical controls exist; `docs/SECURITY.md` | No documented security policy or audit; `SECURITY.md` cites DPDP Rule 6 only |
| CERT-In Directions (ii): report listed incidents (incl. data breach, data leak, unauthorised access) to CERT-In **within 6 hours** of noticing | Now | E | Yes, "body corporate" and service providers | Breach module uses a **72-hour DPDP** clock only (`src/lib/breach.js:18`) | No CERT-In path, contact, or 6-hour clock; breach module is decorative (D.3) |
| CERT-In Directions (iv): keep logs of all ICT systems for **180 days** within India | Now | E | Yes for the host/infra | App `AuditLog` kept ≥ 365 days; no infra/server logging configured; hosting region unknown | Document hosting in India and infra log retention; app logs alone are not "all ICT systems" |
| CERT-In Directions (i): synchronise clocks with NTP of NIC/NPL | Now | E | Infrastructure | Not in code | Hosting checklist item |
| DPDP s.6(9), s.27(1)(d); Rule 4: Consent Manager registration | **Nov 2026** | C | **No**: the site does not use a Consent Manager | None | None |

### B.2 Commencing ~13 May 2027 (may be built now; must not be presented as operative)

| Provision | Layer | Type | Applies? | Evidence | Gap |
|---|---|---|---|---|---|
| s.3 (application), s.4 (lawful grounds: consent or legitimate use) | May 2027 | E | Yes (digital personal data in India) | Purposes and grounds table `pages/privacy-policy.jsx:32-75` | Booking basis to be decided (C.3) |
| s.5(1) + Rule 3: notice with itemised data, specified purposes, how to withdraw / exercise rights / complain to Board; understandable on its own | May 2027 | E | Yes, where consent is the basis | `src/components/ConsentNotice.jsx`; locales; NoticeVersion table | Board link broken (B-05); notice is client-rendered only (B-08); presented as current law (D.1) |
| s.5(3): notice available in English or an Eighth Schedule language | May 2027 | E | Yes | en + hi locales, switcher | Hindi unreviewed; policy pages English only |
| s.6(1): free, specific, informed, unconditional, unambiguous, clear affirmative action, limited to necessary data | May 2027 | E | Yes | Unticked per-purpose boxes; required purpose not bundled | Reminder/marketing purposes have no processing behind them (D.3) |
| s.6(4) withdrawal comparable in ease; s.6(6) cease processing and cause processors to cease | May 2027 | E | Yes | Portal one click; banner reopen; `instructProcessors` **stub** | Processor propagation not real; withdrawal requires OTP login (more steps than giving) — acceptable for verified identity, note in docs |
| s.6(10): Data Fiduciary must prove notice and consent | May 2027 | E | Yes, if consent basis | Append-only `ConsentRecord` with `noticeVersionId`, hash; CSV export | OK in design. Cookie-banner ledger stores hashed IP + UA for every visitor choice (C.1) |
| s.7(a): legitimate use for a purpose voluntarily provided | May 2027 | E | Candidate basis for booking (C.3) | Not used | Decision + legal review |
| s.7(f): medical emergency | May 2027 | E | Possible (clinic) | Stated in policy `pages/privacy-policy.jsx:67` | Wording fine; label layer |
| s.8(5) + Rule 6(1)(a)–(g) security safeguards | May 2027 | E | Yes | Encryption, RBAC, AuditLog, validation, headers | Rule 6(1)(d) backups **do not exist** but the policy claims them (`pages/privacy-policy.jsx:230`); 6(1)(f) processor contracts N/A until processors exist |
| s.8(6) + Rule 7: breach intimation to each Data Principal and the Board (72 h detailed report) | May 2027 | E | Yes | Admin breach module + drafts | Not connected to detection/escalation; no CERT-In 6 h (B.1) |
| s.8(7)(a) erase on withdrawal / purpose served, unless law requires retention; s.8(7)(b) processors erase | May 2027 | E | Yes | `scripts/retention.js`; `erasePrincipal` in `src/lib/rights.js` | Unscheduled; processor erasure stub |
| s.8(8) + Rule 8(1)–(2) + Third Schedule (inactivity erasure) | May 2027 | C | **No**: Third Schedule classes are large e-commerce, online gaming and social media intermediaries only | Not implemented (correct) | None |
| **Rule 8(3)**: retain personal data, traffic data and logs of processing for **at least one year** from processing (Seventh Schedule purposes), then erase | May 2027 | E | **Yes** | `RETENTION.appointmentAfterVisitDays = 30`; immediate erasure on request | **Conflict**: booking data is erased 30 days after the visit and instantly on request. Needs a 1-year hold for Rule 8(3)/Rule 6(1)(e) with restricted access, then erasure. **Needs legal confirmation** on scope |
| s.8(9) + Rule 9: publish business contact of DPO (if applicable) **or** a person who can answer questions; include it in every rights response | May 2027 | E | Yes (contact person; no DPO, see C.4) | `ContactBlock`, `withContact()` in `src/lib/rights.js` | Placeholder details (B-06) |
| s.8(10), s.13 + Rule 14(3): grievance mechanism; publish response period ≤ 90 days | May 2027 | E | Yes | Grievance page, admin SLA, 30 days | Board escalation link unverified (B-05); s.13(3) presented as currently available |
| s.9(1) verifiable parental consent; s.9(2) no detrimental processing; s.9(3) no tracking or targeted ads to children; Rule 10 | May 2027 | E | Yes, unless the Rule 12 exemption applies (C.5) | Guardian declaration; marketing hidden; analytics suppressed for the session | No verifiable-consent mechanism (only a declaration); acceptable only if the exemption applies |
| Rule 12 + Fourth Schedule Part A item 1: s.9(1),(3) do not apply to a clinical establishment / healthcare professional, processing restricted to health services to the child | May 2027 | C | Probably; **Needs legal confirmation** (definitions by reference to CEA 2010 s.2(c) and NCAHP Act 2021 s.2(j)) | Comment in `pages/api/appointments.js:8` | s.9(2) is **not** exempted and still applies |
| s.10 + Rule 13: Significant Data Fiduciary (DPO, auditor, DPIA) | May 2027 | C | **No**, unless notified by the Central Government | — | None (do not appoint a "DPO" label) |
| s.11 access (incl. identities of processors), s.12 correction/erasure, s.14 nomination, Rule 14(1),(2),(4),(5) | May 2027 | E | Yes; s.11/s.12 also cover s.7(a) processing | Portal: access, correct, erase, withdraw, nominate, download; reference ID as Rule 14(5) identifier | OTP unusable in production (B-17); duplicate reference IDs (B-19); erasure conflicts with Rule 8(3) |
| s.15 duties of Data Principals | May 2027 | E (on individuals) | Informational | Mentioned on grievance page and policy | Present as future law |
| s.16 + Rule 15 cross-border transfer | May 2027 | C | Only if hosting/processors are outside India | `HOSTING.crossBorder=false` placeholder | Hosting location unknown |
| s.33 + Schedule (penalties up to ₹250 crore) | May 2027 | E | Informational | Not shown to users | None |
| s.44(2): omits IT Act s.43A and s.87(2)(ob) | May 2027 | E | On commencement the SPDI Rules lose their parent provision | — | Plan the switch: SPDI text now, DPDP text from May 2027 |

## C. Answers to the specific questions

### C.1 Is the cookie banner justified?
**Inventory (complete):** `dpdp_consent`, `dpdp_aid`, `dpdp_rights_session` (strictly necessary), sessionStorage
`dpdp_minor_session` (necessary), and `dpdp_lang` — the **only optional item**, set only after the visitor allows
"functional" cookies. There is **no analytics, advertising or third-party tracker**; `ANALYTICS.src` is empty, so the
"Analytics" and "Marketing" toggles gate nothing. Meanwhile the banner itself creates new personal-data processing:
every choice writes three `ConsentRecord` rows with a hashed IP, user agent and a persistent anonymous ID.

Neither the SPDI Rules nor the DPDP Act contain a cookie-specific rule. A banner is warranted only where optional
processing of personal data relies on consent. Options for your decision:

- **Option A (recommended unless the test scope needs a tracker):** replace the banner with an honest
  essential-only cookie notice (a short footer line plus the cookie policy page and a "settings" link explaining
  that no optional cookies are used). Make the language preference session-only, or treat it as a user-requested
  setting. Remove the anonymous consent ledger for cookies.
- **Option B:** keep the banner because the test scope includes a real optional analytics script, self-hosted
  (no third party), loaded only through `loadScriptIfConsented`, with its cookies in the register, so that the
  banner demonstrably blocks and unblocks real processing.

### C.2 Is a database needed?
Yes, for this test environment: booking requests must reach staff, and rights/grievance requests need tracking and
evidence (REQUIREMENTS §7). Model by model:

| Model | Keep? | Reason |
|---|---|---|
| DataPrincipal, Appointment | Keep | Core booking; encrypted columns |
| NoticeVersion | Keep | Proves which notice was shown (versioning, REQUIREMENTS §4A) |
| ConsentRecord | Keep for booking consents | Evidence of SPDI Rule 5(1) consent now and s.6(10) later. **Cookie rows only under Option B** |
| RightsRequest, Grievance | Keep | Request tracking and evidence of completion (REQUIREMENTS §7); Grievance Officer one-month SLA |
| OtpChallenge | Keep (if the portal stays) | Proportionate identity verification |
| AuditLog | Keep | Access visibility (Rule 6(1)(c) later; SPDI Rule 8 now) |
| Nomination | **Simplify**: store as a `RightsRequest` of type NOMINATION with an encrypted payload | Separate table adds little; s.14 is May 2027 |
| BreachIncident | **Decision**: connect to a real documented procedure (owner, CERT-In 6 h, Board/Data Principal notices from May 2027) or remove the admin module and keep a written procedure | REQUIREMENTS §10 forbids a breach interface not connected to an operational process |

SQLite is acceptable for a single-instance test environment; production would need a managed database in India with
backups (not proposed now).

### C.3 Should booking rely on consent or on s.7(a)?
- **Now:** SPDI Rule 5(1) requires consent before collecting SPDI. The booking form collects health-related data
  (service, optional reason), so **consent is currently required for that part**. The written-consent formality is
  **Needs legal confirmation**.
- **From May 2027:** s.7(a) fits scheduling an appointment the person asked for (compare the s.7(a) illustrations:
  a pharmacy sending a receipt, a broker using details for a requested search). s.11 and s.12 rights still apply to
  s.7(a) processing. REQUIREMENTS §5 says not to use consent by default where another basis applies.
- **Recommendation for legal review:** keep explicit consent for the health information now; consider moving
  core scheduling to s.7(a) with a notice once DPDP s.4–s.7 commence; keep reminders and marketing as separate
  optional consents, and only if those processes actually exist.

### C.4 Is a DPO required?
No. A DPO is required only for a **Significant Data Fiduciary** notified under s.10(1) (May 2027); there is no
evidence of such notification. What is required: **now**, a named **Grievance Officer** with published contact
details who redresses within one month (SPDI Rule 5(9)); **from May 2027**, the business contact of a person who
can answer questions (s.8(9), Rule 9). One person can fill both roles. Avoid the title "DPO".

### C.5 Are the children's provisions applicable?
- s.9 and Rules 10 and 12 (with the Fourth Schedule) all commence in **May 2027**; they are **not operative now**.
- Fourth Schedule Part A item 1 exempts a "clinical establishment … or healthcare professional" from s.9(1) and
  s.9(3) where "processing is restricted to provision of health services to the child … to the extent necessary for
  the protection of her health". The definitions point to the Clinical Establishments Act 2010 s.2(c) and the
  NCAHP Act 2021 s.2(j). Whether a dental clinic in the relevant state, and a dentist, fall within them is
  **Needs legal confirmation**.
- s.9(2) (no processing likely to cause a detrimental effect) is **not** exempted.
- Now: a minor cannot give binding consent under general law, so SPDI consent for a child's health data should come
  from the parent/guardian (**Needs legal confirmation**). The current guardian declaration, minimal data, hidden
  marketing and session-level analytics suppression are reasonable design choices (D), not statutory mandates today.

## D. Findings that need correction regardless of option

### D.1 Text that presents May-2027 provisions as operative or implies compliance
| Location | Statement |
|---|---|
| `pages/privacy-policy.jsx:271` and section 8 | "Your rights (s.11 to s.14)" presented as current rights |
| `pages/privacy-policy.jsx:327-328` | "never more than 90 days (Rule 14(3))" as a current rule |
| `pages/privacy-policy.jsx:335` | Right to approach the Board "after using our grievance process (s.13(3))" as currently available |
| `pages/privacy-policy.jsx:343` | Board notification with 72-hour report as a current duty |
| `pages/privacy-policy.jsx:257-265` | Children's section relying on Rule 12 / Fourth Schedule |
| `src/locales/en.json:64,232` (+ hi) | "you can complain to the Board … under section 13(3)" |
| `pages/api/grievances.js:21-23` | Escalation note citing s.13(3) with a placeholder URL |
| `README.md:106` | "notices, consent flows, … a dental clinic needs under India's DPDP Act" (compliance implication) |
| `docs/SECURITY.md:3` | "How this site meets the … duty in s.8(5) … and Rule 6" (compliance claim) |
| Whole site | No mention of IT Act s.43A / SPDI Rules, the law currently in force |

### D.2 Controls claimed without evidence
| Location | Claim | Reality |
|---|---|---|
| `pages/privacy-policy.jsx:230` | "We keep encrypted backups" | No backup exists |
| `pages/privacy-policy.jsx:231` | Logs kept ≥ 1 year | Only if the unscheduled retention job runs as designed; no infra logs |
| `pages/privacy-policy.jsx:190-221` (Processors) and `src/config/compliance.js` `PROCESSORS` | Hosting, SMS/WhatsApp and email processors under contract | No SMS/email provider is configured; hosting unknown |
| Locales `notice.withdraw`; `pages/api/rights/consent.js` | Withdrawal makes processors stop | `instructProcessors` is a console stub |

### D.3 Decorative or unconnected features (REQUIREMENTS §2, §5, §10)
| Feature | Why it is decorative now | Proposal (Phase 3 decision) |
|---|---|---|
| Breach module (`pages/admin/breaches.jsx`, `BreachIncident`, `src/lib/breach.js`) | No detection, no named owner, no escalation, no CERT-In 6-hour path; generates DPDP drafts for a law not yet operative | Connect to a written procedure with CERT-In reporting, or remove and keep the procedure document |
| Analytics / Marketing cookie categories, `ConsentGate` | No script or cookie behind them | Option A removes them; Option B adds a real gated script |
| Reminder (SMS/WhatsApp) and marketing consents on the booking form | No reminder or marketing system exists; admin pages do not even show these choices to staff | Remove until a real process exists, or surface them to staff and gate an actual send |
| Processor propagation (`instructProcessors`, retention hook) | Stubs | Keep as documented TODO; remove UI claims |
| Nomination | Stored, but no process for a nominee to act | Simplify (C.2); document the manual process |
| Retention job | Real code, never scheduled | Schedule or document the manual run |

## E. Gap summary by risk (input to Phase 3)

| # | Gap | Law / layer | Risk |
|---|---|---|---|
| 1 | Notice, policy and contact details invisible without JavaScript (B-08) | SPDI Rule 4, 5(3), 5(9) — Now | High |
| 2 | Policy framed under DPDP only; no SPDI/s.43A content; future provisions stated as current (D.1) | SPDI Rule 4 — Now; REQUIREMENTS §3 | High |
| 3 | Sample/placeholder details shown as genuine; Grievance Officer not identifiable (B-06) | SPDI Rule 5(9) — Now; REQUIREMENTS §4D | High |
| 4 | Unsupported claims (backups, processors) (D.2) | REQUIREMENTS §2 | High |
| 5 | Decorative controls: breach module, analytics/marketing toggles, reminder/marketing consents (D.3) | REQUIREMENTS §2, §5, §10 | High |
| 6 | No CERT-In 6-hour incident path; no infra log retention statement | CERT-In (ii), (iv) — Now | High |
| 7 | Production deployment over HTTP breaks the site and drops consent/session cookies (B-09, B-10); OTP unusable in production (B-17) | Test environment usability | High |
| 8 | Rate-limit bypass via spoofed `X-Forwarded-For`; no admin brute-force protection (B-20, B-22); `next` advisories (B-30) | SPDI Rule 8 / s.43A — Now | High |
| 9 | Mobile soft cookie wall (B-11); dead navigation links (B-01..B-03); broken Board link (B-05) | REQUIREMENTS §4, §5 | Medium–High |
| 10 | Grievance due date 30 days vs "one month" | SPDI Rule 5(9) — Now | Medium |
| 11 | Retention 30 days / instant erasure vs Rule 8(3) one-year minimum; job unscheduled | Rule 8(3) — May 2027; SPDI 5(4) — Now | Medium (legal confirmation) |
| 12 | Consent formality for SPDI ("in writing") | SPDI Rule 5(1) — Now | Needs legal confirmation |
| 13 | Children: exemption applicability; guardian consent now | s.9, Rule 12 — May 2027 | Needs legal confirmation |
| 14 | Duplicate reference IDs; nomination model; lint/Node setup (B-19, B-24, B-25) | Hygiene / REQUIREMENTS §15 | Low–Medium |
