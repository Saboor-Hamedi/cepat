# Cepat — UI Overhaul and Product Alignment

## Objective

The current application is a basic prototype and does not yet reflect the agreed Cepat product vision.

Your task is to audit and improve the existing application so that its UI and functionality align with `prompts/introduction.md` and our agreed product requirements.

This is not a request to add decorative elements or simply make existing cards prettier.

We need a properly structured, functional marketplace application.

**Do not start by adding more features. First inspect the entire existing UI, identify missing functionality, and establish a clear implementation plan.**

## 1. Marketplace Homepage

Rebuild the marketplace as the central experience.

It must include:

- Professional Cepat branding and navigation.
- Functional location selector.
- Service search.
- Visually organized service categories.
- Recommended technicians.
- Featured professionals.
- Technician ratings and review counts.
- Relevant service locations.
- Professional profile photographs.
- Clear navigation to technician profiles.
- Popular services and discovery sections.
- Loading, error, and empty states.

The location selector must not simply display a hardcoded location such as South Jakarta.

Customers must be able to select and change their service location independently of their current GPS location.

Prepare the location interface for:

- GPS location.
- Address search.
- Map-pin selection.
- Saved addresses.
- Indonesian administrative regions.

Do not claim that these capabilities work until implemented and tested.

## 2. Technician Profile

The current technician profile is too basic.

Build a professional profile experience that includes:

- Profile photograph and display name.
- Optional business name.
- Professional headline.
- Detailed description.
- Experience.
- Verification status.
- Services offered.
- Starting prices when available.
- Portfolio gallery.
- Work photographs.
- Customer reviews.
- Ratings.
- Service areas.
- Availability information.
- Prominent Book Now action.

Technicians must eventually be able to customize their profile presentation through controlled theme presets, descriptions, and portfolio content.

Do not expose private customer or technician information.

## 3. Settings — Complete Redesign

The current Settings screen only supports language selection. This is insufficient.

Create a properly organized Settings area.

### Account

- Personal information.
- Display name.
- Email.
- Phone number.
- Profile photograph.
- Password and security.
- Sign out.

### Preferences

- Application language.
- Notification preferences.
- Appearance and theme.
- Relevant accessibility preferences.

### Customer settings

- Saved addresses.
- Booking preferences.
- Account information.

### Technician settings

- Professional profile.
- Business name.
- Services.
- Portfolio.
- Service areas.
- Working days and hours.
- Availability.

### Security and privacy

- Privacy information.
- Account security.
- Account deletion request.
- Terms and conditions.

Only display settings relevant to the user's role.

Settings must perform real operations. Do not create buttons that simply look interactive.

Investigate and fix the existing language-saving failure.

## 4. Registration and Login

Implement the authentication feature according to:

`prompts/features/02-authentication-and-registration.md`

Requirements:

- Shared registration form.
- Customer or Technician role selection.
- Supabase Auth integration.
- Email verification handling.
- Login and logout.
- Password recovery.
- Persistent sessions.
- Secure role-based navigation.

Technician applications must require administrator approval.

Do not allow client-side role escalation.

## 5. Booking Experience

The current "Booking is coming soon" screen is a temporary placeholder.

Implement the actual booking experience according to our agreed product requirements.

Customers must be able to:

- Select a service.
- Provide a service address.
- Select a preferred date and time.
- Submit a booking request.
- See the booking status.

Technicians must be able to:

- Accept a request.
- Decline a request.
- Propose another time.

Once accepted, booking-specific messaging becomes available.

Do not implement real payments or wallet functionality.

## 6. Technician Dashboard

Create a proper technician workspace.

Technicians need to manage:

- Incoming booking requests.
- Upcoming bookings.
- Booking history.
- Professional profile.
- Services and pricing.
- Portfolio.
- Working hours.
- Service areas.
- Availability.
- Reviews.

Keep the dashboard separate from the customer-facing marketplace while maintaining consistent navigation and visual design.

## 7. Customer Experience

Customers need access to:

- Marketplace.
- Search and discovery.
- Saved technicians, if implemented.
- Current bookings.
- Booking history.
- Messages.
- Reviews.
- Reports.
- Account settings.

Avoid building disconnected screens. Navigation should form a coherent application.

## 8. Design Quality

The current interface is too sparse and lacks the richness of the intended marketplace.

Improve:

- Information hierarchy.
- Screen composition.
- Card layouts.
- Typography.
- Spacing.
- Image presentation.
- Navigation.
- Empty and loading states.
- Responsive behavior.
- Interaction feedback.

Use a consistent design system with controlled colors, typography, spacing, and component styles.

Avoid:

- Generic placeholder layouts.
- Excessive empty space.
- Emoji as permanent service icons.
- Unnecessary floating buttons.
- Random decorative icons.
- Inconsistent card designs.
- Buttons that do nothing.
- Screens that merely say a feature is coming soon when the feature is within the agreed implementation scope.

The UI should look like a professionally designed commercial marketplace.

## 9. Supabase Integration

Use the existing database.

Do not replace or recreate the schema without justification.

Connect the appropriate features to:

- Profiles.
- Technician profiles.
- Services.
- Service categories.
- Technician services.
- Service areas.
- Technician availability.
- Portfolio items.
- Bookings.
- Reviews.
- Notifications.

Remove hardcoded sample data from production-facing flows.

Development fixtures may remain for isolated UI testing, but they must be clearly separated from real data.

Do not display fake ratings, fake verification, or fabricated availability as real information.

## 10. Engineering and Testing

Follow `prompts/agent-rules.md`.

For every feature:

- Inspect existing code first.
- Implement the feature.
- Create unit tests.
- Create integration tests.
- Create E2E tests.
- Execute the tests.
- Fix failures.
- Run regression tests.
- Verify TypeScript, lint, and build checks.
- Update project documentation.

Do not mark a feature complete merely because its screen has been created.

## 11. Implementation Order

Work incrementally in this order:

1. Audit the existing application and document gaps.
2. Establish a consistent design system and navigation.
3. Improve the marketplace homepage.
4. Complete technician profiles.
5. Implement registration and login.
6. Build proper customer and technician settings.
7. Build customer and technician dashboards.
8. Implement the booking experience.
9. Integrate real Supabase data where appropriate.
10. Run comprehensive regression and E2E testing.

Do not attempt to implement all ten stages in one enormous change.

Complete and verify each stage before proceeding.

## 12. Important Restrictions

- Preserve existing working functionality.
- Do not recreate the project.
- Do not replace the navigation system unnecessarily.
- Do not modify unrelated database structures.
- Do not introduce payment or wallet functionality.
- Do not use hardcoded demo information as production data.
- Do not create fake interactions.
- Do not disable security policies to make screens work.
- Do not report unexecuted tests as passed.

## 13. Completion Report

Report:

- What was audited.
- What was changed.
- Screens and components implemented.
- Functional operations completed.
- Supabase integration status.
- Tests created and executed.
- Known issues and incomplete features.
- Updated project status.

**Final objective:** Transform Cepat from its current basic prototype into the actual marketplace product described in the project documentation. Prioritize a complete, coherent user experience over superficial visual changes.

## 14. Current Implementation Snapshot (November 2026)

The redesign is built. This section tells the next agent what exists and how the pieces fit together.

### Bottom navigation (`src/components/Header.tsx`, exported as `AppNavigationBar`)

- Single 56px bar with hairline top border, max width 820 centered.
- Slots: `nav-marketplace`, `nav-bookings` (left) … center elevated circular **compose FAB** (`nav-compose-fab`, 60px, elevated 30px above the bar, 4px surface-colored ring border, `/compose` route, fill = profile accent color or `palette.primary`) … `nav-notifications` (with unread badge via `loadNotifications`), `account-entry` ("Profile" label → opens `profile-sidebar-modal` sidebar).
- Active tab shows a 3px top `activeBar` tinted `colors.greenDark` (or `#4EBA97` in dark mode); labels include badge counts capped at 99+.
- Icons are view-drawn (no icon font dependency); consistent muted → green-dark active tinting.

### Marketplace home (`src/app/index.tsx`)

- Sticky, collapsing search header: `SearchFieldTrigger` (styled like the shared input) inside a `Link.AppleZoom`/`AppleZoomTarget` pair → pushes to `/search` carrying `{area, category}`; location pill button on the right opens `MarketplaceMapSearchModal` (`src/components/marketplace/MarketplaceSearch.tsx`) with pin-drop grid, region pills, saved addresses, and district index.
- `CategoryTabs` under the header; horizontal pills, active pill solid `#10B981` with dark text, inactive `#161F2E`.
- Feed: Threads-style technician posts (see `features/01` §14 for post-card anatomy; like/comment/share are UI-only icons, Book is functional).
- Thread connector line (`threadLine`) links stacked posts of the same technician in the feed.

### Post form / compose (`src/app/compose.tsx`, `src/components/posts/*`)

- Inline auto-expanding caption composer with image attach (up to 4), preview strip, character counter, pill-shaped submit.
- New posts appear in the marketplace feed and technician profile feed immediately (fixture/demo store).

### Settings (`src/setting/*`)

- Root: `BackHeader` + sections (ACCOUNT: Account/Address/Security/Password · PREFERENCES: Language/Notifications/Appearance/**Profile Ring** · ABOUT & LEGAL: Term Policy/Current Version · ACCOUNT ACTIONS: Delete Account when signed in).
- Appearance panel: Light/Dark/System theme chips + large text + reduce motion (instant apply, persisted).
- **Profile Ring** panel: 10 accent colors + None; live preview of the user's avatar with the 3px ring; persisted in appearance storage; also tints the compose FAB.

### Technician profile (`src/app/technician/[id].tsx`)

- Cover image with owner-only Camera ("Change cover photo") and **Settings** (`profile-settings-btn` → `/account`) buttons overlaid top-right.
- Avatar with optional Profile Ring; stats strip (rating · tasks · posts · area); services/portfolio/reviews/about tabs; reviews tab shows the "verified task completion" notice and full ratings breakdown.
- Owner post composer and post feed with edit/delete/suspend.

### Notifications (`src/app/notifications.tsx` + `src/data/notifications.ts`)

- Inbox with filter tabs (All/Unread/Bookings/Messages), swipe-to-delete (`SwipeableRow`). Delete is durable: local tombstone list + RLS DELETE policy (`notifications_delete_owner_admin`) added this round; deleted items no longer reappear on refresh.

### Booking lifecycle & reviews (`src/components/BookingLifecyclePanel.tsx`)

- Status machine with link/contact-blocked chat enforcement, optimistic sending with client message ids.
- "One review per booking": form hidden after submit; store enforces booking-scoped duplication natively (`review_already_submitted`); remote persistence via `bookings.review_rating`/`review_comment` (migration `20261106000100_bookings_review_fields.sql`, applied to baseline `schema.sql`).

### Search parity

- `/search` and the location-picker area search both use the shared `SearchField` (`radius 12`, `height 40`, `palette.inputBg`, custom magnifier, clear button, `font.title`). No forked styling anywhere.

### Intentional UI-only elements (do not wire blindly)

- Like / Comment / Share icons on post cards — decorative until product decision lands.
- Star rating rendering on the submitted-review box (read-only).

### Verification status (this round)

- `tsc --noEmit` ✓ · `eslint` changed files ✓ · `profile.avatar.test.tsx` 3/3 ✓.
- `marketplace.components` / `marketplace.routes`: 5 pre-existing stale failures (redesign artifacts), documented in `project-status.md`; do not relax assertions to green.
- Device and remote-Supabase verification outstanding; both new migrations must be applied before delete-tombstone semantics and remote review persistence are live.
