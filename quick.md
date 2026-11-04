Refactor and polish the Profile screen UI according to the following specifications:

1. Safe Area & Header Fix:
   - Ensure the screen content respects device notch/status bar insets (using SafeAreaView or react-native-safe-area-context with paddingTop: insets.top).
   - Display the user's name ("Saboor Hamedi") and handle ("@saboorhamedi") clearly below the system status bar with clean vertical breathing room (12px–16px).

2. Profile Stats Row:
   - Replace the 4 chunky separate rectangular stat boxes with a single unified, sleek horizontal stats strip (or inline metrics separated by subtle vertical pipes "|"):
     - Rating: "★ 5.0 (0 rev)"
     - Tasks: "0 tasks"
     - Posts: "6 posts"
     - Area: "All areas"
   - Reduce visual bulk and save vertical screen space.

3. Sub-Navigation Tabs:
   - Ensure the horizontal tabs ("Posts", "Services", "Portfolio", "Reviews", "About") have smooth horizontal scrolling if needed, with the active tab ("Posts") highlighted in vibrant mint green (#10B981) and an active underline indicator.

4. Inline Composer Refinement (Threads-Style):
   - Left: Circular user avatar with a faint vertical connector thread line running downward to the icon bar.
   - Right: Borderless multiline TextInput with placeholder "What's new with your work?" (#64748B).
   - Bottom Action Row:
     - Left side: Subtle utility icons (briefcase/service, location pin, camera) in muted gray (#94A3B8).
     - Right side: Compact rounded pill button "Post" aligned cleanly on the right of the same toolbar row (mint green when active, muted when text is empty).
   - Add a subtle 1px bottom border (#1E293B) to demarcate the composer from the feed below.

5. Profile Feed List:
   - Refactor posts to look native and borderless: remove heavy rounded boxed cards.
   - Separate individual posts with clean, subtle 1px divider lines (#1E293B) with 16px horizontal and vertical padding.
   - Maintain the avatar, author name, timestamp, and post text typography hierarchy.
