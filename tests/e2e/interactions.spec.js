/**
 * Clicks every button, toggle, tab-like control and menu, and checks the expected state
 * change, keyboard access (Tab, Enter, Space, Esc), visible focus and ARIA attributes.
 */
const { test, expect } = require('@playwright/test');
const { ADMIN, consentCookie, newContext, watchConsole } = require('./helpers');

test('desktop Services menu: opens, exposes aria-expanded, closes on Esc, works after client-side navigation', async ({ browser, baseURL }) => {
  const ctx = await newContext(browser, { viewport: { width: 1280, height: 900 } });
  await ctx.addCookies([consentCookie(baseURL)]);
  const page = await ctx.newPage();
  await page.goto('/', { waitUntil: 'networkidle' });
  const toggle = page.locator('nav.navbar .dropdown-toggle').first();
  await toggle.click();
  await expect(page.locator('.dropdown-menu.show')).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('.dropdown-menu.show')).toHaveCount(0);
  await page.locator('nav.navbar a[href="/about"]').first().click();
  await page.waitForURL('**/about');
  await page.locator('nav.navbar .dropdown-toggle').first().click();
  await page.locator('.dropdown-menu.show a[href="/services#orthodontics"]').click();
  await page.waitForURL('**/services#orthodontics');
  await expect(page.locator('#orthodontics')).toBeInViewport();
  await ctx.close();
});

test('phone menu: opens, focus moves inside, Esc closes, links navigate, re-opens after navigation', async ({ browser, baseURL }) => {
  const ctx = await newContext(browser, { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  await ctx.addCookies([consentCookie(baseURL)]);
  const page = await ctx.newPage();
  await page.goto('/', { waitUntil: 'networkidle' });
  const burger = page.locator('.offcanvas-nav-btn').first();
  await expect(burger).toHaveAttribute('aria-controls', 'offcanvas-nav');
  await burger.tap();
  await expect(page.locator('#offcanvas-nav.show')).toBeVisible();
  await expect(burger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#offcanvas-nav .btn-close')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#offcanvas-nav.show')).toHaveCount(0);
  await burger.tap();
  await page.locator('#offcanvas-nav a[href="/contact"]').tap();
  await page.waitForURL('**/contact');
  await page.locator('.offcanvas-nav-btn').first().tap();
  await expect(page.locator('#offcanvas-nav.show')).toBeVisible();
  await ctx.close();
});

test('phone menu stays usable while the cookie banner is open (no cookie wall)', async ({ browser }) => {
  const ctx = await newContext(browser, { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('.offcanvas-nav-btn').first().tap();
  await page.locator('#offcanvas-nav a[href="/book-appointment"]').first().tap();
  await page.waitForURL('**/book-appointment');
  await ctx.close();
});

test('cookie banner: keyboard access, visible focus, switches off by default, Space toggles, save and reopen', async ({ browser }) => {
  const ctx = await newContext(browser, { viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const messages = watchConsole(page);
  await page.goto('/', { waitUntil: 'networkidle' });
  const dialog = page.getByRole('dialog');
  const accept = dialog.getByRole('button', { name: 'Accept all' });
  const reject = dialog.getByRole('button', { name: 'Reject all' });
  expect(await accept.getAttribute('class')).toBe(await reject.getAttribute('class'));
  await page.locator('body').press('Tab');
  for (let i = 0; i < 80 && !(await accept.evaluate((el) => el === document.activeElement)); i += 1) await page.keyboard.press('Tab');
  await expect(accept).toBeFocused();
  await page.waitForTimeout(600); // theme transition
  expect(await accept.evaluate((el) => getComputedStyle(el).outlineWidth)).toBe('3px');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter'); // Customise
  const functional = dialog.getByRole('switch', { name: /Functional/ });
  const analytics = dialog.getByRole('switch', { name: /Analytics/ });
  await expect(functional).not.toBeChecked();
  await expect(analytics).not.toBeChecked();
  await expect(dialog.getByRole('switch', { name: /Strictly necessary/ })).toBeDisabled();
  await functional.focus();
  await page.keyboard.press('Space');
  await expect(functional).toBeChecked();
  await dialog.getByRole('button', { name: 'Save my choices' }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: /Cookie settings/ }).click();
  await expect(page.getByRole('dialog').getByRole('switch', { name: /Functional/ })).toBeChecked();
  expect(messages).toEqual([]);
  await ctx.close();
});

test('language switcher: aria-pressed, html lang and notice text change', async ({ browser }) => {
  const ctx = await newContext(browser);
  const page = await ctx.newPage();
  await page.goto('/book-appointment', { waitUntil: 'networkidle' });
  const hindi = page.getByRole('button', { name: 'हिन्दी' }).first();
  await hindi.click();
  await expect(hindi).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
  await expect(page.locator('#consent-notice-title')).toHaveText('गोपनीयता सूचना');
  await ctx.close();
});

test('booking form: minor toggle shows and hides guardian fields; empty submit is blocked client-side', async ({ browser, baseURL }) => {
  const ctx = await newContext(browser);
  await ctx.addCookies([consentCookie(baseURL)]);
  const page = await ctx.newPage();
  let posted = false;
  page.on('request', (r) => r.url().includes('/api/appointments') && (posted = true));
  await page.goto('/book-appointment', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Request appointment' }).click();
  expect(posted).toBe(false);
  await expect(page.locator('#field-isMinor')).toBeFocused(); // the age question comes first
  await page.check('#field-isMinor');
  await expect(page.locator('#field-guardianName')).toBeVisible();
  await page.check('#field-isMinor-no');
  await expect(page.locator('#field-guardianName')).toHaveCount(0);
  await ctx.close();
});

test('grievance page: mode toggle exposes aria-pressed and shows the right form', async ({ browser }) => {
  const ctx = await newContext(browser);
  const page = await ctx.newPage();
  await page.goto('/grievance', { waitUntil: 'networkidle' });
  const without = page.getByRole('button', { name: "I don't have a reference ID" });
  await without.click();
  await expect(without).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#g-name')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit grievance' })).toBeDisabled();
  await page.getByRole('button', { name: 'I have a reference ID' }).click();
  await expect(page.locator('#verify-reference')).toBeVisible();
  await ctx.close();
});

test('admin navigation: every section link loads for the admin role', async ({ browser }) => {
  const ctx = await newContext(browser, { httpCredentials: ADMIN });
  const page = await ctx.newPage();
  const messages = watchConsole(page);
  await page.goto('/admin', { waitUntil: 'networkidle' });
  const links = await page.locator('nav[aria-label="Admin sections"] a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  expect(links.length).toBe(8);
  for (const href of links) {
    const response = await page.goto(href, { waitUntil: 'networkidle' });
    expect(response.status(), href).toBe(200);
    await expect(page.locator(`nav[aria-label="Admin sections"] a[href="${href}"]`)).toHaveClass(/bg-theme-dark/);
  }
  expect(messages).toEqual([]);
  await ctx.close();
});

for (const viewport of [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'phone', width: 375, height: 812, isMobile: true, hasTouch: true }
]) {
  test(`every navbar item navigates to its destination (${viewport.name})`, async ({ browser, baseURL }) => {
    const { name, isMobile, hasTouch, ...size } = viewport;
    const ctx = await newContext(browser, { viewport: size, isMobile, hasTouch });
    await ctx.addCookies([consentCookie(baseURL)]);
    const page = await ctx.newPage();
    const targets = [
      ['Home', '/', 'Your Smile, Our Commitment'],
      ['About Us', '/about', 'About Us'],
      ['Gallery', '/gallery', 'Gallery'],
      ['Contact Us', '/contact', 'Contact Us']
    ];
    for (const [label, path, heading] of targets) {
      await page.goto('/sitemap', { waitUntil: 'networkidle' });
      if (name === 'phone') {
        await page.locator('.offcanvas-nav-btn').first().tap();
        await expect(page.locator('#offcanvas-nav.show')).toBeVisible();
      }
      await page.locator('#offcanvas-nav .navbar-nav').getByRole('link', { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${path === '/' ? '/$' : `${path}$`}`));
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
    }
    // Services menu: "All services" and one service anchor
    await page.goto('/', { waitUntil: 'networkidle' });
    if (name === 'phone') await page.locator('.offcanvas-nav-btn').first().tap();
    await page.locator('#offcanvas-nav .dropdown-toggle').first().click();
    await page.locator('#offcanvas-nav .dropdown-menu.show').getByRole('link', { name: 'All services' }).click();
    await expect(page).toHaveURL(/\/services$/);
    await expect(page.getByRole('heading', { name: 'Our Services' })).toBeVisible();
    await ctx.close();
  });
}

test('gallery: photos load from this site and open in an accessible viewer', async ({ browser, baseURL }) => {
  const ctx = await newContext(browser);
  await ctx.addCookies([consentCookie(baseURL)]);
  const page = await ctx.newPage();
  const external = [];
  page.on('request', (r) => !r.url().startsWith(baseURL) && !r.url().startsWith('data:') && external.push(r.url()));
  await page.goto('/gallery', { waitUntil: 'networkidle' });
  const photos = page.locator('main figure img');
  await expect(photos).toHaveCount(8);
  expect(await photos.evaluateAll((imgs) => imgs.every((i) => i.complete && i.naturalWidth > 0))).toBe(true);
  expect(external).toEqual([]);
  await page.getByRole('button', { name: 'Open photo: Treatment room' }).click();
  const viewer = page.getByRole('dialog', { name: 'Treatment room' });
  await expect(viewer).toBeVisible();
  await expect(viewer.getByRole('button', { name: 'Close' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('dialog', { name: 'Waiting area' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open photo: Treatment room' })).toBeFocused();
  await ctx.close();
});
