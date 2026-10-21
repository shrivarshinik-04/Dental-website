/**
 * Application-level encryption for personal and health data at rest.
 * DPDP Act s.8(5) (reasonable security safeguards) and Rule 6(1)(a) (encryption).
 *
 * AES-256-GCM, 96-bit random IV per value, authenticated. The key comes from the
 * ENCRYPTION_KEY env var (32 bytes, base64). Server-only: never import in a component.
 *
 * Stored format: "v1:<iv b64>:<auth tag b64>:<ciphertext b64>"
 */
import crypto from 'crypto';

const PREFIX = 'v1';

let cachedKey;
const getKey = () => {
  if (cachedKey) return cachedKey;
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error('ENCRYPTION_KEY is not set');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes, base64-encoded');
  cachedKey = key;
  return key;
};

export const encrypt = (plaintext) => {
  if (plaintext === null || plaintext === undefined || plaintext === '') return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join(':');
};

export const decrypt = (payload) => {
  if (!payload) return null;
  const [version, iv, tag, ciphertext] = payload.split(':');
  if (version !== PREFIX || !iv || !tag || !ciphertext) throw new Error('Unrecognised ciphertext format');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
};

/** Keyed hash for values we must match but never store (IP addresses, OTPs). */
export const hmac = (value, secretEnv = 'IP_HASH_SALT') => {
  const secret = process.env[secretEnv];
  if (!secret) throw new Error(`${secretEnv} is not set`);
  return crypto.createHmac('sha256', secret).update(String(value)).digest('hex');
};

/** Constant-time string comparison. */
export const safeEqual = (a, b) => {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

/** Random, unambiguous reference: e.g. DP-7K3QXM (Rule 14(5) identifier). */
export const randomReference = (prefix, length = 6) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return `${prefix}-${out}`;
};
