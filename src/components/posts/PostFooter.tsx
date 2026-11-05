import { X } from 'lucide-react-native';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import { ICON_SIZE, ICON_STROKE } from '../../theme/icons';
import { radii, spacing } from '../../theme/tokens';

export interface PostFooterProps {
  images: string[];
  onRemoveImage: (index: number) => void;
  testIDPrefix?: string;
}

export function PostFooter({
  images,
  onRemoveImage,
  testIDPrefix = 'post-preview',
}: PostFooterProps) {
  const { palette } = useAppearance();

  if (images.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} testID={`${testIDPrefix}-container`}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {images.map((uri, index) => (
          <View
            key={`${uri}-${index}`}
            style={[
              styles.thumbnailWrap,
              {
                backgroundColor: palette.surfaceElevated,
                borderColor: palette.border,
              },
            ]}
            testID={`preview-image-${index}`}
          >
            <Image
              source={{ uri }}
              style={styles.image}
              resizeMode="cover"
              accessibilityLabel={`Post attachment preview ${index + 1}`}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove image ${index + 1}`}
              onPress={() => onRemoveImage(index)}
              style={styles.removeBtn}
              testID={`remove-image-${index}`}
              hitSlop={8}
            >
              <X color="#FFFFFF" size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xs,
    width: '100%',
  },
  scrollContent: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  thumbnailWrap: {
    borderRadius: radii.md,
    borderWidth: 1,
    height: 96,
    overflow: 'hidden',
    position: 'relative',
    width: 96,
  },
  image: {
    borderRadius: radii.md,
    height: '100%',
    width: '100%',
  },
  removeBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 12,
    elevation: 3,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: 4,
    top: 4,
    width: 24,
    zIndex: 10,
  },
});
