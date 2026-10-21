/**
 * Filters for the consent ledger (admin page and CSV export, proof under DPDP Act s.6(10)).
 */
const PURPOSES = ['APPOINTMENT', 'APPOINTMENT_REMINDERS_SMS_WHATSAPP', 'MARKETING', 'ANALYTICS_COOKIES', 'FUNCTIONAL_COOKIES'];
const STATUSES = ['GIVEN', 'DENIED', 'WITHDRAWN'];
const CHANNELS = ['COOKIE_BANNER', 'APPOINTMENT_FORM', 'PREFERENCE_CENTRE'];

export const consentFilters = (query) => ({
  purpose: PURPOSES.includes(query.purpose) ? query.purpose : '',
  status: STATUSES.includes(query.status) ? query.status : '',
  channel: CHANNELS.includes(query.channel) ? query.channel : '',
  reference: /^DP-[A-Z0-9]{6}$/.test(String(query.reference || '').toUpperCase()) ? String(query.reference).toUpperCase() : '',
  from: /^\d{4}-\d{2}-\d{2}$/.test(query.from || '') ? query.from : '',
  to: /^\d{4}-\d{2}-\d{2}$/.test(query.to || '') ? query.to : ''
});

export const consentWhere = (filters) => ({
  ...(filters.purpose && { purpose: filters.purpose }),
  ...(filters.status && { status: filters.status }),
  ...(filters.channel && { channel: filters.channel }),
  ...(filters.reference && { dataPrincipal: { referenceId: filters.reference } }),
  ...((filters.from || filters.to) && {
    timestamp: {
      ...(filters.from && { gte: new Date(`${filters.from}T00:00:00+05:30`) }),
      ...(filters.to && { lte: new Date(`${filters.to}T23:59:59.999+05:30`) })
    }
  })
});

export const CONSENT_OPTIONS = { PURPOSES, STATUSES, CHANNELS };

export const consentSelect = {
  id: true,
  timestamp: true,
  purpose: true,
  status: true,
  channel: true,
  language: true,
  givenByGuardian: true,
  appointmentId: true,
  anonymousId: true,
  ipHash: true,
  userAgent: true,
  dataPrincipal: { select: { referenceId: true } },
  noticeVersion: { select: { version: true, contentHash: true } }
};
