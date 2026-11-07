import { memo } from 'react';

import type { Post as PostType } from '../../../types/post';
import { Post, type PostEditUpdates } from '../../posts/Post';

export interface CommunityPostCardProps {
  post: PostType;
  isOwner?: boolean;
  isAdmin?: boolean;
  onEdit?: (
    post: PostType,
    newCaption: string,
    newImageUri?: string,
    updates?: PostEditUpdates,
  ) => Promise<void>;
  onDelete?: (postId: string) => Promise<void>;
  onSuspend?: (postId: string, suspended: boolean) => Promise<void>;
  authorName?: string;
  authorAvatarUri?: string;
  authorVerified?: boolean;
  authorRating?: number;
  authorReviewCount?: number;
  serviceStartingPrice?: number;
}

export const CommunityPostCard = memo(function CommunityPostCard(
  props: CommunityPostCardProps,
) {
  return <Post {...props} flat />;
});
