import { router } from 'expo-router';
import {
  Calendar,
  ChevronRight,
  CreditCard,
  MapPin,
  Settings,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  EmptyState,
  LoadingState,
  ServiceCategoryGlyph,
} from '../components/marketplace-ui';
import { Avatar } from '../components/Avatar';
import { BackHeader } from '../components/BackHeader';
import { useAppearance } from '../context/AppearanceContext';
import {
  formatRupiah,
  loadCategories,
} from '../data/marketplaceRepository';
import {
  loadAccountProfileDetails,
  loadBookings,
  loadSavedAddresses,
  loadSavedTechnicianIds,
  loadSubmittedReviews,
} from '../data/marketplaceStore';
import { localizeArea, useLanguage } from '../i18n/locale';
import { useAuth } from '../auth/AuthProvider';
import { ICON_STROKE } from '../theme/icons';
import { font } from '../theme/typography';
import type {
  BookingRecord,
  SavedAddress,
  ServiceCategory,
} from '../types/marketplace';
import {
  BookingStatusBadge,
  formatShortDate,
  useScreenTheme,
} from '../bookings';

type CustomerProfileTab = 'activity' | 'services' | 'payments';

type AccountDetails = Awaited<ReturnType<typeof loadAccountProfileDetails>>;

const UPCOMING_STATUSES: BookingRecord['status'][] = [
  'requested',
  'alternative_proposed',
  'confirmed',
  'in_progress',
];

export function CustomerProfileScreen() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { palette, isDark } = useAppearance();
  const theme = useScreenTheme();

  const [tab, setTab] = useState<CustomerProfileTab>('activity');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [reviewsGiven, setReviewsGiven] = useState(0);
  const [profile, setProfile] = useState<AccountDetails | null>(null);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);

  const userId = user?.id;

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const metadataName =
          typeof user?.user_metadata?.display_name === 'string'
            ? user.user_metadata.display_name.trim()
            : '';
        const metadataUsername =
          typeof user?.user_metadata?.username === 'string'
            ? user.user_metadata.username.trim()
            : '';
        const [bookingList, savedIds, reviews, account, savedAddresses, categoryPage] =
          await Promise.all([
            loadBookings(),
            loadSavedTechnicianIds(userId),
            loadSubmittedReviews(),
            loadAccountProfileDetails(userId, user?.email ?? '', metadataName, metadataUsername),
            loadSavedAddresses(userId),
            loadCategories(),
          ]);
        if (!active) return;
        setBookings(bookingList);
        setFavoriteCount(savedIds.length);
        setReviewsGiven(reviews.length);
        setProfile(account);
        setAddresses(savedAddresses);
        setCategories(categoryPage.items);
        setError(null);
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'customer_profile_load_failed');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, reloadKey]);

  const myBookings = useMemo(
    () => (userId ? bookings.filter((b) => b.customerUserId === userId) : []),
    [bookings, userId],
  );

  const completedCount = useMemo(
    () => myBookings.filter((b) => b.status === 'completed').length,
    [myBookings],
  );

  const latestBooking = useMemo(
    () =>
      [...myBookings].sort((a, b) =>
        (b.requestedStartAt || '').localeCompare(a.requestedStartAt || ''),
      )[0] ?? null,
    [myBookings],
  );

  const upcomingBookings = useMemo(
    () =>
      myBookings
        .filter((b) => UPCOMING_STATUSES.includes(b.status))
        .sort((a, b) =>
          (a.requestedStartAt || '').localeCompare(b.requestedStartAt || ''),
        ),
    [myBookings],
  );

  const paymentHistory = useMemo(
    () =>
      myBookings
        .filter((b) => typeof b.agreedPrice === 'number' && b.agreedPrice > 0)
        .sort((a, b) =>
          (b.requestedStartAt || '').localeCompare(a.requestedStartAt || ''),
        ),
    [myBookings],
  );

  const displayName =
    profile?.displayName?.trim() ||
    (typeof user?.user_metadata?.display_name === 'string' &&
      user?.user_metadata?.display_name.trim()) ||
    user?.email?.split('@')[0] ||
    'Customer';

  const avatarUri =
    profile?.avatarUri?.trim() ||
    (typeof user?.user_metadata?.avatar_url === 'string' &&
      user.user_metadata.avatar_url) ||
    undefined;

  const areaLabel = useMemo(() => {
    const fromProfile = profile?.addressNotes?.trim();
    if (fromProfile) return fromProfile;
    const first = addresses.find((addr) => addr.area?.trim());
    return first?.area ? localizeArea(first.area, language) : null;
  }, [addresses, language, profile?.addressNotes]);

  const customerSince = useMemo(() => {
    const raw = (user as { created_at?: string } | null)?.created_at;
    const year = raw ? new Date(raw).getFullYear() : NaN;
    return Number.isFinite(year) ? year : null;
  }, [user]);

  const subtitle = useMemo(() => {
    const parts: string[] = [];
    if (areaLabel) parts.push(areaLabel);
    if (customerSince) {
      parts.push(
        language === 'en'
          ? `Customer since ${customerSince}`
          : `Pelanggan sejak ${customerSince}`,
      );
    }
    if (parts.length === 0) {
      const handle =
        profile?.username?.trim() ||
        (typeof user?.user_metadata?.username === 'string' &&
          user?.user_metadata?.username.trim()) ||
        '';
      return handle ? `@${handle.replace(/^@/, '')}` : 'Customer';
    }
    return parts.join(' • ');
  }, [areaLabel, customerSince, language, profile?.username, user]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, []);

  if (!user) {
    return (
      <SafeAreaView
        edges={['top', 'bottom']}
        style={[styles.safeArea, { backgroundColor: theme.background }]}
      >
        <View style={styles.center}>
          <EmptyState
            title={language === 'en' ? 'Sign in required' : 'Perlu masuk'}
            description={
              language === 'en'
                ? 'Sign in to view your profile.'
                : 'Masuk untuk melihat profil Anda.'
            }
            actionLabel={language === 'en' ? 'Sign in' : 'Masuk'}
            onAction={() => router.replace('/login')}
          />
        </View>
      </SafeAreaView>
    );
  }

  const metrics: { value: string; label: string; testID: string }[] = [
    {
      value: String(completedCount),
      label: language === 'en' ? 'Bookings Completed' : 'Pesanan Selesai',
      testID: 'customer-stats-completed',
    },
    {
      value: String(favoriteCount),
      label: language === 'en' ? 'Favorite Technicians' : 'Teknisi Favorit',
      testID: 'customer-stats-favorites',
    },
    {
      value: String(reviewsGiven),
      label: language === 'en' ? 'Reviews Given' : 'Ulasan Diberikan',
      testID: 'customer-stats-reviews',
    },
  ];

  const tabs: { key: CustomerProfileTab; label: string }[] = [
    { key: 'activity', label: language === 'en' ? 'Activity' : 'Aktivitas' },
    { key: 'services', label: language === 'en' ? 'Services' : 'Layanan' },
    { key: 'payments', label: language === 'en' ? 'Payments' : 'Pembayaran' },
  ];

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <BackHeader
        backBtnTestID="customer-profile-back-btn"
        testID="customer-profile-header"
        onPressBack={handleBack}
        rightElement={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={language === 'en' ? 'Settings' : 'Pengaturan'}
            hitSlop={10}
            onPress={() => router.push('/account')}
            style={({ pressed }) => [
              styles.gearButton,
              { borderColor: theme.border, opacity: pressed ? 0.6 : 1 },
            ]}
            testID="customer-settings-btn"
          >
            <Settings size={20} color={theme.muted} strokeWidth={ICON_STROKE} />
          </Pressable>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <LoadingState label={t('home.loading')} />
        ) : error ? (
          <View style={styles.center}>
            <EmptyState
              title={
                language === 'en'
                  ? 'Could not load your profile'
                  : 'Profil tidak dapat dimuat'
              }
              description={error}
              actionLabel={t('home.retry')}
              onAction={() => {
                setError(null);
                setReloadKey((current) => current + 1);
              }}
            />
          </View>
        ) : (
          <View style={styles.content}>
            {/* Hero: dark geometric cover + ringed avatar */}
            <View style={styles.heroWrap}>
              <View style={styles.cover} accessibilityElementsHidden importantForAccessibility="no">
                <View style={[styles.coverCircleLarge, { borderColor: theme.primary }]} />
                <View style={[styles.coverCircleSmall, { borderColor: theme.primary }]} />
                <View style={[styles.coverDiagonal, { backgroundColor: theme.primary }]} />
              </View>
              <View style={styles.heroBody}>
                <View style={[styles.avatarRing, { borderColor: theme.primary }]}>
                  <Avatar uri={avatarUri} name={displayName} size={70} />
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.name, { color: theme.text }]}
                  testID="customer-profile-name"
                >
                  {displayName}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.subtitle, { color: theme.muted }]}
                  testID="customer-profile-subtitle"
                >
                  {subtitle}
                </Text>
              </View>
            </View>

            {/* Metrics strip with hairline dividers */}
            <View
              style={[styles.statsBar, { borderTopColor: theme.border, borderBottomColor: theme.border }]}
              testID="customer-stats-bar"
            >
              {metrics.map((metric, index) => (
                <View key={metric.testID} style={styles.statsRowItem}>
                  {index > 0 ? (
                    <View style={[styles.statsDivider, { backgroundColor: theme.border }]} />
                  ) : null}
                  <View style={styles.statsCell} testID={metric.testID}>
                    <Text style={[styles.statsValue, { color: theme.primary }]}>
                      {metric.value}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={[styles.statsLabel, { color: theme.muted }]}
                    >
                      {metric.label}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Sub-navigation tabs with mint underline */}
            <View style={[styles.tabsRow, { borderBottomColor: theme.border }]} testID="customer-tab-bar">
              {tabs.map((item) => {
                const selected = tab === item.key;
                return (
                  <Pressable
                    key={item.key}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    accessibilityLabel={item.label}
                    onPress={() => setTab(item.key)}
                    style={styles.tabItem}
                    testID={`customer-tab-${item.key}`}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.tabText,
                        { color: selected ? theme.primary : theme.muted },
                        selected && styles.tabTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {selected ? (
                      <View style={[styles.tabIndicator, { backgroundColor: theme.primary }]} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {/* Content */}
            {tab === 'activity' ? (
              <View testID="customer-activity-content">
                {myBookings.length === 0 ? (
                  <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>
                      {language === 'en' ? 'No bookings yet' : 'Belum ada pesanan'}
                    </Text>
                    <Text style={[styles.cardSub, { color: theme.muted }]}>
                      {language === 'en'
                        ? 'Your bookings, receipts and saved addresses will show up here.'
                        : 'Pesanan, kuitansi, dan alamat tersimpan Anda akan tampil di sini.'}
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Recent Booking Receipt */}
                    {latestBooking ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${latestBooking.serviceNameSnapshot} · ${language === 'en' ? 'View receipt' : 'Lihat kuitansi'}`}
                        onPress={() =>
                          router.push({
                            pathname: '/booking/[id]' as never,
                            params: { id: latestBooking.id },
                          })
                        }
                        style={({ pressed }) => [
                          styles.card,
                          {
                            backgroundColor: theme.card,
                            borderColor: theme.border,
                            opacity: pressed ? 0.85 : 1,
                          },
                        ]}
                        testID="customer-recent-receipt"
                      >
                        <View style={styles.receiptTopRow}>
                          <BookingStatusBadge booking={latestBooking} testID="customer-receipt-status" />
                          {typeof latestBooking.agreedPrice === 'number' &&
                          latestBooking.agreedPrice > 0 ? (
                            <Text style={[styles.receiptPrice, { color: theme.text }]}>
                              {formatRupiah(latestBooking.agreedPrice, language)}
                            </Text>
                          ) : null}
                        </View>
                        <Text
                          numberOfLines={1}
                          style={[styles.receiptTitle, { color: theme.text }]}
                        >
                          {latestBooking.serviceNameSnapshot}
                        </Text>
                        <Text style={[styles.receiptDate, { color: theme.muted }]}>
                          {formatShortDate(
                            latestBooking.workCompletedAt ?? latestBooking.requestedStartAt,
                            language,
                          )}
                        </Text>
                      </Pressable>
                    ) : null}

                    {/* Booked Services */}
                    <View
                      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
                      testID="customer-upcoming-card"
                    >
                      <View style={styles.cardHeaderRow}>
                        <Calendar size={15} color={theme.primary} strokeWidth={ICON_STROKE} />
                        <Text style={[styles.cardEyebrow, { color: theme.muted }]}>
                          {language === 'en' ? 'BOOKED SERVICES' : 'LAYANAN DIBOOKING'}
                        </Text>
                      </View>
                      {upcomingBookings.length === 0 ? (
                        <Text style={[styles.cardSub, { color: theme.muted, marginTop: 10 }]}>
                          {language === 'en'
                            ? 'No upcoming bookings. Book a technician from the marketplace.'
                            : 'Belum ada pesanan mendatang. Pesan teknisi dari marketplace.'}
                        </Text>
                      ) : (
                        upcomingBookings.slice(0, 3).map((booking, index) => (
                          <Pressable
                            key={booking.id}
                            accessibilityRole="button"
                            accessibilityLabel={booking.serviceNameSnapshot}
                            onPress={() =>
                              router.push({
                                pathname: '/booking/[id]' as never,
                                params: { id: booking.id },
                              })
                            }
                            style={({ pressed }) => [
                              styles.upcomingRow,
                              index > 0 && {
                                borderTopColor: theme.border,
                                borderTopWidth: 1,
                              },
                              pressed && { opacity: 0.7 },
                            ]}
                            testID={`customer-upcoming-${booking.id}`}
                          >
                            <Calendar size={17} color={theme.primary} strokeWidth={ICON_STROKE} />
                            <View style={styles.upcomingMeta}>
                              <Text
                                numberOfLines={1}
                                style={[styles.upcomingTitle, { color: theme.text }]}
                              >
                                {booking.serviceNameSnapshot}
                              </Text>
                              <Text style={[styles.upcomingDate, { color: theme.muted }]}>
                                {formatShortDate(booking.requestedStartAt, language)}
                              </Text>
                            </View>
                            <ChevronRight size={16} color={theme.muted} strokeWidth={ICON_STROKE} />
                          </Pressable>
                        ))
                      )}
                    </View>
                  </>
                )}

                {/* Payment Method */}
                <View
                  style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
                  testID="customer-payment-method-card"
                >
                  <View style={styles.paymentRow}>
                    <View style={styles.paymentLeft}>
                      <CreditCard size={22} color={theme.primary} strokeWidth={ICON_STROKE} />
                      <View style={styles.paymentMeta}>
                        <Text
                          numberOfLines={1}
                          style={[styles.paymentTitle, { color: theme.text }]}
                        >
                          {language === 'en'
                            ? 'Pay directly to technician'
                            : 'Bayar langsung ke teknisi'}
                        </Text>
                        <Text
                          numberOfLines={2}
                          style={[styles.paymentSubtitle, { color: theme.muted }]}
                        >
                          {language === 'en'
                            ? 'Cash or transfer, settled with the technician. Cepat does not process payments yet.'
                            : 'Tunai atau transfer, disepakati langsung dengan teknisi. Cepat belum memproses pembayaran.'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.primaryPill} testID="customer-payment-primary">
                      <Text style={styles.primaryPillText}>Primary</Text>
                    </View>
                  </View>
                </View>

                {/* Saved Addresses */}
                <View
                  style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
                  testID="customer-addresses-card"
                >
                  <View style={styles.cardHeaderRow}>
                    <MapPin size={15} color={theme.primary} strokeWidth={ICON_STROKE} />
                    <Text style={[styles.cardEyebrow, { color: theme.muted }]}>
                      {language === 'en' ? 'SAVED ADDRESSES' : 'ALAMAT TERSIMPAN'}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={language === 'en' ? 'Manage addresses' : 'Kelola alamat'}
                      hitSlop={8}
                      onPress={() => router.push('/account?tab=address')}
                      style={styles.manageLink}
                      testID="customer-manage-addresses"
                    >
                      <Text style={[styles.manageLinkText, { color: theme.primary }]}>
                        {language === 'en' ? 'Manage' : 'Kelola'}
                      </Text>
                      <ChevronRight size={14} color={theme.primary} strokeWidth={ICON_STROKE} />
                    </Pressable>
                  </View>
                  {addresses.length === 0 ? (
                    <Text style={[styles.cardSub, { color: theme.muted, marginTop: 10 }]}>
                      {language === 'en'
                        ? 'No saved addresses yet.'
                        : 'Belum ada alamat tersimpan.'}
                    </Text>
                  ) : (
                    addresses.slice(0, 3).map((address, index) => (
                      <View
                        key={address.id}
                        style={[
                          styles.addressRow,
                          index > 0 && {
                            borderTopColor: theme.border,
                            borderTopWidth: 1,
                          },
                        ]}
                      >
                        <View style={styles.addressPinWrap}>
                          <MapPin size={15} color={theme.primary} strokeWidth={ICON_STROKE} />
                        </View>
                        <View style={styles.addressMeta}>
                          <Text
                            numberOfLines={1}
                            style={[styles.addressLabel, { color: theme.text }]}
                          >
                            {address.label}
                          </Text>
                          <Text
                            numberOfLines={2}
                            style={[styles.addressText, { color: theme.muted }]}
                          >
                            {[address.streetAddress, localizeArea(address.area, language)]
                              .map((part) => part?.trim())
                              .filter(Boolean)
                              .join(', ')}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>
            ) : null}

            {tab === 'services' ? (
              <View testID="customer-services-content" style={styles.servicesList}>
                {categories.length === 0 ? (
                  <Text style={[styles.cardSub, { color: theme.muted }]}>
                    {language === 'en'
                      ? 'No service categories available yet.'
                      : 'Belum ada kategori layanan.'}
                  </Text>
                ) : (
                  categories.map((category) => (
                    <Pressable
                      key={category.id}
                      accessibilityRole="button"
                      accessibilityLabel={category.name}
                      onPress={() =>
                        router.push({
                          pathname: '/category/[slug]' as never,
                          params: { slug: category.slug },
                        })
                      }
                      style={({ pressed }) => [
                        styles.categoryRow,
                        {
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                      testID={`customer-service-${category.slug}`}
                    >
                      <ServiceCategoryGlyph iconKey={category.icon} size={34} />
                      <Text
                        numberOfLines={1}
                        style={[styles.categoryName, { color: theme.text }]}
                      >
                        {category.name}
                      </Text>
                      <ChevronRight size={18} color={theme.muted} strokeWidth={ICON_STROKE} />
                    </Pressable>
                  ))
                )}
              </View>
            ) : null}

            {tab === 'payments' ? (
              <View testID="customer-payments-content">
                <View
                  style={[
                    styles.noticeCard,
                    { backgroundColor: theme.primarySoft, borderColor: theme.border },
                  ]}
                >
                  <CreditCard size={17} color={theme.primary} strokeWidth={ICON_STROKE} />
                  <Text style={[styles.noticeText, { color: theme.muted }]}>
                    {t('booking.notice')}
                  </Text>
                </View>
                {paymentHistory.length === 0 ? (
                  <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>
                      {language === 'en'
                        ? 'No payment history yet'
                        : 'Belum ada riwayat pembayaran'}
                    </Text>
                    <Text style={[styles.cardSub, { color: theme.muted }]}>
                      {language === 'en'
                        ? 'Agreed prices from your bookings will appear here once available.'
                        : 'Harga yang disepakati dari pesanan Anda akan tampil di sini.'}
                    </Text>
                  </View>
                ) : (
                  paymentHistory.map((booking) => (
                    <Pressable
                      key={booking.id}
                      accessibilityRole="button"
                      accessibilityLabel={booking.serviceNameSnapshot}
                      onPress={() =>
                        router.push({
                          pathname: '/booking/[id]' as never,
                          params: { id: booking.id },
                        })
                      }
                      style={({ pressed }) => [
                        styles.paymentHistoryRow,
                        {
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                      testID={`customer-payment-${booking.id}`}
                    >
                      <View style={styles.paymentHistoryMeta}>
                        <Text
                          numberOfLines={1}
                          style={[styles.paymentHistoryTitle, { color: theme.text }]}
                        >
                          {booking.serviceNameSnapshot}
                        </Text>
                        <Text style={[styles.paymentHistoryDate, { color: theme.muted }]}>
                          {formatShortDate(booking.requestedStartAt, language)}
                        </Text>
                      </View>
                      <Text style={[styles.paymentHistoryAmount, { color: theme.text }]}>
                        {formatRupiah(booking.agreedPrice as number, language)}
                      </Text>
                    </Pressable>
                  ))
                )}
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 },
  content: { marginHorizontal: 16, maxWidth: 820, width: '100%', alignSelf: 'center' },
  gearButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },

  heroWrap: { marginBottom: 4 },
  cover: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    height: 120,
    marginTop: 4,
    overflow: 'hidden',
    width: '100%',
  },
  coverCircleLarge: {
    borderColor: '#10B981',
    borderRadius: 999,
    borderWidth: 1.5,
    height: 190,
    opacity: 0.28,
    position: 'absolute',
    right: -70,
    top: -70,
    width: 190,
  },
  coverCircleSmall: {
    borderColor: '#10B981',
    borderRadius: 999,
    borderWidth: 1,
    height: 84,
    left: -28,
    opacity: 0.22,
    position: 'absolute',
    top: 44,
    width: 84,
  },
  coverDiagonal: {
    height: 1.5,
    left: -40,
    opacity: 0.35,
    position: 'absolute',
    top: 78,
    transform: [{ rotate: '-14deg' }],
    width: 260,
  },
  heroBody: { alignItems: 'center', marginTop: -40, paddingHorizontal: 16 },
  avatarRing: {
    alignItems: 'center',
    borderRadius: 43,
    borderWidth: 2,
    justifyContent: 'center',
    padding: 3,
  },
  name: {
    fontSize: font.heading + 4,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginTop: 10,
  },
  subtitle: {
    fontSize: font.label,
    fontWeight: '500',
    letterSpacing: 0.1,
    marginTop: 4,
  },

  statsBar: {
    alignItems: 'stretch',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    marginTop: 16,
    paddingVertical: 12,
  },
  statsRowItem: { flex: 1, flexDirection: 'row' },
  statsDivider: { alignSelf: 'center', height: 34, width: StyleSheet.hairlineWidth },
  statsCell: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 4 },
  statsValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.2 },
  statsLabel: {
    fontSize: font.body,
    fontWeight: '600',
    lineHeight: 15,
    marginTop: 3,
    textAlign: 'center',
  },

  tabsRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 24,
    marginBottom: 10,
    marginTop: 14,
    paddingHorizontal: 4,
  },
  tabItem: { paddingBottom: 10, paddingHorizontal: 2, paddingTop: 4 },
  tabText: { fontSize: font.label, fontWeight: '600', letterSpacing: 0.1 },
  tabTextActive: { fontWeight: '800' },
  tabIndicator: {
    borderRadius: 2,
    height: 3,
    left: 0,
    position: 'absolute',
    right: 0,
    bottom: 0,
  },

  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 6,
    padding: 14,
  },
  cardTitle: { fontSize: font.title, fontWeight: '800', letterSpacing: -0.2 },
  cardSub: { fontSize: font.label, lineHeight: 17, marginTop: 4 },
  cardHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
  },
  cardEyebrow: { flex: 1, fontSize: font.caption, fontWeight: '800', letterSpacing: 1.1 },

  receiptTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  receiptPrice: { fontSize: font.subtitle, fontWeight: '800', letterSpacing: -0.2 },
  receiptTitle: {
    fontSize: font.heading,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginTop: 10,
  },
  receiptDate: { fontSize: font.label, fontWeight: '500', marginTop: 4 },

  upcomingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
  },
  upcomingMeta: { flex: 1 },
  upcomingTitle: { fontSize: font.label, fontWeight: '700', letterSpacing: -0.1 },
  upcomingDate: { fontSize: font.body, fontWeight: '500', marginTop: 2 },

  paymentRow: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  paymentLeft: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 12, minWidth: 0 },
  paymentMeta: { flex: 1, minWidth: 0 },
  paymentTitle: { fontSize: font.label, fontWeight: '800', letterSpacing: -0.1 },
  paymentSubtitle: { fontSize: font.body, lineHeight: 15, marginTop: 2 },
  primaryPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  primaryPillText: {
    color: '#10B981',
    fontSize: font.caption,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  manageLink: { alignItems: 'center', flexDirection: 'row', gap: 2 },
  manageLinkText: { fontSize: font.body, fontWeight: '800' },
  addressRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, marginTop: 12, paddingTop: 10 },
  addressPinWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  addressMeta: { flex: 1, minWidth: 0 },
  addressLabel: { fontSize: font.label, fontWeight: '800' },
  addressText: { fontSize: font.body, lineHeight: 15, marginTop: 2 },

  servicesList: { gap: 8 },
  categoryRow: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  categoryName: { flex: 1, fontSize: font.label, fontWeight: '700', letterSpacing: -0.1 },

  noticeCard: {
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginVertical: 6,
    padding: 12,
  },
  noticeText: { flex: 1, fontSize: font.body, lineHeight: 15 },
  paymentHistoryRow: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
    padding: 14,
  },
  paymentHistoryMeta: { flex: 1, minWidth: 0 },
  paymentHistoryTitle: { fontSize: font.label, fontWeight: '800', letterSpacing: -0.1 },
  paymentHistoryDate: { fontSize: font.body, fontWeight: '500', marginTop: 2 },
  paymentHistoryAmount: { fontSize: font.label, fontWeight: '800', letterSpacing: -0.1 },
});
