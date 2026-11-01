You are an expert React Native UI/UX designer. Your task is to completely redesign the marketplace front page (Browse/Home screen), Search screen, and Profile screen to match a modern, clean marketplace app design (similar to OfferUp/Facebook Marketplace).

🚨 STRICT CONSTRAINTS:

1. UI AND STYLING ONLY. Do not change any business logic, state management, API calls, navigation structure, or data flow.
2. Keep all existing props, variables, function calls, and component imports exactly as they are.
3. Do not add new npm dependencies. Use only standard React Native components and your existing icon library.
4. The app supports 3 themes: white (light), dark, and system (follows device setting). You MUST implement all 3 themes properly using the existing theme system. Do not hardcode colors — use theme variables.

🎨 DESIGN SYSTEM (apply to all 3 themes):

Light Theme:

- Background: #FFFFFF
- Surface/Card: #F5F7F5 (very light mint-gray)
- Surface Secondary: #EEF2EE
- Primary Accent: #10B981 (emerald green)
- Primary Light: rgba(16, 185, 129, 0.1)
- Text Primary: #111827
- Text Secondary: #6B7280
- Text Muted: #9CA3AF
- Border: #E5E7EB
- Search Bar BG: #F3F4F6
- Chip BG: #F0F4F0

Dark Theme:

- Background: #0F0F1A
- Surface/Card: #1A1A2E
- Surface Secondary: #252540
- Primary Accent: #10B981
- Primary Light: rgba(16, 185, 129, 0.15)
- Text Primary: #F9FAFB
- Text Secondary: #9CA3AF
- Text Muted: #6B7280
- Border: #2A2A3E
- Search Bar BG: #1E1E2E
- Chip BG: #252540

System Theme:

- Automatically uses Light or Dark based on device appearance setting. Use Appearance API or your existing theme hook.

General Rules:

- Border radius: 12px for cards, 16px for large cards, 24px for search bar, 50% for avatars/circles
- Spacing: 16px standard padding, 12px between items, 8px for small gaps
- Font: Use your existing font system. Headings: bold/700, Body: 400/500
- Shadows: Very subtle on light mode (elevation 1-2), none on dark mode
- All touch targets minimum 44x44

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 SCREEN 1: BROWSE / HOME SCREEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Top Header Bar:

- Left side: Location indicator with a small map pin icon, city name in bold, and a small chevron-down (dropdown indicator). Example: "📍 Portland, OR ▾"
- Right side: Notification bell icon inside a subtle circular button
- Keep it clean, no heavy background — just the theme background color
- Add proper top padding for safe area (status bar)

2. Search Bar:

- Full width with horizontal margins (16px)
- Rounded pill shape (borderRadius: 24)
- Light gray/muted background (Search Bar BG color from theme)
- Magnifying glass icon on the left (muted color)
- Placeholder text: "Find sneakers, cameras, furniture..."
- Height: ~48px
- NO filter button attached to it — keep it clean

3. Featured Ads Carousel (Horizontal Scroll):

- Section title: "FEATURED" with a small lightning bolt icon, displayed as a badge on each card
- Horizontal ScrollView/FlatList with horizontal paging or snap
- Each featured card:
  - Large image taking up most of the card (aspect ratio ~16:10)
  - Image has rounded corners (16px)
  - "⚡ FEATURED" badge overlaid on top-left of image (yellow/amber background, dark text, small pill)
  - Title overlaid at bottom of image in white text with text shadow for readability
  - Below image (or overlaid at bottom): Price in large bold text, original price with strikethrough in smaller muted text
  - Seller row: small circular avatar (24px), seller name, star rating with star icon
  - Card width: ~80% of screen width so next card peeks in
  - Gap between cards: 12px
  - Horizontal padding: 16px

4. Browse Categories Section:

- Section header: "BROWSE CATEGORIES" in small uppercase muted text on left, "Show all →" link on right (primary green color)
- Grid layout: 3 columns, 2 rows visible
- Each category card:
  - Square aspect ratio (1:1)
  - Background image with dark gradient overlay at bottom for text readability
  - Category name at bottom-left in white bold text
  - Rounded corners (12px)
  - Gap: 12px between cards
- Categories: Electronics, Fashion, Home & Garden, Sneakers, Books, Vintage (use your existing category data)

5. Safety Tip Banner:

- Full width card with light amber/yellow background (light mode) or dark amber (dark mode)
- Small shield icon on left
- Title: "Stay safe — meet smart" (bold)
- Subtitle: "Public spot, daylight, and never wire money. Tap for tips →" (smaller, muted)
- Rounded corners (12px)
- Margin: 16px horizontal

6. "Fresh Near You" Section:

- Section header: "Fresh near you" in bold on left, "X ads" count in muted text on right
- List of ad cards (vertical):
  - Each card: horizontal layout
  - Left: Square image thumbnail (80x80, borderRadius 12)
  - Right: Price (bold, large), Title (1 line, truncate), Location + time ago (small, muted, with pin icon)
  - Far right: Heart/favorite icon (outline)
  - Card background: Surface color
  - Border radius: 12px
  - Margin bottom: 12px
  - Padding inside card: 12px

7. Bottom Navigation Bar:

- 5 tabs: Browse, Search, Sell, Inbox, Profile
- Icons above labels
- Active tab: Primary green color for both icon and label
- Inactive tab: Muted gray color
- Sell button: Circular button with "+" icon, slightly elevated, primary green background with white icon
- Height: ~60px with safe area bottom padding
- Top border: subtle 1px line

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 SCREEN 2: SEARCH SCREEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Header:

- Large bold title "Search"
- No back button needed (it's a tab)

2. Search Bar:

- Same style as home screen search bar
- Placeholder: "Find anything in your city"
- Filter/settings icon button on the right (green circular button with sliders icon)

3. Trending Searches:

- Section label: "TRENDING SEARCHES" with a small trending-up icon, uppercase, muted, small font
- Horizontal wrapping chips/row of chips
- Each chip: rounded pill (borderRadius 20), light background (Chip BG color), padding horizontal 14px vertical 8px
- Text: regular weight, theme text color
- Gap between chips: 8px

4. Sort Options:

- Horizontal row of pill buttons: "Newest", "Price ↑", "Price ↓", "Popular"
- Active sort: Dark/black background (light mode) or white background (dark mode) with white/black text
- Inactive: Transparent/light background with border
- Border radius: 20px
- Gap: 8px

5. Search Results List:

- Same card style as "Fresh near you" on home screen
- Image thumbnail left, details right, heart icon far right
- Price bold and prominent

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 SCREEN 3: PROFILE SCREEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Header:

- Large bold title "Profile"
- Settings gear icon on the right (circular button, subtle background)

2. Profile Info Section:

- Large circular avatar (80x80) with green checkmark badge overlapping bottom-right (verified indicator)
- Username in large bold text
- Location row: pin icon + city name (muted)
- Rating row: star icon + rating number + "Since 2024" with calendar icon
- Bio/description text below (muted, italic style optional)

3. Stats Row:

- 3 columns separated by subtle vertical dividers
- Each: large bold number on top, small muted label below
- Stats: Active ads, Total views, Sold

4. Action Buttons:

- Two buttons side by side (50/50 split with gap)
- "Edit profile": Solid primary green background, white text, rounded (12px)
- "Share profile": Transparent with green border, green text, rounded (12px)
- Height: ~48px

5. Menu Sections (grouped):

- Section labels: "SELLING", "SHOPPING", "ACCOUNT" — small uppercase muted text
- Each menu item:
  - Row layout: Icon on left (in a small circular subtle background), Title bold, Subtitle/description small muted below title, Chevron right on far right
  - Background: Surface color (slightly different from main bg)
  - Padding: 16px
  - Border radius: 12px
  - Gap between items in same group: 0 (they stack as one card with dividers) OR 8px gap between separate cards
  - Divider between items: 1px subtle line

6. Bottom Navigation:

- Same as home screen, with "Profile" tab active (green)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 EXECUTION STEPS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. First, read and understand the existing code structure, theme system, and all current components.
2. Identify which files correspond to Browse/Home, Search, and Profile screens.
3. For each screen, update the JSX layout to match the new structure described above. Keep all existing data sources, handlers, and navigation calls.
4. Create or update StyleSheet objects using theme-aware colors. If your app uses a theme hook/context (like useTheme()), use it. If it uses a theme object passed via props, use that.
5. For the 3-theme support: ensure every color value comes from the theme object, never hardcoded. The theme object should have values for light, dark, and the system hook should switch between them.
6. Test that the layout works on both iOS and Android (use Platform-specific adjustments only if necessary, e.g., safe area handling).
7. Ensure horizontal ScrollView for featured ads and category grid work smoothly.
8. Do NOT remove any existing functionality — only change visuals and layout structure.

🎯 FINAL CHECKLIST:

- [ ] All 3 themes (light, dark, system) work correctly
- [ ] No hardcoded colors — all from theme
- [ ] No logic/behavior changes
- [ ] iOS and Android compatible
- [ ] Safe areas handled (notch, home indicator)
- [ ] Touch targets ≥ 44px
- [ ] Text is readable in both themes
- [ ] Horizontal scroll works for featured ads
- [ ] Category grid is 3 columns
- [ ] Bottom nav has 5 tabs with Sell as centered circle button
