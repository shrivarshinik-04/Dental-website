/**
 * Privacy policy.
 * In force now: IT Act 2000 s.43A and the IT (Reasonable Security Practices and Procedures
 * and Sensitive Personal Data or Information) Rules 2011 ("SPDI Rules"), Rules 3, 4
 * (published policy), 5 (consent, purpose, recipients, retention, review, withdrawal,
 * Grievance Officer) and 8 (security); CERT-In Directions of 28 April 2022.
 * Expected from about 13 May 2027 (G.S.R. 843(E); date to be confirmed): DPDP Act 2023
 * and DPDP Rules 2025. Described in a separate section and never presented as current.
 * Organisation details come from src/config/compliance.js and are samples.
 */
import { Fragment } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  CLINIC,
  GRIEVANCE_OFFICER,
  HOSTING,
  LANGUAGES,
  NOTICE_EFFECTIVE_FROM,
  NOTICE_VERSION,
  POLICY_CHANGELOG,
  PROCESSORS,
  RETENTION
} from 'config/compliance';
import PageHeader from 'components/PageHeader';
import ContactBlock from 'components/ContactBlock';
import BoardLink from 'components/BoardLink';
import SampleBadge from 'components/SampleBadge';

const Section = ({ id, title, children }) => (
  <section id={id} className="mb-8">
    <h2 className="fs-24 merriweather text-title mb-3">{title}</h2>
    {children}
  </section>
);

const Table = ({ head, rows }) => (
  <div className="table-responsive">
    <table className="table table-bordered fs-15">
      <thead>
        <tr>
          {head.map((h) => (
            <th scope="col" key={h}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row[0]}>
            {row.map((cell, i) => (
              <td key={i}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const years = (days) => Math.round(days / 365);

const CONTENTS = [
  ['who', 'Who we are'],
  ['law', 'Which law applies'],
  ['collect', 'What we collect'],
  ['purposes', 'Why we use it'],
  ['recipients', 'Who receives it'],
  ['security', 'How we protect it'],
  ['retention', 'How long we keep it'],
  ['children', 'Children'],
  ['choices', 'Your choices now'],
  ['dpdp', 'From about May 2027: DPDP Act 2023'],
  ['location', 'Where your data is stored'],
  ['incidents', 'Security incidents'],
  ['changes', 'Changes to this policy'],
  ['contact', 'Contact']
];

const PrivacyPolicy = () => (
  <Fragment>
    <Head>
      <title>{`Privacy Policy | ${CLINIC.tradeName}`}</title>
      <meta name="description" content={`How ${CLINIC.tradeName} collects, uses and protects personal data.`} />
    </Head>
    <PageHeader title="Privacy Policy" subtitle={`Version ${NOTICE_VERSION}, effective ${NOTICE_EFFECTIVE_FROM}.`} />
    <section className="wrapper">
      <div className="container py-10 py-md-12">
        <div className="row justify-content-center">
          <div className="col-lg-10 col-xl-9 lato fs-16">
            {CLINIC.isSample && (
              <div className="alert alert-warning d-flex flex-wrap gap-2 align-items-center" role="note">
                <SampleBadge />
                <span>
                  This website is a test environment. The clinic, people and contact details on it are fictitious
                  samples, not a real healthcare provider.
                </span>
              </div>
            )}

            <nav aria-label="Contents" className="border rounded p-4 mb-8 bg-grays">
              <p className="fw-bold mb-2">Contents</p>
              <ol className="mb-0">
                {CONTENTS.map(([id, label]) => (
                  <li key={id}>
                    <a href={`#${id}`}>{label}</a>
                  </li>
                ))}
              </ol>
            </nav>

            <Section id="who" title="1. Who we are">
              <p className="mb-0">
                {CLINIC.legalName} (trading as {CLINIC.tradeName}), {CLINIC.address}, operates this website and decides
                how the personal information collected on it is used. Our Grievance Officer is {GRIEVANCE_OFFICER.name};
                contact details are in section 14.
              </p>
            </Section>

            <Section id="law" title="2. Which law applies">
              <p>
                Today, the <strong>Information Technology Act, 2000</strong> (section 43A) and the{' '}
                <strong>
                  Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or
                  Information) Rules, 2011
                </strong>{' '}
                (the &quot;SPDI Rules&quot;) govern how we handle your information. Under the SPDI Rules, information
                about your physical health condition and medical records or history is{' '}
                <strong>sensitive personal data</strong>. We also follow the CERT-In Directions of 28 April 2022 on
                reporting cyber security incidents.
              </p>
              <p className="mb-0">
                The <strong>Digital Personal Data Protection Act, 2023</strong> and the{' '}
                <strong>Digital Personal Data Protection Rules, 2025</strong> are being brought into force in stages.
                Their main obligations and rights are expected to apply from about <strong>13 May 2027</strong> (date to
                be confirmed). Section 10 explains what will change. Nothing in this policy limits any right you have
                under the law.
              </p>
            </Section>

            <Section id="collect" title="3. What we collect">
              <h3 className="fs-18 merriweather text-title">Appointment request form</h3>
              <ul>
                <li>Patient&apos;s name and mobile number; email address (optional)</li>
                <li>
                  The service you want and, optionally, a short reason for your visit. <strong>These are sensitive
                  personal data</strong>: please do not enter detailed medical history; we ask in person.
                </li>
                <li>Preferred date and time</li>
                <li>If the patient is under 18: the parent or guardian&apos;s name and relationship, and their declaration</li>
                <li>Proof of your consent: date and time, notice version, language, browser type and a one-way hash of your IP address (never the IP address itself)</li>
              </ul>
              <h3 className="fs-18 merriweather text-title">Cookie choices</h3>
              <ul>
                <li>Your choices, the notice version you saw, a random ID in a cookie, a one-way hash of your IP address and your browser type. See the <Link href="/cookie-policy">Cookie Policy</Link>.</li>
              </ul>
              <h3 className="fs-18 merriweather text-title">Data Rights and Grievance pages</h3>
              <ul className="mb-0">
                <li>Your reference ID and the phone number or email you verify with; a one-time code (stored only as a hash)</li>
                <li>What you ask us to do, and our reply</li>
                <li>For complaints: the complaint and, if you have no reference ID, your name and contact details for our reply</li>
                <li>If you nominate someone: their name, relationship and contact details</li>
              </ul>
            </Section>

            <Section id="purposes" title="4. Why we use it">
              <Table
                head={['Purpose', 'Information used', 'Basis today', 'From about May 2027 (to be confirmed)']}
                rows={[
                  [
                    'Booking and managing your appointment',
                    'Name, mobile, email (optional), service, date and time, reason (optional), guardian details',
                    'Your consent before we collect sensitive personal data (SPDI Rule 5(1))',
                    'Consent (DPDP s.6); scheduling may instead rely on a legitimate use under s.7(a) (under legal review)'
                  ],
                  [
                    'Proving what you agreed to and handling your requests and complaints',
                    'Consent records, reference ID, requests, complaints',
                    'Our duty to handle grievances (SPDI Rule 5(9)) and keep reasonable security records (SPDI Rule 8)',
                    'DPDP s.6(10) (proof of consent), s.8 and s.13'
                  ],
                  [
                    'Remembering your language (optional cookie)',
                    'Language preference',
                    'Your choice in the cookie settings',
                    'Consent (DPDP s.6)'
                  ],
                  [
                    'Meeting legal obligations',
                    'Clinical records and anything a law or court order requires',
                    'Disclosure to government agencies where the law requires (SPDI Rule 6(1) proviso)',
                    'DPDP s.7(d), s.7(e); retention required by law (s.8(7))'
                  ]
                ]}
              />
              <p className="mb-0">
                We use your information only for these purposes. We do not sell it, use it for advertising or profiling,
                or send marketing messages.
              </p>
            </Section>

            <Section id="recipients" title="5. Who receives it">
              <p>
                Only our clinic staff, and only what their role needs: front-desk staff see appointments; the Grievance
                Officer and clinic administrators see requests and complaints. We do not share your information with
                other organisations, except where a law requires disclosure to a government agency.
              </p>
              <p>Service providers that would receive personal information when they are set up:</p>
              <Table
                head={['Service', 'Purpose', 'Information', 'Status']}
                rows={PROCESSORS.map((p) => [
                  p.name,
                  p.purpose,
                  p.dataShared,
                  p.configured ? `In use (${p.location})` : 'Not yet configured: no information is sent'
                ])}
              />
              <p className="mb-0">
                Before any of them receives personal information we will put a written contract in place and update this
                policy.
              </p>
            </Section>

            <Section id="security" title="6. How we protect it">
              <p>Measures in place on this website:</p>
              <ul>
                <li>Names, contact details, the service, the reason for visit, guardian details, nominee details and complaints are encrypted in the database (AES-256-GCM).</li>
                <li>Staff sign in to the admin area; each role sees only what it needs; repeated failed sign-ins are blocked.</li>
                <li>Every view, export and change of personal information by staff is logged.</li>
                <li>IP addresses are never stored, only a salted one-way hash.</li>
                <li>Forms are validated on the server and rate-limited.</li>
                <li>Security headers restrict the page to our own scripts and content.</li>
              </ul>
              <p className="mb-0">
                Not yet in place in this test environment: HTTPS-only hosting, database backups, and a documented
                information security programme audited against a standard such as IS/ISO/IEC 27001 (SPDI Rule 8).
              </p>
            </Section>

            <Section id="retention" title="7. How long we keep it">
              <p>
                We keep information only as long as needed for the purpose or as required by another law (SPDI Rule
                5(4)). Current settings, applied by a scheduled clean-up job:
              </p>
              <ul>
                <li>
                  Appointment requests that do not become part of a clinical record: deleted {RETENTION.appointmentAfterVisitDays}{' '}
                  days after the requested date or after cancellation.
                </li>
                <li>
                  Visits that become part of your clinical record: kept for the period medical record-keeping rules
                  require (currently set to {years(RETENTION.clinicalRecordDays)} years; to be confirmed).
                </li>
                <li>Consent records: {years(RETENTION.consentRecordDays)} years, as proof of what you agreed to.</li>
                <li>Access logs: at least one year.</li>
                <li>Requests and complaints: {years(RETENTION.requestRecordDays)} years after they are closed.</li>
              </ul>
              <p className="mb-0">
                These periods are under review: from about May 2027 the DPDP Rules (Rule 8(3)) are expected to require
                keeping processing records for at least one year.
              </p>
            </Section>

            <Section id="children" title="8. Children">
              <p className="mb-0">
                If the patient is under 18, a parent or lawful guardian must fill in the form, declare that they are an
                adult and the child&apos;s parent or guardian, and give consent for the child. We collect only what the
                appointment needs and never run analytics during a booking for a child. From about May 2027, section 9
                of the DPDP Act will add specific rules for children&apos;s data; whether the exemption for clinical
                establishments in the DPDP Rules (Fourth Schedule, Part A) applies to us is under legal review.
              </p>
            </Section>

            <Section id="choices" title="9. Your choices now">
              <ul>
                <li><strong>Say no:</strong> you can choose not to give information; we may then be unable to book an appointment (SPDI Rule 5(7)).</li>
                <li><strong>Review and correct:</strong> see and correct the information you gave us (SPDI Rule 5(6)).</li>
                <li><strong>Withdraw consent:</strong> at any time, as easily as you gave it (SPDI Rule 5(7)).</li>
                <li><strong>Ask for deletion</strong> of information we do not have to keep.</li>
                <li><strong>Complain</strong> to our Grievance Officer, who resolves grievances within one month (SPDI Rule 5(9)).</li>
              </ul>
              <p className="mb-0">
                <strong>How:</strong> on <Link href="/data-rights">Your Data Rights</Link>, enter the reference ID you got
                when you booked and your registered mobile number or email, then the one-time code. Complaints:{' '}
                <Link href="/grievance">Raise a Grievance</Link> or contact the Grievance Officer directly (section 14).
              </p>
            </Section>

            <Section id="dpdp" title="10. From about May 2027: DPDP Act 2023">
              <p>
                When the DPDP Act&apos;s main provisions apply (expected from about 13 May 2027, date to be confirmed),
                you will also have these rights, which the Data Rights page already supports:
              </p>
              <ul>
                <li>a summary of your data, how it is used and who it was shared with (s.11);</li>
                <li>correction, completion, updating and erasure (s.12);</li>
                <li>grievance redressal within a published period of no more than 90 days (s.13; Rule 14(3));</li>
                <li>nominating someone to act for you on death or incapacity (s.14);</li>
                <li>
                  complaining to the <BoardLink /> after using our grievance process (s.13(3)).
                </li>
              </ul>
              <p className="mb-0">
                You will also have duties under section 15, for example not to file false or frivolous complaints.
              </p>
            </Section>

            <Section id="location" title="11. Where your data is stored">
              <p className="mb-0">
                Hosting provider: {HOSTING.provider}; location: {HOSTING.location}.{' '}
                {HOSTING.crossBorder
                  ? `Some data is processed in: ${HOSTING.countries.join(', ')}.`
                  : 'We do not transfer your information outside India.'}
              </p>
            </Section>

            <Section id="incidents" title="12. Security incidents">
              <p className="mb-0">
                If we notice a cyber security incident such as unauthorised access to or a leak of personal
                information, we report it to CERT-In within six hours of noticing it, as the CERT-In Directions of 28
                April 2022 require. From about May 2027 we will also inform the people affected and the Data
                Protection Board as the DPDP Rules (Rule 7) require.
              </p>
            </Section>

            <Section id="changes" title="13. Changes to this policy">
              <p>
                Current version: <strong>{NOTICE_VERSION}</strong>, effective {NOTICE_EFFECTIVE_FROM}. The notice shown
                with each form is available in: {LANGUAGES.map((l) => l.label).join(', ')}. This policy is in English.
              </p>
              <Table head={['Version', 'Date', 'Change']} rows={POLICY_CHANGELOG.map((e) => [e.version, e.date, e.change])} />
            </Section>

            <Section id="contact" title="14. Contact">
              <div className="border rounded p-4 bg-grays">
                <ContactBlock />
              </div>
            </Section>
          </div>
        </div>
      </div>
    </section>
  </Fragment>
);

export default PrivacyPolicy;
