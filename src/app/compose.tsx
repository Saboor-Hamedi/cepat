import { router } from 'expo-router';
import { PenSquare } from 'lucide-react-native';
import { StyleSheet, View, Pressable } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { PostContainer } from '../components/posts/PostContainer';
import { createPost } from '../data/postsStore';
import { useLanguage } from '../i18n/locale';
import { AppButton, AppText, ScreenWrapper } from '../ui';
import { ICON_SIZE, ICON_STROKE } from '../theme/icons';
import { radii, spacing } from '../theme/tokens';

const MINT = '#10B981';

export default function ComposeScreen() {
  const { user } = useAuth();
  const { language } = useLanguage();

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
      await createPost({
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
      <ScreenWrapper padded={false} testID="compose-screen">
        <View style={styles.guestHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={language === 'en' ? 'Close' : 'Tutup'}
            hitSlop={10}
            onPress={() => router.replace('/')}
            style={({ pressed }) => [
              styles.guestCancel,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            testID="compose-guest-cancel"
          >
            <AppText variant="body" color="primary">
              {language === 'en' ? 'Cancel' : 'Batal'}
            </AppText>
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
          <AppText variant="title" color="primary" align="center">
            {language === 'en' ? 'Sign in to post' : 'Masuk untuk posting'}
          </AppText>
          <AppText variant="body" color="secondary" align="center">
            {language === 'en'
              ? 'Share your latest work, offer services, and connect with customers.'
              : 'Bagikan hasil kerja terbaru, tawarkan layanan, dan terhubung dengan pelanggan.'}
          </AppText>
          <View style={styles.guestActions}>
            <AppButton
              variant="primary"
              onPress={() => router.push('/login')}
              fullWidth={false}
              testID="compose-login-btn"
            >
              {language === 'en' ? 'Sign in' : 'Masuk'}
            </AppButton>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper padded={false} testID="compose-screen">
      <PostContainer
        showTitle
        technicianProfile={{
          id: user.id,
          displayName,
          avatarUri,
        }}
        onCreatePost={handleCreatePost}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  guestHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 52,
    paddingHorizontal: 16,
    width: '100%',
  },
  guestCancel: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  guestBody: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
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
  guestActions: {
    marginTop: spacing.md,
  },
});
