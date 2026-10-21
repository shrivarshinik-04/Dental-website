/**
 * Generates a PBKDF2 password hash for ADMIN_USERS (Rule 6(1)(b) access control).
 * Usage: npm run admin:hash-password -- <username> <role> <password>
 * Output: an entry to append (comma-separated) to ADMIN_USERS in .env
 */
const crypto = require('crypto');

const [username, role, password] = process.argv.slice(2);
if (!username || !role || !password) {
  console.error('Usage: npm run admin:hash-password -- <username> <admin|dpo|reception> <password>');
  process.exit(1);
}
if (!['admin', 'dpo', 'reception'].includes(role)) {
  console.error('Role must be admin, dpo or reception');
  process.exit(1);
}
if (password.length < 12) {
  console.error('Use a password of at least 12 characters');
  process.exit(1);
}

const iterations = 210000;
const salt = crypto.randomBytes(16);
const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
console.log(`${username}:${role}:pbkdf2.${iterations}.${salt.toString('base64url')}.${hash.toString('base64url')}`);
