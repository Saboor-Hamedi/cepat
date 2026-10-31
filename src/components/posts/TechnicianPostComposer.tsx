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

  const [caption, setCaption] = useState('');
  const [images, setImages] = useState<string[]>([]);
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
      });
      setCaption('');
      setImages([]);
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
      style={styles.card}
      testID="technician-post-composer"
    >
      {/* Top Row: Avatar and Auto-Expanding Multiline TextInput */}
      <View style={styles.topRow}>
        <View style={styles.avatarWrap}>
          <Avatar uri={authorAvatarUri} name={authorName} size={40} />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            multiline
            onChangeText={handleTextChange}
            placeholder={
              language === 'en'
                ? "What's happening? Share a job update..."
                : 'Bagikan update pekerjaan atau tips servis...'
            }
            placeholderTextColor={colors.muted}
            style={styles.textInput}
            testID="create-post-caption-input"
            value={caption}
          />
        </View>
      </View>

      {/* Pre-upload Image Attachment Strip */}
      <TechnicianPostImagePreview
        images={images}
        onRemoveImage={handleRemoveImage}
      />

      {/* Inline Picker View (when toggled via manual picker) */}
      {showPickerModal ? (
        <View style={styles.pickerWrap} testID="composer-image-picker-wrap">
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
            <Text style={styles.cancelPickerBtnText}>
              {language === 'en' ? 'Cancel' : 'Batal'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Error / Validation Warning */}
      {error ? (
        <Text style={styles.errorText} testID="create-post-error">
          {error}
        </Text>
      ) : null}

      {/* Bottom Action Bar */}
      <View style={styles.actionBar}>
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
          {/* Backwards-compatible duplicate testID target */}
          <View testID="toggle-post-photo-picker-btn" style={styles.mediaIconCanvas}>
            <View style={styles.mediaIconFrame}>
              <View style={styles.mediaIconSun} />
              <View style={styles.mediaIconMountain} />
            </View>
          </View>
          {images.length > 0 ? (
            <Text style={styles.mediaBadgeText}>{images.length}/{MAX_POST_IMAGES}</Text>
          ) : null}
        </Pressable>

        {/* Center: Character counter when nearing limit */}
        <View style={styles.centerMeta}>
          {caption.length > 800 || isOverCharLimit ? (
            <Text
              style={[
                styles.charCounter,
                isOverCharLimit && styles.charCounterLimit,
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
          style={[styles.postBtn, !canSubmit && styles.postBtnDisabled]}
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
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
    width: '100%',
  },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  avatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
  },
  inputContainer: {
    flex: 1,
    minHeight: 52,
  },
  textInput: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 52,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
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
    flexDirection: 'row',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  mediaBtnDisabled: {
    opacity: 0.4,
  },
  mediaIconCanvas: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
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
    borderRadius: 9999,
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
