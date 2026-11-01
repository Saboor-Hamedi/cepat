import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthProvider';
import {
  AppNavigationBar,
  EmptyState,
  LoadingState,
  SourceBadge,
} from '../components/marketplace-ui';
import {
  addAdminServiceCategory,
  adminOverrideBookingStatus,
  loadAdminAccounts,
  loadAdminApplications,
  loadAdminBookings,
  loadAdminCategories,
  loadAdminReports,
  loadAdminUserCounts,
  toggleAdminTechnicianVerified,
  updateAdminAccountModeration,
  updateAdminApplicationStatus,
  updateAdminReportStatus,
  type AccountStatus,
  type AdminAccountRecord,
  type AdminReportRecord,
  type AdminTechnicianApplication,
  type AdminUserCounts,
} from '../data/adminStore';
import { formatRupiah, shouldUseFixtures } from '../data/marketplaceRepository';
import { useAppearance, type ThemePalette } from '../context/AppearanceContext';
import { useLanguage } from '../i18n/locale';
import { radii, spacing } from '../theme/tokens';
import type { BookingRecord, ServiceCategory } from '../types/marketplace';

type AdminTab = 'reports' | 'accounts' | 'applications' | 'bookings' | 'platform';
type AccountFilter = 'all' | 'customer' | 'technician' | 'blocked';

export default function AdminConsoleScreen() {
  const { language } = useLanguage();
  const { palette } = useAppearance();
  const { user, roles, effectiveRole } = useAuth();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [tab, setTab] = useState<AdminTab>('reports');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reports, setReports] = useState<AdminReportRecord[]>([]);
  const [accounts, setAccounts] = useState<AdminAccountRecord[]>([]);
  const [applications, setApplications] = useState<AdminTechnicianApplication[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [userCounts, setUserCounts] = useState<AdminUserCounts | null>(null);
  const [accountFilter, setAccountFilter] = useState<AccountFilter>('all');
  const [accountSearch, setAccountSearch] = useState('');
  const [reportNoteMap, setReportNoteMap] = useState<Record<string, string>>({});
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [adminNotice, setAdminNotice] = useState<string | null>(null);

  const isPreview = shouldUseFixtures();
  // Admin access strictly requires an authenticated user with a verified 'admin' role.
  const isAdminAuthorized = Boolean(user) && roles.includes('admin');

  useEffect(() => {
    let active = true;
    if (!isAdminAuthorized) {
      return () => {
        active = false;
      };
    }

    void Promise.all([
      loadAdminReports(),
      loadAdminAccounts(),
      loadAdminApplications(),
      loadAdminBookings(),
      loadAdminCategories(),
      loadAdminUserCounts(),
    ])
      .then(([reps, accs, apps, bks, cats, counts]) => {
        if (!active) return;
        setReports(reps);
        setAccounts(accs);
        setApplications(apps);
        setBookings(bks);
        setCategories(cats);
        setUserCounts(counts);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAdminAuthorized]);

  const openReportsCount = useMemo(
    () => reports.filter((r) => r.status === 'submitted' || r.status === 'under_review').length,
    [reports],
  );
  const pendingAppsCount = useMemo(
    () => applications.filter((a) => a.status === 'pending').length,
    [applications],
  );
  const activeBookingsCount = useMemo(
    () =>
      bookings.filter((booking) =>
        ['requested', 'alternative_proposed', 'confirmed', 'in_progress'].includes(
          booking.status,
        ),
      ).length,
    [bookings],
  );
  const mostBookedServices = useMemo(() => {
    const counts = new Map<string, number>();
    for (const booking of bookings) {
      const serviceName = booking.serviceNameSnapshot.trim();
      if (serviceName) counts.set(serviceName, (counts.get(serviceName) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 5);
  }, [bookings]);

  const filteredAccounts = useMemo(() => {
    const q = accountSearch.trim().toLowerCase();
    return accounts.filter((acc) => {
      if (accountFilter === 'customer' && acc.role !== 'customer') return false;
      if (accountFilter === 'technician' && acc.role !== 'technician') return false;
      if (accountFilter === 'blocked' && acc.status === 'active') return false;
      if (!q) return true;
      return (
        acc.displayName.toLowerCase().includes(q) ||
        acc.email.toLowerCase().includes(q) ||
        acc.area.toLowerCase().includes(q)
      );
    });
  }, [accounts, accountFilter, accountSearch]);

  const handleReportAction = async (
    reportId: string,
    status: AdminReportRecord['status'],
    alsoBlockTechnicianId?: string,
  ) => {
    const note = reportNoteMap[reportId];
    const nextReports = await updateAdminReportStatus(reportId, status, note);
    setReports(nextReports);
    if (alsoBlockTechnicianId) {
      const nextAccounts = await updateAdminAccountModeration(
        alsoBlockTechnicianId,
        'blocked',
        `Blocked from report ${reportId}`,
      );
      setAccounts(nextAccounts);
    }
    setAdminNotice(
      language === 'en'
        ? `Report ${reportId} updated to ${status.toUpperCase()}.`
        : `Status laporan ${reportId} diperbarui ke ${status.toUpperCase()}.`,
    );
  };

  const handleAccountModeration = async (accountId: string, status: AccountStatus) => {
    const next = await updateAdminAccountModeration(
      accountId,
      status,
      status === 'active'
        ? undefined
        : `Account ${status} by Administrator`,
    );
    setAccounts(next);
    setAdminNotice(
      language === 'en'
        ? `Account ${accountId} set to ${status.toUpperCase()}.`
        : `Akun ${accountId} diatur menjadi ${status.toUpperCase()}.`,
    );
  };

  const handleToggleVerified = async (accountId: string) => {
    const next = await toggleAdminTechnicianVerified(accountId);
    setAccounts(next);
  };

  const handleApplicationDecision = async (
    appId: string,
    status: 'approved' | 'rejected',
  ) => {
    const next = await updateAdminApplicationStatus(appId, status);
    setApplications(next);
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
    const next = await adminOverrideBookingStatus(bookingId, status);
    setBookings(next);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    const next = await addAdminServiceCategory({
      name: newCategoryName,
      description: newCategoryDesc,
      icon: 'wrench',
    });
    setCategories(next);
    setNewCategoryName('');
    setNewCategoryDesc('');
    setAdminNotice(
      language === 'en'
        ? 'New service category added to marketplace.'
        : 'Kategori layanan baru ditambahkan ke marketplace.',
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView style={styles.screenContent} contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>
                {language === 'en'
                  ? 'TRUST, SAFETY & PLATFORM GOVERNANCE'
                  : 'KEAMANAN & KONTROL PLATFORM'}
              </Text>
              <Text style={styles.title} testID="admin-console-heading">
                {language === 'en' ? 'Admin Control Center' : 'Pusat Kontrol Admin'}
              </Text>
              <Text style={styles.subtitle}>
                {language === 'en'
                  ? 'A live view of customer and technician accounts, booking demand, reports, and marketplace operations.'
                  : 'Pantau pelanggan dan teknisi, permintaan layanan, laporan, serta operasional marketplace.'}
              </Text>
            </View>
            {isPreview && <SourceBadge source="fixtures" />}
          </View>

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
              {/* Operational overview */}
              <View style={styles.kpiRow} testID="admin-kpi-strip">
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiValue}>
                    {userCounts ? userCounts.customers : '—'}
                  </Text>
                  <Text style={styles.kpiLabel}>
                    {language === 'en' ? 'Customers' : 'Pelanggan'}
                  </Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiValue}>
                    {userCounts ? userCounts.technicians : '—'}
                  </Text>
                  <Text style={styles.kpiLabel}>
                    {language === 'en' ? 'Technicians' : 'Teknisi'}
                  </Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiValue}>{bookings.length}</Text>
                  <Text style={styles.kpiLabel}>
                    {language === 'en' ? 'All bookings' : 'Semua pesanan'}
                  </Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={[styles.kpiValue, styles.kpiValueDanger]}>
                    {activeBookingsCount}
                  </Text>
                  <Text style={styles.kpiLabel}>
                    {language === 'en' ? 'Active bookings' : 'Pesanan aktif'}
                  </Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={[styles.kpiValue, styles.kpiValueDanger]}>
                    {userCounts ? userCounts.restrictedAccounts : '—'}
                  </Text>
                  <Text style={styles.kpiLabel}>
                    {language === 'en' ? 'Restricted accounts' : 'Akun dibatasi'}
                  </Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiValue}>{pendingAppsCount}</Text>
                  <Text style={styles.kpiLabel}>
                    {language === 'en' ? 'Pending applications' : 'Pengajuan menunggu'}
                  </Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiValue}>{openReportsCount}</Text>
                  <Text style={styles.kpiLabel}>
                    {language === 'en' ? 'Open reports' : 'Laporan terbuka'}
                  </Text>
                </View>
              </View>

              {loadError ? (
                <View style={styles.errorBanner} testID="admin-load-error">
                  <Text style={styles.errorTitle}>
                    {language === 'en'
                      ? 'Some dashboard data could not be loaded'
                      : 'Sebagian data dasbor gagal dimuat'}
                  </Text>
                  <Text style={styles.errorDescription}>{loadError}</Text>
                </View>
              ) : null}
              {userCounts ? (
                <Text style={styles.dataSourceNote} testID="admin-user-count-source">
                  {userCounts.source === 'supabase'
                    ? language === 'en'
                      ? 'User totals are live counts of assigned customer and technician roles.'
                      : 'Jumlah pengguna dihitung langsung dari peran pelanggan dan teknisi.'
                    : language === 'en'
                      ? 'User totals are sample data; connect Supabase for live counts.'
                      : 'Jumlah pengguna adalah data contoh; hubungkan Supabase untuk data langsung.'}
                </Text>
              ) : null}

              <View style={styles.card} testID="admin-most-booked-services">
                <Text style={styles.cardTitle}>
                  {language === 'en' ? 'Most requested services' : 'Layanan paling banyak dipesan'}
                </Text>
                <Text style={styles.cardMeta}>
                  {language === 'en'
                    ? `Ranked from ${bookings.length} bookings currently available to this dashboard.`
                    : `Diurutkan dari ${bookings.length} pesanan yang tersedia di dasbor ini.`}
                </Text>
                {mostBookedServices.length > 0 ? (
                  mostBookedServices.map((service) => (
                    <View key={service.name} style={styles.serviceMetric}>
                      <View style={styles.serviceMetricHeader}>
                        <Text numberOfLines={1} style={styles.serviceMetricName}>
                          {service.name}
                        </Text>
                        <Text style={styles.serviceMetricCount}>
                          {service.count}{' '}
                          {language === 'en' ? 'bookings' : 'pesanan'}
                        </Text>
                      </View>
                      <View style={styles.serviceMetricTrack}>
                        <View
                          style={[
                            styles.serviceMetricBar,
                            {
                              width: `${Math.max(
                                8,
                                (service.count / mostBookedServices[0].count) * 100,
                              )}%`,
                              backgroundColor: palette.primary,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.cardMeta}>
                    {language === 'en'
                      ? 'No booking data is available yet.'
                      : 'Belum ada data pesanan.'}
                  </Text>
                )}
              </View>

              {adminNotice && (
                <View style={styles.noticeBanner} testID="admin-action-notice">
                  <Text style={styles.noticeText}>{adminNotice}</Text>
                </View>
              )}

              {/* Admin Navigation Tabs */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabsRow}
              >
                {(
                  [
                    [
                      'reports',
                      language === 'en'
                        ? `Reports (${reports.length})`
                        : `Laporan (${reports.length})`,
                    ],
                    [
                      'accounts',
                      language === 'en'
                        ? `Accounts (${accounts.length})`
                        : `Akun (${accounts.length})`,
                    ],
                    [
                      'applications',
                      language === 'en'
                        ? `Tech Approvals (${pendingAppsCount})`
                        : `Persetujuan Teknisi (${pendingAppsCount})`,
                    ],
                    [
                      'bookings',
                      language === 'en'
                        ? `All Bookings (${bookings.length})`
                        : `Semua Pesanan (${bookings.length})`,
                    ],
                    [
                      'platform',
                      language === 'en'
                        ? `Categories (${categories.length})`
                        : `Kategori (${categories.length})`,
                    ],
                  ] as const
                ).map(([key, label]) => (
                  <Pressable
                    key={key}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: tab === key }}
                    onPress={() => setTab(key)}
                    style={[styles.tabPill, tab === key && styles.tabPillActive]}
                    testID={`admin-tab-${key}`}
                  >
                    <Text style={[styles.tabPillText, tab === key && styles.tabPillTextActive]}>
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {loading ? (
                <LoadingState
                  label={language === 'en' ? 'Loading Admin Console...' : 'Memuat Konsol Admin...'}
                />
              ) : tab === 'reports' ? (
                <View style={styles.sectionList} testID="admin-reports-section">
                  {reports.map((rep) => (
                    <View
                      key={rep.id}
                      style={styles.card}
                      testID={`admin-report-card-${rep.id}`}
                    >
                      <View style={styles.cardTop}>
                        <Text style={styles.cardTitle}>
                          {rep.technicianName} · {rep.category.replace(/_/g, ' ').toUpperCase()}
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            rep.status === 'resolved'
                              ? styles.badgeSuccess
                              : rep.status === 'dismissed'
                                ? styles.badgeMuted
                                : styles.badgeWarning,
                          ]}
                        >
                          <Text style={styles.statusBadgeText}>
                            {rep.status.replace(/_/g, ' ').toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.cardMeta}>
                        {language === 'en' ? 'Reporter:' : 'Pelapor:'} {rep.reporterUserId} ·{' '}
                        {language === 'en' ? 'Severity:' : 'Tingkat:'}{' '}
                        {rep.severity.toUpperCase()}
                      </Text>
                      <Text style={styles.cardDescription}>{rep.description}</Text>
                      {rep.adminNotes ? (
                        <Text style={styles.adminNoteBox}>
                          {language === 'en' ? 'Admin Note: ' : 'Catatan Admin: '}
                          {rep.adminNotes}
                        </Text>
                      ) : null}
                      <Text style={styles.cardMeta}>
                        {language === 'en'
                          ? 'Resolve closes this report without changing the technician account. Use the block action only when restricting access is intended.'
                          : 'Selesaikan menutup laporan tanpa mengubah akun teknisi. Gunakan tindakan blokir hanya jika akses memang perlu dibatasi.'}
                      </Text>

                      <TextInput
                        onChangeText={(txt) =>
                          setReportNoteMap((prev) => ({ ...prev, [rep.id]: txt }))
                        }
                        placeholder={
                          language === 'en'
                            ? 'Add moderation or investigation note...'
                            : 'Tambahkan catatan investigasi atau tindak lanjut...'
                        }
                        placeholderTextColor={palette.textMuted}
                        style={styles.input}
                        testID={`admin-report-note-${rep.id}`}
                        value={reportNoteMap[rep.id] ?? ''}
                      />

                      <View style={styles.actionRow}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => {
                            void handleReportAction(rep.id, 'under_review');
                          }}
                          style={styles.secondaryBtn}
                          testID={`admin-accept-report-${rep.id}`}
                        >
                          <Text style={styles.secondaryBtnText}>
                            {language === 'en' ? 'Start investigation' : 'Mulai investigasi'}
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => {
                            void handleReportAction(rep.id, 'resolved');
                          }}
                          style={styles.primaryBtn}
                          testID={`admin-resolve-report-${rep.id}`}
                        >
                          <Text style={styles.primaryBtnText}>
                            {language === 'en'
                              ? 'Resolve · no account action'
                              : 'Selesaikan · tanpa tindakan akun'}
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => {
                            void handleReportAction(
                              rep.id,
                              'resolved',
                              rep.reportedTechnicianId,
                            );
                          }}
                          style={styles.dangerBtn}
                          testID={`admin-report-block-tech-${rep.id}`}
                        >
                          <Text style={styles.dangerBtnText}>
                            {language === 'en'
                              ? 'Resolve & block technician'
                              : 'Selesaikan & blokir teknisi'}
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => {
                            void handleReportAction(rep.id, 'dismissed');
                          }}
                          style={styles.ghostBtn}
                          testID={`admin-dismiss-report-${rep.id}`}
                        >
                          <Text style={styles.ghostBtnText}>
                            {language === 'en'
                              ? 'Dismiss as invalid'
                              : 'Tutup tanpa tindak lanjut'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              ) : tab === 'accounts' ? (
                <View style={styles.sectionList} testID="admin-accounts-section">
                  <View style={styles.filterBar}>
                    <TextInput
                      onChangeText={setAccountSearch}
                      placeholder={
                        language === 'en'
                          ? 'Search customer or technician name, email, or city...'
                          : 'Cari nama pelanggan atau teknisi, email, atau kota...'
                      }
                      placeholderTextColor={palette.textMuted}
                      style={styles.input}
                      testID="admin-account-search"
                      value={accountSearch}
                    />
                    <View style={styles.chipRow}>
                      {(
                        [
                          ['all', language === 'en' ? 'All Roles' : 'Semua Peran'],
                          ['customer', language === 'en' ? 'Customers' : 'Pelanggan'],
                          ['technician', language === 'en' ? 'Technicians' : 'Teknisi'],
                          ['blocked', language === 'en' ? 'Blocked / Suspended' : 'Diblokir'],
                        ] as const
                      ).map(([key, label]) => (
                        <Pressable
                          key={key}
                          accessibilityRole="button"
                          onPress={() => setAccountFilter(key)}
                          style={[
                            styles.filterChip,
                            accountFilter === key && styles.filterChipActive,
                          ]}
                          testID={`admin-account-filter-${key}`}
                        >
                          <Text
                            style={[
                              styles.filterChipText,
                              accountFilter === key && styles.filterChipTextActive,
                            ]}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {filteredAccounts.map((acc) => (
                    <View
                      key={acc.id}
                      style={styles.card}
                      testID={`admin-account-card-${acc.id}`}
                    >
                      <View style={styles.cardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardTitle}>{acc.displayName}</Text>
                          <Text style={styles.cardMeta}>
                            {acc.role.toUpperCase()} · {acc.email} · {acc.area}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            acc.status === 'active' ? styles.badgeSuccess : styles.badgeDanger,
                          ]}
                        >
                          <Text
                            style={styles.statusBadgeText}
                            testID={`admin-account-status-${acc.id}`}
                          >
                            {acc.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      {acc.moderationReason ? (
                        <Text style={styles.adminNoteBox}>{acc.moderationReason}</Text>
                      ) : null}

                      <View style={styles.actionRow}>
                        {acc.status !== 'blocked' ? (
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => {
                              void handleAccountModeration(acc.id, 'blocked');
                            }}
                            style={styles.dangerBtn}
                            testID={`admin-block-account-${acc.id}`}
                          >
                            <Text style={styles.dangerBtnText}>
                              {language === 'en' ? 'Block Account' : 'Blokir Akun'}
                            </Text>
                          </Pressable>
                        ) : null}

                        {acc.status === 'active' ? (
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => {
                              void handleAccountModeration(acc.id, 'suspended');
                            }}
                            style={styles.warningBtn}
                            testID={`admin-suspend-account-${acc.id}`}
                          >
                            <Text style={styles.warningBtnText}>
                              {language === 'en' ? 'Suspend' : 'Tangguhkan'}
                            </Text>
                          </Pressable>
                        ) : null}

                        {acc.status !== 'active' ? (
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => {
                              void handleAccountModeration(acc.id, 'active');
                            }}
                            style={styles.primaryBtn}
                            testID={`admin-reactivate-account-${acc.id}`}
                          >
                            <Text style={styles.primaryBtnText}>
                              {language === 'en' ? 'Unblock & Reactivate' : 'Buka Blokir & Aktifkan'}
                            </Text>
                          </Pressable>
                        ) : null}

                        {acc.role === 'technician' ? (
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => {
                              void handleToggleVerified(acc.id);
                            }}
                            style={styles.secondaryBtn}
                            testID={`admin-toggle-verified-${acc.id}`}
                          >
                            <Text style={styles.secondaryBtnText}>
                              {acc.verified
                                ? language === 'en'
                                  ? '✓ Verified Badge (Revoke)'
                                  : '✓ Terverifikasi (Cabut)'
                                : language === 'en'
                                  ? 'Grant Verified Badge'
                                  : 'Berikan Lencana Verifikasi'}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              ) : tab === 'applications' ? (
                <View style={styles.sectionList} testID="admin-applications-section">
                  {applications.map((app) => (
                    <View
                      key={app.id}
                      style={styles.card}
                      testID={`admin-application-card-${app.id}`}
                    >
                      <View style={styles.cardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardTitle}>
                            {app.applicantName} ({app.businessName})
                          </Text>
                          <Text style={styles.cardMeta}>
                            {app.PrimaryCategory} · {app.serviceArea} · {app.yearsExperience} yrs exp
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            app.status === 'approved'
                              ? styles.badgeSuccess
                              : app.status === 'rejected'
                                ? styles.badgeDanger
                                : styles.badgeWarning,
                          ]}
                        >
                          <Text style={styles.statusBadgeText}>
                            {app.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      {app.reviewNotes ? (
                        <Text style={styles.adminNoteBox}>{app.reviewNotes}</Text>
                      ) : null}
                      <View style={styles.actionRow}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => {
                            void handleApplicationDecision(app.id, 'approved');
                          }}
                          style={styles.primaryBtn}
                          testID={`admin-approve-app-${app.id}`}
                        >
                          <Text style={styles.primaryBtnText}>
                            {language === 'en' ? 'Approve Technician' : 'Setujui Teknisi'}
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => {
                            void handleApplicationDecision(app.id, 'rejected');
                          }}
                          style={styles.dangerBtn}
                          testID={`admin-reject-app-${app.id}`}
                        >
                          <Text style={styles.dangerBtnText}>
                            {language === 'en' ? 'Reject Application' : 'Tolak Pendaftaran'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              ) : tab === 'bookings' ? (
                <View style={styles.sectionList} testID="admin-bookings-section">
                  {bookings.map((bk) => (
                    <View key={bk.id} style={styles.card} testID={`admin-booking-card-${bk.id}`}>
                      <View style={styles.cardTop}>
                        <Text style={styles.cardTitle}>{bk.serviceNameSnapshot}</Text>
                        <View style={[styles.statusBadge, styles.badgeSuccess]}>
                          <Text style={styles.statusBadgeText}>
                            {bk.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.cardMeta}>
                        {language === 'en' ? 'Customer:' : 'Pelanggan:'} {bk.customerName} ·{' '}
                        {language === 'en' ? 'Technician:' : 'Teknisi:'} {bk.technicianName}
                      </Text>
                      <Text style={styles.cardMeta}>
                        {bk.customerAddress} ·{' '}
                        {bk.agreedPrice ? formatRupiah(bk.agreedPrice, language) : '-'}
                      </Text>
                      <View style={styles.actionRow}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => {
                            void handleBookingOverride(bk.id, 'completed');
                          }}
                          style={styles.secondaryBtn}
                          testID={`admin-force-complete-${bk.id}`}
                        >
                          <Text style={styles.secondaryBtnText}>
                            {language === 'en' ? 'Force Complete' : 'Tandai Selesai'}
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => {
                            void handleBookingOverride(bk.id, 'cancelled');
                          }}
                          style={styles.dangerBtn}
                          testID={`admin-force-cancel-${bk.id}`}
                        >
                          <Text style={styles.dangerBtnText}>
                            {language === 'en' ? 'Cancel Booking' : 'Batalkan Pesanan'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.sectionList} testID="admin-platform-section">
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>
                      {language === 'en'
                        ? 'Add New Marketplace Category'
                        : 'Tambah Kategori Layanan Baru'}
                    </Text>
                    <TextInput
                      onChangeText={setNewCategoryName}
                      placeholder={
                        language === 'en' ? 'Category name (e.g., Solar Panel)' : 'Nama kategori'
                      }
                      placeholderTextColor={palette.textMuted}
                      style={[styles.input, { marginTop: spacing.sm }]}
                      testID="admin-new-category-name"
                      value={newCategoryName}
                    />
                    <TextInput
                      onChangeText={setNewCategoryDesc}
                      placeholder={
                        language === 'en'
                          ? 'Category description...'
                          : 'Deskripsi kategori layanan...'
                      }
                      placeholderTextColor={palette.textMuted}
                      style={styles.input}
                      testID="admin-new-category-desc"
                      value={newCategoryDesc}
                    />
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        void handleCreateCategory();
                      }}
                      style={[styles.primaryBtn, { marginTop: spacing.xs }]}
                      testID="admin-add-category-btn"
                    >
                      <Text style={styles.primaryBtnText}>
                        {language === 'en' ? 'Publish Category' : 'Terbitkan Kategori'}
                      </Text>
                    </Pressable>
                  </View>

                  {categories.map((cat) => (
                    <View key={cat.id} style={styles.card}>
                      <Text style={styles.cardTitle}>{cat.name}</Text>
                      <Text style={styles.cardMeta}>
                        Slug: {cat.slug} · {cat.description}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
      <AppNavigationBar activeTab="admin" />
    </SafeAreaView>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    screenContent: { flex: 1 },
    safeArea: { backgroundColor: palette.background, flex: 1 },
    scrollContent: { paddingBottom: spacing.xxxl },
    container: {
      alignSelf: 'center',
      maxWidth: 860,
      paddingHorizontal: 5,
      paddingTop: spacing.md,
      width: '100%',
    },
    headerRow: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    headerCopy: { flex: 1, marginRight: spacing.sm },
    eyebrow: {
      color: palette.primary,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.2,
    },
    title: {
      color: palette.text,
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: -0.7,
      marginTop: 4,
    },
    subtitle: { color: palette.textMuted, fontSize: 13, lineHeight: 19, marginTop: 4 },
    kpiRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    kpiCard: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 5,
      borderWidth: 1,
      flex: 1,
      flexBasis: '30%',
      minWidth: 140,
      padding: spacing.md,
    },
    kpiValue: { color: palette.primary, fontSize: 22, fontWeight: '800' },
    kpiValueDanger: { color: palette.danger },
    kpiLabel: { color: palette.textMuted, fontSize: 11, fontWeight: '700', marginTop: 2 },
    noticeBanner: {
      backgroundColor: palette.primarySoft,
      borderColor: palette.primary,
      borderRadius: 5,
      borderWidth: 1,
      marginBottom: spacing.md,
      padding: spacing.md,
    },
    noticeText: { color: palette.text, fontSize: 12, fontWeight: '800' },
    errorBanner: {
      backgroundColor: palette.surfaceElevated,
      borderColor: palette.danger,
      borderRadius: 5,
      borderWidth: 1,
      marginBottom: spacing.md,
      padding: spacing.md,
    },
    errorTitle: { color: palette.danger, fontSize: 13, fontWeight: '800' },
    errorDescription: { color: palette.text, fontSize: 12, marginTop: spacing.xs },
    dataSourceNote: {
      color: palette.textMuted,
      fontSize: 11,
      marginBottom: spacing.sm,
    },
    tabsRow: { gap: spacing.xs, paddingBottom: spacing.md },
    tabPill: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radii.pill,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    tabPillActive: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
    },
    tabPillText: { color: palette.text, fontSize: 12, fontWeight: '700' },
    tabPillTextActive: { color: '#FFFFFF' },
    sectionList: { gap: spacing.sm },
    filterBar: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 5,
      borderWidth: 1,
      marginBottom: spacing.xs,
      padding: spacing.md,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.xs },
    filterChip: {
      backgroundColor: palette.surfaceElevated,
      borderColor: palette.border,
      borderRadius: radii.pill,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    filterChipActive: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
    },
    filterChipText: { color: palette.text, fontSize: 11, fontWeight: '700' },
    filterChipTextActive: { color: '#FFFFFF' },
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 5,
      borderWidth: 1,
      marginBottom: spacing.sm,
      padding: spacing.md,
    },
    cardTop: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'space-between',
    },
    cardTitle: { color: palette.text, flex: 1, fontSize: 15, fontWeight: '800' },
    cardMeta: { color: palette.textMuted, fontSize: 12, marginTop: 4 },
    cardDescription: {
      backgroundColor: palette.surfaceElevated,
      borderRadius: 5,
      color: palette.text,
      fontSize: 13,
      lineHeight: 19,
      marginTop: spacing.sm,
      padding: spacing.sm,
    },
    adminNoteBox: {
      backgroundColor: palette.surfaceElevated,
      borderRadius: 5,
      color: palette.text,
      fontSize: 12,
      fontWeight: '700',
      marginTop: spacing.xs,
      padding: spacing.sm,
    },
    statusBadge: {
      borderRadius: radii.pill,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    badgeSuccess: { backgroundColor: palette.primarySoft },
    badgeWarning: { backgroundColor: palette.surfaceElevated },
    badgeDanger: { backgroundColor: palette.surfaceElevated },
    badgeMuted: { backgroundColor: palette.surfaceElevated },
    statusBadgeText: { color: palette.text, fontSize: 10, fontWeight: '800' },
    input: {
      backgroundColor: palette.inputBg,
      borderColor: palette.border,
      borderRadius: 5,
      borderWidth: 1,
      color: palette.text,
      fontSize: 12,
      marginTop: spacing.xs,
      minHeight: 38,
      paddingHorizontal: spacing.md,
    },
    actionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginTop: spacing.md,
    },
    primaryBtn: {
      alignItems: 'center',
      backgroundColor: palette.primary,
      borderRadius: 5,
      justifyContent: 'center',
      minHeight: 36,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    primaryBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
    secondaryBtn: {
      alignItems: 'center',
      backgroundColor: palette.primarySoft,
      borderRadius: 5,
      justifyContent: 'center',
      minHeight: 36,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    secondaryBtnText: { color: palette.text, fontSize: 11, fontWeight: '800' },
    warningBtn: {
      alignItems: 'center',
      backgroundColor: palette.surfaceElevated,
      borderColor: palette.border,
      borderRadius: 5,
      borderWidth: 1,
      justifyContent: 'center',
      minHeight: 36,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    warningBtnText: { color: palette.text, fontSize: 11, fontWeight: '800' },
    dangerBtn: {
      alignItems: 'center',
      backgroundColor: palette.surfaceElevated,
      borderColor: palette.danger,
      borderRadius: 5,
      borderWidth: 1,
      justifyContent: 'center',
      minHeight: 36,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    dangerBtnText: { color: palette.danger, fontSize: 11, fontWeight: '800' },
    ghostBtn: {
      alignItems: 'center',
      backgroundColor: palette.surfaceElevated,
      borderColor: palette.border,
      borderRadius: 5,
      borderWidth: 1,
      justifyContent: 'center',
      minHeight: 36,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    ghostBtnText: { color: palette.textMuted, fontSize: 11, fontWeight: '700' },
    serviceMetric: { marginTop: spacing.md },
    serviceMetricHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    serviceMetricName: { color: palette.text, flex: 1, fontSize: 12, fontWeight: '700' },
    serviceMetricCount: { color: palette.textMuted, fontSize: 11, fontWeight: '700' },
    serviceMetricTrack: {
      backgroundColor: palette.surfaceElevated,
      borderRadius: radii.pill,
      height: 6,
      marginTop: 6,
      overflow: 'hidden',
    },
    serviceMetricBar: { borderRadius: radii.pill, height: '100%' },
  });
}
