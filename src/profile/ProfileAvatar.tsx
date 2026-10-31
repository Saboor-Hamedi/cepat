import { requireOptionalNativeModule } from 'expo-modules-core';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Avatar } from '../components/marketplace-ui';
import { useLanguage } from '../i18n/locale';
import { colors, radii, spacing } from '../theme/tokens';
import {
  validateStrictImageAsset,
  type ImageCandidateInput,
} from '../utils/imageValidator';

interface ExponentImagePickerModule {
  requestMediaLibraryPermissionsAsync?: (writeOnly?: boolean) => Promise<{ status?: string; granted?: boolean }>;
  requestCameraPermissionsAsync?: () => Promise<{ status?: string; granted?: boolean }>;
  launchImageLibraryAsync?: (options: Record<string, unknown>) => Promise<{
    canceled?: boolean;
    cancelled?: boolean;
    assets?: { uri: string; fileName?: string | null; mimeType?: string | null; fileSize?: number | null }[];
  }>;
  launchCameraAsync?: (options: Record<string, unknown>) => Promise<{
    canceled?: boolean;
    cancelled?: boolean;
    assets?: { uri: string; fileName?: string | null; mimeType?: string | null; fileSize?: number | null }[];
  }>;
}

function getNativePicker(): ExponentImagePickerModule | null {
  try {
    return requireOptionalNativeModule<ExponentImagePickerModule>('ExponentImagePicker');
  } catch {
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
  const [menuVisible, setMenuVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const applyCandidate = (candidate: ImageCandidateInput) => {
    setErrorMessage(null);
    const result = validateStrictImageAsset(candidate);
    if (!result.valid || !result.sanitizedUri) {
      setErrorMessage(
        language === 'en'
          ? result.errorMessageEn ?? 'Please select a valid image (JPG, PNG, WEBP).'
          : result.errorMessageId ?? 'Silakan pilih file gambar valid (JPG, PNG, WEBP).',
      );
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
      // Direct mock/fallback candidate
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
      if (mode === 'gallery') {
        const perm = await picker.requestMediaLibraryPermissionsAsync?.(false);
        if (perm && !perm.granted) {
          setErrorMessage(language === 'en' ? 'Gallery permission denied.' : 'Izin galeri ditolak.');
          return;
        }
        const res = await picker.launchImageLibraryAsync?.({
          mediaTypes: 'images',
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
        });
        if (res && !res.canceled && res.assets?.[0]) {
          applyCandidate({
            uri: res.assets[0].uri,
            fileName: res.assets[0].fileName,
            mimeType: res.assets[0].mimeType,
            fileSize: res.assets[0].fileSize,
          });
        }
      } else {
        const perm = await picker.requestCameraPermissionsAsync?.();
        if (perm && !perm.granted) {
          setErrorMessage(language === 'en' ? 'Camera permission denied.' : 'Izin kamera ditolak.');
          return;
        }
        const res = await picker.launchCameraAsync?.({
          mediaTypes: 'images',
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
        });
        if (res && !res.canceled && res.assets?.[0]) {
          applyCandidate({
            uri: res.assets[0].uri,
            fileName: res.assets[0].fileName,
            mimeType: res.assets[0].mimeType,
            fileSize: res.assets[0].fileSize,
          });
        }
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Photo selection failed.');
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

        {/* Camera indicator badge for editable mode */}
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

      {/* Sleek Bottom Sheet / Popup Menu (X.com / Twitter Style) */}
      <Modal
        animationType="fade"
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
            style={styles.sheetContent}
            onPress={(e) => e.stopPropagation()}
            testID={`${testID}-sheet-content`}
          >
            <View style={styles.dragHandle} />
            <Text style={styles.sheetTitle}>
              {language === 'en' ? 'Profile Picture' : 'Foto Profil'}
            </Text>

            {errorMessage ? (
              <Text style={styles.sheetErrorText}>{errorMessage}</Text>
            ) : null}

            {busy ? (
              <View style={styles.busyContainer}>
                <ActivityIndicator size="small" color={colors.greenDark} />
              </View>
            ) : (
              <View style={styles.actionsList}>
                {/* Take Photo action */}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void handlePick('camera');
                  }}
                  style={styles.actionItem}
                  testID="avatar-take-photo-btn"
                >
                  <Text style={styles.actionIcon}>📸</Text>
                  <View style={styles.actionCopy}>
                    <Text style={styles.actionLabel}>
                      {language === 'en' ? 'Take Photo' : 'Ambil Foto'}
                    </Text>
                    <Text style={styles.actionSub}>
                      {language === 'en' ? 'Use device camera' : 'Gunakan kamera perangkat'}
                    </Text>
                  </View>
                </Pressable>

                {/* Choose from Gallery action */}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void handlePick('gallery');
                  }}
                  style={styles.actionItem}
                  testID="avatar-choose-gallery-btn"
                >
                  <Text style={styles.actionIcon}>🖼️</Text>
                  <View style={styles.actionCopy}>
                    <Text style={styles.actionLabel}>
                      {language === 'en' ? 'Choose from Gallery' : 'Pilih dari Galeri'}
                    </Text>
                    <Text style={styles.actionSub}>
                      {language === 'en' ? 'Upload from photo library' : 'Unggah dari galeri foto'}
                    </Text>
                  </View>
                </Pressable>
              </View>
            )}

            {/* Cancel Button */}
            <Pressable
              accessibilityRole="button"
              onPress={() => setMenuVisible(false)}
              style={styles.cancelBtn}
              testID="cancel-avatar-menu-btn"
            >
              <Text style={styles.cancelBtnText}>
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
    position: 'relative',
  },
  avatarTouch: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    position: 'relative',
  },
  avatarPressed: {
    opacity: 0.85,
  },
  cameraBadge: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderColor: '#FFFFFF',
    borderWidth: 2,
    bottom: -2,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    zIndex: 10,
  },
  cameraBadgeIcon: {
    fontSize: 11,
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxWidth: 480,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    width: '100%',
  },
  dragHandle: {
    alignSelf: 'center',
    backgroundColor: '#CBD5E1',
    borderRadius: 3,
    height: 4,
    marginBottom: spacing.md,
    marginTop: 4,
    width: 36,
  },
  sheetTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  sheetErrorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  busyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  actionsList: {
    gap: spacing.xs,
  },
  actionItem: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  actionIcon: {
    fontSize: 22,
  },
  actionCopy: {
    flex: 1,
  },
  actionLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  actionSub: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  cancelBtn: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingVertical: 12,
  },
  cancelBtnText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
});
