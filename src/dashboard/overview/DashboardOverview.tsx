import {
  Activity,
  AlertTriangle,
  Award,
  Briefcase,
  CheckCircle2,
  DollarSign,
  Percent,
  Sliders,
  TrendingUp,
  UserX,
  Users,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import type {
  AdminPerformanceMetrics,
  AdminReportRecord,
  AdminUserCounts,
  PlatformSettings,
} from '../../data/adminStore';
import { formatRupiah } from '../../data/marketplaceRepository';
import { useLanguage } from '../../i18n/locale';
import { SettingNavLink } from '../../setting/components/SettingNavLink';
import { ICON_STROKE } from '../../theme/icons';
import { spacing } from '../../theme/tokens';
import { font } from '../../theme/typography';
import type { BookingRecord } from '../../types/marketplace';
import type { DashboardTab } from '../types';

interface DashboardOverviewProps {
  userCounts: AdminUserCounts | null;
  metrics: AdminPerformanceMetrics;
  bookings: BookingRecord[];
  reports: AdminReportRecord[];
  deletedUsersCount: number;
  pendingApprovalsCount?: number;
  platformSettings?: PlatformSettings;
  onUpdatePlatformSettings?: (settings: Partial<PlatformSettings>) => Promise<void>;
  onNavigateTab: (tab: DashboardTab) => void;
}

export function DashboardOverview({
  userCounts,
  metrics,
  bookings,
  reports,
  deletedUsersCount,
  pendingApprovalsCount = 0,
  platformSettings,
  onUpdatePlatformSettings,
  onNavigateTab,
}: DashboardOverviewProps) {
  const { language } = useLanguage();
  const { palette, scaleFont } = useAppearance();

  const openReports = reports.filter(
    (r) => r.status === 'submitted' || r.status === 'under_review',
  );

  const [taxTypeOverride, setTaxType] = useState<'fixed' | 'percentage' | null>(
    null,
  );
  const [customTaxValueOverride, setCustomTaxValue] = useState<string | null>(
    null,
  );
  const taxType = taxTypeOverride ?? platformSettings?.platformFeeType ?? 'fixed';
  const customTaxValue =
    customTaxValueOverride ??
    (taxType === 'percentage'
      ? String(platformSettings?.platformFeeRate ?? 10)
      : String(platformSettings?.platformFeeFixed || 10000));
  const [savingTax, setSavingTax] = useState(false);
  const [taxSavedBanner, setTaxSavedBanner] = useState(false);

  const handleApplyGlobalTax = async () => {
    if (!onUpdatePlatformSettings || savingTax) return;
    setSavingTax(true);
    setTaxSavedBanner(false);
    try {
      const numeric = parseFloat(customTaxValue.replace(/[^0-9.]/g, '')) || 0;
      if (taxType === 'fixed') {
        await onUpdatePlatformSettings({
          platformFeeType: 'fixed',
          platformFeeFixed: Math.round(numeric),
        });
      } else {
        await onUpdatePlatformSettings({
          platformFeeType: 'percentage',
          platformFeeRate: Math.min(100, Math.max(0, numeric)),
        });
      }
      setTaxSavedBanner(true);
      setTimeout(() => setTaxSavedBanner(false), 3000);
    } finally {
      setSavingTax(false);
    }
  };

  const currentTaxSummary =
    taxType === 'fixed'
      ? formatRupiah(parseInt(customTaxValue.replace(/[^0-9]/g, ''), 10) || 10000, language)
      : `${parseFloat(customTaxValue) || 10}%`;

  return (
    <View style={styles.container}>
      {/* Compact Overview Strip */}
      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: palette.surfaceElevated,
            borderColor: palette.border,
          },
        ]}
        testID="admin-kpi-strip"
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => onNavigateTab('accounts')}
          style={styles.summaryMetric}
        >
          <Text style={[styles.summaryValue, { color: palette.text, fontSize: scaleFont(font.title) }]}>
            {userCounts ? userCounts.customers : '—'}
          </Text>
          <Text style={[styles.summaryLabel, { color: palette.textMuted }]}>
            {language === 'en' ? 'Customers' : 'Pelanggan'}
          </Text>
        </Pressable>

        <View style={[styles.summaryDivider, { backgroundColor: palette.border }]} />

        <Pressable
          accessibilityRole="button"
          onPress={() => onNavigateTab('accounts')}
          style={styles.summaryMetric}
        >
          <Text style={[styles.summaryValue, { color: palette.primary, fontSize: scaleFont(font.title) }]}>
            {userCounts ? userCounts.technicians : '—'}
          </Text>
          <Text style={[styles.summaryLabel, { color: palette.textMuted }]}>
            {language === 'en' ? 'Technicians' : 'Teknisi'}
          </Text>
        </Pressable>

        <View style={[styles.summaryDivider, { backgroundColor: palette.border }]} />

        <Pressable
          accessibilityRole="button"
          onPress={() => onNavigateTab('bookings')}
          style={styles.summaryMetric}
        >
          <Text style={[styles.summaryValue, { color: palette.text, fontSize: scaleFont(font.title) }]}>
            {bookings.length}
          </Text>
          <Text style={[styles.summaryLabel, { color: palette.textMuted }]}>
            {language === 'en' ? 'Bookings' : 'Pesanan'}
          </Text>
        </Pressable>

        <View style={[styles.summaryDivider, { backgroundColor: palette.border }]} />

        <Pressable
          accessibilityRole="button"
          onPress={() => onNavigateTab('delete-user')}
          style={styles.summaryMetric}
          testID="admin-kpi-deleted-users"
        >
          <Text style={[styles.summaryValue, { color: palette.danger, fontSize: scaleFont(font.title) }]}>
            {deletedUsersCount}
          </Text>
          <Text style={[styles.summaryLabel, { color: palette.danger }]}>
            {language === 'en' ? 'Deleted' : 'Dihapus'}
          </Text>
        </Pressable>
      </View>

      {userCounts ? (
        <Text
          style={[styles.dataSourceNote, { color: palette.textMuted }]}
          testID="admin-user-count-source"
        >
          {userCounts.source === 'supabase'
            ? language === 'en'
              ? 'Live PostgreSQL metrics active.'
              : 'Metrik langsung PostgreSQL aktif.'
            : language === 'en'
              ? 'Sample preview metrics active.'
              : 'Metrik pratinjau aktif.'}
        </Text>
      ) : null}

      {/* CATEGORY 1 — PLATFORM TAX & FINANCE (Applied to All Technicians) */}
      <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>
        {language === 'en' ? 'PLATFORM TAX & FINANCE' : 'PAJAK & KEUANGAN PLATFORM'}
      </Text>
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: palette.surfaceElevated,
            borderColor: palette.border,
          },
        ]}
      >
        <View style={[styles.inlineTaxBox, { borderBottomColor: palette.border }]}>
          <View style={styles.inlineTaxHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inlineTaxTitle, { color: palette.text }]}>
                {language === 'en'
                  ? 'Custom Platform Tax (All Technicians)'
                  : 'Pajak Kustom Platform (Semua Teknisi)'}
              </Text>
              <Text style={[styles.inlineTaxSub, { color: palette.textMuted }]}>
                {language === 'en'
                  ? 'Set the global tax deducted from every technician service booking.'
                  : 'Atur pajak global yang diterapkan ke seluruh teknisi.'}
              </Text>
            </View>
            <View style={[styles.modePillGroup, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setTaxType('fixed');
                  if (taxType !== 'fixed') setCustomTaxValue('10000');
                }}
                style={[
                  styles.modePillBtn,
                  taxType === 'fixed' && { backgroundColor: palette.primary },
                ]}
              >
                <Text
                  style={[
                    styles.modePillText,
                    { color: taxType === 'fixed' ? '#FFFFFF' : palette.textMuted },
                  ]}
                >
                  Rp
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setTaxType('percentage');
                  if (taxType !== 'percentage') setCustomTaxValue('10');
                }}
                style={[
                  styles.modePillBtn,
                  taxType === 'percentage' && { backgroundColor: palette.primary },
                ]}
              >
                <Percent
                  size={12}
                  strokeWidth={ICON_STROKE}
                  color={taxType === 'percentage' ? '#FFFFFF' : palette.textMuted}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.inlineTaxInputRow}>
            <View
              style={[
                styles.inlineTaxInputWrap,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              <Text style={[styles.inlineTaxPrefix, { color: palette.primary }]}>
                {taxType === 'fixed' ? 'Rp' : '%'}
              </Text>
              <TextInput
                keyboardType="numeric"
                onChangeText={setCustomTaxValue}
                placeholder={taxType === 'fixed' ? '10000' : '10'}
                placeholderTextColor={palette.textMuted}
                style={[styles.inlineTaxInput, { color: palette.text }]}
                testID="admin-inline-custom-tax-input"
                value={customTaxValue}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={savingTax}
              onPress={() => {
                void handleApplyGlobalTax();
              }}
              style={({ pressed }) => [
                styles.applyTaxBtn,
                {
                  backgroundColor: palette.primary,
                  opacity: savingTax || pressed ? 0.8 : 1,
                },
              ]}
              testID="admin-apply-custom-tax-btn"
            >
              {taxSavedBanner ? (
                <CheckCircle2 color="#FFFFFF" size={16} strokeWidth={ICON_STROKE} />
              ) : null}
              <Text style={styles.applyTaxBtnText}>
                {taxSavedBanner
                  ? language === 'en'
                    ? 'Applied'
                    : 'Diterapkan'
                  : language === 'en'
                    ? 'Apply to All'
                    : 'Terapkan'}
              </Text>
            </Pressable>
          </View>
        </View>

        <SettingNavLink
          showDivider
          icon={Sliders}
          title={language === 'en' ? 'Advanced Tax & Fee Rules' : 'Aturan Pajak & Komisi Lanjutan'}
          subtitle={
            language === 'en'
              ? 'Minimum fee thresholds & payout simulator'
              : 'Batas biaya minimum & simulator pembayaran'
          }
          valueText={currentTaxSummary}
          onPress={() => onNavigateTab('tax')}
          testID="admin-tab-tax"
        />
        <SettingNavLink
          showDivider
          icon={Briefcase}
          title={language === 'en' ? 'Service Categories' : 'Kategori Layanan'}
          subtitle={
            language === 'en'
              ? 'Add or manage marketplace service categories'
              : 'Tambah atau kelola kategori layanan marketplace'
          }
          onPress={() => onNavigateTab('categories')}
          testID="admin-tab-categories"
        />
        <SettingNavLink
          icon={DollarSign}
          title={language === 'en' ? 'Revenue & Performance' : 'Pendapatan & Performa'}
          subtitle={
            language === 'en'
              ? `Completion rate ${metrics.completionRate}% · Gross volume`
              : `Penyelesaian ${metrics.completionRate}% · Volume transaksi`
          }
          valueText={formatRupiah(metrics.totalRevenue, language)}
          onPress={() => onNavigateTab('performance')}
          testID="admin-tab-performance"
        />
      </View>

      {/* CATEGORY 2 — USERS & TECHNICIANS */}
      <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>
        {language === 'en' ? 'USERS & TECHNICIANS' : 'PENGGUNA & TEKNISI'}
      </Text>
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: palette.surfaceElevated,
            borderColor: palette.border,
          },
        ]}
      >
        <SettingNavLink
          showDivider
          icon={Users}
          title={language === 'en' ? 'User Accounts' : 'Akun Pengguna'}
          subtitle={
            language === 'en'
              ? 'Manage roles, verify technicians & account status'
              : 'Kelola peran, verifikasi teknisi & status akun'
          }
          valueText={
            userCounts
              ? String(userCounts.customers + userCounts.technicians)
              : undefined
          }
          onPress={() => onNavigateTab('accounts')}
          testID="admin-tab-accounts"
        />
        <SettingNavLink
          showDivider
          icon={Award}
          title={language === 'en' ? 'Technician Approvals' : 'Persetujuan Teknisi'}
          subtitle={
            language === 'en'
              ? 'Review technician onboarding applications'
              : 'Tinjau pendaftaran mitra teknisi baru'
          }
          valueText={pendingApprovalsCount > 0 ? String(pendingApprovalsCount) : undefined}
          onPress={() => onNavigateTab('approvals')}
          testID="admin-tab-approvals"
        />
        <SettingNavLink
          icon={TrendingUp}
          title={language === 'en' ? 'Bookings Management' : 'Manajemen Pesanan'}
          subtitle={
            language === 'en'
              ? `${metrics.activeBookingsCount} active jobs · ${bookings.length} total orders`
              : `${metrics.activeBookingsCount} pekerjaan aktif · ${bookings.length} total pesanan`
          }
          valueText={String(bookings.length)}
          onPress={() => onNavigateTab('bookings')}
          testID="admin-tab-bookings"
        />
      </View>

      {/* CATEGORY 3 — TRUST & MODERATION */}
      <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>
        {language === 'en' ? 'TRUST & MODERATION' : 'KEAMANAN & MODERASI'}
      </Text>
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: palette.surfaceElevated,
            borderColor: palette.border,
          },
        ]}
      >
        <SettingNavLink
          showDivider
          icon={AlertTriangle}
          title={language === 'en' ? 'Moderation Reports' : 'Laporan Moderasi'}
          subtitle={
            language === 'en'
              ? `${openReports.length} open disputes awaiting review`
              : `${openReports.length} laporan terbuka menunggu tinjauan`
          }
          valueText={String(openReports.length)}
          onPress={() => onNavigateTab('reports')}
          testID="admin-tab-reports"
        />
        <SettingNavLink
          icon={UserX}
          isDanger
          title={language === 'en' ? 'Deleted Accounts' : 'Akun Dihapus'}
          subtitle={
            language === 'en'
              ? 'Account deletion audit logs & exit feedback'
              : 'Log penghapusan akun & umpan balik pengguna'
          }
          valueText={String(deletedUsersCount)}
          onPress={() => onNavigateTab('delete-user')}
          testID="admin-tab-delete-user"
        />
      </View>

      {/* Recent Open Reports Quick Action (Preserved for Admin moderation tests) */}
      {openReports.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>
            {language === 'en' ? 'ACTIVE DISPUTES' : 'LAPORAN AKTIF'}
          </Text>
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: palette.surfaceElevated,
                borderColor: palette.border,
              },
            ]}
          >
            {openReports.slice(0, 3).map((rep, idx) => (
              <SettingNavLink
                key={rep.id}
                showDivider={idx < Math.min(openReports.length, 3) - 1}
                icon={Activity}
                title={`${rep.technicianName} — ${rep.category}`}
                subtitle={rep.description}
                valueText={rep.severity.toUpperCase()}
                onPress={() => onNavigateTab('reports')}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
  },
  summaryCard: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
  },
  summaryMetric: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  summaryValue: {
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  summaryLabel: {
    fontSize: font.caption,
    fontWeight: '600',
    marginTop: 2,
  },
  summaryDivider: {
    height: 28,
    width: StyleSheet.hairlineWidth,
  },
  dataSourceNote: {
    fontSize: font.caption,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontSize: font.caption,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: spacing.lg,
    textTransform: 'uppercase',
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  inlineTaxBox: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  inlineTaxHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  inlineTaxTitle: {
    fontSize: font.label,
    fontWeight: '700',
  },
  inlineTaxSub: {
    fontSize: font.caption,
    lineHeight: 16,
    marginTop: 2,
  },
  modePillGroup: {
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
    padding: 2,
  },
  modePillBtn: {
    alignItems: 'center',
    borderRadius: 6,
    height: 26,
    justifyContent: 'center',
    minWidth: 32,
    paddingHorizontal: 8,
  },
  modePillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  inlineTaxInputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  inlineTaxInputWrap: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 38,
    paddingHorizontal: 10,
  },
  inlineTaxPrefix: {
    fontSize: font.body,
    fontWeight: '800',
  },
  inlineTaxInput: {
    flex: 1,
    fontSize: font.body,
    fontWeight: '700',
    paddingVertical: 0,
  },
  applyTaxBtn: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  applyTaxBtnText: {
    color: '#FFFFFF',
    fontSize: font.label,
    fontWeight: '800',
  },
});
