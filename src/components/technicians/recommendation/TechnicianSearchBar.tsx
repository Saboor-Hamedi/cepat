import { Search, X } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useAppearance } from '../../../context/AppearanceContext';
import { useLanguage } from '../../../i18n/locale';
import { ICON_STROKE } from '../../../theme/icons';
import { radii, spacing } from '../../../theme/tokens';
import { font } from '../../../theme/typography';

interface TechnicianSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  placeholder?: string;
  testID?: string;
}

export const TechnicianSearchBar = memo(function TechnicianSearchBar({
  value,
  onChangeText,
  onClear,
  placeholder,
  testID,
}: TechnicianSearchBarProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();

  const defaultPlaceholder =
    language === 'en'
      ? 'Search technicians, skills, or area...'
      : 'Cari teknisi, keahlian, atau area...';

  const handleClear = () => {
    onChangeText('');
    onClear?.();
  };

  return (
    <View
      style={[
        styles.searchContainer,
        {
          backgroundColor: palette.inputBg,
          borderColor: palette.border,
        },
      ]}
      testID={testID ?? 'technician-search-bar'}
    >
      <Search size={16} color={palette.textMuted} strokeWidth={ICON_STROKE} />

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? defaultPlaceholder}
        placeholderTextColor={palette.textMuted}
        style={[styles.input, { color: palette.text }]}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        testID="technician-search-input"
      />

      {value.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hapus pencarian"
          hitSlop={8}
          onPress={handleClear}
          style={styles.clearBtn}
          testID="technician-search-clear"
        >
          <X size={15} color={palette.textMuted} strokeWidth={ICON_STROKE} />
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  searchContainer: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    height: 44,
    paddingHorizontal: spacing.md,
    width: '100%',
  },
  input: {
    flex: 1,
    fontSize: font.body,
    height: '100%',
    marginLeft: spacing.sm,
    paddingVertical: 0,
  },
  clearBtn: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
});
