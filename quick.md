Refactor the Notifications, Bookings Empty State, and Tasks Request screens according to the design system rules:

1. Notifications Screen:
   - Header: Back arrow (< Back) and centered title "Notifications" with safe area insets.
   - Filter Tabs: Horizontal pills for "All (22)", "Unread (2)", "Bookings", and "Messages".
   - Feed Layout: Remove individual heavy card boxes. Use borderless rows separated by 1px hairline dividers (#1E293B).
   - Item Elements:
     - Left: 40px circular container with semantic icon (mint-green wrench for bookings, cyan/blue bubble for messages).
     - Middle: Bold notification title (15px white), message body preview (13px #94A3B8), and relative timestamp ("2h ago").
     - Right: Small mint-green unread dot indicator (#10B981) instead of an "x" dismiss button.

2. Bookings Empty State:
   - Center container vertically within the active tab view.
   - Graphic: Minimalist stylized dark icon/illustration with subtle mint-green accents.
   - Title: "No active bookings" in bold white (18px).
   - Subtitle: "Explore the marketplace to book a technician." in muted gray (#94A3B8, 14px).
   - CTA: Prominent rounded pill button (<AppButton>) labeled "Explore Marketplace" in solid mint green (#10B981) with black text, navigating to Marketplace.

3. Tasks Screen (Provider Incoming Requests):
   - Segmented Control: "Bookings" | "Tasks" (Tasks active in solid mint green).
   - Filter Row: "Requests (3)" active, "Active Tasks (1)", "History (7)".
   - Request Card Architecture (#111827 surface, 1px #1E293B border, 14px radius):
     - Header: Customer avatar, name, location, and requested booking timestamp. Right side: Subtle "Customer Profile" outline badge.
     - Body: Job title ("AC Service Repair") and service address enclosed in an inner dark container (#0B0F17).
     - Action Row: Side-by-side buttons: "Accept request" (flex: 1, solid mint green) and "Decline" (flex: 1, outline or dark gray).
     - Reschedule Section: Clean horizontal date chips and time slots (e.g., 09:00, 11:00, 14:00) with a muted "Propose another time" text button.

4. Global Layout Consistency:
   - Pure black background (#000000).
   - Remove any floating blue settings gears across all views.
   - Maintain the standard 5-slot bottom navigation bar with elevated center mint-green (+) FAB.
