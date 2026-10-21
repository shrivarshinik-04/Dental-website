/**
 * Respond to a rights request (DPDP Act s.11–s.14; Rule 14).
 */
import prisma from 'lib/db';
import { respondHandler } from 'lib/adminRespond';

export default respondHandler({
  permission: 'rights',
  entity: 'RightsRequest',
  update: (id, status, response) =>
    prisma.rightsRequest.update({
      where: { id },
      data: { status, response: JSON.stringify({ message: response }), respondedAt: status === 'IN_PROGRESS' ? null : new Date() }
    })
});
