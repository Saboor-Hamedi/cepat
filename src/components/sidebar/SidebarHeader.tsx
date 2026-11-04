import { X } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import { useLanguage } from '../../i18n/locale';
import { ICON_SIZE, ICON_STROKE } from '../../theme/icons';
import { Avatar } from '../Avatar';
import { createSidebarHeaderStyles } from './css/sidebarStyles';

export interface SidebarHeaderProps {
  isAuthenticated: boolean;
  displayName: string;
  email: string;
  avatarUri?: string;
  onClose: () => void;
}

export function SidebarHeader({
  isAuthenticated,
  displayName,
  email,
  avatarUri,
  onClose,
}: SidebarHeaderProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();
  const styles = useMemo(() => createSidebarHeaderStyles(palette), [palette]);

  return (
    <>
      <View style={styles.container}>
        <View style={styles.profileRow}>
          <Avatar
            uri={isAuthenticated ? avatarUri : undefined}
            name={displayName}
            size={48}
          />
          <View style={styles.profileCopy}>
            <Text
              numberOfLines={1}
              style={styles.displayName}
              testID="sidebar-display-name"
            >
              {displayName}
            </Text>
            {isAuthenticated && email ? (
              <Text
                numberOfLines={1}
                style={styles.emailText}
                testID="sidebar-email"
              >
                {email}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={language === 'en' ? 'Close menu' : 'Tutup menu'}
            onPress={onClose}
            style={styles.closeBtn}
            testID="sidebar-close-button"
          >
            <X color={palette.text} size={ICON_SIZE + 4} strokeWidth={ICON_STROKE} />
          </Pressable>
        </View>
      </View>

      <View style={styles.divider} />
    </>
  );
}
