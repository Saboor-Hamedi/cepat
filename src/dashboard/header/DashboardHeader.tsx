import { router } from 'expo-router';
import { ArrowLeft, RefreshCw } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SourceBadge } from '../../components/marketplace-ui';
import { useAppearance } from '../../context/AppearanceContext';
import { useLanguage } from '../../i18n/locale';
import { spacing } from '../../theme/tokens';

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

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <View style={styles.headerBar} testID="admin-header-bar">
      <Pressable
        accessibilityLabel={language === 'en' ? 'Back' : 'Kembali'}
        accessibilityRole="button"
        onPress={handleBack}
        style={[
          styles.headerBackBtn,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
        testID="admin-header-back-btn"
      >
        <ArrowLeft size={18} color={palette.text} strokeWidth={2.2} />
      </Pressable>

      <View style={styles.headerTitleWrap}>
        <Text
          style={[styles.headerTitle, { color: palette.text }]}
          testID="admin-console-heading"
        >
          {language === 'en' ? 'Admin Dashboard' : 'Dasbor Admin'}
        </Text>
      </View>

      <View style={styles.headerActionsRight}>
        {isPreview && <SourceBadge source="fixtures" />}
        <Pressable
          accessibilityLabel={language === 'en' ? 'Refresh data' : 'Segarkan data'}
          accessibilityRole="button"
          disabled={refreshing}
          onPress={onRefresh}
          style={[
            styles.headerBackBtn,
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
    </View>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: 4,
    width: '100%',
  },
  headerBackBtn: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerTitleWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerActionsRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'flex-end',
    minWidth: 36,
  },
});
