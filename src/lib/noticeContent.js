/**
 * Builds the exact notice content stored in NoticeVersion (DPDP Act s.5, Rule 3;
 * proof of the notice shown, s.6(10)). Shared by the API routes and prisma/seed.js,
 * hence CommonJS.
 */
const crypto = require('crypto');
const locales = require('../locales');
const {
  NOTICE_VERSION,
  NOTICE_EFFECTIVE_FROM,
  CLINIC,
  GRIEVANCE_OFFICER,
  PRIVACY_CONTACT,
  DATA_PROTECTION_BOARD,
  GRIEVANCE_RESPONSE_DAYS
} = require('../config/compliance');

// Values substituted into the notice text and the contact block shown with it. Stored with
// the text so the record matches exactly what the person saw.
const pick = ({ name, email, phone }) => ({ name, email, phone });
const noticeVars = () => ({
  clinic: CLINIC.tradeName,
  legalName: CLINIC.legalName,
  address: CLINIC.address,
  board: DATA_PROTECTION_BOARD.name,
  grievanceDays: GRIEVANCE_RESPONSE_DAYS,
  grievanceOfficer: pick(GRIEVANCE_OFFICER),
  privacyContact: pick(PRIVACY_CONTACT),
  isSample: CLINIC.isSample
});

const buildNotice = (language) => {
  const locale = locales[language];
  if (!locale) throw new Error(`Unknown notice language: ${language}`);
  const content = JSON.stringify({ text: locale.notice, vars: noticeVars() });
  return {
    version: NOTICE_VERSION,
    language,
    content,
    contentHash: crypto.createHash('sha256').update(content).digest('hex'),
    dataItems: JSON.stringify(Object.entries(locale.notice.data).map(([key, label]) => ({ key, label }))),
    purposes: JSON.stringify(Object.entries(locale.notice.purposes).map(([key, value]) => ({ key, ...value }))),
    effectiveFrom: new Date(`${NOTICE_EFFECTIVE_FROM}T00:00:00+05:30`)
  };
};

/**
 * Returns the NoticeVersion row for the current version + language, creating it
 * on first use. Refuses to continue if the notice text was edited without bumping
 * NOTICE_VERSION, because consents would then point at text the person never saw.
 */
const ensureNoticeVersion = async (prisma, language) => {
  const notice = buildNotice(language);
  const existing = await prisma.noticeVersion.findUnique({
    where: { version_language: { version: notice.version, language } }
  });
  if (existing) {
    if (existing.contentHash !== notice.contentHash) {
      throw new Error(
        `Notice text for ${language} changed but NOTICE_VERSION is still ${notice.version}. Bump NOTICE_VERSION in src/config/compliance.js.`
      );
    }
    return existing;
  }
  return prisma.noticeVersion.create({ data: notice });
};

module.exports = { buildNotice, ensureNoticeVersion };
