import { memo } from 'react';
import { View } from 'react-native';

import type { Post as PostType } from '../../../types/post';
import type { Technician } from '../../../types/marketplace';
import { Post, type PostEditUpdates } from '../../posts/Post';

interface MarketplaceServiceFeedProps {
  posts: PostType[];
  techniciansMap?: Map<string, Technician>;
  currentUserId?: string;
  userRoles?: string[];
  effectiveRole?: string;
  onEditPost?: (
    post: PostType,
    caption: string,
    imageUri?: string,
    updates?: PostEditUpdates,
  ) => Promise<void>;
  onDeletePost?: (postId: string) => Promise<void>;
  onSuspendPost?: (postId: string, suspended: boolean) => Promise<void>;
}

export const MarketplaceServiceFeed = memo(function MarketplaceServiceFeed({
  posts,
  techniciansMap,
  currentUserId,
  userRoles = [],
  effectiveRole,
  onEditPost,
  onDeletePost,
  onSuspendPost,
}: MarketplaceServiceFeedProps) {
  return (
    <View>
      {posts.map((post) => {
        const matchedTech = techniciansMap?.get(post.technicianId);
        const startingPrice =
          post.servicePrice ??
          matchedTech?.services.find(
            (srv) => typeof srv.startingPrice === 'number',
          )?.startingPrice;

        const isOwner = Boolean(currentUserId && currentUserId === post.technicianId);
        const isAdmin = userRoles.includes('admin') || effectiveRole === 'admin';

        return (
          <Post
            key={`feed-post-${post.id}`}
            post={post}
            flat
            isOwner={isOwner}
            isAdmin={isAdmin}
            authorName={matchedTech?.displayName}
            authorAvatarUri={matchedTech?.avatarUri}
            authorVerified={matchedTech?.verified || post.technicianVerified}
            authorRating={matchedTech?.averageRating}
            authorReviewCount={matchedTech?.reviewCount}
            serviceStartingPrice={startingPrice}
            onEdit={onEditPost}
            onDelete={onDeletePost}
            onSuspend={onSuspendPost}
          />
        );
      })}
    </View>
  );
});
