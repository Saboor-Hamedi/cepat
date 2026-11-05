import { StyleSheet, TextInput } from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import { useLanguage } from '../../i18n/locale';
import { font } from '../../theme/typography';
import { MAX_POST_CHARS, MODAL_MUTED, MODAL_TEXT } from './constants';

export interface PostComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  autoFocus?: boolean;
  modal?: boolean;
}

export function PostComposer({
  value,
  onChangeText,
  autoFocus = false,
  modal = false,
}: PostComposerProps) {
  const { language } = useLanguage();
  const { palette, scaleFont } = useAppearance();

  const textColor = modal ? MODAL_TEXT : palette.text;
  const mutedColor = modal ? MODAL_MUTED : palette.textMuted;

  return (
    <TextInput
      autoFocus={autoFocus}
      maxLength={MAX_POST_CHARS}
      multiline
      onChangeText={onChangeText}
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
          fontSize: modal ? scaleFont(19) : scaleFont(font.heading),
          lineHeight: modal ? scaleFont(26) : scaleFont(22),
          minHeight: modal ? 120 : 44,
          paddingTop: modal ? 6 : 7,
        },
      ]}
      testID="create-post-caption-input"
      value={value}
    />
  );
}

const styles = StyleSheet.create({
  inputField: {
    fontWeight: '500',
    padding: 0,
    textAlignVertical: 'top',
  },
});
