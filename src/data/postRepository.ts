import { supabase } from './marketplaceRepository';
import {
  createPost as createStorePost,
  deletePost as deleteStorePost,
  hasUserLikedPost,
  incrementPostShare,
  loadPosts as loadStorePosts,
  recordPostView,
  togglePostLike,
  updatePost as updateStorePost,
} from './postsStore';
import type {
  CreatePostInput,
  FetchPostsOptions,
  PaginatedPostsResult,
  Post,
  UpdatePostInput,
} from '../types/post';
import {
  MAX_IMAGE_FILE_BYTES,
  validateStrictImageAsset,
} from '../utils/imageValidator';

export { hasUserLikedPost, incrementPostShare, recordPostView, togglePostLike };

const POSTS_STORAGE_BUCKET = 'technician-posts';

/**
 * Uploads media attachment to Supabase Storage in technician-posts bucket.
 * Path pattern: {technician_id}/{post_id}/{filename}
 */
export async function uploadPostMedia(
  technicianId: string,
  postId: string,
  file: {
    uri: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    base64?: string;
  },
): Promise<string> {
  if (!technicianId) {
    throw new Error('missing_technician_id');
  }

  if (file.fileSize && file.fileSize > MAX_IMAGE_FILE_BYTES) {
    throw new Error('file_too_large');
  }

  // Pre-upload validation
  const validation = validateStrictImageAsset({
    uri: file.uri,
    fileName: file.fileName,
    fileSize: file.fileSize,
    mimeType: file.mimeType,
  });

  if (!validation.valid) {
    if (validation.errorCode === 'FILE_TOO_LARGE') {
      throw new Error('file_too_large');
    }
    throw new Error(validation.errorMessageEn ?? 'Invalid image file.');
  }

  const sanitizedFileName = (file.fileName || `media-${Date.now()}.jpg`).replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${technicianId}/${postId}/${sanitizedFileName}`;

  if (supabase?.storage) {
    try {
      let body: Blob | Uint8Array | string = file.uri;
      if (typeof fetch === 'function' && file.uri.startsWith('blob:')) {
        const resp = await fetch(file.uri);
        body = await resp.blob();
      }

      const { data, error } = await supabase.storage
        .from(POSTS_STORAGE_BUCKET)
        .upload(storagePath, body as never, {
          contentType: file.mimeType || 'image/jpeg',
          upsert: true,
        });

      if (error) {
        throw new Error(`upload_failed: ${error.message}`);
      }

      if (data?.path) {
        const { data: publicData } = supabase.storage
          .from(POSTS_STORAGE_BUCKET)
          .getPublicUrl(data.path);
        if (publicData?.publicUrl) {
          return publicData.publicUrl;
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith('upload_failed')) {
        throw err;
      }
      // If network fails or supabase unavailable in test environment without custom mock
      throw new Error(err instanceof Error ? err.message : 'upload_failed');
    }
  }

  // Fallback to local URI
  return file.uri;
}

/**
 * Retrieves technician posts ordered by created_at DESC with pagination.
 */
export async function fetchPosts(
  options: FetchPostsOptions = {},
): Promise<PaginatedPostsResult> {
  const {
    technicianId = '',
    page = 1,
    pageSize = 10,
    includeUnpublished = true,
  } = options;

  let allPosts: Post[] = [];

  if (supabase && technicianId) {
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('technician_posts')
        .select('*', { count: 'exact' })
        .eq('technician_id', technicianId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (!includeUnpublished) {
        query = query.eq('published', true);
      }

      const { data, error, count } = await query;

      if (!error && Array.isArray(data)) {
        allPosts = data.map((row) => ({
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
          caption: String(row.content || row.caption || ''),
          content: String(row.content || row.caption || ''),
          imageUri: row.image_uri ? String(row.image_uri) : undefined,
          mediaUrls: row.image_uri
            ? [String(row.image_uri)]
            : Array.isArray(row.media_urls)
              ? row.media_urls.map(String)
              : [],
          isServicePost: Boolean(row.is_service_post),
          likeCount: typeof row.like_count === 'number' ? row.like_count : Number(row.like_count ?? 0) || 0,
          viewCount: typeof row.view_count === 'number' ? row.view_count : Number(row.view_count ?? 0) || 0,
          shareCount: typeof row.share_count === 'number' ? row.share_count : Number(row.share_count ?? 0) || 0,
          published: Boolean(row.published),
          accountStatus: 'active',
          createdAt: String(row.created_at ?? new Date().toISOString()),
        }));

        const total = count ?? allPosts.length;
        return {
          items: allPosts,
          page,
          pageSize,
          hasMore: from + allPosts.length < total,
          total,
        };
      }
    } catch {
      // Fall through to local store fallback
    }
  }

  // Fallback to local store
  const stored = await loadStorePosts(technicianId, includeUnpublished);
  const startIndex = (page - 1) * pageSize;
  const pageItems = stored.slice(startIndex, startIndex + pageSize);

  return {
    items: pageItems,
    page,
    pageSize,
    hasMore: startIndex + pageItems.length < stored.length,
    total: stored.length,
  };
}

/**
 * Creates a technician post, validating content and uploading media attachments if necessary.
 */
export async function createPost(
  input: CreatePostInput,
): Promise<Post> {
  return createStorePost({
    actorUserId: input.actorUserId,
    technicianId: input.technicianId,
    technicianName: input.technicianName,
    technicianBusinessName: input.technicianBusinessName,
    technicianAvatarUri: input.technicianAvatarUri,
    technicianVerified: input.technicianVerified,
    categorySlug: input.categorySlug,
    serviceArea: input.serviceArea,
    caption: input.caption ?? input.content ?? '',
    content: input.content ?? input.caption ?? '',
    imageUri: input.imageUri,
    mediaUrls: input.mediaUrls,
    isServicePost: input.isServicePost,
    published: input.published,
  });
}

/**
 * Updates an existing technician post.
 */
export async function updatePost(
  input: UpdatePostInput,
): Promise<Post> {
  return updateStorePost({
    actorUserId: input.actorUserId,
    postId: input.postId,
    caption: input.caption ?? input.content,
    published: input.published,
    imageUri: input.imageUri,
    mediaUrls: input.mediaUrls,
    isServicePost: input.isServicePost,
  });
}

/**
 * Deletes a technician post.
 */
export async function deletePost(input: {
  actorUserId: string;
  postId: string;
}): Promise<Post[]> {
  return deleteStorePost(input);
}
