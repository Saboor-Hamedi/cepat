import { StyleSheet } from 'react-native';

import { TabPillBar, type TabPillItem } from '../../components/TabPillBar';
import { useLanguage } from '../../i18n/locale';
import { spacing } from '../../theme/tokens';
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

  const withCount = (label: string, count: number) =>
    count > 0 ? `${label} (${count})` : label;

  const tabList: readonly TabPillItem<DashboardTab>[] = [
    {
      key: 'dashboard',
      label: language === 'en' ? 'Dashboard' : 'Dasbor',
      testID: 'admin-tab-dashboard',
    },
    {
      key: 'tax',
      label: language === 'en' ? 'Platform Tax & Fee' : 'Pajak & Biaya',
      testID: 'admin-tab-tax',
    },
    {
      key: 'reports',
      label: withCount(
        language === 'en' ? 'Reports' : 'Laporan',
        openReportsCount,
      ),
      testID: 'admin-tab-reports',
    },
    {
      key: 'approvals',
      label: withCount(
        language === 'en' ? 'Approvals' : 'Persetujuan',
        pendingApprovalsCount,
      ),
      testID: 'admin-tab-approvals',
    },
    {
      key: 'bookings',
      label: withCount(
        language === 'en' ? 'Bookings' : 'Pesanan',
        bookingsCount,
      ),
      testID: 'admin-tab-bookings',
    },
    {
      key: 'categories',
      label: withCount(
        language === 'en' ? 'Categories' : 'Kategori',
        categoriesCount,
      ),
      testID: 'admin-tab-categories',
    },
    {
      key: 'accounts',
      label: withCount(
        language === 'en' ? 'Accounts' : 'Akun',
        accountsCount,
      ),
      testID: 'admin-tab-accounts',
    },
    {
      key: 'delete-user',
      label: withCount(
        language === 'en' ? 'Deleted Accounts' : 'Akun Dihapus',
        deletedUsersCount,
      ),
      isDanger: true,
      testID: 'admin-tab-delete-user',
    },
  ];

  return (
    <TabPillBar
      activeKey={activeTab}
      containerTestID="admin-category-tabs"
      onSelect={onSelectTab}
      style={styles.tabsWrapper}
      tabs={tabList}
    />
  );
}

const styles = StyleSheet.create({
  tabsWrapper: {
    paddingHorizontal: 0,
    paddingVertical: spacing.xs,
  },
});
