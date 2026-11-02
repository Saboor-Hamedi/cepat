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

interface DashboardHeaderProps {
  onRefresh: () => void;
  refreshing: boolean;
  isPreview: boolean;
}

export function DashboardHeader({
  onRefresh,
  refreshing,
  isPreview,
}: DashboardHeaderProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();

  return (
    <BackHeader
      title={language === 'en' ? 'Admin Dashboard' : 'Dasbor Admin'}
      titleTestID="admin-console-heading"
      backBtnTestID="admin-header-back-btn"
      testID="admin-header-bar"
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
              <RefreshCw size={16} color={palette.text} strokeWidth={2.2} />
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
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
});
