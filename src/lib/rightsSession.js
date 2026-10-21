/**
 * Short-lived session after OTP verification on /data-rights.
 * DPDP Rules 2025, Rule 14(1): the Data Fiduciary verifies the Data Principal before
 * acting on a rights request. Strictly necessary httpOnly cookie, 15 minutes.
 */
import crypto from 'crypto';
import { OTP } from 'config/compliance';
import { appendCookie, parseCookies, serializeCookie } from './http';
import { derivedKey, safeEqual } from './crypto';

export const SESSION_COOKIE = 'dpdp_rights_session';

const sign = (payload) => crypto.createHmac('sha256', derivedKey('rights-session')).update(payload).digest('base64url');

export const startSession = (res, { dataPrincipalId, channel }) => {
  const payload = Buffer.from(
    JSON.stringify({ sub: dataPrincipalId, ch: channel, exp: Date.now() + OTP.sessionMinutes * 60 * 1000 })
  ).toString('base64url');
  appendCookie(res, serializeCookie(SESSION_COOKIE, `${payload}.${sign(payload)}`, { maxAge: OTP.sessionMinutes * 60 }));
};

export const endSession = (res) => appendCookie(res, serializeCookie(SESSION_COOKIE, '', { maxAge: 0 }));

/** @returns {{ dataPrincipalId: string, channel: string } | null} */
export const readSession = (req) => {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(sign(payload), signature)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || data.exp < Date.now()) return null;
    return { dataPrincipalId: data.sub, channel: data.ch };
  } catch {
    return null;
  }
};
