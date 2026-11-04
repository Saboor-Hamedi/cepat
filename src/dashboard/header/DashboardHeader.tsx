import { RefreshCw } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BackHeader } from '../../components/BackHeader';
import { SourceBadge } from '../../components/marketplace-ui';
import { useAppearance } from '../../context/AppearanceContext';
import { useLanguage } from '../../i18n/locale';
import { ICON_STROKE } from '../../theme/icons';
import { font } from '../../theme/typography';

interface DashboardHeaderProps {
  onRefresh: () => void;
  refreshing: boolean;
  isPreview: boolean;
  title?: string;
  onPressBack?: () => void;
}

export function DashboardHeader({
  onRefresh,
  refreshing,
  isPreview,
  title,
  onPressBack,
}: DashboardHeaderProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();

  const defaultTitle = language === 'en' ? 'Admin Dashboard' : 'Dasbor Admin';

  return (
    <BackHeader
      title={title || defaultTitle}
      titleTestID="admin-console-heading"
      backBtnTestID="admin-header-back-btn"
      testID="admin-header-bar"
      onPressBack={onPressBack}
      rightElement={
        <View style={styles.headerActionsRight}>
          {isPreview && <SourceBadge source="fixtures" />}
          <Pressable
            accessibilityLabel={language === 'en' ? 'Refresh data' : 'Segarkan data'}
            accessibilityRole="button"
            disabled={refreshing}
            onPress={onRefresh}
            style={({ pressed }) => [
              styles.cleanRefreshBtn,
              { opacity: pressed || refreshing ? 0.6 : 1 },
            ]}
            testID="admin-header-refresh-btn"
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={palette.primary} />
            ) : (
              <RefreshCw size={15} color={palette.primary} strokeWidth={ICON_STROKE} />
            )}
            <Text style={[styles.refreshText, { color: palette.primary }]}>
              {refreshing
                ? (language === 'en' ? 'Refreshing...' : 'Memuat...')
                : (language === 'en' ? 'Refresh' : 'Segarkan')}
            </Text>
          </Pressable>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  headerActionsRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  cleanRefreshBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  refreshText: {
    fontSize: font.label,
    fontWeight: '700',
  },
});
