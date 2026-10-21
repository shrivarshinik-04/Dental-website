# Project: DPDPA-Aligned Website Replication and Privacy Implementation

## 1. Project Objective

I have cloned the following GitHub repository:

https://github.com/themixlyweb/nextjs-dental-website-template

I want to replicate the existing website with only minor changes to its branding, content, images and sections. The website will be used as a test environment to evaluate privacy compliance using Zycato by SQ1 Security.

The primary objective is to retain the existing website architecture while identifying and implementing the privacy requirements applicable under India's Digital Personal Data Protection Act, 2023 (DPDP Act) and the Digital Personal Data Protection Rules, 2025 (DPDP Rules).

Do not assume the website needs a database, authentication system, consent-management platform or additional backend until the actual requirements and existing code have been examined.

## 2. Mandatory Working Instructions

Before making changes:

1. Inspect the entire repository, including package.json, package-lock.json, Next.js configuration, page components, reusable components, public assets, forms, API routes, external integrations and deployment files.
2. Identify the existing architecture, dependencies, database integrations, data flows and security controls.
3. Create a baseline inventory of existing functionality and privacy gaps.
4. Determine which legal requirements apply to the website and distinguish current obligations from provisions whose commencement is scheduled for a later date.
5. Present the proposed implementation plan before making substantial changes.

Do not:
- Replace the existing framework or rebuild the website from scratch.
- Upgrade, remove or add dependencies without a justified need.
- Invent infrastructure components or claim that controls exist without evidence.
- expose API keys, credentials, tokens, database connection strings or other secrets.
- collect real personal data unnecessarily during testing.
- implement fake consent controls that merely change the interface without affecting actual processing.
- claim DPDPA compliance solely because a policy page or consent banner exists.

Preserve existing working functionality and make changes incrementally.

## 3. Legal and Regulatory Scope

Use the official sources as the primary references:

- DPDP Act, 2023: https://www.indiacode.nic.in/bitstream/123456789/22037/2/a2023-22.pdf
- DPDP Rules, 2025: https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digital-Personal-Data-Protection-Rules-2025

Verify relevant provisions, exceptions, applicable rules and commencement dates before implementation.

Account for the phased commencement of the legislation. As of October 2026, do not treat provisions scheduled to commence on 13 May 2027 as already operative. Identify which requirements are currently in force, which are upcoming, and which depend on the organisation's status or processing activities.

Do not assume every website requires a DPO, cookie banner, login system, parental-consent flow or separate consent-management platform.

## 4. Privacy Notice and Public-Facing Information

Assess and implement, where applicable:

### A. Privacy Notice
- Identify the Data Fiduciary and provide appropriate contact information.
- Explain each category of personal data collected.
- Explain the specific purpose associated with each category.
- Explain how individuals can exercise applicable rights.
- Explain how individuals can withdraw consent, where consent is the processing basis.
- Explain how individuals can raise grievances.
- Provide the additional details and disclosures required by applicable law and rules.
- Use clear, understandable language.
- Link the notice from relevant forms and personal-data collection points.
- Maintain versioning so the notice presented at collection can be identified later.

Do not use generic text that misrepresents the website's actual practices.

### B. Terms of Use
Assess whether terms of use are appropriate for the website's intended functionality. If required by the project, create a page describing permitted use, user responsibilities and relevant service conditions.

Do not present terms of use as a universal DPDP Act requirement.

### C. Cookie and Tracking Disclosures
- Inventory cookies, local storage, session storage, analytics, advertising pixels and other tracking technologies.
- Identify which services create or read them and whether they process personal data.
- Document their purposes and relevant data flows.
- Determine the applicable legal requirements before implementing consent choices.
- Provide an appropriate cookie notice or settings interface when justified.
- Do not add a banner merely for appearance or claim that every cookie requires consent under the DPDP Act.

### D. Privacy Contact and Grievance Route
Provide a clear route for privacy questions, grievances and rights requests.

Determine whether a DPO or another authorised contact is appropriate for the organisation's legal status. Do not invent contact details or publish placeholder details as genuine organisational information.

## 5. Consent Management

Where consent is the applicable basis for processing, implement a meaningful consent workflow.

Requirements:

- Obtain valid consent before the relevant processing where required by law.
- Ensure consent is free, specific, informed, unconditional and unambiguous, expressed through clear affirmative action.
- Avoid preselected checkboxes and bundled consent for unrelated purposes.
- Distinguish processing necessary for a requested service from optional marketing or other purposes.
- Explain the relevant purpose at the point of collection.
- Record the consent decision, timestamp, purpose, notice version and other evidence necessary to demonstrate consent.
- Support consent withdrawal through an accessible mechanism.
- Ensure withdrawal is not unnecessarily more difficult than giving consent.
- Propagate withdrawal to relevant application systems and processors, as applicable.
- Stop processing that relies on withdrawn consent, subject to applicable legal requirements and exceptions.
- Maintain auditable records of consent changes and resulting actions.

Important:
- Do not treat reading or acknowledging a privacy notice as consent.
- Do not require consent for unrelated processing merely to submit a form.
- Do not use consent as the default basis where another lawful basis applies.
- Do not implement a decorative consent banner that fails to control actual processing.

If the website does not currently require consent functionality, document that finding and explain which features would require it.

## 6. Personal-Data Collection and Forms

Inspect every form, input field and data submission mechanism.

For each form, identify:
- Data fields collected.
- Purpose of each field.
- Whether each field is necessary.
- Legal basis for the processing.
- Frontend and backend submission destinations.
- Third-party recipients and integrations.
- Storage location and retention requirements.
- Applicable notice and consent requirements.

Implement, where required:
- Data minimisation.
- Clear collection notices.
- Server-side validation.
- Appropriate input handling and output encoding.
- Protection against unauthorised submissions.
- Rate limiting or anti-abuse measures where appropriate.
- Secure transmission and storage.
- Safe error handling.
- Appropriate deletion and retention behaviour.

Never collect or store form submissions in a database unless the functionality requires it and the data flow is properly configured.

If there is no backend or database, explicitly document what currently happens when a form is submitted and implement a backend only if the approved scope requires persistent data storage or server-side processing.

## 7. Privacy Rights Management

Determine which rights and obligations apply under the Act and implement a practical workflow for relevant requests, including:

- Access to information about personal data and processing, as provided by law.
- Correction and completion of personal data, where applicable.
- Erasure of personal data, where applicable.
- Withdrawal of consent.
- Grievance handling and escalation.
- Nomination rights, where applicable.
- Identity verification proportionate to the request.
- Request tracking, response handling and evidence of completion.

Do not invent statutory deadlines. Verify the applicable provisions and rules.

If the website needs a rights-request form, collect only the information necessary to process the request and protect submitted information.

Do not promise immediate erasure where legal retention requirements or other applicable obligations prevent it.

## 8. Data Retention and Deletion

Inspect all potential personal-data storage locations, including:
- Databases.
- Application logs.
- Uploaded files.
- External services and SaaS integrations.
- Browser storage.
- Backups.
- Analytics and monitoring platforms.

Where applicable, implement:
- Documented retention periods or criteria.
- Automated deletion or scheduled review where appropriate.
- Deletion workflows for rights requests.
- Retention exceptions for legal requirements.
- Appropriate propagation of deletion requests to processors.
- Verification that deleted records are no longer accessible through normal application paths.

Do not claim that data is permanently deleted from backups unless the backup lifecycle has been verified.

If the application stores no personal data, document the finding rather than inventing a retention system.

## 9. Security Controls

Assess the existing code and deployment configuration for:

- Authentication and authorisation, where relevant.
- Least-privilege access.
- Server-side validation.
- Protection against injection and cross-site scripting.
- Cross-site request forgery protections where applicable.
- Secure cookie configuration.
- Security headers.
- HTTPS and secure transport.
- Secrets management.
- Dependency security.
- Error handling.
- Logging and monitoring.
- Access restrictions for administrative functions.
- Exposure of sensitive data through public files, source code or API responses.

Implement suitable controls within the existing architecture.

Do not expose personal data, credentials or internal errors in browser responses, client-side code or logs.

Do not add authentication to a purely informational site unless the approved requirements justify it.

## 10. Personal-Data Breach Management

Assess whether the application and operating organisation need a documented breach response process.

Where applicable, document or implement the capability to:
- Detect and escalate suspected personal-data breaches.
- Identify affected systems and data categories.
- Contain the incident.
- Investigate the cause and scope.
- Preserve relevant evidence.
- Determine applicable notification obligations and deadlines.
- Notify affected individuals and the Data Protection Board as required by applicable law and rules.
- Record remediation and lessons learned.

Do not create a fake breach-reporting interface that is not connected to an actual operational process.

## 11. Third-Party Processors and External Services

Identify every external service used by the application, including:
- Analytics.
- Advertising.
- Fonts and content delivery.
- Maps and embedded media.
- Email and contact-form services.
- Authentication services.
- Hosting and monitoring.
- APIs and data storage services.

For each service, document:
- Purpose.
- Data shared.
- Data recipient.
- Whether personal data is involved.
- Relevant configuration and storage locations.
- Applicable contractual, security and legal considerations.

Do not assume a third-party service is compliant merely because it is widely used.

## 12. Children's Personal Data

Assess whether the intended website may process children's personal data.

Where applicable, evaluate the statutory requirements relating to verifiable parental consent, restrictions on processing likely to cause detrimental effects to children's well-being, tracking or behavioural monitoring, and targeted advertising.

Account for statutory exceptions and applicable exemptions.

Do not collect real children's data to test these workflows. Use synthetic test data and document any age-handling or parental-consent functionality that is required.

## 13. Significant Data Fiduciary Requirements

Do not assume the organisation is a Significant Data Fiduciary.

Determine whether the additional requirements apply based on the organisation's actual designation and applicable rules.

Where applicable, assess requirements relating to:
- A DPO based in India.
- An independent data auditor.
- Periodic Data Protection Impact Assessments.
- Periodic audits.
- Other applicable additional obligations.

Treat these as conditional requirements, not universal website requirements.

## 14. Technical Architecture and Database

Produce an accurate architecture inventory before proposing additional services.

Inspect:
- Next.js application structure and router.
- React components.
- Dependencies.
- API routes and server-side functionality.
- Existing database integrations.
- Environment variables, without exposing secret values.
- Hosting and deployment configuration.
- External API calls.
- Data storage and browser storage.
- Logging and monitoring.
- CI/CD workflows, if present.

Determine whether a database exists and is actually used.

If none exists, state this explicitly. Do not introduce PostgreSQL, MongoDB, Firebase, Supabase or another database without a justified requirement.

If a database is necessary, propose a suitable option, data model, access controls, retention approach and secure connection configuration for approval before implementing it.

## 15. Testing and Validation

Create test cases covering:
- Privacy notice visibility and accuracy.
- Form data minimisation.
- Consent capture and evidence.
- Consent withdrawal and processing changes.
- Optional marketing choices.
- Rights-request handling.
- Retention and deletion.
- Security headers and input validation.
- Access-control boundaries.
- External data flows.
- Error handling.
- Applicable child-data safeguards.
- Deployment configuration.

Use synthetic data and authorised testing only.

Run the available project checks, including build, lint and type checks where configured.

Record each test as:
- Pass.
- Fail.
- Not implemented.
- Not applicable.
- Requires organisational or legal confirmation.

Do not claim legal compliance based only on a successful build or automated scan.

## 16. Deliverables

Produce the following:

1. Existing architecture and technology-stack inventory.
2. Database and data-flow assessment.
3. Page and component inventory.
4. Personal-data collection and processing inventory.
5. Legal requirements matrix with relevant Act sections, Rules, applicability and commencement dates.
6. Existing-control versus required-control gap assessment.
7. Proposed implementation plan, prioritised by risk and dependency.
8. List of files to be modified and any new files needed.
9. Implementation changes after approval.
10. Test results and unresolved issues.
11. Evidence checklist for a subsequent Zycato assessment.

For every legal requirement, distinguish:
- Explicit statutory requirement.
- Conditional legal requirement.
- Recommended security practice.
- Project-specific design choice.

Cite the relevant legal provision and official source for material legal conclusions. If a requirement is uncertain, flag it for legal review instead of inventing an interpretation.

## 17. Execution Order

Follow these phases in order:

Phase 1: Read-only repository audit.

Phase 2: Legal applicability and privacy gap assessment.

Phase 3: Present the proposed changes for approval.

Phase 4: Implement approved changes incrementally.

Phase 5: Run tests and review security and privacy behaviour.

Phase 6: Produce final documentation and outstanding-gap report.

Start with Phase 1 only. Do not modify any files until I approve the findings and implementation plan.
