/**
 * Staff updates to an appointment: status and the clinical-record flag that blocks
 * erasure (DPDP Act s.8(7)). Role-checked and audited (Rule 6(1)(b)–(c)).
 */
import { z } from 'zod';
import prisma from 'lib/db';
import { audit } from 'lib/audit';
import { requireAdmin } from 'lib/adminGuard';
import { allowMethods, hashedIp, requireSameOrigin, withErrors } from 'lib/http';

const schema = z
  .object({
    id: z.string().max(40),
    status: z.enum(['REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).optional(),
    legallyRequired: z.boolean().optional()
  })
  .strict();

export default withErrors(async (req, res) => {
  if (!allowMethods(req, res, ['POST']) || !requireSameOrigin(req, res)) return;
  const admin = await requireAdmin(req, res, 'appointments');
  if (!admin) return;

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request' });
  const { id, ...change } = parsed.data;
  if (change.status === 'COMPLETED') change.completedAt = new Date();

  await prisma.appointment.update({ where: { id }, data: change });
  await audit({
    actor: `admin:${admin.username}`,
    action: 'UPDATE',
    entity: 'Appointment',
    entityId: id,
    ipHash: hashedIp(req),
    detail: Object.keys(change).join(',')
  });
  res.status(200).json({ ok: true });
});
