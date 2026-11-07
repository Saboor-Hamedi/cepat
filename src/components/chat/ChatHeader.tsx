import { router } from 'expo-router';
import { BadgeCheck, ChevronLeft, ChevronRight, MapPin } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import { fixtureTechnicians } from '../../data/fixtures';
import { formatRupiah } from '../../data/marketplaceRepository';
import { loadPostById, loadPosts } from '../../data/postsStore';
import { useLanguage } from '../../i18n/locale';
import { ICON_SIZE, ICON_STROKE } from '../../theme/icons';
import type { BookingRecord, Technician } from '../../types/marketplace';
import type { Post as PostType } from '../../types/post';
import { useMarketplaceStore } from '../../utils/useMarketplaceStore';
import { Avatar } from '../marketplace-ui';
import { ChatDropdown } from './ChatDropdown';
import { createChatHeaderStyles } from './css/chatStyles';

const SUCCESS = '#22C55E';

export interface ChatHeaderProps {
  booking: BookingRecord;
  partnerName: string;
  partnerRoleLabel: string;
  partnerAvatarUri?: string;
  onBack: () => void;
  onClearHistory: () => void;
}

export function ChatHeader({
  booking,
  partnerName,
  partnerRoleLabel,
  partnerAvatarUri,
  onBack,
  onClearHistory,
}: ChatHeaderProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();
  const styles = useMemo(() => createChatHeaderStyles(palette), [palette]);
  const isVerifiedPartner = /verified|terverifikasi/i.test(partnerRoleLabel);
  const isCompleted = booking.status === 'completed';
  const accentColor = isCompleted ? SUCCESS : palette.primary;

  const storePostById = useMarketplaceStore((s) => s.postById);
  const storePosts = useMarketplaceStore((s) => s.posts);
  const storeTech = useMarketplaceStore((s) => s.technicianById[booking.technicianUserId]);

  const [fetchedPost, setFetchedPost] = useState<PostType | null>(null);

  const matchedPost = useMemo<PostType | null>(() => {
    if (booking.postId && storePostById[booking.postId]) {
      return storePostById[booking.postId];
    }
    if (fetchedPost) {
      return fetchedPost;
    }
    const techPosts = storePosts.filter((p) => p.technicianId === booking.technicianUserId);
    if (techPosts.length > 0) {
      return techPosts.find((p) => p.isServicePost) ?? techPosts[0];
    }
    return null;
  }, [booking.postId, booking.technicianUserId, fetchedPost, storePostById, storePosts]);

  useEffect(() => {
    let active = true;
    if (booking.postId) {
      void loadPostById(booking.postId).then((res) => {
        if (active && res) setFetchedPost(res);
      });
    } else if (booking.technicianUserId) {
      void loadPosts(booking.technicianUserId, false)
        .then((list) => {
          if (active && list.length > 0) {
            setFetchedPost(list.find((p) => p.isServicePost) ?? list[0]);
          }
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [booking.postId, booking.technicianUserId]);

  const postThumbnailUri: string = useMemo(() => {
    const postImage = matchedPost?.mediaUrls?.[0] || matchedPost?.imageUri;
    if (postImage && typeof postImage === 'string') {
      return postImage;
    }
    const tech =
      storeTech ??
      fixtureTechnicians.find((t: Technician) => t.id === booking.technicianUserId);
    const svc = tech?.services.find(
      (s) =>
        s.id === booking.technicianServiceId ||
        s.id === booking.serviceId ||
        s.name === booking.serviceNameSnapshot,
    );
    if (svc && 'imageUri' in svc && typeof svc.imageUri === 'string' && svc.imageUri) {
      return svc.imageUri;
    }
    const portfolioImg = tech?.portfolio?.[0]?.imageUri;
    if (portfolioImg && typeof portfolioImg === 'string') return portfolioImg;
    if (tech?.avatarUri) return tech.avatarUri;
    const name = (booking.serviceNameSnapshot || '').toLowerCase();
    if (name.includes('ac') || name.includes('hvac') || name.includes('dingin')) {
      return 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300&auto=format&fit=crop&q=80';
    }
    if (name.includes('pipa') || name.includes('plumb') || name.includes('air') || name.includes('drain')) {
      return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=300&auto=format&fit=crop&q=80';
    }
    if (name.includes('listrik') || name.includes('electr')) {
      return 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=300&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&auto=format&fit=crop&q=80';
  }, [
    booking.serviceId,
    booking.serviceNameSnapshot,
    booking.technicianServiceId,
    booking.technicianUserId,
    matchedPost,
    storeTech,
  ]);

  const effectiveBookingPrice =
    booking.servicePrice ??
    booking.agreedPrice ??
    matchedPost?.servicePrice ??
    storeTech?.services?.find((s) => typeof s.startingPrice === 'number')?.startingPrice;

  const postSnippetTitle =
    matchedPost?.caption?.trim() ||
    matchedPost?.content?.trim() ||
    booking.serviceNameSnapshot;

  const handleOpenBookedPost = () => {
    if (booking.technicianUserId) {
      router.push({
        pathname: '/technician/[id]',
        params: {
          id: booking.technicianUserId,
          ...(booking.postId ? { postId: booking.postId } : {}),
        },
      } as never);
    }
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.headerRow,
          {
            backgroundColor: palette.surface,
            borderBottomColor: palette.border,
          },
        ]}
      >
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          style={({ pressed }) => [
            styles.iconButton,
            {
              backgroundColor: 'transparent',
              opacity: pressed ? 0.6 : 1,
            },
          ]}
          testID="chat-standalone-back-btn"
        >
          <ChevronLeft
            color={palette.text}
            size={ICON_SIZE}
            strokeWidth={ICON_STROKE}
          />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={partnerName}
          onPress={handleOpenBookedPost}
          style={({ pressed }) => [
            styles.partnerInfoRow,
            pressed && { opacity: 0.75 },
          ]}
          testID="chat-partner-profile-link"
        >
          <View style={styles.avatarWrap}>
            <Avatar name={partnerName} size={40} uri={partnerAvatarUri} />
          </View>
          <View style={styles.partnerTextGroup}>
            <View style={styles.nameLine}>
              <Text
                numberOfLines={1}
                style={[styles.partnerName, { color: palette.text }]}
              >
                {partnerName}
              </Text>
              {(isVerifiedPartner || Boolean(storeTech?.verified)) && (
                <BadgeCheck
                  color={palette.primary}
                  size={ICON_SIZE + 2}
                  strokeWidth={ICON_STROKE}
                />
              )}
            </View>
            <View style={styles.statusRow}>
              <View
                style={[styles.statusDot, { backgroundColor: SUCCESS }]}
              />
              <Text
                numberOfLines={1}
                style={[styles.partnerStatus, { color: palette.textMuted }]}
              >
                {language === 'en' ? 'Active now' : 'Aktif sekarang'}
                {isVerifiedPartner ? '' : ` · ${partnerRoleLabel}`}
              </Text>
            </View>
          </View>
        </Pressable>

        <ChatDropdown
          bookingId={booking.id}
          onClearHistory={onClearHistory}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          language === 'en'
            ? `View booked post: ${booking.serviceNameSnapshot}`
            : `Lihat postingan dipesan: ${booking.serviceNameSnapshot}`
        }
        onPress={handleOpenBookedPost}
        style={({ pressed }) => [
          styles.pinnedCard,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            opacity: pressed ? 0.82 : 1,
          },
        ]}
        testID="chat-pinned-task-snippet"
      >
        <Image
          source={{ uri: postThumbnailUri }}
          style={styles.pinnedThumb}
          resizeMode="cover"
        />
        <View style={styles.pinnedDetails}>
          <View style={styles.pinnedTopRow}>
            <View
              style={[
                styles.pinnedBadge,
                { backgroundColor: palette.primarySoft },
              ]}
            >
              <Text style={[styles.pinnedBadgeText, { color: accentColor }]}>
                {language === 'en' ? 'Booked Service' : 'Layanan Dipesan'}
              </Text>
            </View>
            <Text style={[styles.pinnedPrice, { color: palette.primary }]}>
              {typeof effectiveBookingPrice === 'number' && effectiveBookingPrice > 0
                ? formatRupiah(effectiveBookingPrice, language)
                : '—'}
            </Text>
          </View>

          <Text
            numberOfLines={1}
            style={[styles.pinnedServiceTitle, { color: palette.text }]}
          >
            {postSnippetTitle}
          </Text>

          <View style={styles.pinnedMeta}>
            <View style={styles.pinnedAddressRow}>
              <MapPin color={palette.textMuted} size={13} strokeWidth={ICON_STROKE} />
              <Text
                numberOfLines={1}
                style={[styles.pinnedAddress, { color: palette.textMuted }]}
              >
                {booking.customerAddress ||
                  matchedPost?.serviceArea ||
                  (language === 'en' ? 'Tap to view post & technician' : 'Ketuk untuk lihat postingan')}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.pinnedChevronWrap,
            { backgroundColor: palette.surfaceElevated },
          ]}
        >
          <ChevronRight
            color={palette.textMuted}
            size={16}
            strokeWidth={ICON_STROKE}
          />
        </View>
      </Pressable>
    </View>
  );
}
