import { RefreshCw } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { BackHeader } from '../../components/BackHeader';
import { SourceBadge } from '../../components/marketplace-ui';
import { useAppearance } from '../../context/AppearanceContext';
import { useLanguage } from '../../i18n/locale';
import { ICON_SIZE, ICON_STROKE } from '../../theme/icons';

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
            style={[
              styles.roundActionBtn,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
            testID="admin-header-refresh-btn"
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={palette.primary} />
            ) : (
              <RefreshCw size={ICON_SIZE} color={palette.text} strokeWidth={ICON_STROKE} />
            )}
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
    gap: 6,
    justifyContent: 'flex-end',
    minWidth: 36,
  },
  roundActionBtn: {
    alignItems: 'center',
    borderRadius: 5,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
});
