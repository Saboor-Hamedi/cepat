import { CheckCircle2 } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { InfiniteFlatList } from '../../components/InfiniteFlatList';
import { useAppearance } from '../../context/AppearanceContext';
import type { AdminReportRecord } from '../../data/adminStore';
import { useLanguage } from '../../i18n/locale';
import { radii, spacing } from '../../theme/tokens';

interface DashboardReportsProps {
  reports: AdminReportRecord[];
  onReportAction: (
    reportId: string,
    status: AdminReportRecord['status'],
    alsoBlockTechnicianId?: string,
    note?: string,
  ) => Promise<void>;
}

const PAGE_SIZE = 15;

export function DashboardReports({
  reports,
  onReportAction,
}: DashboardReportsProps) {
  const { language } = useLanguage();
  const { palette, scaleFont } = useAppearance();

  const [reportNotes, setReportNotes] = useState<Record<string, string>>({});
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const handleNoteChange = (id: string, text: string) => {
    setReportNotes((prev) => ({ ...prev, [id]: text }));
  };

  const pagedReports = useMemo(
    () => reports.slice(0, visibleCount),
    [reports, visibleCount],
  );

  const hasMore = visibleCount < reports.length;

  const handleLoadMore = () => {
    if (hasMore) {
      setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, reports.length));
    }
  };

  const getStatusColor = (status: AdminReportRecord['status']) => {
    switch (status) {
      case 'resolved':
        return '#16A34A';
      case 'under_review':
        return '#D97706';
      case 'dismissed':
        return palette.textMuted;
      default:
        return '#EA580C';
    }
  };

  const getStatusLabel = (status: AdminReportRecord['status']) => {
    switch (status) {
      case 'resolved':
        return language === 'en' ? 'Resolved' : 'Selesai';
      case 'under_review':
        return language === 'en' ? 'Under Review' : 'Dalam Peninjauan';
      case 'dismissed':
        return language === 'en' ? 'Dismissed' : 'Ditutup';
      default:
        return language === 'en' ? 'Open' : 'Terbuka';
    }
  };

  const renderReportCard = ({ item: rep }: { item: AdminReportRecord }) => {
    const currentNote = reportNotes[rep.id] ?? '';
    const statusColor = getStatusColor(rep.status);

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
        testID={`admin-report-card-${rep.id}`}
      >
        {/* Card Top: Title and Highlighted Status Text (no badge background) */}
        <View style={styles.cardTop}>
          <View style={styles.titleColumn}>
            <Text
              style={[
                styles.cardTitle,
                { color: palette.text, fontSize: scaleFont(15) },
              ]}
            >
              {rep.technicianName}
            </Text>
            <Text
              style={[
                styles.cardCategory,
                { color: palette.textMuted, fontSize: scaleFont(12) },
              ]}
            >
              {rep.category.replace(/_/g, ' ')} · {rep.severity}
            </Text>
          </View>

          {/* Status text highlight only — NO background to prevent jumping or clunky boxes */}
          <View style={styles.statusWrap}>
            <Text
              style={[
                styles.statusHighlightText,
                { color: statusColor, fontSize: scaleFont(12) },
              ]}
            >
              {getStatusLabel(rep.status)}
            </Text>
          </View>
        </View>

        {/* Report description */}
        <Text
          style={[
            styles.cardDescription,
            { color: palette.text, fontSize: scaleFont(13) },
          ]}
        >
          {rep.description}
        </Text>

        {/* Existing admin note if present */}
        {rep.adminNotes ? (
          <View
            style={[
              styles.adminNoteBox,
              { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
            ]}
          >
            <Text
              style={[
                styles.adminNoteText,
                { color: palette.textMuted, fontSize: scaleFont(12) },
              ]}
            >
              {rep.adminNotes}
            </Text>
          </View>
        ) : null}

        {/* Note Input */}
        <TextInput
          onChangeText={(txt) => handleNoteChange(rep.id, txt)}
          placeholder={
            language === 'en'
              ? 'Add note...'
              : 'Tambah catatan...'
          }
          placeholderTextColor={palette.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: palette.surfaceElevated,
              borderColor: palette.border,
              color: palette.text,
              fontSize: scaleFont(12),
            },
          ]}
          testID={`admin-report-note-${rep.id}`}
          value={currentNote}
        />

        {/* Organized 2x2 Action Button Grid */}
        <View style={styles.buttonGrid}>
          <View style={styles.buttonRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void onReportAction(rep.id, 'under_review', undefined, currentNote);
              }}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: palette.surfaceElevated,
                  borderColor: palette.border,
                },
              ]}
              testID={`admin-accept-report-${rep.id}`}
            >
              <Text
                style={[
                  styles.btnText,
                  { color: palette.text, fontSize: scaleFont(12) },
                ]}
              >
                {language === 'en' ? 'Investigate' : 'Investigasi'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void onReportAction(rep.id, 'resolved', undefined, currentNote);
              }}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: palette.primary,
                  borderColor: palette.primary,
                },
              ]}
              testID={`admin-resolve-report-${rep.id}`}
            >
              <Text
                style={[
                  styles.btnText,
                  { color: '#FFFFFF', fontSize: scaleFont(12) },
                ]}
              >
                {language === 'en' ? 'Resolve' : 'Selesaikan'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.buttonRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void onReportAction(
                  rep.id,
                  'resolved',
                  rep.reportedTechnicianId,
                  currentNote,
                );
              }}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: `${palette.danger}10`,
                  borderColor: `${palette.danger}40`,
                },
              ]}
              testID={`admin-report-block-tech-${rep.id}`}
            >
              <Text
                style={[
                  styles.btnText,
                  { color: palette.danger, fontSize: scaleFont(12) },
                ]}
              >
                {language === 'en' ? 'Block Tech' : 'Blokir Teknisi'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void onReportAction(rep.id, 'dismissed', undefined, currentNote);
              }}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
              testID={`admin-dismiss-report-${rep.id}`}
            >
              <Text
                style={[
                  styles.btnText,
                  { color: palette.textMuted, fontSize: scaleFont(12) },
                ]}
              >
                {language === 'en' ? 'Dismiss' : 'Tutup'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container} testID="admin-reports-section">
      {reports.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <CheckCircle2 size={36} color="#16A34A" />
          <Text
            style={[
              styles.emptyTitle,
              { color: palette.text, fontSize: scaleFont(16) },
            ]}
          >
            {language === 'en' ? 'No Open Reports' : 'Tidak Ada Laporan Terbuka'}
          </Text>
          <Text
            style={[
              styles.emptySubtitle,
              { color: palette.textMuted, fontSize: scaleFont(12) },
            ]}
          >
            {language === 'en'
              ? 'All customer disputes and service reports have been investigated and closed.'
              : 'Semua sengketa pelanggan dan laporan layanan telah diselesaikan.'}
          </Text>
        </View>
      ) : (
        <InfiniteFlatList<AdminReportRecord>
          data={pagedReports}
          hasMore={hasMore}
          keyExtractor={(item) => item.id}
          loadingMore={false}
          onLoadMore={handleLoadMore}
          renderItem={renderReportCard}
          scrollEnabled={false}
          contentContainerStyle={{ gap: spacing.sm }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  cardTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  titleColumn: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: '700',
  },
  cardCategory: {
    marginTop: 2,
    textTransform: 'capitalize',
  },
  statusWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: spacing.sm,
  },
  statusHighlightText: {
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  cardDescription: {
    lineHeight: 18,
    marginVertical: spacing.xs,
  },
  adminNoteBox: {
    borderRadius: radii.xs,
    borderWidth: 1,
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  adminNoteText: {
    fontStyle: 'italic',
  },
  input: {
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 38,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  buttonGrid: {
    gap: 8,
    marginTop: spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    flex: 1,
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  btnText: {
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  emptyTitle: {
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    marginTop: 4,
    textAlign: 'center',
  },
});
