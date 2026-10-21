/**
 * Server helpers for admin pages: auth guard + audit of every view of personal data
 * (DPDP Rules 2025, Rule 6(1)(b)–(c)). Server-only.
 */
import { ROLES } from './adminAuth';
import { adminPageGuard } from './adminGuard';
import { auditMany } from './audit';
import { hashedIp } from './http';

/** Makes Prisma results (Dates) safe to pass as page props. */
export const serialize = (value) => JSON.parse(JSON.stringify(value));

/**
 * getServerSideProps wrapper: authenticates, checks `permission`, runs `load`, and
 * logs a READ audit entry per record id it returns in `viewed`.
 */
export const adminProps = (permission, load) => async (ctx) => {
  const { admin, denied } = await adminPageGuard(ctx, permission);
  if (denied) return denied;
  const { props, viewed = [], entity } = await load(ctx, admin);
  if (viewed.length) {
    const ipHash = hashedIp(ctx.req);
    await auditMany(viewed.map((id) => ({ actor: `admin:${admin.username}`, action: 'READ', entity, entityId: id, ipHash })));
  }
  return { props: serialize({ ...props, admin, permissions: ROLES[admin.role] }) };
};

/** Rows that contain personal data are never cached by the browser or proxies. */
export const noStore = (res) => res.setHeader('Cache-Control', 'no-store');
