# Cepat — Build the Marketplace Homepage and Technician Profile UI

## 1. Objective

Implement the first two user-facing screens for Cepat, a mobile-first home-services marketplace for Indonesia:

1. **Marketplace Homepage** — the default discovery screen for customers and technicians.
2. **Technician Profile** — a detailed, customizable professional profile that customers can explore before booking.

Build real, working React Native screens with reusable components, clean architecture, responsive layouts, and automated tests. Do not create a static mockup or replace the application with a demo.

Read `prompts/introduction.md`, `prompts/agent-rules.md`, `prompts/project-status.md`, and relevant feature specifications before starting. If a required file does not exist, document that fact and continue only when it does not block the work.

## 2. Mandatory Pre-Implementation Inspection

Before modifying any code:

- Inspect the current project structure.
- Identify the installed Expo SDK, React Native version, TypeScript configuration, and package versions.
- Determine whether the project uses Expo Router or the basic `App.tsx` entry point.
- Inspect the installed styling system and existing navigation.
- Inspect the Supabase client configuration and database schema.
- Inspect existing tests, scripts, shared components, and design conventions.
- Check Git status and preserve unrelated user changes.

Do not assume that a package is installed simply because it was previously recommended.

Do not replace the routing system, reinstall the project, recreate the Supabase database, or upgrade the dependency tree without a justified need.

Produce a short implementation plan, then proceed with the two screens.

## 3. Visual Direction

Create a polished, premium, trustworthy marketplace for Indonesian home services.

Design principles:

- Clean, modern, professional visual hierarchy.
- Warm, welcoming colors with restrained accent colors.
- Consistent typography, spacing, border radii, icons, and component styling.
- Attractive technician photography and portfolio imagery.
- Clear service information, ratings, and booking actions.
- Generous spacing without wasting screen space.
- Subtle transitions and responsive interactions.
- Accessible text contrast, touch targets, and screen-reader labels.
- Proper support for small and large mobile screens.

Avoid excessive gradients, neon colors, decorative effects, unnecessary glassmorphism, oversized cards, and generic AI-generated dashboard styling.

The interface should feel like a credible commercial product, not a design experiment.

Create reusable design tokens for colors, spacing, typography, and component radii. Keep the implementation flexible enough to support a consistent light or dark theme later.

## 4. Screen One: Marketplace Homepage

The marketplace is the default destination for users entering the app.

### A. Header

Implement:

- Cepat branding.
- A location selector displaying the current selected service location.
- A profile/account entry point.
- A clean layout that adapts to screen width.

The selected service address must be independent of the device's current GPS position. Do not request location permission merely to render the homepage.

### B. Search

Create a prominent search field that supports searching for:

- Services, such as plumbing or AC repair.
- Technician names.
- Relevant service categories.

Include a clear action to remove the search query and appropriate empty-result feedback.

The UI must support connecting search to Supabase later. Do not pretend a local mock search is a live database search.

### C. Service Categories

Display a visually attractive collection of service categories, such as:

- Plumbing.
- AC repair.
- Electrical work.
- Appliance repair.
- Home maintenance.

Use reusable category components and consistent icons.

Do not hard-code the final category catalogue into application logic. Use a typed data source initially and structure the implementation so it can later load active categories from Supabase.

### D. Featured and Recommended Technicians

Build reusable technician cards showing relevant information:

- Profile photograph.
- Display name or business name.
- Main specialty.
- Rating and review count.
- Verification indicator, when verified.
- Service area or relevant distance, when available.
- Starting price, only when supplied.
- A clear action to view the profile.

Use realistic development fixtures when live data is not connected.

Never fabricate real verification badges, ratings, completed-job counts, or live availability. Clearly separate sample data from production data.

Cards must have a consistent visual hierarchy and must not overflow on smaller devices.

### E. Marketplace Sections

Include useful sections such as:

- Popular services.
- Recommended technicians.
- Highly rated professionals.
- Recently viewed technicians, if appropriate.

Avoid filling the screen with repetitive sections. Prioritize the most useful content and maintain a clear browsing flow.

### F. Search and Empty States

Implement appropriate UI for:

- Loading results.
- No matching technicians.
- No available technicians for the selected location.
- Failed requests.
- Missing profile photographs.

Use clear messages and retry actions where relevant.

### G. Navigation

Selecting a technician card must open that technician's detailed profile.

Selecting a category must provide a clear path to category-specific technician discovery. If category filtering is not implemented in this task, create the navigation boundary and explicitly document the remaining integration work.

Provide an account entry point and preserve room for future customer and technician dashboards.

Do not implement the full authentication, booking, or dashboard systems in this task.

## 5. Screen Two: Technician Profile

Create a professional profile that helps customers evaluate a technician and decide whether to book.

### A. Profile Header

Include:

- Profile photograph.
- Display name.
- Optional business or brand name.
- Main professional specialty.
- Verification status based on actual data.
- Rating and review count.
- Service location or service areas.
- Years of experience, when available.

Avoid displaying private phone numbers, private email addresses, exact technician home coordinates, or other sensitive information.

### B. Customizable Profile Appearance

Technicians should eventually be able to personalize their profiles with controlled theme options and professional presentation choices.

Implement a safe theme configuration model with a small set of supported visual presets.

Requirements:

- Use predefined design tokens.
- Validate theme values.
- Keep text readable and accessible.
- Prevent arbitrary CSS, HTML, JavaScript, or executable user content.
- Fall back safely when a theme is invalid or missing.
- Keep profile customization separate from application-wide navigation and security-sensitive UI.

Do not implement a complete theme editor unless it is necessary for the agreed profile presentation.

### C. Professional Description

Display the technician's introduction, experience, specialties, and service information.

Support longer descriptions without breaking layout.

Handle missing or incomplete profile fields gracefully. Do not invent credentials, qualifications, licenses, or experience.

### D. Services

Show the services the technician offers.

Each service can display:

- Service name.
- Description.
- Starting price, if available.
- Estimated duration, if available.

Use the current data model where possible. If the Supabase schema does not provide a field, do not silently invent one or modify the database without documenting and justifying the change.

### E. Portfolio

Create a visually appealing portfolio section showing examples of previous work.

Requirements:

- Consistent image aspect ratios.
- Graceful image-loading and failure states.
- A full-screen or expanded image viewer if appropriate.
- Clear image descriptions or captions when available.
- Reusable portfolio components.

Use clearly identified sample images for development. Do not represent sample portfolio items as verified real work.

Prepare the components to use Supabase Storage URLs when portfolio data becomes available.

### F. Reviews

Display customer reviews with:

- Star rating.
- Review text.
- Review date.
- Reviewer display name or approved public identifier.

Handle profiles with no reviews.

Only show actual review data when connected to the database. Sample reviews must remain clearly identified as development fixtures.

Do not allow the profile UI to imply that an unverified review is authentic.

### G. Booking Action

Add a prominent **Book Now** action.

For this task, the action should navigate to a clearly defined booking entry point or a lightweight placeholder screen if the booking flow does not exist yet.

Pass the selected technician's identifier through the navigation mechanism.

Do not create a real booking, charge a customer, or imply that a booking has been confirmed.

Booking submission, technician acceptance, alternative times, and messaging will be implemented in later features.

### H. Profile States

Handle:

- Loading.
- Missing or deleted technician.
- Incomplete profile.
- Empty portfolio.
- No reviews.
- Failed requests.
- Missing optional information.

Do not display private information when data is unavailable or access is unauthorized.

## 6. Reusable Component Architecture

Inspect the existing project structure and follow its conventions.

Organize the implementation by responsibility rather than putting every screen and component into one large file.

Potential components include:

- MarketplaceHeader.
- LocationSelector.
- TechnicianSearchBar.
- ServiceCategoryCard.
- TechnicianCard.
- TechnicianSection.
- TechnicianProfileHeader.
- TechnicianServiceItem.
- PortfolioGallery.
- ReviewCard.
- RatingDisplay.
- PrimaryButton.
- LoadingState.
- EmptyState.
- ErrorState.

These are suggested responsibilities, not a requirement to create one file for every trivial element.

Use TypeScript interfaces or types for technicians, services, categories, portfolio items, reviews, and theme presets.

Avoid duplicated UI logic and unnecessary abstractions.

## 7. Supabase Integration

Inspect the existing database schema before writing queries.

Use the existing Supabase client and database tables where appropriate, including:

- `profiles`
- `technician_profiles`
- `technician_services`
- `services`
- `service_categories`
- `technician_portfolio_items`
- `reviews`
- `technician_service_areas`

Respect Row Level Security and the existing authorization model.

Important rules:

- Do not use a service-role key in the mobile application.
- Do not bypass RLS to make the UI work.
- Do not query private profiles for public marketplace information.
- Do not expose technician base coordinates or private customer addresses.
- Do not fabricate database records to conceal query failures.
- Do not silently change the schema.
- Use typed data-access functions instead of scattering database queries throughout UI components.

If the schema or policies prevent a required operation, document the problem and propose a minimal, secure correction.

If live Supabase data is not yet available, use a typed repository or fixture layer so the UI can be developed and tested without pretending that sample data is production data.

## 8. Performance Requirements

- Use efficient list rendering for potentially large technician collections.
- Avoid unnecessary re-renders.
- Avoid repeated network requests caused by component rendering.
- Keep expensive operations off the UI thread when practical.
- Use appropriately sized images and stable image layouts.
- Clean up subscriptions and listeners.
- Provide pagination or incremental loading where appropriate.
- Keep loading states responsive.
- Avoid adding caching infrastructure without a demonstrated need.

Do not claim that performance has improved without measurements or reproducible verification.

## 9. Automated Testing — Mandatory

Testing is part of the implementation.

### Unit tests

Create tests for relevant components and business logic, including:

- Rating display and edge cases.
- Missing optional profile fields.
- Theme preset validation and fallback behavior.
- Search input behavior.
- Empty and loading states.
- Data mapping and formatting utilities.
- Technician card navigation parameters.

### Integration tests

Test relevant boundaries, including:

- Supabase data mapping.
- Loading and failure behavior.
- Technician profile lookup.
- Category and service data handling.
- Review and portfolio data handling.
- Authorization assumptions and RLS behavior where applicable.

Do not use production credentials or production customer data in tests.

### End-to-end tests

Create and run E2E tests for the implemented journeys:

1. Open the marketplace.
2. Browse service categories.
3. View technician cards.
4. Open a technician profile.
5. Inspect profile information, services, portfolio, and reviews.
6. Tap Book Now and verify the correct technician identifier is passed to the booking entry point.
7. Verify empty and error states where practical.

Use the E2E framework already configured in the project. If none exists, inspect the project and configure an appropriate option, such as Maestro, without unnecessarily replacing existing tooling.

If E2E tests cannot run because required infrastructure is unavailable, report the exact limitation and mark E2E verification incomplete.

### Final verification

After implementation:

- Run unit tests.
- Run relevant integration tests.
- Run E2E tests.
- Run TypeScript checks.
- Run linting.
- Run the available application build or Expo validation checks.
- Fix failures and rerun affected tests.
- Run relevant regression tests.

Never claim a test passed unless it actually ran and passed.

## 10. Scope Boundaries

Implement only:

- Marketplace homepage.
- Reusable marketplace components.
- Technician profile screen.
- Reusable profile components.
- Navigation between the two screens.
- A clearly defined booking entry point.
- Bahasa Indonesia and English interface strings, with a language preference entry in Settings that works independently of user role.
- Necessary typed models and data-access boundaries.
- Tests and documentation for this work.

Do not implement the complete booking system, live chat, payments, wallet, full authentication, administrator dashboard, or technician dashboard in this task.

Do not recreate the Supabase schema or replace the project's routing architecture without a justified reason.

## 11. Acceptance Criteria

The feature is complete only when:

- The marketplace is the application's default discovery screen.
- The homepage has polished search, categories, and technician cards.
- Selecting a technician opens the correct profile.
- The profile presents professional information, services, portfolio, and reviews.
- Supported theme presets render safely.
- Book Now navigates to the booking entry point with the correct technician identifier.
- Loading, empty, missing-data, and error states are handled.
- Users can choose either supported interface language; the preference is saved per signed-in profile or locally when unauthenticated.
- Application-owned labels and formatting switch with the selected language; user-authored profile and review content is not silently machine-translated.
- Responsive layouts work on the supported mobile screen sizes.
- Supabase access respects the existing security model.
- Unit, integration, and required E2E tests have been created and executed successfully.
- TypeScript, lint, and applicable build checks pass.
- No existing working functionality has been unintentionally broken.
- Documentation and `project-status.md` reflect the actual implementation and test results.

If any acceptance criterion is incomplete, do not mark the feature fully completed.

## 12. Completion Report

After implementation, report:

1. What was implemented.
2. The files created or modified.
3. How navigation works.
4. Whether the UI uses sample fixtures or live Supabase data.
5. Database or RLS issues discovered.
6. Unit, integration, and E2E test results.
7. TypeScript, lint, and build results.
8. Known limitations and next steps.

Do not report success based only on code generation or visual appearance.

**Final instruction:** Inspect first, implement incrementally, test continuously, preserve security, and verify every acceptance criterion before marking the feature complete.

## 13. Implementation Status (2026-10-29)

**Status: `implemented_unverified`.**

Implemented:

- Marketplace, service-category discovery, technician profiles, controlled profile theme presets, and a booking entry placeholder.
- Typed Supabase data access with clearly labeled fixtures only when Supabase configuration is absent.
- An explicit configuration error for incomplete or malformed Supabase settings.
- Pagination for technician discovery and safe loading, empty, missing-profile, and request-error states.
- Anonymous read policies for the public marketplace records required by discovery. Private profile, exact location, booking, conversation, message, report, and administrative policies remain restricted.
- A database trigger that prevents client edits to verification and aggregate rating/job fields.
- Jest unit and Router integration coverage plus a Maestro journey file.

Verification currently available:

- Unit and Router integration tests pass: 3 suites, 21 tests in the local fixture configuration.
- `npx.cmd tsc --noEmit`, `node_modules/.bin/expo.cmd lint`, and `node_modules/.bin/expo.cmd export --platform web` pass.
- The local `.env` URL and publishable-key assignments were swapped and have since been corrected. The marketplace migration has not been applied to a test database, and live RLS/data access has not been verified.
- The Maestro flow has not run because Maestro and a device/emulator are unavailable in the current environment.
- Live portfolio/avatar storage URLs are not configured; non-URL storage paths use placeholders.

See `prompts/project-status.md` for current commands, outstanding verification, and next steps. Keep this feature `implemented_unverified` until database security and native E2E verification pass.

## 14. Current Implementation Snapshot (November 2026)

The screens above are built. This section records how the feed actually works today so the next agent doesn't have to reverse-engineer it.

### Marketplace feed — Threads-style posts (`src/components/posts/Post.tsx`)

- Two-column row: left = 44px avatar (`threadAvatarBtn`) with optional connecting hairline (`threadLine`) for threading; right = content column (`threadRight`) padded 14 from the avatar.
- Header row: tappable author pressable. `authorMeta` column holds (a) name row — display name (`authorNameCompact`), verified badge (`BadgeCheck`, `palette.primary`), optional rating chip (`★ 4.9 (128)`); (b) sub row below the name — `@handle · localized service area` (`authorSub`), always its own line; handle never renders beside the name (long handles previously displaced the timestamp).
- Top-right cluster: relative timestamp (`formatPostTime`) and either a `PostDropdown` (owner/admin: Edit post, Delete post with confirmation modal, Restore/Suspend post) or a `StatusPill` (owner draft/published) when no menu is shown.
- Body: optional caption, optional single or 2×N grid media (`singleImageFrame`/`gridImageFrame`, 16:9).
- **Footer actions** (`footerRow`, hidden while editing):
  - Left: price (`formatRupiah` + `/ visit` or `/ kunjungan` when `serviceStartingPrice` is set) followed by UI-only **Like** (Heart, `post-like-btn-<id>`) and **Comment** (MessageCircle, `post-comment-btn-<id>`) icon buttons. **Neither has an `onPress` — by explicit decision.**
  - Right: **Book** icon button (CalendarCheck, `palette.primary` on `palette.primarySoft`; same 34×34 footprint as the other icon buttons; `post-book-btn-<id>`; pushes `/booking/[id]` with `{ id: post.technicianId, postId: post.id }`) — the only footer action that navigates.
  - **Share** (Share2, `post-share-btn-<id>`) — UI-only, no handler.
  - **Bookmark** (save technician) — rendered only when `onToggleSaveTechnician` is provided; reflects `savedTechnician` via `accessibilityState.selected` (filled bookmark, `palette.primary`).
- Real like/comment/share back-ends do not exist yet; see `project-status.md` §2026-11-06 and `agent-rules.md` Appendix A.

### Profile ring accent

- 10 accent colors (`emerald`…`lime`) or `none`; stored in appearance storage (`@cepat/appearance-context-v1`); rendering owned by `Avatar` (3px ring + 2px inner gap; 1px gap for ≤44px sizes; `borderWidth: PROFILE_ACCENT_RING_WIDTH`).
- Compose FAB (`nav-compose-fab` in `Header.tsx`) mirrors the accent; plus icon stays white.
- `Avatar` is memoized; accent changes re-render only the ring stroke, not the artwork.

### Search parity

- Marketplace feed trigger (`SearchFieldTrigger`) → push to `/search`.
- `/search` (`src/app/search/index.tsx` → `SearchResults.tsx`) and the location-picker area search (`MarketplaceSearch.tsx`, `area-search-input`) render the same `SearchField` (`radius 12`, `borderWidth 1`, `height 40`, `palette.inputBg`, custom view-drawn magnifier, `font.title` text, clear button). Only placeholders/labels/testIDs differ; `autoFocus` and `Link.AppleZoomTarget` are `/search`-only.
- Both top bars collapse on scroll via `Animated` interpolation (height/opacity/scale/translateY over 0–88px).

### Price & category label

- `serviceStartingPrice` via `formatRupiah(value, language)`; service chip via `categoryChipLabel` + `CORE_CATEGORY_FILTERS`.

### Known gaps / verification pending

- Likes, comments and share are UI-only (no persistence, no counts).
- Like counts/booking CTA behavior in the owner's own posts: unchanged.
- Map area search is the region-index list; street tiles/geocoding not configured.
- Remote database verification pending: `20261106000000_notifications_delete_owner.sql`, `20261106000100_bookings_review_fields.sql`.
- Maestro E2E not yet run on device.

See `agent-rules.md` Appendix A for the invariants an agent must not break, and `project-status.md` for the latest commands actually run and their results.
