/**
 * Optional cookie categories and the ConsentRecord purpose each maps to (one choice per
 * purpose). Shared by the browser store and /api/consent. There is no marketing
 * category: nothing on the site does marketing.
 */
export const CATEGORIES = ['functional', 'analytics'];

export const CATEGORY_PURPOSE = {
  functional: 'FUNCTIONAL_COOKIES',
  analytics: 'ANALYTICS_COOKIES'
};
