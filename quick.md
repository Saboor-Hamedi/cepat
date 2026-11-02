Redesign the Technician Profile screen to match this modern, clean design. UI ONLY — no logic changes.

🚨 CRITICAL FIX:

- Fix typo "Techinician" → "Technician" everywhere

🎨 DESIGN SPECIFICATIONS:

1. Cover Photo & Avatar:

- Cover image: full width, height 140px, objectFit: 'cover'
- Profile avatar: 80x80, borderRadius 40, white border 4px, positioned overlapping cover bottom (marginTop: -40, marginLeft: 16)
- Camera icon button: 28x28, white background with shadow, green camera icon, positioned bottom-right of avatar (bottom: 0, right: 0)

2. Profile Info (centered):

- Name "Technician": fontSize 22, fontWeight 700, color: theme.textPrimary, marginTop 12, textAlign center
- Business "Rizky Plumbing": fontSize 14, color: theme.textSecondary, marginTop 2, textAlign center
- Specialty badge "Specialist on AC": backgroundColor rgba(16, 185, 129, 0.15), color theme.primary, fontSize 13, fontWeight 600, paddingHorizontal 12, paddingVertical 4, borderRadius 12, marginTop 8, alignSelf center

3. Stats Row (4 cards):

- Container: flexDirection row, marginHorizontal 16, marginTop 16, gap 8
- Each card: flex 1, backgroundColor theme.surface, borderRadius 12, padding 12, borderWidth 1, borderColor theme.border, alignItems center
- Card content: Icon (colored, size 20) + Number (fontSize 18, fontWeight 700) + Label (fontSize 11, color theme.textSecondary)
- Stats: Rating (star icon yellow, "5.0", "Rating"), Tasks (checkmark icon green, "4", "Tasks"), Posts (document icon green, "3", "Posts"), Area (location icon green, "Jakarta", "Service Area")

4. Action Buttons Row:

- Container: flexDirection row, marginHorizontal 16, marginTop 12, gap 8
- Each button: flex 1, paddingVertical 10, borderRadius 10, alignItems center, justifyContent center
- First 3 buttons (New Post, Add Work, Edit About): backgroundColor theme.surface, borderWidth 1, borderColor theme.border, icon + text (fontSize 12, fontWeight 600)
- "Review" button: backgroundColor theme.primary, text white, icon white
- Icon size 16, gap 4 between icon and text

5. Tab Bar:

- Container: flexDirection row, borderBottomWidth 1, borderBottomColor theme.border, marginTop 16, backgroundColor theme.background
- Tabs: Posts, Services, Portfolio, Reviews, About
- Each tab: flex 1, paddingVertical 12, alignItems center
- Active tab (Posts): text color theme.primary, fontWeight 700, borderBottomWidth 2, borderBottomColor theme.primary
- Inactive tabs: text color theme.textSecondary, fontWeight 500
- Tab text fontSize 14

6. Create Post Composer:

- Card: backgroundColor theme.surface, borderRadius 16, padding 16, marginHorizontal 16, marginTop 12, borderWidth 1, borderColor theme.border
- Title "Create Post": fontSize 16, fontWeight 700, marginBottom 12
- Top row: avatar (32x32, borderRadius 16) + TextInput placeholder "What's on your mind?" (flex 1, backgroundColor theme.background, borderRadius 8, padding 12, fontSize 14, color theme.textPrimary, minHeight 60)
- Divider: height 1, backgroundColor theme.border, marginVertical 12
- Bottom row: flexDirection row, alignItems center, justifyContent space-between
- Left buttons: "Photo" (icon + text, borderWidth 1, borderColor theme.border, borderRadius 8, padding 8) and "Offer Service" toggle (text + Switch component, green when on)
- Right button: "Post" (backgroundColor theme.primary, color white, fontWeight 700, borderRadius 8, paddingVertical 8, paddingHorizontal 20)

7. Post Cards:

- Card: backgroundColor theme.surface, borderRadius 16, padding 16, marginHorizontal 16, marginTop 12, borderWidth 1, borderColor theme.border
- Header row: avatar (40x40, borderRadius 20) + name "Technician" (fontSize 15, fontWeight 700) + time "2h ago" (fontSize 12, color theme.textSecondary, marginLeft auto) + "Bookable Service" badge (backgroundColor rgba(16, 185, 129, 0.15), color theme.primary, fontSize 11, fontWeight 600, paddingHorizontal 10, paddingVertical 4, borderRadius 12)
- Post text: fontSize 14, lineHeight 20, color theme.textPrimary, marginTop 8
- Post image (if exists): width '100%', aspectRatio 16/9, resizeMode 'cover', borderRadius 12, marginTop 8
- Action row: flexDirection row, gap 16, marginTop 12 - Heart icon (outline, size 20), Comment icon (outline, size 20), Share icon (outline, size 20), all color theme.textSecondary

8. Theme Support:

- Light theme: background #FFFFFF, surface #F5F7F5, border #E5E7EB, textPrimary #111827, textSecondary #6B7280, primary #10B981
- Dark theme: background #0F0F1A, surface #1A1A2E, border #2A2A3E, textPrimary #F9FAFB, textSecondary #9CA3AF, primary #10B981
- System theme: follows device setting
- ALL colors must use theme variables, no hardcoded values

Do NOT change any business logic, data flow, or navigation. Only update JSX structure and StyleSheet.

for the verification thickmark, make sure do not add background color to the thickmark, it should be transparent. only the thickmark icon should be visible.
-

on the marketplace the thickmark icon is not showing on the post beside the name of the technician, please make sure to fix that issue as well.
-

on the marketplace, remove the busnines name "Rizky Plumbing" from the profile info section, and add this 'bookable serivce' badge beside the name of the technician.
--
