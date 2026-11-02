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
  subscribeToBookings,
  transitionBookingStatus,
} from '../data/marketplaceStore';
import { useLanguage } from '../i18n/locale';
import { TaskContainer } from '../task';
import { colors, radii, spacing } from '../theme/tokens';
import type { BookingRecord } from '../types/marketplace';
import { font } from '../theme/typography';

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
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [reloadBookingsKey, setReloadBookingsKey] = useState(0);

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
    const refresh = async () => {
      try {
        const allBookings = await loadBookings();
        if (!active) return;
        setBookings(
          user?.id
            ? allBookings.filter((booking) => booking.technicianUserId === user.id)
            : allBookings,
        );
        setBookingsError(null);
      } catch (error) {
        if (active) {
          setBookingsError(
            error instanceof Error ? error.message : 'bookings_load_failed',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void refresh();
    const unsubscribe = user?.id
      ? subscribeToBookings(
          user.id,
          () => void refresh(),
          (message) => setBookingsError(message),
        )
      : () => {};
    return () => {
      active = false;
      unsubscribe();
    };
  }, [reloadBookingsKey, user?.id]);

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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.screenContent}
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
                      ? 'This tasks hub is reserved for technician accounts.'
                      : 'Pusat tugas ini dikhususkan untuk akun teknisi.'
                    : language === 'en'
                      ? 'This tasks hub is reserved for technician accounts.'
                      : 'Pusat tugas ini dikhususkan untuk akun teknisi.'
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
            ) : bookingsError ? (
              <EmptyState
                title={
                  language === 'en'
                    ? 'Could not load booking requests'
                    : 'Permintaan pesanan tidak dapat dimuat'
                }
                description={bookingsError}
                actionLabel={t('home.retry')}
                onAction={() => {
                  setBookingsError(null);
                  setLoading(true);
                  setReloadBookingsKey((current) => current + 1);
                }}
              />
            ) : (
              <TaskContainer
                bookings={bookings}
                loading={loading}
                onBookingAction={handleBookingAction}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <AppNavigationBar activeTab="workspace" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
  },
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
    paddingHorizontal: 5,
    paddingTop: spacing.sm,
    width: '100%',
  },
  pendingBanner: {
    backgroundColor: colors.orangeSoft,
    borderColor: colors.orange,
    borderRadius: 5,
    borderWidth: 1,
    padding: spacing.xl,
  },
  pendingTitle: {
    color: colors.ink,
    fontSize: font.heading,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  pendingBody: {
    color: colors.muted,
    fontSize: font.label,
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
    fontSize: font.body,
  },
  retryBtn: {
    backgroundColor: colors.greenDark,
    borderRadius: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: font.body,
    fontWeight: '700',
  },
});
