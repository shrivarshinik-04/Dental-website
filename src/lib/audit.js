/**
 * Audit trail for every read or write of personal data.
 * DPDP Rules 2025, Rule 6(1)(c) (logs and monitoring of access) and Rule 8(3)
 * (processing logs kept for at least one year, see RETENTION.auditLogDays).
 *
 * Log identifiers only (entity + id + reference), never the personal data itself.
 */
import prisma from './db';

/**
 * @param {object} entry
 * @param {string} entry.actor  "public" | "data-principal:DP-XXXXXX" | "admin:<user>" | "system:<job>"
 * @param {string} entry.action "CREATE" | "READ" | "UPDATE" | "DELETE" | "EXPORT" | ...
 * @param {string} entry.entity Prisma model name
 * @param {string} [entry.entityId]
 * @param {string} [entry.ipHash]
 * @param {string} [entry.detail] short non-personal context
 * @param {object} [client] pass a transaction client to log inside a transaction
 */
export const audit = (entry, client = prisma) =>
  client.auditLog.create({
    data: {
      actor: entry.actor,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId || null,
      ipHash: entry.ipHash || null,
      detail: entry.detail || null
    }
  });

export const auditMany = (entries, client = prisma) =>
  client.auditLog.createMany({
    data: entries.map((e) => ({
      actor: e.actor,
      action: e.action,
      entity: e.entity,
      entityId: e.entityId || null,
      ipHash: e.ipHash || null,
      detail: e.detail || null
    }))
  });
