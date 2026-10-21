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
// Relationship of the person booking for a patient under 18.
export const RELATIONSHIPS = ['PARENT', 'LEGAL_GUARDIAN'];

const looseText = (max) => z.string().max(max * 2).optional().default('');

/**
 * Booking. Adults give their own mobile (email optional). For a patient under 18 the parent
 * or guardian gives their name, relationship, mobile (email optional) and the declaration;
 * the patient's own phone and email are not collected. Fields that do not apply are
 * discarded, so crafted extra data is never stored.
 * Legal mapping (comments only): SPDI Rules 2011 Rule 5(2) collection limited to what is
 * necessary; DPDP Act s.9 / Rule 10, Rule 12 + Fourth Schedule Part A (from about May 2027).
 */
export const appointmentSchema = z
  .object({
    name: requiredText(100),
    phone: looseText(20),
    email: looseText(254),
    service: requiredText(100),
    preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    preferredSlot: z.enum(SLOTS),
    reason: text(300, { multiline: true }).optional().default(''),
    isMinor: z.boolean(),
    guardianName: looseText(100),
    guardianRelationship: z.string().max(40).optional().nullable(),
    guardianPhone: looseText(20),
    guardianEmail: looseText(254),
    guardianDeclaration: z.boolean().optional().default(false),
    consents: z.object({ APPOINTMENT: z.literal(true) }).strict(),
    language,
    noticeVersion: z.string().max(40)
  })
  .strict()
  .superRefine((data, ctx) => {
    const issue = (field) => ctx.addIssue({ code: 'custom', path: [field], message: 'Invalid or missing' });
    if (!data.isMinor) {
      if (!phone.safeParse(data.phone).success) issue('phone');
      if (data.email && !optionalEmail.safeParse(data.email).success) issue('email');
      return;
    }
    if (!requiredText(100).safeParse(data.guardianName).success) issue('guardianName');
    if (!RELATIONSHIPS.includes(data.guardianRelationship)) issue('guardianRelationship');
    if (!phone.safeParse(data.guardianPhone).success) issue('guardianPhone');
    if (data.guardianEmail && !optionalEmail.safeParse(data.guardianEmail).success) issue('guardianEmail');
    if (data.guardianDeclaration !== true) issue('guardianDeclaration');
  })
  .transform((data) => {
    const adult = !data.isMinor;
    return {
      ...data,
      // Adults: their own contact; guardian fields discarded.
      phone: adult ? phone.parse(data.phone) : null,
      email: adult ? optionalEmail.parse(data.email) : null,
      // Minors: guardian contact; patient's own contact discarded.
      guardianName: adult ? null : requiredText(100).parse(data.guardianName),
      guardianRelationship: adult ? null : data.guardianRelationship,
      guardianPhone: adult ? null : phone.parse(data.guardianPhone),
      guardianEmail: adult ? null : optionalEmail.parse(data.guardianEmail),
      guardianDeclaration: adult ? false : true
    };
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
    email: optionalEmail.optional(),
    // Parent or guardian details on the person's bookings for a patient under 18.
    guardianName: requiredText(100).optional(),
    guardianPhone: phone.optional(),
    guardianEmail: optionalEmail.optional()
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
