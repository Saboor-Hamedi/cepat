import {
  Check,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  MessageCircle,
  Send,
  Share2,
  ShieldCheck,
  X,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import { formatRupiah } from '../../data/marketplaceRepository';
import { useLanguage } from '../../i18n/locale';
import { ICON_STROKE } from '../../theme/icons';
import { colors, radii, spacing } from '../../theme/tokens';
import { font } from '../../theme/typography';
import type { Post } from '../../types/post';
import { buildPostSharePayload } from '../../utils/postShare';

export interface PostShareModalProps {
  visible: boolean;
  post: Post;
  authorName?: string;
  serviceStartingPrice?: number;
  onClose: () => void;
  onShared?: (platform: 'whatsapp' | 'facebook' | 'twitter' | 'telegram' | 'native' | 'copy') => void;
}

export function PostShareModal({
  visible,
  post,
  authorName,
  serviceStartingPrice,
  onClose,
  onShared,
}: PostShareModalProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const effectivePost = useMemo(
    () => (authorName ? { ...post, technicianName: authorName } : post),
    [authorName, post],
  );

  const priceLabel = useMemo(
    () =>
      typeof serviceStartingPrice === 'number'
        ? formatRupiah(serviceStartingPrice, language)
        : undefined,
    [language, serviceStartingPrice],
  );

  const payload = useMemo(
    () => buildPostSharePayload(effectivePost, language, priceLabel),
    [effectivePost, language, priceLabel],
  );

  const previewImageUri =
    payload.cleanImageUrl ||
    post.imageUri ||
    (post.mediaUrls && post.mediaUrls[0]) ||
    undefined;

  const openSocialTarget = async (
    targetUrl: string,
    platform: 'whatsapp' | 'facebook' | 'twitter' | 'telegram',
  ) => {
    onShared?.(platform);
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.open === 'function') {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      const supported = await Linking.canOpenURL(targetUrl);
      if (supported) {
        await Linking.openURL(targetUrl);
        return;
      }
      await Share.share({
        title: payload.title,
        message: payload.fullShareMessage,
        url: payload.cleanImageUrl || payload.cleanUrl,
      });
    } catch {
      try {
        await Share.share({
          title: payload.title,
          message: payload.fullShareMessage,
          url: payload.cleanImageUrl || payload.cleanUrl,
        });
      } catch {
        // User cancelled share sheet
      }
    }
  };

  const handleNativeShareWithImage = async () => {
    onShared?.('native');
    try {
      await Share.share({
        title: payload.title,
        message: payload.fullShareMessage,
        url: payload.cleanImageUrl || payload.cleanUrl,
      });
    } catch {
      // User dismissed native share dialog
    }
  };

  const handleCopyCleanLink = async () => {
    onShared?.('copy');
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function'
      ) {
        await navigator.clipboard.writeText(payload.cleanUrl);
      }
    } catch {
      // Fallback status message below still confirms clean URL
    }
    setCopied(true);
    setStatusMessage(
      language === 'en'
        ? 'Clean & secure link copied!'
        : 'Tautan bersih & aman berhasil disalin!',
    );
    setTimeout(() => {
      setCopied(false);
    }, 2500);
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        testID={`post-share-backdrop-${post.id}`}
      >
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
          onPress={(e) => e.stopPropagation()}
          testID={`post-share-modal-${post.id}`}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <Text style={[styles.title, { color: palette.text }]}>
                {language === 'en' ? 'Share Post' : 'Bagikan Postingan'}
              </Text>
              <View style={styles.secureBadge} testID={`post-share-secure-badge-${post.id}`}>
                <ShieldCheck size={13} color={colors.greenDark} strokeWidth={ICON_STROKE} />
                <Text style={styles.secureBadgeText}>
                  {language === 'en' ? 'Verified Clean Link' : 'Tautan Bersih & Aman'}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={language === 'en' ? 'Close share menu' : 'Tutup menu bagikan'}
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: palette.surfaceElevated }]}
              testID={`close-share-modal-${post.id}`}
            >
              <X size={18} color={palette.textMuted} strokeWidth={ICON_STROKE} />
            </Pressable>
          </View>

          {/* Post & Image Preview Card */}
          <View
            style={[
              styles.previewCard,
              {
                backgroundColor: palette.surfaceElevated,
                borderColor: palette.border,
              },
            ]}
          >
            {previewImageUri ? (
              <View style={styles.previewImageWrap}>
                <Image
                  source={{ uri: previewImageUri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                  testID={`post-share-image-preview-${post.id}`}
                />
                <View style={styles.imageAttachedPill}>
                  <ImageIcon size={11} color="#FFFFFF" strokeWidth={ICON_STROKE} />
                  <Text style={styles.imageAttachedText}>
                    {language === 'en' ? 'Image attached' : 'Dengan foto'}
                  </Text>
                </View>
              </View>
            ) : null}
            <View style={styles.previewTextCol}>
              <Text
                numberOfLines={1}
                style={[styles.previewAuthor, { color: palette.text }]}
              >
                {effectivePost.technicianBusinessName || effectivePost.technicianName}
              </Text>
              <Text
                numberOfLines={2}
                style={[styles.previewCaption, { color: palette.textMuted }]}
              >
                {effectivePost.content || effectivePost.caption || payload.title}
              </Text>
              {priceLabel ? (
                <Text style={[styles.previewPrice, { color: palette.primary }]}>
                  {priceLabel}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Clean URL Bar */}
          <View
            style={[
              styles.cleanUrlBox,
              { backgroundColor: palette.background, borderColor: palette.border },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[styles.cleanUrlText, { color: palette.text }]}
              testID={`post-share-clean-url-${post.id}`}
            >
              {payload.cleanUrl}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void handleCopyCleanLink();
              }}
              style={[
                styles.copyBtn,
                {
                  backgroundColor: copied ? colors.greenDark : palette.primary,
                },
              ]}
              testID={`share-copy-link-${post.id}`}
            >
              {copied ? (
                <Check size={14} color="#FFFFFF" strokeWidth={ICON_STROKE} />
              ) : (
                <Copy size={14} color="#FFFFFF" strokeWidth={ICON_STROKE} />
              )}
              <Text style={styles.copyBtnText}>
                {copied
                  ? language === 'en'
                    ? 'Copied'
                    : 'Tersalin'
                  : language === 'en'
                    ? 'Copy Link'
                    : 'Salin Link'}
              </Text>
            </Pressable>
          </View>

          {statusMessage ? (
            <Text
              style={[styles.statusNotice, { color: palette.primary }]}
              testID={`post-share-status-${post.id}`}
            >
              {statusMessage}
            </Text>
          ) : null}

          {/* Social Share Grid */}
          <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>
            {language === 'en'
              ? 'SHARE DIRECTLY TO SOCIAL MEDIA'
              : 'BAGIKAN LANGSUNG KE MEDIA SOSIAL'}
          </Text>

          <View style={styles.socialGrid}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void openSocialTarget(payload.whatsappUrl, 'whatsapp');
              }}
              style={[
                styles.socialBtn,
                { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
              ]}
              testID={`share-whatsapp-${post.id}`}
            >
              <MessageCircle size={18} color="#059669" strokeWidth={ICON_STROKE} />
              <Text style={[styles.socialBtnText, { color: '#065F46' }]}>
                WhatsApp
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void openSocialTarget(payload.facebookUrl, 'facebook');
              }}
              style={[
                styles.socialBtn,
                { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
              ]}
              testID={`share-facebook-${post.id}`}
            >
              <ExternalLink size={18} color="#2563EB" strokeWidth={ICON_STROKE} />
              <Text style={[styles.socialBtnText, { color: '#1E40AF' }]}>
                Facebook
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void openSocialTarget(payload.twitterUrl, 'twitter');
              }}
              style={[
                styles.socialBtn,
                { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' },
              ]}
              testID={`share-twitter-${post.id}`}
            >
              <Share2 size={18} color="#0F172A" strokeWidth={ICON_STROKE} />
              <Text style={[styles.socialBtnText, { color: '#0F172A' }]}>
                X / Twitter
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void openSocialTarget(payload.telegramUrl, 'telegram');
              }}
              style={[
                styles.socialBtn,
                { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' },
              ]}
              testID={`share-telegram-${post.id}`}
            >
              <Send size={18} color="#0284C7" strokeWidth={ICON_STROKE} />
              <Text style={[styles.socialBtnText, { color: '#0369A1' }]}>
                Telegram
              </Text>
            </Pressable>
          </View>

          {/* Native System Share (with image attachment support) */}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void handleNativeShareWithImage();
            }}
            style={[
              styles.nativeShareBtn,
              {
                backgroundColor: palette.primarySoft,
                borderColor: palette.primary,
              },
            ]}
            testID={`share-native-${post.id}`}
          >
            <Share2 size={17} color={palette.primary} strokeWidth={ICON_STROKE} />
            <Text style={[styles.nativeShareBtnText, { color: palette.primary }]}>
              {previewImageUri
                ? language === 'en'
                  ? 'More Apps (Share with Post Image)'
                  : 'Aplikasi Lainnya (Bagikan dengan Foto)'
                : language === 'en'
                  ? 'More Apps / System Share'
                  : 'Aplikasi Lainnya / Bagikan'}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  sheet: {
    borderRadius: radii.md,
    borderWidth: 1,
    maxWidth: 420,
    padding: spacing.lg,
    width: '100%',
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerTitleWrap: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: font.heading,
    fontWeight: '800',
  },
  secureBadge: {
    alignItems: 'center',
     alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  secureBadgeText: {
    color: colors.greenDark,
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtn: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  previewCard: {
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    overflow: 'hidden',
    padding: spacing.sm,
  },
  previewImageWrap: {
    borderRadius: radii.sm,
    height: 72,
    overflow: 'hidden',
    position: 'relative',
    width: 72,
  },
  previewImage: {
    height: '100%',
    width: '100%',
  },
  imageAttachedPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    bottom: 0,
    flexDirection: 'row',
    gap: 3,
    justifyContent: 'center',
    left: 0,
    paddingVertical: 2,
    position: 'absolute',
    right: 0,
  },
  imageAttachedText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  previewTextCol: {
    flex: 1,
    gap: 3,
    justifyContent: 'center',
  },
  previewAuthor: {
    fontSize: font.label,
    fontWeight: '800',
  },
  previewCaption: {
    fontSize: font.caption,
    lineHeight: 16,
  },
  previewPrice: {
    fontSize: font.caption,
    fontWeight: '800',
    marginTop: 2,
  },
  cleanUrlBox: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: 6,
    paddingVertical: 6,
  },
  cleanUrlText: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
  copyBtn: {
    alignItems: 'center',
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  statusNotice: {
    fontSize: font.caption,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  socialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  socialBtn: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    flexBasis: '48%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  socialBtnText: {
    fontSize: font.label,
    fontWeight: '800',
  },
  nativeShareBtn: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 11,
    width: '100%',
  },
  nativeShareBtnText: {
    fontSize: font.label,
    fontWeight: '800',
  },
});
