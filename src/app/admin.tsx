import { router } from 'expo-router';
import {
  Activity,
  AlertTriangle,
  Award,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  Mail,
  RefreshCw,
  Search,
  ShieldAlert,
  Star,
  TrendingUp,
  UserX,
  Users,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { useAppearance, type ThemePalette } from '../context/AppearanceContext';
import {
  addAdminServiceCategory,
  adminOverrideBookingStatus,
  computeAdminPerformanceMetrics,
  loadAdminAccounts,
  loadAdminApplications,
  loadAdminBookings,
  loadAdminCategories,
  loadAdminDeletionFeedbacks,
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
import { formatRupiah, shouldUseFixtures } from '../data/marketplaceRepository';
import { useLanguage } from '../i18n/locale';
import { radii, spacing } from '../theme/tokens';
import type { BookingRecord, ServiceCategory } from '../types/marketplace';

type AdminTab =
  | 'reports'
  | 'performance'
  | 'accounts'
  | 'applications'
  | 'bookings'
  | 'deletions'
  | 'platform';

type AccountFilter = 'all' | 'customer' | 'technician' | 'blocked';
type DeletionFilter = 'all' | 'customer' | 'technician';

export default function AdminConsoleScreen() {
  const { language } = useLanguage();
  const { palette } = useAppearance();
  const { user, roles, effectiveRole } = useAuth();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [tab, setTab] = useState<AdminTab>('reports');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [reports, setReports] = useState<AdminReportRecord[]>([]);
  const [accounts, setAccounts] = useState<AdminAccountRecord[]>([]);
  const [applications, setApplications] = useState<AdminTechnicianApplication[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [userCounts, setUserCounts] = useState<AdminUserCounts | null>(null);
  const [deletionFeedbacks, setDeletionFeedbacks] = useState<AdminDeletionFeedback[]>([]);

  // Filtering states
  const [accountFilter, setAccountFilter] = useState<AccountFilter>('all');
  const [accountSearch, setAccountSearch] = useState('');
  const [deletionFilter, setDeletionFilter] = useState<DeletionFilter>('all');
  const [deletionSearch, setDeletionSearch] = useState('');

  const [reportNoteMap, setReportNoteMap] = useState<Record<string, string>>({});
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [adminNotice, setAdminNotice] = useState<string | null>(null);

  const isPreview = shouldUseFixtures();
  const isAdminAuthorized = Boolean(user) && roles.includes('admin');

  const fetchDashboardData = async (isManualRefresh = false) => {
    if (!isAdminAuthorized) return;
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [reps, accs, apps, bks, cats, counts, feedbacks] = await Promise.all([
        loadAdminReports(),
        loadAdminAccounts(),
        loadAdminApplications(),
        loadAdminBookings(),
        loadAdminCategories(),
        loadAdminUserCounts(),
        loadAdminDeletionFeedbacks(),
      ]);

      setReports(reps);
      setAccounts(accs);
      setApplications(apps);
      setBookings(bks);
      setCategories(cats);
      setUserCounts(counts);
      setDeletionFeedbacks(feedbacks);
      setLoadError(null);
    } catch (error: unknown) {
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchDashboardData();
  }, [isAdminAuthorized]);

  // Dynamic Performance Metrics
  const metrics: AdminPerformanceMetrics = useMemo(
    () =>
      computeAdminPerformanceMetrics({
        bookings,
        accounts,
        feedbacks: deletionFeedbacks,
      }),
    [bookings, accounts, deletionFeedbacks],
  );

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

  const filteredDeletions = useMemo(() => {
    const q = deletionSearch.trim().toLowerCase();
    return deletionFeedbacks.filter((item) => {
      if (deletionFilter === 'customer' && item.userRole !== 'customer') return false;
      if (deletionFilter === 'technician' && item.userRole !== 'technician') return false;
      if (!q) return true;
      return (
        item.userDisplayName.toLowerCase().includes(q) ||
        (item.userEmail && item.userEmail.toLowerCase().includes(q)) ||
        item.reasonCategory.toLowerCase().includes(q) ||
        (item.feedbackNotes && item.feedbackNotes.toLowerCase().includes(q))
      );
    });
  }, [deletionFeedbacks, deletionFilter, deletionSearch]);

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
      status === 'active' ? undefined : `Account ${status} by Administrator`,
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

  const getReasonLabel = (key: string): string => {
    const dict: Record<string, { en: string; id: string }> = {
      not_needed: { en: 'No Longer Needed', id: 'Tidak Dibutuhkan Lagi' },
      rarely_used: { en: 'Rarely Used', id: 'Jarang Digunakan' },
      privacy_concerns: { en: 'Privacy & Security', id: 'Privasi & Data' },
      found_alternative: { en: 'Used Other Service', id: 'Pakai Layanan Lain' },
      technical_issues: { en: 'Technical Problems', id: 'Kendala Teknis' },
      fees: { en: 'Pricing & Fees', id: 'Biaya & Tarif' },
      relocated: { en: 'Relocated / Moved', id: 'Pindah Domisili' },
      career_change: { en: 'Career Change', id: 'Ganti Profesi' },
      other: { en: 'Other Feedback', id: 'Alasan Lainnya' },
    };
    const match = dict[key];
    if (match) return language === 'en' ? match.en : match.id;
    return key.replace(/_/g, ' ');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.screenContent}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.container}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <View style={styles.brandRow}>
                <ShieldAlert size={16} color={palette.primary} />
                <Text style={styles.eyebrow}>
                  {language === 'en'
                    ? 'EXECUTIVE OPERATIONS & GOVERNANCE'
                    : 'KONTROL OPERASIONAL & MODERASI'}
                </Text>
              </View>
              <Text style={styles.title} testID="admin-console-heading">
                {language === 'en' ? 'Admin Command Center' : 'Pusat Kontrol Admin'}
              </Text>
              <Text style={styles.subtitle}>
                {language === 'en'
                  ? 'Real-time platform performance, user analytics, churn audits, and marketplace moderation.'
                  : 'Pantau performa live marketplace, analitik pengguna, audit penghapusan akun, dan moderasi.'}
              </Text>
            </View>

            <View style={styles.headerRight}>
              {isPreview && <SourceBadge source="fixtures" />}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Refresh Data"
                disabled={refreshing}
                onPress={() => void fetchDashboardData(true)}
                style={styles.refreshBtn}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color={palette.primary} />
                ) : (
                  <RefreshCw size={16} color={palette.text} />
                )}
              </Pressable>
            </View>
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
              {/* Operational Overview KPI Strip */}
              <View style={styles.kpiRow} testID="admin-kpi-strip">
                <View style={styles.kpiCard}>
                  <View style={styles.kpiIconWrap}>
                    <Users size={16} color={palette.primary} />
                  </View>
                  <Text style={styles.kpiValue}>
                    {userCounts ? userCounts.customers : '—'}
                  </Text>
                  <Text style={styles.kpiLabel}>
                    {language === 'en' ? 'Customers' : 'Pelanggan'}
                  </Text>
                </View>

                <View style={styles.kpiCard}>
                  <View style={styles.kpiIconWrap}>
                    <Briefcase size={16} color="#0D9488" />
                  </View>
                  <Text style={[styles.kpiValue, { color: '#0D9488' }]}>
                    {userCounts ? userCounts.technicians : '—'}
                  </Text>
                  <Text style={styles.kpiLabel}>
                    {language === 'en' ? 'Technicians' : 'Teknisi'}
                  </Text>
                </View>

                <View style={styles.kpiCard}>
                  <View style={styles.kpiIconWrap}>
                    <DollarSign size={16} color="#16A34A" />
                  </View>
                  <Text style={[styles.kpiValue, { color: '#16A34A' }]}>
                    {formatRupiah(metrics.totalRevenue, language)}
                  </Text>
                  <Text style={styles.kpiLabel}>
                    {language === 'en' ? 'Gross Volume (GMV)' : 'Total Volume (GMV)'}
                  </Text>
                </View>

                <View style={styles.kpiCard}>
                  <View style={styles.kpiIconWrap}>
                    <TrendingUp size={16} color={palette.primary} />
                  </View>
                  <Text style={styles.kpiValue}>{bookings.length}</Text>
                  <Text style={styles.kpiLabel}>
                    {language === 'en' ? 'All Bookings' : 'Semua Pesanan'}
                  </Text>
                </View>

                <View style={styles.kpiCard}>
                  <View style={styles.kpiIconWrap}>
                    <Activity size={16} color="#EA580C" />
                  </View>
                  <Text style={[styles.kpiValue, { color: '#EA580C' }]}>
                    {activeBookingsCount}
                  </Text>
                  <Text style={styles.kpiLabel}>
                    {language === 'en' ? 'Active Jobs' : 'Pekerjaan Aktif'}
                  </Text>
                </View>

                <View style={styles.kpiCard}>
                  <View style={styles.kpiIconWrap}>
                    <UserX size={16} color={palette.danger} />
                  </View>
                  <Text style={[styles.kpiValue, styles.kpiValueDanger]}>
                    {deletionFeedbacks.length}
                  </Text>
                  <Text style={styles.kpiLabel}>
                    {language === 'en' ? 'Deleted Accounts' : 'Akun Dihapus'}
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
                      ? 'Live metrics computed from production PostgreSQL tables.'
                      : 'Metrik live dihitung langsung dari tabel PostgreSQL produksi.'
                    : language === 'en'
                      ? 'Running in local preview mode with sample data.'
                      : 'Berjalan dalam mode pratinjau lokal dengan data sampel.'}
                </Text>
              ) : null}

              {/* Most Booked Services Card */}
              <View style={styles.card} testID="admin-most-booked-services">
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>
                    {language === 'en' ? 'Most Requested Services' : 'Layanan Paling Banyak Dipesan'}
                  </Text>
                  <Text style={styles.cardHeaderBadge}>
                    {bookings.length} {language === 'en' ? 'total orders' : 'total order'}
                  </Text>
                </View>
                <Text style={styles.cardMeta}>
                  {language === 'en'
                    ? `Live ranking calculated across ${bookings.length} recorded platform bookings.`
                    : `Peringkat langsung dihitung dari ${bookings.length} riwayat pesanan marketplace.`}
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
                                (service.count / (mostBookedServices[0]?.count || 1)) * 100,
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

              {/* Navigation Tabs */}
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
                        ? `Reports (${openReportsCount})`
                        : `Laporan (${openReportsCount})`,
                    ],
                    [
                      'performance',
                      language === 'en'
                        ? 'Performance & Analytics'
                        : 'Performa & Analitik',
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
                      'deletions',
                      language === 'en'
                        ? `Churn & Feedback (${deletionFeedbacks.length})`
                        : `Audit Penghapusan (${deletionFeedbacks.length})`,
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
                    <Text
                      style={[
                        styles.tabPillText,
                        tab === key && styles.tabPillTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {loading ? (
                <LoadingState
                  label={
                    language === 'en'
                      ? 'Loading live admin data...'
                      : 'Memuat data administrasi...'
                  }
                />
              ) : tab === 'reports' ? (
                <View style={styles.sectionList} testID="admin-reports-section">
                  {reports.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <CheckCircle2 size={32} color="#16A34A" />
                      <Text style={styles.emptyTitle}>
                        {language === 'en' ? 'No Open Reports' : 'Tidak Ada Laporan Terbuka'}
                      </Text>
                      <Text style={styles.emptySubtitle}>
                        {language === 'en'
                          ? 'The marketplace is operating safely with no pending customer disputes.'
                          : 'Marketplace beroperasi dengan aman tanpa sengketa pelanggan.'}
                      </Text>
                    </View>
                  ) : (
                    reports.map((rep) => (
                      <View
                        key={rep.id}
                        style={styles.card}
                        testID={`admin-report-card-${rep.id}`}
                      >
                        <View style={styles.cardTop}>
                          <Text style={styles.cardTitle}>
                            {rep.technicianName} ·{' '}
                            {rep.category.replace(/_/g, ' ').toUpperCase()}
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
                          {language === 'en' ? 'Reporter:' : 'Pelapor:'}{' '}
                          {rep.reporterUserId} ·{' '}
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
                              {language === 'en'
                                ? 'Start investigation'
                                : 'Mulai investigasi'}
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
                                : 'Selesaikan · tanpa tindakan'}
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
                              {language === 'en' ? 'Dismiss' : 'Tutup Laporan'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              ) : tab === 'performance' ? (
                /* Dynamic Performance & Analytics Tab */
                <View style={styles.sectionList} testID="admin-performance-section">
                  {/* Grid of Key Performance Cards */}
                  <View style={styles.performanceGrid}>
                    <View style={styles.perfMetricCard}>
                      <Text style={styles.perfMetricLabel}>
                        {language === 'en' ? 'Completion Rate' : 'Tingkat Penyelesaian'}
                      </Text>
                      <Text style={[styles.perfMetricValue, { color: '#16A34A' }]}>
                        {metrics.completionRate}%
                      </Text>
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${metrics.completionRate}%`,
                              backgroundColor: '#16A34A',
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.perfMetricSub}>
                        {metrics.completedBookingsCount} / {metrics.totalBookingsCount}{' '}
                        {language === 'en' ? 'orders completed' : 'pesanan selesai'}
                      </Text>
                    </View>

                    <View style={styles.perfMetricCard}>
                      <Text style={styles.perfMetricLabel}>
                        {language === 'en' ? 'Average Rating' : 'Rata-Rata Rating'}
                      </Text>
                      <View style={styles.ratingValRow}>
                        <Star size={20} color="#F59E0B" fill="#F59E0B" />
                        <Text style={[styles.perfMetricValue, { color: '#F59E0B' }]}>
                          {metrics.averageRating}
                        </Text>
                      </View>
                      <Text style={styles.perfMetricSub}>
                        {metrics.totalReviewsCount}{' '}
                        {language === 'en' ? 'customer reviews' : 'ulasan pelanggan'} (
                        {metrics.satisfactionRate}% satisfaction)
                      </Text>
                    </View>
                  </View>

                  {/* Top Technician Leaderboard */}
                  <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Award size={18} color={palette.primary} />
                        <Text style={styles.cardTitle}>
                          {language === 'en'
                            ? 'Top Performing Technicians'
                            : 'Klasemen Teknisi Berkinerja Terbaik'}
                        </Text>
                      </View>
                      <Text style={styles.cardHeaderBadge}>
                        {metrics.topTechnicians.length}{' '}
                        {language === 'en' ? 'ranked' : 'teratas'}
                      </Text>
                    </View>
                    <Text style={styles.cardMeta}>
                      {language === 'en'
                        ? 'Dynamic leaderboard calculated from verified customer jobs and booking volume.'
                        : 'Peringkat live dihitung dari riwayat penyelesaian kerja dan volume order.'}
                    </Text>

                    <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                      {metrics.topTechnicians.map((tech, index) => (
                        <View key={tech.id} style={styles.leaderboardRow}>
                          <View style={styles.rankCircle}>
                            <Text style={styles.rankText}>#{index + 1}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.leaderboardName}>{tech.name}</Text>
                            <Text style={styles.leaderboardMeta}>
                              {tech.completedJobs}{' '}
                              {language === 'en' ? 'completed jobs' : 'pekerjaan selesai'} ·{' '}
                              {formatRupiah(tech.revenue, language)}
                            </Text>
                          </View>
                          <View style={styles.leaderboardRating}>
                            <Star size={14} color="#F59E0B" fill="#F59E0B" />
                            <Text style={styles.ratingText}>{tech.rating}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Churn Alert Card */}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setTab('deletions')}
                    style={[styles.card, { borderColor: `${palette.danger}60` }]}
                  >
                    <View style={styles.cardTop}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <UserX size={18} color={palette.danger} />
                        <Text style={[styles.cardTitle, { color: palette.danger }]}>
                          {language === 'en'
                            ? 'User Churn & Deletion Audits'
                            : 'Audit Pengunduran Diri Pengguna'}
                        </Text>
                      </View>
                      <ChevronRight size={18} color={palette.danger} />
                    </View>
                    <Text style={styles.cardMeta}>
                      {language === 'en'
                        ? `${metrics.churnCount} accounts have been permanently deleted. Tap to review their full departure reasons and written feedback.`
                        : `${metrics.churnCount} akun telah dihapus secara permanen. Ketuk untuk meninjau alasan dan masukan lengkap mereka.`}
                    </Text>
                  </Pressable>
                </View>
              ) : tab === 'accounts' ? (
                <View style={styles.sectionList} testID="admin-accounts-section">
                  <View style={styles.filterBar}>
                    <View style={styles.searchBox}>
                      <Search size={16} color={palette.textMuted} />
                      <TextInput
                        onChangeText={setAccountSearch}
                        placeholder={
                          language === 'en'
                            ? 'Search name, email, or city...'
                            : 'Cari nama, email, atau kota...'
                        }
                        placeholderTextColor={palette.textMuted}
                        style={styles.searchInput}
                        testID="admin-account-search"
                        value={accountSearch}
                      />
                    </View>

                    <View style={styles.chipRow}>
                      {(
                        [
                          ['all', language === 'en' ? 'All Roles' : 'Semua Peran'],
                          ['customer', language === 'en' ? 'Customers' : 'Pelanggan'],
                          ['technician', language === 'en' ? 'Technicians' : 'Teknisi'],
                          [
                            'blocked',
                            language === 'en' ? 'Blocked / Suspended' : 'Diblokir',
                          ],
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
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.cardTitle}>{acc.displayName}</Text>
                            {acc.verified && (
                              <View style={styles.verifiedTag}>
                                <Text style={styles.verifiedTagText}>✓</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.cardMeta}>
                            {acc.role.toUpperCase()} · {acc.email} · {acc.area}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            acc.status === 'active'
                              ? styles.badgeSuccess
                              : styles.badgeDanger,
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
                              {language === 'en'
                                ? 'Unblock & Reactivate'
                                : 'Buka Blokir & Aktifkan'}
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
                                  ? '✓ Verified (Revoke)'
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
                            {app.PrimaryCategory} · {app.serviceArea} ·{' '}
                            {app.yearsExperience} yrs exp
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
                            {language === 'en'
                              ? 'Approve Technician'
                              : 'Setujui Teknisi'}
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
                            {language === 'en'
                              ? 'Reject Application'
                              : 'Tolak Pendaftaran'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              ) : tab === 'bookings' ? (
                <View style={styles.sectionList} testID="admin-bookings-section">
                  {bookings.map((bk) => (
                    <View
                      key={bk.id}
                      style={styles.card}
                      testID={`admin-booking-card-${bk.id}`}
                    >
                      <View style={styles.cardTop}>
                        <Text style={styles.cardTitle}>{bk.serviceNameSnapshot}</Text>
                        <View
                          style={[
                            styles.statusBadge,
                            bk.status === 'completed'
                              ? styles.badgeSuccess
                              : ['cancelled', 'declined'].includes(bk.status)
                                ? styles.badgeDanger
                                : styles.badgeWarning,
                          ]}
                        >
                          <Text style={styles.statusBadgeText}>
                            {bk.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.cardMeta}>
                        {language === 'en' ? 'Customer:' : 'Pelanggan:'}{' '}
                        {bk.customerName} ·{' '}
                        {language === 'en' ? 'Technician:' : 'Teknisi:'}{' '}
                        {bk.technicianName}
                      </Text>
                      <Text style={styles.cardMeta}>
                        {bk.customerAddress} ·{' '}
                        {bk.agreedPrice
                          ? formatRupiah(bk.agreedPrice, language)
                          : '-'}
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
              ) : tab === 'deletions' ? (
                /* Account Deletion Feedbacks Tab */
                <View style={styles.sectionList} testID="admin-deletions-section">
                  <View style={styles.filterBar}>
                    <View style={styles.searchBox}>
                      <Search size={16} color={palette.textMuted} />
                      <TextInput
                        onChangeText={setDeletionSearch}
                        placeholder={
                          language === 'en'
                            ? 'Search deleted name, email, or reason...'
                            : 'Cari nama, email, atau alasan akun terhapus...'
                        }
                        placeholderTextColor={palette.textMuted}
                        style={styles.searchInput}
                        testID="admin-deletion-search"
                        value={deletionSearch}
                      />
                    </View>

                    <View style={styles.chipRow}>
                      {(
                        [
                          ['all', language === 'en' ? 'All Roles' : 'Semua Peran'],
                          ['customer', language === 'en' ? 'Customers' : 'Pelanggan'],
                          ['technician', language === 'en' ? 'Technicians' : 'Teknisi'],
                        ] as const
                      ).map(([key, label]) => (
                        <Pressable
                          key={key}
                          accessibilityRole="button"
                          onPress={() => setDeletionFilter(key)}
                          style={[
                            styles.filterChip,
                            deletionFilter === key && styles.filterChipActive,
                          ]}
                          testID={`admin-deletion-filter-${key}`}
                        >
                          <Text
                            style={[
                              styles.filterChipText,
                              deletionFilter === key && styles.filterChipTextActive,
                            ]}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {filteredDeletions.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <CheckCircle2 size={32} color="#16A34A" />
                      <Text style={styles.emptyTitle}>
                        {language === 'en'
                          ? 'No Deletion Records Found'
                          : 'Tidak Ada Rekaman Penghapusan'}
                      </Text>
                      <Text style={styles.emptySubtitle}>
                        {language === 'en'
                          ? 'No user account deletion feedback matches your criteria.'
                          : 'Tidak ada masukan pengunduran diri yang sesuai filter.'}
                      </Text>
                    </View>
                  ) : (
                    filteredDeletions.map((item) => (
                      <View
                        key={item.id}
                        style={styles.card}
                        testID={`admin-deletion-card-${item.id}`}
                      >
                        <View style={styles.cardTop}>
                          <View style={{ flex: 1 }}>
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <Text style={styles.cardTitle}>
                                {item.userDisplayName}
                              </Text>
                              <View
                                style={[
                                  styles.roleBadge,
                                  {
                                    backgroundColor:
                                      item.userRole === 'technician'
                                        ? '#0D948820'
                                        : `${palette.primary}18`,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.roleBadgeText,
                                    {
                                      color:
                                        item.userRole === 'technician'
                                          ? '#0D9488'
                                          : palette.primary,
                                    },
                                  ]}
                                >
                                  {item.userRole.toUpperCase()}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.cardMeta}>
                              {item.userEmail || 'No email stored'} ·{' '}
                              {new Date(item.deletedAt).toLocaleDateString(
                                language === 'en' ? 'en-US' : 'id-ID',
                                {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                },
                              )}
                            </Text>
                          </View>

                          <View style={styles.reasonBadge}>
                            <Text style={styles.reasonBadgeText}>
                              {getReasonLabel(item.reasonCategory)}
                            </Text>
                          </View>
                        </View>

                        {item.feedbackNotes ? (
                          <View style={styles.feedbackNoteBox}>
                            <Text style={styles.feedbackQuote}>“</Text>
                            <Text style={styles.feedbackNoteText}>
                              {item.feedbackNotes}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ))
                  )}
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
                        language === 'en'
                          ? 'Category name (e.g., Solar Panel)'
                          : 'Nama kategori'
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
                        {language === 'en'
                          ? 'Publish Category'
                          : 'Terbitkan Kategori'}
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
      paddingHorizontal: 8,
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
    headerRight: { alignItems: 'flex-end', gap: 6 },
    brandRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    eyebrow: {
      color: palette.primary,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.2,
    },
    title: {
      color: palette.text,
      fontSize: 26,
      fontWeight: '800',
      letterSpacing: -0.6,
      marginTop: 4,
    },
    subtitle: {
      color: palette.textMuted,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 4,
    },
    refreshBtn: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radii.sm,
      borderWidth: 1,
      height: 36,
      justifyContent: 'center',
      width: 36,
    },
    kpiRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    kpiCard: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radii.md,
      borderWidth: 1,
      flex: 1,
      flexBasis: '30%',
      minWidth: 135,
      padding: spacing.md,
    },
    kpiIconWrap: {
      alignItems: 'center',
      backgroundColor: palette.surfaceElevated,
      borderRadius: radii.sm,
      height: 28,
      justifyContent: 'center',
      marginBottom: 6,
      width: 28,
    },
    kpiValue: { color: palette.text, fontSize: 20, fontWeight: '800' },
    kpiValueDanger: { color: palette.danger },
    kpiLabel: {
      color: palette.textMuted,
      fontSize: 11,
      fontWeight: '600',
      marginTop: 2,
    },
    noticeBanner: {
      backgroundColor: palette.primarySoft,
      borderColor: palette.primary,
      borderRadius: radii.sm,
      borderWidth: 1,
      marginBottom: spacing.md,
      padding: spacing.md,
    },
    noticeText: { color: palette.text, fontSize: 12, fontWeight: '700' },
    errorBanner: {
      backgroundColor: palette.surfaceElevated,
      borderColor: palette.danger,
      borderRadius: radii.sm,
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
      borderRadius: radii.md,
      borderWidth: 1,
      marginBottom: spacing.xs,
      padding: spacing.md,
    },
    searchBox: {
      alignItems: 'center',
      backgroundColor: palette.inputBg,
      borderColor: palette.border,
      borderRadius: radii.sm,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 8,
      minHeight: 40,
      paddingHorizontal: 10,
    },
    searchInput: {
      color: palette.text,
      flex: 1,
      fontSize: 13,
      minHeight: 38,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
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
      borderRadius: radii.md,
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
    cardHeaderRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    cardHeaderBadge: {
      color: palette.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    cardTitle: { color: palette.text, flex: 1, fontSize: 15, fontWeight: '800' },
    cardMeta: { color: palette.textMuted, fontSize: 12, marginTop: 4 },
    cardDescription: {
      backgroundColor: palette.surfaceElevated,
      borderRadius: radii.sm,
      color: palette.text,
      fontSize: 13,
      lineHeight: 19,
      marginTop: spacing.sm,
      padding: spacing.sm,
    },
    adminNoteBox: {
      backgroundColor: palette.surfaceElevated,
      borderRadius: radii.sm,
      color: palette.text,
      fontSize: 12,
      fontWeight: '600',
      marginTop: spacing.xs,
      padding: spacing.sm,
    },
    statusBadge: {
      borderRadius: radii.pill,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    badgeSuccess: { backgroundColor: '#16A34A20' },
    badgeWarning: { backgroundColor: '#F59E0B20' },
    badgeDanger: { backgroundColor: '#DC262620' },
    badgeMuted: { backgroundColor: palette.surfaceElevated },
    statusBadgeText: { color: palette.text, fontSize: 10, fontWeight: '800' },
    roleBadge: {
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    roleBadgeText: {
      fontSize: 10,
      fontWeight: '800',
    },
    verifiedTag: {
      alignItems: 'center',
      backgroundColor: palette.primary,
      borderRadius: radii.pill,
      height: 16,
      justifyContent: 'center',
      width: 16,
    },
    verifiedTagText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '900',
    },
    input: {
      backgroundColor: palette.inputBg,
      borderColor: palette.border,
      borderRadius: radii.sm,
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
      borderRadius: radii.sm,
      justifyContent: 'center',
      minHeight: 36,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    primaryBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
    secondaryBtn: {
      alignItems: 'center',
      backgroundColor: palette.primarySoft,
      borderRadius: radii.sm,
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
      borderRadius: radii.sm,
      borderWidth: 1,
      justifyContent: 'center',
      minHeight: 36,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    warningBtnText: { color: palette.text, fontSize: 11, fontWeight: '800' },
    dangerBtn: {
      alignItems: 'center',
      backgroundColor: `${palette.danger}15`,
      borderColor: palette.danger,
      borderRadius: radii.sm,
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
      borderRadius: radii.sm,
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
      gap: spacing.sm,
      justifyContent: 'space-between',
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
    // Performance Tab Styles
    performanceGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    perfMetricCard: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radii.md,
      borderWidth: 1,
      flex: 1,
      minWidth: 150,
      padding: spacing.md,
    },
    perfMetricLabel: {
      color: palette.textMuted,
      fontSize: 11,
      fontWeight: '700',
    },
    perfMetricValue: {
      fontSize: 24,
      fontWeight: '800',
      marginTop: 4,
    },
    perfMetricSub: {
      color: palette.textMuted,
      fontSize: 11,
      marginTop: 6,
    },
    progressBarBg: {
      backgroundColor: palette.surfaceElevated,
      borderRadius: radii.pill,
      height: 6,
      marginTop: 8,
      overflow: 'hidden',
    },
    progressBarFill: {
      borderRadius: radii.pill,
      height: '100%',
    },
    ratingValRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 6,
      marginTop: 4,
    },
    leaderboardRow: {
      alignItems: 'center',
      backgroundColor: palette.surfaceElevated,
      borderRadius: radii.sm,
      flexDirection: 'row',
      gap: 12,
      padding: spacing.sm,
    },
    rankCircle: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radii.pill,
      borderWidth: 1,
      height: 28,
      justifyContent: 'center',
      width: 28,
    },
    rankText: {
      color: palette.text,
      fontSize: 11,
      fontWeight: '800',
    },
    leaderboardName: {
      color: palette.text,
      fontSize: 13,
      fontWeight: '700',
    },
    leaderboardMeta: {
      color: palette.textMuted,
      fontSize: 11,
      marginTop: 2,
    },
    leaderboardRating: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 4,
    },
    ratingText: {
      color: palette.text,
      fontSize: 12,
      fontWeight: '800',
    },
    // Deletions Feedbacks Styles
    reasonBadge: {
      backgroundColor: `${palette.danger}15`,
      borderColor: `${palette.danger}30`,
      borderRadius: radii.pill,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    reasonBadgeText: {
      color: palette.danger,
      fontSize: 10,
      fontWeight: '800',
    },
    feedbackNoteBox: {
      backgroundColor: palette.surfaceElevated,
      borderRadius: radii.sm,
      flexDirection: 'row',
      gap: 6,
      marginTop: spacing.sm,
      padding: spacing.md,
    },
    feedbackQuote: {
      color: palette.primary,
      fontSize: 18,
      fontWeight: '900',
      lineHeight: 18,
    },
    feedbackNoteText: {
      color: palette.text,
      flex: 1,
      fontSize: 12,
      fontStyle: 'italic',
      lineHeight: 18,
    },
    emptyCard: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radii.md,
      borderWidth: 1,
      justifyContent: 'center',
      padding: spacing.xxl,
    },
    emptyTitle: {
      color: palette.text,
      fontSize: 15,
      fontWeight: '800',
      marginTop: spacing.sm,
    },
    emptySubtitle: {
      color: palette.textMuted,
      fontSize: 12,
      marginTop: 4,
      textAlign: 'center',
    },
  });
}
