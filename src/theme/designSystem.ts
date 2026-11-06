import { font } from './typography';
import { radii, spacing } from './tokens';

/**
 * Unified Design System tokens for Cepat's high-scale social marketplace.
 * Ensures 100% visual consistency across Marketplace, Technician Profile,
 * Search Results, Compose Modal, and ScreenWrappers.
 */
export const layoutTokens = {
  maxFeedWidth: 780,
  maxModalWidth: 520,
  screenPaddingX: spacing.lg,
  feedPaddingX: 14,
  postAvatarSize: 42,
  composerAvatarSize: 36,
  carouselBorderRadius: 14,
  carouselPortraitRatio: 0.86,
  carouselLandscapeRatio: 0.62,
  carouselMinHeight: 220,
} as const;

export const postSpacing = {
  cardPaddingX: 14,
  cardPaddingY: 14,
  avatarColumnWidth: 42,
  avatarToBodyGap: 12,
  headerToBodyGap: 6,
  captionToMediaGap: 10,
  bodyToFooterGap: 10,
  footerMetricGap: 12,
  footerActionGap: 6,
  carouselDotsTopGap: 8,
  carouselDotsGap: 5,
} as const;

export const postTypography = {
  authorName: {
    fontSize: font.title,
    fontWeight: '800' as const,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  authorSub: {
    fontSize: font.caption,
    fontWeight: '500' as const,
    lineHeight: 15,
  },
  timeAgo: {
    fontSize: font.caption,
    fontWeight: '500' as const,
    lineHeight: 15,
  },
  serviceCategory: {
    fontSize: font.label,
    fontWeight: '700' as const,
    lineHeight: 18,
  },
  caption: {
    fontSize: font.subtitle,
    fontWeight: '400' as const,
    lineHeight: 21,
  },
  price: {
    fontSize: font.title,
    fontWeight: '800' as const,
    lineHeight: 20,
  },
  priceUnit: {
    fontSize: font.caption,
    fontWeight: '600' as const,
    lineHeight: 15,
  },
  metricCount: {
    fontSize: font.caption,
    fontWeight: '700' as const,
    lineHeight: 15,
  },
  counterBadge: {
    fontSize: font.caption,
    fontWeight: '800' as const,
    letterSpacing: 0.3,
  },
} as const;

export const postRadii = {
  card: 14,
  media: 14,
  thumbnail: radii.md,
  pill: 999,
} as const;

const MAX_CAROUSEL_IMAGES = 10;

/**
 * Validates that a media URI uses a safe protocol and is not a script/injection vector.
 */
export function isSafeMediaUri(uri: unknown): uri is string {
  if (typeof uri !== 'string') return false;
  const trimmed = uri.trim();
  if (!trimmed || trimmed.length > 65536) return false;
  if (/^(javascript|vbscript|data:text)/i.test(trimmed)) return false;
  if (/^(https?:\/\/|file:\/\/|content:\/\/|ph:\/\/|assets-library:\/\/)/i.test(trimmed)) {
    return true;
  }
  if (/^data:image\/(jpeg|jpg|png|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(trimmed)) {
    return true;
  }
  return false;
}

/**
 * Sanitizes and deduplicates an array of media URIs while preserving order.
 */
export function sanitizeMediaUris(rawUris: readonly string[]): string[] {
  const result: string[] = [];
  for (const candidate of rawUris) {
    if (isSafeMediaUri(candidate)) {
      result.push(candidate.trim());
      if (result.length >= MAX_CAROUSEL_IMAGES) break;
    }
  }
  return result;
}
