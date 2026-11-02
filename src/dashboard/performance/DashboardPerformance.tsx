import {
  Award,
  ChevronRight,
  Star,
  UserX,
} from 'lucide-react-native';
import { ICON_SIZE, ICON_STROKE } from '../../theme/icons';
import React from 'react';
import { font } from '../../theme/typography';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import type { AdminPerformanceMetrics } from '../../data/adminStore';
import { formatRupiah } from '../../data/marketplaceRepository';
import { useLanguage } from '../../i18n/locale';
import { radii, spacing } from '../../theme/tokens';
import type { DashboardTab } from '../types';

interface DashboardPerformanceProps {
  metrics: AdminPerformanceMetrics;
  onNavigateTab: (tab: DashboardTab) => void;
}

export function DashboardPerformance({
  metrics,
  onNavigateTab,
}: DashboardPerformanceProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();

  return (
    <View style={styles.container} testID="admin-performance-section">
      {/* Performance Metric Cards */}
      <View style={styles.performanceGrid}>
        <View
          style={[
            styles.perfMetricCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.perfMetricLabel, { color: palette.textMuted }]}>
            {language === 'en' ? 'Fulfillment & Completion Rate' : 'Tingkat Penyelesaian Pesanan'}
          </Text>
          <Text style={[styles.perfMetricValue, { color: '#16A34A' }]}>
            {metrics.completionRate}%
          </Text>
          <View
            style={[
              styles.progressBarBg,
              { backgroundColor: palette.surfaceElevated },
            ]}
          >
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
          <Text style={[styles.perfMetricSub, { color: palette.textMuted }]}>
            {metrics.completedBookingsCount} / {metrics.totalBookingsCount}{' '}
            {language === 'en' ? 'orders successfully delivered' : 'pesanan selesai dikerjakan'}
          </Text>
        </View>

        <View
          style={[
            styles.perfMetricCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.perfMetricLabel, { color: palette.textMuted }]}>
            {language === 'en' ? 'Customer Satisfaction' : 'Kepuasan Pelanggan'}
          </Text>
          <View style={styles.ratingValRow}>
            <Star size={ICON_SIZE} strokeWidth={ICON_STROKE} color="#F59E0B" fill="#F59E0B" />
            <Text style={[styles.perfMetricValue, { color: '#F59E0B' }]}>
              {metrics.averageRating}
            </Text>
          </View>
          <Text style={[styles.perfMetricSub, { color: palette.textMuted }]}>
            {metrics.totalReviewsCount}{' '}
            {language === 'en' ? 'verified ratings' : 'ulasan terverifikasi'} (
            {metrics.satisfactionRate}% positive)
          </Text>
        </View>
      </View>

      {/* Top Performing Technicians Leaderboard */}
      <View
        style={[
          styles.card,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Award size={ICON_SIZE} strokeWidth={ICON_STROKE} color={palette.primary} />
            <Text style={[styles.cardTitle, { color: palette.text }]}>
              {language === 'en'
                ? 'Top Performing Technicians'
                : 'Klasemen Teknisi Berkinerja Terbaik'}
            </Text>
          </View>
          <Text style={[styles.cardHeaderBadge, { color: palette.textMuted }]}>
            {metrics.topTechnicians.length} {language === 'en' ? 'ranked' : 'teratas'}
          </Text>
        </View>

        <Text style={[styles.cardMeta, { color: palette.textMuted }]}>
          {language === 'en'
            ? 'Live rankings computed across completed bookings, revenue generated, and ratings.'
            : 'Peringkat live dihitung dari pekerjaan terselesaikan, pendapatan, dan rating.'}
        </Text>

        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          {metrics.topTechnicians.map((tech, index) => (
            <View
              key={tech.id}
              style={[
                styles.leaderboardRow,
                { backgroundColor: palette.surfaceElevated },
              ]}
            >
              <View
                style={[
                  styles.rankCircle,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
              >
                <Text style={[styles.rankText, { color: palette.text }]}>
                  #{index + 1}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.leaderboardName, { color: palette.text }]}>
                  {tech.name}
                </Text>
                <Text style={[styles.leaderboardMeta, { color: palette.textMuted }]}>
                  {tech.completedJobs}{' '}
                  {language === 'en' ? 'completed jobs' : 'pekerjaan selesai'} ·{' '}
                  {formatRupiah(tech.revenue, language)}
                </Text>
              </View>
              <View style={styles.leaderboardRating}>
                <Star size={ICON_SIZE} strokeWidth={ICON_STROKE} color="#F59E0B" fill="#F59E0B" />
                <Text style={[styles.ratingText, { color: palette.text }]}>
                  {tech.rating}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Churn Alert Card */}
      <Pressable
        accessibilityRole="button"
        onPress={() => onNavigateTab('delete-user')}
        style={[
          styles.card,
          {
            backgroundColor: palette.surface,
            borderColor: `${palette.danger}60`,
          },
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <UserX size={ICON_SIZE} strokeWidth={ICON_STROKE} color={palette.danger} />
            <Text style={[styles.cardTitle, { color: palette.danger }]}>
              {language === 'en'
                ? 'User Departure & Churn Feedback'
                : 'Masukan Pengunduran Diri Pengguna'}
            </Text>
          </View>
          <ChevronRight size={ICON_SIZE} strokeWidth={ICON_STROKE} color={palette.danger} />
        </View>
        <Text style={[styles.cardMeta, { color: palette.textMuted }]}>
          {language === 'en'
            ? `${metrics.churnCount} accounts have been deleted. Tap here to read their messages, departure reasons, and written feedback.`
            : `${metrics.churnCount} akun telah dihapus. Ketuk di sini untuk membaca pesan, alasan, dan masukan tertulis mereka.`}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  perfMetricCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    minWidth: 150,
    padding: spacing.md,
  },
  perfMetricLabel: {
    fontSize: font.caption,
    fontWeight: '700',
  },
  perfMetricValue: {
    fontSize: font.section,
    fontWeight: '800',
    marginTop: 4,
  },
  perfMetricSub: {
    fontSize: font.caption,
    marginTop: 6,
  },
  progressBarBg: {
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
    fontSize: font.title,
    fontWeight: '800',
  },
  cardHeaderBadge: {
    fontSize: font.caption,
    fontWeight: '600',
  },
  cardMeta: {
    fontSize: font.body,
    marginTop: 4,
  },
  leaderboardRow: {
    alignItems: 'center',
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: 12,
    padding: spacing.sm,
  },
  rankCircle: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  rankText: {
    fontSize: font.caption,
    fontWeight: '800',
  },
  leaderboardName: {
    fontSize: font.label,
    fontWeight: '700',
  },
  leaderboardMeta: {
    fontSize: font.caption,
    marginTop: 2,
  },
  leaderboardRating: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  ratingText: {
    fontSize: font.body,
    fontWeight: '800',
  },
});
