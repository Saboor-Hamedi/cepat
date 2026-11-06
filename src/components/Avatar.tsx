import { memo, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { useAppearance } from '../context/AppearanceContext';
import { resolveImageUrl } from '../data/marketplaceRepository';
import {
  PROFILE_ACCENT_RING_WIDTH,
  resolveProfileAccent,
} from '../theme/profileAccent';
import { UserLetterAvatar } from './UserLetterAvatar';

export interface AvatarProps {
  uri?: string;
  name: string;
  size?: number;
}

// Gap between the 3px accent ring and the avatar artwork, so the ring reads as
// its own circle instead of cropping the image edge.
const RING_GAP = 2;
const RING_GAP_SMALL = 1;

export const Avatar = memo(function Avatar({
  uri,
  name,
  size = 76,
}: AvatarProps) {
  const { profileAccentId } = useAppearance();
  const [failedUri, setFailedUri] = useState<string | null>(null);

  // Resolve the accent once per id change so taps in the settings picker are
  // cheap and don't recompute the artwork pipeline.
  const accent = useMemo(
    () => resolveProfileAccent(profileAccentId),
    [profileAccentId],
  );
  const ringGap = size <= 44 ? RING_GAP_SMALL : RING_GAP;
  // Artwork size after subtracting ring width and the inner gap on both sides.
  const artworkSize = accent ? size - 2 * (PROFILE_ACCENT_RING_WIDTH + ringGap) : size;

  // If uri is empty or an unwanted default placeholder, treat it as null to show single letter.
  // Memoized so a ring-color change never re-parses the uri.
  const resolvedUri = useMemo(() => {
    const isDefaultPlaceholder =
      typeof uri === 'string' &&
      (uri.includes('default-avatar') ||
        uri.includes('placeholder') ||
        uri.trim() === '');
    if (!uri || isDefaultPlaceholder) return undefined;
    return (
      resolveImageUrl(uri) ||
      (uri.includes('://') || uri.startsWith('/') || uri.startsWith('data:')
        ? uri
        : undefined)
    );
  }, [uri]);

  const imageFailed = Boolean(resolvedUri && failedUri === resolvedUri);

  // Shared circular artwork for both the ringed and unringed variants.
  // Memoized so switching ring color never re-creates the image/letter subtree.
  const artwork = useMemo(() => {
    if (!resolvedUri || imageFailed) {
      return <UserLetterAvatar name={name} size={artworkSize} />;
    }
    return (
      <View
        accessible
        accessibilityLabel={`Foto profil ${name}`}
        style={[
          styles.avatar,
          {
            width: artworkSize,
            height: artworkSize,
            borderRadius: artworkSize / 2,
            backgroundColor: 'transparent',
          },
        ]}
      >
        <Image
          source={{ uri: resolvedUri }}
          style={[
            styles.avatarImage,
            { width: artworkSize, height: artworkSize, borderRadius: artworkSize / 2 },
          ]}
          resizeMode="cover"
          onError={() => setFailedUri(resolvedUri ?? null)}
        />
      </View>
    );
  }, [artworkSize, imageFailed, name, resolvedUri]);

  // No accent selected: render exactly as before.
  if (!accent) {
    return artwork;
  }

  // 3px accent ring with a small inner gap around the artwork.
  return (
    <View
      accessible
      accessibilityLabel={`Foto profil ${name}`}
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: accent.color,
          borderWidth: PROFILE_ACCENT_RING_WIDTH,
        },
      ]}
    >
      <View style={[styles.ringInner, { margin: ringGap }]}>
        {artwork}
      </View>
    </View>
  );
});

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
  // Circular frame holding the 3px accent stroke.
  ring: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  // Inner gap between the ring and the artwork.
  ringInner: {
    alignItems: 'center',
    borderRadius: 9999,
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
