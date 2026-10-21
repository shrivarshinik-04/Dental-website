/**
 * Runs after the whole suite: checks every row the tests stored in the synthetic
 * prisma/test.db with the same read-only checks as `npm run data:check`, so a form that
 * stores data badly fails the run even if its own test missed it.
 */
const { PrismaClient } = require('@prisma/client');
const { checkData } = require('../../scripts/check-data');
const { TEST_DB } = require('../../playwright.config');

module.exports = async () => {
  const prisma = new PrismaClient({ datasources: { db: { url: `file:${TEST_DB}` } } });
  try {
    const results = await checkData(prisma, { key: process.env.E2E_ENCRYPTION_KEY });
    const errors = results.flatMap((r) => r.errors.map((e) => `${r.check}: ${e.id}: ${e.problem}`));
    const checked = results.reduce((n, r) => n + r.checked, 0);
    if (errors.length) throw new Error(`Stored data check failed (${errors.length}):\n${errors.join('\n')}`);
    console.log(`Stored data check: ${checked} records in prisma/test.db, no problems.`);
  } finally {
    await prisma.$disconnect();
  }
};
