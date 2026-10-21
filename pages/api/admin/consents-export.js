/**
 * CSV export of the consent ledger: proof of consent under DPDP Act s.6(10).
 * Contains no names or contact details, only the reference ID, hashed IP and notice
 * version. Every export is audited (Rule 6(1)(c)).
 */
import prisma from 'lib/db';
import { audit } from 'lib/audit';
import { requireAdmin } from 'lib/adminAuth';
import { consentFilters, consentSelect, consentWhere } from 'lib/consentQuery';
import { allowMethods, hashedIp, withErrors } from 'lib/http';

const COLUMNS = [
  ['id', (r) => r.id],
  ['timestamp_utc', (r) => r.timestamp.toISOString()],
  ['reference_id', (r) => r.dataPrincipal?.referenceId || ''],
  ['anonymous_id', (r) => r.anonymousId || ''],
  ['purpose', (r) => r.purpose],
  ['status', (r) => r.status],
  ['channel', (r) => r.channel],
  ['notice_version', (r) => r.noticeVersion.version],
  ['notice_content_sha256', (r) => r.noticeVersion.contentHash],
  ['language', (r) => r.language],
  ['given_by_guardian', (r) => (r.givenByGuardian ? 'yes' : 'no')],
  ['ip_hash', (r) => r.ipHash || ''],
  ['user_agent', (r) => r.userAgent || '']
];

// Quote every cell and neutralise spreadsheet formula injection.
const cell = (value) => {
  const text = String(value).replace(/"/g, '""');
  return `"${/^[=+\-@\t\r]/.test(text) ? `'${text}` : text}"`;
};

export default withErrors(async (req, res) => {
  if (!allowMethods(req, res, ['GET'])) return;
  const admin = await requireAdmin(req, res, 'consents');
  if (!admin) return;

  const filters = consentFilters(req.query);
  const records = await prisma.consentRecord.findMany({
    where: consentWhere(filters),
    orderBy: { timestamp: 'asc' },
    select: consentSelect
  });

  await audit({
    actor: `admin:${admin.username}`,
    action: 'EXPORT',
    entity: 'ConsentRecord',
    entityId: `rows:${records.length}`,
    ipHash: hashedIp(req),
    detail: JSON.stringify(filters)
  });

  const csv = [COLUMNS.map(([name]) => name).join(','), ...records.map((r) => COLUMNS.map(([, get]) => cell(get(r))).join(','))].join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="consent-log-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(`﻿${csv}`);
});
