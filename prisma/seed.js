/**
 * Seeds the first NoticeVersion for every configured language (DPDP Act s.5, Rule 3;
 * s.6(10) proof of the notice shown). Safe to re-run: existing versions are kept, and
 * the run fails if the notice text changed without a NOTICE_VERSION bump.
 *
 * Run: npx prisma db seed
 */
const { PrismaClient } = require('@prisma/client');
const { LANGUAGES } = require('../src/config/compliance');
const { ensureNoticeVersion } = require('../src/lib/noticeContent');

const prisma = new PrismaClient();

(async () => {
  for (const { code } of LANGUAGES) {
    const notice = await ensureNoticeVersion(prisma, code);
    console.log(`NoticeVersion ${notice.version} (${code}) ready: ${notice.contentHash.slice(0, 12)}…`);
  }
})()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
