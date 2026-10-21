/**
 * Resolve a grievance (DPDP Act s.13; Rule 14(3)). The resolution keeps the s.13(3)
 * escalation note so the person knows they may approach the Board.
 */
import prisma from 'lib/db';
import { respondHandler } from 'lib/adminRespond';

export default respondHandler({
  permission: 'grievances',
  entity: 'Grievance',
  update: async (id, status, response) => {
    const grievance = await prisma.grievance.findUniqueOrThrow({ where: { id }, select: { escalationNote: true } });
    return prisma.grievance.update({
      where: { id },
      data: {
        status,
        resolution: status === 'IN_PROGRESS' ? null : `${response}\n\n${grievance.escalationNote}`,
        resolvedAt: status === 'IN_PROGRESS' ? null : new Date()
      }
    });
  }
});
