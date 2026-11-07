import { router } from 'expo-router';
import { font } from '../theme/typography';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EmptyState, LoadingState } from '../components/marketplace-ui';
import { useAppearance } from '../context/AppearanceContext';
import {
  addAdminServiceCategory,
  adminOverrideBookingStatus,
  computeAdminPerformanceMetrics,
  loadAdminAccounts,
  loadAdminApplications,
  loadAdminBookings,
  DEFAULT_PLATFORM_SETTINGS,
  loadAdminCategories,
  loadAdminDeletionFeedbacks,
  loadPlatformSettings,
  updateAdminPlatformSettings,
  type PlatformSettings,
  loadAdminReports,
  loadAdminUserCounts,
  toggleAdminTechnicianVerified,
  updateAdminAccountModeration,
  updateAdminApplicationStatus,
  updateAdminReportStatus,
  type AccountStatus,
  type AdminAccountRecord,
  type AdminDeletionFeedback,
  type AdminPerformanceMetrics,
  type AdminReportRecord,
  type AdminTechnicianApplication,
  type AdminUserCounts,
} from '../data/adminStore';
import { shouldUseFixtures } from '../data/marketplaceRepository';
import { useLanguage } from '../i18n/locale';
import { radii, spacing } from '../theme/tokens';
import type { BookingRecord, ServiceCategory } from '../types/marketplace';
import { DashboardAccounts } from './accounts/DashboardAccounts';
import { DashboardApprovals } from './approvals/DashboardApprovals';
import { DashboardBookings } from './bookings/DashboardBookings';
import { DashboardCategories } from './categories/DashboardCategories';
import { DashboardPlatformTax } from './platform/DashboardPlatformTax';
import { DashboardDeletedUsers } from './delete-user/DashboardDeletedUsers';
import { DashboardHeader } from './header/DashboardHeader';
import { DashboardOverview } from './overview/DashboardOverview';
import { DashboardPerformance } from './performance/DashboardPerformance';
import { DashboardReports } from './reports/DashboardReports';
import type { DashboardTab } from './types';

interface DashboardContainerProps {
  isAdminAuthorized: boolean;
  effectiveRole?: string;
}

export function DashboardContainer({
  isAdminAuthorized,
  effectiveRole,
}: DashboardContainerProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();

  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');
  const [loading, setLoading] = useState(isAdminAuthorized);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [adminNotice, setAdminNotice] = useState<string | null>(null);

  const [reports, setReports] = useState<AdminReportRecord[]>([]);
  const [accounts, setAccounts] = useState<AdminAccountRecord[]>([]);
  const [applications, setApplications] = useState<AdminTechnicianApplication[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(
    DEFAULT_PLATFORM_SETTINGS,
  );
  const [userCounts, setUserCounts] = useState<AdminUserCounts | null>(null);
  const [deletionFeedbacks, setDeletionFeedbacks] = useState<AdminDeletionFeedback[]>([]);

  const isPreview = shouldUseFixtures();

  const loadAllData = async (isManualRefresh = false) => {
    if (!isAdminAuthorized) {
      setLoading(false);
      return;
    }
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [reps, accs, apps, bks, cats, counts, feedbacks, pSettings] = await Promise.all([
        loadAdminReports(),
        loadAdminAccounts(),
        loadAdminApplications(),
        loadAdminBookings(),
        loadAdminCategories(),
        loadAdminUserCounts(),
        loadAdminDeletionFeedbacks(),
        loadPlatformSettings(),
      ]);

      setReports(reps);
      setAccounts(accs);
      setApplications(apps);
      setBookings(bks);
      setCategories(cats);
      setUserCounts(counts);
      setDeletionFeedbacks(feedbacks);
      setPlatformSettings(pSettings);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (!isAdminAuthorized) return;
    Promise.all([
      loadAdminReports(),
      loadAdminAccounts(),
      loadAdminApplications(),
      loadAdminBookings(),
      loadAdminCategories(),
      loadAdminUserCounts(),
      loadAdminDeletionFeedbacks(),
      loadPlatformSettings(),
    ])
      .then(([reps, accs, apps, bks, cats, counts, feedbacks, pSettings]) => {
        if (!active) return;
        setReports(reps);
        setAccounts(accs);
        setApplications(apps);
        setBookings(bks);
        setCategories(cats);
        setUserCounts(counts);
        setDeletionFeedbacks(feedbacks);
        setPlatformSettings(pSettings);
        setLoadError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAdminAuthorized]);

  const metrics: AdminPerformanceMetrics = useMemo(
    () =>
      computeAdminPerformanceMetrics({
        bookings,
        accounts,
        feedbacks: deletionFeedbacks,
      }),
    [bookings, accounts, deletionFeedbacks],
  );

  const pendingApprovalsCount = useMemo(
    () => applications.filter((a) => a.status === 'pending').length,
    [applications],
  );

  // Handlers
  const handleReportAction = async (
    reportId: string,
    status: AdminReportRecord['status'],
    alsoBlockTechnicianId?: string,
    note?: string,
  ) => {
    const updatedReports = await updateAdminReportStatus(reportId, status, note);
    setReports(updatedReports);

    if (alsoBlockTechnicianId) {
      const updatedAccounts = await updateAdminAccountModeration(
        alsoBlockTechnicianId,
        'blocked',
        `Blocked from report ${reportId}`,
      );
      setAccounts(updatedAccounts);
    }

    setAdminNotice(
      language === 'en'
        ? `Report ${reportId} updated to ${status.toUpperCase()}.`
        : `Status laporan ${reportId} diperbarui ke ${status.toUpperCase()}.`,
    );
  };

  const handleAccountModeration = async (
    accountId: string,
    status: AccountStatus,
  ) => {
    const updated = await updateAdminAccountModeration(
      accountId,
      status,
      status === 'active' ? undefined : `Account ${status} by Administrator`,
    );
    setAccounts(updated);
    setAdminNotice(
      language === 'en'
        ? `Account ${accountId} set to ${status.toUpperCase()}.`
        : `Akun ${accountId} diatur menjadi ${status.toUpperCase()}.`,
    );
  };

  const handleToggleVerified = async (accountId: string) => {
    const updated = await toggleAdminTechnicianVerified(accountId);
    setAccounts(updated);
  };

  const handleApplicationDecision = async (
    appId: string,
    status: 'approved' | 'rejected',
  ) => {
    const updated = await updateAdminApplicationStatus(appId, status);
    setApplications(updated);
    setAdminNotice(
      language === 'en'
        ? `Technician application ${status.toUpperCase()}.`
        : `Pendaftaran teknisi ${status === 'approved' ? 'DISETUJUI' : 'DITOLAK'}.`,
    );
  };

  const handleBookingOverride = async (
    bookingId: string,
    status: BookingRecord['status'],
  ) => {
    const updated = await adminOverrideBookingStatus(bookingId, status);
    setBookings(updated);
  };

  
  const handleUpdatePlatformSettings = async (
    newSettings: Partial<PlatformSettings>,
  ) => {
    const updated = await updateAdminPlatformSettings(newSettings);
    setPlatformSettings(updated);
    setAdminNotice(
      language === 'en'
        ? 'Platform tax and fee settings successfully updated and saved.'
        : 'Pengaturan pajak dan komisi platform berhasil disimpan dan diterapkan.',
    );
  };

  const handleCreateCategory = async (name: string, description: string) => {
    const updated = await addAdminServiceCategory({
      name,
      description,
      icon: 'wrench',
    });
    setCategories(updated);
    setAdminNotice(
      language === 'en'
        ? 'New service category added to marketplace.'
        : 'Kategori layanan baru ditambahkan ke marketplace.',
    );
  };

  
  const getTabTitle = (tab: DashboardTab): string => {
    switch (tab) {
      case 'dashboard':
        return language === 'en' ? 'Admin Dashboard' : 'Dasbor Admin';
      case 'reports':
        return language === 'en' ? 'Moderation Reports' : 'Laporan Moderasi';
      case 'delete-user':
        return language === 'en' ? 'Deleted Accounts' : 'Akun Dihapus';
      case 'accounts':
        return language === 'en' ? 'User Accounts' : 'Akun Pengguna';
      case 'approvals':
        return language === 'en' ? 'Technician Approvals' : 'Persetujuan Teknisi';
      case 'bookings':
        return language === 'en' ? 'Bookings Management' : 'Manajemen Pesanan';
      case 'categories':
        return language === 'en' ? 'Service Categories' : 'Kategori Layanan';
      case 'tax':
        return language === 'en' ? 'Platform Tax & Fee' : 'Pajak & Biaya Platform';
      case 'performance':
        return language === 'en' ? 'Platform Performance' : 'Performa Platform';
    }
  };

  const handleAdminBack = () => {
    if (activeTab !== 'dashboard') {
      setActiveTab('dashboard');
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <ScrollView
      style={styles.screenContent}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.container}>
        {/* Modular Header with Back Button and Refresh */}
        <DashboardHeader
          onRefresh={() => void loadAllData(true)}
          refreshing={refreshing}
          isPreview={isPreview}
          title={getTabTitle(activeTab)}
          onPressBack={handleAdminBack}
        />

        {!isAdminAuthorized ? (
          <EmptyState
            title={
              language === 'en'
                ? 'Administrator Access Required'
                : 'Akses Administrator Diperlukan'
            }
            description={
              language === 'en'
                ? 'This control center is strictly isolated for Cepat Administrators. Customer and Technician accounts cannot access platform moderation tools.'
                : 'Pusat kontrol ini dikhususkan untuk Administrator Cepat. Akun Pelanggan dan Teknisi tidak dapat mengakses fitur moderasi platform.'
            }
            actionLabel={
              effectiveRole === 'technician'
                ? language === 'en'
                  ? 'Return to Technician Workspace'
                  : 'Kembali ke Ruang Kerja Teknisi'
                : language === 'en'
                  ? 'Return to Marketplace'
                  : 'Kembali ke Marketplace'
            }
            onAction={() =>
              router.replace(
                effectiveRole === 'technician' ? '/technician-dashboard' : '/',
              )
            }
          />
        ) : (
          <>
            {/* Clean Single Component without redundant horizontal tabs */}

            {/* Action feedback banner */}
            {adminNotice ? (
              <View
                style={[
                  styles.noticeBanner,
                  { backgroundColor: palette.primarySoft, borderColor: palette.primary },
                ]}
                testID="admin-action-notice"
              >
                <Text style={[styles.noticeText, { color: palette.text }]}>
                  {adminNotice}
                </Text>
              </View>
            ) : null}

            {/* Load error banner */}
            {loadError ? (
              <View
                style={[
                  styles.errorBanner,
                  { backgroundColor: palette.surfaceElevated, borderColor: palette.danger },
                ]}
                testID="admin-load-error"
              >
                <Text style={[styles.errorTitle, { color: palette.danger }]}>
                  {language === 'en'
                    ? 'Some dashboard data could not be loaded'
                    : 'Sebagian data dasbor gagal dimuat'}
                </Text>
                <Text style={[styles.errorDescription, { color: palette.text }]}>
                  {loadError}
                </Text>
              </View>
            ) : null}

            {/* Tab Content Display - Each tab has its own dedicated view component */}
            {loading ? (
              <LoadingState
                label={
                  language === 'en'
                    ? 'Loading live dashboard data...'
                    : 'Memuat data dasbor...'
                }
              />
            ) : (
              <>
                {/* 1. Main Dashboard Front Page: Categorized like Settings */}
                {activeTab === 'dashboard' && (
                  <DashboardOverview
                    userCounts={userCounts}
                    metrics={metrics}
                    bookings={bookings}
                    reports={reports}
                    deletedUsersCount={deletionFeedbacks.length}
                    pendingApprovalsCount={pendingApprovalsCount}
                    platformSettings={platformSettings}
                    onUpdatePlatformSettings={handleUpdatePlatformSettings}
                    onNavigateTab={setActiveTab}
                  />
                )}

                {/* Performance Tab */}
                {activeTab === 'performance' && (
                  <DashboardPerformance
                    metrics={metrics}
                    onNavigateTab={setActiveTab}
                  />
                )}

                {/* 2. Full Reports Moderation Tab */}
                {activeTab === 'reports' && (
                  <DashboardReports
                    reports={reports}
                    onReportAction={handleReportAction}
                  />
                )}

                {/* 3. Deleted Accounts & Feedback Tab (No fake emails, simple text, infinite scroll) */}
                {activeTab === 'delete-user' && (
                  <DashboardDeletedUsers feedbacks={deletionFeedbacks} />
                )}

                {/* 4. Accounts Management Tab */}
                {activeTab === 'accounts' && (
                  <DashboardAccounts
                    accounts={accounts}
                    onModeration={handleAccountModeration}
                    onToggleVerified={handleToggleVerified}
                  />
                )}

                {/* 5. Technician Approvals Tab */}
                {activeTab === 'approvals' && (
                  <DashboardApprovals
                    applications={applications}
                    onDecision={handleApplicationDecision}
                  />
                )}

                {/* 6. Bookings Management Tab */}
                {activeTab === 'bookings' && (
                  <DashboardBookings
                    bookings={bookings}
                    onOverrideStatus={handleBookingOverride}
                  />
                )}

                
                {/* Platform Tax & Fee Tab */}
                {activeTab === 'tax' && (
                  <DashboardPlatformTax
                    settings={platformSettings}
                    onUpdateSettings={handleUpdatePlatformSettings}
                  />
                )}

                {/* 7. Service Categories Tab */}
                {activeTab === 'categories' && (
                  <DashboardCategories
                    categories={categories}
                    onCreateCategory={handleCreateCategory}
                  />
                )}
              </>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  container: {
    alignSelf: 'center',
    maxWidth: 860,
    paddingHorizontal: 8,
    paddingTop: spacing.sm,
    width: '100%',
  },
  noticeBanner: {
    borderRadius: radii.sm,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  noticeText: {
    fontSize: font.body,
    fontWeight: '700',
  },
  errorBanner: {
    borderRadius: radii.sm,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  errorTitle: {
    fontSize: font.label,
    fontWeight: '800',
  },
  errorDescription: {
    fontSize: font.body,
    marginTop: spacing.xs,
  },
});
