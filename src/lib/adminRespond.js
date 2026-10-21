/**
 * Shared handler for closing a rights request or grievance with a response.
 * DPDP Rules 2025, Rule 14(3) (respond within the published period) and Rule 9
 * (the response names the contact person).
 */
import { z } from 'zod';
import { CONTACT_PERSON } from 'config/compliance';
import { audit } from './audit';
import { requireAdmin } from './adminAuth';
import { allowMethods, hashedIp, requireSameOrigin, withErrors } from './http';
import { text } from './validation';

const schema = z
  .object({
    id: z.string().max(40),
    status: z.enum(['IN_PROGRESS', 'COMPLETED', 'PARTIALLY_COMPLETED', 'REJECTED']),
    response: text(2000, { multiline: true }).pipe(z.string().min(1))
  })
  .strict();

export const contactFooter = () =>
  `\n\nContact: ${CONTACT_PERSON.name}, ${CONTACT_PERSON.designation}, ${CONTACT_PERSON.email}, ${CONTACT_PERSON.phone}.`;

export const respondHandler = ({ permission, entity, update }) =>
  withErrors(async (req, res) => {
    if (!allowMethods(req, res, ['POST']) || !requireSameOrigin(req, res)) return;
    const admin = await requireAdmin(req, res, permission);
    if (!admin) return;
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid request' });

    const { id, status, response } = parsed.data;
    await update(id, status, `${response}${contactFooter()}`);
    await audit({ actor: `admin:${admin.username}`, action: 'UPDATE', entity, entityId: id, ipHash: hashedIp(req), detail: status });
    // TODO: send the response to the Data Principal through lib/notify.
    res.status(200).json({ ok: true });
  });
