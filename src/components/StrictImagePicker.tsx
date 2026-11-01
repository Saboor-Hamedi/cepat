import { requireOptionalNativeModule } from 'expo-modules-core';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppearance } from '../context/AppearanceContext';
import { useLanguage } from '../i18n/locale';
import { radii, spacing } from '../theme/tokens';
import {
  validateStrictImageAsset,
  type ImageCandidateInput,
} from '../utils/imageValidator';
import { Avatar } from './marketplace-ui';

interface NativeImagePickerAsset {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  type?: string | null;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
}

interface NativeImagePickerResult {
  canceled?: boolean;
  cancelled?: boolean;
  assets?: NativeImagePickerAsset[];
  uri?: string;
  width?: number;
  height?: number;
  type?: string;
}

interface NativePermissionResponse {
  status?: string;
  granted?: boolean;
}

interface ExponentImagePickerModule {
  requestMediaLibraryPermissionsAsync?: (
    writeOnly?: boolean,
  ) => Promise<NativePermissionResponse>;
  requestCameraPermissionsAsync?: () => Promise<NativePermissionResponse>;
  launchImageLibraryAsync?: (
    options: Record<string, unknown>,
  ) => Promise<NativeImagePickerResult>;
  launchCameraAsync?: (
    options: Record<string, unknown>,
  ) => Promise<NativeImagePickerResult>;
}

function getNativeImagePicker(): ExponentImagePickerModule | null {
  try {
    return requireOptionalNativeModule<ExponentImagePickerModule>('ExponentImagePicker');
  } catch {
    return null;
  }
}

export interface StrictImagePickerProps {
  currentUri?: string;
  displayName?: string;
  label?: string;
  displayMode?: 'inline' | 'actions';
  onImageValidated: (uri: string) => void;
  testIDPrefix?: string;
  /**
   * Optional custom launcher for automated tests. In production, the native
   * device Gallery and Camera are launched directly.
   */
  customPickerLauncher?: (
    mode: 'gallery' | 'camera',
  ) => Promise<ImageCandidateInput | null>;
}

export function StrictImagePicker({
  currentUri,
  displayName = 'Cepat',
  label,
  displayMode = 'inline',
  onImageValidated,
  testIDPrefix = 'strict-image',
  customPickerLauncher,
}: StrictImagePickerProps) {
  const { language } = useLanguage();
  const { palette, scaleFont } = useAppearance();
  const [busyMode, setBusyMode] = useState<'gallery' | 'camera' | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationSuccess, setValidationSuccess] = useState<string | null>(null);

  const applyCandidate = (candidate: ImageCandidateInput): boolean => {
    setValidationError(null);
    setValidationSuccess(null);

    const result = validateStrictImageAsset(candidate);
    if (!result.valid || !result.sanitizedUri) {
      setValidationError(
        language === 'en'
          ? result.errorMessageEn ?? 'Only genuine image files (JPG, PNG, WEBP, HEIC) are allowed.'
          : result.errorMessageId ?? 'Hanya file gambar asli (JPG, PNG, WEBP, HEIC) yang diizinkan.',
      );
      return false;
    }

    onImageValidated(result.sanitizedUri);
    setValidationSuccess(
      language === 'en'
        ? `Photo verified (${(result.detectedFormat ?? 'image').toUpperCase()}).`
        : `Foto terverifikasi (${(result.detectedFormat ?? 'image').toUpperCase()}).`,
    );
    return true;
  };

  const pickOnWeb = (mode: 'gallery' | 'camera') => {
    if (typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/heic';
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
      reader.readAsArrayBuffer(file.slice(0, 24));
    };
    input.click();
  };

  const launchNativePicker = async (mode: 'gallery' | 'camera') => {
    setValidationError(null);
    setValidationSuccess(null);

    if (customPickerLauncher) {
      setBusyMode(mode);
      try {
        const candidate = await customPickerLauncher(mode);
        if (candidate) {
          applyCandidate(candidate);
        }
      } finally {
        setBusyMode(null);
      }
      return;
    }

    if (Platform.OS === 'web') {
      pickOnWeb(mode);
      return;
    }

    const nativePicker = getNativeImagePicker();
    if (!nativePicker) {
      setValidationError(
        language === 'en'
          ? 'Device camera/gallery module is unavailable in this environment.'
          : 'Modul galeri/kamera perangkat tidak tersedia di lingkungan ini.',
      );
      return;
    }

    setBusyMode(mode);
    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (mode === 'gallery') {
        if (nativePicker.requestMediaLibraryPermissionsAsync) {
          const perm = await nativePicker.requestMediaLibraryPermissionsAsync(false);
          if (perm && perm.granted === false && perm.status !== 'granted') {
            setValidationError(
              language === 'en'
                ? 'Gallery permission is required to select a photo.'
                : 'Izin akses galeri diperlukan untuk memilih foto.',
            );
            return;
          }
        }
        if (!nativePicker.launchImageLibraryAsync) {
          setValidationError(
            language === 'en' ? 'Gallery is unavailable.' : 'Galeri tidak tersedia.',
          );
          return;
        }
        let res: NativeImagePickerResult;
        try {
          res = await nativePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
        } catch {
          res = await nativePicker.launchImageLibraryAsync({
            allowsEditing: false,
            quality: 0.8,
          });
        }
        if (res.canceled || res.cancelled) return;
        const asset = res.assets?.[0] ?? (res.uri ? { uri: res.uri, width: res.width, height: res.height, type: res.type } : null);
        if (!asset?.uri) return;

        if (asset.type && asset.type !== 'image') {
          setValidationError(
            language === 'en'
              ? 'Only image files are allowed. Videos and documents are blocked.'
              : 'Hanya file gambar yang diizinkan. Video dan dokumen ditolak.',
          );
          return;
        }

        const inferredName = asset.fileName || asset.uri.split('?')[0].split('/').pop() || 'photo.jpg';
        const inferredMime =
          asset.mimeType ||
          (inferredName.toLowerCase().endsWith('.png')
            ? 'image/png'
            : inferredName.toLowerCase().endsWith('.webp')
              ? 'image/webp'
              : inferredName.toLowerCase().endsWith('.heic')
                ? 'image/heic'
                : 'image/jpeg');

        applyCandidate({
          uri: asset.uri,
          fileName: inferredName,
          mimeType: inferredMime,
          fileSize: asset.fileSize ?? 250000,
          width: asset.width ?? 800,
          height: asset.height ?? 800,
        });
      } else {
        if (nativePicker.requestCameraPermissionsAsync) {
          const perm = await nativePicker.requestCameraPermissionsAsync();
          if (perm && perm.granted === false && perm.status !== 'granted') {
            setValidationError(
              language === 'en'
                ? 'Camera permission is required to take a photo.'
                : 'Izin akses kamera diperlukan untuk mengambil foto.',
            );
            return;
          }
        }
        if (!nativePicker.launchCameraAsync) {
          setValidationError(
            language === 'en' ? 'Camera is unavailable.' : 'Kamera tidak tersedia.',
          );
          return;
        }
        let res: NativeImagePickerResult;
        try {
          res = await nativePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
        } catch {
          res = await nativePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 0.8,
          });
        }
        if (res.canceled || res.cancelled) return;
        const asset = res.assets?.[0] ?? (res.uri ? { uri: res.uri, width: res.width, height: res.height, type: res.type } : null);
        if (!asset?.uri) return;

        const inferredName = asset.fileName || asset.uri.split('?')[0].split('/').pop() || 'camera.jpg';
        const inferredMime = asset.mimeType || 'image/jpeg';

        applyCandidate({
          uri: asset.uri,
          fileName: inferredName,
          mimeType: inferredMime,
          fileSize: asset.fileSize ?? 250000,
          width: asset.width ?? 800,
          height: asset.height ?? 800,
        });
      }
    } catch {
      setValidationError(
        language === 'en'
          ? 'Could not open camera or gallery. Please check device permissions.'
          : 'Tidak dapat membuka kamera atau galeri. Periksa izin perangkat Anda.',
      );
    } finally {
      setBusyMode(null);
    }
  };

  return (
    <View style={styles.container} testID={`${testIDPrefix}-picker`}>
      {label ? <Text style={[styles.label, { color: palette.text, fontSize: scaleFont(13) }]}>{label}</Text> : null}

      <View style={displayMode === 'actions' ? styles.actionGroup : styles.row}>
        {displayMode === 'inline' ? (
          <View testID={`${testIDPrefix}-avatar`}>
            <Avatar uri={currentUri || undefined} name={displayName} size={56} />
          </View>
        ) : null}
        <View style={displayMode === 'actions' ? styles.actionGroup : styles.buttonGroup}>
          <Pressable
            accessibilityRole="button"
            disabled={busyMode !== null}
            onPress={() => {
              void launchNativePicker('gallery');
            }}
            style={[
              displayMode === 'actions' ? styles.actionBtn : styles.galleryBtn,
              { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
            ]}
            testID={`${testIDPrefix}-gallery-btn`}
          >
            {busyMode === 'gallery' ? (
              <ActivityIndicator size="small" color={palette.primary} />
            ) : (
              <Text style={[styles.galleryBtnText, { color: palette.text, fontSize: scaleFont(13) }]}>
                {language === 'en' ? 'Choose from Gallery' : 'Pilih dari Galeri'}
              </Text>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={busyMode !== null}
            onPress={() => {
              void launchNativePicker('camera');
            }}
            style={[
              displayMode === 'actions' ? styles.actionBtn : styles.cameraBtn,
              { backgroundColor: palette.primary, borderColor: palette.primary },
            ]}
            testID={`${testIDPrefix}-camera-btn`}
          >
            {busyMode === 'camera' ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={[styles.cameraBtnText, { fontSize: scaleFont(13) }]}>
                {language === 'en' ? 'Take Photo' : 'Ambil Foto'}
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      {validationError ? (
        <View style={[styles.errorBanner, { backgroundColor: `${palette.danger}18`, borderColor: palette.danger }]} testID={`${testIDPrefix}-error`}>
          <Text style={[styles.errorBannerText, { color: palette.danger, fontSize: scaleFont(12) }]}>{validationError}</Text>
        </View>
      ) : null}

      {validationSuccess ? (
        <View style={styles.srOnly} testID={`${testIDPrefix}-success`}>
          <Text>{validationSuccess}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  actionGroup: {
    gap: spacing.sm,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  buttonGroup: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  galleryBtn: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  actionBtn: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  galleryBtnText: {
    fontWeight: '700',
    textAlign: 'center',
  },
  cameraBtn: {
    alignItems: 'center',
    borderRadius: radii.md,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  cameraBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  srOnly: {
    height: 0,
    opacity: 0,
    position: 'absolute',
    width: 0,
  },
  errorBanner: {
    borderRadius: radii.sm,
    borderWidth: 1,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  errorBannerText: {
    fontWeight: '600',
  },
});
