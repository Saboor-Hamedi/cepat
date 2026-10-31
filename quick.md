Here is the complete, production-ready feature prompt you can copy and give directly to your coding agent:

---

# Feature Specification: Modern Profile Redesign (X.com & Facebook Style Architecture)

## 1. Objective

Refactor and redesign the Technician Profile (`src/app/technician/[id].tsx` and `src/profile/`) to follow the visual polish and modular architecture of modern social platforms like X.com and Facebook.

Replace the outdated vertical stack of empty text sections with a sticky horizontal tab system, an elevated cover and avatar header, an inline X-style post composer, and a discreet ellipsis (`...`) post-action menu.

---

## 2. Core Layout & Visual Specifications

### 2.1 Cover Banner & Header Navigation

- **Gradient / Custom Cover:** Replace the flat background with an emerald-and-slate gradient cover (`h-44`, `bg-gradient-to-br from-emerald-900 to-slate-900`) with safe-area top padding.
- **Header Actions:**
- **Top-Left:** Minimal circular frosted-glass Back button (`<`) navigating to previous route.
- **Top-Right (Owner only):** Frosted-glass pill button **"Edit Cover"** with camera icon, triggering image selection.

### 2.2 Avatar & Identity Row

- **Overlapping Avatar:** Circular profile avatar overlapping the bottom edge of the cover banner (`-mt-14`).
- If `isOwner === true`: Avatar displays a camera badge on the bottom-right. Tapping triggers a sleek bottom sheet menu (**Ambil Foto dari Kamera**, **Pilih dari Galeri Perangkat**, **Batal**).
- If `isOwner === false`: Avatar is read-only with no badge or tap popup.

- **Top Action Buttons (Aligned right of avatar):**
- **Owner:** Outlined pill button **"Edit Profile"** (`border-slate-300`) and optional dark pill **"Admin Console"**.
- **Public Visitor:** Solid emerald pill button **"Book Service"** (`bg-emerald-700 text-white`).

- **Name & Badges:**
- Display name in bold (`text-xl font-bold text-slate-900`) with a green verified partner badge.
- Specialty subtitle (e.g., _"Spesialis Servis Rumah Tangga & AC"_).
- Short professional bio with line-clamp/expand support.

### 2.3 Consolidated Stats Strip

- **Replace the "No reviews yet" block:** Introduce a compact horizontal info strip:
- Star rating with count: `★ 5.0 (12 Ulasan)`
- Jobs completed: `24 Selesai`
- Primary location: `Jakarta Selatan`

- Render honest zero states when counts are zero (`★ 0.0 (0 Ulasan) • 0 Selesai`), never fake numbers.

---

## 3. Horizontal Sticky Tab Architecture

> **CRITICAL REFACTOR:**
> Eliminate the tall vertical stack of 5 empty sections (_About, Services, Coverage, Past Work, Customer Experience_). Replace them with sticky horizontal tabs.

Create sticky tab navigation (`sticky top-0 bg-white/95 backdrop-blur-md z-20 border-b border-slate-200`):

1. **Postingan (Posts)**
2. **Layanan (Services)**
3. **Portofolio (Portfolio)**
4. **Ulasan (Reviews)**
5. **Tentang (About)**

### Tab 1: Postingan (Posts)

- **Inline Composer (Owner Only):**
- Mini technician avatar on left (`w-9 h-9 rounded-full`).
- Auto-expanding multiline input: _"Bagikan info pekerjaan atau tips servis terbaru..."_.
- Bottom bar: Image attachment icon, character counter (`0/500`), and rounded **"Posting"** button with disabled/active states.
- Pre-upload image preview strip with remove (`×`) button.

- **Post Feed:**
- Render posts chronologically.
- Header shows avatar, author name, timestamp (e.g., _"2 jam yang lalu"_), and a subtle **3-dot menu (`...`)** on top-right.
- **Ellipsis Menu:** Contains **"Hapus Post"** (Delete) for the owner. **Do NOT use a full-width red "Delete" button.**
- Optional heart/like and comment counter footer.

### Tab 2: Layanan (Services)

- Cards showing service title, short description, estimated duration, and starting price in IDR (`Rp 85.000 / unit`).
- If `isOwner === true`, include an **"+ Tambah Layanan"** action button.
- If empty, display a clean empty-state card instead of plain text.

### Tab 3: Portofolio (Portfolio)

- Responsive 2-column photo grid of verified work with rounded corners (`rounded-xl`).
- Tapping a photo opens full-screen image viewer.
- If `isOwner === true`, include an **"+ Upload Foto"** action button.

### Tab 4: Ulasan (Reviews)

- Top rating breakdown card (average score, star distribution bar, total review count).
- List of verified customer review cards with reviewer name, star count, date, and review text.

### Tab 5: Tentang (About)

- Structured chips for supported service areas (`Jakarta Selatan`, `Kebayoran Baru`, `Cilandak`, etc.).
- Operational hours and working days.
- Verification and warranty policies.

---

## 4. UI Cleanups & Removals

- **Remove Floating Gear Icon (FAB):** Completely delete the floating blue gear button from the screen.
- **Remove Preview Banners:** Delete `PREVIEW · SAMPLE DATA` and `"This is a development example..."` notices.
- **Remove "Save Technician":** The top header must have only the `<` back arrow.
- **Zero Hardcoded Data:** Remove hardcoded mock names (`Rizky Pratama`, `Saboor`, etc.). Query real Supabase records or render clean empty states.

---

## 5. Component Breakdown (Keep all files < 1,000 lines)

```
src/components/profile/
├── ProfileCoverBanner.tsx       # Cover image, back arrow, edit cover button
├── ProfileIdentityHeader.tsx    # Avatar with camera badge, name, badges, Edit Profile button
├── ProfileStatsStrip.tsx        # Rating, completed jobs, location strip
├── ProfileTabBar.tsx            # Sticky horizontal tabs (Posts, Services, Portfolio, Reviews, About)
├── ProfileAvatarModal.tsx       # Sleek bottom sheet for Camera / Gallery selection
├── tabs/
│   ├── ProfilePostsTab.tsx      # X-style composer + feed with 3-dot dropdown
│   ├── ProfileServicesTab.tsx   # Service cards + add service action
│   ├── ProfilePortfolioTab.tsx  # 2-column photo grid + preview modal
│   ├── ProfileReviewsTab.tsx    # Summary score + review cards
│   └── ProfileAboutTab.tsx      # Coverage chips + working schedule

```

---

## 6. Acceptance Criteria

- [ ] Top header has clean gradient cover, Back button, and Edit Cover button (owner only).
- [ ] Tapping the avatar on own profile opens the sleek bottom sheet menu; public view has no popup.
- [ ] Horizontal tabs switch views smoothly without page reload or layout shift.
- [ ] Post composer allows typing, attaching images with pre-upload preview, and posting to feed.
- [ ] Post cards use a subtle 3-dot menu (`...`) for deletion; no raw red Delete buttons.
- [ ] All 5 tabs render clean cards or elegant empty states without long vertical stacks of text.
- [ ] Floating blue gear button and sample data banners are 100% removed.
- [ ] TypeScript check (`npx tsc --noEmit`) passes with 0 errors.

---
