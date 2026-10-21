/**
 * Visitor-facing text must be plain language: no Act section, rule, schedule or clause
 * numbers (citations belong in code comments, docs/ and the admin area). Checks the full
 * rendered text of every public page in English and Hindi, including the cookie banner
 * and its collapsed notice, the rights dashboard after sign-in, and API messages shown
 * to people. Also checks that a new notice version re-prompts the cookie banner.
 */
const { test, expect } = require('@playwright/test');
const { NOTICE_VERSION, bookViaApi, newContext, testPhone, verifyViaApi } = require('./helpers');

const CITATION = /\b(s\.|ss\.|Section|Rule|Schedule|Clause)\s?\d|§|धारा\s?\d|नियम\s?\d|अनुसूची/i;
const PUBLIC_PAGES = ['/', '/about', '/services', '/gallery', '/contact', '/sitemap', '/book-appointment', '/privacy-policy', '/cookie-policy', '/data-rights', '/grievance', '/no-such-page'];

/** All text in the page (also inside closed <details> and hidden panels), without scripts. */
const pageText = (page) =>
  page.evaluate(() => {
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll('script, style, noscript').forEach((n) => n.remove());
    const attrs = [...clone.querySelectorAll('[aria-label],[title],[alt],[placeholder]')]
      .map((el) => ['aria-label', 'title', 'alt', 'placeholder'].map((a) => el.getAttribute(a) || '').join(' '))
      .join(' ');
    return `${clone.textContent} ${attrs} ${document.title}`;
  });

const offending = (text) => {
  const hits = [];
  const re = new RegExp(CITATION.source, 'gi');
  let m;
  while ((m = re.exec(text))) hits.push(text.slice(Math.max(0, m.index - 40), m.index + 30).replace(/\s+/g, ' '));
  return hits;
};

for (const language of ['en', 'hi']) {
  test(`public pages contain no section or rule numbers (${language})`, async ({ browser, baseURL }) => {
    const ctx = await newContext(browser);
    if (language === 'hi') await ctx.addCookies([{ name: 'dpdp_lang', value: 'hi', url: baseURL }]);
    const page = await ctx.newPage();
    const problems = [];
    for (const path of PUBLIC_PAGES) {
      await page.goto(path, { waitUntil: 'networkidle' });
      // The cookie banner (no choice yet) is on every page; open its detailed view too.
      const customise = page.getByRole('dialog').getByRole('button', { name: language === 'hi' ? 'अपने अनुसार चुनें' : 'Customise' });
      if (await customise.count()) await customise.click();
      if (path === '/book-appointment') {
        // Keyboard selection: the expanded banner may cover the radio at the bottom of the viewport.
        await page.locator('#field-isMinor').focus();
        await page.keyboard.press('Space');
        await expect(page.locator('#field-isMinor')).toBeChecked();
      }
      for (const hit of offending(await pageText(page))) problems.push(`${path}: …${hit}…`);
    }
    expect(problems).toEqual([]);
    await ctx.close();
  });
}

test('rights dashboard and API messages contain no section or rule numbers', async ({ browser, baseURL }) => {
  const ctx = await newContext(browser);
  const phone = testPhone();
  const { referenceId } = await bookViaApi(ctx.request, baseURL, { phone });
  expect(await verifyViaApi(ctx.request, baseURL, referenceId, phone)).toBe(200);
  const page = await ctx.newPage();
  await page.goto('/data-rights', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Your data', exact: true })).toBeVisible();
  expect(offending(await pageText(page))).toEqual([]);
  const me = await (await ctx.request.get('/api/rights/me')).text();
  expect(offending(me)).toEqual([]);
  const grievance = await ctx.request.post('/api/grievances', {
    data: { category: 'OTHER', description: 'Synthetic test grievance', language: 'en' },
    headers: { Origin: baseURL }
  });
  expect(offending(JSON.stringify(await grievance.json()))).toEqual([]);
  const erase = await ctx.request.post('/api/rights/erase', { data: { confirm: true, language: 'en' }, headers: { Origin: baseURL } });
  expect(offending(JSON.stringify(await erase.json()))).toEqual([]);
  await ctx.close();
});

test('a new notice version re-prompts the cookie banner', async ({ browser, baseURL }) => {
  const ctx = await newContext(browser);
  const old = { v: '2026-10-21.3', c: { functional: true, analytics: false }, ts: new Date().toISOString() };
  await ctx.addCookies([{ name: 'dpdp_consent', value: encodeURIComponent(JSON.stringify(old)), url: baseURL }]);
  const page = await ctx.newPage();
  await page.goto('/', { waitUntil: 'networkidle' });
  expect(NOTICE_VERSION).not.toBe(old.v);
  await expect(page.getByRole('dialog', { name: /cookie choices/i })).toBeVisible();
  await ctx.close();
});
