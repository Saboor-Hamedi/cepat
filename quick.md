Refactor and redesign the "Bookings & Messages" screen layout and card components according to the following specifications:

1. Top App Header:
   - Header row with standard safe area padding:
     - Left: Clean chevron back button (< Back).
     - Center: Screen title "Bookings & Messages" in semi-bold white text (16px).
   - Background: Pure dark surface (#000000 or #0B0F17).

2. Primary View Switcher (Segmented Control):
   - Replace separate loose buttons with a full-width segmented control container (background: #161F2E, border-radius: 12px, padding: 4px, marginHorizontal: 16px).
   - Two equal-width tabs: "Bookings" and "Tasks".
   - Active state ("Bookings"): Solid mint green (#10B981) background with bold dark text (#000000).
   - Inactive state ("Tasks"): Transparent background with muted gray text (#94A3B8).

3. Status Filter Pills (Horizontal Scroll):
   - Horizontal scroll row: "Current (3)", "History (0)", "Messages (3)", "Saved (0)".
   - Active filter ("Current (3)"): Rounded pill with solid mint green fill or distinct active border.
   - Inactive filters: Dark surface fill (#161F2E) with muted white/gray text and count tags.

4. Booking / Job Card Component:
   - Container: Rounded elevated card (border-radius: 14px, background: #111827, 1px subtle border: #1E293B, padding: 14px, marginHorizontal: 16px, marginBottom: 12px).
   - Top Row (Header & Status):
     - Left: Service title in bold white (16px, e.g., "AC Service", "Plumbing Repair").
     - Right: Semantic status badge pill:
       - "Work Completed": Soft green tint (bg: rgba(16, 185, 129, 0.15), text: #10B981).
       - "Service in Progress": Soft amber tint (bg: rgba(245, 158, 11, 0.15), text: #F59E0B).
       - "Awaiting response": Subtle slate tint (bg: rgba(148, 163, 184, 0.15), text: #94A3B8).
   - Middle Row (Technician & Address):
     - Technician row with small circular avatar (24px), name, and verified badge.
     - Location row with a mini pin icon and formatted address ("Ciputat jl legos depan UIN JKT • South Jakarta") in muted gray (#94A3B8, 12px).
   - Bottom Row (Date & Navigation):
     - Separated by a subtle 1px divider (#1E293B).
     - Left: Calendar icon alongside formatted schedule date/time ("Nov 6, 2026 • 02:00 WIB") in #94A3B8.
     - Right: Subtle right chevron arrow (>) indicating tappable card detail view.

5. Bottom Navigation Bar:
   - Retain the standard 5-slot bottom bar with the elevated central mint-green (+) Floating Action Button, active green highlight on "Bookings", and badge indicator on "Notifications".
