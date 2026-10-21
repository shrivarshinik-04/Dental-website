/**
 * Personal data breach intimation drafts. DPDP Act s.8(6); DPDP Rules 2025, Rule 7.
 *
 * Rule 7(1): intimation to each affected Data Principal, without delay: (a) description
 * incl. nature, extent, timing and location; (b) relevant consequences; (c) mitigation
 * measures; (d) safety measures they can take; (e) business contact of a person who can
 * respond on our behalf.
 * Rule 7(2): intimation to the Board (a) without delay, describing the breach incl.
 * nature, extent, timing, location and likely impact; and (b) within 72 hours of
 * becoming aware (or a longer period the Board allows): updated and detailed facts,
 * circumstances and reasons; mitigation; findings on who caused it; remedial measures
 * to prevent recurrence; and a report on intimations given to Data Principals.
 *
 * These are drafts for a human to review before sending. Have counsel check them.
 */
import { CLINIC, CONTACT_PERSON } from 'config/compliance';

export const DETAILED_REPORT_HOURS = 72;

const fmt = (date) =>
  date ? new Date(date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long', timeStyle: 'short' }) + ' IST' : '[NOT RECORDED]';
const or = (value) => (value && String(value).trim() ? value : '[TO BE COMPLETED]');

export const contactLine = () =>
  `${CONTACT_PERSON.name}, ${CONTACT_PERSON.designation}, ${CLINIC.legalName}. Email: ${CONTACT_PERSON.email}. Phone: ${CONTACT_PERSON.phone}. Address: ${CONTACT_PERSON.address}.`;

/** Rule 7(2)(a): initial intimation to the Board, without delay. */
export const draftBoardIntimation = (incident) => `To: Data Protection Board of India
From: ${CLINIC.legalName} (Data Fiduciary), ${CLINIC.address}
Subject: Intimation of personal data breach under section 8(6) of the DPDP Act, 2023 and Rule 7(2)(a) of the DPDP Rules, 2025

1. Description of the breach: ${or(incident.description)}
2. Nature of the breach: ${or(incident.nature)}
3. Extent of the breach: ${or(incident.extent)}. Approximate number of Data Principals affected: ${incident.affectedCount}.
4. Timing: occurred ${fmt(incident.occurredAt)}; we became aware ${fmt(incident.detectedAt)}.
5. Location: ${or(incident.location)}
6. Likely impact: ${or(incident.likelyImpact)}

A detailed report under Rule 7(2)(b) will follow by ${fmt(incident.detailedReportDueAt)}.

Contact: ${contactLine()}`;

/** Rule 7(2)(b): detailed report to the Board within 72 hours. */
export const draftBoardDetailedReport = (incident) => `To: Data Protection Board of India
From: ${CLINIC.legalName} (Data Fiduciary)
Subject: Detailed report on personal data breach under Rule 7(2)(b) of the DPDP Rules, 2025
Initial intimation sent: ${fmt(incident.boardIntimatedAt)}

(i) Updated and detailed description, facts, circumstances and reasons: ${or(incident.rootCause)}
    Nature: ${or(incident.nature)}. Extent: ${or(incident.extent)}. Affected Data Principals: ${incident.affectedCount}.
(ii) Measures implemented or proposed to mitigate risk: ${or(incident.mitigation)}
(iii) Findings regarding the person who caused the breach: ${or(incident.responsibleFindings)}
(iv) Remedial measures taken to prevent recurrence: ${or(incident.remedialMeasures)}
(v) Report on intimations given to affected Data Principals: ${
  incident.principalsIntimatedAt
    ? `Intimation sent to affected Data Principals on ${fmt(incident.principalsIntimatedAt)}.`
    : '[NOT YET SENT: record the date once sent]'
}

Contact: ${contactLine()}`;

/** Rule 7(1): notice to each affected Data Principal, in plain language, without delay. */
export const draftPrincipalNotice = (incident) => `Subject: Important: a security incident affecting your personal data at ${CLINIC.tradeName}

Dear patient,

We are writing to tell you about a security incident that affected personal data we hold about you.

(a) What happened: ${or(incident.description)}
    Nature: ${or(incident.nature)}. Extent: ${or(incident.extent)}.
    When: ${fmt(incident.occurredAt)} (we became aware on ${fmt(incident.detectedAt)}). Where: ${or(incident.location)}.
(b) What this may mean for you: ${or(incident.consequencesForPrincipals)}
(c) What we have done and are doing to reduce the risk: ${or(incident.mitigation)}
(d) What you can do to protect yourself: ${or(incident.safetyMeasuresForPrincipals)}
(e) Who to contact with questions: ${contactLine()}

You can also raise a grievance with us, and you have the right to complain to the Data Protection Board of India.

${CLINIC.legalName}`;
