import { Camera } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  ImageSourceSheet,
  type ImageSourceMode,
} from '../components/ImageSourceSheet';
import { Avatar } from '../components/marketplace-ui';
import { useLanguage } from '../i18n/locale';
import { colors } from '../theme/tokens';
import type { ImageCandidateInput } from '../utils/imageValidator';

export { pickImageSafely } from '../components/ImageSourceSheet';

export interface ProfileAvatarProps {
  uri?: string;
  name: string;
  size?: number;
  editable?: boolean;
  onImageSelected?: (uri: string) => void;
  customPickerLauncher?: (mode: ImageSourceMode) => Promise<ImageCandidateInput | null>;
  testID?: string;
}

export function ProfileAvatar({
  uri,
  name,
  size = 80,
  editable = false,
  onImageSelected,
  customPickerLauncher,
  testID = 'profile-avatar',
}: ProfileAvatarProps) {
  const { language } = useLanguage();
  const [menuVisible, setMenuVisible] = useState(false);

  const handleAvatarPress = () => {
    if (editable) setMenuVisible(true);
  };

  return (
    <View style={styles.container} testID={testID}>
      <Pressable
        accessibilityRole={editable ? 'button' : 'none'}
        accessibilityLabel={
          editable
            ? language === 'en'
              ? `Change profile photo for ${name}`
              : `Ubah foto profil ${name}`
            : `Profile photo for ${name}`
        }
        disabled={!editable}
        onPress={handleAvatarPress}
        style={({ pressed }) => [
          styles.avatarTouch,
          { width: size, height: size, borderRadius: size / 2 },
          pressed && editable && styles.avatarPressed,
        ]}
        testID={`${testID}-touch`}
      >
        <Avatar uri={uri} name={name} size={size} />

        {editable && (
          <View
            style={[
              styles.cameraBadge,
              {
                width: Math.max(22, Math.round(size * 0.3)),
                height: Math.max(22, Math.round(size * 0.3)),
                borderRadius: Math.max(11, Math.round(size * 0.15)),
              },
            ]}
            testID={`${testID}-camera-badge`}
          >
            <Camera color="#FFFFFF" size={Math.max(12, Math.round(size * 0.16))} />
          </View>
        )}
      </Pressable>

      <ImageSourceSheet
        allowFallbackUri
        backdropTestID={`${testID}-menu-backdrop`}
        customPickerLauncher={customPickerLauncher}
        onClose={() => setMenuVisible(false)}
        onImageSelected={(nextUri) => {
          setMenuVisible(false);
          onImageSelected?.(nextUri);
        }}
        subtitle={
          language === 'en'
            ? 'Choose a clear photo so customers and technicians recognize you.'
            : 'Pilih foto yang jelas agar mudah dikenali.'
        }
        testIDPrefix="avatar"
        title={language === 'en' ? 'Update Profile Photo' : 'Ubah Foto Profil'}
        visible={menuVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  avatarPressed: {
    opacity: 0.85,
  },
  avatarTouch: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cameraBadge: {
    alignItems: 'center',
    backgroundColor: colors.greenDark,
    borderColor: '#FFFFFF',
    borderWidth: 2,
    bottom: 0,
    elevation: 3,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
  },
  cameraBadgeIcon: {
    fontSize: 11,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
