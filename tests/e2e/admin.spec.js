/**
 * REQUIREMENTS §9 / §15 access-control boundaries for the staff area, brute-force
 * throttling, consent evidence export, audit of views, and the incident register.
 */
const { test, expect } = require('@playwright/test');
const { ADMIN, DESK, bookViaApi, db, newContext } = require('./helpers');

test('access boundaries by role', async ({ browser }) => {
  const anon = await newContext(browser);
  expect((await anon.request.get('/admin')).status()).toBe(401);
  expect((await anon.request.get('/api/admin/consents-export')).status()).toBe(401);
  await anon.close();
  const wrong = await newContext(browser, { httpCredentials: { username: ADMIN.username, password: 'wrong-password' } });
  expect((await wrong.request.get('/admin')).status()).toBe(401);
  await wrong.close();
  const desk = await newContext(browser, { httpCredentials: DESK });
  expect((await desk.request.get('/admin/appointments')).status()).toBe(200);
  for (const path of ['/admin/consents', '/admin/rights', '/admin/grievances', '/admin/breaches', '/admin/analytics', '/api/admin/consents-export']) {
    expect((await desk.request.get(path)).status(), path).toBe(403);
  }
  await desk.close();
  const admin = await newContext(browser, { httpCredentials: ADMIN });
  for (const path of ['/admin', '/admin/appointments', '/admin/consents', '/admin/rights', '/admin/grievances', '/admin/nominations', '/admin/breaches', '/admin/analytics']) {
    expect((await admin.request.get(path)).status(), path).toBe(200);
  }
  await admin.close();
});

test('failed sign-ins are throttled per client, even with the right password afterwards', async ({ browser }) => {
  const ip = `172.31.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
  for (let i = 0; i < 10; i += 1) {
    const ctx = await browser.newContext({ httpCredentials: { username: ADMIN.username, password: `wrong-${i}` }, extraHTTPHeaders: { 'X-Forwarded-For': ip } });
    expect((await ctx.request.get('/api/admin/consents-export')).status()).toBe(401);
    await ctx.close();
  }
  const ok = await browser.newContext({ httpCredentials: ADMIN, extraHTTPHeaders: { 'X-Forwarded-For': ip } });
  expect((await ok.request.get('/admin')).status()).toBe(429);
  await ok.close();
});

test('consent ledger CSV export is available to admins and audited', async ({ browser, baseURL }) => {
  const user = await newContext(browser);
  await bookViaApi(user.request, baseURL);
  await user.close();
  const before = await db().auditLog.count({ where: { action: 'EXPORT', entity: 'ConsentRecord' } });
  const admin = await newContext(browser, { httpCredentials: ADMIN });
  const res = await admin.request.get('/api/admin/consents-export');
  expect(res.headers()['content-type']).toContain('text/csv');
  const firstLine = (await res.text()).replace(/^﻿/, '').split('\r\n')[0];
  expect(firstLine).toContain('notice_version');
  expect(firstLine).toContain('ip_hash');
  expect(await db().auditLog.count({ where: { action: 'EXPORT', entity: 'ConsentRecord' } })).toBe(before + 1);
  await admin.close();
});

test('viewing personal data in the admin area is audited', async ({ browser, baseURL }) => {
  const user = await newContext(browser);
  await bookViaApi(user.request, baseURL);
  await user.close();
  const before = await db().auditLog.count({ where: { action: 'READ', entity: 'Appointment' } });
  const admin = await newContext(browser, { httpCredentials: ADMIN });
  expect((await admin.request.get('/admin/appointments')).status()).toBe(200);
  expect(await db().auditLog.count({ where: { action: 'READ', entity: 'Appointment' } })).toBeGreaterThan(before);
  await admin.close();
});

test('incident register: CERT-In 6-hour deadline and report tracking', async ({ browser, baseURL }) => {
  const admin = await newContext(browser, { httpCredentials: ADMIN });
  const detectedAt = new Date();
  const created = await admin.request.post('/api/admin/breaches', {
    headers: { Origin: baseURL },
    data: { detectedAt: detectedAt.toISOString(), incidentType: 'xi', description: 'Synthetic drill', nature: 'Test', extent: 'Test table', affectedCount: 0 }
  });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  const page = await admin.newPage();
  await page.goto('/admin/breaches', { waitUntil: 'networkidle' });
  await expect(page.getByText('CERT-In report due').first()).toBeVisible();
  await expect(page.getByText('Report to CERT-In within 6 hours of noticing (CERT-In Directions 2022 — in force)').first()).toBeVisible();
  const marked = await admin.request.post('/api/admin/breaches', { headers: { Origin: baseURL }, data: { id, action: 'mark', milestone: 'certInReportedAt' } });
  expect(marked.status()).toBe(200);
  const row = await db().breachIncident.findUnique({ where: { id } });
  expect(row.certInReportedAt).not.toBeNull();
  expect(row.detailedReportDueAt.getTime() - row.detectedAt.getTime()).toBe(72 * 3600000);
  await admin.close();
});
