/**
 * Admin authentication and role-based access control.
 * DPDP Act s.8(5) + Rule 6(1)(b): access to personal data is limited to authorised
 * staff, and only for what their role needs.
 *
 * HTTP Basic auth (over HTTPS only) against ADMIN_USERS, e.g.
 *   ADMIN_USERS="priya:admin:pbkdf2.210000.<salt>.<hash>,ravi:reception:pbkdf2.210000.<salt>.<hash>"
 * Generate a hash with `npm run admin:hash-password`.
 *
 * Uses Web Crypto only, so it can run in middleware (Edge) and in Node. The guards that
 * also throttle failed logins live in src/lib/adminGuard.js (Node only).
 */

export const ROLES = {
  // Clinic owner: everything.
  admin: ['appointments', 'consents', 'rights', 'grievances', 'nominations', 'breaches'],
  // Grievance Officer / data protection contact.
  dpo: ['appointments', 'consents', 'rights', 'grievances', 'nominations', 'breaches'],
  // Front desk: only what is needed to schedule visits.
  reception: ['appointments']
};

const textEncoder = new TextEncoder();

const fromBase64Url = (value) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
};

const timingSafeEqualBytes = (a, b) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
};

const pbkdf2 = async (password, salt, iterations, length) => {
  const key = await crypto.subtle.importKey('raw', textEncoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, length * 8);
  return new Uint8Array(bits);
};

const parseUsers = () =>
  String(process.env.ADMIN_USERS || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [username, role, hash] = entry.split(':');
      return { username, role, hash };
    })
    .filter((u) => u.username && ROLES[u.role] && u.hash);

/**
 * @param {string | null | undefined} authorization the Authorization header
 * @returns {Promise<{ username: string, role: string } | null>}
 */
export const verifyBasicAuth = async (authorization) => {
  if (!authorization || !authorization.startsWith('Basic ')) return null;
  let decoded;
  try {
    decoded = atob(authorization.slice(6));
  } catch {
    return null;
  }
  const idx = decoded.indexOf(':');
  if (idx < 1) return null;
  const username = decoded.slice(0, idx);
  const password = decoded.slice(idx + 1);

  const user = parseUsers().find((u) => u.username === username);
  // Hash anyway when the user is unknown so response time does not reveal usernames.
  const [scheme, iterations, salt, expected] = (user?.hash || 'pbkdf2.210000.AAAAAAAAAAAAAAAAAAAAAA.AAAA').split('.');
  if (scheme !== 'pbkdf2') return null;
  const expectedBytes = fromBase64Url(expected);
  const actual = await pbkdf2(password, fromBase64Url(salt), Number(iterations), expectedBytes.length || 32);
  if (!user || !timingSafeEqualBytes(actual, expectedBytes)) return null;
  return { username: user.username, role: user.role };
};

export const can = (admin, permission) => Boolean(admin && ROLES[admin.role]?.includes(permission));
