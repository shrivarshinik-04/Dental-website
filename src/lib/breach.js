/**
 * Incident and personal data breach drafts (connected to docs/BREACH-RESPONSE.md and the
 * admin register at /admin/breaches). Drafts are for the incident owner to review and send.
 *
 * In force now: CERT-In Directions No. 20(3)/2022-CERT-In of 28 April 2022:
 *  - direction (ii): report incidents of the types in Annexure I (incl. data breach, data
 *    leak, unauthorised access) to CERT-In within 6 hours of noticing them;
 *  - direction (iii): designate a Point of Contact (Annexure II details).
 * Expected from about 13 May 2027 (DPDP Act s.8(6); DPDP Rules 2025, Rule 7):
 *  - Rule 7(1): intimate each affected Data Principal without delay with (a) description,
 *    nature, extent, timing; (b) consequences; (c) mitigation; (d) safety measures they can
 *    take; (e) business contact of a person who can respond;
 *  - Rule 7(2): intimate the Board (a) without delay and (b) within 72 hours with a detailed
 *    report: facts and reasons, mitigation, findings on who caused it, remedial measures,
 *    report on intimations to Data Principals.
 */
import { CLINIC, CONTACT_PERSON, INCIDENT_OWNER } from 'config/compliance';

export const DETAILED_REPORT_HOURS = 72;
export const CERTIN_REPORT_HOURS = 6;

// CERT-In Directions 2022, Annexure I (types that must be reported).
export const CERTIN_INCIDENT_TYPES = [
  ['i', 'Targeted scanning/probing of critical networks/systems'],
  ['ii', 'Compromise of critical systems/information'],
  ['iii', 'Unauthorised access of IT systems/data'],
  ['iv', 'Defacement of website or intrusion into a website'],
  ['v', 'Malicious code attacks (virus, worm, ransomware, etc.)'],
  ['vi', 'Attack on servers (database, mail, DNS) and network devices'],
  ['vii', 'Identity theft, spoofing and phishing attacks'],
  ['viii', 'Denial of Service (DoS / DDoS) attacks'],
  ['x', 'Attacks on applications'],
  ['xi', 'Data Breach'],
  ['xii', 'Data Leak'],
  ['xvii', 'Unauthorised access to social media accounts'],
  ['xviii', 'Attacks affecting cloud computing systems'],
  ['other', 'Other type listed in Annexure I (state it in the description)']
];

export const certInDueAt = (incident) => new Date(new Date(incident.detectedAt).getTime() + CERTIN_REPORT_HOURS * 3600000);

const fmt = (date) =>
  date ? new Date(date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long', timeStyle: 'short' }) + ' IST' : '[NOT RECORDED]';
const or = (value) => (value && String(value).trim() ? value : '[TO BE COMPLETED]');

export const contactLine = () =>
  `${CONTACT_PERSON.name}, ${CONTACT_PERSON.designation}, ${CLINIC.legalName}. Email: ${CONTACT_PERSON.email}. Phone: ${CONTACT_PERSON.phone}. Address: ${CONTACT_PERSON.address}.`;

/** CERT-In direction (ii): report within 6 hours of noticing. Send to incident@cert-in.org.in. */
export const draftCertInReport = (incident) => {
  const type = CERTIN_INCIDENT_TYPES.find(([code]) => code === incident.incidentType);
  return `To: CERT-In (incident@cert-in.org.in; phone 1800-11-4949)
Subject: Cyber security incident report — ${CLINIC.legalName}

Reporting entity: ${CLINIC.legalName}, ${CLINIC.address}
Point of Contact (Annexure II): ${INCIDENT_OWNER.name}, ${INCIDENT_OWNER.email}, ${INCIDENT_OWNER.phone}
Incident type (Annexure I): ${type ? `${type[0]}. ${type[1]}` : '[TO BE SELECTED]'}
Time of occurrence: ${fmt(incident.occurredAt)}
Time noticed: ${fmt(incident.detectedAt)} (report due by ${fmt(certInDueAt(incident))})
Systems / location affected: ${or(incident.location)}
Description: ${or(incident.description)}
Nature and extent: ${or(incident.nature)}; ${or(incident.extent)}
Personal data affected: approximately ${incident.affectedCount} individuals
Actions taken so far: ${or(incident.mitigation)}

Check the current reporting format on www.cert-in.org.in before sending.`;
};

/** Rule 7(2)(a): initial intimation to the Board, without delay (from about May 2027). */
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

/** Rule 7(2)(b): detailed report to the Board within 72 hours (from about May 2027). */
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

/** Rule 7(1): notice to each affected Data Principal, without delay (from about May 2027). */
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
