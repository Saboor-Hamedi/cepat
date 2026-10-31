import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useLanguage } from '../../i18n/locale';
import { colors, spacing } from '../../theme/tokens';
import type { TechnicianPost } from '../../types/post';
import { TechnicianPostCard } from './TechnicianPostCard';

export interface TechnicianPostFeedProps {
  posts: TechnicianPost[];
  isOwner?: boolean;
  onRefresh?: () => Promise<void> | void;
  refreshing?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onEditPost?: (post: TechnicianPost, newCaption: string, newImageUri?: string) => Promise<void>;
  onDeletePost?: (postId: string) => Promise<void>;
  emptyTitle?: string;
  emptyDescription?: string;
  testID?: string;
}

export function TechnicianPostFeed({
  posts,
  isOwner = false,
  onRefresh,
  refreshing = false,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  onEditPost,
  onDeletePost,
  emptyTitle,
  emptyDescription,
  testID = 'technician-post-feed',
}: TechnicianPostFeedProps) {
  const { language } = useLanguage();

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader} testID="feed-loading-more">
        <ActivityIndicator size="small" color={colors.greenDark} />
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer} testID="technician-posts-empty">
      <Text style={styles.emptyTitle}>
        {emptyTitle ||
          (language === 'en'
            ? 'No posts yet'
            : 'Belum ada postingan')}
      </Text>
      <Text style={styles.emptyDescription}>
        {emptyDescription ||
          (language === 'en'
            ? 'Recent work updates and project highlights will be shown here.'
            : 'Pembaruan pekerjaan terbaru dan sorotan proyek akan ditampilkan di sini.')}
      </Text>
    </View>
  );

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TechnicianPostCard
          post={item}
          isOwner={isOwner}
          onEdit={onEditPost}
          onDelete={onDeletePost}
        />
      )}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.greenDark}
          />
        ) : undefined
      }
      onEndReached={hasMore && !isLoadingMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.4}
      contentContainerStyle={styles.listContent}
      testID={testID}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: spacing.xl,
  },
  footerLoader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: spacing.md,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDescription: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
