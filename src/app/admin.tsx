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
  toggleAdminTechnicianVerified,
  updateAdminAccountModeration,
  updateAdminApplicationStatus,
  updateAdminReportStatus,
  type AccountStatus,
  type AdminAccountRecord,
  type AdminReportRecord,
  type AdminTechnicianApplication,
} from '../data/adminStore';
import { formatRupiah, shouldUseFixtures } from '../data/marketplaceRepository';
import { useLanguage } from '../i18n/locale';
import { colors, radii, spacing } from '../theme/tokens';
import type { BookingRecord, ServiceCategory } from '../types/marketplace';

type AdminTab = 'reports' | 'accounts' | 'applications' | 'bookings' | 'platform';
type AccountFilter = 'all' | 'customer' | 'technician' | 'blocked';

export default function AdminConsoleScreen() {
  const { language } = useLanguage();
  const { user, roles, effectiveRole } = useAuth();
  const [tab, setTab] = useState<AdminTab>('reports');
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<AdminReportRecord[]>([]);
  const [accounts, setAccounts] = useState<AdminAccountRecord[]>([]);
  const [applications, setApplications] = useState<AdminTechnicianApplication[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
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
    void Promise.all([
      loadAdminReports(),
      loadAdminAccounts(),
      loadAdminApplications(),
      loadAdminBookings(),
      loadAdminCategories(),
    ])
      .then(([reps, accs, apps, bks, cats]) => {
        if (!active) return;
        setReports(reps);
        setAccounts(accs);
        setApplications(apps);
        setBookings(bks);
        setCategories(cats);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const openReportsCount = useMemo(
    () => reports.filter((r) => r.status === 'submitted' || r.status === 'under_review').length,
    [reports],
  );
  const blockedAccountsCount = useMemo(
    () => accounts.filter((a) => a.status !== 'active').length,
    [accounts],
  );
  const pendingAppsCount = useMemo(
    () => applications.filter((a) => a.status === 'pending').length,
    [applications],
  );

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
      <AppNavigationBar activeTab="admin" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
                  ? 'Review and accept reports, block or reactivate customer and technician accounts, approve technician applications, and manage the marketplace.'
                  : 'Tinjau dan terima laporan kendala, blokir atau aktifkan kembali akun pelanggan & teknisi, setujui pendaftaran teknisi, serta kelola operasional aplikasi.'}
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
              {/* KPI Metrics Strip */}
              <View style={styles.kpiRow} testID="admin-kpi-strip">
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiValue}>{openReportsCount}</Text>
                  <Text style={styles.kpiLabel}>
                    {language === 'en' ? 'Open Reports' : 'Laporan Aktif'}
                  </Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiValue}>{accounts.length}</Text>
                  <Text style={styles.kpiLabel}>
                    {language === 'en' ? 'Total Accounts' : 'Total Akun'}
                  </Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={[styles.kpiValue, styles.kpiValueDanger]}>
                    {blockedAccountsCount}
                  </Text>
                  <Text style={styles.kpiLabel}>
                    {language === 'en' ? 'Blocked / Restricted' : 'Akun Diblokir'}
                  </Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiValue}>{pendingAppsCount}</Text>
                  <Text style={styles.kpiLabel}>
                    {language === 'en' ? 'Pending Techs' : 'Antrean Teknisi'}
                  </Text>
                </View>
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
                            {rep.status.toUpperCase()}
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

                      <TextInput
                        onChangeText={(txt) =>
                          setReportNoteMap((prev) => ({ ...prev, [rep.id]: txt }))
                        }
                        placeholder={
                          language === 'en'
                            ? 'Add moderation or investigation note...'
                            : 'Tambahkan catatan investigasi atau tindak lanjut...'
                        }
                        placeholderTextColor={colors.muted}
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
                            {language === 'en' ? 'Accept & Investigate' : 'Terima & Tinjau'}
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
                            {language === 'en' ? 'Mark Resolved' : 'Selesaikan Laporan'}
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
                              ? 'Resolve & Block Account'
                              : 'Selesaikan & Blokir Akun'}
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
                            {language === 'en' ? 'Dismiss' : 'Tolak'}
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
                      placeholderTextColor={colors.muted}
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
                      placeholderTextColor={colors.muted}
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
                      placeholderTextColor={colors.muted}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.paper, flex: 1 },
  scrollContent: { paddingBottom: spacing.xxxl },
  container: {
    alignSelf: 'center',
    maxWidth: 860,
    paddingHorizontal: spacing.xl,
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
  eyebrow: { color: colors.orange, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.7, marginTop: 4 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  kpiCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    minWidth: 130,
    padding: spacing.md,
  },
  kpiValue: { color: colors.greenDark, fontSize: 22, fontWeight: '800' },
  kpiValueDanger: { color: colors.danger },
  kpiLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  noticeBanner: {
    backgroundColor: colors.greenSoft,
    borderColor: colors.green,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  noticeText: { color: colors.greenDark, fontSize: 12, fontWeight: '800' },
  tabsRow: { gap: spacing.xs, paddingBottom: spacing.md },
  tabPill: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tabPillActive: {
    backgroundColor: colors.greenDark,
    borderColor: colors.greenDark,
  },
  tabPillText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  tabPillTextActive: { color: '#FFFFFF' },
  sectionList: { gap: spacing.sm },
  filterBar: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
    padding: spacing.md,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.xs },
  filterChip: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterChipActive: { backgroundColor: colors.greenDark, borderColor: colors.greenDark },
  filterChipText: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  filterChipTextActive: { color: '#FFFFFF' },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    padding: spacing.lg,
  },
  cardTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  cardTitle: { color: colors.ink, flex: 1, fontSize: 15, fontWeight: '800' },
  cardMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  cardDescription: {
    backgroundColor: colors.paper,
    borderRadius: radii.sm,
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  adminNoteBox: {
    backgroundColor: '#FFF4E5',
    borderRadius: radii.sm,
    color: '#7D490A',
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
  badgeSuccess: { backgroundColor: colors.greenSoft },
  badgeWarning: { backgroundColor: colors.orangeSoft },
  badgeDanger: { backgroundColor: '#FBEDEA' },
  badgeMuted: { backgroundColor: colors.paper },
  statusBadgeText: { color: colors.ink, fontSize: 10, fontWeight: '800' },
  input: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.ink,
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
    backgroundColor: colors.greenDark,
    borderRadius: radii.sm,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  secondaryBtn: {
    alignItems: 'center',
    backgroundColor: colors.greenSoft,
    borderRadius: radii.sm,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  secondaryBtnText: { color: colors.greenDark, fontSize: 11, fontWeight: '800' },
  warningBtn: {
    alignItems: 'center',
    backgroundColor: colors.orangeSoft,
    borderColor: colors.orange,
    borderRadius: radii.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  warningBtnText: { color: colors.orange, fontSize: 11, fontWeight: '800' },
  dangerBtn: {
    alignItems: 'center',
    backgroundColor: '#FBEDEA',
    borderColor: colors.danger,
    borderRadius: radii.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dangerBtnText: { color: colors.danger, fontSize: 11, fontWeight: '800' },
  ghostBtn: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ghostBtnText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
});
