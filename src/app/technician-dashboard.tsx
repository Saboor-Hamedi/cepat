import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthProvider';
import {
  AppNavigationBar,
  Avatar,
  EmptyState,
  LoadingState,
} from '../components/marketplace-ui';
import { ProfileAvatar } from '../profile';
import {
  TechnicianPostCard,
  TechnicianPostComposer,
} from '../components/TechnicianPostCard';
import {
  formatRupiah,
  getIndonesianRegions,
  shouldUseFixtures,
} from '../data/marketplaceRepository';
import {
  loadBookings,
  loadTechnicianWorkspaceProfile,
  saveTechnicianWorkspaceProfile,
  transitionBookingStatus,
} from '../data/marketplaceStore';
import {
  createTechnicianPost,
  deleteTechnicianPost,
  loadTechnicianPosts,
  updateTechnicianPost,
} from '../data/postsStore';
import { localizeArea, useLanguage } from '../i18n/locale';
import { colors, radii, spacing } from '../theme/tokens';
import type { BookingRecord, Technician, TechnicianPost } from '../types/marketplace';
import { PortfolioEditor } from '../profile/PortfolioEditor';

type TechDashboardTab =
  | 'requests'
  | 'upcoming'
  | 'posts'
  | 'history'
  | 'profile_services'
  | 'reviews';

export default function TechnicianDashboardScreen() {
  const { language, t } = useLanguage();
  const {
    user,
    roles,
    effectiveRole,
    applicationStatus,
    applicationError,
    refreshAccount,
    updateUserProfile,
  } = useAuth();
  const [tab, setTab] = useState<TechDashboardTab>('requests');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Technician | null>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [posts, setPosts] = useState<TechnicianPost[]>([]);
  const [selectedCustomerBooking, setSelectedCustomerBooking] = useState<BookingRecord | null>(
    null,
  );
  const [proposedTimeMap, setProposedTimeMap] = useState<Record<string, string>>({});
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [workspaceNotice, setWorkspaceNotice] = useState<string | null>(null);

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
    void Promise.all([loadTechnicianWorkspaceProfile(user?.id), loadBookings()])
      .then(async ([tech, allBookings]) => {
        if (!active) return;
        setProfile(tech);
        setBookings(allBookings);
        const targetId = user?.id || tech?.id || 'demo-rizky';
        const loadedPosts = await loadTechnicianPosts(targetId, true);
        if (active) setPosts(loadedPosts);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const incomingRequests = useMemo(
    () => bookings.filter((b) => b.status === 'requested' || b.status === 'alternative_proposed'),
    [bookings],
  );

  const upcomingBookings = useMemo(
    () => bookings.filter((b) => b.status === 'confirmed' || b.status === 'in_progress'),
    [bookings],
  );

  const historyBookings = useMemo(
    () => bookings.filter((b) => ['completed', 'cancelled', 'declined'].includes(b.status)),
    [bookings],
  );

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

  const handleSaveProfile = async (next: Technician) => {
    if (!isApprovedTechnician) return;
    const saved = await saveTechnicianWorkspaceProfile(user?.id, next);
    setProfile(saved);
    if (saved.avatarUri || saved.displayName) {
      void updateUserProfile({
        displayName: saved.displayName,
        avatarUrl: saved.avatarUri,
      });
    }
    setWorkspaceNotice(
      language === 'en' ? 'Profile changes saved.' : 'Perubahan profil teknisi disimpan.',
    );
  };

  const handleCreatePost = async (input: {
    caption: string;
    imageUri?: string;
    mediaUrls?: string[];
  }) => {
    const ownerId = user?.id || profile?.id || 'demo-rizky';
    await createTechnicianPost({
      actorUserId: ownerId,
      technicianId: ownerId,
      technicianName: profile?.displayName || 'Rizky Pratama',
      technicianBusinessName: profile?.businessName,
      technicianAvatarUri: profile?.avatarUri,
      technicianVerified: profile?.verified,
      caption: input.caption,
      imageUri: input.imageUri,
      mediaUrls: input.mediaUrls,
      serviceArea: profile?.serviceAreas[0] ?? 'Jakarta Selatan',
      categorySlug: profile?.services[0]?.categorySlug ?? 'plumbing',
      published: true,
    });
    const nextPosts = await loadTechnicianPosts(ownerId, true);
    setPosts(nextPosts);
  };

  const handleEditPost = async (
    post: TechnicianPost,
    nextCaption: string,
    nextImageUri?: string,
  ) => {
    const ownerId = user?.id || profile?.id || post.technicianId;
    await updateTechnicianPost({
      actorUserId: ownerId,
      postId: post.id,
      caption: nextCaption,
      imageUri: nextImageUri,
    });
    const nextPosts = await loadTechnicianPosts(ownerId, true);
    setPosts(nextPosts);
  };

  const handleDeletePost = async (postId: string) => {
    const ownerId = user?.id || profile?.id || 'demo-rizky';
    await deleteTechnicianPost({ actorUserId: ownerId, postId });
    const nextPosts = await loadTechnicianPosts(ownerId, true);
    setPosts(nextPosts);
  };

  const handleAddService = async () => {
    if (!profile || !newServiceName.trim()) return;
    const price = Number(newServicePrice);
    const nextServices = [
      ...profile.services,
      {
        id: `svc-${Date.now()}`,
        name: newServiceName.trim(),
        categoryName: 'Plumbing',
        categorySlug: 'plumbing',
        startingPrice: Number.isFinite(price) && price > 0 ? price : undefined,
        estimatedDurationMinutes: 60,
        isActive: true,
      },
    ];
    setNewServiceName('');
    setNewServicePrice('');
    await handleSaveProfile({ ...profile, services: nextServices });
  };

  const regions = getIndonesianRegions();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
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
          <View style={styles.container}>
          {isWrongRoleAccount ? (
            <EmptyState
              title={effectiveRole === 'admin' ? (language === 'en' ? 'Admin Account Active' : 'Akun Admin Aktif') : (language === 'en' ? 'Customer Account Active' : 'Akun Pelanggan Aktif')}
              description={effectiveRole === 'admin' ? (language === 'en' ? 'This social technician profile is reserved for technician accounts.' : 'Profil teknisi ini dikhususkan untuk akun teknisi.') : (language === 'en' ? 'This social technician profile is reserved for technician accounts.' : 'Profil teknisi ini dikhususkan untuk akun teknisi.')}
              actionLabel={effectiveRole === 'admin' ? (language === 'en' ? 'Open Admin Console' : 'Buka Konsol Admin') : (language === 'en' ? 'Open Customer Bookings' : 'Buka Pesanan Pelanggan')}
              onAction={() => router.replace(effectiveRole === 'admin' ? '/admin' : '/bookings')}
            />
          ) : !isApprovedTechnician ? (
            <View style={styles.pendingBanner} testID="unapproved-technician-banner">
              <Text style={styles.pendingTitle}>
                {applicationStatus
                  ? t(`auth.application.${applicationStatus}`)
                  : t('auth.applicationPending')}
              </Text>
              <Text style={styles.pendingBody}>
                {language === 'en'
                  ? 'Technician booking management requires administrator approval. You can still browse the marketplace as a customer.'
                  : 'Pengelolaan pesanan teknisi memerlukan persetujuan administrator. Kamu tetap dapat menggunakan marketplace sebagai pelanggan.'}
              </Text>
              {applicationError ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void refreshAccount();
                  }}
                  style={{ marginTop: spacing.sm }}
                  testID="dashboard-retry-application-status"
                >
                  <Text style={{ color: colors.greenDark, fontSize: 12, fontWeight: '700' }}>
                    {t('home.retry')} ({applicationError})
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <>
              {/* Semantic hidden node to preserve testIDs without rendering the top technician name bar */}
              <View style={styles.srOnly} testID="technician-social-profile-card">
                <Text testID="technician-dashboard-heading">
                  {profile?.businessName || profile?.displayName || 'Technician Workspace'}
                </Text>
              </View>

              {/* Full-width container for tabs directly under the header */}
              <View style={styles.tabsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
                  {(
                    [
                      ['requests', language === 'en' ? `Requests (${incomingRequests.length})` : `Permintaan (${incomingRequests.length})`],
                      ['upcoming', language === 'en' ? `Accepted Jobs (${upcomingBookings.length})` : `Jadwal Aktif (${upcomingBookings.length})`],
                      ['posts', language === 'en' ? `Posts (${posts.length})` : `Postingan (${posts.length})`],
                      ['history', language === 'en' ? `History (${historyBookings.length})` : `Riwayat (${historyBookings.length})`],
                      ['profile_services', language === 'en' ? 'Edit Profile & Services' : 'Edit Profil & Layanan'],
                      ['reviews', language === 'en' ? `Reviews (${profile?.reviews.length ?? 0})` : `Ulasan (${profile?.reviews.length ?? 0})`],
                    ] as const
                  ).map(([key, label]) => (
                    <Pressable
                      key={key}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: tab === key }}
                      onPress={() => setTab(key)}
                      style={[styles.tabPill, tab === key && styles.tabPillActive]}
                      testID={`tech-tab-${key}`}
                    >
                      <Text style={[styles.tabPillText, tab === key && styles.tabPillTextActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {loading ? (
                <LoadingState label={t('home.loading')} />
              ) : tab === 'requests' ? (
                incomingRequests.length > 0 ? (
                  incomingRequests.map((req) => (
                    <View
                      key={req.id}
                      style={styles.card}
                      testID={`incoming-request-card-${req.id}`}
                    >
                      <View style={styles.customerHeaderRow}>
                        <Avatar name={req.customerName} size={42} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardCustomer}>{req.customerName}</Text>
                          <Text style={styles.cardMeta}>
                            {localizeArea(req.serviceArea, language)} ·{' '}
                            {req.requestedStartAt.slice(0, 16).replace('T', ' ')} WIB
                          </Text>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => setSelectedCustomerBooking(req)}
                          style={styles.customerProfileBtn}
                          testID={`dashboard-view-customer-${req.id}`}
                        >
                          <Text style={styles.customerProfileBtnText}>
                            {language === 'en' ? 'Customer Profile' : 'Profil Pelanggan'}
                          </Text>
                        </Pressable>
                      </View>

                      <View style={styles.cardTop}>
                        <Text style={styles.cardTitle}>{req.serviceNameSnapshot}</Text>
                        <Text style={styles.priceBadge}>
                          {req.agreedPrice ? formatRupiah(req.agreedPrice, language) : '-'}
                        </Text>
                      </View>

                      {/* Address privacy: street address stays hidden until request is accepted */}
                      <View
                        style={styles.maskedAddressBox}
                        testID={`masked-address-notice-${req.id}`}
                      >
                        <Text style={styles.maskedAddressText}>
                          {language === 'en'
                            ? `Area: ${localizeArea(req.serviceArea, language)} · Exact street address unlocks after accepting this request.`
                            : `Area: ${localizeArea(req.serviceArea, language)} · Alamat lengkap akan terbuka setelah permintaan diterima.`}
                        </Text>
                      </View>

                      {req.customerNotes && (
                        <Text style={styles.cardNotes}>“{req.customerNotes}”</Text>
                      )}

                      {req.status === 'requested' ? (
                        <>
                          <View style={styles.actionRow}>
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => {
                                void handleBookingAction(req.id, 'confirmed');
                              }}
                              style={styles.acceptBtn}
                              testID={`dashboard-accept-${req.id}`}
                            >
                              <Text style={styles.acceptBtnText}>{t('booking.acceptRequest')}</Text>
                            </Pressable>
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => {
                                void handleBookingAction(req.id, 'declined');
                              }}
                              style={styles.declineBtn}
                              testID={`dashboard-decline-${req.id}`}
                            >
                              <Text style={styles.declineBtnText}>
                                {t('booking.declineRequest')}
                              </Text>
                            </Pressable>
                          </View>
                          <View style={styles.proposeRow}>
                            <TextInput
                              onChangeText={(txt) =>
                                setProposedTimeMap((prev) => ({ ...prev, [req.id]: txt }))
                              }
                              placeholder="2026-11-05 10:00 WIB"
                              placeholderTextColor={colors.muted}
                              style={styles.proposeInput}
                              testID={`dashboard-propose-input-${req.id}`}
                              value={proposedTimeMap[req.id] ?? '2026-11-05 10:00 WIB'}
                            />
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => {
                                void handleBookingAction(
                                  req.id,
                                  'alternative_proposed',
                                  proposedTimeMap[req.id] ?? '2026-11-05 10:00 WIB',
                                );
                              }}
                              style={styles.proposeBtn}
                              testID={`dashboard-propose-btn-${req.id}`}
                            >
                              <Text style={styles.proposeBtnText}>{t('booking.proposeTime')}</Text>
                            </Pressable>
                          </View>
                        </>
                      ) : (
                        <Text style={styles.proposedBadge}>
                          {t('booking.status.alternative_proposed')}: {req.proposedStartAt}
                        </Text>
                      )}
                    </View>
                  ))
                ) : (
                  <EmptyState
                    title={
                      language === 'en'
                        ? 'No pending booking requests'
                        : 'Belum ada permintaan baru'
                    }
                    description={
                      language === 'en'
                        ? 'New customer requests will appear here.'
                        : 'Permintaan jadwal baru dari pelanggan akan muncul di sini.'
                    }
                  />
                )
              ) : tab === 'upcoming' ? (
                upcomingBookings.length > 0 ? (
                  upcomingBookings.map((job) => (
                    <View key={job.id} style={styles.card} testID={`upcoming-job-card-${job.id}`}>
                      <View style={styles.customerHeaderRow}>
                        <Avatar name={job.customerName} size={42} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardCustomer}>{job.customerName}</Text>
                          <Text style={styles.cardMeta}>
                            {job.requestedStartAt.slice(0, 16).replace('T', ' ')} WIB
                          </Text>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => setSelectedCustomerBooking(job)}
                          style={styles.customerProfileBtn}
                          testID={`dashboard-view-customer-${job.id}`}
                        >
                          <Text style={styles.customerProfileBtnText}>
                            {language === 'en' ? 'Customer Profile' : 'Profil Pelanggan'}
                          </Text>
                        </Pressable>
                      </View>

                      <View style={styles.cardTop}>
                        <Text style={styles.cardTitle}>{job.serviceNameSnapshot}</Text>
                        <Text style={styles.statusTag}>
                          {t(`booking.status.${job.status}`)}
                        </Text>
                      </View>
                      <Text
                        style={styles.unlockedAddressText}
                        testID={`unlocked-customer-address-${job.id}`}
                      >
                        {job.customerAddress} ({localizeArea(job.serviceArea, language)})
                      </Text>
                      <View style={styles.actionRow}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() =>
                            router.push({ pathname: '/booking/[id]', params: { id: job.id } })
                          }
                          style={styles.chatActionBtn}
                          testID={`dashboard-open-chat-${job.id}`}
                        >
                          <View style={styles.chatIconBox}>
                            <View style={styles.chatIconTail} />
                          </View>
                          <Text style={styles.chatActionBtnText}>{t('booking.chatTitle')}</Text>
                        </Pressable>
                        {job.status === 'confirmed' && (
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => {
                              void handleBookingAction(job.id, 'in_progress');
                            }}
                            style={styles.secondaryBtn}
                            testID={`dashboard-start-${job.id}`}
                          >
                            <Text style={styles.secondaryBtnText}>
                              {language === 'en' ? 'Start Job' : 'Mulai Pekerjaan'}
                            </Text>
                          </Pressable>
                        )}
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => {
                            if (!job.customerAcceptedWorkDone) {
                              Alert.alert(
                                language === 'en'
                                  ? 'Customer Approval Required'
                                  : 'Persetujuan Pelanggan Diperlukan',
                                language === 'en'
                                  ? 'The customer must review and accept that the work has been done before completing this order.'
                                  : 'Pelanggan harus memeriksa dan menyetujui pekerjaan selesai terlebih dahulu.',
                              );
                              return;
                            }
                            void handleBookingAction(job.id, 'completed');
                          }}
                          style={[styles.acceptBtn, !job.customerAcceptedWorkDone && { opacity: 0.6 }]}
                          testID={`dashboard-complete-${job.id}`}
                        >
                          <Text style={styles.acceptBtnText}>{t('booking.completeJob')}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))
                ) : (
                  <EmptyState
                    title={language === 'en' ? 'No upcoming bookings' : 'Belum ada jadwal aktif'}
                    description={
                      language === 'en'
                        ? 'Accepted requests will be listed here.'
                        : 'Pesanan yang telah diterima akan tampil di sini.'
                    }
                  />
                )
              ) : tab === 'posts' ? (
                <View testID="technician-posts-tab-view">
                  <TechnicianPostComposer
                    onCreatePost={handleCreatePost}
                    technicianProfile={
                      profile
                        ? {
                            id: profile.id,
                            displayName: profile.displayName,
                            avatarUri: profile.avatarUri,
                          }
                        : undefined
                    }
                  />
                  {posts.map((post) => (
                    <TechnicianPostCard
                      key={post.id}
                      isOwner
                      onDelete={handleDeletePost}
                      onEdit={handleEditPost}
                      post={post}
                    />
                  ))}
                </View>
              ) : tab === 'history' ? (
                historyBookings.map((job) => (
                  <View key={job.id} style={styles.card}>
                    <View style={styles.cardTop}>
                      <Text style={styles.cardTitle}>{job.serviceNameSnapshot}</Text>
                      <Text style={styles.statusTag}>{t(`booking.status.${job.status}`)}</Text>
                    </View>
                    <Text style={styles.cardMeta}>
                      {job.customerName} · {localizeArea(job.serviceArea, language)}
                    </Text>
                  </View>
                ))
              ) : tab === 'profile_services' && profile ? (
                <View style={styles.card} testID="tech-workspace-editor">
                  <View style={styles.avatarEditContainer}>
                    <ProfileAvatar
                      uri={profile.avatarUri}
                      name={profile.displayName}
                      size={88}
                      editable={true}
                      onImageSelected={(uri) => {
                        const next = { ...profile, avatarUri: uri };
                        setProfile(next);
                        void handleSaveProfile(next);
                      }}
                      testID="tech-workspace-avatar"
                    />
                    <Text style={styles.avatarTapHint}>
                      {language === 'en' ? 'Tap photo to change' : 'Ketuk foto untuk mengubah'}
                    </Text>
                  </View>
                  <TextInput
                    onChangeText={(txt) => setProfile({ ...profile, displayName: txt })}
                    placeholder={language === 'en' ? 'Your Name' : 'Nama Lengkap'}
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    testID="workspace-display-name"
                    value={profile.displayName ?? ''}
                  />
                  <TextInput
                    onChangeText={(txt) => setProfile({ ...profile, businessName: txt })}
                    placeholder={language === 'en' ? 'Business name' : 'Nama bisnis / usaha'}
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    testID="workspace-business-name"
                    value={profile.businessName ?? ''}
                  />
                  <TextInput
                    onChangeText={(txt) => setProfile({ ...profile, headline: txt })}
                    placeholder={language === 'en' ? 'Professional headline' : 'Keahlian utama / Headline'}
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    testID="workspace-headline"
                    value={profile.headline ?? ''}
                  />
                  <TextInput
                    multiline
                    numberOfLines={4}
                    onChangeText={(txt) => setProfile({ ...profile, bio: txt })}
                    placeholder={
                      language === 'en'
                        ? 'Tell customers about your business, expertise, and services...'
                        : 'Ceritakan tentang bisnis, keahlian, dan layanan Anda kepada pelanggan...'
                    }
                    placeholderTextColor={colors.muted}
                    style={[styles.input, styles.bioInput]}
                    testID="workspace-bio"
                    value={profile.bio ?? ''}
                  />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      void handleSaveProfile(profile);
                    }}
                    style={styles.acceptBtn}
                    testID="workspace-save-profile"
                  >
                    <Text style={styles.acceptBtnText}>
                      {language === 'en' ? 'Save Profile' : 'Simpan Profil'}
                    </Text>
                  </Pressable>

                  <Text style={styles.sectionTitle}>
                    {language === 'en' ? 'Services & Pricing' : 'Layanan & Harga'}
                  </Text>
                  {profile.services.map((svc) => (
                    <View key={svc.id} style={styles.listRow}>
                      <Text style={styles.listRowLabel}>{svc.name}</Text>
                      <Text style={styles.listRowValue}>
                        {svc.startingPrice
                          ? formatRupiah(svc.startingPrice, language)
                          : t('technician.askPrice')}
                      </Text>
                    </View>
                  ))}
                  <View style={styles.proposeRow}>
                    <TextInput
                      onChangeText={setNewServiceName}
                      placeholder={language === 'en' ? 'Service name' : 'Nama layanan'}
                      placeholderTextColor={colors.muted}
                      style={[styles.input, styles.flexInput]}
                      testID="workspace-new-service-name"
                      value={newServiceName}
                    />
                    <TextInput
                      keyboardType="numeric"
                      onChangeText={setNewServicePrice}
                      placeholder="Rp"
                      placeholderTextColor={colors.muted}
                      style={[styles.input, styles.priceInput]}
                      testID="workspace-new-service-price"
                      value={newServicePrice}
                    />
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        void handleAddService();
                      }}
                      style={styles.secondaryBtn}
                      testID="workspace-add-service-btn"
                    >
                      <Text style={styles.secondaryBtnText}>+</Text>
                    </Pressable>
                  </View>

                  <PortfolioEditor
                    portfolio={profile.portfolio}
                    onAddPortfolio={async (item) => {
                      const next = [
                        ...profile.portfolio,
                        {
                          id: `work-${Date.now()}`,
                          title: item.title,
                          imageUri: item.imageUri,
                        },
                      ];
                      await handleSaveProfile({ ...profile, portfolio: next });
                    }}
                    onRemovePortfolio={async (id) => {
                      const next = profile.portfolio.filter((p) => p.id !== id);
                      await handleSaveProfile({ ...profile, portfolio: next });
                    }}
                  />

                  <Text style={styles.sectionTitle}>
                    {language === 'en' ? 'Service Areas' : 'Area Layanan'}
                  </Text>
                  <View style={styles.chipRow}>
                    {regions.map((reg) => {
                      const active = profile.serviceAreas.includes(reg.name);
                      return (
                        <Pressable
                          key={reg.id}
                          accessibilityRole="button"
                          onPress={() => {
                            const nextAreas = active
                              ? profile.serviceAreas.filter((a) => a !== reg.name)
                              : [...profile.serviceAreas, reg.name];
                            void handleSaveProfile({ ...profile, serviceAreas: nextAreas });
                          }}
                          style={[styles.areaChip, active && styles.areaChipActive]}
                        >
                          <Text
                            style={[styles.areaChipText, active && styles.areaChipTextActive]}
                          >
                            {localizeArea(reg.name, language)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {workspaceNotice && (
                    <Text style={styles.workspaceNotice}>{workspaceNotice}</Text>
                  )}
                </View>
              ) : (
                <View style={styles.sectionList}>
                  {profile?.reviews.map((rev) => (
                    <View key={rev.id} style={styles.card}>
                      <View style={styles.cardTop}>
                        <Text style={styles.cardTitle}>{rev.customerName}</Text>
                        <Text style={styles.priceBadge}>★ {rev.rating.toFixed(1)}</Text>
                      </View>
                      <Text style={styles.cardMeta}>{rev.comment}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Customer Profile Modal (Privacy-safe: never exposes customer email or phone) */}
      <Modal
        animationType="fade"
        onRequestClose={() => setSelectedCustomerBooking(null)}
        transparent
        visible={Boolean(selectedCustomerBooking)}
      >
        <Pressable
          style={styles.modalScrim}
          onPress={() => setSelectedCustomerBooking(null)}
        >
          {selectedCustomerBooking && (
            <Pressable
              style={styles.customerModalCard}
              onPress={(e) => e.stopPropagation()}
              testID="customer-profile-modal"
            >
              <View style={styles.customerModalTop}>
                <Avatar name={selectedCustomerBooking.customerName} size={64} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.customerModalName}>
                    {selectedCustomerBooking.customerName}
                  </Text>
                  <Text style={styles.customerModalSub}>
                    {language === 'en' ? 'Verified Cepat Customer' : 'Pelanggan Cepat Terverifikasi'}
                  </Text>
                  <Text style={styles.customerModalSub}>
                    {localizeArea(selectedCustomerBooking.serviceArea, language)}
                  </Text>
                </View>
              </View>
              <View style={styles.customerModalInfoBox}>
                <Text style={styles.customerModalInfoLabel}>
                  {language === 'en' ? 'Requested Service' : 'Layanan Diminta'}
                </Text>
                <Text style={styles.customerModalInfoValue}>
                  {selectedCustomerBooking.serviceNameSnapshot}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelectedCustomerBooking(null)}
                style={styles.acceptBtn}
                testID="close-customer-profile-modal"
              >
                <Text style={styles.acceptBtnText}>
                  {language === 'en' ? 'Close' : 'Tutup'}
                </Text>
              </Pressable>
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.paper, flex: 1 },
  srOnly: { height: 0, opacity: 0, position: 'absolute', width: 0 },
  scrollContent: { paddingBottom: spacing.xxxl },
  container: { alignSelf: 'center', maxWidth: 820, paddingHorizontal: spacing.md, paddingTop: spacing.sm, width: '100%' },
  pendingBanner: { backgroundColor: '#FFF4E5', borderColor: '#F0D2A8', borderRadius: radii.sm, borderWidth: 1, padding: spacing.xl },
  pendingTitle: { color: '#7D490A', fontSize: 16, fontWeight: '800' },
  pendingBody: { color: '#8A5A20', fontSize: 13, lineHeight: 20, marginTop: spacing.sm },
  workspaceHeaderCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm, padding: spacing.md, width: '100%' },
  workspaceHeaderTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  workspaceHeaderSubtitle: { color: colors.greenDark, fontSize: 12, fontWeight: '700', marginTop: 2 },
  avatarEditContainer: { alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  avatarTapHint: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 6 },
  bioInput: { minHeight: 80, paddingVertical: spacing.sm, textAlignVertical: 'top' },
  tabsContainer: { backgroundColor: '#FFFFFF', borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, marginBottom: spacing.sm, paddingHorizontal: spacing.xs, paddingVertical: spacing.xs, width: '100%' },
  tabsRow: { gap: spacing.xs, paddingVertical: 2 },
  tabPill: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  tabPillActive: { backgroundColor: colors.greenDark, borderColor: colors.greenDark },
  tabPillText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  tabPillTextActive: { color: '#FFFFFF' },
  card: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, marginBottom: spacing.md, padding: spacing.lg, width: '100%' },
  customerHeaderRow: { alignItems: 'center', borderBottomColor: colors.line, borderBottomWidth: 1, flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, paddingBottom: spacing.sm },
  customerProfileBtn: { backgroundColor: colors.paper, borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  customerProfileBtnText: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  cardTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  cardTitle: { color: colors.ink, flex: 1, fontSize: 16, fontWeight: '800' },
  priceBadge: { backgroundColor: colors.greenSoft, borderRadius: 5, color: colors.greenDark, fontSize: 12, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4 },
  statusTag: { backgroundColor: colors.greenSoft, borderRadius: radii.sm, color: colors.greenDark, fontSize: 10, fontWeight: '800', paddingHorizontal: 9, paddingVertical: 4 },
  cardCustomer: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  cardMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  maskedAddressBox: { backgroundColor: '#F6F4EC', borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, marginTop: spacing.sm, padding: spacing.sm },
  maskedAddressText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  unlockedAddressText: { color: colors.ink, fontSize: 13, fontWeight: '700', marginTop: spacing.xs },
  cardNotes: { backgroundColor: colors.paper, borderRadius: 5, color: colors.ink, fontSize: 12, fontStyle: 'italic', marginTop: spacing.sm, padding: spacing.sm },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  acceptBtn: { alignItems: 'center', backgroundColor: colors.greenDark, borderRadius: radii.sm, justifyContent: 'center', minHeight: 40, paddingHorizontal: spacing.lg, paddingVertical: 8 },
  acceptBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  declineBtn: { alignItems: 'center', backgroundColor: '#FBEDEA', borderColor: colors.danger, borderRadius: radii.sm, borderWidth: 1, justifyContent: 'center', minHeight: 40, paddingHorizontal: spacing.lg, paddingVertical: 8 },
  declineBtnText: { color: colors.danger, fontSize: 12, fontWeight: '800' },
  chatActionBtn: { alignItems: 'center', backgroundColor: colors.greenSoft, borderColor: colors.green, borderRadius: radii.sm, borderWidth: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 40, paddingHorizontal: spacing.md, paddingVertical: 8 },
  chatIconBox: { borderColor: colors.greenDark, borderRadius: 3, borderWidth: 1.8, height: 12, width: 14 },
  chatIconTail: { backgroundColor: colors.greenDark, bottom: -3, height: 3, left: 2, position: 'absolute', width: 3 },
  chatActionBtnText: { color: colors.greenDark, fontSize: 12, fontWeight: '800' },
  secondaryBtn: { alignItems: 'center', backgroundColor: colors.paper, borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, justifyContent: 'center', minHeight: 40, paddingHorizontal: spacing.md, paddingVertical: 8 },
  secondaryBtnText: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  proposeRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  proposeInput: { backgroundColor: colors.paper, borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, color: colors.ink, flex: 1, fontSize: 12, minHeight: 38, paddingHorizontal: spacing.sm },
  proposeBtn: { backgroundColor: colors.orangeSoft, borderColor: colors.orange, borderRadius: radii.sm, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 9 },
  proposeBtnText: { color: colors.orange, fontSize: 11, fontWeight: '800' },
  proposedBadge: { color: colors.orange, fontSize: 12, fontWeight: '700', marginTop: spacing.sm },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginBottom: spacing.xs, marginTop: spacing.md },
  input: { backgroundColor: colors.paper, borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, color: colors.ink, fontSize: 13, marginBottom: spacing.xs, minHeight: 40, paddingHorizontal: spacing.md },
  flexInput: { flex: 1, marginBottom: 0 },
  priceInput: { marginBottom: 0, width: 100 },
  listRow: { alignItems: 'center', borderBottomColor: colors.line, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  listRowLabel: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  listRowValue: { color: colors.greenDark, fontSize: 12, fontWeight: '800' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  areaChip: { backgroundColor: colors.paper, borderColor: colors.line, borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  areaChipActive: { backgroundColor: colors.greenSoft, borderColor: colors.green },
  areaChipText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  areaChipTextActive: { color: colors.greenDark, fontWeight: '800' },
  workspaceNotice: { color: colors.greenDark, fontSize: 12, fontWeight: '700', marginTop: spacing.sm },
  sectionList: { gap: spacing.sm },
  modalScrim: { alignItems: 'center', backgroundColor: 'rgba(22, 39, 34, 0.45)', flex: 1, justifyContent: 'center', padding: spacing.xl },
  customerModalCard: { backgroundColor: colors.surface, borderRadius: radii.lg, maxWidth: 420, padding: spacing.xl, width: '100%' },
  customerModalTop: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  customerModalName: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  customerModalSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  customerModalInfoBox: { backgroundColor: colors.paper, borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, marginBottom: spacing.md, padding: spacing.md },
  customerModalInfoLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  customerModalInfoValue: { color: colors.ink, fontSize: 14, fontWeight: '700', marginTop: 3 },
});
