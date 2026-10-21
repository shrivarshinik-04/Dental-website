/**
 * Prisma client singleton (reused across hot reloads in development).
 * Server-only. Storage for the DPDP compliance records described in prisma/schema.prisma.
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

// Query logging is off: queries carry personal data and must not reach the console
// (Rule 6, "never log raw personal data").
const prisma = globalForPrisma.__prisma || new PrismaClient({ log: ['error'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.__prisma = prisma;

export default prisma;
