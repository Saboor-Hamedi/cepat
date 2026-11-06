import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { PenSquare } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { PostContainer } from '../components/posts/PostContainer';
import { MODAL_BG } from '../components/posts/constants';
import { loadTechnicianWorkspaceProfile } from '../data/marketplaceStore';
import { createPost } from '../data/postsStore';
import { useLanguage } from '../i18n/locale';
import { ICON_SIZE, ICON_STROKE } from '../theme/icons';
import { radii, spacing } from '../theme/tokens';
import type { Technician } from '../types/marketplace';
import { AppButton, AppText, ScreenWrapper } from '../ui';

const MINT = '#10B981';

export default function ComposeScreen() {
  const { user, roles, effectiveRole } = useAuth();
  const { language } = useLanguage();
  const [savedAvatarUri, setSavedAvatarUri] = useState<string | undefined>(undefined);
  const [workspaceTech, setWorkspaceTech] = useState<Technician | null>(null);

  useEffect(() => {
    let active = true;
    if (!user?.id) return;
    void AsyncStorage.getItem(`@cepat_avatar_${user.id}`)
      .then((saved) => {
        if (active && saved) {
          setSavedAvatarUri(saved);
        }
      })
      .catch(() => {});
    void loadTechnicianWorkspaceProfile(user.id)
      .then((profile) => {
        if (active && profile) {
          setWorkspaceTech(profile);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user?.id]);

  const displayName =
    (typeof user?.user_metadata?.display_name === 'string' &&
      user.user_metadata.display_name.trim()) ||
    workspaceTech?.displayName ||
    user?.email?.split('@')[0] ||
    'Cepat';

  const avatarUri =
    (typeof user?.user_metadata?.avatar_url === 'string' &&
      user.user_metadata.avatar_url) ||
    savedAvatarUri ||
    workspaceTech?.avatarUri ||
    undefined;

  const isVerifiedAuthor = Boolean(
    roles.includes('technician') ||
      roles.includes('admin') ||
      effectiveRole === 'technician' ||
      effectiveRole === 'admin' ||
      workspaceTech?.verified,
  );

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
        technicianBusinessName: workspaceTech?.businessName,
        technicianAvatarUri: avatarUri,
        technicianVerified: isVerifiedAuthor,
        caption: input.caption,
        imageUri: input.imageUri,
        mediaUrls: input.mediaUrls,
        isServicePost: input.isServicePost,
        serviceArea:
          input.serviceArea && input.serviceArea !== 'Semua area'
            ? input.serviceArea
            : (workspaceTech?.serviceAreas[0] ?? 'Semua area'),
        categorySlug: workspaceTech?.services[0]?.categorySlug ?? 'general',
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
      <ScreenWrapper
        backgroundColor={MODAL_BG}
        padded={false}
        testID="compose-screen"
      >
        <View style={styles.guestHeader}>
          <Pressable
            accessibilityLabel={language === 'en' ? 'Close' : 'Tutup'}
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => router.replace('/')}
            style={({ pressed }) => [
              styles.guestCancel,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            testID="compose-guest-cancel"
          >
            <AppText color="primary" variant="body">
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
          <AppText align="center" color="primary" variant="title">
            {language === 'en' ? 'Sign in to post' : 'Masuk untuk posting'}
          </AppText>
          <AppText align="center" color="secondary" variant="body">
            {language === 'en'
              ? 'Share your latest work, offer services, and connect with customers.'
              : 'Bagikan hasil kerja terbaru, tawarkan layanan, dan terhubung dengan pelanggan.'}
          </AppText>
          <View style={styles.guestActions}>
            <AppButton
              fullWidth={false}
              onPress={() => router.push('/login')}
              testID="compose-login-btn"
              variant="primary"
            >
              {language === 'en' ? 'Sign in' : 'Masuk'}
            </AppButton>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper
      backgroundColor={MODAL_BG}
      padded={false}
      testID="compose-screen"
    >
      <PostContainer
        onCreatePost={handleCreatePost}
        showTitle
        technicianProfile={{
          id: user.id,
          displayName,
          avatarUri,
        }}
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
