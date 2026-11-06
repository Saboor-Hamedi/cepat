# Cepat — Authentication, Registration, and Login

## Objective

Implement complete, functional registration and login for Cepat using the existing React Native, Expo, TypeScript, and Supabase project.

The current UI is basic. Inspect the existing implementation and improve it into a polished, consistent authentication experience without rebuilding unrelated screens.

Read:

- `prompts/introduction.md`
- `prompts/agent-rules.md`
- `prompts/project-status.md`
- `prompts/features/01-marketplace-and-technician-profile.md`, if present

Inspect the actual codebase, installed packages, routing system, Supabase configuration, database schema, and RLS policies before changing anything.

## 1. Registration Screen

Create one registration screen for both customer and technician accounts.

Required fields:

- Display name.
- Email address.
- Password.
- Confirm password.
- Role selector: Customer or Technician.
- Acceptance of the platform's terms and privacy policy.

Requirements:

- Validate required fields and email format.
- Enforce an appropriate password policy.
- Confirm that passwords match.
- Provide clear field-level validation messages.
- Include a show/hide password control.
- Prevent duplicate submissions.
- Display loading, success, and error states.
- Use accessible labels and keyboard-friendly layouts.
- Do not log or expose passwords.

Use the existing design system and create a professional, mobile-friendly UI.

## 2. Customer Registration

When the user selects Customer:

1. Create the account through Supabase Auth.
2. Handle email confirmation if enabled in Supabase.
3. Rely on the existing trusted database trigger to create the basic profile, private profile, customer role, and account status.
4. Do not create duplicate profile or role records from the client.
5. Navigate according to the actual authentication and email-verification state.

Do not assume the user has a valid session until Supabase confirms it.

## 3. Technician Registration

When the user selects Technician:

1. Create the account through the same Supabase Auth system.
2. Follow the same email-verification and session rules.
3. Start the technician application workflow.
4. Create or initialize the technician application using the existing schema and a secure implementation.
5. Show the application status and explain that administrator approval is required.

**Critical security rule:** Selecting Technician must never grant the `technician` role directly from the mobile client.

Only trusted backend or administrator logic may approve the application and grant the technician role. Verify the database policies support this rule.

If the current RLS policies or schema do not safely support application creation, propose and implement the smallest appropriate secure correction. Document the migration.

## 4. Login Screen

Implement email-and-password login using Supabase Auth.

Include:

- Email and password fields.
- Show/hide password control.
- Input validation.
- Loading state.
- Clear error messages.
- A link to registration.
- A password recovery entry point.

Do not reveal whether a particular email address belongs to an existing account. Use safe, appropriate error messaging.

Implement password recovery using Supabase's supported recovery flow. Do not simulate a successful password reset.

## 5. Session Persistence and Logout

Implement reliable authentication state handling.

Requirements:

- Restore an existing session when the application starts.
- Show an appropriate loading screen while session state is resolved.
- Avoid flashing protected screens before authentication is checked.
- Handle expired sessions and sign-out correctly.
- Subscribe to authentication state changes and clean up subscriptions.
- Provide a working sign-out action where appropriate.
- Prevent multiple competing authentication listeners.

Use the Supabase client and session storage approach appropriate for the installed Expo and React Native versions. Do not assume browser local storage exists in React Native.

## 6. Role-Based Navigation

Keep the marketplace available as the shared discovery experience.

After authentication:

- Customers can access customer functionality.
- Approved technicians can access technician functionality.
- Pending technician applicants see their application status and permitted account features.
- Suspended or disabled accounts must not access restricted operations.
- Administrators require explicit, trusted authorization.

Navigation visibility is not security enforcement. Backend authorization and RLS must enforce permissions independently.

Do not build complete dashboards in this task if they do not already exist. Provide clear navigation placeholders where necessary and document what remains.

## 7. Supabase and Security

Use the existing environment variables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Never expose `sb_secret_` keys or service-role credentials in the mobile application.

Inspect the actual Supabase schema and policies before implementing queries.

Requirements:

- Rely on Supabase Auth for authentication.
- Keep role assignment under trusted backend control.
- Do not trust role values supplied by registration metadata.
- Do not allow users to update their own roles or account status.
- Validate application ownership and status transitions.
- Respect RLS.
- Handle network failures, expired sessions, and email verification.
- Do not expose authentication tokens or sensitive personal information in logs.

If a security issue is discovered, document it and address it before relying on the affected operation.

## 8. UI Quality

Create a consistent authentication experience with:

- Clear headings and concise supporting text.
- Consistent spacing, typography, and buttons.
- Appropriate password and email input behavior.
- Loading indicators and disabled submit buttons during requests.
- Accessible controls and readable validation messages.
- Responsive layouts on supported mobile screen sizes.

Avoid unnecessary animations, excessive gradients, and decorative elements that reduce usability.

## 9. Automated Testing

Create and execute tests as part of implementation.

### Unit tests

- Email and required-field validation.
- Password confirmation.
- Role-selection behavior.
- Submit-button loading and disabled states.
- Error-message handling.
- Authentication state routing.

### Integration tests

- Supabase registration and login behavior.
- Email-verification handling.
- Session restoration and sign-out.
- Technician application creation.
- Role and account-status authorization.
- Password recovery initiation.
- Relevant RLS policies.

Use a dedicated test environment and test accounts. Never run destructive tests against production users.

### End-to-end tests

Test these journeys:

1. Customer registers.
2. Technician registers and sees a pending application state.
3. Invalid registration is rejected.
4. Password mismatch is handled correctly.
5. A user logs in.
6. An existing session is restored after restarting the app.
7. A user signs out.
8. Password recovery can be initiated.
9. An unapproved technician cannot access approved-technician functionality.

Run unit, integration, and E2E tests, plus TypeScript checks, linting, and applicable build checks.

Do not claim a test passed unless it actually ran and passed. Report blocked or unavailable tests honestly.

## 10. Scope Boundaries

Implement authentication, registration, password recovery, session handling, and the minimum navigation needed to connect them to the existing application.

Do not implement payments, wallet functionality, complete dashboards, booking workflows, or chat in this task.

Preserve the existing marketplace and technician profile UI.

## 11. Acceptance Criteria

The feature is complete only when:

- Registration and login use real Supabase Auth.
- Both customer and technician registration are supported.
- Technician selection does not grant technician privileges.
- Session persistence works.
- Logout works.
- Password recovery is connected to the actual Supabase flow.
- Authentication errors are handled safely.
- Navigation reflects authentication and authorization state.
- RLS and role assignment have been verified.
- Required unit, integration, and E2E tests pass.
- TypeScript, lint, and applicable build checks pass.
- Project documentation reflects the actual implementation and test results.

## 12. Completion Report

Report:

- Files created and modified.
- Authentication flow implemented.
- Supabase configuration changes.
- Database or RLS issues discovered and corrected.
- Unit, integration, and E2E test results.
- TypeScript, lint, and build results.
- Remaining limitations.

Do not mark the feature completed if required security checks or tests remain unverified.

**Final instruction:** Inspect first, preserve the existing UI, implement securely, test continuously, and report only verified results.

## 13. Implementation Note — November 2026

The authentication and registration flows were **not modified** during the recent UI-overhaul sessions; this file remains the authoritative spec for them. Verified state:

- Registration, login, password recovery, session restore, and sign-out are implemented (`src/auth/AuthProvider.tsx`, `src/app/register.tsx`, `src/app/login.tsx`, `src/app/forgot-password.tsx`, `src/app/reset-password.tsx`).
- Technician approval gating via `technician_applications` sync (`src/auth/technicianApplication.ts` + `supabase/migrations/20261030010000_ensure_technician_application_sync.sql`).
- New settings entries added in the 2026-11 round that touch (but do not weaken) auth/session behavior:
  - **Profile Ring** settings panel (`src/setting/profile/SettingProfileAccent.tsx`) is purely presentational and persists only `profileAccentId` in the appearance store (`@cepat/appearance-context-v1`); it does not alter sessions, roles, or profiles.
  - Settings back navigation (`BackHeader`) and protected-section gating are unchanged; account-only sections still hide for signed-out users.
- Live verification (remote Supabase migrations applied; signup/login/recovery/logout on non-production accounts) remains outstanding. Do not mark this feature `completed`.

For anything auth-adjacent the agent must consult this file, `agent-rules.md`, and `project-status.md` before editing; report only actually executed test results.
