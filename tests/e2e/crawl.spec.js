/**
 * Crawls every internal link reachable from the home page and checks that each returns
 * 200 with zero console errors or warnings, at desktop and phone widths. Also checks that
 * no link is a dead "#" and unknown URLs get the 404 page.
 */
const { test, expect } = require('@playwright/test');
const { consentCookie, newContext, watchConsole } = require('./helpers');

for (const viewport of [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'phone', width: 375, height: 812 }
]) {
  test(`every internal link returns 200 with a clean console (${viewport.name})`, async ({ browser, baseURL }) => {
    const ctx = await newContext(browser, { viewport });
    await ctx.addCookies([consentCookie(baseURL)]);
    const page = await ctx.newPage();
    const messages = watchConsole(page);
    const queue = ['/'];
    const seen = new Set();
    const problems = [];
    while (queue.length) {
      const path = queue.shift();
      if (seen.has(path)) continue;
      seen.add(path);
      const response = await page.goto(path, { waitUntil: 'networkidle' });
      if (response.status() !== 200) problems.push(`${path} -> ${response.status()}`);
      const hrefs = await page.$$eval('a', (as) => as.map((a) => a.getAttribute('href')));
      for (const href of hrefs) {
        if (!href || href === '#' || href.endsWith('#')) problems.push(`dead link "${href}" on ${path}`);
        else if (href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/api/')) {
          const next = href.split('#')[0] || '/';
          if (!seen.has(next)) queue.push(next);
        }
      }
    }
    expect(seen.size).toBeGreaterThanOrEqual(10);
    expect(problems).toEqual([]);
    expect(messages).toEqual([]);
    await ctx.close();
  });
}

test('unknown URLs show the 404 page', async ({ page }) => {
  const response = await page.goto('/no-such-page');
  expect(response.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});
