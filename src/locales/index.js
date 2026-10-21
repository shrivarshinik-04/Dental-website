/**
 * Locale registry for notices and consent text (DPDP Act s.5(3), s.6(3): English
 * plus languages in the Eighth Schedule). CommonJS so the seed script can use it.
 * To add a language: create xx.json with the same keys, register it here and in
 * LANGUAGES in src/config/compliance.js, then bump NOTICE_VERSION.
 */
module.exports = {
  en: require('./en.json'),
  hi: require('./hi.json')
};
