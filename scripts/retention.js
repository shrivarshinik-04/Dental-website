/**
 * Retention and erasure job. Run daily from cron, e.g.
 *   15 2 * * *  cd /srv/clinic && node scripts/retention.js >> /var/log/clinic-retention.log 2>&1
 * Use --dry-run to see what would be erased without changing anything.
 *
 * DPDP Act 2023, s.8(7): erase personal data once the purpose is served or consent is
 * withdrawn (whichever is earlier), unless retention is necessary to comply with law,
 * and have Data Processors erase their copies too.
 * DPDP Rules 2025, Rule 6(1)(e) and Rule 8(3): keep logs for at least one year. This
 * script never deletes audit logs, consent records or request records younger than
 * MIN_LOG_RETENTION_DAYS, whatever RETENTION says.
 *
 * Periods are set in src/config/compliance.js (RETENTION). Logs only counts and IDs.
 */
const { PrismaClient } = require('@prisma/client');
const { RETENTION, MIN_LOG_RETENTION_DAYS } = require('../src/config/compliance');

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');
const ACTOR = 'system:retention';
const DAY = 24 * 60 * 60 * 1000;
const before = (days) => new Date(Date.now() - days * DAY);
const logDays = (days) => Math.max(days, MIN_LOG_RETENTION_DAYS);

const audit = (action, entity, entityId, detail) =>
  DRY_RUN ? null : prisma.auditLog.create({ data: { actor: ACTOR, action, entity, entityId, detail } });

/**
 * s.8(7)(b): tell each Data Processor to erase its copy.
 * TODO: call your SMS/WhatsApp and email providers' deletion APIs here and store their
 * confirmation. Until then this only records that the instruction is due.
 */
const instructProcessorsToErase = async (referenceIds) => {
  if (!referenceIds.length) return;
  console.log(`[retention] TODO processor erasure for ${referenceIds.length} principal(s)`);
  for (const ref of referenceIds) await audit('PROCESSOR_ERASE_REQUESTED', 'DataPrincipal', ref, 'TODO: processor hook');
};

const deleteAppointments = async (label, where) => {
  const rows = await prisma.appointment.findMany({ where, select: { id: true } });
  if (!DRY_RUN && rows.length) {
    await prisma.appointment.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
    for (const r of rows) await audit('DELETE', 'Appointment', r.id, label);
  }
  console.log(`[retention] appointments (${label}): ${rows.length}`);
};

const latestStatus = (consents, purpose) =>
  consents.filter((c) => c.purpose === purpose).sort((a, b) => b.timestamp - a.timestamp)[0]?.status;

async function main() {
  console.log(`[retention] start ${new Date().toISOString()}${DRY_RUN ? ' (dry run)' : ''}`);

  // 1. Purpose served: the visit date has passed and it is not part of the clinical record.
  await deleteAppointments('purpose served', {
    legallyRequired: false,
    preferredDate: { lt: before(RETENTION.appointmentAfterVisitDays) }
  });

  // 2. Cancelled, including cancellations caused by consent withdrawal (s.6(6)).
  await deleteAppointments('cancelled / consent withdrawn', {
    legallyRequired: false,
    status: 'CANCELLED',
    updatedAt: { lt: before(RETENTION.appointmentAfterVisitDays) }
  });

  // 3. Clinical records past their legal retention period.
  //    [CONFIRM WITH COUNSEL] RETENTION.clinicalRecordDays.
  await deleteAppointments('clinical record period ended', {
    legallyRequired: true,
    OR: [
      { completedAt: { lt: before(RETENTION.clinicalRecordDays) } },
      { completedAt: null, preferredDate: { lt: before(RETENTION.clinicalRecordDays) } }
    ]
  });

  // 4. Principals with no remaining appointment and no ongoing consented purpose:
  //    erase identifying data, keep the anonymous shell so the consent ledger stays intact.
  const principals = await prisma.dataPrincipal.findMany({
    where: { erasedAt: null, appointments: { none: {} } },
    select: { id: true, referenceId: true, consents: { select: { purpose: true, status: true, timestamp: true } } }
  });
  const toErase = principals.filter((p) => latestStatus(p.consents, 'MARKETING') !== 'GIVEN');
  if (!DRY_RUN) {
    for (const p of toErase) {
      await prisma.$transaction([
        prisma.nomination.deleteMany({ where: { dataPrincipalId: p.id } }),
        prisma.otpChallenge.deleteMany({ where: { dataPrincipalId: p.id } }),
        prisma.dataPrincipal.update({ where: { id: p.id }, data: { name: null, phone: null, email: null, erasedAt: new Date() } })
      ]);
      await audit('DELETE', 'DataPrincipal', p.id, 'retention: purpose served or consent withdrawn');
    }
  }
  console.log(`[retention] principals erased: ${toErase.length}`);
  await instructProcessorsToErase(toErase.map((p) => p.referenceId));

  // 5. Expired one-time codes.
  const otp = DRY_RUN
    ? await prisma.otpChallenge.count({ where: { createdAt: { lt: before(RETENTION.otpDays) } } })
    : (await prisma.otpChallenge.deleteMany({ where: { createdAt: { lt: before(RETENTION.otpDays) } } })).count;
  console.log(`[retention] one-time codes: ${otp}`);

  // 6. Closed rights requests and grievances (kept at least one year).
  const requestCutoff = before(logDays(RETENTION.requestRecordDays));
  const rightsWhere = { respondedAt: { lt: requestCutoff } };
  const grievanceWhere = { resolvedAt: { lt: requestCutoff } };
  const rights = DRY_RUN ? await prisma.rightsRequest.count({ where: rightsWhere }) : (await prisma.rightsRequest.deleteMany({ where: rightsWhere })).count;
  const grievances = DRY_RUN ? await prisma.grievance.count({ where: grievanceWhere }) : (await prisma.grievance.deleteMany({ where: grievanceWhere })).count;
  console.log(`[retention] closed rights requests: ${rights}, grievances: ${grievances}`);

  // 7. Consent records: only for anonymous visitors or principals erased long ago, so
  //    proof of any consent still relied on is never lost (s.6(10)).
  const consentCutoff = before(logDays(RETENTION.consentRecordDays));
  const consentWhere = {
    timestamp: { lt: consentCutoff },
    OR: [{ dataPrincipalId: null }, { dataPrincipal: { erasedAt: { lt: consentCutoff } } }]
  };
  const consents = DRY_RUN ? await prisma.consentRecord.count({ where: consentWhere }) : (await prisma.consentRecord.deleteMany({ where: consentWhere })).count;
  console.log(`[retention] consent records: ${consents}`);

  // 8. Audit logs older than the retention period (never less than one year).
  const auditWhere = { timestamp: { lt: before(logDays(RETENTION.auditLogDays)) } };
  const logs = DRY_RUN ? await prisma.auditLog.count({ where: auditWhere }) : (await prisma.auditLog.deleteMany({ where: auditWhere })).count;
  console.log(`[retention] audit log entries: ${logs}`);

  await audit('RETENTION_RUN', 'System', null, JSON.stringify({ principals: toErase.length, otp, rights, grievances, consents, logs }));
  console.log('[retention] done');
}

main()
  .catch((err) => {
    console.error(`[retention] failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
