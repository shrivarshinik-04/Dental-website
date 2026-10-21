/**
 * Cookie categories and the ConsentRecord purpose each maps to (DPDP Act s.6(1):
 * consent per specified purpose). Shared by the browser store and /api/consent.
 * Marketing cookies are recorded under MARKETING, the same purpose as promotional messages.
 */
export const CATEGORIES = ['functional', 'analytics', 'marketing'];

export const CATEGORY_PURPOSE = {
  functional: 'FUNCTIONAL_COOKIES',
  analytics: 'ANALYTICS_COOKIES',
  marketing: 'MARKETING'
};
