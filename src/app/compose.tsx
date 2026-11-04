import { router } from 'expo-router';
import { LogIn, PenSquare } from 'lucide-react-native';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthProvider';
import { TechnicianPostComposer } from '../components/TechnicianPostCard';
import { createTechnicianPost } from '../data/postsStore';
import { useLanguage } from '../i18n/locale';
import { ICON_SIZE, ICON_STROKE } from '../theme/icons';
import { spacing } from '../theme/tokens';
import { font } from '../theme/typography';
import { radii } from '../theme/tokens';

const MODAL_BG = '#0B0E14';
const MODAL_TEXT = '#F1F5F9';
const MODAL_MUTED = '#64748B';
const MINT = '#10B981';

export default function ComposeScreen() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();

  const displayName =
    (typeof user?.user_metadata?.display_name === 'string' &&
      user.user_metadata.display_name.trim()) ||
    user?.email?.split('@')[0] ||
    'Cepat';

  const avatarUri =
    (typeof user?.user_metadata?.avatar_url === 'string' &&
      user.user_metadata.avatar_url) ||
    undefined;

  const handleCreatePost = async (input: {
    caption: string;
    imageUri?: string;
    mediaUrls?: string[];
    isServicePost: boolean;
    serviceArea?: string;
  }) => {
    if (!user) return;
    try {
      await createTechnicianPost({
        actorUserId: user.id,
        technicianId: user.id,
        technicianName: displayName,
        technicianAvatarUri: avatarUri,
        technicianVerified: false,
        caption: input.caption,
        imageUri: input.imageUri,
        mediaUrls: input.mediaUrls,
        isServicePost: input.isServicePost,
        serviceArea: input.serviceArea ?? 'Semua area',
        categorySlug: 'general',
        published: true,
      });
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    } catch (error) {
      console.warn('[compose] Failed to create post:', error);
    }
  };

  if (!user) {
    return (
      <View
        style={[styles.screen, { backgroundColor: MODAL_BG }]}
        testID="compose-screen"
      >
        <View style={[styles.guestHeader, { paddingTop: insets.top + 6 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={language === 'en' ? 'Cancel' : 'Batal'}
            hitSlop={10}
            onPress={() => router.replace('/')}
            style={({ pressed }) => [
              styles.cancelBtn,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            testID="compose-guest-cancel"
          >
            <Text style={styles.cancelText}>
              {language === 'en' ? 'Cancel' : 'Batal'}
            </Text>
          </Pressable>
        </View>
        <View style={styles.guestBody}>
          <View style={styles.guestIcon}>
            <PenSquare
              color={MINT}
              size={ICON_SIZE + 10}
              strokeWidth={ICON_STROKE}
            />
          </View>
          <Text style={styles.guestTitle}>
            {language === 'en' ? 'Sign in to post' : 'Masuk untuk posting'}
          </Text>
          <Text style={styles.guestSub}>
            {language === 'en'
              ? 'Share your latest work, offer services, and connect with customers.'
              : 'Bagikan hasil kerja terbaru, tawarkan layanan, dan terhubung dengan pelanggan.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/login')}
            style={styles.guestBtn}
            testID="compose-login-btn"
          >
            <LogIn
              color="#0B0E14"
              size={ICON_SIZE}
              strokeWidth={ICON_STROKE}
            />
            <Text style={styles.guestBtnText}>
              {language === 'en' ? 'Sign in' : 'Masuk'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: MODAL_BG }]} testID="compose-screen">
      <TechnicianPostComposer
        variant="modal"
        technicianProfile={{
          id: user.id,
          displayName,
          avatarUri,
        }}
        onCreatePost={handleCreatePost}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  guestHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 52,
    paddingBottom: 4,
    paddingHorizontal: spacing.lg,
    width: '100%',
  },
  cancelBtn: {
    paddingVertical: 4,
  },
  cancelText: {
    color: MODAL_TEXT,
    fontSize: font.subtitle,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  guestBody: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  guestIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.13)',
    borderRadius: radii.sm,
    height: 72,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    width: 72,
  },
  guestTitle: {
    color: MODAL_TEXT,
    fontSize: font.heading,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  guestSub: {
    color: MODAL_MUTED,
    fontSize: font.body,
    lineHeight: 18,
    maxWidth: 280,
    textAlign: 'center',
  },
  guestBtn: {
    alignItems: 'center',
    backgroundColor: MINT,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
  },
  guestBtnText: {
    color: '#0B0E14',
    fontSize: font.label,
    fontWeight: '800',
  },
});
