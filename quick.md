Task: Profile Refactoring, Settings Reorganization, and Booking Cleanup
Implement the following set of specific UI, component, and data cleanups across the Cepat codebase. Follow existing project conventions, adhere to the 1,000-line per-file limit, avoid stale code, and do not introduce unrequested features.

1. Profile & Standalone Avatar Component (src/profile)
   Remove static upload buttons: Remove the visible static buttons for "Select from gallery" and "Take a photo" from the profile screen.

Sleek avatar action menu (X.com / Twitter style):

Tapping the profile picture must open a sleek bottom sheet or popup menu offering two actions: Take Photo (Camera) and Choose from Gallery.

Reusable standalone avatar component:

Extract this into a dedicated, reusable component (e.g., ProfileAvatar).

Add a boolean toggle prop (e.g., editable={true | false}).

When editable={true}: Tapping the avatar opens the photo selection menu (used on editable profile screens).

When editable={false}: The avatar is purely display-only with no popup behavior (used for headers, top navigation bars, previews, etc.).

Unified profile architecture (Facebook / X.com model):

Use a single profile layout structure for both public and owner views across all user roles (customers and technicians).

Public view: Renders the exact same profile layout, but in strict read-only mode (all edit, delete, and management controls are hidden/disabled).

Owner view: Renders the edit, delete, and customization controls for the authenticated owner.

2. Settings — Account Tab
   Single address textarea: Replace the existing multi-field address form with a single multiline textarea allowing users to enter their complete address directly. Remove separate "Street & number", type labels like (e.g., home), and unnecessary helper buttons.

Remove email and phone number: Relocate these two fields out of the Account tab and into the Security tab.

Remove logout button: Delete the logout button from the Account tab (logout is already handled in Sidebar.tsx).

3. Settings — Security Tab
   Moved contact credentials: Place the user's Email and Phone Number management in this tab.

4. Settings — Password Tab
   Required fields: Display only Current Password, New Password, and Confirm Password.

Remove verification email button: Completely remove the "Send verification code to email" element.

5. Settings — Language & Appearance (Theme)
   Language selector: Clean up and redesign the language selector UI; replace the existing badge (ID/EN) with a polished, clean selection interface.

Theme options: Provide exactly three clean options: Light, Dark, and System.

6. Booking Time Slots Cleanup
   Delete hardcoded time slots: Fully remove @Morning (8-12) and all other hardcoded booking time slots.

Zero stale code: Clean up and remove all dead/unused code related to these mock time slots.

7. Bookings Screen Cleanup
   Remove all hardcoded data: Completely eliminate all hardcoded mock bookings and test data.

Header and layout cleanup: Remove the "Booking & Message" text and associated top text blocks entirely.

Reposition tabs: Shift the navigation tabs directly to the top to reclaim the vertical space. *
