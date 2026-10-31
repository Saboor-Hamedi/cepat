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
