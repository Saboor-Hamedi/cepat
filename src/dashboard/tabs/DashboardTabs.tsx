import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import { useLanguage } from '../../i18n/locale';
import { radii, spacing } from '../../theme/tokens';
import type { DashboardTab } from '../types';

interface DashboardTabsProps {
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  openReportsCount: number;
  deletedUsersCount: number;
  pendingApprovalsCount: number;
  accountsCount: number;
  bookingsCount: number;
  categoriesCount: number;
}

export function DashboardTabs({
  activeTab,
  onSelectTab,
  openReportsCount,
  deletedUsersCount,
  pendingApprovalsCount,
  accountsCount,
  bookingsCount,
  categoriesCount,
}: DashboardTabsProps) {
  const { language } = useLanguage();
  const { palette, scaleFont } = useAppearance();

  const tabList: Array<{
    key: DashboardTab;
    label: string;
    isDanger?: boolean;
    badgeCount?: number;
    testId: string;
  }> = [
    {
      key: 'dashboard',
      label: language === 'en' ? 'Dashboard' : 'Dasbor',
      testId: 'admin-tab-dashboard',
    },
    {
      key: 'reports',
      label:
        openReportsCount > 0
          ? `${language === 'en' ? 'Reports' : 'Laporan'} (${openReportsCount})`
          : language === 'en'
            ? 'Reports'
            : 'Laporan',
      badgeCount: openReportsCount,
      testId: 'admin-tab-reports',
    },
    {
      key: 'approvals',
      label:
        pendingApprovalsCount > 0
          ? `${language === 'en' ? 'Approvals' : 'Persetujuan'} (${pendingApprovalsCount})`
          : language === 'en'
            ? 'Approvals'
            : 'Persetujuan',
      testId: 'admin-tab-approvals',
    },
    {
      key: 'bookings',
      label:
        bookingsCount > 0
          ? `${language === 'en' ? 'Bookings' : 'Pesanan'} (${bookingsCount})`
          : language === 'en'
            ? 'Bookings'
            : 'Pesanan',
      testId: 'admin-tab-bookings',
    },
    {
      key: 'categories',
      label:
        categoriesCount > 0
          ? `${language === 'en' ? 'Categories' : 'Kategori'} (${categoriesCount})`
          : language === 'en'
            ? 'Categories'
            : 'Kategori',
      testId: 'admin-tab-categories',
    },
    {
      key: 'accounts',
      label:
        accountsCount > 0
          ? `${language === 'en' ? 'Accounts' : 'Akun'} (${accountsCount})`
          : language === 'en'
            ? 'Accounts'
            : 'Akun',
      testId: 'admin-tab-accounts',
    },
    {
      key: 'delete-user',
      label:
        deletedUsersCount > 0
          ? `${language === 'en' ? 'Deleted Accounts' : 'Akun Dihapus'} (${deletedUsersCount})`
          : language === 'en'
            ? 'Deleted Accounts'
            : 'Akun Dihapus',
      isDanger: true,
      badgeCount: deletedUsersCount,
      testId: 'admin-tab-delete-user',
    },
  ];

  return (
    <View style={styles.tabsWrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
        testID="admin-category-tabs"
      >
        {tabList.map((tab) => {
          const selected = activeTab === tab.key;
          const isDanger = Boolean(tab.isDanger);
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => onSelectTab(tab.key)}
              style={[
                styles.tabItem,
                {
                  backgroundColor: selected
                    ? isDanger
                      ? '#DC2626'
                      : palette.primary
                    : palette.surface,
                  borderColor: selected
                    ? isDanger
                      ? '#DC2626'
                      : palette.primary
                    : palette.border,
                },
              ]}
              testID={tab.testId}
            >
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: selected
                      ? '#FFFFFF'
                      : isDanger
                        ? '#DC2626'
                        : palette.text,
                    fontSize: scaleFont(13),
                    fontWeight: selected ? '700' : '500',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabsWrapper: {
    marginBottom: spacing.md,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  tabItem: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabLabel: {
    letterSpacing: 0.1,
  },
});
