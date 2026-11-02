import { CheckCircle2 } from 'lucide-react-native';
import { font } from '../../theme/typography';
import { ICON_SIZE, ICON_STROKE } from '../../theme/icons';
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import type { AdminTechnicianApplication } from '../../data/adminStore';
import { useLanguage } from '../../i18n/locale';
import { radii, spacing } from '../../theme/tokens';

interface DashboardApprovalsProps {
  applications: AdminTechnicianApplication[];
  onDecision: (appId: string, status: 'approved' | 'rejected') => Promise<void>;
}

export function DashboardApprovals({
  applications,
  onDecision,
}: DashboardApprovalsProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();

  return (
    <View style={styles.container} testID="admin-applications-section">
      {applications.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <CheckCircle2 size={ICON_SIZE} strokeWidth={ICON_STROKE} color="#16A34A" />
          <Text style={[styles.emptyTitle, { color: palette.text }]}>
            {language === 'en'
              ? 'No Pending Applications'
              : 'Tidak Ada Pendaftaran Menunggu'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: palette.textMuted }]}>
            {language === 'en'
              ? 'All technician partner verification applications have been reviewed.'
              : 'Semua permohonan mitra teknisi telah ditinjau.'}
          </Text>
        </View>
      ) : (
        applications.map((app) => (
          <View
            key={app.id}
            style={[
              styles.card,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
            testID={`admin-application-card-${app.id}`}
          >
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: palette.text }]}>
                  {app.applicantName} ({app.businessName})
                </Text>
                <Text style={[styles.cardMeta, { color: palette.textMuted }]}>
                  {app.PrimaryCategory} · {app.serviceArea} · {app.yearsExperience}{' '}
                  {language === 'en' ? 'yrs experience' : 'tahun pengalaman'}
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      app.status === 'approved'
                        ? '#16A34A20'
                        : app.status === 'rejected'
                          ? '#DC262620'
                          : '#F59E0B20',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color:
                        app.status === 'approved'
                          ? '#16A34A'
                          : app.status === 'rejected'
                            ? '#DC2626'
                            : '#F59E0B',
                    },
                  ]}
                >
                  {app.status.toUpperCase()}
                </Text>
              </View>
            </View>

            {app.reviewNotes ? (
              <Text
                style={[
                  styles.adminNoteBox,
                  { backgroundColor: palette.surfaceElevated, color: palette.text },
                ]}
              >
                {app.reviewNotes}
              </Text>
            ) : null}

            <View style={styles.actionRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void onDecision(app.id, 'approved');
                }}
                style={[styles.primaryBtn, { backgroundColor: palette.primary }]}
                testID={`admin-approve-app-${app.id}`}
              >
                <Text style={styles.primaryBtnText}>
                  {language === 'en' ? 'Approve Technician' : 'Setujui Teknisi'}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void onDecision(app.id, 'rejected');
                }}
                style={[
                  styles.dangerBtn,
                  { backgroundColor: `${palette.danger}15`, borderColor: palette.danger },
                ]}
                testID={`admin-reject-app-${app.id}`}
              >
                <Text style={[styles.dangerBtnText, { color: palette.danger }]}>
                  {language === 'en' ? 'Reject Application' : 'Tolak Pendaftaran'}
                </Text>
              </Pressable>
            </View>
          </View>
        ))
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
  emptyCard: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  emptyTitle: {
    fontSize: font.heading,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontSize: font.body,
    marginTop: 4,
    textAlign: 'center',
  },
});
