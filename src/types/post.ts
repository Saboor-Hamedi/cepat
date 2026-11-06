export interface PostMediaAttachment {
  id: string;
  uri: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

export interface Post {
  id: string;
  technicianId: string;
  technicianName: string;
  technicianUsername?: string;
  technicianBusinessName?: string;
  technicianAvatarUri?: string;
  technicianVerified: boolean;
  categorySlug: string;
  serviceArea: string;
  caption: string;
  content?: string;
  imageUri?: string;
  mediaUrls?: string[];
  isServicePost?: boolean;
  likeCount?: number;
  likedByMe?: boolean;
  viewCount?: number;
  shareCount?: number;
  published: boolean;
  suspended?: boolean;
  suspendedAt?: string;
  accountStatus?: 'active' | 'restricted' | 'suspended' | 'blocked';
  createdAt: string;
  updatedAt?: string;
}

export interface CreatePostInput {
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
  isServicePost?: boolean;
  likeCount?: number;
  likedByMe?: boolean;
  viewCount?: number;
  shareCount?: number;
  published?: boolean;
}

export interface UpdatePostInput {
  actorUserId: string;
  postId: string;
  caption?: string;
  content?: string;
  published?: boolean;
  imageUri?: string;
  mediaUrls?: string[];
  isServicePost?: boolean;
  likeCount?: number;
  likedByMe?: boolean;
  viewCount?: number;
  shareCount?: number;
}

export interface FetchPostsOptions {
  technicianId?: string;
  page?: number;
  pageSize?: number;
  includeUnpublished?: boolean;
}

export interface PaginatedPostsResult {
  items: Post[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  total: number;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
