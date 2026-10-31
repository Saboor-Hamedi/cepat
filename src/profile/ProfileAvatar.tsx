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

import { Avatar } from '../components/marketplace-ui';
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

function getNativePicker(): ExponentImagePickerModule | null {
  try {
    return requireOptionalNativeModule<ExponentImagePickerModule>('ExponentImagePicker');
  } catch {
    return null;
  }
}

export async function pickImageSafely(
  source: 'camera' | 'gallery',
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
        // Fallback on Android/Xiaomi devices when cropper or mediaTypes option rejects
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
    } else {
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
        // Fallback on Android/Xiaomi devices when cropper or mediaTypes option rejects
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
    }
  } catch (error) {
    console.warn('ImagePicker error:', error);
    Alert.alert(
      'Gagal Memuat Foto',
      'Terjadi kesalahan saat membuka galeri atau kamera. Coba lagi.',
    );
    return null;
  }
}

export interface ProfileAvatarProps {
  uri?: string;
  name: string;
  size?: number;
  editable?: boolean;
  onImageSelected?: (uri: string) => void;
  customPickerLauncher?: (mode: 'gallery' | 'camera') => Promise<ImageCandidateInput | null>;
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
  const { palette, reduceMotion } = useAppearance();
  const [menuVisible, setMenuVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const applyCandidate = (candidate: ImageCandidateInput) => {
    setErrorMessage(null);
    const result = validateStrictImageAsset(candidate);
    if (!result.valid || !result.sanitizedUri) {
      const msg =
        language === 'en'
          ? result.errorMessageEn ?? 'Please select a valid image (JPG, PNG, WEBP, <= 5 MB).'
          : result.errorMessageId ?? 'Silakan pilih file gambar valid (JPG, PNG, WEBP, maks 5 MB).';
      setErrorMessage(msg);
      return;
    }
    setMenuVisible(false);
    onImageSelected?.(result.sanitizedUri);
  };

  const handlePick = async (mode: 'gallery' | 'camera') => {
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

    // Always close the action sheet / dropdown modal first and wait 150ms
    // before invoking the native picker on Android/Xiaomi devices.
    setMenuVisible(false);
    await new Promise((resolve) => setTimeout(resolve, 150));

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
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
      return;
    }

    const picker = getNativePicker();
    if (!picker) {
      applyCandidate({
        uri: `file:///profile-${mode}-${Date.now()}.jpg`,
        fileName: `profile-${mode}.jpg`,
        mimeType: 'image/jpeg',
        fileSize: 1024 * 50,
      });
      return;
    }

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

  const handleAvatarPress = () => {
    if (editable) {
      setErrorMessage(null);
      setMenuVisible(true);
    }
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
            <Text style={styles.cameraBadgeIcon}>📷</Text>
          </View>
        )}
      </Pressable>

      <Modal
        animationType={reduceMotion ? 'none' : 'fade'}
        transparent
        visible={menuVisible}
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setMenuVisible(false)}
          testID={`${testID}-menu-backdrop`}
        >
          <Pressable
            style={[
              styles.menuSheet,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
            onPress={(e) => e.stopPropagation()}
            testID="avatar-action-menu"
          >
            <View style={[styles.sheetHandle, { backgroundColor: palette.border }]} />
            <Text style={[styles.sheetTitle, { color: palette.text }]}>
              {language === 'en' ? 'Update Profile Photo' : 'Ubah Foto Profil'}
            </Text>
            <Text style={[styles.sheetSubtitle, { color: palette.textMuted }]}>
              {language === 'en'
                ? 'Choose a clear photo so customers and technicians recognize you.'
                : 'Pilih foto yang jelas agar mudah dikenali.'}
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
                  testID="avatar-take-photo-btn"
                >
                  <View style={styles.optionIconCircle}>
                    <Text style={styles.optionIcon}>📸</Text>
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
                  testID="avatar-choose-gallery-btn"
                >
                  <View style={styles.optionIconCircle}>
                    <Text style={styles.optionIcon}>🖼️</Text>
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
              <View style={styles.errorBox} testID="avatar-picker-error">
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={() => setMenuVisible(false)}
              style={[styles.cancelBtn, { borderColor: palette.border }]}
              testID="cancel-avatar-menu-btn"
            >
              <Text style={[styles.cancelBtnText, { color: palette.text }]}>
                {language === 'en' ? 'Cancel' : 'Batal'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTouch: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarPressed: {
    opacity: 0.85,
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
  modalOverlay: {
    backgroundColor: 'rgba(15, 20, 25, 0.55)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  menuSheet: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxWidth: 520,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    width: '100%',
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: '#CFD9DE',
    borderRadius: radii.pill,
    height: 4,
    marginBottom: spacing.md,
    width: 40,
  },
  sheetTitle: {
    color: '#0F1419',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    color: '#536471',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.lg,
    marginTop: 4,
  },
  busyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  optionsList: {
    gap: spacing.sm,
  },
  optionBtn: {
    alignItems: 'center',
    backgroundColor: '#F7F9F9',
    borderColor: '#EFF3F4',
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
  optionIconCircle: {
    alignItems: 'center',
    backgroundColor: colors.greenSoft,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  optionIcon: {
    fontSize: 20,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    color: '#0F1419',
    fontSize: 15,
    fontWeight: '700',
  },
  optionHint: {
    color: '#536471',
    fontSize: 12,
    marginTop: 2,
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
  cancelBtn: {
    alignItems: 'center',
    borderColor: '#CFD9DE',
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: spacing.lg,
    minHeight: 46,
  },
  cancelBtnText: {
    color: '#0F1419',
    fontSize: 14,
    fontWeight: '800',
  },
});
