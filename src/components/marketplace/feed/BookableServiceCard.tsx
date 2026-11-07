import { memo } from 'react';

import type { Post as PostType } from '../../../types/post';
import { Post, type PostEditUpdates } from '../../posts/Post';

export interface BookableServiceCardProps {
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
  savedTechnician?: boolean;
  onToggleSaveTechnician?: () => void;
}

export const BookableServiceCard = memo(function BookableServiceCard(
  props: BookableServiceCardProps,
) {
  return <Post {...props} flat />;
});
