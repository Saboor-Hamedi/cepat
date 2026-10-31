import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthProvider';
import {
  AppNavigationBar,
  EmptyState,
} from '../components/marketplace-ui';
import { useAppearance } from '../context/AppearanceContext';
import { shouldUseFixtures } from '../data/marketplaceRepository';
import {
  loadBookings,
  transitionBookingStatus,
} from '../data/marketplaceStore';
import { useLanguage } from '../i18n/locale';
import { JobsContainer } from '../jobs';
import { colors, radii, spacing } from '../theme/tokens';
import type { BookingRecord } from '../types/marketplace';

export default function TechnicianDashboardScreen() {
  const { language, t } = useLanguage();
  const { palette } = useAppearance();
  const {
    user,
    roles,
    effectiveRole,
    applicationStatus,
    applicationError,
    refreshAccount,
  } = useAuth();

  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);

  const isPreview = shouldUseFixtures();
  const isTechnicianAccount =
    effectiveRole === 'technician' ||
    roles.includes('technician') ||
    user?.user_metadata?.requested_account_type === 'technician';
  const isApprovedTechnician =
    (isTechnicianAccount && applicationStatus !== 'rejected') || (isPreview && !user);
  const isWrongRoleAccount =
    Boolean(user) &&
    !isTechnicianAccount &&
    (effectiveRole === 'customer' || effectiveRole === 'admin');

  useEffect(() => {
    let active = true;
    void loadBookings()
      .then((allBookings) => {
        if (!active) return;
        setBookings(allBookings);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const handleBookingAction = async (
    bookingId: string,
    nextStatus: BookingRecord['status'],
    proposedStartAt?: string,
  ) => {
    if (!isApprovedTechnician) return;
    const updated = await transitionBookingStatus(bookingId, nextStatus, 'technician', {
      proposedStartAt,
    });
    setBookings((current) => current.map((b) => (b.id === bookingId ? updated : b)));
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <AppNavigationBar activeTab="workspace" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container} testID="technician-social-profile-card">
            {isWrongRoleAccount ? (
              <EmptyState
                title={
                  effectiveRole === 'admin'
                    ? language === 'en'
                      ? 'Admin Account Active'
                      : 'Akun Admin Aktif'
                    : language === 'en'
                      ? 'Customer Account Active'
                      : 'Akun Pelanggan Aktif'
                }
                description={
                  effectiveRole === 'admin'
                    ? language === 'en'
                      ? 'This jobs hub is reserved for technician accounts.'
                      : 'Pusat pekerjaan ini dikhususkan untuk akun teknisi.'
                    : language === 'en'
                      ? 'This jobs hub is reserved for technician accounts.'
                      : 'Pusat pekerjaan ini dikhususkan untuk akun teknisi.'
                }
                actionLabel={
                  effectiveRole === 'admin'
                    ? language === 'en'
                      ? 'Open Admin Console'
                      : 'Buka Konsol Admin'
                    : language === 'en'
                      ? 'Open Customer Bookings'
                      : 'Buka Pesanan Pelanggan'
                }
                onAction={() => router.replace(effectiveRole === 'admin' ? '/admin' : '/bookings')}
              />
            ) : !isApprovedTechnician ? (
              <View style={styles.pendingBanner} testID="unapproved-technician-banner">
                <Text style={styles.pendingTitle}>
                  {applicationStatus === 'rejected'
                    ? language === 'en'
                      ? 'Application Rejected'
                      : 'Pengajuan Ditolak'
                    : language === 'en'
                      ? 'Application Under Review'
                      : 'Pengajuan Sedang Ditinjau'}
                </Text>
                <Text style={styles.pendingBody}>
                  {applicationStatus === 'rejected'
                    ? language === 'en'
                      ? 'Your technician application was not approved. You can re-apply or continue as a customer.'
                      : 'Pengajuan teknisi Anda belum disetujui. Anda dapat mengajukan ulang atau lanjut sebagai pelanggan.'
                    : language === 'en'
                      ? 'Your technician application is being verified by our team. You will have full access once approved.'
                      : 'Pengajuan teknisi Anda sedang diverifikasi oleh tim kami. Akses penuh akan terbuka setelah disetujui.'}
                </Text>
                {applicationError ? (
                  <View style={styles.errorNoticeBox}>
                    <Text style={styles.errorNoticeText}>{applicationError}</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        void refreshAccount();
                      }}
                      style={styles.retryBtn}
                    >
                      <Text style={styles.retryBtnText}>{t('home.retry')}</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : (
              <JobsContainer
                bookings={bookings}
                loading={loading}
                onBookingAction={handleBookingAction}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.paper,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  container: {
    alignSelf: 'center',
    maxWidth: 820,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    width: '100%',
  },
  pendingBanner: {
    backgroundColor: colors.orangeSoft,
    borderColor: colors.orange,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.xl,
  },
  pendingTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  pendingBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  errorNoticeBox: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  errorNoticeText: {
    color: colors.danger,
    flex: 1,
    fontSize: 12,
  },
  retryBtn: {
    backgroundColor: colors.greenDark,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
