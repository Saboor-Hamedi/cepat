import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { useAuth } from '../../auth/AuthProvider';
import { useAppearance } from '../../context/AppearanceContext';
import { loadAccountProfileDetails } from '../../data/marketplaceStore';
import { useUserAvatar } from '../../hooks/useUserAvatar';
import { useLanguage } from '../../i18n/locale';
import { createSidebarStyles } from './css/sidebarStyles';
import { SidebarFooter } from './SidebarFooter';
import { SidebarHeader } from './SidebarHeader';
import { SidebarMenu } from './SidebarMenu';
import { buildSidebarIdentity, type SidebarRoute } from './utils/sidebar';

export interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  avatarUri?: string;
}

export type ProfileSidebarModalProps = SidebarProps;

export function Sidebar({ visible, onClose, avatarUri }: SidebarProps) {
  const { language } = useLanguage();
  const { user, roles, effectiveRole, signOut } = useAuth();
  const { palette } = useAppearance();
  const styles = useMemo(() => createSidebarStyles(palette), [palette]);

  const isAuthenticated = Boolean(user);
  const isVerifiedAdmin =
    isAuthenticated && (roles.includes('admin') || effectiveRole === 'admin');
  const isTechnician =
    isAuthenticated &&
    (effectiveRole === 'technician' || roles.includes('technician'));

  const [profileUsername, setProfileUsername] = useState<string>('');
  const [profileDisplayName, setProfileDisplayName] = useState<string>('');

  useEffect(() => {
    let active = true;
    if (user?.id) {
      void loadAccountProfileDetails(user.id).then((details) => {
        if (!active) {
          return;
        }
        if (details.username) {
          setProfileUsername(details.username);
        }
        if (details.displayName) {
          setProfileDisplayName(details.displayName);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [user?.id]);

  const identity = useMemo(
    () =>
      buildSidebarIdentity({
        user,
        language,
        isAuthenticated,
        profileDisplayName,
        profileUsername,
      }),
    [user, language, isAuthenticated, profileDisplayName, profileUsername],
  );

  const userMetadataAvatar =
    (typeof user?.user_metadata?.avatar_url === 'string' &&
      user.user_metadata.avatar_url) ||
    (typeof user?.user_metadata?.avatar_path === 'string' &&
      user.user_metadata.avatar_path) ||
    (typeof user?.user_metadata?.avatar === 'string' &&
      user.user_metadata.avatar) ||
    undefined;
  const hookAvatar = useUserAvatar(
    user?.id,
    identity.displayName,
    avatarUri || userMetadataAvatar,
  );
  const effectiveAvatarUri =
    avatarUri || hookAvatar || userMetadataAvatar || undefined;

  const navigateAndClose = (target: SidebarRoute) => {
    onClose();
    try {
      router.push(target as never);
    } catch {
      // Router may not be mounted in isolated unit component tests.
    }
  };

  const handleLogout = async () => {
    await signOut();
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop} testID="profile-sidebar-modal">
        <View style={styles.drawer}>
          <View style={styles.body}>
            <SidebarHeader
              isAuthenticated={isAuthenticated}
              displayName={identity.displayName}
              email={identity.email}
              avatarUri={effectiveAvatarUri}
              onClose={onClose}
            />
            <SidebarMenu
              language={language}
              isAuthenticated={isAuthenticated}
              isTechnician={isTechnician}
              isVerifiedAdmin={isVerifiedAdmin}
              profileId={user?.id}
              navigate={navigateAndClose}
            />
          </View>

          <SidebarFooter
            language={language}
            isAuthenticated={isAuthenticated}
            onLogout={() => {
              void handleLogout();
            }}
            onLogin={() => navigateAndClose('/login')}
            onRegister={() => navigateAndClose('/register')}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss sidebar"
          onPress={onClose}
          style={styles.scrimTapArea}
        />
      </View>
    </Modal>
  );
}

export const ProfileSidebarModal = Sidebar;
