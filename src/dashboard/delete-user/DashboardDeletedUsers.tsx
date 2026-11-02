import {
  Calendar,
  CheckCircle2,
  Mail,
  Search,
  Tag,
  UserX,
} from 'lucide-react-native';
import { ICON_SIZE, ICON_STROKE } from '../../theme/icons';
import React, { useMemo, useState } from 'react';
import { font } from '../../theme/typography';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { InfiniteFlatList } from '../../components/InfiniteFlatList';
import { useAppearance } from '../../context/AppearanceContext';
import type { AdminDeletionFeedback } from '../../data/adminStore';
import { useLanguage } from '../../i18n/locale';
import { radii, spacing } from '../../theme/tokens';

interface DashboardDeletedUsersProps {
  feedbacks: AdminDeletionFeedback[];
}

type RoleFilter = 'all' | 'customer' | 'technician';

const PAGE_SIZE = 15;

export function DashboardDeletedUsers({ feedbacks }: DashboardDeletedUsersProps) {
  const { language } = useLanguage();
  const { palette, scaleFont } = useAppearance();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return feedbacks.filter((item) => {
      if (roleFilter === 'customer' && item.userRole !== 'customer') return false;
      if (roleFilter === 'technician' && item.userRole !== 'technician') return false;
      if (!q) return true;
      return (
        item.userDisplayName.toLowerCase().includes(q) ||
        (item.userEmail && item.userEmail.toLowerCase().includes(q)) ||
        item.reasonCategory.toLowerCase().includes(q) ||
        (item.feedbackNotes && item.feedbackNotes.toLowerCase().includes(q))
      );
    });
  }, [feedbacks, roleFilter, searchQuery]);

  const pagedItems = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );

  const hasMore = visibleCount < filtered.length;

  const handleLoadMore = () => {
    if (hasMore) {
      setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filtered.length));
    }
  };

  const customerChurnCount = useMemo(
    () => feedbacks.filter((f) => f.userRole === 'customer').length,
    [feedbacks],
  );
  const technicianChurnCount = useMemo(
    () => feedbacks.filter((f) => f.userRole === 'technician').length,
    [feedbacks],
  );

  const getReasonLabel = (key: string): string => {
    const dict: Record<string, { en: string; id: string }> = {
      not_needed: { en: 'No Longer Needed', id: 'Tidak Dibutuhkan Lagi' },
      rarely_used: { en: 'Rarely Used', id: 'Jarang Digunakan' },
      privacy_concerns: { en: 'Privacy & Security', id: 'Privasi & Data' },
      found_alternative: { en: 'Found Alternative Service', id: 'Pakai Layanan Lain' },
      technical_issues: { en: 'Technical Problems', id: 'Kendala Teknis' },
      fees: { en: 'Pricing & Fees', id: 'Biaya & Tarif' },
      relocated: { en: 'Relocated / Moved Away', id: 'Pindah Domisili' },
      career_change: { en: 'Career / Job Change', id: 'Ganti Pekerjaan' },
      other: { en: 'Other Feedback', id: 'Alasan Lainnya' },
    };
    const match = dict[key];
    if (match) return language === 'en' ? match.en : match.id;
    return key.replace(/_/g, ' ');
  };

  const formatDate = (dateString: string): string => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const renderFeedbackCard = ({ item }: { item: AdminDeletionFeedback }) => {
    return (
      <View
        style={[
          styles.feedbackCard,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
        testID={`admin-deletion-card-${item.id}`}
      >
        {/* Card Header: User Info & Reason Badge */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={styles.userIdentityRow}>
              <Text style={[styles.userName, { color: palette.text, fontSize: scaleFont(font.title) }]}>
                {item.userDisplayName}
              </Text>
              <View
                style={[
                  styles.roleTag,
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
                    styles.roleTagText,
                    {
                      color:
                        item.userRole === 'technician'
                          ? '#0D9488'
                          : palette.primary,
                      fontSize: scaleFont(font.caption),
                    },
                  ]}
                >
                  {item.userRole.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Email (only if genuine) & Date */}
            <View style={styles.metaRow}>
              {item.userEmail && item.userEmail.trim().length > 0 ? (
                <View style={styles.metaItem}>
                  <Mail size={ICON_SIZE} strokeWidth={ICON_STROKE} color={palette.textMuted} />
                  <Text style={[styles.metaText, { color: palette.textMuted, fontSize: scaleFont(font.caption) }]}>
                    {item.userEmail.trim()}
                  </Text>
                </View>
              ) : null}

              <View style={styles.metaItem}>
                <Calendar size={ICON_SIZE} strokeWidth={ICON_STROKE} color={palette.textMuted} />
                <Text style={[styles.metaText, { color: palette.textMuted, fontSize: scaleFont(font.caption) }]}>
                  {formatDate(item.deletedAt)}
                </Text>
              </View>
            </View>
          </View>

          {/* Reason Badge */}
          <View
            style={[
              styles.reasonPill,
              { backgroundColor: `${palette.danger}12`, borderColor: `${palette.danger}35` },
            ]}
          >
            <Tag size={ICON_SIZE} strokeWidth={ICON_STROKE} color={palette.danger} />
            <Text style={[styles.reasonPillText, { color: palette.danger, fontSize: scaleFont(font.caption) }]}>
              {getReasonLabel(item.reasonCategory)}
            </Text>
          </View>
        </View>

        {/* User Reason & Feedback Message (simple plain text, no quotation marks) */}
        <View
          style={[
            styles.feedbackBox,
            { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.feedbackLabel, { color: palette.primary, fontSize: scaleFont(font.caption) }]}>
            {language === 'en' ? 'Reason & Feedback:' : 'Alasan & Masukan:'}
          </Text>

          {item.feedbackNotes && item.feedbackNotes.trim().length > 0 ? (
            <Text style={[styles.feedbackBody, { color: palette.text, fontSize: scaleFont(font.label) }]}>
              {item.feedbackNotes.trim()}
            </Text>
          ) : (
            <Text style={[styles.noFeedbackText, { color: palette.textMuted, fontSize: scaleFont(font.body) }]}>
              {language === 'en'
                ? 'No additional written feedback provided.'
                : 'Tidak ada catatan tertulis tambahan.'}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container} testID="admin-deletions-section">
      {/* Search and Filters Header */}
      <View
        style={[
          styles.filterCard,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <View
          style={[
            styles.searchRow,
            { backgroundColor: palette.inputBg, borderColor: palette.border },
          ]}
        >
          <Search size={ICON_SIZE} strokeWidth={ICON_STROKE} color={palette.textMuted} />
          <TextInput
            onChangeText={(txt) => {
              setSearchQuery(txt);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder={
              language === 'en'
                ? 'Search departure feedback or reasons...'
                : 'Cari masukan atau alasan penghapusan...'
            }
            placeholderTextColor={palette.textMuted}
            style={[styles.searchInput, { color: palette.text, fontSize: scaleFont(font.label) }]}
            testID="admin-deletion-search"
            value={searchQuery}
          />
        </View>

        <View style={styles.chipRow}>
          {(
            [
              ['all', language === 'en' ? `All (${feedbacks.length})` : `Semua (${feedbacks.length})`],
              ['customer', language === 'en' ? `Customers (${customerChurnCount})` : `Pelanggan (${customerChurnCount})`],
              ['technician', language === 'en' ? `Technicians (${technicianChurnCount})` : `Teknisi (${technicianChurnCount})`],
            ] as const
          ).map(([key, label]) => {
            const isSelected = roleFilter === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                onPress={() => {
                  setRoleFilter(key);
                  setVisibleCount(PAGE_SIZE);
                }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? palette.primary : palette.surfaceElevated,
                    borderColor: isSelected ? palette.primary : palette.border,
                  },
                ]}
                testID={`admin-deletion-filter-${key}`}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isSelected ? '#FFFFFF' : palette.text, fontSize: scaleFont(font.caption) },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Infinite Scroll FlatList for handling thousands of records smoothly */}
      {filtered.length === 0 ? (
        <View
          style={[
            styles.emptyStateCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <CheckCircle2 size={ICON_SIZE} strokeWidth={ICON_STROKE} color="#16A34A" />
          <Text style={[styles.emptyStateTitle, { color: palette.text, fontSize: scaleFont(font.heading) }]}>
            {language === 'en'
              ? 'No Deletion Records Found'
              : 'Tidak Ada Rekaman Penghapusan'}
          </Text>
          <Text style={[styles.emptyStateText, { color: palette.textMuted, fontSize: scaleFont(font.body) }]}>
            {language === 'en'
              ? 'No user account deletion feedback matches your active search query.'
              : 'Tidak ada masukan pengunduran diri yang cocok dengan pencarian Anda.'}
          </Text>
        </View>
      ) : (
        <InfiniteFlatList<AdminDeletionFeedback>
          data={pagedItems}
          hasMore={hasMore}
          keyExtractor={(item) => item.id}
          loadingMore={false}
          onLoadMore={handleLoadMore}
          renderItem={renderFeedbackCard}
          scrollEnabled={false} // nested inside the main dashboard scrollview
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
  filterCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  searchRow: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    minHeight: 38,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  filterChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterChipText: {
    fontWeight: '700',
  },
  emptyStateCard: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  emptyStateTitle: {
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  emptyStateText: {
    marginTop: 4,
    textAlign: 'center',
  },
  feedbackCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  userIdentityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  userName: {
    fontWeight: '800',
  },
  roleTag: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  roleTagText: {
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 2,
  },
  metaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  metaText: {
    fontWeight: '500',
  },
  reasonPill: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  reasonPillText: {
    fontWeight: '700',
  },
  feedbackBox: {
    borderRadius: radii.sm,
    borderWidth: 1,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  feedbackLabel: {
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  feedbackBody: {
    lineHeight: 20,
  },
  noFeedbackText: {
    fontStyle: 'italic',
  },
});
