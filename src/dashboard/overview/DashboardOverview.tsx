import {
  Activity,
  AlertTriangle,
  Award,
  Briefcase,
  ChevronRight,
  DollarSign,
  Star,
  TrendingUp,
  UserX,
  Users,
} from 'lucide-react-native';
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import { formatRupiah } from '../../data/marketplaceRepository';
import type {
  AdminPerformanceMetrics,
  AdminReportRecord,
  AdminUserCounts,
} from '../../data/adminStore';
import { useLanguage } from '../../i18n/locale';
import { radii, spacing } from '../../theme/tokens';
import type { BookingRecord } from '../../types/marketplace';
import type { DashboardTab } from '../types';

interface DashboardOverviewProps {
  userCounts: AdminUserCounts | null;
  metrics: AdminPerformanceMetrics;
  bookings: BookingRecord[];
  reports: AdminReportRecord[];
  deletedUsersCount: number;
  onNavigateTab: (tab: DashboardTab) => void;
}

export function DashboardOverview({
  userCounts,
  metrics,
  bookings,
  reports,
  deletedUsersCount,
  onNavigateTab,
}: DashboardOverviewProps) {
  const { language } = useLanguage();
  const { palette, scaleFont } = useAppearance();

  const mostBookedServices = metrics.servicePopularity;
  const openReports = reports.filter(
    (r) => r.status === 'submitted' || r.status === 'under_review',
  );

  return (
    <View style={styles.container}>
      {/* 1. User Instances & High-Level KPIs */}
      <View style={styles.kpiRow} testID="admin-kpi-strip">
        <Pressable
          accessibilityRole="button"
          onPress={() => onNavigateTab('accounts')}
          style={[styles.kpiCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <View style={[styles.kpiIconWrap, { backgroundColor: `${palette.primary}15` }]}>
            <Users size={16} color={palette.primary} />
          </View>
          <Text style={[styles.kpiValue, { color: palette.text, fontSize: scaleFont(20) }]}>
            {userCounts ? userCounts.customers : '—'}
          </Text>
          <Text style={[styles.kpiLabel, { color: palette.textMuted, fontSize: scaleFont(11) }]}>
            {language === 'en' ? 'Customers' : 'Pelanggan'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => onNavigateTab('accounts')}
          style={[styles.kpiCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <View style={[styles.kpiIconWrap, { backgroundColor: '#0D948815' }]}>
            <Briefcase size={16} color="#0D9488" />
          </View>
          <Text style={[styles.kpiValue, { color: '#0D9488', fontSize: scaleFont(20) }]}>
            {userCounts ? userCounts.technicians : '—'}
          </Text>
          <Text style={[styles.kpiLabel, { color: palette.textMuted, fontSize: scaleFont(11) }]}>
            {language === 'en' ? 'Technicians' : 'Teknisi'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => onNavigateTab('performance')}
          style={[styles.kpiCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <View style={[styles.kpiIconWrap, { backgroundColor: '#16A34A15' }]}>
            <DollarSign size={16} color="#16A34A" />
          </View>
          <Text style={[styles.kpiValue, { color: '#16A34A', fontSize: scaleFont(18) }]}>
            {formatRupiah(metrics.totalRevenue, language)}
          </Text>
          <Text style={[styles.kpiLabel, { color: palette.textMuted, fontSize: scaleFont(11) }]}>
            {language === 'en' ? 'Gross Volume' : 'Volume (GMV)'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => onNavigateTab('bookings')}
          style={[styles.kpiCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <View style={[styles.kpiIconWrap, { backgroundColor: `${palette.primary}15` }]}>
            <TrendingUp size={16} color={palette.primary} />
          </View>
          <Text style={[styles.kpiValue, { color: palette.text, fontSize: scaleFont(20) }]}>
            {bookings.length}
          </Text>
          <Text style={[styles.kpiLabel, { color: palette.textMuted, fontSize: scaleFont(11) }]}>
            {language === 'en' ? 'All Bookings' : 'Semua Pesanan'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => onNavigateTab('bookings')}
          style={[styles.kpiCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <View style={[styles.kpiIconWrap, { backgroundColor: '#EA580C15' }]}>
            <Activity size={16} color="#EA580C" />
          </View>
          <Text style={[styles.kpiValue, { color: '#EA580C', fontSize: scaleFont(20) }]}>
            {metrics.activeBookingsCount}
          </Text>
          <Text style={[styles.kpiLabel, { color: palette.textMuted, fontSize: scaleFont(11) }]}>
            {language === 'en' ? 'Active Jobs' : 'Pekerjaan Aktif'}
          </Text>
        </Pressable>

        {/* Deleted Accounts KPI Card */}
        <Pressable
          accessibilityRole="button"
          onPress={() => onNavigateTab('delete-user')}
          style={[
            styles.kpiCard,
            styles.kpiCardDanger,
            { backgroundColor: palette.surface, borderColor: `${palette.danger}60` },
          ]}
          testID="admin-kpi-deleted-users"
        >
          <View style={[styles.kpiIconWrap, { backgroundColor: `${palette.danger}15` }]}>
            <UserX size={16} color={palette.danger} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[styles.kpiValue, { color: palette.danger, fontSize: scaleFont(20) }]}>
              {deletedUsersCount}
            </Text>
            <ChevronRight size={16} color={palette.danger} />
          </View>
          <Text style={[styles.kpiLabel, { color: palette.danger, fontWeight: '700', fontSize: scaleFont(11) }]}>
            {language === 'en' ? 'Deleted Accounts →' : 'Akun Dihapus →'}
          </Text>
        </Pressable>
      </View>

      {/* Database Source Notice */}
      {userCounts ? (
        <Text
          style={[styles.dataSourceNote, { color: palette.textMuted, fontSize: scaleFont(11) }]}
          testID="admin-user-count-source"
        >
          {userCounts.source === 'supabase'
            ? language === 'en'
              ? 'User totals and operational metrics are computed live from PostgreSQL tables.'
              : 'Jumlah pengguna dan operasional dihitung langsung dari tabel PostgreSQL.'
            : language === 'en'
              ? 'User totals are sample data; connect Supabase for live counts.'
              : 'Jumlah pengguna adalah data contoh; hubungkan Supabase untuk data langsung.'}
        </Text>
      ) : null}

      {/* 2. Platform Graphs (Fulfillment Meter & Ratings) */}
      <View style={styles.graphsGrid}>
        <View
          style={[
            styles.graphCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.graphTitle, { color: palette.text, fontSize: scaleFont(14) }]}>
            {language === 'en' ? 'Fulfillment & Completion Rate' : 'Tingkat Penyelesaian Pesanan'}
          </Text>
          <Text style={[styles.graphBigNumber, { color: '#16A34A', fontSize: scaleFont(26) }]}>
            {metrics.completionRate}%
          </Text>
          <View
            style={[
              styles.graphProgressBg,
              { backgroundColor: palette.surfaceElevated },
            ]}
          >
            <View
              style={[
                styles.graphProgressFill,
                {
                  width: `${metrics.completionRate}%`,
                  backgroundColor: '#16A34A',
                },
              ]}
            />
          </View>
          <Text style={[styles.graphSubtext, { color: palette.textMuted, fontSize: scaleFont(11) }]}>
            {metrics.completedBookingsCount} / {metrics.totalBookingsCount}{' '}
            {language === 'en' ? 'completed bookings' : 'pesanan diselesaikan'}
          </Text>
        </View>

        <View
          style={[
            styles.graphCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.graphTitle, { color: palette.text, fontSize: scaleFont(14) }]}>
            {language === 'en' ? 'Customer Satisfaction' : 'Kepuasan Pelanggan'}
          </Text>
          <View style={styles.starRow}>
            <Star size={24} color="#F59E0B" fill="#F59E0B" />
            <Text style={[styles.graphBigNumber, { color: '#F59E0B', fontSize: scaleFont(26) }]}>
              {metrics.averageRating}
            </Text>
          </View>
          <Text style={[styles.graphSubtext, { color: palette.textMuted, fontSize: scaleFont(11) }]}>
            {metrics.totalReviewsCount}{' '}
            {language === 'en' ? 'verified ratings' : 'ulasan terverifikasi'} ({metrics.satisfactionRate}% positive)
          </Text>
        </View>
      </View>

      {/* 3. Most Requested Services Graph / Breakdown */}
      <View
        style={[
          styles.card,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
        testID="admin-most-booked-services"
      >
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.cardTitle, { color: palette.text, fontSize: scaleFont(15) }]}>
            {language === 'en'
              ? 'Most Requested Services Distribution'
              : 'Distribusi Layanan Paling Banyak Dipesan'}
          </Text>
          <Text style={[styles.cardHeaderBadge, { color: palette.textMuted, fontSize: scaleFont(11) }]}>
            {bookings.length} {language === 'en' ? 'total orders' : 'total order'}
          </Text>
        </View>

        <Text style={[styles.cardMeta, { color: palette.textMuted, fontSize: scaleFont(12) }]}>
          {language === 'en'
            ? `Ranked from ${bookings.length} bookings currently recorded in this platform database.`
            : `Diurutkan dari ${bookings.length} pesanan yang tercatat di database platform.`}
        </Text>

        {mostBookedServices.length > 0 ? (
          mostBookedServices.map((service, index) => (
            <View key={service.name} style={styles.serviceMetric}>
              <View style={styles.serviceMetricHeader}>
                <Text
                  numberOfLines={1}
                  style={[styles.serviceMetricName, { color: palette.text, fontSize: scaleFont(12) }]}
                >
                  {index + 1}. {service.name}
                </Text>
                <Text
                  style={[styles.serviceMetricCount, { color: palette.textMuted, fontSize: scaleFont(11) }]}
                >
                  {service.count} {language === 'en' ? 'orders' : 'pesanan'} ({service.percentage}%)
                </Text>
              </View>
              <View
                style={[
                  styles.serviceMetricTrack,
                  { backgroundColor: palette.surfaceElevated },
                ]}
              >
                <View
                  style={[
                    styles.serviceMetricBar,
                    {
                      width: `${Math.max(6, service.percentage)}%`,
                      backgroundColor: palette.primary,
                    },
                  ]}
                />
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.cardMeta, { color: palette.textMuted, marginTop: 8 }]}>
            {language === 'en'
              ? 'No booking data is available yet.'
              : 'Belum ada data pesanan.'}
          </Text>
        )}
      </View>

      {/* 4. Open Reports Preview on Main Dashboard (Satisfies admin-reports-section requirement on front page) */}
      <View
        style={[
          styles.card,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
        testID="admin-reports-section"
      >
        <View style={styles.cardHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={16} color={openReports.length > 0 ? palette.danger : '#16A34A'} />
            <Text style={[styles.cardTitle, { color: palette.text, fontSize: scaleFont(15) }]}>
              {language === 'en' ? 'Reports & Trust Status' : 'Status Moderasi & Laporan'}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => onNavigateTab('reports')}
            style={styles.linkRow}
          >
            <Text style={[styles.linkText, { color: palette.primary, fontSize: scaleFont(12) }]}>
              {language === 'en' ? 'View all' : 'Lihat semua'} ({reports.length}) →
            </Text>
          </Pressable>
        </View>

        {openReports.length === 0 ? (
          <Text style={[styles.cardMeta, { color: palette.textMuted, marginTop: 4, fontSize: scaleFont(12) }]}>
            {language === 'en'
              ? '✓ All marketplace disputes and service reports are clear. No pending investigations.'
              : '✓ Semua laporan sengketa selesai. Tidak ada investigasi tertunda.'}
          </Text>
        ) : (
          <View style={{ marginTop: spacing.sm, gap: 6 }}>
            {openReports.slice(0, 3).map((rep) => (
              <View
                key={rep.id}
                style={[styles.reportPreviewRow, { backgroundColor: palette.surfaceElevated }]}
                testID={`admin-report-card-${rep.id}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.reportPreviewTitle, { color: palette.text, fontSize: scaleFont(13) }]}>
                    {rep.technicianName} · {rep.category.replace(/_/g, ' ')}
                  </Text>
                  <Text numberOfLines={1} style={[styles.reportPreviewDesc, { color: palette.textMuted, fontSize: scaleFont(11) }]}>
                    {rep.description}
                  </Text>
                </View>
                <View
                  style={[
                    styles.severityBadge,
                    { backgroundColor: rep.severity === 'high' ? `${palette.danger}20` : '#F59E0B20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.severityBadgeText,
                      { color: rep.severity === 'high' ? palette.danger : '#F59E0B', fontSize: scaleFont(10) },
                    ]}
                  >
                    {rep.severity.toUpperCase()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  kpiCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    flexBasis: '30%',
    minWidth: 135,
    padding: spacing.md,
  },
  kpiCardDanger: {
    borderWidth: 1.5,
  },
  kpiIconWrap: {
    alignItems: 'center',
    borderRadius: radii.sm,
    height: 28,
    justifyContent: 'center',
    marginBottom: 6,
    width: 28,
  },
  kpiValue: {
    fontWeight: '800',
  },
  kpiLabel: {
    fontWeight: '600',
    marginTop: 2,
  },
  dataSourceNote: {
    marginBottom: 2,
  },
  graphsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  graphCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    minWidth: 150,
    padding: spacing.md,
  },
  graphTitle: {
    fontWeight: '700',
  },
  graphBigNumber: {
    fontWeight: '800',
    marginTop: 4,
  },
  graphProgressBg: {
    borderRadius: radii.pill,
    height: 6,
    marginTop: 8,
    overflow: 'hidden',
  },
  graphProgressFill: {
    borderRadius: radii.pill,
    height: '100%',
  },
  graphSubtext: {
    marginTop: 6,
  },
  starRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  cardHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontWeight: '800',
  },
  cardHeaderBadge: {
    fontWeight: '600',
  },
  cardMeta: {
    marginTop: 4,
  },
  serviceMetric: {
    marginTop: spacing.md,
  },
  serviceMetricHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  serviceMetricName: {
    flex: 1,
    fontWeight: '700',
  },
  serviceMetricCount: {
    fontWeight: '600',
  },
  serviceMetricTrack: {
    borderRadius: radii.pill,
    height: 6,
    marginTop: 6,
    overflow: 'hidden',
  },
  serviceMetricBar: {
    borderRadius: radii.pill,
    height: '100%',
  },
  linkRow: {
    paddingVertical: 2,
  },
  linkText: {
    fontWeight: '700',
  },
  reportPreviewRow: {
    alignItems: 'center',
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: 8,
    padding: spacing.sm,
  },
  reportPreviewTitle: {
    fontWeight: '700',
  },
  reportPreviewDesc: {
    marginTop: 2,
  },
  severityBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  severityBadgeText: {
    fontWeight: '800',
  },
});
