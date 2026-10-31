import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';

export interface TechnicianPostImagePreviewProps {
  images: string[];
  onRemoveImage: (index: number) => void;
  testIDPrefix?: string;
}

export function TechnicianPostImagePreview({
  images,
  onRemoveImage,
  testIDPrefix = 'post-preview',
}: TechnicianPostImagePreviewProps) {
  if (!images || images.length === 0) {
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
            style={styles.thumbnailWrap}
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
              <Text style={styles.removeBtnText}>×</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
    width: '100%',
  },
  scrollContent: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  thumbnailWrap: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
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
  removeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'center',
  },
});
