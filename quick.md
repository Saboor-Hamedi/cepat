You are an expert React Native UI/UX designer and developer. Your task is to completely redesign the visual interface of my chat screen to make it look modern, clean, and professional.

🚨 STRICT CONSTRAINTS:

1. UI AND STYLING ONLY. Do not change any business logic, state management, API calls, or data flow.
2. Keep all existing props, variables, and function calls exactly as they are. If you change a `View` to a `TouchableOpacity`, ensure you preserve the existing `onPress` handlers.
3. Do not add new dependencies. Use standard React Native components (`View`, `Text`, `Image`, `TouchableOpacity`, `StyleSheet`) and Flexbox for layout.

🎨 DESIGN SYSTEM & THEME:

- Keep the dark theme but elevate it.
- Background: Deep dark (e.g., #0f0f1a or #121212)
- Surface/Cards: Slightly lighter dark (e.g., #1a1a2e or #1E1E2E)
- Primary Accent: Vibrant Blue (e.g., #3B82F6)
- Success Accent: Soft Green (e.g., #4CAF50)
- Text Primary: White/Off-white
- Text Secondary: Muted Gray (e.g., #888888 or #A0A0A0)
- Spacing: Use consistent padding (12px to 16px) and border-radius (8px to 16px) for a modern feel.

🛠️ COMPONENT-SPECIFIC UI INSTRUCTIONS:

1. Header Section:

- Make the layout more spacious and breathable.
- The avatar should be slightly larger with a clean green status dot overlapping the bottom-right edge (with a border matching the background).
- The "Verified Technician" text should look like a modern, subtle pill badge with a small checkmark icon.
- Ensure the back button and menu button have adequate touch targets (at least 44x44).

2. Task Info Banner (Top Section):

- Redesign the top task description area to look like a proper UI card.
- Add a subtle left border accent (e.g., 3px green border on the left) to indicate status.
- The "Completed" badge should look like a modern tag (low opacity green background with green text).
- Make the location text smaller and muted.

3. System Notices (Protected Chat & Archived Banners):

- These are currently too heavy and distracting. Make them subtle.
- Use a very low opacity background or a subtle dashed border.
- Center the text, make the font size smaller (11px-12px), and use muted gray text.
- Add a small lock icon for the protected notice and an archive icon for the archived notice.

4. Chat Messages (Bubbles):

- Received Messages: Use a dark gray surface color. Round all corners except the bottom-left corner.
- Sent Messages: Use the primary blue color. Round all corners except the bottom-right corner.
- Remove the redundant "Technical" name label from every single message bubble. If needed, only show it on the very first message in a sequence.
- Move the timestamp inside the bubble, aligned to the bottom right, with a slightly transparent/smaller font.
- Ensure bubbles have a `maxWidth` (e.g., 75%) so they don't stretch across the whole screen.

5. Bottom Action Bar:

- The "Task has completed" text should be subtle, centered, and use the success green color with a small checkmark icon.
- The "Book Again" button should not look like a massive, overwhelming block. Give it proper horizontal margins (e.g., 20px on the sides), add a refresh/reload icon next to the text, and ensure the padding is comfortable (e.g., 14px vertical).

📝 EXECUTION STEPS:

1. First, analyze the current code and identify the StyleSheet.
2. Update the JSX structure ONLY where necessary to achieve the new layout (e.g., wrapping elements in new Views for flexbox alignment).
3. Completely rewrite the `StyleSheet.create` object to implement the new design system.
4. Ensure the code is clean, well-formatted, and ready to run.
