import { X } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import { ICON_SIZE, ICON_STROKE } from '../../theme/icons';
import { radii, spacing } from '../../theme/tokens';
import { font } from '../../theme/typography';

function LeadingIcon({ mutedColor }: { mutedColor: string }) {
  return (
    <View style={styles.iconBox}>
      <View style={[styles.iconCircle, { borderColor: mutedColor }]} />
      <View style={[styles.iconHandle, { backgroundColor: mutedColor }]} />
    </View>
  );
}

export interface SearchFieldTriggerProps {
  placeholder: string;
}

export function SearchFieldTrigger({ placeholder }: SearchFieldTriggerProps) {
  const { palette } = useAppearance();

  return (
    <View
      style={[
        styles.shell,
        { backgroundColor: palette.inputBg, borderColor: palette.border },
      ]}
    >
      <LeadingIcon mutedColor={palette.textMuted} />
      <Text
        numberOfLines={1}
        style={[styles.text, { color: palette.textMuted }]}
      >
        {placeholder}
      </Text>
    </View>
  );
}

export interface SearchFieldProps {
  placeholder: string;
  accessibilityLabel?: string;
  testID?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onPress?: () => void;
  onClear?: () => void;
  clearAccessibilityLabel?: string;
  autoFocus?: boolean;
}

export function SearchField({
  placeholder,
  accessibilityLabel,
  testID,
  value,
  onChangeText,
  onPress,
  onClear,
  clearAccessibilityLabel,
  autoFocus,
}: SearchFieldProps) {
  const { palette } = useAppearance();

  const shell = [
    styles.shell,
    { backgroundColor: palette.inputBg, borderColor: palette.border },
  ];


  const clearButton =
    !onPress && value && value.length > 0 && onClear ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={clearAccessibilityLabel}
        onPress={onClear}
        style={[styles.clearBtn, { backgroundColor: palette.pillBg }]}
        testID={testID ? `${testID}-clear` : undefined}
      >
        <X color={palette.textMuted} size={ICON_SIZE} strokeWidth={ICON_STROKE} />
      </Pressable>
    ) : null;

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={shell}
        testID={testID}
      >
        <LeadingIcon mutedColor={palette.textMuted} />
        <Text
          numberOfLines={1}
          style={[styles.text, { color: palette.textMuted }]}
        >
          {placeholder}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={shell}>
      <LeadingIcon mutedColor={palette.textMuted} />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        returnKeyType="search"
        style={[styles.text, { color: palette.text }]}
        testID={testID}
        value={value}
      />
      {clearButton}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    height: 40,
    paddingHorizontal: spacing.sm,
    width: '100%',
  },
  iconBox: {
    alignItems: 'center',
    height: 20,
    justifyContent: 'center',
    marginRight: spacing.xs,
    width: 20,
  },
  iconCircle: {
    borderRadius: 5,
    borderWidth: 2,
    height: 12,
    width: 12,
  },
  iconHandle: {
    borderRadius: 1,
    height: 5,
    marginRight: -9,
    marginTop: -2,
    transform: [{ rotate: '-45deg' }],
    width: 2,
  },
  text: {
    alignSelf: 'center',
    flex: 1,
    fontSize: font.title,
    paddingVertical: 0,
  },
  clearBtn: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
});
