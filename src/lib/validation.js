/**
 * Server-side input validation and sanitisation (zod). Rule 6(1) security
 * safeguards: never trust client input; also enforces data minimisation by
 * accepting only the fields listed in the notice (s.5, s.6(1)).
 */
import { z } from 'zod';
import { LANGUAGES } from 'config/compliance';

// Strip control characters (keeping newlines in multi-line text) and trim.
const clean = (multiline = false) => (value) =>
  String(value)
    .replace(multiline ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, ' ')
    .trim();

export const text = (max, { multiline = false } = {}) => z.string().max(max * 2).transform(clean(multiline)).pipe(z.string().max(max));
export const requiredText = (max, opts) => text(max, opts).pipe(z.string().min(1));

/** Indian mobile number, normalised to 10 digits. */
export const normalisePhone = (value) => String(value).replace(/[\s()-]/g, '').replace(/^(\+91|0091|91|0)(?=\d{10}$)/, '');
export const phone = z
  .string()
  .max(20)
  .transform(normalisePhone)
  .pipe(z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number'));

export const email = z.string().max(254).trim().toLowerCase().pipe(z.email());
export const optionalEmail = z
  .string()
  .max(254)
  .trim()
  .toLowerCase()
  .transform((v) => v || null)
  .pipe(z.email().nullable());

export const language = z.enum(LANGUAGES.map((l) => l.code));
export const referenceId = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^DP-[A-Z0-9]{6}$/, 'Invalid reference ID');

/** Phone or email; returns { channel, value }. */
export const contact = z
  .string()
  .max(254)
  .trim()
  .transform((v, ctx) => {
    if (v.includes('@')) {
      const parsed = email.safeParse(v);
      if (parsed.success) return { channel: 'email', value: parsed.data };
    } else {
      const parsed = phone.safeParse(v);
      if (parsed.success) return { channel: 'phone', value: parsed.data };
    }
    ctx.addIssue({ code: 'custom', message: 'Enter a valid mobile number or email' });
    return z.NEVER;
  });

export const SLOTS = ['MORNING', 'EVENING'];
export const RELATIONSHIPS = ['MOTHER', 'FATHER', 'LEGAL_GUARDIAN'];

export const appointmentSchema = z
  .object({
    name: requiredText(100),
    phone,
    email: optionalEmail,
    service: requiredText(100),
    preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    preferredSlot: z.enum(SLOTS),
    reason: text(300, { multiline: true }).optional().default(''),
    isMinor: z.boolean(),
    guardianName: text(100).optional().default(''),
    guardianRelationship: z.enum(RELATIONSHIPS).optional().nullable(),
    guardianDeclaration: z.boolean().optional().default(false),
    consents: z.object({ APPOINTMENT: z.literal(true) }).strict(),
    language,
    noticeVersion: z.string().max(40)
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.isMinor) return;
    if (!data.guardianName) ctx.addIssue({ code: 'custom', path: ['guardianName'], message: 'Required' });
    if (!data.guardianRelationship) ctx.addIssue({ code: 'custom', path: ['guardianRelationship'], message: 'Required' });
    if (data.guardianDeclaration !== true)
      ctx.addIssue({ code: 'custom', path: ['guardianDeclaration'], message: 'Required' });
  });

export const cookieConsentSchema = z
  .object({
    choices: z.object({ functional: z.boolean(), analytics: z.boolean() }).strict(),
    language,
    noticeVersion: z.string().max(40)
  })
  .strict();

export const requestOtpSchema = z.object({ referenceId, contact }).strict();
export const verifyOtpSchema = z.object({ referenceId, code: z.string().trim().regex(/^\d{6}$/) }).strict();

export const correctionSchema = z
  .object({
    type: z.enum(['CORRECTION', 'COMPLETION', 'UPDATE']),
    name: requiredText(100).optional(),
    phone: phone.optional(),
    email: optionalEmail.optional()
  })
  .strict();

export const consentChangeSchema = z
  .object({
    // Reminder/marketing purposes are no longer offered but may exist on older records,
    // so they can still be withdrawn (not given).
    purpose: z.enum(['APPOINTMENT', 'APPOINTMENT_REMINDERS_SMS_WHATSAPP', 'MARKETING']),
    action: z.enum(['WITHDRAW', 'GIVE']),
    language
  })
  .strict();

export const eraseSchema = z.object({ confirm: z.literal(true) }).strict();

export const nominationSchema = z
  .object({ name: requiredText(100), relationship: requiredText(50), contact })
  .strict();

export const GRIEVANCE_CATEGORIES = ['CONSENT', 'ACCESS', 'CORRECTION', 'SECURITY', 'OTHER'];
export const grievanceSchema = z
  .object({
    name: text(100).optional().default(''),
    contactDetail: z.string().max(254).optional().default(''),
    category: z.enum(GRIEVANCE_CATEGORIES),
    description: requiredText(2000, { multiline: true }),
    language
  })
  .strict();

const optionalLong = text(4000, { multiline: true }).optional().nullable();
export const breachSchema = z
  .object({
    detectedAt: z.coerce.date(),
    incidentType: z.enum(['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'x', 'xi', 'xii', 'xvii', 'xviii', 'other']).optional().nullable(),
    occurredAt: z.coerce.date().optional().nullable(),
    location: text(300).optional().nullable(),
    description: requiredText(4000, { multiline: true }),
    nature: requiredText(1000, { multiline: true }),
    extent: requiredText(1000, { multiline: true }),
    affectedCount: z.coerce.number().int().min(0).max(100000000),
    likelyImpact: optionalLong,
    consequencesForPrincipals: optionalLong,
    mitigation: optionalLong,
    safetyMeasuresForPrincipals: optionalLong,
    rootCause: optionalLong,
    responsibleFindings: optionalLong,
    remedialMeasures: optionalLong
  })
  .strict();

/** Flattened field errors for the client; never echoes submitted values. */
export const fieldErrors = (error) => Object.keys(z.flattenError(error).fieldErrors);
