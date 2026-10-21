/**
 * Breach register API. DPDP Act s.8(6); DPDP Rules 2025, Rule 7. Records incidents,
 * sets the 72-hour detailed-report deadline, and logs when each intimation was sent.
 */
import { z } from 'zod';
import prisma from 'lib/db';
import { audit } from 'lib/audit';
import { requireAdmin } from 'lib/adminAuth';
import { DETAILED_REPORT_HOURS } from 'lib/breach';
import { breachSchema } from 'lib/validation';
import { allowMethods, hashedIp, requireSameOrigin, withErrors } from 'lib/http';

const MILESTONE_STATUS = {
  boardIntimatedAt: 'BOARD_INTIMATED',
  principalsIntimatedAt: null,
  detailedReportSentAt: 'REPORT_SUBMITTED'
};

const markSchema = z.object({ id: z.string().max(40), action: z.literal('mark'), milestone: z.enum(Object.keys(MILESTONE_STATUS)) }).strict();
const closeSchema = z.object({ id: z.string().max(40), action: z.literal('close') }).strict();

export default withErrors(async (req, res) => {
  if (!allowMethods(req, res, ['POST']) || !requireSameOrigin(req, res)) return;
  const admin = await requireAdmin(req, res, 'breaches');
  if (!admin) return;
  const actor = `admin:${admin.username}`;
  const ipHash = hashedIp(req);
  const body = req.body || {};

  if (body.action === 'mark') {
    const parsed = markSchema.safeParse(body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid request' });
    const { id, milestone } = parsed.data;
    const status = MILESTONE_STATUS[milestone];
    await prisma.breachIncident.update({ where: { id }, data: { [milestone]: new Date(), ...(status && { status }) } });
    await audit({ actor, action: 'UPDATE', entity: 'BreachIncident', entityId: id, ipHash, detail: milestone });
    return res.status(200).json({ ok: true });
  }

  if (body.action === 'close') {
    const parsed = closeSchema.safeParse(body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid request' });
    await prisma.breachIncident.update({ where: { id: parsed.data.id }, data: { status: 'CLOSED' } });
    await audit({ actor, action: 'UPDATE', entity: 'BreachIncident', entityId: parsed.data.id, ipHash, detail: 'closed' });
    return res.status(200).json({ ok: true });
  }

  const { id, action, ...fields } = body;
  const parsed = breachSchema.safeParse(fields);
  if (!parsed.success) return res.status(400).json({ error: 'Please complete the required fields.' });
  // Rule 7(2)(b): the detailed report is due 72 hours after we became aware.
  const data = { ...parsed.data, detailedReportDueAt: new Date(parsed.data.detectedAt.getTime() + DETAILED_REPORT_HOURS * 3600000) };

  if (action === 'update' && typeof id === 'string') {
    await prisma.breachIncident.update({ where: { id }, data });
    await audit({ actor, action: 'UPDATE', entity: 'BreachIncident', entityId: id, ipHash });
    return res.status(200).json({ ok: true });
  }

  const incident = await prisma.breachIncident.create({ data });
  await audit({ actor, action: 'CREATE', entity: 'BreachIncident', entityId: incident.id, ipHash });
  res.status(201).json({ id: incident.id });
});
