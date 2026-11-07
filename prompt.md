# Cepat — Post Composer UI Redesign & Intelligent Price Input

Act as a senior React Native engineer and UI/UX architect.

I want you to redesign the existing Create Post / Edit Post screen using the visual reference and layout we discussed.

This is an enhancement to the existing application. Do not rebuild the post creation system or break any existing functionality.

The objective is to create a clean, professional composer that supports both bookable service posts and non-bookable community posts.

## 1. Design Direction

Follow the approved visual concept:

- Premium dark interface.
- Black/deep navy background.
- Subtle dark input surfaces.
- Green primary accent (`#10B981`).
- White primary text.
- Muted gray secondary text.
- Existing customizable pink profile-picture border.
- Consistent spacing and typography.
- Minimal borders and no unnecessary decorative elements.

Do not introduce excessive gradients, shadows, animations, or flashy visual effects.

## 2. Post Composer Layout

Organize the screen in this order:

1. Header: Cancel, Create Post/Edit Post, Publish.
2. Post type selector.
3. User profile information.
4. Service title (for bookable posts).
5. Description.
6. Price input (for bookable posts).
7. Photo attachments.
8. Location.
9. Audience visibility.
10. Publish action.

The layout should be compact, balanced, and comfortable to use.

Avoid excessive empty vertical space.

## 3. Post Type Selector

Support the existing two post types:

### Service Offer

- Bookable post.
- Customers can book the service.
- Supports service title, description, price, photos, and location.

### Community Post

- Non-bookable post.
- Supports description, photos, and existing community functionality.
- Does not require a service price.

IMPORTANT: Reuse the existing post-type logic. Do not introduce a duplicate booking or post-type system.

When editing an existing post, automatically preserve its original post type.

Changing the type must not accidentally discard existing content.

## 4. Service Title and Description

For bookable posts, provide separate inputs:

Service title:
Example: AC Washing & Maintenance

Description:
Example: Professional AC cleaning and maintenance service.

Requirements:

- Clear labels and placeholders.
- Comfortable multiline description input.
- Automatic height adjustment where appropriate.
- Character counter.
- Correct keyboard behavior.
- Preserve existing validation rules where applicable.

For community posts, retain the existing description functionality.

## 5. CRITICAL: Intelligent Indonesian Rupiah Price Input

This is one of the most important requirements.

Build a robust, production-quality price input component.

Do not implement a basic text input that merely accepts numbers.

The component must automatically format large prices while the user types.

### Expected formatting

| User types | Displayed value |
| ---------- | --------------- |
| 1000       | 1.000           |
| 10000      | 10.000          |
| 100000     | 100.000         |
| 1000000    | 1.000.000       |
| 10000000   | 10.000.000      |
| 100000000  | 100.000.000     |
| 1000000000 | 1.000.000.000   |

Support very large values without breaking the input.

### Automatic formatting

Use Indonesian locale formatting:

`Intl.NumberFormat('id-ID')`

The user should not need to manually enter dots or commas.

Examples:

- Typing `100000` automatically displays `100.000`.
- Typing `1000000` automatically displays `1.000.000`.
- Typing `25000000` automatically displays `25.000.000`.

### Decimal and separator handling

Handle:

- Dots (`.`).
- Commas (`,`).
- Spaces.
- Currency symbols.
- Pasted formatted numbers.

Since this is an Indonesian Rupiah price field, the primary representation should be whole Rupiah values with thousands separators.

Examples of pasted values that should be interpreted correctly:

- `1.000.000`
- `1,000,000`
- `Rp 1.000.000`
- `Rp1,000,000`
- `1000000`

Normalize them into one canonical numeric value.

Do not accidentally interpret a thousands separator as a decimal separator.

Do not allow invalid characters or negative prices.

### Cursor and typing behavior

This is critical.

When formatting the value after each keystroke:

- Preserve the cursor position.
- Do not move the caret unexpectedly to the end.
- Do not cause flickering.
- Do not interrupt typing.
- Support inserting and deleting digits in the middle of the value.
- Handle backspace correctly around formatting separators.
- Support pasting values.
- Avoid unnecessary component re-renders.

Test on actual Android devices, not only simulators.

### Numeric storage

Never store the formatted display string as the authoritative price value.

Maintain two representations:

1. Display value: `1.000.000`
2. Canonical value: `1000000`

Use the existing backend's expected numeric representation.

Do not change the database schema unnecessarily.

Perform appropriate validation before submission.

### Currency presentation

Display `Rp` as a fixed prefix outside the editable numeric value.

Example:

`Rp  [ 1.000.000 ]`

Do not require the user to type `Rp` manually.

### Price options

Support two existing business scenarios:

- Enter a starting price.
- Contact for quotation.

If the technician selects Contact for quotation, hide or disable the numeric input and preserve the existing quotation behavior.

Do not force technicians to enter prices.

### Suggested component architecture

Create a reusable component following existing project conventions:

`components/post/PriceInput.tsx`

Possible responsibilities:

- Formatting.
- Parsing.
- Input sanitization.
- Cursor management.
- Validation.
- Canonical numeric value management.

Keep formatting logic separate and testable.

## 6. Photo Attachments

Improve the existing attachment interface.

Requirements:

- Display attached image thumbnails.
- Add an Add Photos action.
- Allow removing attachments.
- Allow previewing images.
- Display attachment count.
- Preserve existing upload functionality.
- Preserve already-uploaded images when editing posts.

Do not break existing media handling.

## 7. Location and Audience

Use compact, clearly labeled controls.

Location:

- Display the currently selected service area.
- Allow changing location using the existing location picker.
- Preserve existing location behavior.

Audience:

- Display the existing visibility setting.
- Example: Anyone can view & reply.
- Make the control independently clickable.

## 8. Header and Publishing

Header:

- Cancel on the left.
- Create Post or Edit Post centered.
- Publish button on the right.

The Publish button should:

- Reflect loading state.
- Prevent duplicate submissions.
- Respect existing validation.
- Show appropriate errors.
- Close or navigate appropriately after successful submission.

Do not claim success before the backend confirms it.

## 9. Editing Existing Posts

Editing must be handled carefully.

When editing:

- Load the existing post type.
- Load the existing description.
- Load the existing service title.
- Load the existing price.
- Load the existing location.
- Load existing attachments.
- Load audience visibility.

For a stored numeric price of `1000000`, display `1.000.000`.

Saving without changing the price must not modify its value.

Do not convert a bookable post into a community post or vice versa accidentally.

## 10. Keyboard and Mobile UX

Optimize for Android first while maintaining iOS compatibility.

Test:

- Numeric keyboard for price input.
- Text keyboard for descriptions.
- Keyboard opening and closing.
- Automatic scrolling to focused inputs.
- Safe area handling.
- Input visibility when the keyboard is open.
- No unwanted layout jumps.
- Correct bottom navigation and status bar behavior.

Use an appropriate numeric keyboard for the price field.

## 11. Testing Requirements

Specifically test the price formatter with:

- 0
- 1
- 100
- 1,000
- 10,000
- 100,000
- 1,000,000
- 10,000,000
- 100,000,000
- 1,000,000,000
- 1,000,000,000,000

Also test:

- Typing digit by digit.
- Deleting digits.
- Editing the middle of a number.
- Pasting numbers with dots.
- Pasting numbers with commas.
- Pasting values containing `Rp`.
- Empty input.
- Invalid characters.
- Saving and reopening an existing post.
- Contact for quotation mode.

Ensure that the displayed value, canonical value, and saved backend value remain

---

One more thing:
on the top we have our profile, and on the post we have our profile great, but they're not aligned the profile on the top its a little to the right when scroll they do not match or aligned fix it, i belive the top profile must move ot the left i assume
