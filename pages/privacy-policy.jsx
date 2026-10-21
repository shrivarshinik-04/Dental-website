/**
 * Privacy policy. DPDP Act 2023: s.4–s.9, s.11–s.16; DPDP Rules 2025: Rules 3, 6, 7,
 * 9, 12, 14, 15. Plain-language English; the consent notices themselves are available
 * in every language in LANGUAGES (s.5(3)). Placeholders come from src/config/compliance.js.
 */
import { Fragment } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  CLINIC,
  GRIEVANCE_RESPONSE_DAYS,
  HOSTING,
  LANGUAGES,
  NOTICE_EFFECTIVE_FROM,
  NOTICE_VERSION,
  POLICY_CHANGELOG,
  PROCESSORS,
  RETENTION,
  RIGHTS_RESPONSE_DAYS
} from 'config/compliance';
import PageHeader from 'components/PageHeader';
import BoardLink from 'components/BoardLink';
import ContactBlock from 'components/ContactBlock';

const Section = ({ id, title, children }) => (
  <section id={id} className="mb-8">
    <h2 className="fs-24 merriweather text-title mb-3">{title}</h2>
    {children}
  </section>
);

const PURPOSE_ROWS = [
  {
    purpose: 'Booking and managing your appointment',
    data: 'Name, mobile number, email (optional), service, preferred date and time, reason for visit (optional), guardian details for children',
    ground: 'Your consent (s.6). Required to book.'
  },
  {
    purpose: 'Appointment reminders by SMS or WhatsApp',
    data: 'Name, mobile number, appointment date and time',
    ground: 'Your consent (s.6). Optional.'
  },
  {
    purpose: 'Offers and clinic news',
    data: 'Name, mobile number, email',
    ground: 'Your consent (s.6). Optional. Never for patients under 18.'
  },
  {
    purpose: 'Remembering your language (functional cookies)',
    data: 'Language preference',
    ground: 'Your consent (s.6). Optional.'
  },
  {
    purpose: 'Website analytics',
    data: 'Pages visited, device and browser information',
    ground: 'Your consent (s.6). Optional. Not in use today.'
  },
  {
    purpose: 'Proving your consent choices and handling your requests',
    data: 'Reference ID, consent history, notice version, hashed IP address, browser type, requests and grievances',
    ground:
      'Needed to meet our obligations under the DPDP Act (s.6(10) proof of consent; s.8 obligations; s.13 grievances).'
  },
  {
    purpose: 'Responding to a medical emergency',
    data: 'Name, phone, relevant health information',
    ground: 'Legitimate use under s.7(f): a medical emergency involving a threat to life or immediate threat to health. No consent needed.'
  },
  {
    purpose: 'Meeting legal obligations',
    data: 'Clinical records and any data a law or court order requires',
    ground:
      'Legitimate use under s.7(d) (an obligation under law to disclose information to the State) and s.7(e) (compliance with a judgment, decree or order); retention required by law (s.8(7)).'
  }
];

const PrivacyPolicy = () => (
  <Fragment>
    <Head>
      <title>Privacy Policy | Dental Clinic</title>
      <meta name="description" content={`How ${CLINIC.tradeName} collects, uses and protects your personal data.`} />
    </Head>
    <PageHeader
      title="Privacy Policy"
      subtitle={`Version ${NOTICE_VERSION}, effective ${NOTICE_EFFECTIVE_FROM}. How we handle your personal data under the Digital Personal Data Protection Act, 2023 and the DPDP Rules, 2025.`}
    />
    <section className="wrapper">
      <div className="container py-10 py-md-12">
        <div className="row justify-content-center">
          <div className="col-lg-10 col-xl-9 lato fs-16">
            <nav aria-label="Contents" className="border rounded p-4 mb-8 bg-grays">
              <p className="fw-bold mb-2">Contents</p>
              <ol className="mb-0">
                {[
                  ['who', 'Who we are'],
                  ['collect', 'What we collect'],
                  ['purposes', 'Why we use it'],
                  ['sharing', 'Who we share it with'],
                  ['security', 'How we protect it'],
                  ['retention', 'How long we keep it'],
                  ['children', "Children's data"],
                  ['rights', 'Your rights'],
                  ['duties', 'Your duties'],
                  ['location', 'Where your data is stored'],
                  ['grievances', 'Complaints'],
                  ['breach', 'If something goes wrong'],
                  ['changes', 'Changes to this policy'],
                  ['contact', 'Contact']
                ].map(([id, label]) => (
                  <li key={id}>
                    <a href={`#${id}`}>{label}</a>
                  </li>
                ))}
              </ol>
            </nav>

            <Section id="who" title="1. Who we are">
              <p>
                {CLINIC.legalName} (trading as {CLINIC.tradeName}), {CLINIC.address}, decides why and how your personal
                data is used. Under the Digital Personal Data Protection Act, 2023 (the &quot;Act&quot;) we are the{' '}
                <strong>Data Fiduciary</strong> and you are the <strong>Data Principal</strong>.
              </p>
              <p>
                We treat dental and health information as highly sensitive. The Act does not have a separate
                &quot;sensitive data&quot; category, but we protect it with extra measures (see section 5).
              </p>
            </Section>

            <Section id="collect" title="2. What we collect">
              <h3 className="fs-18 merriweather text-title">Appointment booking form</h3>
              <ul>
                <li>Name of the patient</li>
                <li>Mobile number</li>
                <li>Email address (optional)</li>
                <li>The service you want and your preferred date and time</li>
                <li>A short reason for the visit (optional). Please do not enter detailed medical history.</li>
                <li>If the patient is under 18: the parent or guardian&apos;s name and relationship, and their declaration</li>
                <li>Your consent choices, with the date and time, notice version, language, browser type and a one-way hash of your IP address</li>
              </ul>
              <h3 className="fs-18 merriweather text-title">Cookie banner and website</h3>
              <ul>
                <li>A random ID in a cookie, your cookie choices and the notice version you saw</li>
                <li>A one-way hash of your IP address and your browser type, stored with each choice</li>
                <li>
                  Nothing else unless you opt in. See the <Link href="/cookie-policy">Cookie Policy</Link>.
                </li>
              </ul>
              <h3 className="fs-18 merriweather text-title">Data Rights and Grievance pages</h3>
              <ul>
                <li>Your reference ID and the phone number or email you use to verify, and a one-time code (stored only as a hash)</li>
                <li>What you ask us to do, and our reply</li>
                <li>For grievances: the complaint and, if you have no reference ID, your name and contact details for our reply</li>
                <li>Your nominee&apos;s name, relationship and contact details, if you nominate someone</li>
              </ul>
              <h3 className="fs-18 merriweather text-title">At the clinic</h3>
              <p className="mb-0">
                When you visit, we create a clinical record (examination findings, treatment, X-rays, prescriptions). This
                is needed to treat you and is kept for the period the law requires.
              </p>
            </Section>

            <Section id="purposes" title="3. Why we use it, and on what legal ground (s.4)">
              <p>
                We only process personal data for a lawful purpose, either with your <strong>consent</strong> (s.6) or for
                a <strong>legitimate use</strong> listed in s.7. You can say no to any optional purpose and still book.
              </p>
              <div className="table-responsive">
                <table className="table table-bordered fs-15">
                  <thead>
                    <tr>
                      <th scope="col">Purpose</th>
                      <th scope="col">Personal data used</th>
                      <th scope="col">Legal ground</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PURPOSE_ROWS.map((row) => (
                      <tr key={row.purpose}>
                        <td>{row.purpose}</td>
                        <td>{row.data}</td>
                        <td>{row.ground}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mb-0">We do not sell your data and we do not use it for profiling or automated decisions.</p>
            </Section>

            <Section id="sharing" title="4. Who we share it with">
              <p>
                We use these <strong>Data Processors</strong>. Each acts only on our instructions under a written
                contract (s.8(2)) and must protect your data and erase it when we ask.
              </p>
              <div className="table-responsive">
                <table className="table table-bordered fs-15">
                  <thead>
                    <tr>
                      <th scope="col">Processor</th>
                      <th scope="col">What they do</th>
                      <th scope="col">Data shared</th>
                      <th scope="col">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PROCESSORS.map((p) => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td>{p.purpose}</td>
                        <td>{p.dataShared}</td>
                        <td>{p.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mb-0">
                We may also disclose data when the law or a court order requires it (s.7(d), s.7(e)), or to protect life
                in a medical emergency (s.7(f)).
              </p>
            </Section>

            <Section id="security" title="5. How we protect it (s.8(5), Rule 6)">
              <ul className="mb-0">
                <li>Names, contact details, health details and nominee details are encrypted in our database (AES-256-GCM).</li>
                <li>The website only works over HTTPS, with strict security headers.</li>
                <li>Only authorised staff can see personal data, and only what their role needs. Every view, export and change is logged.</li>
                <li>IP addresses are never stored, only a salted one-way hash.</li>
                <li>Forms and APIs are validated and rate-limited to prevent abuse.</li>
                <li>We keep encrypted backups so data can be restored if it is lost or damaged.</li>
                <li>Access and processing logs are kept for at least one year to detect and investigate misuse (Rule 6(1)(e), Rule 8(3)).</li>
                <li>Our contracts with Processors require the same safeguards.</li>
              </ul>
            </Section>

            <Section id="retention" title="6. How long we keep it (s.8(7))">
              <p>We erase personal data once its purpose is served or you withdraw consent, unless a law requires us to keep it.</p>
              <ul className="mb-0">
                <li>
                  Booking details for visits that do not go ahead, or after you withdraw consent: erased within{' '}
                  {RETENTION.appointmentAfterVisitDays} days.
                </li>
                <li>
                  Clinical records: kept for {Math.round(RETENTION.clinicalRecordDays / 365)} years after the visit, as
                  required by the medical record-keeping rules that apply to us.
                </li>
                <li>
                  Consent history (proof of what you agreed to): {Math.round(RETENTION.consentRecordDays / 365)} years.
                </li>
                <li>Access and processing logs: at least one year.</li>
                <li>
                  Records of your requests and grievances: {Math.round(RETENTION.requestRecordDays / 365)} years after they are closed.
                </li>
              </ul>
            </Section>

            <Section id="children" title="7. Children's data (s.9)">
              <p>
                Under the Act, anyone under 18 is a child. When you book for a child, a parent or lawful guardian must fill
                in the form, declare that they are an adult and the child&apos;s parent or lawful guardian, and give
                consent on the child&apos;s behalf.
              </p>
              <p className="mb-0">
                As a clinical establishment, we may process a child&apos;s data to provide health services to the child,
                to the extent needed to protect their health (Rule 12 and Fourth Schedule, Part A, item 1). We collect only
                what the appointment needs. We never track children, send them marketing, or use analytics or advertising
                cookies during a booking for a child.
              </p>
            </Section>

            <Section id="rights" title="8. Your rights (s.11 to s.14)">
              <ul>
                <li>
                  <strong>Access (s.11):</strong> a summary of your data, how we use it, and who we share it with.
                </li>
                <li>
                  <strong>Correction, completion and updating (s.12(2)).</strong>
                </li>
                <li>
                  <strong>Erasure (s.12(3)):</strong> we erase everything we are not legally required to keep, and tell
                  you what we kept and why.
                </li>
                <li>
                  <strong>Withdraw consent (s.6(4)):</strong> at any time, as easily as you gave it. Withdrawal does not
                  affect processing already done.
                </li>
                <li>
                  <strong>Grievance redressal (s.13):</strong> see section 11.
                </li>
                <li>
                  <strong>Nomination (s.14):</strong> name someone to exercise your rights if you die or become unable to.
                </li>
              </ul>
              <p>
                <strong>How:</strong> go to <Link href="/data-rights">Your Data Rights</Link>, enter the reference ID we
                gave you when you booked (for example DP-7K3QXM) and your registered mobile number or email, and confirm
                with the one-time code we send. Withdrawal, correction, nomination and download happen straight away. Cookie
                choices can be changed at any time from &quot;Cookie settings&quot; at the bottom of every page.
              </p>
              <p className="mb-0">
                If you cannot use the website, contact us (section 14). We reply to rights requests within{' '}
                {RIGHTS_RESPONSE_DAYS} days.
              </p>
            </Section>

            <Section id="duties" title="9. Your duties (s.15)">
              <p className="mb-0">
                When you exercise your rights you must follow the law, give accurate information (and only verifiably
                authentic information when you ask for a correction), not impersonate anyone, not hide material
                information, and not file false or frivolous complaints with us or the Board.
              </p>
            </Section>

            <Section id="location" title="10. Where your data is stored (s.16, Rule 15)">
              <p className="mb-0">
                Our website and database are hosted by {HOSTING.provider} in {HOSTING.location}.{' '}
                {HOSTING.crossBorder
                  ? `Some data is processed in: ${HOSTING.countries.join(', ')}. We only transfer data to countries the Central Government has not restricted, and on the conditions it sets.`
                  : 'We do not transfer your personal data outside India.'}
              </p>
            </Section>

            <Section id="grievances" title="11. Complaints">
              <p>
                If you are unhappy with how we have handled your data, please tell our Grievance Officer through the{' '}
                <Link href="/grievance">Grievance page</Link> or the contact details below. You will get a reference
                number and the date by which we will reply: within {GRIEVANCE_RESPONSE_DAYS} days, and never more than 90
                days (Rule 14(3)).
              </p>
              <p className="mb-0">
                If you are not satisfied with our reply, you may complain to the{' '}
                <BoardLink />{' '}
                after using our grievance process (s.13(3)). Nothing in our notices or forms takes away that right.
              </p>
            </Section>

            <Section id="breach" title="12. If something goes wrong (s.8(6), Rule 7)">
              <p className="mb-0">
                If a personal data breach affects you, we will tell you without delay: what happened, what it may mean for
                you, what we are doing about it, what you can do to protect yourself, and who to contact. We will also
                inform the Data Protection Board without delay, with a detailed report within 72 hours.
              </p>
            </Section>

            <Section id="changes" title="13. Changes to this policy">
              <p>
                Current version: <strong>{NOTICE_VERSION}</strong>, effective {NOTICE_EFFECTIVE_FROM}. When we change how we
                use your data we will update this page and ask for your consent again where needed. Consent notices are
                available in: {LANGUAGES.map((l) => l.label).join(', ')}.
              </p>
              <div className="table-responsive">
                <table className="table table-bordered fs-15 mb-0">
                  <thead>
                    <tr>
                      <th scope="col">Version</th>
                      <th scope="col">Date</th>
                      <th scope="col">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {POLICY_CHANGELOG.map((entry) => (
                      <tr key={entry.version}>
                        <td>{entry.version}</td>
                        <td>{entry.date}</td>
                        <td>{entry.change}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section id="contact" title="14. Contact (Rule 9)">
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
