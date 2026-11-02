Redesign the Sign In and Sign Up screens to look modern and professional. UI ONLY — no logic changes.

🎨 DESIGN SPECIFICATIONS:

1. Header:

- Back button: circular, backgroundColor theme.surface, borderRadius 20, padding 8, icon size 20
- Logo: "C" icon (green square with white C, borderRadius 8) + "cepat" text (bold, fontSize 18)
- Center the logo in header
- Header padding: 16px horizontal, 12px vertical

2. Sign In Screen:

- Title "Welcome back": fontSize 28, fontWeight 700, color theme.textPrimary, marginTop 24, marginBottom 8
- Subtitle "Sign in to manage your account and services.": fontSize 14, color theme.textSecondary, marginBottom 24

- Remove the gray card background — place form directly on screen background
- Input fields:
  - Label: fontSize 14, fontWeight 600, color theme.textPrimary, marginBottom 8
  - Input container: backgroundColor theme.surface, borderRadius 12, borderWidth 1, borderColor theme.border, padding 12, flexDirection row, alignItems center
  - Icon on left: size 20, color theme.textSecondary
  - TextInput: flex 1, fontSize 15, color theme.textPrimary, backgroundColor transparent
  - "Show" button: replace text with eye icon (size 20, color theme.textSecondary), padding 8
  - Focus state: borderColor theme.primary (green)

- "Forgot password?" link: color theme.primary, fontSize 14, fontWeight 600, textAlign right, marginTop 12, marginBottom 24

- "Sign in" button: backgroundColor theme.primary, color white, fontSize 16, fontWeight 700, paddingVertical 16, borderRadius 12, width '100%'
- Press state: opacity 0.9

- "New to Cepat? Create an account" link: color theme.primary, fontSize 14, fontWeight 600, textAlign center, marginTop 16

3. Sign Up Screen:

- Title "Create your Cepat account": fontSize 28, fontWeight 700, color theme.textPrimary, marginTop 24, marginBottom 8
- Subtitle "Join as a customer or apply to become a technician.": fontSize 14, color theme.textSecondary, marginBottom 24

- Role Selector:
  - Label "I WANT TO USE CEPAT AS A": fontSize 12, fontWeight 700, color theme.textSecondary, letterSpacing 0.5, marginBottom 12
  - Two cards side by side (flex 1 each, gap 12)
  - Each card: borderWidth 2, borderRadius 12, padding 16, alignItems center
  - Selected card: borderColor theme.primary, backgroundColor rgba(16, 185, 129, 0.05)
  - Unselected card: borderColor theme.border, backgroundColor theme.surface
  - Icon on top (size 24, color theme.primary for selected, theme.textSecondary for unselected)
  - Title: fontSize 15, fontWeight 700, color theme.textPrimary, marginTop 8
  - Subtitle: fontSize 12, color theme.textSecondary, marginTop 4, textAlign center

- Form fields (same style as sign in):
  - Full name, Email address, Password, Confirm password
  - Password requirements text: fontSize 12, color theme.textSecondary, marginTop 8, marginBottom 16

- Terms checkbox:
  - Custom checkbox: 24x24, borderRadius 6, borderWidth 2, borderColor theme.border
  - Checked: backgroundColor theme.primary, borderColor theme.primary, white checkmark icon
  - Label text: fontSize 13, color theme.textPrimary, flex 1, marginLeft 12
  - "terms of service" and "privacy policy" as links (color theme.primary)
  - Container: flexDirection row, alignItems flex-start, marginBottom 24

- "Create account" button: same style as sign in button
- "Already have an account? Sign in" link: same style as sign up link

4. Theme Support:

- Light theme: background #FFFFFF, surface #F5F7F5, border #E5E7EB, textPrimary #111827, textSecondary #6B7280, primary #10B981
- Dark theme: background #0F0F1A, surface #1A1A2E, border #2A2A3E, textPrimary #F9FAFB, textSecondary #9CA3AF, primary #10B981
- ALL colors must use theme variables

5. Keyboard Handling:

- Use KeyboardAvoidingView with behavior="padding" (iOS) or "height" (Android)
- Add ScrollView so form is scrollable when keyboard is open

Do NOT change any business logic, validation, or navigation. Only update JSX structure and StyleSheet.
