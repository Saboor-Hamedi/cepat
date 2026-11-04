import { Briefcase, Camera } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../../auth/AuthProvider';
import { useAppearance } from '../../context/AppearanceContext';
import { containsBlockedContactOrUrl } from '../../data/marketplaceStore';
import { useLanguage } from '../../i18n/locale';
import { ICON_SIZE, ICON_STROKE } from '../../theme/icons';
import { colors, radii, spacing } from '../../theme/tokens';
import { font } from '../../theme/typography';
import { StrictImagePicker } from '../StrictImagePicker';
import { TechnicianPostImagePreview } from './TechnicianPostImagePreview';

export interface TechnicianPostComposerProps {
  onCreatePost: (input: {
    caption: string;
    imageUri?: string;
    mediaUrls?: string[];
    isServicePost: boolean;
  }) => Promise<void>;
  technicianProfile?: {
    id: string;
    displayName?: string;
    avatarUri?: string;
  };
  customImageLauncher?: () => Promise<string | null>;
}

const MAX_POST_CHARS = 200;
const MAX_POST_IMAGES = 4;

export function TechnicianPostComposer({
  onCreatePost,
  technicianProfile,
  customImageLauncher,
}: TechnicianPostComposerProps) {
  const { language } = useLanguage();
  const { user, roles } = useAuth();
  const { palette, reduceMotion, scaleFont } = useAppearance();

  const [caption, setCaption] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isServicePost, setIsServicePost] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Section 6 Authorization Check:
  // If technicianProfile is provided and user is authenticated as a different account, do not render composer
  if (technicianProfile && user) {
    const isDifferentUser =
      user.id !== technicianProfile.id &&
      !technicianProfile.id.startsWith('demo-');
    if (isDifferentUser && roles && !roles.includes('technician')) {
      return null;
    }
  }

  const trimmedCaption = caption.trim();
  const hasContent = trimmedCaption.length > 0 || images.length > 0;
  const isOverCharLimit = caption.length > MAX_POST_CHARS;
  const hasUrl = containsBlockedContactOrUrl(trimmedCaption);

  const canSubmit = hasContent && !isOverCharLimit && !hasUrl && !busy;

  const handleTextChange = (text: string) => {
    // Strictly cap at MAX_POST_CHARS unless user somehow bypasses (then isOverCharLimit handles it)
    setCaption(text);
    if (containsBlockedContactOrUrl(text)) {
      setError(
        language === 'en'
          ? 'Sharing links or contact information is prohibited for security.'
          : 'Berbagi tautan atau kontak dilarang demi keamanan bersama.',
      );
    } else if (error) {
      setError(null);
    }
  };

  const handleAddImage = async () => {
    if (images.length >= MAX_POST_IMAGES) {
      setError(
        language === 'en'
          ? `Maximum of ${MAX_POST_IMAGES} photos per post.`
          : `Maksimal ${MAX_POST_IMAGES} foto per postingan.`,
      );
      return;
    }

    if (customImageLauncher) {
      try {
        const picked = await customImageLauncher();
        if (picked) {
          setImages((prev) => [...prev, picked].slice(0, MAX_POST_IMAGES));
          setError(null);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to select image.');
      }
      return;
    }

    setShowPickerModal(true);
  };

  const handleImageValidated = (uri: string) => {
    if (images.length < MAX_POST_IMAGES) {
      setImages((prev) => [...prev, uri]);
      setError(null);
    }
    setShowPickerModal(false);
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handlePublish = async () => {
    if (!canSubmit) return;

    if (hasUrl) {
      setError(
        language === 'en'
          ? 'Sharing links or contact information is prohibited for security.'
          : 'Berbagi tautan atau kontak dilarang demi keamanan bersama.',
      );
      return;
    }

    if (isOverCharLimit) {
      setError(
        language === 'en'
          ? `Character limit exceeded by ${caption.length - MAX_POST_CHARS}.`
          : `Melebihi batas karakter sebanyak ${caption.length - MAX_POST_CHARS}.`,
      );
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await onCreatePost({
        caption: trimmedCaption,
        imageUri: images[0],
        mediaUrls: images,
        isServicePost,
      });
      setCaption('');
      setImages([]);
      setIsServicePost(false);
      setShowPickerModal(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to create post.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[
        styles.card,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
      testID="technician-post-composer"
    >
      {/* Unified Textarea Box with Inner Footer */}
      <View
        style={[
          styles.textareaContainer,
          { backgroundColor: palette.inputBg, borderColor: palette.border },
        ]}
      >
        <TextInput
          multiline
          maxLength={MAX_POST_CHARS}
          onChangeText={handleTextChange}
          placeholder={
            language === 'en'
              ? "What's on your mind?"
              : 'Apa yang Anda pikirkan?'
          }
          placeholderTextColor={palette.textMuted}
          style={[
            styles.textInput,
            {
              color: palette.text,
              fontSize: scaleFont(font.title),
              lineHeight: scaleFont(22),
            },
          ]}
          testID="create-post-caption-input"
          value={caption}
        />

        {/* Footer inside the textarea container */}
        <View
          style={[
            styles.textareaFooter,
            { borderTopColor: palette.border },
          ]}
        >
          {/* Left: Photo Button & Service Toggle */}
          <View style={styles.footerLeftActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                language === 'en' ? 'Attach photo' : 'Lampirkan foto'
              }
              disabled={busy || images.length >= MAX_POST_IMAGES}
              onPress={handleAddImage}
              style={[
                styles.mediaBtn,
                { backgroundColor: palette.surface, borderColor: palette.border },
                images.length >= MAX_POST_IMAGES && styles.mediaBtnDisabled,
              ]}
              testID="add-image-btn"
            >
              <View style={styles.mediaActionContent}>
                <View
                  testID="toggle-post-photo-picker-btn"
                  style={[
                    styles.mediaIconCanvas,
                    { backgroundColor: palette.primarySoft },
                  ]}
                >
                  <Camera
                    color={palette.primary}
                    size={ICON_SIZE}
                    strokeWidth={ICON_STROKE}
                  />
                  {images.length > 0 && (
                    <View style={[styles.mediaCountBadge, { backgroundColor: palette.primary }]}>
                      <Text style={styles.mediaCountBadgeText}>
                        {images.length}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>

            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: isServicePost }}
              disabled={busy}
              onPress={() => setIsServicePost((value) => !value)}
              style={[
                styles.servicePillToggle,
                {
                  backgroundColor: isServicePost ? palette.primarySoft : palette.surface,
                  borderColor: isServicePost ? palette.primary : palette.border,
                },
              ]}
              testID="service-post-toggle"
            >
              <Briefcase
                size={ICON_SIZE} strokeWidth={ICON_STROKE}
                color={isServicePost ? palette.primary : palette.textMuted}
              />
              <Text
                style={[
                  styles.servicePillText,
                  {
                    color: isServicePost ? palette.primary : palette.textMuted,
                    fontSize: scaleFont(font.body),
                  },
                ]}
              >
                {language === 'en' ? 'Offer Service' : 'Tawarkan Layanan'}
              </Text>
            </Pressable>
          </View>

          {/* Right: Live Character counter & Post button */}
          <View style={styles.footerRightActions}>
            {(caption.length > 0 || isOverCharLimit) && (
              <Text
                style={[
                  styles.charCounter,
                  {
                    color: isOverCharLimit
                      ? palette.danger
                      : caption.length > 160
                        ? '#F59E0B'
                        : palette.textMuted,
                    fontWeight: isOverCharLimit ? '700' : '500',
                  },
                ]}
                testID={isOverCharLimit ? 'char-count-warning' : 'char-counter'}
              >
                {MAX_POST_CHARS - caption.length}
              </Text>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={language === 'en' ? 'Post' : 'Posting'}
              disabled={!canSubmit}
              onPress={() => {
                void handlePublish();
              }}
              style={[
                styles.postBtn,
                { backgroundColor: palette.primary },
                !canSubmit && styles.postBtnDisabled,
              ]}
              testID="submit-new-post-btn"
            >
              {busy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={[styles.postBtnText, { fontSize: scaleFont(font.label) }]}>
                  {language === 'en' ? 'Post' : 'Posting'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Image previews stay below the actions so the Post button never shifts */}
        {images.length > 0 && (
          <View
            style={[
              styles.imagesInsideContainer,
              { borderTopColor: palette.border },
            ]}
          >
            <TechnicianPostImagePreview
              images={images}
              onRemoveImage={handleRemoveImage}
            />
          </View>
        )}
      </View>

      {/* Error / Validation Warning */}
      {error ? (
        <Text
          style={[styles.errorText, { color: palette.danger }]}
          testID="create-post-error"
        >
          {error}
        </Text>
      ) : null}

      {/* Modal Photo Picker */}
      <Modal
        animationType={reduceMotion ? 'none' : 'slide'}
        onRequestClose={() => setShowPickerModal(false)}
        transparent
        visible={showPickerModal}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={language === 'en' ? 'Close photo options' : 'Tutup pilihan foto'}
          onPress={() => setShowPickerModal(false)}
          style={styles.pickerOverlay}
          testID="composer-image-picker-backdrop"
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[
              styles.pickerSheet,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
            testID="composer-image-picker-wrap"
          >
            <View style={[styles.pickerHandle, { backgroundColor: palette.border }]} />
            <Text style={[styles.pickerTitle, { color: palette.text, fontSize: scaleFont(font.heading) }]}>
              {language === 'en' ? 'Add Photo to Post' : 'Tambah Foto ke Postingan'}
            </Text>
            <Text style={[styles.pickerSubtitle, { color: palette.textMuted, fontSize: scaleFont(font.label) }]}>
              {language === 'en'
                ? 'Take a work photo or choose from your device gallery.'
                : 'Ambil foto pekerjaan atau pilih dari galeri perangkat Anda.'}
            </Text>
            <StrictImagePicker
              displayMode="actions"
              onImageValidated={handleImageValidated}
              testIDPrefix="post-image-picker"
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowPickerModal(false)}
              style={[styles.cancelPickerBtn, { borderColor: palette.border }]}
            >
              <Text
                style={[
                  styles.cancelPickerBtnText,
                  { color: palette.textMuted, fontSize: scaleFont(font.label) },
                ]}
              >
                {language === 'en' ? 'Cancel' : 'Batal'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 5,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
    width: '100%',
  },
  textareaContainer: {
    borderRadius: 5,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  textInput: {
    fontSize: font.title,
    lineHeight: 22,
    minHeight: 92,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    textAlignVertical: 'top',
  },
  imagesInsideContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  textareaFooter: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexWrap: 'wrap',
    rowGap: 8,
    width: '100%',
  },
  footerLeftActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  footerRightActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
    marginLeft: 'auto',
  },
  mediaBtn: {
    alignItems: 'center',
    borderRadius: 5,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  mediaActionContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  mediaBtnDisabled: {
    opacity: 0.4,
  },
  mediaIconCanvas: {
    alignItems: 'center',
    borderRadius: 999,
    height: 26,
    justifyContent: 'center',
    position: 'relative',
    width: 26,
  },
  mediaCountBadge: {
    borderRadius: 8,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 14,
    paddingHorizontal: 2,
    position: 'absolute',
    right: -4,
    top: -4,
  },
  mediaCountBadgeText: {
    color: '#FFFFFF',
    fontSize: font.caption,
    fontWeight: '700',
  },
  servicePillToggle: {
    alignItems: 'center',
    borderRadius: 5,
    borderWidth: 1,
    flexDirection: 'row',
    height: 36,
    gap: 6,
    paddingHorizontal: 10,
  },
  servicePillText: {
    fontSize: font.body,
    fontWeight: '600',
  },
  charCounter: {
    fontSize: font.body,
    fontWeight: '600',
    textAlign: 'right',
  },
  postBtn: {
    alignItems: 'center',
    borderRadius: 5,
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 76,
    paddingHorizontal: 18,
    paddingVertical: 7,
    flexShrink: 0,
  },
  postBtnDisabled: {
    opacity: 0.45,
  },
  postBtnText: {
    color: '#FFFFFF',
    fontSize: font.label,
    fontWeight: '700',
  },
  pickerOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    alignSelf: 'center',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    maxWidth: 520,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    width: '100%',
  },
  pickerHandle: {
    alignSelf: 'center',
    borderRadius: 2,
    height: 4,
    marginBottom: spacing.md,
    width: 40,
  },
  pickerTitle: {
    fontWeight: '700',
  },
  pickerSubtitle: {
    lineHeight: 19,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  cancelPickerBtn: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: spacing.md,
    minHeight: 44,
  },
  cancelPickerBtnText: {
    fontWeight: '600',
  },
  errorText: {
    fontSize: font.body,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
});
