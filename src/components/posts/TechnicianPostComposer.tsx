import { Briefcase, Camera, Globe, MapPin, X } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../auth/AuthProvider';
import { useAppearance } from '../../context/AppearanceContext';
import { containsBlockedContactOrUrl, loadSavedAddresses } from '../../data/marketplaceStore';
import { localizeArea, useLanguage } from '../../i18n/locale';
import { ICON_STROKE } from '../../theme/icons';
import { radii, spacing } from '../../theme/tokens';
import { font } from '../../theme/typography';
import { Avatar } from '../Avatar';
import { StrictImagePicker } from '../StrictImagePicker';
import { TechnicianPostImagePreview } from './TechnicianPostImagePreview';

export interface TechnicianPostComposerProps {
  onCreatePost: (input: {
    caption: string;
    imageUri?: string;
    mediaUrls?: string[];
    isServicePost: boolean;
    serviceArea?: string;
  }) => Promise<void>;
  technicianProfile?: {
    id: string;
    displayName?: string;
    avatarUri?: string;
  };
  customImageLauncher?: () => Promise<string | null>;
  variant?: 'inline' | 'modal';
}

const MAX_POST_CHARS = 200;
const MAX_POST_IMAGES = 4;

const MODAL_BG = '#0B0E14';
const MODAL_TEXT = '#F1F5F9';
const MODAL_MUTED = '#64748B';
const MINT = '#10B981';
const DISABLED_PILL = '#27334B';

export function TechnicianPostComposer({
  onCreatePost,
  technicianProfile,
  customImageLauncher,
  variant = 'inline',
}: TechnicianPostComposerProps) {
  const isModal = variant === 'modal';
  const params = useLocalSearchParams<{ area?: string }>();
  const { language } = useLanguage();
  const { user, roles } = useAuth();
  const { palette, reduceMotion, scaleFont } = useAppearance();
  const insets = useSafeAreaInsets();

  const initialArea =
    typeof params.area === 'string' && params.area.trim() ? params.area : 'Semua area';

  const [caption, setCaption] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isServicePost, setIsServicePost] = useState(false);
  const [attachArea, setAttachArea] = useState(false);
  const [areaLabel, setAreaLabel] = useState(initialArea);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialArea !== 'Semua area' || !user?.id) return;
    let active = true;
    void loadSavedAddresses(user.id)
      .then((addresses) => {
        if (!active) return;
        const first = addresses.find((addr) => addr.area?.trim());
        if (first?.area) {
          setAreaLabel(first.area);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (technicianProfile && user) {
    const isDifferentUser =
      user.id !== technicianProfile.id &&
      !technicianProfile.id.startsWith('demo-');
    if (isDifferentUser && roles && !roles.includes('technician')) {
      return null;
    }
  }

  const metadataName =
    (typeof user?.user_metadata?.display_name === 'string' &&
      user.user_metadata.display_name.trim()) ||
    user?.email?.split('@')[0] ||
    'Cepat';

  const displayName = technicianProfile?.displayName || metadataName;
  const avatarUri =
    technicianProfile?.avatarUri ||
    (typeof user?.user_metadata?.avatar_url === 'string'
      ? user.user_metadata.avatar_url
      : undefined);

  const trimmedCaption = caption.trim();
  const hasContent = trimmedCaption.length > 0 || images.length > 0;
  const isOverCharLimit = caption.length > MAX_POST_CHARS;
  const hasUrl = containsBlockedContactOrUrl(trimmedCaption);
  const canSubmit = hasContent && !isOverCharLimit && !hasUrl && !busy;

  const textColor = isModal ? MODAL_TEXT : palette.text;
  const mutedColor = isModal ? MODAL_MUTED : palette.textMuted;
  const isAttached = attachArea;

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

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
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
        serviceArea: attachArea ? areaLabel : 'Semua area',
      });
      setCaption('');
      setImages([]);
      setIsServicePost(false);
      setAttachArea(false);
      setShowPickerModal(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to create post.');
    } finally {
      setBusy(false);
    }
  };

  const renderCounter = () => {
    if (caption.length === 0 && !isOverCharLimit) return null;
    return (
      <Text
        style={[
          styles.counter,
          {
            color: isOverCharLimit
              ? isModal
                ? '#F87171'
                : palette.danger
              : caption.length > 160
                ? '#F59E0B'
                : mutedColor,
            fontWeight: isOverCharLimit ? '700' : '500',
          },
        ]}
        testID={isOverCharLimit ? 'char-count-warning' : 'char-counter'}
      >
        {MAX_POST_CHARS - caption.length}
      </Text>
    );
  };

  const renderAreaChip = () => {
    if (!isAttached) return null;
    return (
      <View style={styles.areaChip} testID="compose-location-chip">
        <MapPin color={MINT} size={13} strokeWidth={ICON_STROKE} />
        <Text numberOfLines={1} style={styles.areaChipText}>
          {localizeArea(areaLabel, language)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={language === 'en' ? 'Remove location' : 'Hapus lokasi'}
          hitSlop={8}
          onPress={() => setAttachArea(false)}
          style={styles.areaChipRemove}
          testID="compose-location-remove"
        >
          <X color={MINT} size={13} strokeWidth={ICON_STROKE} />
        </Pressable>
      </View>
    );
  };

  const renderIconRow = () => (
    <View style={styles.iconRow}>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: isServicePost }}
        disabled={busy}
        hitSlop={8}
        onPress={() => setIsServicePost((value) => !value)}
        style={({ pressed }) => [
          styles.iconBtn,
          { opacity: pressed ? 0.6 : 1 },
        ]}
        testID="service-post-toggle"
      >
        <Briefcase
          color={isServicePost ? MINT : mutedColor}
          size={21}
          strokeWidth={1.8}
        />
      </Pressable>

      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: isAttached }}
        hitSlop={8}
        onPress={() => setAttachArea((value) => !value)}
        style={({ pressed }) => [
          styles.iconBtn,
          { opacity: pressed ? 0.6 : 1 },
        ]}
        testID="compose-location-toggle"
      >
        <MapPin
          color={isAttached ? MINT : mutedColor}
          size={21}
          strokeWidth={1.8}
        />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={language === 'en' ? 'Attach photo' : 'Lampirkan foto'}
        disabled={busy || images.length >= MAX_POST_IMAGES}
        hitSlop={8}
        onPress={handleAddImage}
        style={({ pressed }) => [
          styles.iconBtn,
          {
            opacity: images.length >= MAX_POST_IMAGES ? 0.35 : pressed ? 0.6 : 1,
          },
        ]}
        testID="add-image-btn"
      >
        <View
          testID="toggle-post-photo-picker-btn"
          style={styles.iconCanvas}
        >
          <Camera color={mutedColor} size={22} strokeWidth={1.8} />
          {images.length > 0 && (
            <View style={[styles.mediaCountBadge, { backgroundColor: MINT }]}>
              <Text style={styles.mediaCountBadgeText}>{images.length}</Text>
            </View>
          )}
        </View>
      </Pressable>

      <View style={styles.iconRowSpacer} />
      {renderCounter()}
    </View>
  );

  const inputBlock = (
    <TextInput
      autoFocus={isModal}
      multiline
      maxLength={MAX_POST_CHARS}
      onChangeText={handleTextChange}
      placeholder={
        language === 'en'
          ? "What's new with your work?"
          : 'Ada kabar terbaru dari kerjaanmu?'
      }
      placeholderTextColor={mutedColor}
      style={[
        styles.inputField,
        {
          color: textColor,
          fontSize: isModal ? scaleFont(19) : scaleFont(font.heading),
          lineHeight: isModal ? scaleFont(26) : scaleFont(22),
        },
      ]}
      testID="create-post-caption-input"
      value={caption}
    />
  );

  const imagesBlock =
    images.length > 0 ? (
      <View style={styles.previewsInline}>
        <TechnicianPostImagePreview
          images={images}
          onRemoveImage={handleRemoveImage}
        />
      </View>
    ) : null;

  const postPill = (testID: string, fullWidth = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={language === 'en' ? 'Post' : 'Posting'}
      disabled={!canSubmit}
      onPress={() => {
        void handlePublish();
      }}
      style={[
        styles.postPill,
        fullWidth && styles.postPillFullWidth,
        {
          backgroundColor: canSubmit ? MINT : DISABLED_PILL,
          borderColor: canSubmit ? MINT : 'rgba(148, 163, 184, 0.28)',
          borderWidth: 1,
        },
      ]}
      testID={testID}
    >
      {busy ? (
        <ActivityIndicator
          color={canSubmit ? '#0B0E14' : MODAL_MUTED}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.postPillText,
            { color: canSubmit ? '#0B0E14' : '#94A3B8' },
          ]}
        >
          {language === 'en' ? 'Post' : 'Posting'}
        </Text>
      )}
    </Pressable>
  );

  const pickerModal = (
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
            {
              backgroundColor: isModal ? '#131A26' : palette.surface,
              borderColor: isModal ? 'rgba(148,163,184,0.16)' : palette.border,
            },
          ]}
          testID="composer-image-picker-wrap"
        >
          <View
            style={[
              styles.pickerHandle,
              { backgroundColor: isModal ? '#2A3444' : palette.border },
            ]}
          />
          <Text
            style={[
              styles.pickerTitle,
              {
                color: textColor,
                fontSize: scaleFont(font.heading),
              },
            ]}
          >
            {language === 'en' ? 'Add photo' : 'Tambah foto'}
          </Text>
          <StrictImagePicker
            displayMode="actions"
            onImageValidated={handleImageValidated}
            testIDPrefix="post-image-picker"
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowPickerModal(false)}
            style={[
              styles.cancelPickerBtn,
              {
                borderColor: isModal ? 'rgba(148,163,184,0.2)' : palette.border,
              },
            ]}
          >
            <Text
              style={[
                styles.cancelPickerBtnText,
                { color: mutedColor, fontSize: scaleFont(font.label) },
              ]}
            >
              {language === 'en' ? 'Cancel' : 'Batal'}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );

  if (isModal) {
    return (
      <View style={[styles.screenRoot, { backgroundColor: MODAL_BG }]} testID="technician-post-composer">
        <View style={[styles.modalHeader, { paddingTop: insets.top + 6 }]}>
          <View style={styles.headerSide}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={language === 'en' ? 'Cancel' : 'Batal'}
              hitSlop={10}
              onPress={handleClose}
              style={({ pressed }) => [
                styles.cancelBtn,
                { opacity: pressed ? 0.6 : 1 },
              ]}
              testID="compose-cancel-btn"
            >
              <Text style={styles.cancelText}>
                {language === 'en' ? 'Cancel' : 'Batal'}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.modalTitle} numberOfLines={1}>
            {language === 'en' ? 'New post' : 'Posting baru'}
          </Text>
          <View style={[styles.headerSide, styles.headerSideRight]}>
            {postPill('submit-new-post-btn')}
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalKeyboard}
        >
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.threadRow}>
              <View style={styles.avatarColumn}>
                <Avatar uri={avatarUri} name={displayName} size={40} />
                <View style={styles.connectorLine} />
              </View>
              <View style={styles.inputColumn}>
                {inputBlock}
                {renderAreaChip()}
                {imagesBlock}
                {renderIconRow()}
              </View>
            </View>
            {error ? (
              <Text style={[styles.errorText, { color: '#F87171' }]} testID="create-post-error">
                {error}
              </Text>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={[styles.footerNote, { paddingBottom: insets.bottom + 10 }]}>
          <Globe color={MODAL_MUTED} size={13} strokeWidth={1.8} />
          <Text style={styles.footerNoteText}>
            {language === 'en'
              ? 'Anyone can view & reply'
              : 'Siapa saja bisa melihat & membalas'}
          </Text>
        </View>

        {pickerModal}
      </View>
    );
  }

  return (
    <View style={styles.inlineRoot} testID="technician-post-composer">
      <View style={styles.inlineHeader}>
        <View style={styles.inlineHeaderSpacer} />
        {postPill('submit-new-post-btn')}
      </View>
      <View style={styles.threadRow}>
        <View style={styles.avatarColumn}>
          <Avatar uri={avatarUri} name={displayName} size={40} />
          <View style={styles.connectorLine} />
        </View>
        <View style={styles.inlineBody}>
          {inputBlock}
          {renderAreaChip()}
          {imagesBlock}
          <View style={styles.inlineFooter}>
            {renderIconRow()}
          </View>
        </View>
      </View>
      {error ? (
        <Text
          style={[styles.errorText, { color: palette.danger }]}
          testID="create-post-error"
        >
          {error}
        </Text>
      ) : null}
      {pickerModal}
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingBottom: 4,
    paddingHorizontal: spacing.lg,
    width: '100%',
  },
  headerSide: {
    flex: 1,
    justifyContent: 'center',
  },
  headerSideRight: {
    alignItems: 'flex-end',
  },
  cancelBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  cancelText: {
    color: MODAL_TEXT,
    fontSize: font.subtitle,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  modalTitle: {
    color: MODAL_TEXT,
    fontSize: font.heading,
    fontWeight: '600',
    letterSpacing: -0.2,
    maxWidth: '42%',
    textAlign: 'center',
  },
  postPill: {
    alignItems: 'center',
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    minWidth: 64,
    paddingHorizontal: 16,
  },
  postPillFullWidth: {
    minWidth: 0,
    width: '100%',
  },
  postPillText: {
    fontSize: font.label,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  modalKeyboard: {
    flex: 1,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  threadRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: 12,
  },
  avatarColumn: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  connectorLine: {
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
    borderRadius: 1,
    flex: 1,
    marginTop: 10,
    minHeight: 90,
    width: 2,
  },
  inputColumn: {
    flex: 1,
    minWidth: 0,
  },
  inputField: {
    fontWeight: '500',
    minHeight: 120,
    padding: 0,
    paddingTop: 2,
    textAlignVertical: 'top',
  },
  areaChip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.13)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    height: 30,
    marginTop: spacing.xs,
    maxWidth: '100%',
    paddingHorizontal: 10,
  },
  areaChipText: {
    color: MINT,
    fontSize: font.caption,
    fontWeight: '700',
    maxWidth: 190,
  },
  areaChipRemove: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
    width: 18,
  },
  previewsInline: {
    marginTop: spacing.xs,
  },
  iconRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 18,
    marginTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  iconRowSpacer: {
    flex: 1,
  },
  iconBtn: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  iconCanvas: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    position: 'relative',
    width: 28,
  },
  mediaCountBadge: {
    alignItems: 'center',
    borderRadius: 999,
    height: 15,
    justifyContent: 'center',
    minWidth: 15,
    paddingHorizontal: 2,
    position: 'absolute',
    right: -6,
    top: -5,
  },
  mediaCountBadgeText: {
    color: '#0B0E14',
    fontSize: font.caption,
    fontWeight: '800',
  },
  counter: {
    fontSize: font.body,
    fontWeight: '500',
    textAlign: 'right',
  },
  footerNote: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingTop: 10,
    width: '100%',
  },
  footerNoteText: {
    color: MODAL_MUTED,
    fontSize: font.caption,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  inlineRoot: {
    width: '100%',
  },
  inlineHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
    paddingTop: 2,
  },
  inlineHeaderSpacer: {
    flex: 1,
  },
  inlineBody: {
    flex: 1,
    minWidth: 0,
  },
  inlineFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: spacing.xs,
  },
  pickerOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    alignSelf: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  cancelPickerBtn: {
    alignItems: 'center',
    borderRadius: radii.sm,
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
