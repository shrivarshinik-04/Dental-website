/**
 * Outbound messages: one-time codes for identity verification before acting on a
 * request (SPDI Rules 2011, Rule 5(6) review/correction, now; DPDP Rules 2025, Rule 14,
 * from about May 2027), alerts to the Grievance Officer, and instructions to processors.
 *
 * No SMS/WhatsApp or email provider is configured yet. Until one is:
 * - DEMO_MODE=true (test environments only, see src/lib/env.js) returns the code to the
 *   caller so it can be shown on screen with a "Test environment" label;
 * - otherwise `otpDelivery()` reports that verification is unavailable.
 * One-time codes are never written to logs.
 */
import { demoMode } from './env';

const isProd = process.env.NODE_ENV === 'production';

// Set to true when `deliverViaProvider` is implemented for both channels.
const PROVIDER_CONFIGURED = false;

export class DeliveryUnavailableError extends Error {}

/** 'demo' | 'provider' | null (no way to deliver a code). */
export const otpDelivery = () => {
  if (demoMode()) return 'demo';
  return PROVIDER_CONFIGURED ? 'provider' : null;
};

// eslint-disable-next-line no-unused-vars
const deliverViaProvider = async ({ channel, to, body }) => {
  // TODO: call the SMS/WhatsApp provider when channel === 'phone' and the email
  // provider when channel === 'email'. List each in PROCESSORS and put a contract in
  // place before sending personal data to it.
  throw new DeliveryUnavailableError(`No ${channel} provider configured`);
};

/**
 * Delivers a one-time code.
 * @returns {Promise<{ demoCode?: string }>} demoCode only in DEMO_MODE
 */
export const sendOtp = async (channel, to, code) => {
  const mode = otpDelivery();
  if (mode === 'demo') return { demoCode: code };
  if (mode === 'provider') {
    await deliverViaProvider({ channel, to, body: `Your one-time code is ${code}. It expires in 10 minutes. Do not share it.` });
    return {};
  }
  throw new DeliveryUnavailableError('No delivery channel configured');
};

/** Alert the Grievance Officer. Do not put personal data in `summary`. */
export const alertContactPerson = async (summary) => {
  // TODO: email CONTACT_PERSON.email through the email provider.
  if (!isProd) console.info(`[notify:dev] alert to grievance officer: ${summary}`);
};

/**
 * s.6(6) / s.8(7)(b): when consent is withdrawn or data is erased, our Data
 * Processors must stop processing and erase their copies too.
 * @param {'STOP_PROCESSING'|'ERASE'} action
 * @param {{ referenceId: string, purpose?: string, processors?: string[] }} detail
 */
export const instructProcessors = async (action, detail) => {
  // TODO: call each processor's deletion / opt-out API (e.g. remove the number from
  // the reminder list at the SMS provider). Record their confirmation.
  if (!isProd) console.info(`[notify:dev] processors ${action} for ${detail.referenceId}${detail.purpose ? ` (${detail.purpose})` : ''}`);
};
