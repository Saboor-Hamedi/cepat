# Task: Redesign and Implement the Cepat Search Experience

Act as a senior mobile UI/UX engineer and product designer. Your task is to implement a completely redesigned, premium search experience for the Cepat marketplace.

I will provide a reference screenshot. Use it as the primary visual reference.

The objective is to create a clean, professional, intuitive search interface. Do not introduce unnecessary animations, flashy gradients, excessive shadows, glowing effects, or decorative elements.

The design philosophy is:

- Minimalist.
- Professional.
- Modern.
- Easy to navigate.
- Consistent with the existing Cepat design system.
- Optimized for mobile devices.

IMPORTANT: This is an implementation task, not a mockup. Implement the actual working interface and integrate it with the existing application.

---

## 1. Search Entry Point

On the Marketplace screen, we currently have a search input combined with the All Areas location selector.

Preserve this existing layout.

When the user taps the search input:

1. Open a dedicated full-screen search interface.
2. Display a back button in the top-left corner.
3. Display the title "Search".
4. Automatically focus the search input.
5. Open the keyboard naturally on mobile.
6. Preserve the existing location selection when entering search.

The search interface should feel like a natural extension of the Marketplace, not a completely separate application.

The chat icon must remain visible on the Marketplace screen.

---

## 2. Search Header

Create a dedicated search header containing:

- Back button.
- Search title.
- Large search input.
- Search icon on the left.
- Placeholder: "Search services, technicians, or posts..."
- Optional clear button when text is entered.

The search input should:

- Have a subtle dark surface.
- Use a thin, understated border.
- Have comfortable internal padding.
- Maintain consistent icon alignment.
- Have a clearly visible focus state.
- Support clearing the current query.
- Support keyboard submission.

Avoid excessive rounded corners. Use a consistent border radius with the rest of Cepat.

---

## 3. Search Filters

Immediately underneath the search input, implement three independent filter controls.

### Location

Default: All areas.

Allow users to select their preferred service location.

### Service Category

Default: All services.

Allow users to filter by categories such as:

- AC Service
- Plumbing
- Electrical
- Cleaning
- Home Repair
- Painting
- Renovation
- Other services

### Sorting

Default: Relevance.

Support appropriate sorting options:

- Relevance
- Most recent
- Most popular

IMPORTANT:

These filters must be functional.

Changing a filter must update the search results accordingly. Do not implement decorative dropdowns that do nothing.

---

## 4. Recent Searches

Create a section titled:

"Recent searches"

Display the user's previous search queries.

Example:

- AC service
- Plumbing near me
- Electrician

Each entry should contain:

- History icon.
- Search query.
- Remove button.

Add a "Clear" action in the section header.

Functional requirements:

- Save recent searches locally or using the application's existing persistence architecture.
- Avoid duplicate entries.
- Move previously searched terms to the top.
- Limit the number of stored searches to a reasonable amount.
- Allow individual deletion.
- Allow clearing all history.

Do not display this section when there is no search history.

---

## 5. Popular Searches

Create a section titled:

"Popular searches"

Display commonly searched services as compact horizontal chips.

Examples:

- AC service
- Plumbing
- Electrical
- Cleaning
- House repair
- Water heater
- Home renovation

Design requirements:

- Small search icon.
- Clearly readable label.
- Subtle dark background.
- Thin border.
- Consistent spacing.

Each chip must be clickable.

When clicked, populate and execute that search query.

IMPORTANT:

If actual popularity data is available from the backend, use it.

Do not fabricate popularity metrics. If no popularity data exists, use predefined suggestions managed through the existing service-category configuration.

---

## 6. Browse by Service

Create a section titled:

"Browse by service"

Display service categories in a clean two-row or responsive grid.

Initial categories:

1. AC Service
2. Plumbing
3. Electrical
4. Cleaning
5. Home Repair
6. Painting
7. Renovation
8. More Services

Each category should have:

- A simple, recognizable icon.
- Category name.
- Subtle surface background.
- Thin border.
- Consistent dimensions.
- Comfortable touch area.

Use restrained icon colors.

Suggested icon colors:

- AC Service: Soft blue.
- Plumbing: Soft blue.
- Electrical: Muted amber.
- Cleaning: Soft purple.
- Home Repair: Muted orange.
- Painting: Soft violet.
- Renovation: Teal.

Avoid bright neon colors.

Make the entire category item clickable.

Selecting a category should immediately execute the corresponding category search.

---

## 7. Search Results Experience

This is particularly important.

When the user starts typing, transition the interface into a search-results state.

Do not keep displaying Recent Searches, Popular Searches, and Browse by Service unnecessarily.

Instead, display:

- Current search query.
- Active filters.
- Number of matching results, if available.
- Relevant technicians.
- Relevant service providers.
- Relevant marketplace posts.

Results should use the existing Cepat components and visual language.

Each technician result should display relevant information such as:

- Profile picture.
- Technician name.
- Verification badge, if applicable.
- Service category.
- Service area.
- Rating and review count, if available.
- Relevant service information.

Do not invent ratings, prices, verification status, or other user information.

Provide clear loading, empty, and error states.

For empty results, display something like:

"No results found"

"Try another search term or adjust your filters."

Provide an easy way to clear filters.

---

## 8. Hashtag Search

Support hashtag searches.

For example:

#plumbing
#acservice
#electrician

Hashtags should be recognized as search terms and return relevant posts or services where applicable.

Maintain consistent hashtag styling with the Marketplace feed.

Hashtags in posts should also be clickable and open the search interface with the selected hashtag.

---

## 9. Visual Design System

Follow the existing Cepat dark theme.

Suggested design tokens:

Background:
#080B10

Secondary surface:
#101722

Input surface:
#141D29

Border:
#202938

Primary text:
#F1F5F9

Secondary text:
#94A3B8

Primary accent:
#10B981

Secondary accent:
#059669

Use the following design principles:

- Consistent spacing.
- Consistent typography.
- Consistent border radius.
- Subtle separators.
- Clear visual hierarchy.
- No unnecessary cards.
- No excessive shadows.
- No glowing effects.
- No unnecessary animations.

The search page should feel visually calm and organized.

Use the existing application font.

Do not introduce a new font family unless there is a strong technical reason.

---

## 10. Interaction and UX Requirements

Implement the following behaviors:

- Tapping Marketplace search opens the dedicated search interface.
- Back button returns to Marketplace.
- Search input receives focus automatically.
- Keyboard submission executes the search.
- Clearing the input restores the discovery interface.
- Selecting a recent search executes it.
- Selecting a popular search executes it.
- Selecting a category executes its search.
- Location filters work independently.
- Category filters work independently.
- Sorting works correctly.
- Search history persists.
- Hashtags are searchable.
- Results update appropriately.
- Loading states are handled.
- Empty states are handled.
- Errors are handled.

Avoid unnecessary transitions.

A simple, fast transition is sufficient.

---

## 11. Responsive Design

The interface must work properly across different mobile screen sizes.

Pay particular attention to:

- Small Android devices.
- Different screen densities.
- Keyboard visibility.
- Safe areas.
- Status bar spacing.
- Scroll behavior.
- Bottom navigation behavior.

When the keyboard opens:

- Prevent input fields from being obscured.
- Allow the content to scroll naturally.
- Avoid unnecessary layout jumps.
- Ensure the search header remains accessible.

Do not introduce horizontal overflow.

---

## 12. Architecture and Code Quality

Before implementation:

1. Inspect the existing Marketplace search implementation.
2. Identify the current search components.
3. Inspect the existing service categories.
4. Understand the existing backend search functionality.
5. Reuse existing components and services wherever appropriate.
6. Understand how navigation and application state are currently managed.

Do not create a second search system if one already exists.

Keep the implementation modular and maintainable.

Separate responsibilities appropriately:

- Search interface.
- Search input.
- Search filters.
- Search history.
- Popular searches.
- Service categories.
- Search results.

Do not unnecessarily duplicate business logic.

Do not introduce new dependencies unless absolutely necessary.

Most importantly, do not break existing Marketplace functionality.

---

## 13. Performance and Testing

Search should feel immediate and responsive.

Implement:

- Appropriate input debouncing.
- Cancellation of outdated search requests where supported.
- Efficient rendering of search results.
- Proper loading states.
- Error handling.
- No unnecessary component re-renders.

Test:

1. Opening and closing search.
2. Typing search queries.
3. Submitting searches.
4. Clearing searches.
5. Selecting categories.
6. Changing locations.
7. Changing sorting.
8. Selecting recent searches.
9. Deleting search history.
10. Hashtag searches.
11. Empty search results.
12. Keyboard opening and closing.
13. Navigation back to Marketplace.

Run the existing tests and ensure no regressions.

---

## FINAL DESIGN INSTRUCTION

Use the supplied screenshot as the visual reference.

I particularly like its layout:

- Search title at the top.
- Large search input.
- Three compact filter controls.
- Recent Searches section.
- Popular Searches section.
- Browse by Service grid.

Preserve this overall visual hierarchy.

Do not turn this into a flashy modern dashboard.

I want something that feels like a mature, professionally designed marketplace application.

The most important objective is usability.

Every element must have a clear purpose. Every interactive element must work. Every section must be visually consistent.

Do not redesign unrelated Marketplace components.

Implement the search experience, integrate it properly, test it, and provide a concise summary of the files changed, functionality implemented, and tests performed.

---

## 14. Architecture Specification: Top-Up, In-App Wallet & Escrow Payment System

### 14.1 Objective & Overview
Enable seamless, trust-guaranteed transactions across Cepat using an in-app digital wallet and escrow system modeled after Southeast Asian superapps (Gojek, Grab) and global service platforms (TaskRabbit, Airbnb). Customers top up their balances, book services with guaranteed funds, and technicians receive instant payouts upon verified job completion without cash friction.

### 14.2 The 3-Party Money Flow & Escrow Mechanics
```
Customer Top-Up (QRIS / Virtual Account / E-Wallet)
         │
         ▼
[ Customer Available Balance ]
         │
         │ (Booking Confirmed)
         ▼
[ Locked Escrow Vault ] ──(Guarantees technician payment without releasing prematurely)
         │
         │ (Job Completed by Tech + Approved by Customer)
         ├──────────────────────────────┐
         ▼                              ▼
[ Technician Earnings Wallet ]    [ Cepat Platform Commission (e.g. 10%) ]
         │
         ▼ (Instant Disbursement / Payout)
Technician's Registered Bank Account (BCA, Mandiri, BRI, etc.)
```

### 14.3 Core Payment Components
1. **Double-Entry Ledger Architecture**:
   - Balances are never stored as single mutable rows (`balance = balance + 1000`).
   - Balances are calculated sums of immutable ledger transactions (`topup`, `escrow_lock`, `escrow_release`, `platform_fee`, `refund`, `payout`).
   - Provides auditability, tamper-resistance, and instant financial reconciliation.

2. **Payment Gateway Integration (Midtrans / Xendit)**:
   - **QRIS**: Instant QR code generation compatible with all Indonesian banks and e-wallets.
   - **Bank Virtual Accounts (VA)**: Dedicated VA numbers for BCA, Mandiri, BNI, BRI, Permata.
   - **Direct E-Wallets**: Deep-link or direct binding for GoPay, ShopeePay, OVO, and Dana.
   - **Webhook Engine**: Authenticated webhook handlers that listen for gateway status callbacks (`capture`, `settlement`, `expire`, `cancel`) and credit balances atomically.

3. **Booking & Escrow Lifecycle**:
   - **Hold / Lock**: On booking acceptance, the agreed quote or base deposit is locked from customer's available balance into escrow.
   - **In-Progress Work**: Technician can work knowing funds are reserved and guaranteed.
   - **Verification & Settlement**: Customer inspects work, enters completion confirmation, and rates the technician. Funds split into technician earnings and platform revenue.
   - **Cancellation & Dispute Handling**: If a technician cancels or does not arrive, escrow funds instantly return to customer's available balance with zero deduction or transaction penalty.

4. **Technician Cashout (Disbursement API)**:
   - Technicians connect and verify their bank account name and account number.
   - On payout request, gateway disbursement sends funds directly to the technician's bank account in real-time.

---

## 15. Push Notifications System (Expo Notifications)

### 15.1 Purpose & Scope
Ensure instant, real-time alerts on mobile devices for:
- New booking requests and status transitions (Pending -> Accepted -> In-Progress -> Completed).
- Real-time chat messages between customer and assigned technician.
- Top-up balance confirmations and escrow payout updates.
- Post engagement (likes, reviews, verified badge updates).

### 15.2 Architecture & Flow
1. **Device Registration & Permissions**:
   - Request system notification permissions using `expo-notifications`.
   - Retrieve unique `ExpoPushToken` on physical devices.
   - Register the push token to the user's profile in database storage.
2. **Notification Channels (Android)**:
   - High-priority sound & vibration channel for Bookings & Emergencies.
   - Standard channel for Chat and Social Updates.
3. **Foreground & Background Presentation Handlers**:
   - Configure `setNotificationHandler` so in-app banner alerts appear even when the app is foregrounded.
   - Handle notification responses (`addNotificationResponseReceivedListener`) to deep-link directly into the relevant booking or chat screen (`/booking/[id]`, `/chat/[id]`).

---

## 16. Technician Star Ratings on Marketplace Posts

### 16.1 Design & Display
Marketplace post headers display the technician's actual ratings identically to their profile cover:
- Prominent amber gold star (`★`).
- Bold average rating score (`4.9`, `5.0`).
- Muted review count (`(38 rev)` / `(38 ul)`).
- Instant mapping with fixture technician registry and asynchronous dynamic resolution for new/custom technician posts.

