// Profile avatar accent colors.
//
// A single source of truth for the 10 accent colors the user can pick for the
// round ring around their profile image. Kept independent from the app's color
// palettes on purpose: the accent is a personal choice, not a theme token.

export interface ProfileAccent {
  // Stable id persisted to storage; safe to use in testIDs.
  id: string;
  // Hex applied directly as the 3px ring border color.
  color: string;
  // Localized labels shown in the picker UI.
  labelId: string;
  labelEn: string;
}

// The ring stroke width in dp. The user-facing spec is a 3px thick round border.
export const PROFILE_ACCENT_RING_WIDTH = 3;

// Default state: no accent at all (avatar renders without a ring).
export const DEFAULT_PROFILE_ACCENT_ID = "none";

export const PROFILE_ACCENTS: readonly ProfileAccent[] = [
  { id: "emerald", color: "#10B981", labelId: "Zamrud", labelEn: "Emerald" },
  { id: "teal", color: "#14B8A6", labelId: "Hijau Kebiruan", labelEn: "Teal" },
  { id: "sky", color: "#0EA5E9", labelId: "Biru Langit", labelEn: "Sky" },
  { id: "indigo", color: "#6366F1", labelId: "Nila", labelEn: "Indigo" },
  { id: "violet", color: "#8B5CF6", labelId: "Ungu", labelEn: "Violet" },
  { id: "fuchsia", color: "#D946EF", labelId: "Fuchsia", labelEn: "Fuchsia" },
  { id: "rose", color: "#F43F5E", labelId: "Rose", labelEn: "Rose" },
  { id: "amber", color: "#F59E0B", labelId: "Amber", labelEn: "Amber" },
  { id: "orange", color: "#F97316", labelId: "Oranye", labelEn: "Orange" },
  { id: "lime", color: "#84CC16", labelId: "Nipis", labelEn: "Lime" },
];

// Resolves a persisted accent id to its color entry.
// Returns null for "none", unknown ids, or missing values so callers can
// simply skip rendering the ring.
export function resolveProfileAccent(
  id: string | null | undefined,
): ProfileAccent | null {
  if (!id || id === DEFAULT_PROFILE_ACCENT_ID) return null;
  return PROFILE_ACCENTS.find((accent) => accent.id === id) ?? null;
}
