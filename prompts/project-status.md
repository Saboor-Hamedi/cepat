# Cepat — Project Status

Last checked: 2026-10-31

## Current setup

- Expo SDK 58, React Native 0.88.1, React 19.3, TypeScript 6.
- Expo Router is configured with routes under `src/app/`.
- Supabase JS is installed and a client is created only when both public configuration values are valid.
- `schema.sql` is the current baseline schema. Versioned Supabase migrations live in `supabase/migrations/`.
- `schema.sql` is a fresh-database bootstrap only. Enum creation is guarded against duplicate types, but tables/policies are not rerunnable. Do not paste it into an existing project.
- Jest, `jest-expo`, React Native Testing Library, and Expo ESLint configuration are installed.
- All source and test files are strictly organized to remain under the 1,000-line file limit.

## Feature status

| Feature | Status | Notes |
| --- | --- | --- |
| Marketplace and technician profile (`01-marketplace-and-technician-profile.md`) | `implemented_unverified` | Marketplace homepage, interactive map & location search (`16+` Indonesian cities/regencies and `80+` districts/neighborhoods), category discovery, and privacy-safe technician profiles are implemented. Unit, component, and Router integration tests, typecheck, and lint pass. Native E2E and live database verification remain incomplete. |
| Authentication and role management (`02-authentication-and-registration.md`) | `in_progress` | Login, registration, password recovery, session restore, sign-out, and technician application status synchronization (`src/auth/technicianApplication.ts` + `20261030010000_ensure_technician_application_sync.sql`) are implemented. Live remote Supabase migration execution and device verification are pending. |
| UI Overhaul, Modular Settings, Dashboards & Booking (`03-ui-overhaul-and-product-alignment.md` & `quick.md`) | `implemented_unverified` | Modular Settings (`src/setting/*`), customer bookings hub (`src/app/bookings.tsx`), technician workspace (`src/app/technician-dashboard.tsx`), booking lifecycle & link-blocked chat (`src/app/booking/[id].tsx`, `src/components/BookingLifecyclePanel.tsx`), unified Twitter/X-style profiles, inline post composer (`src/components/posts/*`), and Android/Xiaomi safe-area bottom insets are implemented and tested with Jest. Live Supabase and physical device E2E runs remain pending. |
| Real-time external map tiles, live geocoding API & payments | `not_started` | Map pin & area search uses Cepat's built-in Indonesian region coordinate index; external street tiles/geocoding APIs and payment processing are not configured. |

## Phase 1–3 & `quick.md` implementation summary

1. **Header Profile Avatar & Tab Label (`src/components/marketplace-ui.tsx`, `src/components/AppNavigationBar.tsx`)**:
   - Fixed the marketplace header profile avatar so it is 100% circular (`borderRadius: size / 2` with `overflow: 'hidden'` on both container and image, eliminating distorted scaling).
   - Added a visible "Profile" text label underneath the avatar matching all other tabs in `AppNavigationBar`.

2. **Unified Twitter / X-Style Profile & Post Creation (`src/app/technician/[id].tsx`, `src/components/posts/*`, `src/types/post.ts`, `src/data/postRepository.ts`, `supabase/migrations/20261031000000_technician_posts.sql`)**:
   - Unified technician and customer profile screens into a single sleek Twitter/X layout (`src/app/technician/[id].tsx`).
   - Technicians can post directly on their profile using the inline Twitter-style composer (`TechnicianPostComposer`) with circular avatar, auto-expanding text input, image attach button (up to 4 photos), pre-upload preview strip with `×` remove buttons (`TechnicianPostImagePreview`), link blocking check, character counter, and pill-shaped Post button.
   - Customers have the identical profile layout but cannot post.
   - Posts feed displays responsive image grids and owner actions (edit caption, delete with confirmation modal).
   - Sidebar "View Profile" button now navigates directly to `/technician/${user.id}` (or demo profile) instead of routing to the workspace or account settings.

3. **Workspace Header Cleanup (`src/app/technician-dashboard.tsx`)**:
   - Removed the technician name banner card from the top of the workspace dashboard.
   - The workspace tabs now sit directly at the very top of the screen.

4. **Standalone ProfileAvatar & Avatar Action Menu (`src/profile/ProfileAvatar.tsx`, `src/profile/index.ts`)**:
   - Extracted reusable `ProfileAvatar` component with `editable={true|false}`.
   - Tapping an editable avatar opens a sleek Twitter/X-style bottom sheet popup with "Take Photo" and "Choose from Gallery" options.

5. **Settings Cleanup & Polishing (`src/setting/*`)**:
   - **Account Tab**: Single multiline address textarea replaces the separate label/street fields and helper buttons. Email and phone number inputs were relocated to Security. Logout button removed from this tab.
   - **Security Tab**: Displays protected email and phone contact details with a "Save Contact Details" button.
   - **Password Tab**: Clean form with Current Password, New Password, Confirm Password, and show/hide password toggle (verification email OTP and timer removed).
   - **Language Tab**: Language selector cleaned up (removed `🌐 ID / EN` badge) with radio selection cards.
   - **Appearance Tab**: Clean 3-theme selector (Light, Dark, System).
   - **Feedback Banner**: Removed `"Preferences updated."` / `prefsFeedback` banner.

6. **Booking Time Slots Cleanup (`src/setting/account/SettingAccount.tsx`, `src/app/bookings.tsx`)**:
   - Removed `@Morning (8-12)` and all mock booking time slot chips/code.
   - Cleaned up `src/app/bookings.tsx` by removing mock bookings and the "Booking & Message" header text block so tabs sit directly at the top.

7. **1,000-Line File Limit**:
   - Every file in `src/` and `__tests__/` is strictly under 1,000 lines (largest file: `src/app/admin.tsx` at 959 lines; `src/app/technician/[id].tsx` at 980 lines).

### Commands actually run

- `npm test` (`jest --runInBand`) — 7 test suites (`__tests__/marketplace.routes.test.tsx`, `__tests__/marketplace.components.test.tsx`, `__tests__/auth.flows.test.tsx`, `__tests__/posts.composer.test.tsx`, `__tests__/profile.avatar.test.tsx`, `__tests__/marketplace.logic.test.ts`, `__tests__/posts.repository.test.ts`): all 69 tests pass.
- `npx tsc --noEmit` — passed with 0 errors.
- `npx eslint .` — passed with 0 errors.
- Line-count verification script — confirmed all files in `src/` and `__tests__/` are under 1,000 lines.

## Remaining work

1. Apply `supabase/migrations/20261029000000_marketplace_public_read.sql`, `supabase/migrations/20261030000000_secure_technician_application_status.sql`, and `supabase/migrations/20261030010000_ensure_technician_application_sync.sql` to the remote Supabase project and verify live RLS behavior.
2. Add the Expo redirect URL in Supabase Auth and test signup confirmation, login, technician application creation, recovery, and logout with non-production test accounts.
3. Configure a public/signed Storage access strategy before treating non-URL storage paths for avatars and portfolio photos as supported.
4. Run Maestro E2E flows (`maestro/marketplace-profile-booking.yaml`, `maestro/auth-validation.yaml`) on an Android device/emulator once ADB/Maestro are available.
5. Configure an external map tile/geocoding provider if street-level map tiles are desired beyond the built-in Indonesian region coordinate index.
