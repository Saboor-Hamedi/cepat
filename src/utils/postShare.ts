import type { Post } from '../types/post';

export const CEPAT_SHARE_ORIGIN = 'https://cepat.id';

const SENSITIVE_QUERY_KEYS = new Set([
  'token',
  'access_token',
  'refresh_token',
  'id_token',
  'auth',
  'apikey',
  'api_key',
  'key',
  'secret',
  'sig',
  'signature',
  'jwt',
  'session',
  'password',
  'fbclid',
  'gclid',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
]);

/**
 * Sanitizes a post ID to only safe URL path characters.
 */
export function sanitizePostId(rawId: string): string {
  const cleaned = String(rawId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 80);
  return cleaned || 'post';
}

/**
 * Builds a clean, canonical, HTTPS-only share URL for a post with zero tracking or auth parameters.
 */
export function buildSecurePostShareUrl(postId: string): string {
  const cleanId = sanitizePostId(postId);
  return `${CEPAT_SHARE_ORIGIN}/post/${encodeURIComponent(cleanId)}`;
}

/**
 * Validates and cleans an image URI for social sharing.
 * Strips any sensitive or tracking query parameters from HTTPS URLs and blocks unsafe schemes.
 */
export function sanitizeShareImageUrl(rawUri?: string | null): string | undefined {
  if (!rawUri || typeof rawUri !== 'string') return undefined;
  const trimmed = rawUri.trim();
  if (!trimmed) return undefined;

  // Reject dangerous schemes
  if (/^(javascript|vbscript|data):/i.test(trimmed)) {
    return undefined;
  }

  // Allow safe local device media URIs for native OS share sheet
  if (/^(file|content|ph):\/\//i.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') {
      return undefined;
    }
    if (parsed.username || parsed.password) {
      return undefined;
    }
    parsed.hash = '';
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        parsed.searchParams.delete(key);
      }
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

/**
 * Verifies that a share link is strictly HTTPS, free of credentials, and free of sensitive tokens.
 */
export function isSecureShareUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export function formatCompactCount(count?: number): string {
  const num = typeof count === 'number' && Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  if (num < 1000) return String(num);
  if (num < 1_000_000) {
    const k = num / 1000;
    return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')}K`;
  }
  const m = num / 1_000_000;
  return `${m.toFixed(1).replace(/\.0$/, '')}M`;
}

export interface PostSharePayload {
  title: string;
  summaryText: string;
  fullShareMessage: string;
  cleanUrl: string;
  cleanImageUrl?: string;
  whatsappUrl: string;
  facebookUrl: string;
  twitterUrl: string;
  telegramUrl: string;
}

export function buildPostSharePayload(
  post: Post,
  language: 'id' | 'en',
  priceLabel?: string,
): PostSharePayload {
  const cleanUrl = buildSecurePostShareUrl(post.id);
  const rawImage =
    post.imageUri || (post.mediaUrls && post.mediaUrls[0]) || undefined;
  const cleanImageUrl = sanitizeShareImageUrl(rawImage);

  const authorName = (post.technicianBusinessName || post.technicianName || 'Teknisi Cepat').trim();
  const rawCaption = (post.content || post.caption || '').trim();
  const snippet =
    rawCaption.length > 180 ? `${rawCaption.slice(0, 177)}...` : rawCaption;

  const title =
    language === 'en'
      ? `${authorName} on Cepat (${post.serviceArea})`
      : `${authorName} di Cepat (${post.serviceArea})`;

  const lines: string[] = [
    `🔧 *${authorName}* — ${post.serviceArea}`,
  ];
  if (snippet) {
    lines.push(`"${snippet}"`);
  }
  if (priceLabel) {
    lines.push(
      language === 'en'
        ? `Starting from: ${priceLabel}`
        : `Mulai dari: ${priceLabel}`,
    );
  }
  if (cleanImageUrl && cleanImageUrl.startsWith('https://')) {
    lines.push(
      language === 'en'
        ? `📸 Photo: ${cleanImageUrl}`
        : `📸 Foto: ${cleanImageUrl}`,
    );
  }
  lines.push(
    language === 'en'
      ? `🔗 View verified post: ${cleanUrl}`
      : `🔗 Lihat postingan terverifikasi: ${cleanUrl}`,
  );

  const summaryText = snippet
    ? `${authorName} (${post.serviceArea}): ${snippet}`
    : `${authorName} (${post.serviceArea})`;
  const fullShareMessage = lines.join('\n\n');

  const encodedMessage = encodeURIComponent(fullShareMessage);
  const encodedUrl = encodeURIComponent(cleanUrl);
  const encodedSummary = encodeURIComponent(
    cleanImageUrl && cleanImageUrl.startsWith('https://')
      ? `${summaryText}\n📸 ${cleanImageUrl}`
      : summaryText,
  );

  return {
    title,
    summaryText,
    fullShareMessage,
    cleanUrl,
    cleanImageUrl,
    whatsappUrl: `https://wa.me/?text=${encodedMessage}`,
    facebookUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedSummary}`,
    twitterUrl: `https://twitter.com/intent/tweet?text=${encodedSummary}&url=${encodedUrl}`,
    telegramUrl: `https://t.me/share/url?url=${encodedUrl}&text=${encodedSummary}`,
  };
}
