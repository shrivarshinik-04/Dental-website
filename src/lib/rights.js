/**
 * Data Principal rights: DPDP Act s.11 (access), s.12 (correction, completion,
 * updating, erasure), s.6(4) (withdrawal), s.14 (nomination); DPDP Rules 2025,
 * Rule 14. Server-only.
 *
 * Every response carries the Rule 9 contact person (see `withContact`).
 */
import { CONTACT_PERSON, PROCESSORS, PURPOSES, RETENTION, RIGHTS_RESPONSE_DAYS } from 'config/compliance';
import prisma from './db';
import { decrypt } from './crypto';
import { addDays } from './http';

// Purposes a person can manage in the portal. Only APPOINTMENT is collected now; the
// legacy reminder/marketing purposes are listed only if a record holds them, so they can
// still be withdrawn.
export const USER_PURPOSES = ['APPOINTMENT'];
const LEGACY_PURPOSES = ['APPOINTMENT_REMINDERS_SMS_WHATSAPP', 'MARKETING'];

/** Rule 9: every response to a rights request names the person who can answer questions. */
export const withContact = (body) => ({ ...body, contact: CONTACT_PERSON });

export const loadPrincipal = (id, client = prisma) =>
  client.dataPrincipal.findUnique({
    where: { id },
    include: {
      appointments: { orderBy: { preferredDate: 'desc' } },
      consents: { orderBy: { timestamp: 'asc' }, include: { noticeVersion: { select: { version: true } } } },
      nominations: { where: { active: true } },
      rightsRequests: { orderBy: { createdAt: 'desc' }, take: 20 },
      grievances: { orderBy: { createdAt: 'desc' }, take: 20 }
    }
  });

/** Latest event per purpose from the append-only ledger. */
export const currentConsents = (consents) => {
  const latest = {};
  consents.forEach((c) => {
    if (!latest[c.purpose] || latest[c.purpose].timestamp <= c.timestamp) latest[c.purpose] = c;
  });
  return latest;
};

export const hasMinorAppointments = (principal) => principal.appointments.some((a) => a.patientIsMinor);

/** s.11(1)(a)–(c): summary of data, processing activities and who it was shared with. */
export const buildSummary = (principal) => {
  const latest = currentConsents(principal.consents);
  return {
    referenceId: principal.referenceId,
    personalData: {
      name: decrypt(principal.name),
      phone: decrypt(principal.phone),
      email: decrypt(principal.email)
    },
    appointments: principal.appointments.map((a) => ({
      id: a.id,
      preferredDate: a.preferredDate.toISOString().slice(0, 10),
      preferredSlot: a.preferredSlot,
      service: decrypt(a.service),
      reason: decrypt(a.notes),
      patientIsMinor: a.patientIsMinor,
      guardianName: decrypt(a.guardianName),
      guardianRelationship: decrypt(a.guardianRelationship),
      status: a.status,
      legallyRequired: a.legallyRequired
    })),
    consents: [...USER_PURPOSES, ...LEGACY_PURPOSES.filter((p) => latest[p])].map(
      (purpose) => ({
        purpose,
        status: latest[purpose]?.status || 'NOT_GIVEN',
        at: latest[purpose]?.timestamp?.toISOString() || null,
        noticeVersion: latest[purpose]?.noticeVersion?.version || null,
        givenByGuardian: latest[purpose]?.givenByGuardian || false,
        lawfulGround: PURPOSES[purpose].ground,
        required: PURPOSES[purpose].required
      })
    ),
    consentHistory: principal.consents.map((c) => ({
      purpose: c.purpose,
      status: c.status,
      channel: c.channel,
      at: c.timestamp.toISOString(),
      noticeVersion: c.noticeVersion?.version,
      language: c.language,
      givenByGuardian: c.givenByGuardian
    })),
    nominations: principal.nominations.map((n) => ({
      name: decrypt(n.nomineeName),
      relationship: decrypt(n.relationship),
      contact: decrypt(n.contact),
      since: n.createdAt.toISOString()
    })),
    requests: principal.rightsRequests.map((r) => ({
      type: r.type,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      dueDate: r.dueDate.toISOString(),
      respondedAt: r.respondedAt?.toISOString() || null
    })),
    grievances: principal.grievances.map((g) => ({
      referenceNumber: g.referenceNumber,
      status: g.status,
      dueDate: g.dueDate.toISOString()
    })),
    processing: Object.entries(PURPOSES)
      .filter(([, info]) => !info.legacy)
      .map(([purpose, info]) => ({ purpose, lawfulGround: info.ground })),
    processors: PROCESSORS,
    retention: {
      bookingDataDaysAfterVisit: RETENTION.appointmentAfterVisitDays,
      clinicalRecordDays: RETENTION.clinicalRecordDays
    }
  };
};

/** Records a rights request. Automated requests are completed straight away. */
export const recordRequest = (client, { principal, type, method, payload, response, status = 'COMPLETED' }) => {
  const now = new Date();
  return client.rightsRequest.create({
    data: {
      dataPrincipalId: principal.id,
      type,
      status,
      identifierProvided: principal.referenceId,
      verificationMethod: method,
      payload: payload ? JSON.stringify(payload) : null,
      response: response ? JSON.stringify(response) : null,
      dueDate: addDays(now, RIGHTS_RESPONSE_DAYS),
      respondedAt: status === 'OPEN' ? null : now
    }
  });
};

export const verificationMethod = (session) => (session.channel === 'email' ? 'OTP_EMAIL' : 'OTP_PHONE');

/**
 * s.12(3) erasure. Erases everything not required by law:
 *  - withdraws all active consents (new WITHDRAWN events; the ledger is kept as proof, s.6(10));
 *  - deletes appointments that are not part of the clinical record;
 *  - deletes nominations;
 *  - if no clinical record remains, erases name, phone and email and marks the principal erased;
 *    otherwise keeps only name + phone (needed to identify the clinical record) and erases email.
 * Returns what was erased and what was retained, with the legal basis.
 */
export const erasePrincipal = async (tx, principal, { noticeVersionId, language, ipHash, userAgent }) => {
  const latest = currentConsents(principal.consents);
  const toWithdraw = Object.values(latest).filter((c) => c.status === 'GIVEN' && c.dataPrincipalId);
  if (toWithdraw.length) {
    await tx.consentRecord.createMany({
      data: toWithdraw.map((c) => ({
        dataPrincipalId: principal.id,
        purpose: c.purpose,
        status: 'WITHDRAWN',
        noticeVersionId,
        language,
        channel: 'PREFERENCE_CENTRE',
        givenByGuardian: c.givenByGuardian,
        ipHash,
        userAgent
      }))
    });
  }

  const retained = principal.appointments.filter((a) => a.legallyRequired);
  const erasable = principal.appointments.filter((a) => !a.legallyRequired);
  if (erasable.length) await tx.appointment.deleteMany({ where: { id: { in: erasable.map((a) => a.id) } } });
  await tx.nomination.deleteMany({ where: { dataPrincipalId: principal.id } });
  await tx.otpChallenge.deleteMany({ where: { dataPrincipalId: principal.id } });

  if (retained.length) {
    await tx.dataPrincipal.update({ where: { id: principal.id }, data: { email: null } });
  } else {
    await tx.dataPrincipal.update({
      where: { id: principal.id },
      data: { name: null, phone: null, email: null, erasedAt: new Date() }
    });
  }

  return {
    erased: {
      appointments: erasable.length,
      consentsWithdrawn: toWithdraw.map((c) => c.purpose),
      nominations: principal.nominations.length,
      contactDetails: retained.length ? ['email'] : ['name', 'phone', 'email']
    },
    retained: retained.length
      ? {
          appointments: retained.length,
          fields: ['name', 'phone', 'appointment date', 'service', 'reason for visit'],
          reason:
            'These visits are part of your clinical record, which we must keep by law for the period required by medical regulations.',
          legalBasis:
            'DPDP Act 2023, s.8(7): personal data is erased "unless retention is necessary for compliance with any law for the time being in force". Clinical records must be kept under the medical record-keeping rules that apply to the clinic.',
          retainUntilApprox: `${RETENTION.clinicalRecordDays} days after the visit`
        }
      : null,
    fullyErased: !retained.length
  };
};
