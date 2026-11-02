import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { useAppearance } from '../context/AppearanceContext';
import { resolveImageUrl } from '../data/marketplaceRepository';
import { UserLetterAvatar } from './UserLetterAvatar';

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

  // If uri is empty or an unwanted default placeholder, treat it as null to show single letter
  const isDefaultPlaceholder =
    typeof uri === 'string' &&
    (uri.includes('default-avatar') ||
      uri.includes('placeholder') ||
      uri.trim() === '');

  const resolvedUri =
    uri && !isDefaultPlaceholder
      ? resolveImageUrl(uri) ||
        (uri.includes('://') || uri.startsWith('/') || uri.startsWith('data:')
          ? uri
          : undefined)
      : undefined;

  const imageFailed = Boolean(resolvedUri && failedUri === resolvedUri);

  if (!resolvedUri || imageFailed) {
    return <UserLetterAvatar name={name} size={size} />;
  }

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
          backgroundColor: 'transparent',
        },
      ]}
    >
      <Image
        source={{ uri: resolvedUri }}
        style={[
          styles.avatarImage,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
        resizeMode="cover"
        onError={() => setFailedUri(resolvedUri ?? null)}
      />
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
});
