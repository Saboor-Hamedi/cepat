Cepat — Unified Profile (Facebook / X Architecture), Jobs Hub & Critical Bug Fixes

MANDATORY AGENT DIRECTIVE:
STOP running or writing tests right now. Focus 100% on fixing the runtime bugs, removing every single piece of hardcoded mock data, unifying the Profile & Jobs architecture like Facebook / X.com, and wiring up the broken settings toggles.

1. Fix ExponentImagePicker.launchImageLibraryAsync Rejection Crash

Root Cause

ImagePicker.launchImageLibraryAsync and launchCameraAsync reject when permissions are not explicitly requested beforehand, when deprecated MediaTypeOptions are misused in newer Expo SDKs, or when simultaneous picker calls occur before a Modal finishes closing on Android.

Exact Implementation Pattern (src/components/profile/ProfileAvatar.tsx & TechnicianPostComposer.tsx)

Always close the action sheet / dropdown modal first and wait 150ms before invoking the native picker on Android/Xiaomi devices.

Explicitly request permissions and handle errors safely:

import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

export async function pickImageSafely(source: 'camera' | 'gallery'): Promise<string | null> {
try {
if (source === 'camera') {
const { status } = await ImagePicker.requestCameraPermissionsAsync();
if (status !== 'granted') {
Alert.alert('Izin Kamera Diperlukan', 'Aktifkan izin kamera di pengaturan perangkat Anda.');
return null;
}
const result = await ImagePicker.launchCameraAsync({
mediaTypes: ['images'],
allowsEditing: true,
aspect: [1, 1],
quality: 0.8,
});
if (result.canceled || !result.assets?.length) return null;
return result.assets[0].uri;
} else {
const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
if (status !== 'granted') {
Alert.alert('Izin Galeri Diperlukan', 'Aktifkan izin galeri untuk memilih foto.');
return null;
}
const result = await ImagePicker.launchImageLibraryAsync({
mediaTypes: ['images'],
allowsEditing: true,
aspect: [1, 1],
quality: 0.8,
});
if (result.canceled || !result.assets?.length) return null;
return result.assets[0].uri;
}
} catch (error) {
console.warn('ImagePicker error:', error);
Alert.alert('Gagal Memuat Foto', 'Terjadi kesalahan saat membuka galeri atau kamera. Coba lagi.');
return null;
}
}

Security & Validation on Selected Images

Validate file extension (jpg, jpeg, png, webp).

Enforce maximum file size (<= 5 MB) before uploading to Supabase Storage.

Never trust client-side paths without uploading to the authenticated user's folder ({user_id}/avatar.jpg or {user_id}/{post_id}.jpg).

2. Unified Facebook / X.com Profile Architecture (src/profile/)

Why the Agent Was Struggling

Previously, the app treated "Public Technician Profile", "Customer Profile", and "Technician Workspace" as disconnected screens with hardcoded fallback fixtures (Rizky Pratama, 136 jobs completed, etc.).

The Facebook / X.com Model (Single Unified Profile)

Every user (Customer or Technician) has a single unified profile screen structure:

isOwner = currentUser?.id === profileUserId

When isOwner === true (Viewing Your Own Profile):

Avatar has editable={true} (tapping opens the sleek Camera / Gallery bottom sheet).

Edit Profile button is visible.

Inline X.com Post Composer (TechnicianPostComposer) is visible right above the Posts feed.

Each post card displays a Delete menu option for the owner.

Technician sees their Jobs / Pesanan management tabs directly integrated or accessible without dummy banners.

When isOwner === false (Public Visitor Viewing Profile):

Exact same visual header, bio, stats, and chronological Posts feed.

Avatar has editable={false} (tapping does NOT open upload menu).

Post composer is completely hidden.

Edit/Delete buttons are completely hidden.

Sticky "Book Now" bar is shown at the bottom (only when a customer views an approved technician).

Top Header Cleanup on Profile (src/app/technician/[id].tsx & src/profile/)

Remove "Technician profile" title from the top header bar.

Remove "Save technician" button from the top header bar.

Top bar must ONLY show the Back Button (<) when navigated to from Marketplace/Search.

Delete all preview/sample banners:

Delete PREVIEW · SAMPLE DATA badge.

Delete "This is a development example. Ratings, services, and availability are not real."

Delete "Sample status · availability is not confirmed".

3. Complete Removal of All Hardcoded Data

Remove 100% of hardcoded demo/fixture data across the entire runtime app:

Delete hardcoded technician profiles (Rizky Pratama, Rizky Plumbing, Pipe and leak specialist, 4.9 (48 reviews), 8 years of experience, 136 jobs completed).

Delete hardcoded job requests (Saboor, Perbaikan pipa, IDR 125,000, 2026-11-02 09:00 WIB).

Delete hardcoded services (Pipe repair, Blocked drain, IDR 100,000 by Rizky Plumbing) from the Marketplace homepage if they do not come from real Supabase rows.

Rule: Query real Supabase tables (profiles, technician_profiles, technician_posts, bookings, services). When a table has 0 rows or a user is brand new, render honest values (0 reviews, 0 jobs completed, or a clean empty state like "Belum ada postingan" / "No posts yet"). Never fall back to fake demo records in the app UI.

4. Replace "Workspace" with Modular src/jobs/ Architecture

Rename & Reorganize

Rename "Workspace" in the navigation bar and screens to "Jobs" (EN) / "Pekerjaan" (ID).

Create a dedicated folder src/jobs/ with separated components (strictly under 1,000 lines per file):

src/jobs/
├── JobsContainer.tsx # Main Jobs screen with unified pill tabs
├── components/
│ ├── JobsTabBar.tsx # Uses the EXACT same tab styling as Settings
│ ├── JobRequestCard.tsx # Incoming customer job request (Accept / Decline / Propose Time)
│ ├── JobActiveCard.tsx # Accepted & ongoing jobs with chat & completion actions
│ ├── JobHistoryCard.tsx # Completed or cancelled jobs
│ └── JobProposeTimeModal.tsx # Clean date/time proposal modal
└── index.ts

Unify Tab Styling between Jobs and Settings:

Remove the boxed outer border container around the tabs on the Jobs screen (Requests, Accepted Jobs, History).

Use the exact same horizontal pill-tab component and spacing used in SettingContainer.tsx so switching between Jobs and Settings feels identical and cohesive.

Remove "Posts (1)" Tab from Jobs:

Posts belong on the Profile screen (just like X.com / Facebook), NOT inside the Jobs management screen. Keep Jobs strictly focused on work requests (Requests, Active Jobs, History).

5. Fix Themes, Accessibility Toggles & Localization Glitches

5.1 Make Theme, Larger Text & Reduce Motion Actually Work

Create or update src/context/AppearanceContext.tsx (persisted via AsyncStorage):

themeMode: 'light' | 'dark' | 'system'

Resolve effective theme using React Native's useColorScheme() when set to 'system'.

Apply dark/light background, surface, text, and border tokens dynamically across all screens (SafeAreaView, cards, headers, inputs).

largeText: boolean

Multiply base font sizes by 1.15 (or apply scaled typography classes) across text components when enabled.

reduceMotion: boolean

Disable layout/screen transition animations and animated spinners/effects when reduceMotion === true.

5.2 Fix Raw Localization Keys on Password Tab (SettingPassword.tsx)

Replace raw key settings.passwordTitle with localized title:

EN: "Change Password"

ID: "Ubah Kata Sandi"

Replace raw key auth.newPassword with localized label & placeholder:

EN: "New Password" / "Enter new password"

ID: "Kata Sandi Baru" / "Masukkan kata sandi baru"

5.3 Remove Floating Blue Gear Button (FAB)

Locate and delete the floating circular gear button (⚙️) appearing at the bottom-right of Marketplace, Bookings, Jobs, and Profile screens.

6. Verification Checklist (On-Device Manual Check Before Any Tests)

Tap Avatar on own Profile → Bottom sheet opens → Select Gallery or Camera → Image loads cleanly with zero ExponentImagePicker rejection error.

Open Technician Profile → Only the < back button is in the header; zero Save technician, zero Technician profile title, zero PREVIEW · SAMPLE DATA banners, zero Rizky Pratama fake data.

Compare Jobs tabs and Settings tabs → Identical pill-tab layout with no mismatched outer border box.

Toggle Dark, Light, System, Larger readable text, and Reduce screen motion in Settings → UI immediately reflects the changes and persists across app reloads.

Open Settings → Password → All labels render clean human text (Change Password, New Password), with zero raw translation keys.
