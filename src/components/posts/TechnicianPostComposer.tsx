import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { colors, spacing } from '../../theme/tokens';
import { Avatar } from '../marketplace-ui';
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

const MAX_POST_CHARS = 1000;
const MAX_POST_IMAGES = 4;

export function TechnicianPostComposer({
  onCreatePost,
  technicianProfile,
  customImageLauncher,
}: TechnicianPostComposerProps) {
  const { language } = useLanguage();
  const { user, roles } = useAuth();
  const { palette } = useAppearance();

  const [caption, setCaption] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isServicePost, setIsServicePost] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Section 6 Authorization Check:
  // If technicianProfile is provided and user is authenticated as a different account, do not render composer
  if (technicianProfile && user) {
    const isDifferentUser = user.id !== technicianProfile.id && !technicianProfile.id.startsWith('demo-');
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

  const authorName =
    technicianProfile?.displayName ||
    (typeof user?.user_metadata?.display_name === 'string' &&
      user.user_metadata.display_name.trim()) ||
    user?.email?.split('@')[0] ||
    'Teknisi Cepat';
  const authorAvatarUri = technicianProfile?.avatarUri || (typeof user?.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : undefined);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[
        styles.card,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
      testID="technician-post-composer"
    >
      <View style={styles.composerHeader}>
        <View
          style={[
            styles.avatarRing,
            { backgroundColor: palette.primarySoft, borderColor: palette.border },
          ]}
        >
          <Avatar uri={authorAvatarUri} name={authorName} size={42} />
        </View>
        <View style={styles.authorInfo}>
          <Text
            numberOfLines={1}
            style={[styles.authorName, { color: palette.text }]}
          >
            {authorName}
          </Text>
          <View style={styles.audienceTag}>
            <View
              style={[styles.audienceDot, { backgroundColor: palette.primary }]}
            />
            <Text style={[styles.audienceText, { color: palette.textMuted }]}>
              {language === 'en' ? 'Marketplace' : 'Marketplace'}
            </Text>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.inputShell,
          { backgroundColor: palette.inputBg, borderColor: palette.border },
        ]}
      >
          <TextInput
            multiline
            maxLength={MAX_POST_CHARS + 100}
            onChangeText={handleTextChange}
            placeholder={
              language === 'en'
                ? "What's happening? Share a job update..."
                : 'Bagikan update pekerjaan atau tips servis...'
            }
            placeholderTextColor={palette.textMuted}
            style={[styles.textInput, { color: palette.text }]}
            testID="create-post-caption-input"
            value={caption}
          />
      </View>

      {/* Pre-upload Image Attachment Strip */}
      <TechnicianPostImagePreview
        images={images}
        onRemoveImage={handleRemoveImage}
      />

      {/* Inline Picker View (when toggled via manual picker) */}
      {showPickerModal ? (
        <View
          style={[
            styles.pickerWrap,
            { borderTopColor: palette.border },
          ]}
          testID="composer-image-picker-wrap"
        >
          <StrictImagePicker
            label={language === 'en' ? 'Add Photo of Your Work' : 'Tambah Foto Hasil Kerja'}
            onImageValidated={handleImageValidated}
            testIDPrefix="post-image-picker"
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowPickerModal(false)}
            style={styles.cancelPickerBtn}
          >
            <Text
              style={[
                styles.cancelPickerBtnText,
                { color: palette.textMuted },
              ]}
            >
              {language === 'en' ? 'Cancel' : 'Batal'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Error / Validation Warning */}
      {error ? (
        <Text
          style={[styles.errorText, { color: palette.danger }]}
          testID="create-post-error"
        >
          {error}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: isServicePost }}
        disabled={busy}
        onPress={() => setIsServicePost((value) => !value)}
        style={[
          styles.servicePostOption,
          {
            backgroundColor: palette.surfaceElevated,
            borderColor: palette.border,
          },
        ]}
        testID="service-post-toggle"
      >
        <View
          style={[
            styles.servicePostCheckbox,
            {
              backgroundColor: isServicePost ? palette.primary : palette.surface,
              borderColor: isServicePost ? palette.primary : palette.border,
            },
          ]}
        >
          {isServicePost ? (
            <Text style={styles.servicePostCheckmark}>✓</Text>
          ) : null}
        </View>
        <View style={styles.servicePostCopy}>
          <Text style={[styles.servicePostTitle, { color: palette.text }]}>
            {language === 'en' ? 'Offer this as a service' : 'Tawarkan sebagai layanan'}
          </Text>
          <Text style={[styles.servicePostDescription, { color: palette.textMuted }]}>
            {language === 'en'
              ? 'Allow people to book from this post.'
              : 'Izinkan orang memesan dari postingan ini.'}
          </Text>
        </View>
      </Pressable>

      {/* Bottom Action Bar */}
      <View
        style={[styles.actionBar, { borderTopColor: palette.border }]}
      >
        {/* Left: Media upload icon button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            language === 'en' ? 'Attach photo' : 'Lampirkan foto'
          }
          disabled={busy || images.length >= MAX_POST_IMAGES}
          onPress={handleAddImage}
          style={[
            styles.mediaBtn,
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
              <View style={[styles.mediaIconFrame, { borderColor: palette.primary }]}>
                <View style={[styles.mediaIconSun, { backgroundColor: palette.primary }]} />
                <View style={[styles.mediaIconMountain, { borderBottomColor: palette.primary }]} />
              </View>
            </View>
            <Text style={[styles.mediaActionLabel, { color: palette.primary }]}>
              {language === 'en' ? 'Photo' : 'Foto'}
            </Text>
          </View>
          {images.length > 0 ? (
            <Text style={[styles.mediaBadgeText, { color: palette.primary }]}>
              {images.length}/{MAX_POST_IMAGES}
            </Text>
          ) : null}
        </Pressable>

        {/* Center: Character counter when nearing limit */}
        <View style={styles.centerMeta}>
          {caption.length > 800 || isOverCharLimit ? (
            <Text
              style={[
                styles.charCounter,
                {
                  color: isOverCharLimit ? palette.danger : palette.textMuted,
                  fontWeight: isOverCharLimit ? '800' : '600',
                },
              ]}
              testID={isOverCharLimit ? 'char-count-warning' : 'char-counter'}
            >
              {MAX_POST_CHARS - caption.length}
            </Text>
          ) : null}
        </View>

        {/* Right: Pill-shaped Post button */}
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
            <Text style={styles.postBtnText}>
              {language === 'en' ? 'Post' : 'Posting'}
            </Text>
          )}
        </Pressable>
      </View>
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
  composerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  avatarRing: {
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  authorInfo: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '800',
  },
  audienceTag: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  audienceDot: {
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  audienceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inputShell: {
    borderRadius: 5,
    borderWidth: 1,
    minHeight: 98,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  textInput: {
    fontSize: 15,
    lineHeight: 23,
    maxHeight: 180,
    minHeight: 78,
    padding: 0,
    textAlignVertical: 'top',
  },
  pickerWrap: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  cancelPickerBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    paddingVertical: 6,
  },
  cancelPickerBtnText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  servicePostOption: {
    alignItems: 'center',
    borderRadius: 5,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    minHeight: 58,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  servicePostCheckbox: {
    alignItems: 'center',
    borderRadius: 5,
    borderWidth: 1,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  servicePostCheckmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 16,
  },
  servicePostCopy: {
    flex: 1,
  },
  servicePostTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  servicePostDescription: {
    fontSize: 11,
    marginTop: 1,
  },
  actionBar: {
    alignItems: 'center',
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  mediaBtn: {
    alignItems: 'center',
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  mediaActionContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  mediaActionLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  mediaBtnDisabled: {
    opacity: 0.4,
  },
  mediaIconCanvas: {
    alignItems: 'center',
    borderRadius: 5,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  mediaIconFrame: {
    borderColor: colors.greenDark,
    borderRadius: 4,
    borderWidth: 1.8,
    height: 18,
    overflow: 'hidden',
    position: 'relative',
    width: 20,
  },
  mediaIconSun: {
    backgroundColor: colors.greenDark,
    borderRadius: 2,
    height: 3,
    position: 'absolute',
    right: 3,
    top: 3,
    width: 3,
  },
  mediaIconMountain: {
    borderBottomColor: colors.greenDark,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderLeftWidth: 6,
    borderRightColor: 'transparent',
    borderRightWidth: 6,
    bottom: 0,
    height: 0,
    left: 2,
    position: 'absolute',
    width: 0,
  },
  mediaBadgeText: {
    color: colors.greenDark,
    fontSize: 11,
    fontWeight: '700',
  },
  centerMeta: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  charCounter: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  charCounterLimit: {
    color: colors.danger,
    fontWeight: '800',
  },
  postBtn: {
    alignItems: 'center',
    backgroundColor: colors.greenDark,
    borderRadius: 5,
    justifyContent: 'center',
    minHeight: 34,
    minWidth: 76,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  postBtnDisabled: {
    opacity: 0.5,
  },
  postBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
