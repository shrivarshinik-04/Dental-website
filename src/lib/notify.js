/**
 * Outbound messages: one-time codes (Rule 14(1) verification), alerts to the
 * Grievance Officer, and instructions to Data Processors (s.6(6), s.8(7)(b)).
 *
 * The SMS/WhatsApp and email providers are stubs. Plug in your provider's SDK in
 * `deliver`. In development the console fallback prints a masked destination and
 * the code so the flow works locally; in production nothing is printed and an
 * unconfigured provider is an error.
 */

const isProd = process.env.NODE_ENV === 'production';

const mask = (destination) => {
  const value = String(destination);
  if (value.includes('@')) {
    const [user, domain] = value.split('@');
    return `${user.slice(0, 1)}***@${domain}`;
  }
  return `******${value.slice(-4)}`;
};

const deliver = async ({ channel, to, body }) => {
  // TODO: call the SMS/WhatsApp provider when channel === 'phone' and the email
  // provider when channel === 'email'. Both must be listed in PROCESSORS and be
  // bound by a contract (s.8(2)).
  if (isProd) throw new Error(`No ${channel} provider configured`);
  console.info(`[notify:dev] ${channel} to ${mask(to)}: ${body}`);
};

export const sendOtp = (channel, to, code) =>
  deliver({ channel, to, body: `Your one-time code is ${code}. It expires in 10 minutes. Do not share it.` });

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
