import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/tokens';

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
  const [imageFailed, setImageFailed] = useState(false);
  const trimmed = name.trim();
  const singleChar = (trimmed.charAt(0) || 'C').toLocaleUpperCase('id-ID');

  return (
    <View
      accessible
      accessibilityLabel={`Foto profil ${name}`}
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
    >
      {uri && !imageFailed ? (
        <Image
          source={{ uri }}
          style={[styles.avatarImage, { width: size, height: size, borderRadius: size / 2 }]}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Text style={[styles.avatarInitials, { fontSize: Math.round(size * 0.42) }]}>
          {singleChar}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.greenSoft,
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
    color: colors.greenDark,
    fontWeight: '800',
  },
});
