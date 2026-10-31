import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  EmptyState,
  LoadingState,
  PrimaryButton,
  Rating,
  ServiceCategoryGlyph,
} from '../../components/marketplace-ui';
import {
  pickImageSafely,
  PortfolioPhoto,
  ProfileAvatar,
  SectionHeader,
} from '../../profile';
import {
  TechnicianPostCard,
  TechnicianPostComposer,
} from '../../components/TechnicianPostCard';
import { formatRupiah, loadTechnician } from '../../data/marketplaceRepository';
import {
  submitTechnicianReport,
} from '../../data/marketplaceStore';
import {
  createTechnicianPost,
  deleteTechnicianPost,
  loadTechnicianPosts,
  suspendTechnicianPost,
  updateTechnicianPost,
} from '../../data/postsStore';
import { categoryName, localizeArea, useLanguage } from '../../i18n/locale';
import { useAppearance } from '../../context/AppearanceContext';
import { useAuth } from '../../auth/AuthProvider';
import type {
  DataSource,
  PortfolioItem,
  Technician,
  TechnicianPost,
  TechnicianReport,
} from '../../types/marketplace';
import { colors, getProfileTheme, radii, spacing } from '../../theme/tokens';

const WEEKDAY_NAMES_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const WEEKDAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TechnicianProfileScreen() {
  const { language, t } = useLanguage();
  const { user, roles, effectiveRole, updateUserProfile } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loadedTechnician, setLoadedTechnician] = useState<Technician | null>(null);
  const [posts, setPosts] = useState<TechnicianPost[]>([]);
  const [coverUri, setCoverUri] = useState<string | undefined>(undefined);
  const [source, setSource] = useState<DataSource>('fixtures');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [expandedPortfolio, setExpandedPortfolio] = useState<PortfolioItem | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportCategory, setReportCategory] = useState<TechnicianReport['category']>('quality');
  const [reportDescription, setReportDescription] = useState('');
  const [reportStatusNote, setReportStatusNote] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      loadTechnician(id),
      id ? loadTechnicianPosts(id, false) : Promise.resolve([]),
    ])
      .then(([result, publishedPosts]) => {
        if (!active) return;
        setLoadedTechnician(result.item);
        setSource(result.source);
        setPosts(publishedPosts);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, retryKey, user?.id]);

  useEffect(() => {
    const targetId = id || user?.id;
    if (targetId) {
      void AsyncStorage.getItem(`@cepat_cover_${targetId}`).then((saved) => {
        if (saved) setCoverUri(saved);
      });
    }
  }, [id, user?.id]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const handleSubmitReport = async () => {
    if (!technician) return;
    setReportError(null);
    setReportStatusNote(null);
    try {
      await submitTechnicianReport({
        reporterUserId: user?.id,
        reportedTechnicianId: technician.id,
        technicianName: technician.displayName,
        category: reportCategory,
        description: reportDescription,
      });
      setReportDescription('');
      setReportStatusNote(t('profile.reportSuccess'));
    } catch {
      setReportError(t('profile.reportPlaceholder'));
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['top', 'bottom']}>
        <LoadingState label={t('profile.loading')} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Header onBack={goBack} />
        <EmptyState
          title={t('profile.loadErrorTitle')}
          description={t('profile.loadError')}
          actionLabel={t('home.retry')}
          onAction={() => {
            setLoading(true);
            setError(false);
            setRetryKey((key) => key + 1);
          }}
        />
      </SafeAreaView>
    );
  }

  const isAdminUser = roles.includes('admin') || effectiveRole === 'admin';
  const isTechnicianUser = roles.includes('technician') || effectiveRole === 'technician';
  const isProfileOwner =
    Boolean(user) &&
    (user?.id === id ||
      (loadedTechnician && user?.id === loadedTechnician.id) ||
      (isTechnicianUser && id === 'demo-rizky') ||
      (!isTechnicianUser && id === 'demo-customer'));

  const rawTechnician: Technician | null =
    loadedTechnician ??
    (user && (user.id === id || id === 'demo-customer' || !id)
      ? {
          id: id || user.id,
          displayName:
            (typeof user.user_metadata?.display_name === 'string' &&
              user.user_metadata.display_name.trim()) ||
            user.email?.split('@')[0] ||
            'Pelanggan Cepat',
          avatarUri:
            typeof user.user_metadata?.avatar_url === 'string'
              ? user.user_metadata.avatar_url
              : undefined,
          verified: isAdminUser,
          available: true,
          services: [],
          portfolio: [],
          reviews: [],
          averageRating: 5,
          reviewCount: 0,
          completedJobsCount: 0,
          serviceAreas: ['Jakarta Selatan'],
          availabilitySchedule: [],
          headline: isAdminUser
            ? (language === 'en' ? 'Cepat Administrator' : 'Administrator Cepat')
            : (language === 'en' ? 'Cepat Community Member' : 'Anggota Komunitas Cepat'),
          bio: isAdminUser
            ? (language === 'en' ? 'Platform Administrator.' : 'Administrator Platform.')
            : (language === 'en' ? 'Customer on Cepat.' : 'Pelanggan di Cepat.'),
          theme: 'sand',
        }
      : null);

  const technician: Technician | null = rawTechnician
    ? {
        ...rawTechnician,
        avatarUri:
          (isProfileOwner && user?.user_metadata?.avatar_url)
            ? user.user_metadata.avatar_url
            : rawTechnician.avatarUri,
      }
    : null;

  const handleAvatarSelected = async (newUri: string) => {
    setLoadedTechnician((prev) => (prev ? { ...prev, avatarUri: newUri } : prev));
    setPosts((prevPosts) =>
      prevPosts.map((p) => ({ ...p, technicianAvatarUri: newUri })),
    );
    if (isProfileOwner) {
      await updateUserProfile({ avatarUrl: newUri });
      if (user) {
        try {
          await AsyncStorage.setItem(`@cepat_avatar_${user.id}`, newUri);
        } catch {}
      }
    }
  };

  const handleChangeCover = async () => {
    try {
      const picked = await pickImageSafely('gallery');
      if (picked?.uri) {
        setCoverUri(picked.uri);
        const targetId = id || user?.id;
        if (targetId) {
          await AsyncStorage.setItem(`@cepat_cover_${targetId}`, picked.uri);
        }
      }
    } catch {}
  };

  if (!technician) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Header onBack={goBack} />
        <EmptyState
          title={t('profile.notFoundTitle')}
          description={t('profile.notFound')}
          actionLabel={t('profile.back')}
          onAction={goBack}
        />
      </SafeAreaView>
    );
  }

  const theme = getProfileTheme(technician.theme);
  const startingPrice = firstPrice(technician.services);
  const headline =
    language === 'en' ? technician.headlineEn || technician.headline : technician.headline;
  const bio = language === 'en' ? technician.bioEn || technician.bio : technician.bio;
  const weekdayNames = language === 'en' ? WEEKDAY_NAMES_EN : WEEKDAY_NAMES_ID;
  const canPost = isProfileOwner && (isTechnicianUser || isAdminUser);
  const canDeletePost = isProfileOwner || isAdminUser;

  const handleCreatePost = async (input: {
    caption: string;
    imageUri?: string;
    mediaUrls?: string[];
  }) => {
    const ownerId = user?.id || technician.id;
    await createTechnicianPost({
      actorUserId: ownerId,
      technicianId: ownerId,
      technicianName: technician.displayName,
      technicianBusinessName: technician.businessName,
      technicianAvatarUri: technician.avatarUri,
      technicianVerified: isAdminUser || technician.verified,
      caption: input.caption,
      imageUri: input.imageUri,
      mediaUrls: input.mediaUrls,
      serviceArea: technician.serviceAreas[0] ?? 'Semua area',
      categorySlug: technician.services[0]?.categorySlug ?? 'general',
      published: true,
    });
    const nextPosts = await loadTechnicianPosts(ownerId, isProfileOwner);
    setPosts(nextPosts);
  };

  const handleDeletePost = async (postId: string) => {
    const ownerId = user?.id || technician.id;
    await deleteTechnicianPost({ actorUserId: ownerId, postId });
    const nextPosts = await loadTechnicianPosts(technician.id, isProfileOwner);
    setPosts(nextPosts);
  };

  const handleEditPost = async (
    post: TechnicianPost,
    newCaption: string,
    newImageUri?: string,
  ) => {
    const ownerId = user?.id || technician.id;
    await updateTechnicianPost({
      actorUserId: ownerId,
      postId: post.id,
      caption: newCaption,
      imageUri: newImageUri,
    });
    const nextPosts = await loadTechnicianPosts(technician.id, isProfileOwner);
    setPosts(nextPosts);
  };

  const handleSuspendPost = async (postId: string, suspended: boolean) => {
    const actorId = user?.id || 'admin';
    await suspendTechnicianPost({
      actorUserId: actorId,
      postId,
      suspended,
    });
    const nextPosts = await loadTechnicianPosts(technician.id, isProfileOwner);
    setPosts(nextPosts);
  };

  const navigateToBooking = (selectedServiceId?: string) => {
    if (isProfileOwner) return;
    if (!user) {
      router.push({
        pathname: '/login',
        params: {
          redirect: `/booking/${technician.id}`,
          technicianId: technician.id,
        },
      });
      return;
    }
    router.push({
      pathname: '/booking/[id]',
      params: {
        id: technician.id,
        ...(selectedServiceId ? { serviceId: selectedServiceId } : {}),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Header onBack={goBack} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Twitter / Facebook Style Profile Card with Cover Banner */}
        <View style={[styles.profileHero, { backgroundColor: theme.background }]}>
          <View style={styles.coverContainer}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.coverImage} resizeMode="cover" />
            ) : (
              <View style={[styles.coverFallback, { backgroundColor: theme.accent || colors.greenDark }]} />
            )}
            {isProfileOwner && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={language === 'en' ? 'Change cover photo' : 'Ubah foto sampul'}
                onPress={handleChangeCover}
                style={styles.changeCoverBtn}
                testID="change-cover-btn"
              >
                <Text style={styles.changeCoverText}>📷 {language === 'en' ? 'Edit Cover' : 'Ubah Sampul'}</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.profileHeroInner}>
            <View style={styles.profileTopRow}>
              <View style={styles.avatarWrapper}>
                <ProfileAvatar
                  uri={technician.avatarUri}
                  name={technician.displayName}
                  size={88}
                  editable={isProfileOwner}
                  onImageSelected={handleAvatarSelected}
                  testID="technician-profile-avatar"
                />
              </View>
              <View style={styles.profileIdentity}>
                <View style={styles.nameLine}>
                  <Text style={styles.profileName}>{technician.displayName}</Text>
                  {technician.verified ? (
                    <View style={styles.verifiedTag}>
                      <Text style={styles.verifiedTagText}>{t('profile.verified')}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.profileHandle}>
                  {technician.displayName.toLowerCase().replace(/[^a-z0-9]/g, '')}
                </Text>
                {technician.businessName &&
                  technician.businessName !== technician.displayName && (
                    <Text style={styles.businessName}>{technician.businessName}</Text>
                  )}
                <Text style={[styles.profileHeadline, { color: theme.accent }]}>
                  {headline || t('technician.serviceFallback')}
                </Text>
              </View>
            </View>

            <View style={styles.statsBar}>
              <View style={styles.statCell}>
                <Text style={styles.statValue}>
                  {posts.length} {language === 'en' ? 'Posts' : 'Postingan'}
                </Text>
              </View>
              <View style={styles.statCell}>
                <Rating value={technician.averageRating} count={technician.reviewCount} />
              </View>
              {technician.completedJobsCount > 0 && (
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>
                    {t('profile.completedJobs', { count: technician.completedJobsCount })}
                  </Text>
                </View>
              )}
            </View>

            {technician.services.length > 0 && (
              <View style={styles.availabilityLine}>
                <View
                  style={[
                    styles.availabilityDot,
                    { backgroundColor: technician.available ? colors.green : colors.muted },
                  ]}
                />
                <Text style={styles.availabilityText}>
                  {technician.available ? t('profile.accepting') : t('profile.unavailable')}
                </Text>
              </View>
            )}
            {isProfileOwner && (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push(
                    isAdminUser
                      ? '/admin'
                      : isTechnicianUser
                        ? '/technician-dashboard'
                        : '/account',
                  )
                }
                style={styles.ownerEditBtn}
                testID="owner-edit-profile-btn"
              >
                <Text style={styles.ownerEditBtnText}>
                  {isAdminUser
                    ? language === 'en'
                      ? 'Admin Console'
                      : 'Konsol Admin'
                    : isTechnicianUser
                      ? language === 'en'
                        ? 'Manage Jobs'
                        : 'Kelola Pekerjaan'
                      : language === 'en'
                        ? 'Account Settings'
                        : 'Pengaturan Akun'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.contentWidth}>

          <View testID="technician-public-posts">
            {/* Inline Twitter / X style Composer: visible to owner when technician or admin */}
            {canPost && (
              <TechnicianPostComposer
                onCreatePost={handleCreatePost}
                technicianProfile={{
                  id: technician.id,
                  displayName: technician.displayName,
                  avatarUri: technician.avatarUri,
                }}
              />
            )}

            {posts.length > 0 && (
              <>
                <SectionHeader
                  eyebrow={language === 'en' ? 'RECENT WORK UPDATES' : 'UPDATE PEKERJAAN TERBARU'}
                  title={language === 'en' ? 'Posts' : 'Postingan'}
                  trailing={`${posts.length}`}
                />
                {posts.map((post) => (
                  <TechnicianPostCard
                    key={post.id}
                    post={post}
                    showAuthorHeader={false}
                    isOwner={isProfileOwner}
                    isAdmin={isAdminUser}
                    onEdit={handleEditPost}
                    onDelete={handleDeletePost}
                    onSuspend={handleSuspendPost}
                  />
                ))}
              </>
            )}
          </View>

          <SectionHeader eyebrow={t('profile.aboutEyebrow')} title={t('profile.aboutTitle')} />
          <Text style={styles.bio}>
            {bio || t('profile.fallbackBio', { name: technician.displayName })}
          </Text>

          <SectionHeader
            eyebrow={t('profile.servicesEyebrow')}
            title={t('profile.servicesTitle')}
            trailing={t('profile.serviceCount', { count: technician.services.length })}
          />
          {technician.services.length ? (
            technician.services.map((service) => {
              const serviceDisplayName =
                language === 'en' ? service.nameEn || service.name : service.name;
              const serviceDesc =
                language === 'en'
                  ? service.descriptionEn || service.description
                  : service.description;

              return (
                <View key={service.id} style={styles.serviceCard}>
                  <View style={styles.serviceRow}>
                    <ServiceCategoryGlyph iconKey={service.categorySlug} size={42} />
                    <View style={styles.serviceCopy}>
                      <Text style={styles.serviceName}>{serviceDisplayName}</Text>
                      <Text style={styles.serviceCategory}>
                        {categoryName(
                          service.categorySlug,
                          language === 'en'
                            ? service.categoryNameEn || service.categoryName
                            : service.categoryName,
                          t,
                        )}
                      </Text>
                      {serviceDesc && <Text style={styles.serviceDescription}>{serviceDesc}</Text>}
                      {service.estimatedDurationMinutes !== undefined && (
                        <Text style={styles.serviceDuration}>
                          {t('profile.duration', { minutes: service.estimatedDurationMinutes })}
                        </Text>
                      )}
                    </View>
                    <View style={styles.serviceRight}>
                      {service.startingPrice !== undefined && (
                        <Text style={styles.servicePrice}>
                          {t('profile.startingPrice', {
                            price: formatRupiah(service.startingPrice, language),
                          })}
                        </Text>
                      )}
                      {!isProfileOwner ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => navigateToBooking(service.id)}
                          style={styles.serviceSelectBtn}
                          testID={`select-service-${service.id}`}
                        >
                          <Text style={styles.serviceSelectBtnText}>
                            {t('profile.selectServiceAction')}
                          </Text>
                        </Pressable>
                      ) : (
                        <View style={styles.serviceOwnerTag}>
                          <Text style={styles.serviceOwnerTagText}>
                            {language === 'en' ? 'Offered' : 'Ditawarkan'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.sectionEmpty}>{t('profile.noServices')}</Text>
          )}

          <SectionHeader eyebrow={t('profile.areasEyebrow')} title={t('profile.areasTitle')} />
          {technician.serviceAreas.length ? (
            <View style={styles.areaList}>
              {technician.serviceAreas.map((area) => (
                <View key={area} style={styles.areaChip}>
                  <View style={styles.areaPinDot} />
                  <Text style={styles.areaText}>{localizeArea(area, language)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.sectionEmpty}>{t('profile.noAreas')}</Text>
          )}

          {technician.availabilitySchedule && technician.availabilitySchedule.length > 0 && (
            <>
              <SectionHeader
                eyebrow={t('profile.scheduleEyebrow')}
                title={t('profile.scheduleTitle')}
              />
              <View style={styles.scheduleCard}>
                {technician.availabilitySchedule.map((slot) => (
                  <View key={slot.weekday} style={styles.scheduleRow}>
                    <Text style={styles.scheduleDay}>{weekdayNames[slot.weekday] ?? ''}</Text>
                    <Text
                      style={[
                        styles.scheduleHours,
                        !slot.isAvailable && styles.scheduleHoursClosed,
                      ]}
                    >
                      {slot.isAvailable
                        ? `${slot.startTime} – ${slot.endTime} WIB`
                        : t('profile.closedDay')}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <SectionHeader
            eyebrow={t('profile.portfolioEyebrow')}
            title={t('profile.portfolioTitle')}
            trailing={t('profile.portfolioCount', { count: technician.portfolio.length })}
          />
          {technician.portfolio.length ? (
            <View style={styles.portfolioGrid}>
              {technician.portfolio.map((item, index) => {
                const title = language === 'en' ? item.titleEn || item.title : item.title;
                const desc =
                  language === 'en'
                    ? item.descriptionEn || item.description
                    : item.description;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    onPress={() => setExpandedPortfolio(item)}
                    style={styles.portfolioCard}
                    testID={`portfolio-item-${item.id}`}
                  >
                    <PortfolioPhoto
                      uri={item.imageUri}
                      title={title}
                      tint={index % 2 === 0 ? '#E8EFE8' : '#F2E7DF'}
                      fallbackLabel={t('profile.portfolioPhoto')}
                    />
                    <Text numberOfLines={2} style={styles.portfolioTitle}>
                      {title}
                    </Text>
                    {desc && (
                      <Text numberOfLines={2} style={styles.portfolioDescription}>
                        {desc}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={styles.sectionEmpty}>{t('profile.noPortfolio')}</Text>
          )}

          <SectionHeader
            eyebrow={t('profile.reviewsEyebrow')}
            title={t('profile.reviewsTitle')}
            trailing={
              technician.reviewCount
                ? t('profile.reviewCount', { count: technician.reviewCount })
                : undefined
            }
          />
          {technician.reviews.length ? (
            technician.reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  <Text style={styles.reviewerName}>{review.customerName}</Text>
                  <View style={styles.reviewRating}>
                    <Text style={styles.star}>★</Text>
                    <Text style={styles.reviewRatingText}>{review.rating.toFixed(1)}</Text>
                  </View>
                </View>
                {(language === 'en' ? review.commentEn || review.comment : review.comment) && (
                  <Text style={styles.reviewComment}>
                    {language === 'en' ? review.commentEn || review.comment : review.comment}
                  </Text>
                )}
                {review.createdAt && (
                  <Text style={styles.reviewDate}>{formatDate(review.createdAt, language)}</Text>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.sectionEmpty}>{t('profile.noReviews')}</Text>
          )}

          {!isProfileOwner && (
            <View style={styles.reportBar}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setReportStatusNote(null);
                  setReportError(null);
                  setReportModalVisible(true);
                }}
                style={styles.reportButton}
                testID="report-technician-button"
              >
                <Text style={styles.reportButtonText}>{t('profile.reportTechnician')}</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.profileFooterSpace} />
        </View>
      </ScrollView>

      {!isProfileOwner && technician.services.length > 0 && (
        <View style={styles.bookingFooter}>
          <View style={styles.footerPrice}>
            <Text style={styles.footerPriceLabel}>{t('profile.priceLabel')}</Text>
            <Text style={styles.footerPriceValue}>
              {startingPrice !== undefined
                ? t('profile.startingPrice', { price: formatRupiah(startingPrice, language) })
                : t('profile.discussPrice')}
            </Text>
          </View>
          <View style={styles.bookButtonWrap}>
            <PrimaryButton
              label={t('profile.bookNow')}
              testID="book-now"
              onPress={() => navigateToBooking()}
            />
          </View>
        </View>
      )}

      <Modal
        animationType="fade"
        onRequestClose={() => setExpandedPortfolio(null)}
        transparent
        visible={Boolean(expandedPortfolio)}
      >
        <Pressable style={styles.modalScrim} onPress={() => setExpandedPortfolio(null)}>
          {expandedPortfolio && (
            <Pressable style={styles.portfolioModalCard} onPress={(e) => e.stopPropagation()}>
              <PortfolioPhoto
                uri={expandedPortfolio.imageUri}
                title={
                  language === 'en'
                    ? expandedPortfolio.titleEn || expandedPortfolio.title
                    : expandedPortfolio.title
                }
                tint="#E8EFE8"
                fallbackLabel={t('profile.portfolioPhoto')}
                large
              />
              <Text style={styles.portfolioModalTitle}>
                {language === 'en'
                  ? expandedPortfolio.titleEn || expandedPortfolio.title
                  : expandedPortfolio.title}
              </Text>
              {(language === 'en'
                ? expandedPortfolio.descriptionEn || expandedPortfolio.description
                : expandedPortfolio.description) && (
                <Text style={styles.portfolioModalDesc}>
                  {language === 'en'
                    ? expandedPortfolio.descriptionEn || expandedPortfolio.description
                    : expandedPortfolio.description}
                </Text>
              )}
              <Pressable
                accessibilityRole="button"
                onPress={() => setExpandedPortfolio(null)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseBtnText}>{t('profile.back')}</Text>
              </Pressable>
            </Pressable>
          )}
        </Pressable>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setReportModalVisible(false)}
        transparent
        visible={reportModalVisible}
      >
        <Pressable style={styles.modalScrim} onPress={() => setReportModalVisible(false)}>
          <Pressable style={styles.reportModalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.reportModalTitle}>{t('profile.reportTitle')}</Text>
            <Text style={styles.reportModalSubtitle}>{t('profile.reportDescription')}</Text>

            <View style={styles.reportCategoryRow}>
              {(['quality', 'safety', 'off_platform', 'no_show'] as const).map((cat) => (
                <Pressable
                  key={cat}
                  accessibilityRole="button"
                  onPress={() => setReportCategory(cat)}
                  style={[
                    styles.reportCatChip,
                    reportCategory === cat && styles.reportCatChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.reportCatChipText,
                      reportCategory === cat && styles.reportCatChipTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              multiline
              onChangeText={setReportDescription}
              placeholder={t('profile.reportPlaceholder')}
              placeholderTextColor={colors.muted}
              style={styles.reportInput}
              testID="report-description-input"
              value={reportDescription}
            />

            {reportError && <Text style={styles.reportErrorText}>{reportError}</Text>}
            {reportStatusNote && <Text style={styles.reportSuccessText}>{reportStatusNote}</Text>}

            <View style={styles.reportActionsRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setReportModalVisible(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>{t('profile.back')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void handleSubmitReport();
                }}
                style={styles.reportSubmitBtn}
                testID="submit-report-button"
              >
                <Text style={styles.reportSubmitBtnText}>{t('profile.reportSubmit')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function Header({
  onBack,
}: {
  onBack: () => void;
}) {
  const { t } = useLanguage();
  return (
    <View style={styles.navHeader}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('profile.back')}
        onPress={onBack}
        style={styles.navBack}
      >
        <Text style={styles.navBackGlyph}>‹</Text>
      </Pressable>
      <View style={styles.navBalance} />
    </View>
  );
}

function firstPrice(services: Technician['services']): number | undefined {
  return services
    .map((service) => service.startingPrice)
    .filter((price): price is number => price !== undefined)
    .sort((a, b) => a - b)[0];
}

function formatDate(value: string, language: 'id' | 'en'): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'id' ? 'id-ID' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.paper, flex: 1 },
  centered: { alignItems: 'center', backgroundColor: colors.paper, flex: 1, justifyContent: 'center' },
  navHeader: { alignItems: 'center', backgroundColor: colors.paper, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  navBack: { alignItems: 'center', height: 42, justifyContent: 'center', width: 42 },
  navBackGlyph: { color: colors.ink, fontSize: 34, lineHeight: 38 },
  navBalance: { width: 42 },
  scrollContent: { paddingBottom: 120 },
  contentWidth: { alignSelf: 'center', maxWidth: 820, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, width: '100%' },
  profileHero: { borderRadius: 0, width: '100%' },
  coverContainer: { height: 140, position: 'relative', width: '100%' },
  coverImage: { height: 140, width: '100%' },
  coverFallback: { height: 140, width: '100%', opacity: 0.85 },
  changeCoverBtn: { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 6, position: 'absolute', right: 16, top: 16 },
  changeCoverText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  avatarWrapper: { marginTop: -32, borderWidth: 3, borderColor: '#fff', borderRadius: 48 },
  profileHeroInner: { alignSelf: 'center', maxWidth: 820, paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, paddingTop: spacing.sm, width: '100%' },
  profileTopRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg },
  profileIdentity: { flex: 1, minWidth: 0 },
  nameLine: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  profileName: { color: colors.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  verifiedTag: { backgroundColor: '#fff', borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 4 },
  verifiedTagText: { color: colors.greenDark, fontSize: 10, fontWeight: '800' },
  profileHandle: { color: colors.muted, fontSize: 13, fontWeight: '600', marginTop: 1 },
  businessName: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 3 },
  profileHeadline: { fontSize: 13, fontWeight: '700', lineHeight: 18, marginTop: 5 },
  statsBar: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.68)', borderRadius: radii.md, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  statCell: { flexDirection: 'row', alignItems: 'center' },
  statValue: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  availabilityLine: { alignItems: 'center', flexDirection: 'row', gap: 7, marginTop: spacing.md },
  availabilityDot: { borderRadius: 4, height: 8, width: 8 },
  availabilityText: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  ownerEditBtn: { alignItems: 'center', backgroundColor: colors.greenDark, borderRadius: radii.pill, marginTop: spacing.md, paddingVertical: 10 },
  ownerEditBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  bio: { color: '#4B5B55', fontSize: 14, lineHeight: 22 },
  serviceCard: { backgroundColor: '#fff', borderColor: colors.line, borderRadius: radii.md, borderWidth: 1, marginBottom: spacing.sm, padding: spacing.md },
  serviceRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  serviceCopy: { flex: 1, minWidth: 0 },
  serviceName: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  serviceCategory: { color: colors.greenDark, fontSize: 11, fontWeight: '600', marginTop: 2 },
  serviceDescription: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  serviceDuration: { color: colors.muted, fontSize: 11, marginTop: 4 },
  serviceRight: { alignItems: 'flex-end', gap: 6 },
  servicePrice: { color: colors.greenDark, fontSize: 12, fontWeight: '800', textAlign: 'right' },
  serviceSelectBtn: { backgroundColor: colors.greenSoft, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 5 },
  serviceSelectBtnText: { color: colors.greenDark, fontSize: 11, fontWeight: '800' },
  serviceOwnerTag: { backgroundColor: colors.paper, borderColor: colors.line, borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  serviceOwnerTagText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  sectionEmpty: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  areaList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  areaChip: { alignItems: 'center', backgroundColor: colors.greenSoft, borderRadius: radii.pill, flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  areaPinDot: { backgroundColor: colors.greenDark, borderRadius: 3.5, height: 7, width: 7 },
  areaText: { color: colors.greenDark, fontSize: 12, fontWeight: '700' },
  scheduleCard: { backgroundColor: '#FFFFFF', borderColor: colors.line, borderRadius: radii.md, borderWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  scheduleRow: { alignItems: 'center', borderBottomColor: '#F1F2EC', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9 },
  scheduleDay: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  scheduleHours: { color: colors.greenDark, fontSize: 12, fontWeight: '700' },
  scheduleHoursClosed: { color: colors.muted, fontWeight: '500' },
  portfolioGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  portfolioCard: { marginBottom: spacing.md, paddingHorizontal: 6, width: '50%' },
  portfolioTitle: { color: colors.ink, fontSize: 13, fontWeight: '700', marginTop: 8 },
  portfolioDescription: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  reviewCard: { backgroundColor: '#fff', borderColor: colors.line, borderRadius: radii.md, borderWidth: 1, marginBottom: spacing.sm, padding: spacing.lg },
  reviewTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  reviewerName: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  reviewRating: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  star: { color: '#DCA63C', fontSize: 14 },
  reviewRatingText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  reviewComment: { color: '#53615C', fontSize: 12, lineHeight: 19, marginTop: spacing.md },
  reviewDate: { color: colors.muted, fontSize: 10, marginTop: spacing.sm },
  reportBar: { alignItems: 'flex-start', marginTop: spacing.xl },
  reportButton: { borderColor: colors.line, borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 8 },
  reportButtonText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  profileFooterSpace: { height: 16 },
  bookingFooter: { alignItems: 'center', backgroundColor: '#fff', borderTopColor: colors.line, borderTopWidth: 1, flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  footerPrice: { flex: 1, minWidth: 0 },
  footerPriceLabel: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  footerPriceValue: { color: colors.ink, fontSize: 13, fontWeight: '800', marginTop: 3 },
  bookButtonWrap: { width: 165 },
  modalScrim: { alignItems: 'center', backgroundColor: 'rgba(22, 39, 34, 0.45)', flex: 1, justifyContent: 'center', padding: spacing.xl },
  portfolioModalCard: { backgroundColor: colors.surface, borderRadius: radii.lg, maxWidth: 480, padding: spacing.lg, width: '100%' },
  portfolioModalTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', marginTop: spacing.md },
  portfolioModalDesc: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
  modalCloseBtn: { alignItems: 'center', backgroundColor: colors.greenSoft, borderRadius: radii.sm, marginTop: spacing.lg, paddingVertical: 11 },
  modalCloseBtnText: { color: colors.greenDark, fontSize: 13, fontWeight: '800' },
  reportModalCard: { backgroundColor: colors.surface, borderRadius: radii.lg, maxWidth: 480, padding: spacing.xl, width: '100%' },
  reportModalTitle: { color: colors.ink, fontSize: 19, fontWeight: '800' },
  reportModalSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  reportCategoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginVertical: spacing.md },
  reportCatChip: { backgroundColor: colors.paper, borderColor: colors.line, borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  reportCatChipSelected: { backgroundColor: colors.orangeSoft, borderColor: colors.orange },
  reportCatChipText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  reportCatChipTextSelected: { color: colors.orange, fontWeight: '800' },
  reportInput: { backgroundColor: colors.paper, borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, color: colors.ink, fontSize: 13, minHeight: 88, padding: spacing.md, textAlignVertical: 'top' },
  reportErrorText: { color: colors.danger, fontSize: 12, marginTop: spacing.sm },
  reportSuccessText: { color: colors.greenDark, fontSize: 12, fontWeight: '700', marginTop: spacing.sm },
  reportActionsRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end', marginTop: spacing.lg },
  modalCancelBtn: { borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  modalCancelBtnText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  reportSubmitBtn: { backgroundColor: colors.danger, borderRadius: radii.sm, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  reportSubmitBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
