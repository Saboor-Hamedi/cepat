import { requireOptionalNativeModule } from 'expo-modules-core';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Camera, Image as ImageIcon } from 'lucide-react-native';
import { useAppearance } from '../context/AppearanceContext';
import { useLanguage } from '../i18n/locale';
import { colors, radii, spacing } from '../theme/tokens';
import {
  validateStrictImageAsset,
  type ImageCandidateInput,
} from '../utils/imageValidator';

interface NativeImageAsset {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
  type?: string | null;
}

interface NativePickerResult {
  canceled?: boolean;
  cancelled?: boolean;
  assets?: NativeImageAsset[];
  uri?: string;
}

interface ExponentImagePickerModule {
  requestMediaLibraryPermissionsAsync?: (
    writeOnly?: boolean,
  ) => Promise<{ status?: string; granted?: boolean }>;
  requestCameraPermissionsAsync?: () => Promise<{ status?: string; granted?: boolean }>;
  launchImageLibraryAsync?: (
    options: Record<string, unknown>,
  ) => Promise<NativePickerResult>;
  launchCameraAsync?: (
    options: Record<string, unknown>,
  ) => Promise<NativePickerResult>;
}

export type ImageSourceMode = 'camera' | 'gallery';

export interface ImageSourceSheetProps {
  visible: boolean;
  onClose: () => void;
  onImageSelected: (uri: string) => void;
  title?: string;
  subtitle?: string;
  testIDPrefix?: string;
  backdropTestID?: string;
  customPickerLauncher?: (mode: ImageSourceMode) => Promise<ImageCandidateInput | null>;
  allowFallbackUri?: boolean;
}

function getNativePicker(): ExponentImagePickerModule | null {
  try {
    return requireOptionalNativeModule<ExponentImagePickerModule>('ExponentImagePicker');
  } catch {
    return null;
  }
}

export async function pickImageSafely(
  source: ImageSourceMode,
): Promise<ImageCandidateInput | null> {
  const picker = getNativePicker();
  if (!picker) {
    return null;
  }

  try {
    if (source === 'camera') {
      if (picker.requestCameraPermissionsAsync) {
        const perm = await picker.requestCameraPermissionsAsync();
        const status = perm?.status ?? (perm?.granted ? 'granted' : 'denied');
        if (status !== 'granted' && perm?.granted !== true) {
          Alert.alert(
            'Izin Kamera Diperlukan',
            'Aktifkan izin kamera di pengaturan perangkat Anda.',
          );
          return null;
        }
      }

      if (!picker.launchCameraAsync) return null;

      let result: NativePickerResult | undefined;
      try {
        result = await picker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } catch {
        result = await picker.launchCameraAsync({
          allowsEditing: false,
          quality: 0.8,
        });
      }

      if (!result || result.canceled || result.cancelled) return null;
      const asset =
        result.assets?.[0] ?? (result.uri ? { uri: result.uri } : null);
      if (!asset?.uri) return null;

      return {
        uri: asset.uri,
        fileName: asset.fileName ?? 'camera-photo.jpg',
        mimeType: asset.mimeType ?? 'image/jpeg',
        fileSize: asset.fileSize ?? 250000,
        width: asset.width ?? 800,
        height: asset.height ?? 800,
      };
    }

    if (picker.requestMediaLibraryPermissionsAsync) {
      const perm = await picker.requestMediaLibraryPermissionsAsync(false);
      const status = perm?.status ?? (perm?.granted ? 'granted' : 'denied');
      if (status !== 'granted' && perm?.granted !== true) {
        Alert.alert(
          'Izin Galeri Diperlukan',
          'Aktifkan izin galeri untuk memilih foto.',
        );
        return null;
      }
    }

    if (!picker.launchImageLibraryAsync) return null;

    let result: NativePickerResult | undefined;
    try {
      result = await picker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    } catch {
      result = await picker.launchImageLibraryAsync({
        allowsEditing: false,
        quality: 0.8,
      });
    }

    if (!result || result.canceled || result.cancelled) return null;
    const asset =
      result.assets?.[0] ?? (result.uri ? { uri: result.uri } : null);
    if (!asset?.uri) return null;

    return {
      uri: asset.uri,
      fileName: asset.fileName ?? 'gallery-photo.jpg',
      mimeType: asset.mimeType ?? 'image/jpeg',
      fileSize: asset.fileSize ?? 250000,
      width: asset.width ?? 800,
      height: asset.height ?? 800,
    };
  } catch (error) {
    console.warn('ImagePicker error:', error);
    Alert.alert(
      'Gagal Memuat Foto',
      'Terjadi kesalahan saat membuka galeri atau kamera. Coba lagi.',
    );
    return null;
  }
}

export function ImageSourceSheet({
  visible,
  onClose,
  onImageSelected,
  title,
  subtitle,
  testIDPrefix = 'image-source',
  backdropTestID,
  customPickerLauncher,
  allowFallbackUri = false,
}: ImageSourceSheetProps) {
  const { language } = useLanguage();
  const { palette, reduceMotion } = useAppearance();
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const applyCandidate = (candidate: ImageCandidateInput) => {
    setErrorMessage(null);
    const result = validateStrictImageAsset(candidate);
    if (!result.valid || !result.sanitizedUri) {
      setErrorMessage(
        language === 'en'
          ? result.errorMessageEn ?? 'Please select a valid image (JPG, PNG, WEBP, <= 5 MB).'
          : result.errorMessageId ?? 'Silakan pilih file gambar valid (JPG, PNG, WEBP, maks 5 MB).',
      );
      return;
    }
    onClose();
    onImageSelected(result.sanitizedUri);
  };

  const handlePickOnWeb = (mode: ImageSourceMode) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    if (mode === 'camera') {
      input.setAttribute('capture', 'environment');
    }
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const buffer = reader.result as ArrayBuffer;
        const headerBytes = new Uint8Array(buffer.slice(0, 24));
        const blobUrl = URL.createObjectURL(file);
        applyCandidate({
          uri: blobUrl.startsWith('blob:') ? `file:///${file.name}` : blobUrl,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          headerBytes,
        });
      };
      reader.readAsArrayBuffer(file);
    };
    input.click();
  };

  const handlePick = async (mode: ImageSourceMode) => {
    setErrorMessage(null);

    if (customPickerLauncher) {
      try {
        setBusy(true);
        const candidate = await customPickerLauncher(mode);
        if (candidate) {
          applyCandidate(candidate);
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Photo selection failed.');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      onClose();
      handlePickOnWeb(mode);
      return;
    }

    const picker = getNativePicker();
    if (!picker) {
      if (allowFallbackUri) {
        applyCandidate({
          uri: `file:///${testIDPrefix}-${mode}-${Date.now()}.jpg`,
          fileName: `${testIDPrefix}-${mode}.jpg`,
          mimeType: 'image/jpeg',
          fileSize: 1024 * 50,
        });
      } else {
        setErrorMessage(
          language === 'en'
            ? 'Camera and gallery are unavailable on this device.'
            : 'Kamera dan galeri tidak tersedia di perangkat ini.',
        );
      }
      return;
    }

    onClose();
    await new Promise((resolve) => setTimeout(resolve, 150));

    setBusy(true);
    try {
      const candidate = await pickImageSafely(mode);
      if (candidate) {
        applyCandidate(candidate);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      animationType={reduceMotion ? 'none' : 'fade'}
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={onClose}
        testID={backdropTestID ?? `${testIDPrefix}-menu-backdrop`}
      >
        <Pressable
          style={[
            styles.menuSheet,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
          onPress={(e) => e.stopPropagation()}
          testID={`${testIDPrefix}-action-menu`}
        >
          <View style={[styles.sheetHandle, { backgroundColor: palette.border }]} />
          <Text style={[styles.sheetTitle, { color: palette.text }]}>
            {title ?? (language === 'en' ? 'Add a Photo' : 'Tambahkan Foto')}
          </Text>
          <Text style={[styles.sheetSubtitle, { color: palette.textMuted }]}>
            {subtitle ??
              (language === 'en'
                ? 'Take a new photo or pick one from your gallery.'
                : 'Ambil foto baru atau pilih dari galeri Anda.')}
          </Text>

          {busy ? (
            <View style={styles.busyWrap}>
              <ActivityIndicator size="small" color={palette.primary} />
            </View>
          ) : (
            <View style={styles.optionsList}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void handlePick('camera');
                }}
                style={({ pressed }) => [
                  styles.optionBtn,
                  { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
                  pressed && styles.optionBtnPressed,
                ]}
                testID={`${testIDPrefix}-take-photo-btn`}
              >
                <View style={styles.optionIconCircle}>
                  <Camera color={palette.primary} size={22} />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={[styles.optionTitle, { color: palette.text }]}>
                    {language === 'en' ? 'Take Photo' : 'Ambil Foto'}
                  </Text>
                  <Text style={[styles.optionHint, { color: palette.textMuted }]}>
                    {language === 'en' ? 'Use your camera now' : 'Gunakan kamera sekarang'}
                  </Text>
                </View>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void handlePick('gallery');
                }}
                style={({ pressed }) => [
                  styles.optionBtn,
                  { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
                  pressed && styles.optionBtnPressed,
                ]}
                testID={`${testIDPrefix}-choose-gallery-btn`}
              >
                <View style={styles.optionIconCircle}>
                  <ImageIcon color={palette.primary} size={22} />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={[styles.optionTitle, { color: palette.text }]}>
                    {language === 'en' ? 'Choose from Gallery' : 'Pilih dari Galeri'}
                  </Text>
                  <Text style={[styles.optionHint, { color: palette.textMuted }]}>
                    {language === 'en'
                      ? 'Select an existing photo (JPG, PNG, WEBP)'
                      : 'Pilih foto dari perangkat (JPG, PNG, WEBP)'}
                  </Text>
                </View>
              </Pressable>
            </View>
          )}

          {errorMessage ? (
            <View style={styles.errorBox} testID={`${testIDPrefix}-picker-error`}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={[styles.cancelBtn, { borderColor: palette.border }]}
            testID={`cancel-${testIDPrefix}-menu-btn`}
          >
            <Text style={[styles.cancelBtnText, { color: palette.text }]}>
              {language === 'en' ? 'Cancel' : 'Batal'}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  busyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  cancelBtn: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: spacing.lg,
    minHeight: 46,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  errorBox: {
    backgroundColor: '#FBEDEA',
    borderColor: colors.danger,
    borderRadius: radii.sm,
    borderWidth: 1,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  menuSheet: {
    alignSelf: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxWidth: 520,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    width: '100%',
  },
  modalOverlay: {
    backgroundColor: 'rgba(15, 20, 25, 0.55)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  optionBtn: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  optionBtnPressed: {
    opacity: 0.8,
  },
  optionHint: {
    fontSize: 12,
    marginTop: 2,
  },
  optionIcon: {
    fontSize: 20,
  },
  optionIconCircle: {
    alignItems: 'center',
    backgroundColor: colors.greenSoft,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  optionsList: {
    gap: spacing.sm,
  },
  sheetHandle: {
    alignSelf: 'center',
    borderRadius: radii.pill,
    height: 4,
    marginBottom: spacing.md,
    width: 40,
  },
  sheetSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.lg,
    marginTop: 4,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});
