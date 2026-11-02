import { Camera, Plus } from 'lucide-react-native';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useAppearance } from '../context/AppearanceContext';
import { useLanguage } from '../i18n/locale';
import { ICON_SIZE, ICON_STROKE } from '../theme/icons';
import { font } from '../theme/typography';
import type { ImageCandidateInput } from '../utils/imageValidator';
import { ImageSourceSheet } from './ImageSourceSheet';

export type MediaGlyphName = 'camera' | 'plus';

export function MediaGlyph({
  name = 'plus',
  size = ICON_SIZE,
  color,
}: {
  name?: MediaGlyphName;
  size?: number;
  color?: string;
}) {
  const Icon = name === 'camera' ? Camera : Plus;
  return <Icon color={color} size={size} strokeWidth={ICON_STROKE} />;
}

export interface MediaPickerButtonProps {
  onImageSelected?: (uri: string) => void;
  onPress?: () => void;
  icon?: MediaGlyphName;
  showLabel?: boolean;
  label?: string;
  variant?: 'ghost' | 'overlay' | 'surface';
  style?: StyleProp<ViewStyle>;
  testID?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
  customPickerLauncher?: (mode: 'camera' | 'gallery') => Promise<ImageCandidateInput | null>;
  sheetTestIDPrefix?: string;
}

export function MediaPickerButton({
  onImageSelected,
  onPress,
  icon = 'plus',
  showLabel = false,
  label,
  variant = 'ghost',
  style,
  testID,
  disabled = false,
  accessibilityLabel,
  customPickerLauncher,
  sheetTestIDPrefix,
}: MediaPickerButtonProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();
  const [sheetVisible, setSheetVisible] = useState(false);
  const isOverlay = variant === 'overlay';
  const isSurface = variant === 'surface';
  const tint = isOverlay ? '#FFFFFF' : isSurface ? palette.primary : palette.textMuted;
  const backgroundColor = isOverlay
    ? 'rgba(0, 0, 0, 0.5)'
    : isSurface
      ? palette.primarySoft
      : 'transparent';

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    setSheetVisible(true);
  };

  return (
    <>
      <Pressable
        accessibilityLabel={
          accessibilityLabel ?? (language === 'en' ? 'Add photo' : 'Tambah foto')
        }
        accessibilityRole="button"
        disabled={disabled}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.base,
          isOverlay ? styles.overlay : isSurface ? styles.surface : styles.ghost,
          !showLabel && styles.iconOnly,
          { backgroundColor },
          style,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
        testID={testID}
      >
        <MediaGlyph name={icon} size={ICON_SIZE} color={tint} />
        {showLabel && label ? (
          <Text style={[styles.label, { color: tint }]}>{label}</Text>
        ) : null}
      </Pressable>

      {onPress ? null : (
        <ImageSourceSheet
          customPickerLauncher={customPickerLauncher}
          onClose={() => setSheetVisible(false)}
          onImageSelected={(uri) => {
            setSheetVisible(false);
            onImageSelected?.(uri);
          }}
          subtitle={
            language === 'en'
              ? 'Take a new photo or pick one from your gallery.'
              : 'Ambil foto baru atau pilih dari galeri Anda.'
          }
          testIDPrefix={sheetTestIDPrefix ?? `${testID ?? 'media'}-picker`}
          title={language === 'en' ? 'Add a Photo' : 'Tambahkan Foto'}
          visible={sheetVisible}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 34,
  },
  disabled: {
    opacity: 0.4,
  },
  ghost: {
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  iconOnly: {
    paddingHorizontal: 0,
  },
  label: {
    fontSize: font.body,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  overlay: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pressed: {
    opacity: 0.7,
  },
  surface: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
