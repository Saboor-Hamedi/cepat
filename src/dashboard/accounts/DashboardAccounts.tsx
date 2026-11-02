import { Check, Search, ShieldCheck } from 'lucide-react-native';
import { font } from '../../theme/typography';
import { ICON_SIZE, ICON_STROKE } from '../../theme/icons';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import type { AccountStatus, AdminAccountRecord } from '../../data/adminStore';
import { useLanguage } from '../../i18n/locale';
import { radii, spacing } from '../../theme/tokens';

interface DashboardAccountsProps {
  accounts: AdminAccountRecord[];
  onModeration: (accountId: string, status: AccountStatus) => Promise<void>;
  onToggleVerified: (accountId: string) => Promise<void>;
}

type AccountFilter = 'all' | 'customer' | 'technician' | 'blocked';

export function DashboardAccounts({
  accounts,
  onModeration,
  onToggleVerified,
}: DashboardAccountsProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<AccountFilter>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((acc) => {
      if (filter === 'customer' && acc.role !== 'customer') return false;
      if (filter === 'technician' && acc.role !== 'technician') return false;
      if (filter === 'blocked' && acc.status === 'active') return false;
      if (!q) return true;
      return (
        acc.displayName.toLowerCase().includes(q) ||
        acc.email.toLowerCase().includes(q) ||
        acc.area.toLowerCase().includes(q)
      );
    });
  }, [accounts, filter, search]);

  return (
    <View style={styles.container} testID="admin-accounts-section">
      {/* Search and Filters */}
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
            onChangeText={setSearch}
            placeholder={
              language === 'en'
                ? 'Search name, email, or service area...'
                : 'Cari nama, email, atau area layanan...'
            }
            placeholderTextColor={palette.textMuted}
            style={[styles.searchInput, { color: palette.text }]}
            testID="admin-account-search"
            value={search}
          />
        </View>

        <View style={styles.chipRow}>
          {(
            [
              ['all', language === 'en' ? 'All Roles' : 'Semua Peran'],
              ['customer', language === 'en' ? 'Customers' : 'Pelanggan'],
              ['technician', language === 'en' ? 'Technicians' : 'Teknisi'],
              ['blocked', language === 'en' ? 'Blocked / Suspended' : 'Diblokir / Ditangguhkan'],
            ] as const
          ).map(([key, label]) => {
            const isSelected = filter === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                onPress={() => setFilter(key)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? palette.primary : palette.surfaceElevated,
                    borderColor: isSelected ? palette.primary : palette.border,
                  },
                ]}
                testID={`admin-account-filter-${key}`}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isSelected ? '#FFFFFF' : palette.text },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Account Cards */}
      {filtered.map((acc) => (
        <View
          key={acc.id}
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
          testID={`admin-account-card-${acc.id}`}
        >
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.cardTitle, { color: palette.text }]}>
                  {acc.displayName}
                </Text>
                {acc.verified && (
                  <View style={[styles.verifiedTag, { backgroundColor: palette.primary }]}>
                    <Text style={styles.verifiedTagText}>✓</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.cardMeta, { color: palette.textMuted }]}>
                {acc.role.toUpperCase()} · {acc.email} · {acc.area}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    acc.status === 'active'
                      ? '#16A34A20'
                      : acc.status === 'suspended'
                        ? '#F59E0B20'
                        : '#DC262620',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  {
                    color:
                      acc.status === 'active'
                        ? '#16A34A'
                        : acc.status === 'suspended'
                          ? '#F59E0B'
                          : '#DC2626',
                  },
                ]}
                testID={`admin-account-status-${acc.id}`}
              >
                {acc.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {acc.moderationReason ? (
            <Text
              style={[
                styles.adminNoteBox,
                { backgroundColor: palette.surfaceElevated, color: palette.text },
              ]}
            >
              {acc.moderationReason}
            </Text>
          ) : null}

          <View style={styles.actionRow}>
            {acc.status !== 'blocked' ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void onModeration(acc.id, 'blocked');
                }}
                style={[
                  styles.dangerBtn,
                  { backgroundColor: `${palette.danger}15`, borderColor: palette.danger },
                ]}
                testID={`admin-block-account-${acc.id}`}
              >
                <Text style={[styles.dangerBtnText, { color: palette.danger }]}>
                  {language === 'en' ? 'Block Account' : 'Blokir Akun'}
                </Text>
              </Pressable>
            ) : null}

            {acc.status === 'active' ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void onModeration(acc.id, 'suspended');
                }}
                style={[
                  styles.warningBtn,
                  { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
                ]}
                testID={`admin-suspend-account-${acc.id}`}
              >
                <Text style={[styles.warningBtnText, { color: palette.text }]}>
                  {language === 'en' ? 'Suspend' : 'Tangguhkan'}
                </Text>
              </Pressable>
            ) : null}

            {acc.status !== 'active' ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void onModeration(acc.id, 'active');
                }}
                style={[styles.primaryBtn, { backgroundColor: palette.primary }]}
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
                  void onToggleVerified(acc.id);
                }}
                style={[styles.secondaryBtn, { backgroundColor: palette.primarySoft }]}
                testID={`admin-toggle-verified-${acc.id}`}
              >
                <Text style={[styles.secondaryBtnText, { color: palette.text }]}>
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
    fontSize: font.label,
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
    fontSize: font.caption,
    fontWeight: '700',
  },
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  cardTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: font.title,
    fontWeight: '800',
  },
  cardMeta: {
    fontSize: font.body,
    marginTop: 4,
  },
  verifiedTag: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 16,
    justifyContent: 'center',
    width: 16,
  },
  verifiedTagText: {
    color: '#FFFFFF',
    fontSize: font.caption,
    fontWeight: '900',
  },
  statusBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: font.caption,
    fontWeight: '800',
  },
  adminNoteBox: {
    borderRadius: radii.sm,
    fontSize: font.body,
    fontWeight: '600',
    marginTop: spacing.xs,
    padding: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  primaryBtn: {
    alignItems: 'center',
    borderRadius: radii.sm,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: font.caption,
    fontWeight: '800',
  },
  secondaryBtn: {
    alignItems: 'center',
    borderRadius: radii.sm,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  secondaryBtnText: {
    fontSize: font.caption,
    fontWeight: '800',
  },
  warningBtn: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  warningBtnText: {
    fontSize: font.caption,
    fontWeight: '800',
  },
  dangerBtn: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dangerBtnText: {
    fontSize: font.caption,
    fontWeight: '800',
  },
});
