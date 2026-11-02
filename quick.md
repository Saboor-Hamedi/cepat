Redesign the Technician Profile screen to look modern and professional. UI ONLY — no logic changes.

🚨 CRITICAL FIX:

- Fix typo "Techinician" → "Technician" everywhere (profile name, post cards, composer placeholder text)

🎨 DESIGN IMPROVEMENTS:

1. Cover Photo Area:

- Cover image: height 140px, full width
- "Edit Cover" button: top-right, small camera icon + text, semi-transparent dark background, borderRadius 8, padding 8
- Profile avatar: 80x80, borderRadius 40, white border 3px, positioned overlapping cover bottom (marginTop: -40, marginLeft: 16)
- Camera icon on avatar: small circular button (28x28), green background, white camera icon, positioned bottom-right of avatar

2. Profile Info Section:

- Name: "Technician" - fontSize 22, fontWeight 700, color: theme.textPrimary
- Business name: "Rizky Plumbing" - fontSize 14, color: theme.textSecondary, marginTop 2
- Specialty: "Specialist on AC" - fontSize 14, fontWeight 600, color: theme.primary (green), marginTop 2

3. Stats Row:

- 4 stat cards in a row, equal width
- Each card: backgroundColor: theme.surface, borderRadius 12, padding 12, borderWidth 1, borderColor: theme.border
- Icon on top (colored), number below (bold, large), label below (small, muted)
- Gap between cards: 8px
- Horizontal margin: 16px

4. Action Buttons Row:

- 4 buttons: "New Post", "Add Work", "Edit About", "Review"
- Each button: flex 1, borderRadius 10, padding 10
- First 3 buttons: backgroundColor: theme.surface, borderWidth 1, borderColor: theme.border, icon + text
- "Review" button: backgroundColor: rgba(16, 185, 129, 0.1), borderColor: theme.primary, text color: theme.primary
- Icon size: 16, text fontSize: 12, fontWeight 600
- Gap: 8px, margin horizontal: 16px, margin vertical: 12

5. Tab Bar:

- Horizontal row of tabs: Posts, Services, Portfolio, Reviews, About
- Active tab: text color theme.primary, fontWeight 700, bottom border 2px solid theme.primary
- Inactive tabs: text color theme.textSecondary, fontWeight 500
- Tab padding: 16 horizontal, 12 vertical
- Tab bar backgroundColor: theme.background, borderBottomWidth 1, borderBottomColor: theme.border

6. Create Post Composer:

- Card style: backgroundColor: theme.surface, borderRadius 16, padding 16, margin 16, borderWidth 1, borderColor: theme.border
- Top row: small avatar (32x32) + placeholder text "What's on your mind?" (muted, fontSize 14)
- Divider line: 1px, theme.border, margin vertical 12
- Bottom row: 3 buttons - "Photo" (icon + text), "Offer Service" (icon + text + toggle switch), "Post" button (solid green, white text, borderRadius 8, padding 10 horizontal)
- "Post" button aligned to right

7. Post Cards:

- Same style as marketplace cards
- backgroundColor: theme.surface, borderRadius 16, padding 16, margin horizontal 16, margin bottom 12, borderWidth 1, borderColor: theme.border
- Avatar 40x40, name bold, time muted right-aligned
- "Bookable Service" badge: backgroundColor rgba(16, 185, 129, 0.15), text color theme.primary, fontSize 11, fontWeight 600, padding 6 vertical 10 horizontal, borderRadius 12, marginTop 8
- Post text: fontSize 14, lineHeight 20, color theme.textPrimary, marginTop 8

8. Theme Support:

- All colors must use theme variables (light/dark/system)
- For light theme: surface #F5F7F5, background #FFFFFF, border #E5E7EB, textPrimary #111827, textSecondary #6B7280, primary #10B981
- For dark theme: surface #1A1A2E, background #0F0F1A, border #2A2A3E, textPrimary #F9FAFB, textSecondary #9CA3AF, primary #10B981

Do NOT change any business logic, data flow, or navigation. Only update JSX structure and StyleSheet.

---

Also: Here is the big one:

- there is not place to allow users to change their name
- setting -> security -> we have a loot of text we dont need them.
- remove 'strict separation of public and private data remove this fully.
  change this button 'Save contact Details' -> save keep the button small on the left right.
- remove the Term of service & privacy policy summary, make a tab called policy there explain all these things
- on the security, create another panel for changing the username the name which appears on the profile
- we have 2 names there the public name which appears on the top and another name under that, i dont get that name what is that
- they should be robust dry on the same folder separate components just call them on the security...
- the post on the profile has more than 5px radius make 5px the same for the form on the profile...
  the gaps must be 5px over all the app.
