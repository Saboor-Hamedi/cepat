import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '../../i18n/locale';
import { spacing } from '../../theme/tokens';
import { font } from '../../theme/typography';
import {
  DISABLED_PILL,
  DISABLED_PILL_BORDER,
  DISABLED_PILL_TEXT,
  MODAL_MUTED,
  MODAL_TEXT,
  MINT,
} from './constants';

export interface PostPillProps {
  testID: string;
  canSubmit: boolean;
  busy: boolean;
  onPress: () => void;
}

export function PostPill({ testID, canSubmit, busy, onPress }: PostPillProps) {
  const { language } = useLanguage();

  return (
    <Pressable
      accessibilityLabel={language === 'en' ? 'Post' : 'Posting'}
      accessibilityRole="button"
      disabled={!canSubmit}
      onPress={onPress}
      style={[
        styles.postPill,
        {
          backgroundColor: canSubmit ? MINT : DISABLED_PILL,
          borderColor: canSubmit ? MINT : DISABLED_PILL_BORDER,
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
            { color: canSubmit ? '#0B0E14' : DISABLED_PILL_TEXT },
          ]}
        >
          {language === 'en' ? 'Post' : 'Posting'}
        </Text>
      )}
    </Pressable>
  );
}

export interface PostHeaderProps {
  onCancel: () => void;
  canSubmit: boolean;
  busy: boolean;
  onPublish: () => void;
  title?: string;
  submitTestID?: string;
  cancelTestID?: string;
}

export function PostHeader({
  onCancel,
  canSubmit,
  busy,
  onPublish,
  title,
  submitTestID = 'submit-new-post-btn',
  cancelTestID = 'compose-cancel-btn',
}: PostHeaderProps) {
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.modalHeader, { paddingTop: insets.top + 6 }]}>
      <View style={styles.headerSide}>
        <Pressable
          accessibilityLabel={language === 'en' ? 'Cancel' : 'Batal'}
          accessibilityRole="button"
          hitSlop={10}
          onPress={onCancel}
          style={({ pressed }) => [
            styles.cancelBtn,
            { opacity: pressed ? 0.6 : 1 },
          ]}
          testID={cancelTestID}
        >
          <Text style={styles.cancelText}>
            {language === 'en' ? 'Cancel' : 'Batal'}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.modalTitle} numberOfLines={1}>
        {title ?? (language === 'en' ? 'New Post' : 'Posting baru')}
      </Text>
      <View style={[styles.headerSide, styles.headerSideRight]}>
        <PostPill
          busy={busy}
          canSubmit={canSubmit}
          onPress={onPublish}
          testID={submitTestID}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    paddingHorizontal: 12,
  },
  postPillText: {
    fontSize: font.label,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
});
