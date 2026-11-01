import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useAppearance } from '../context/AppearanceContext';

export interface AvatarProps {
  uri?: string;
  name: string;
  size?: number;
}

export function Avatar({
  uri,
  name,
  size = 76,
}: AvatarProps) {
  const { palette } = useAppearance();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const imageFailed = Boolean(uri && failedUri === uri);
  const trimmed = name.trim();
  const initial = (trimmed.charAt(0) || 'C').toLocaleUpperCase('id-ID');

  return (
    <View
      accessible
      accessibilityLabel={`Foto profil ${name}`}
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: palette.primarySoft,
        },
      ]}
    >
      {uri && !imageFailed ? (
        <Image
          source={{ uri }}
          style={[styles.avatarImage, { width: size, height: size, borderRadius: size / 2 }]}
          resizeMode="cover"
          onError={() => setFailedUri(uri ?? null)}
        />
      ) : (
        <Text
          style={[
            styles.avatarInitials,
            { color: palette.primary, fontSize: Math.round(size * 0.42) },
          ]}
        >
          {initial}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    borderRadius: 9999,
    height: '100%',
    overflow: 'hidden',
    width: '100%',
  },
  avatarInitials: {
    fontWeight: '800',
  },
});
