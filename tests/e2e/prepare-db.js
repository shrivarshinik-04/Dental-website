/**
 * Creates a fresh synthetic test database (prisma/test.db) for the e2e tests: applies the
 * migrations and seeds the notice versions. Refuses to touch any other database file.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const url = process.env.DATABASE_URL || '';
const file = url.replace(/^file:/, '');
if (path.basename(file) !== 'test.db') {
  console.error(`prepare-db: refusing to reset ${url || '(unset)'}; expected .../test.db`);
  process.exit(1);
}
for (const suffix of ['', '-journal']) fs.rmSync(file + suffix, { force: true });
execSync('npx prisma migrate deploy', { stdio: 'ignore', env: process.env });
execSync('node prisma/seed.js', { stdio: 'ignore', env: process.env });
console.log('prepare-db: test database ready');
