DESIGN SYSTEM CONTRACT & COMPONENT GUIDELINES

All newly generated screens and components must strictly adhere to the following architecture:

1. Import from Design System Primitives:
   - Always wrap full screens with <ScreenWrapper> to automatically account for safe area insets and midnight dark background (#000000).
   - Never use bare <Text> components. Use <AppText variant="title|body|caption" color="primary|secondary|muted"> to ensure consistent font weights and colors.
   - Use <AppButton> for actions (variant="primary" for mint green pills, "outline" or "secondary" for neutral actions).

2. Visual Identity & Theme Tokens:
   - Palette: Pure dark background (#000000), surface tiles (#0B0F17 / #131B26), subtle hairline dividers (#1E293B), and primary mint green accent (#10B981).
   - Feed & Post Items: Must be borderless rows separated only by hairline bottom dividers (1px #1E293B). Do NOT wrap feed items in heavy card boxes unless explicitly instructed.
   - Navigation: Bottom bar must maintain the 5-slot structure with the elevated central mint-green (+) Floating Action Button protruding 50% above the bar.

3. Spacing & Rhythm:
   - Use standardized 4px/8px/12px/16px/24px spacing increments.
   - Default screen horizontal gutter is strictly 16px.
   - Interactive touch targets must be at least 48px in height.
