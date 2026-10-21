/**
 * Privacy policy, in plain language with no section or rule numbers in the visible text
 * (visitors see the law named by title only, in "Laws that apply to us").
 *
 * Legal mapping, for developers and reviewers (see docs/audit/02-legal-matrix.md):
 * - In force now: IT Act 2000 s.43A; IT (Reasonable Security Practices and Procedures and
 *   Sensitive Personal Data or Information) Rules 2011 ("SPDI Rules"): Rule 3 (sensitive data),
 *   Rule 4 (published policy), Rule 5(1) consent, 5(3) recipients and collecting agency,
 *   5(4) retention, 5(6) review/correction, 5(7) option not to provide / withdraw,
 *   5(9) Grievance Officer within one month, Rule 6(1) proviso (disclosure to government
 *   agencies), Rule 8 (security programme); CERT-In Directions 28 Apr 2022, direction (ii)
 *   (report within 6 hours).
 * - Expected from about 13 May 2027 (G.S.R. 843(E); date to be confirmed): DPDP Act 2023
 *   s.6 consent, s.6(10) proof, s.7(a)/(d)/(e) legitimate uses, s.8(7) retention required by
 *   law, s.9 children (Rule 12 + Fourth Schedule Part A item 1 exemption under review),
 *   ss.11–14 rights, s.13(3) Board complaint, s.15 duties; DPDP Rules 7 (breach), 8(3)
 *   (one-year record retention), 14(3) (grievance period of at most 90 days).
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
  ['law', 'Laws that apply to us'],
  ['collect', 'What we collect'],
  ['purposes', 'Why we use it'],
  ['recipients', 'Who receives it'],
  ['security', 'How we protect it'],
  ['retention', 'How long we keep it'],
  ['children', 'Children'],
  ['choices', 'Your choices now'],
  ['changes-2027', 'What changes in 2027'],
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

            <Section id="who" title="Who we are">
              <p className="mb-0">
                {CLINIC.legalName} (trading as {CLINIC.tradeName}), {CLINIC.address}, operates this website and decides
                how the personal information collected on it is used. Our Grievance Officer is {GRIEVANCE_OFFICER.name}.
                You will find their contact details under <a href="#contact">Contact</a>.
              </p>
            </Section>

            <Section id="law" title="Laws that apply to us">
              <p className="mb-0">
                Today, the <strong>Information Technology Act, 2000</strong> and the{' '}
                <strong>
                  Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or
                  Information) Rules, 2011
                </strong>{' '}
                govern how we handle your information, and we follow the <strong>CERT-In</strong> directions on
                reporting cyber security incidents. The <strong>Digital Personal Data Protection Act, 2023</strong> and
                its rules are being brought in step by step: their main obligations and rights are expected to take
                effect in May 2027 (the exact date is still to be confirmed). See{' '}
                <a href="#changes-2027">What changes in 2027</a>. Nothing in this policy limits any right you have under
                the law.
              </p>
            </Section>

            <Section id="collect" title="What we collect">
              <h3 className="fs-18 merriweather text-title">Appointment request form</h3>
              <ul>
                <li>Patient&apos;s name and mobile number; email address (optional)</li>
                <li>
                  The service you want and, optionally, a short reason for your visit. This is health information,
                  which the law treats as <strong>sensitive</strong>: please do not enter detailed medical history; we
                  ask in person.
                </li>
                <li>Preferred date and time</li>
                <li>If the patient is under 18: the parent or guardian&apos;s name and relationship, and their declaration</li>
                <li>Proof of your consent: date and time, notice version, language, browser type and a one-way hash of your IP address (never the IP address itself)</li>
              </ul>
              <h3 className="fs-18 merriweather text-title">Cookie choices</h3>
              <ul>
                <li>Your choices, the notice version you saw, a random ID in a cookie, a one-way hash of your IP address and your browser type. See the <Link href="/cookie-policy">Cookie Policy</Link>.</li>
              </ul>
              <h3 className="fs-18 merriweather text-title">Analytics (only if you allow it)</h3>
              <ul>
                <li>
                  A random visitor ID in a cookie, the pages of this site you open and when, and the website that sent
                  you (domain only). Collected by our own script and stored on our server; no IP address or browser
                  details. Never on the booking, Data Rights or Grievance pages, or during a booking for a child.
                </li>
              </ul>
              <h3 className="fs-18 merriweather text-title">Data Rights and Grievance pages</h3>
              <ul className="mb-0">
                <li>Your reference ID and the phone number or email you verify with; a one-time code (stored only as a hash)</li>
                <li>What you ask us to do, and our reply</li>
                <li>For complaints: the complaint and, if you have no reference ID, your name and contact details for our reply</li>
                <li>If you nominate someone: their name, relationship and contact details</li>
              </ul>
            </Section>

            <Section id="purposes" title="Why we use it">
              <Table
                head={['Purpose', 'Information used', 'Why we are allowed to', 'From 2027 (to be confirmed)']}
                rows={[
                  [
                    'Booking and managing your appointment',
                    'Name, mobile, email (optional), service, date and time, reason (optional), guardian details',
                    'Your consent, which we ask for before collecting health information',
                    'Your consent; scheduling may instead be treated as information you chose to give us for this purpose (under legal review)'
                  ],
                  [
                    'Proving what you agreed to and handling your requests and complaints',
                    'Consent records, reference ID, requests, complaints',
                    'We must handle complaints and keep reasonable security records',
                    'The same, plus keeping proof of consent'
                  ],
                  [
                    'Remembering your language (optional cookie)',
                    'Language preference',
                    'Your choice in the cookie settings',
                    'Your consent'
                  ],
                  [
                    'Counting page visits to improve the site (optional analytics)',
                    'Visitor ID, pages, time, referring domain',
                    'Your choice in the cookie settings; withdrawing erases the data',
                    'Your consent'
                  ],
                  [
                    'Meeting legal obligations',
                    'Clinical records and anything a law or court order requires',
                    'Disclosure to government agencies where the law requires it',
                    'Where a law or a court order requires it'
                  ]
                ]}
              />
              <p className="mb-0">
                We use your information only for these purposes. We do not sell it, use it for advertising or profiling,
                or send marketing messages.
              </p>
            </Section>

            <Section id="recipients" title="Who receives it">
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

            <Section id="security" title="How we protect it">
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
                information security programme audited against a recognised standard such as ISO/IEC 27001.
              </p>
            </Section>

            <Section id="retention" title="How long we keep it">
              <p>
                We keep information only as long as we need it for the purpose, or as long as another law requires.
                Current settings, applied by a scheduled clean-up job:
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
                <li>Analytics page visits: {RETENTION.analyticsEventDays} days, or until you withdraw analytics consent.</li>
                <li>Consent records: {years(RETENTION.consentRecordDays)} years, as proof of what you agreed to.</li>
                <li>Access logs: at least one year.</li>
                <li>Requests and complaints: {years(RETENTION.requestRecordDays)} years after they are closed.</li>
              </ul>
              <p className="mb-0">
                These periods are under review: from 2027 the new data protection rules are expected to require keeping
                records of processing for at least one year.
              </p>
            </Section>

            <Section id="children" title="Children">
              <p className="mb-0">
                If the patient is under 18, a parent or lawful guardian must fill in the form, declare that they are an
                adult and the child&apos;s parent or guardian, and give consent for the child. We collect only what the
                appointment needs and never run analytics during a booking for a child. From 2027 the new law adds
                specific rules for children&apos;s data; whether its exemption for clinics providing health care to
                children applies to us is under legal review.
              </p>
            </Section>

            <Section id="choices" title="Your choices now">
              <ul>
                <li><strong>Say no:</strong> you can choose not to give information; we may then be unable to book an appointment.</li>
                <li><strong>Review and correct:</strong> see and correct the information you gave us.</li>
                <li><strong>Withdraw consent:</strong> at any time, as easily as you gave it.</li>
                <li><strong>Ask for deletion</strong> of information we do not have to keep.</li>
                <li><strong>Complain</strong> to our Grievance Officer, who resolves grievances within one month.</li>
              </ul>
              <p className="mb-0">
                <strong>How:</strong> on <Link href="/data-rights">Your Data Rights</Link>, enter the reference ID you got
                when you booked and your registered mobile number or email, then the one-time code. Complaints:{' '}
                <Link href="/grievance">Raise a Grievance</Link> or contact the Grievance Officer directly (see{' '}
                <a href="#contact">Contact</a>).
              </p>
            </Section>

            <Section id="changes-2027" title="What changes in 2027">
              <p>
                When the Digital Personal Data Protection Act&apos;s main provisions take effect (expected in May 2027,
                date to be confirmed), you will also have these rights, which the Data Rights page already supports:
              </p>
              <ul>
                <li>a summary of your data, how it is used and who it was shared with;</li>
                <li>correction, completion, updating and erasure;</li>
                <li>an answer to your complaint within a published period of no more than 90 days;</li>
                <li>nominating someone to act for you if you die or can no longer act yourself;</li>
                <li>
                  complaining to the <BoardLink /> after using our grievance process.
                </li>
              </ul>
              <p className="mb-0">
                You will also have duties, for example not to file false or frivolous complaints and to give accurate
                information.
              </p>
            </Section>

            <Section id="location" title="Where your data is stored">
              <p className="mb-0">
                Hosting provider: {HOSTING.provider}; location: {HOSTING.location}.{' '}
                {HOSTING.crossBorder
                  ? `Some data is processed in: ${HOSTING.countries.join(', ')}.`
                  : 'We do not transfer your information outside India.'}
              </p>
            </Section>

            <Section id="incidents" title="Security incidents">
              <p className="mb-0">
                If we notice a cyber security incident such as unauthorised access to or a leak of personal
                information, we report it to CERT-In, India&apos;s national cyber security agency, within six hours of
                noticing it. From 2027 we will also inform the people affected and the Data Protection Board without
                delay.
              </p>
            </Section>

            <Section id="changes" title="Changes to this policy">
              <p>
                Current version: <strong>{NOTICE_VERSION}</strong>, effective {NOTICE_EFFECTIVE_FROM}. The notice shown
                with each form is available in: {LANGUAGES.map((l) => l.label).join(', ')}. This policy is in English.
              </p>
              <Table head={['Version', 'Date', 'Change']} rows={POLICY_CHANGELOG.map((e) => [e.version, e.date, e.change])} />
            </Section>

            <Section id="contact" title="Contact">
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
