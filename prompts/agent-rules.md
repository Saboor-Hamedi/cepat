# Cepat — Agent Rules and Engineering Standards

## 1. Purpose

These rules govern all AI agents and developers working on Cepat.

The goal is to build a secure, high-performance, maintainable, production-quality home-services marketplace for Indonesia.

These rules are mandatory for every feature, bug fix, refactor, dependency update, and subsequent modification.

Read `introduction.md`, `project-status.md`, and the relevant feature specification before beginning work. If a required document does not exist yet, do not invent its contents; identify the missing document and proceed only when the task can be performed safely.

---

## 2. Fundamental Rules

1. Security is a priority from the beginning.
2. Performance must be measured and optimized without sacrificing correctness.
3. Every feature must have automated tests.
4. Unit, integration, and end-to-end (E2E) tests must be developed alongside the feature.
5. Every change must be retested after implementation.
6. Never claim that a test passed unless it was actually executed and passed.
7. Never mark an incomplete or unverified feature as complete.
8. Implement one clearly defined feature at a time.
9. Preserve existing working functionality.
10. Do not introduce unnecessary complexity, dependencies, or abstractions.
11. Do not silently change agreed product requirements or architecture.
12. Document meaningful decisions, implementation status, and known limitations.

## 3. Required Workflow

### Phase A — Understand

Before writing code:

1. Read `prompts/introduction.md`.
2. Read `prompts/agent-rules.md`.
3. Read `prompts/project-status.md`.
4. Read the relevant feature specification and any referenced dependencies.
5. Inspect the existing source code, configuration, database schema, and tests.
6. Identify existing patterns and reuse them where appropriate.
7. Identify security implications, performance risks, edge cases, and dependencies.
8. Define the acceptance criteria and test plan.

Do not assume that documentation accurately describes the current implementation. Inspect the code and verify its actual state.

### Phase B — Plan

Prepare a concise implementation plan containing:

- Feature scope.
- Files and modules expected to change.
- Database or API changes, if necessary.
- Security and authorization requirements.
- Unit, integration, and E2E test scenarios.
- Risks and compatibility considerations.

Keep the work within the agreed scope. Ask for clarification if an unresolved decision materially affects security, architecture, financial behavior, or user-facing functionality.

### Phase C — Implement

1. Follow the existing architecture and coding conventions.
2. Keep changes focused on the requested feature.
3. Write automated tests alongside the implementation.
4. Validate untrusted input at appropriate trust boundaries.
5. Enforce permissions in trusted backend code and database policies.
6. Handle errors explicitly and safely.
7. Implement loading, empty, offline, and failure states where relevant.
8. Avoid unnecessary network requests, rendering, database queries, and expensive UI-thread operations.
9. Add meaningful comments for complex algorithms, security-sensitive behavior, and non-obvious decisions.
10. Never modify tests merely to hide a real implementation failure.

### Phase D — Test

After implementing or modifying a feature, run the applicable tests.

At minimum, the agent must:

1. Run unit tests for the affected logic.
2. Run integration tests for relevant service, database, API, and authorization behavior.
3. Create and run E2E tests covering the feature's important user journeys.
4. Run relevant security and regression tests.
5. Run TypeScript checks, linting, and applicable build checks.

If a test fails:

- Investigate the root cause.
- Fix the implementation or correct a genuinely incorrect test.
- Rerun the failed test.
- Rerun affected regression tests.
- Report any remaining failures honestly.

Do not skip tests simply because the change appears small.

If infrastructure or missing credentials prevent a test from running, document the reason and mark that verification as incomplete.

### Phase E — Verify and Document

Before reporting completion:

1. Review the final changes.
2. Confirm that acceptance criteria are satisfied.
3. Confirm that tests actually ran and record their results.
4. Check for unintended changes and regressions.
5. Update the relevant feature specification and project status.
6. Record known limitations, deferred work, and unresolved risks.
7. Report the files changed and the commands executed.

Only mark a feature `completed` when its acceptance criteria and required verification have passed.

If implementation is finished but verification is incomplete, use `implemented_unverified`. If some requirements remain unfinished, use `in_progress` or `blocked`, as appropriate.

---

## 4. Testing Standards

Testing is part of feature implementation, not a separate final project phase.

### 4.1 Unit Tests

Test individual functions, hooks, components, validators, and business rules in isolation where practical.

Include:

- Normal successful behavior.
- Invalid inputs.
- Empty or missing values.
- Boundary conditions.
- Expected error handling.
- Permission and role-related rules where applicable.

Keep tests deterministic. Avoid unnecessary dependence on external services.

### 4.2 Integration Tests

Test interactions between components and services.

Examples include:

- Supabase queries and database constraints.
- Authentication and session handling.
- Row Level Security policies.
- Booking status transitions.
- Chat authorization and message persistence.
- Technician approval workflows.
- Commission configuration and calculation rules.

Use a dedicated test environment and test accounts. Never run destructive tests against production data.

### 4.3 End-to-End Tests

Create E2E tests for meaningful user journeys introduced or changed by a feature.

Examples include:

- Registration and sign-in.
- Browsing technicians and viewing profiles.
- Submitting and accepting a booking.
- Proposing and accepting an alternative time.
- Sending messages within an accepted booking.
- Blocking unauthorized messages and links.
- Cancelling a booking.
- Completing a job and submitting a review.
- Submitting a report and reviewing it through authorized administrative access.

Tests must verify outcomes, not merely that a screen opens.

Use a suitable mobile E2E framework, such as Maestro, and keep test setup reproducible.

### 4.4 Regression Tests

After a change, rerun the relevant existing tests to ensure previously working behavior still works.

Run the broader regression suite before merging a feature or declaring it complete.

### 4.5 Test Independence

Tests must not depend on execution order or reuse mutable production data.

Use isolated test data, predictable setup, and reliable cleanup. Avoid flaky tests, arbitrary sleep delays, and unnecessary network dependencies.

### 4.6 Test Reporting

Report:

- Tests executed.
- Commands used.
- Passed and failed test counts, when available.
- Tests skipped and why.
- Build, lint, and type-check results.
- Remaining risks and incomplete verification.

Do not invent test counts, logs, coverage percentages, or successful results.

---

## 5. Security Requirements

Security must be considered for every feature that handles user data, identity, bookings, messaging, reports, or administrative functionality.

### 5.1 Authentication and Authorization

- Use Supabase Auth or another explicitly approved authentication mechanism.
- Enforce authorization in trusted backend logic and database policies.
- Use Supabase Row Level Security (RLS) on tables exposed to clients.
- Deny access by default where practical.
- Grant users only the permissions necessary for their role.
- Never trust client-submitted role, ownership, price, commission, or booking-status values without server-side validation.
- Never allow users to grant themselves technician approval or administrator privileges.
- Protect administrative operations with explicit authorization.
- Test cross-user and cross-role access.

Hiding a button or screen is not authorization.

### 5.2 Secrets and Configuration

- Keep server secrets out of source control and client bundles.
- Never expose Supabase service-role credentials through `EXPO_PUBLIC_` variables.
- Use environment variables and appropriate secret management.
- Maintain a safe `.env.example` containing placeholder values only.
- Validate required configuration at startup.
- Never commit API secrets, passwords, tokens, private keys, or real customer data.

### 5.3 Input Validation

Validate untrusted data at appropriate boundaries, including:

- User registration and profile updates.
- Service descriptions and search inputs.
- Booking requests and status changes.
- Messages and uploaded files.
- Reviews and reports.
- Administrative configuration.

Use appropriate length limits, type validation, allowlists, and domain-specific rules. Prevent injection, malformed input, oversized payloads, and invalid state transitions.

### 5.4 Privacy

- Collect only data necessary for the feature.
- Keep customer addresses and private contact details restricted.
- Limit access to conversations, evidence, and administrative records.
- Avoid logging passwords, access tokens, message contents, and sensitive personal information.
- Define appropriate retention and deletion behavior.
- Do not collect device identifiers or location history without a justified need, appropriate disclosure, and suitable safeguards.

### 5.5 Database and API Safety

- Use parameterized queries and safe database access patterns.
- Validate ownership and authorization on every sensitive operation.
- Use database constraints and transactions where appropriate.
- Protect against duplicate submissions and race conditions.
- Use idempotency for operations that must not execute twice.
- Apply rate limits or abuse controls to sensitive endpoints where appropriate.
- Treat client data and external service responses as untrusted.

### 5.6 File Uploads

For portfolio images, chat attachments, and report evidence:

- Restrict permitted file types and sizes.
- Validate files on the trusted side.
- Use appropriate private storage and access policies.
- Avoid trusting file extensions alone.
- Generate safe storage paths and avoid exposing private files publicly.
- Test that unauthorized users cannot retrieve protected attachments.

---

## 6. Real-Time Messaging Rules

Cepat's messaging system must be secure, reliable, and associated with accepted bookings.

- Only authorized booking participants may access the conversation.
- The backend must validate the booking and its current status.
- Enforce message permissions and closure rules on the server.
- Handle reconnections, duplicate events, and delivery failures.
- Do not assume a client event has been persisted merely because it was displayed.
- Avoid blocking the UI while waiting for network operations.
- Restrict message and attachment sizes.
- Avoid exposing sensitive message contents in push notification previews by default.
- Prevent unauthorized subscriptions to other users' channels or conversations.

### Link and Contact-Sharing Controls

The initial policy is to reject messages containing URLs.

- Enforce link detection on the server, not only in the UI.
- Normalize and inspect inputs to reduce simple obfuscation bypasses.
- Prevent rejected content from being persisted or broadcast.
- Return a clear, safe error to the sender.
- Test common URL forms and bypass attempts.
- Do not render message content as executable HTML.
- Never rely on client-side non-clickable styling as the only protection.

Contact-sharing and circumvention detection should be implemented as a separate, testable policy layer. Account for false positives and avoid automatic severe punishment based solely on an uncertain detection result.

---

## 7. Booking and Business Logic

- Treat the backend as the source of truth for booking status.
- Define allowed status transitions explicitly.
- Verify the actor's permission for every transition.
- Prevent duplicate acceptance, conflicting rescheduling, and invalid completion.
- Record cancellations and relevant status changes.
- Ensure chat access follows booking authorization and lifecycle rules.
- Allow only eligible completed bookings to receive reviews.
- Prevent unauthorized modification or deletion of other users' reviews.
- Validate technician availability and service-area eligibility where applicable.

Business rules must not be duplicated inconsistently across UI components, API handlers, and database functions.

## 8. Future Financial Functionality

Live payments and wallet functionality are out of scope until explicitly approved.

Until then:

- Do not process real payments.
- Do not represent test transactions as real transactions.
- Keep booking state independent of payment-provider state.
- Do not hard-code a final commission percentage.
- Keep commission configuration restricted to authorized administrators.
- Record financial policy changes in an auditable way.
- Do not introduce a wallet or stored-value system without explicit approval and appropriate legal and provider review.

When payments are approved, define a separate feature specification, security review, and financial test plan before implementation.

---

## 9. Performance Standards

Performance must be considered during implementation and verified when relevant.

- Avoid unnecessary React re-renders.
- Use efficient list rendering for large collections.
- Paginate marketplace results and message history where appropriate.
- Avoid unbounded database queries.
- Add indexes based on actual query patterns.
- Avoid serial network requests when safe parallel execution is possible.
- Handle loading, caching, and retries deliberately.
- Keep expensive computation off the UI thread when practical.
- Avoid memory leaks and unbounded subscriptions.
- Clean up listeners and subscriptions when their owning screen or component is disposed.
- Measure performance before making optimization claims.

Do not introduce complicated caching, background workers, or abstractions without a demonstrated need.

---

## 10. TypeScript and Code Quality

- Prefer strict TypeScript typing.
- Avoid `any` unless justified and documented.
- Avoid unsafe type assertions and non-null assertions without a clear reason.
- Separate presentation, business logic, data access, and authorization concerns.
- Use consistent naming conventions.
- Keep functions and components focused.
- Prefer simple, maintainable solutions.
- Reuse existing utilities and components when appropriate.
- Avoid duplicate business logic.
- Remove unused imports, dead code, and temporary debugging statements.
- Handle errors explicitly rather than silently swallowing them.
- Do not add comments that merely repeat obvious code.
- Do not refactor unrelated modules without a clear reason and appropriate tests.

Do not suppress TypeScript, ESLint, or test failures merely to achieve a green build.

---

## 11. Dependency Management

Before adding or updating a package:

1. Determine whether the functionality is already available.
2. Check compatibility with the installed Expo SDK and React Native version.
3. Prefer maintained packages with a clear purpose.
4. Follow Expo-compatible installation instructions where applicable.
5. Avoid unnecessary native dependencies.
6. Run relevant tests and build checks after changes.
7. Record important architectural dependency decisions.

Do not upgrade the entire dependency tree during an unrelated feature implementation.

Do not force incompatible package versions merely to bypass installation errors.

---

## 12. UI and Accessibility

- Maintain consistent design tokens, typography, spacing, and component behavior.
- Support loading, empty, error, and success states.
- Keep interactions responsive during network operations.
- Provide clear validation messages.
- Support keyboard navigation and screen-reader labels where applicable.
- Respect safe areas and different screen sizes.
- Avoid arbitrary HTML or JavaScript execution in user-customizable content.
- Ensure that role-specific screens do not expose protected functionality to unauthorized users.

Technician profile customization must remain controlled and secure.

---

## 13. Database and Migration Rules

- Use version-controlled database migrations.
- Do not make undocumented manual production schema changes.
- Include necessary constraints, indexes, and RLS policies.
- Test migrations against a disposable or dedicated test database.
- Preserve existing data unless a destructive change is explicitly approved.
- Plan schema changes so existing application versions are not unexpectedly broken.
- Never use production credentials for destructive automated tests.
- Update relevant documentation when tables, policies, or relationships change.

Database schema and authorization policies are part of the feature, not optional supporting work.

---

## 14. Error Handling and Observability

- Show users clear, non-sensitive error messages.
- Preserve actionable diagnostic details in appropriate development or server logs.
- Never expose internal stack traces, secrets, or private database information to users.
- Handle offline conditions, timeouts, expired sessions, and failed requests.
- Add monitoring or structured logging where justified.
- Avoid logging entire conversations or sensitive personal information.
- Make failures distinguishable from successful operations.

A failed request must not be silently presented as a successful booking, message, upload, or review.

---

## 15. Documentation and Project Status

Keep documentation aligned with the actual codebase.

Use the following status definitions:

- `not_started`: No implementation has begun.
- `in_progress`: Work is ongoing or acceptance criteria remain incomplete.
- `implemented_unverified`: Code exists, but required verification is incomplete.
- `blocked`: Work cannot proceed because of an unresolved dependency or issue.
- `completed`: Acceptance criteria and required tests have passed.

After a feature changes:

- Update its specification when behavior or implementation details change.
- Update `project-status.md`.
- Record completed work and verification results.
- Record known limitations and deferred requirements.
- Reference related feature documents where useful.

Never mark a feature completed based solely on code generation, a successful compilation, or a partial test run.

---

## 16. Git and Change Management

- Inspect the current Git status before making changes.
- Do not overwrite unrelated user modifications.
- Do not discard, reset, or rewrite user work without explicit authorization.
- Keep changes focused and reviewable.
- Do not commit secrets or generated private data.
- Run relevant tests before proposing a commit.
- Do not claim that changes were committed or pushed unless the operation actually succeeded.

If a task reveals a necessary change outside its original scope, explain the dependency and keep unrelated work separate where practical.

---

## 17. Completion Report

At the end of each feature, provide a concise report with:

### Implementation

- What was implemented.
- Important files changed.
- Database migrations or configuration changes.

### Verification

- Unit test results.
- Integration test results.
- E2E test results.
- Security and regression test results, where applicable.
- TypeScript, lint, and build results.

### Outstanding Work

- Tests that could not run and why.
- Known defects or limitations.
- Security concerns that remain unresolved.
- Deferred work and dependencies.

Use exact results from the tools and commands actually executed.

If a required test fails or cannot run, clearly state that the feature is not fully verified.

---

## 18. Prohibited Practices

The agent must never:

- Claim unexecuted tests passed.
- Mark unverified features completed.
- Bypass backend authorization because the UI hides a control.
- Expose service-role credentials or private secrets.
- Allow users to assign themselves privileged roles.
- Disable security checks to make a feature work.
- Ignore failed tests or hide relevant errors.
- Modify unrelated functionality without justification.
- Introduce live financial transactions without approval.
- Trust client-submitted ownership, price, commission, or booking status.
- Treat uncertain circumvention detection as conclusive proof of misconduct.
- Perform destructive operations against production data without explicit authorization.
- Fabricate implementation status, test coverage, or performance measurements.

## 19. Final Principle

**Implement carefully. Test continuously. Verify honestly. Protect user data. Preserve working functionality. Document the real state of the project.**

These rules apply to every feature and every subsequent update to Cepat.
