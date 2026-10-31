# Cepat — Project Introduction

## 1. Project Overview

**Cepat** is a mobile-first home-services marketplace designed for Indonesia.

The name _Cepat_ means “fast” in Bahasa Indonesia. The platform connects customers who need home services with independent technicians who provide them.

Examples of services include:

- Plumbing
- Air conditioning installation and repair
- Electrical work
- Home maintenance
- Appliance repair
- Other local professional services

Cepat is a marketplace and coordination platform. It helps users discover technicians, view their professional profiles, book services, communicate, and share reviews. Technicians and customers arrange and carry out the actual service themselves, subject to applicable law and the platform's terms.

The brand name is provisional and may change later.

## 2. Product Vision

Build a reliable, secure, fast, and easy-to-use home-services marketplace that customers and technicians across Indonesia can use confidently.

The product should feel polished and professional, with intuitive navigation, attractive technician profiles, responsive interactions, and a consistent visual identity.

Security, performance, maintainability, and testability are foundational requirements, not optional improvements.

## 3. Target Market

- Initial target market: Indonesia.
- The platform is designed for nationwide expansion.
- Actual technician availability depends on supported services, service areas, and individual technician coverage.
- Location support must accommodate Indonesian addresses and administrative regions.

Do not assume that a technician serves every location in Indonesia.

## 4. User Roles

### Customer

Customers can:

- Register and sign in.
- Browse and search for services and technicians.
- View technician profiles, portfolios, service descriptions, ratings, and reviews.
- Provide a service address and booking details.
- Submit booking requests.
- Accept or decline proposed alternative booking times.
- Chat with the technician after the booking is accepted.
- Cancel bookings.
- Report concerns.
- Rate completed services and leave written reviews.
- Manage their account and saved information.

### Technician

Technicians can:

- Register through the shared registration form by selecting the technician role.
- Complete an application and onboarding process.
- Submit required information for administrator review.
- Manage their professional profile, descriptions, services, and portfolio.
- Configure available working days and hours.
- Define their supported service areas.
- Receive booking requests and accept, decline, or propose another time.
- Communicate with customers through booking-specific chat.
- Update booking progress and mark jobs as completed.
- Receive customer ratings and reviews.
- Manage their account and availability.

Technician registration does not automatically grant permission to accept bookings. Technician approval and account status must be enforced by trusted backend logic.

### Administrator

Administrators can access a protected administrative interface to manage:

- Technician applications and account status.
- Reports and supporting evidence.
- Booking-related disputes and review records.
- Platform commission configuration.
- Appropriate account restrictions and administrative decisions.

Administrative access must be protected by server-side authorization. Never grant administrative privileges based on client-submitted data.

## 5. Default Marketplace

The marketplace is the default destination for customers and technicians after entering the application.

It should include:

- Search for services and technicians.
- Service categories.
- Relevant technicians based on the selected service location.
- Technician cards with photographs, names, specialties, ratings, and relevant service information.
- Featured or recommended technicians where appropriate.
- Navigation to detailed technician profiles.
- Access to each user's role-specific dashboard and bookings.

The interface should remain clean, fast, and easy to navigate.

### Technician Profiles

Each technician should have a professional profile where they can present their work and skills.

Profiles may include:

- Profile photograph and display name.
- Optional business or brand name.
- Professional description and experience.
- Services offered.
- Portfolio photographs and examples of work.
- Service areas.
- Ratings and written customer reviews.
- Verification status.
- Availability and booking options.

Allow controlled visual customization where practical. Customization must not permit arbitrary executable code, unsafe HTML, or changes that compromise accessibility, application security, or visual consistency.

Clicking a technician card opens the technician's profile. Customers can review the profile before selecting the booking action.

## 6. Booking Lifecycle

The initial booking workflow is:

1. A customer selects a technician, service, service address, and preferred time.
2. The system creates a booking request.
3. The technician can accept, decline, or propose a different time.
4. The customer can accept or decline a proposed alternative.
5. Once the booking is accepted, the booking becomes confirmed and booking-specific chat becomes available.
6. The parties coordinate details through chat.
7. Either party can cancel when necessary, following the applicable cancellation rules.
8. The technician updates the job status and marks the service as completed.
9. The customer can submit a rating from one to five stars and a written review.

The initial version does not require the customer to confirm completion.

Booking status transitions must be validated by the backend. Prevent invalid transitions, unauthorized updates, duplicate actions, and conflicting state changes.

## 7. Real-Time Messaging

Cepat will provide its own in-app messaging system. WhatsApp is not the primary communication channel.

Requirements:

- Use authenticated, real-time communication through WebSocket-based infrastructure, such as Supabase Realtime where appropriate.
- Associate conversations with specific bookings.
- Allow only authorized participants to access a conversation.
- Enable messaging after a booking is accepted.
- Support text and permitted image attachments.
- Notify users of relevant messages and booking events.
- Handle connection interruptions, reconnection, and message delivery reliably.
- Enforce conversation access and closure on the backend.
- Close conversations to new messages when the applicable booking lifecycle requires it.
- Preserve records according to an appropriate retention policy.

### Link Blocking and Circumvention Prevention

For the initial version, messages containing URLs should be rejected by server-side validation, with corresponding feedback in the client.

Links must not become clickable in chat. Do not rely solely on hiding links in the interface.

The system should be designed to detect and discourage attempts to move transactions off-platform, including suspicious contact sharing, phone numbers, WhatsApp details, and repeated cancellation patterns.

Detection must be configurable, tested, and designed to minimize false positives. Do not assume every cancellation or contact-sharing event is evidence of misconduct. Provide a reporting mechanism and appropriate administrator review.

Security checks must not rely exclusively on client-side filtering.

## 8. Reviews and Reporting

Customers can submit a one-to-five-star rating and written feedback after a completed job.

Reviews can contribute to technician visibility and ranking. Ranking must account for factors such as review count, reliability, and relevance, rather than relying on a single review.

Customers can submit reports about technicians. Reports may include a reason, explanation, and supporting photographs.

Administrators can review relevant evidence and booking records, record decisions, and apply appropriate actions.

Provide technicians with a reasonable opportunity to respond or appeal administrative decisions. Urgent temporary restrictions may be necessary for serious safety concerns.

Keep public reviews separate from private reports. Restrict sensitive information to authorized personnel and collect only data necessary for the platform's operation.

Advanced reporting workflows can be added in later releases.

## 9. Business Model

Cepat's intended revenue model is a commission on eligible completed jobs.

Requirements:

- Commission rates must be configurable by authorized administrators.
- Do not hard-code a final commission percentage throughout the application.
- Commission changes must be auditable.
- Define how the applicable rate is determined for each booking.
- Avoid silently changing the agreed financial terms of existing bookings.

The final commission rate and detailed financial policies have not yet been decided.

## 10. Payments and Future Wallet

Live payments and wallet functionality are postponed until the necessary government documentation and business requirements are ready.

The initial implementation must not process real payments or represent a simulated transaction as real money.

Design the architecture so payment processing can be added later without major changes to the booking system.

Future payment design should evaluate:

- A licensed payment provider suitable for the Indonesian market.
- Provider-managed payment settlement and technician payouts where supported.
- Secure transaction records and reconciliation.
- Commission calculations.
- Idempotent payment and webhook handling.
- Appropriate fraud prevention, auditability, and authorization.

Do not implement a stored-value wallet or hold customer funds without appropriate legal, regulatory, and provider review.

## 11. Technology Direction

The planned stack is:

- **Language:** TypeScript.
- **Mobile application:** React Native with Expo.
- **Backend services:** Supabase.
- **Database:** PostgreSQL through Supabase.
- **Authentication:** Supabase Auth.
- **Authorization:** Server-side rules and Supabase Row Level Security (RLS).
- **Real-time messaging:** Supabase Realtime or another justified WebSocket-based solution.
- **Styling:** NativeWind where compatible, with React Native styles where needed.
- **Testing:** Unit tests, integration tests, end-to-end tests, and security-focused tests.

These are the current technology decisions. Verify compatibility with the actual project and installed package versions before introducing additional dependencies.

Do not add libraries without a clear purpose. Avoid unnecessary complexity and duplicated functionality.

## 12. Language and Localization

The initial application interface supports Bahasa Indonesia and English. Bahasa Indonesia is the default for new profiles.

- Every user role, including customers, technicians, and administrators, can choose a preferred language in application settings.
- Store the signed-in user's preference in `profiles.locale`; do not make the setting global to every account on the device.
- When no account is signed in, save the preference locally until account settings are available.
- Localize application-owned labels, validation, empty and error messages, dates, and number/currency formatting.
- Display technician-authored descriptions, portfolio titles, and review text in the language they were written. Do not silently machine-translate user-generated content.
- Keep translations in a shared localization module. Do not scatter translated strings across screens.
- Adding a language must not change authorization, data access, or role behavior.

## 13. Engineering Priorities

The following priorities apply throughout development.

### Security

- Apply least-privilege access.
- Enforce permissions in trusted backend code and database policies.
- Protect private profile information, addresses, conversations, reports, and administrative records.
- Validate all untrusted inputs.
- Keep service-role credentials and other server secrets out of the client.
- Protect against unauthorized access, role escalation, injection, spam, and abuse.
- Review security implications before marking a feature complete.

### Performance

- Keep the interface responsive.
- Optimize database queries and network requests.
- Avoid unnecessary rendering and expensive operations on the UI thread.
- Handle loading, error, empty, and offline states appropriately.
- Measure performance rather than assuming an implementation is fast.

### Maintainability

- Use clear module boundaries and separation of concerns.
- Follow TypeScript's type system and avoid unnecessary use of `any`.
- Keep components and functions focused.
- Reuse shared logic without creating excessive abstraction.
- Add meaningful comments for complex logic, security decisions, and non-obvious trade-offs.
- Avoid duplicated business rules and hard-coded configuration.

## 14. Mandatory Testing Policy

Every feature must include appropriate automated tests.

### Before implementation

1. Read the relevant feature specification.
2. Inspect the existing architecture and related code.
3. Identify expected behavior, edge cases, and security risks.
4. Establish acceptance criteria and a test plan.

### During implementation

Write tests alongside the feature. Do not defer all testing until the project is complete.

### Before marking a feature complete

1. Run unit tests for the affected logic.
2. Run integration tests for relevant database, backend, and service interactions.
3. Create and run end-to-end tests for the user journeys introduced or changed by the feature.
4. Run relevant security tests.
5. Run the relevant regression suite.
6. Run applicable TypeScript checks, linting, and build checks.
7. Fix failures and rerun the affected tests.
8. Record the actual results in project documentation.

Run unit and integration tests frequently during development. Run appropriate end-to-end tests during feature development and before declaring the feature complete.

Never claim that tests passed unless they were actually executed. If a test cannot run, report why and mark verification as incomplete.

A feature must not be marked fully complete merely because its code has been written.

## 15. Development Workflow

Cepat must be developed one feature at a time.

The project uses a `prompts/` directory to preserve product decisions, technical architecture, agent rules, project status, and individual feature specifications.

At the beginning of each work session, the coding agent must:

1. Read this introduction.
2. Read `agent-rules.md` and `project-status.md` when those files exist.
3. Read the relevant feature specification and its dependencies.
4. Inspect the current implementation before making changes.

For each feature:

1. Confirm the scope and acceptance criteria.
2. Implement only the agreed feature and necessary dependencies.
3. Write and run the required tests.
4. Verify integration with existing functionality.
5. Update documentation and project status.
6. Report changed files, test results, limitations, and outstanding issues.

Do not mark unimplemented, untested, or partially verified functionality as complete.

Do not silently change agreed product decisions or introduce major features without discussion.

## 16. Initial Scope and Deferred Work

Focus first on the secure foundation and core marketplace experience.

Initial development areas:

- Project configuration and testing infrastructure.
- Authentication and roles.
- Technician applications and approval.
- Marketplace and search.
- Technician profiles and portfolios.
- Service areas and availability.
- Booking lifecycle.
- Booking-specific messaging.
- Reviews, reporting, and administration.

Defer live payments, wallet functionality, and advanced reporting workflows until the necessary requirements and approvals are ready.

Do not build every future feature in the first release.

## 17. Product Principles

Every implementation decision should support these principles:

1. Security before convenience when the two conflict.
2. Performance without sacrificing correctness.
3. Clear, maintainable code over unnecessary complexity.
4. Privacy and appropriate access control.
5. Reliable booking and messaging behavior.
6. Automated testing and honest verification.
7. A professional, accessible, consistent user experience.
8. Incremental development with documented decisions.

## 18. Current Project Status

This document defines the product direction and engineering expectations. It does not claim that any feature has been implemented.

The actual project setup, installed packages, completed features, test results, and remaining work must be recorded in `project-status.md` as development proceeds.

**Final instruction:** Treat this document as the shared product context. Follow the feature-specific specifications for implementation details, follow `agent-rules.md` for working procedures, and update project status only after verifying the actual state of the codebase.
