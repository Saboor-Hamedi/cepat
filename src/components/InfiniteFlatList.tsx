import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
  type FlatListProps,
} from 'react-native';
import type { ReactNode } from 'react';

import { useAppearance } from '../context/AppearanceContext';
import { spacing } from '../theme/tokens';

export interface InfiniteFlatListProps<T> extends Omit<
  FlatListProps<T>,
  'data' | 'onEndReached' | 'ListFooterComponent'
> {
  data: T[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  listFooter?: ReactNode;
}

export function InfiniteFlatList<T>({
  data,
  hasMore,
  loadingMore,
  onLoadMore,
  listFooter,
  ...flatListProps
}: InfiniteFlatListProps<T>) {
  const { palette } = useAppearance();

  return (
    <FlatList
      {...flatListProps}
      data={data}
      onEndReached={hasMore && !loadingMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        <View style={styles.footerContainer}>
          {loadingMore && (
            <View style={styles.loadingFooter}>
              <ActivityIndicator color={palette.primary} />
            </View>
          )}
          {listFooter}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  footerContainer: {
    width: '100%',
  },
  loadingFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
});
