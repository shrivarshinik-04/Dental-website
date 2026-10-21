/**
 * Patient label for staff pages: the reference ID with the patient's name, decrypted on the
 * server for signed-in staff only (the name stays encrypted in the database). Server-only.
 */
import { decrypt } from './crypto';

/** Prisma `select` for the fields a label needs. */
export const PATIENT_SELECT = { referenceId: true, name: true, erasedAt: true };

/** @returns {{ referenceId: string, name: string | null, erased: boolean } | null} */
export const patientOf = (principal) =>
  principal
    ? { referenceId: principal.referenceId, name: principal.erasedAt ? null : decrypt(principal.name), erased: Boolean(principal.erasedAt) }
    : null;
