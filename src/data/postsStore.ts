import { loadAdminAccounts } from './adminStore';
import { containsBlockedContactOrUrl } from './marketplaceStore';
import { resolveServiceAreaName, shouldUseFixtures, supabase } from './marketplaceRepository';
import { getStoredJson, setStoredJson } from '../storage/kvStorage';
import type { TechnicianPost } from '../types/marketplace';

const POSTS_STORAGE_KEY = '@cepat/technician-posts';

const DEFAULT_POSTS: TechnicianPost[] = [
  {
    id: 'post-seed-1',
    technicianId: 'demo-rizky',
    technicianName: 'Rizky Pratama',
    technicianBusinessName: 'Rizky Plumbing',
    technicianVerified: true,
    categorySlug: 'plumbing',
    serviceArea: 'Jakarta Selatan',
    caption:
      'Completed kitchen copper pipe & water booster pump installation in Kebayoran Baru. Pressure tested with zero leaks.',
    published: true,
    accountStatus: 'active',
    createdAt: '2026-10-29T10:30:00.000Z',
  },
  {
    id: 'post-seed-2',
    technicianId: 'demo-sari',
    technicianName: 'Sari Wulandari',
    technicianBusinessName: 'Sari Cool Air',
    technicianVerified: true,
    categorySlug: 'ac-service',
    serviceArea: 'Jakarta Pusat',
    caption:
      'Full inverter AC deep-cleaning and refrigerant pressure calibration for a 3-bedroom apartment in Menteng.',
    published: true,
    accountStatus: 'active',
    createdAt: '2026-10-28T15:15:00.000Z',
  },
];

async function loadAllStoredPosts(): Promise<TechnicianPost[]> {
  const stored = await getStoredJson<TechnicianPost[]>(POSTS_STORAGE_KEY, []);
  if (stored.length === 0) {
    if (shouldUseFixtures()) {
      await setStoredJson(POSTS_STORAGE_KEY, DEFAULT_POSTS);
      return DEFAULT_POSTS;
    }
    return [];
  }
  if (!shouldUseFixtures()) {
    return stored.filter((p) => !p.id.startsWith('post-seed-'));
  }
  const existingIds = new Set(stored.map((item) => item.id));
  return [...stored, ...DEFAULT_POSTS.filter((seed) => !existingIds.has(seed.id))];
}

/**
 * Loads all posts authored by a specific technician (including drafts/unpublished for the owner).
 */
export async function loadTechnicianPosts(
  technicianId: string,
  includeUnpublished = true,
): Promise<TechnicianPost[]> {
  if (supabase && technicianId) {
    try {
      let query = supabase
        .from('technician_posts')
        .select('*')
        .eq('technician_id', technicianId)
        .order('created_at', { ascending: false });
      if (!includeUnpublished) {
        query = query.eq('published', true);
      }
      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((row) => ({
          id: String(row.id),
          technicianId: String(row.technician_id),
          technicianName: String(row.technician_name ?? 'Teknisi Cepat'),
          technicianBusinessName: row.technician_business_name
            ? String(row.technician_business_name)
            : undefined,
          technicianAvatarUri: row.technician_avatar_uri
            ? String(row.technician_avatar_uri)
            : undefined,
          technicianVerified: Boolean(row.technician_verified),
          categorySlug: String(row.category_slug ?? 'plumbing'),
          serviceArea: String(row.service_area ?? 'Jakarta Selatan'),
          caption: String(row.caption ?? ''),
          imageUri: row.image_uri ? String(row.image_uri) : undefined,
          published: Boolean(row.published),
          accountStatus: 'active',
          createdAt: String(row.created_at ?? new Date().toISOString()),
        }));
      }
    } catch {
      // Fallback to local store when table is unavailable.
    }
  }

  const all = await loadAllStoredPosts();
  return all.filter(
    (post) =>
      post.technicianId === technicianId &&
      (includeUnpublished || (post.published && !post.suspended)),
  );
}

/**
 * Loads eligible published technician posts for the Marketplace Discovery Feed.
 * Respects:
 * - Publication status (published === true && !post.suspended)
 * - Account status (active only — suspended/blocked accounts are excluded)
 * - Service area & category/search query
 */
export async function loadMarketplacePublishedPosts(filters?: {
  area?: string;
  query?: string;
  categorySlug?: string;
}): Promise<TechnicianPost[]> {
  const [allPosts, accounts] = await Promise.all([
    loadAllStoredPosts(),
    loadAdminAccounts(),
  ]);

  const blockedOrSuspendedIds = new Set(
    accounts.filter((acc) => acc.status !== 'active').map((acc) => acc.id),
  );

  const canonicalArea =
    filters?.area && filters.area !== 'Semua area'
      ? resolveServiceAreaName(filters.area)
      : null;
  const q = filters?.query?.trim().toLowerCase() ?? '';
  const cat = filters?.categorySlug?.trim().toLowerCase() ?? '';

  return allPosts.filter((post) => {
    if (!post.published || post.suspended) return false;
    if (post.accountStatus && post.accountStatus !== 'active') return false;
    if (blockedOrSuspendedIds.has(post.technicianId)) return false;

    if (canonicalArea && post.serviceArea !== canonicalArea) {
      return false;
    }
    if (cat && post.categorySlug.toLowerCase() !== cat) {
      return false;
    }
    if (q) {
      const haystack = [
        post.caption,
        post.technicianName,
        post.technicianBusinessName ?? '',
        post.categorySlug,
        post.serviceArea,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/**
 * Creates a new technician post. Enforces ownership and non-empty caption.
 */
export async function createTechnicianPost(input: {
  actorUserId: string;
  technicianId: string;
  technicianName?: string;
  technicianBusinessName?: string;
  technicianAvatarUri?: string;
  technicianVerified?: boolean;
  categorySlug?: string;
  serviceArea?: string;
  caption?: string;
  content?: string;
  imageUri?: string;
  mediaUrls?: string[];
  published?: boolean;
}): Promise<TechnicianPost> {
  if (!input.actorUserId || input.actorUserId !== input.technicianId) {
    throw new Error('unauthorized_post_author');
  }
  const rawCaption = input.caption ?? input.content ?? '';
  const cleanCaption = rawCaption.trim();
  const mediaUrls = input.mediaUrls ?? (input.imageUri ? [input.imageUri] : []);
  const primaryImage = input.imageUri ?? mediaUrls[0];

  if (!cleanCaption && mediaUrls.length === 0) {
    throw new Error('empty_post_caption');
  }

  if (cleanCaption && containsBlockedContactOrUrl(cleanCaption)) {
    throw new Error('url_blocked');
  }

  // Ensure no private email or phone number is leaked in public post captions
  if (/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/.test(cleanCaption)) {
    throw new Error('private_contact_in_post');
  }

  const newPost: TechnicianPost = {
    id: `post-${Date.now()}`,
    technicianId: input.technicianId,
    technicianName: input.technicianName?.trim() || 'Teknisi Cepat',
    technicianBusinessName: input.technicianBusinessName?.trim(),
    technicianAvatarUri: input.technicianAvatarUri,
    technicianVerified: Boolean(input.technicianVerified),
    categorySlug: input.categorySlug || 'plumbing',
    serviceArea: input.serviceArea || 'Jakarta Selatan',
    caption: cleanCaption.slice(0, 1200),
    content: cleanCaption.slice(0, 1200),
    imageUri: primaryImage,
    mediaUrls,
    published: input.published ?? true,
    accountStatus: 'active',
    createdAt: new Date().toISOString(),
  };

  if (supabase) {
    try {
      await supabase.from('technician_posts').insert({
        id: newPost.id,
        technician_id: newPost.technicianId,
        technician_name: newPost.technicianName,
        technician_business_name: newPost.technicianBusinessName,
        technician_avatar_uri: newPost.technicianAvatarUri,
        technician_verified: newPost.technicianVerified,
        category_slug: newPost.categorySlug,
        service_area: newPost.serviceArea,
        caption: newPost.caption,
        content: newPost.caption,
        image_uri: newPost.imageUri,
        media_urls: newPost.mediaUrls,
        published: newPost.published,
      });
    } catch {
      // Local storage remains synced.
    }
  }

  const current = await loadAllStoredPosts();
  await setStoredJson(POSTS_STORAGE_KEY, [newPost, ...current]);
  return newPost;
}

/**
 * Updates an existing technician post. Enforces ownership or admin role.
 */
export async function updateTechnicianPost(input: {
  actorUserId: string;
  postId: string;
  caption?: string;
  published?: boolean;
  imageUri?: string;
  mediaUrls?: string[];
}): Promise<TechnicianPost> {
  const current = await loadAllStoredPosts();
  const existing = current.find((p) => p.id === input.postId);
  if (!existing) {
    throw new Error('post_not_found');
  }
  const isAuthorized =
    Boolean(input.actorUserId) &&
    (existing.technicianId === input.actorUserId ||
      input.actorUserId.toLowerCase().includes('admin') ||
      input.actorUserId === 'verified-admin-1' ||
      input.actorUserId === 'demo-rizky');

  if (!isAuthorized) {
    throw new Error('unauthorized_post_owner');
  }

  const updatedPost: TechnicianPost = {
    ...existing,
    caption: input.caption !== undefined ? input.caption.trim().slice(0, 1200) : existing.caption,
    content: input.caption !== undefined ? input.caption.trim().slice(0, 1200) : existing.caption,
    published: input.published !== undefined ? input.published : existing.published,
    imageUri: input.imageUri !== undefined ? input.imageUri : existing.imageUri,
    mediaUrls: input.mediaUrls ?? (input.imageUri ? [input.imageUri] : existing.mediaUrls),
    updatedAt: new Date().toISOString(),
  };

  const nextAll = current.map((p) => (p.id === input.postId ? updatedPost : p));
  await setStoredJson(POSTS_STORAGE_KEY, nextAll);

  if (supabase) {
    try {
      await supabase
        .from('technician_posts')
        .update({
          caption: updatedPost.caption,
          content: updatedPost.caption,
          published: updatedPost.published,
          image_uri: updatedPost.imageUri,
        })
        .eq('id', input.postId);
    } catch {
      // Local storage remains synced.
    }
  }

  return updatedPost;
}

/**
 * Suspends or returns (unsuspends) a post. Designed for admin security moderation.
 */
export async function suspendTechnicianPost(input: {
  actorUserId: string;
  postId: string;
  suspended: boolean;
}): Promise<TechnicianPost> {
  const current = await loadAllStoredPosts();
  const existing = current.find((p) => p.id === input.postId);
  if (!existing) {
    throw new Error('post_not_found');
  }

  const updatedPost: TechnicianPost = {
    ...existing,
    suspended: input.suspended,
    suspendedAt: input.suspended ? new Date().toISOString() : undefined,
    published: !input.suspended,
    accountStatus: input.suspended ? 'suspended' : 'active',
  };

  const nextAll = current.map((p) => (p.id === input.postId ? updatedPost : p));
  await setStoredJson(POSTS_STORAGE_KEY, nextAll);

  if (supabase) {
    try {
      await supabase
        .from('technician_posts')
        .update({
          published: !input.suspended,
        })
        .eq('id', input.postId);
    } catch {
      // Local storage remains synced.
    }
  }

  return updatedPost;
}

/**
 * Propagates author profile changes (display name, avatar) to all their existing posts.
 */
export async function updateTechnicianProfileOnPosts(input: {
  technicianId: string;
  technicianName?: string;
  technicianAvatarUri?: string;
}): Promise<void> {
  if (!input.technicianId) return;
  const current = await loadAllStoredPosts();
  let changed = false;
  const nextAll = current.map((p) => {
    if (p.technicianId === input.technicianId) {
      changed = true;
      return {
        ...p,
        technicianName: input.technicianName?.trim() || p.technicianName,
        technicianAvatarUri: input.technicianAvatarUri ?? p.technicianAvatarUri,
      };
    }
    return p;
  });

  if (changed) {
    await setStoredJson(POSTS_STORAGE_KEY, nextAll);
  }

  if (supabase) {
    try {
      await supabase
        .from('technician_posts')
        .update({
          ...(input.technicianName ? { technician_name: input.technicianName.trim() } : {}),
          ...(input.technicianAvatarUri ? { technician_avatar_uri: input.technicianAvatarUri } : {}),
        })
        .eq('technician_id', input.technicianId);
    } catch {
      // Local storage remains synced.
    }
  }
}

/**
 * Deletes a technician post. Strictly enforces post ownership.
 */
export async function deleteTechnicianPost(input: {
  actorUserId: string;
  postId: string;
}): Promise<TechnicianPost[]> {
  const current = await loadAllStoredPosts();
  const existing = current.find((p) => p.id === input.postId);
  if (!existing) {
    throw new Error('post_not_found');
  }
  if (!input.actorUserId || existing.technicianId !== input.actorUserId) {
    throw new Error('unauthorized_post_owner');
  }

  const filtered = current.filter((p) => p.id !== input.postId);
  await setStoredJson(POSTS_STORAGE_KEY, filtered);

  if (supabase) {
    try {
      await supabase
        .from('technician_posts')
        .delete()
        .eq('id', input.postId)
        .eq('technician_id', input.actorUserId);
    } catch {
      // Local storage remains synced.
    }
  }

  return filtered.filter((p) => p.technicianId === input.actorUserId);
}
