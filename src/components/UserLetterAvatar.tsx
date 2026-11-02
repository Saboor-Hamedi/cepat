import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppearance } from '../context/AppearanceContext';

export interface UserLetterAvatarProps {
  name: string;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
}

export function extractUserInitial(name: string): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return 'C';
  // Match the first alphanumeric character
  const match = trimmed.match(/[a-zA-Z0-9]/);
  if (match) {
    return match[0].toLocaleUpperCase('id-ID');
  }
  return (trimmed.charAt(0) || 'C').toLocaleUpperCase('id-ID');
}

export function UserLetterAvatar({
  name,
  size = 76,
  backgroundColor,
  textColor,
}: UserLetterAvatarProps) {
  const { palette } = useAppearance();
  const initial = useMemo(() => extractUserInitial(name), [name]);

  const parsedSize = Number(size);
  const numericSize =
    Number.isFinite(parsedSize) && parsedSize > 0 ? parsedSize : 76;
  const fontSize = Math.max(12, Math.round(numericSize * 0.44));

  return (
    <View
      accessible
      accessibilityLabel={`Avatar ${name || 'User'}`}
      style={[
        styles.container,
        {
          width: numericSize,
          height: numericSize,
          borderRadius: Math.round(numericSize / 2),
          backgroundColor: backgroundColor || palette.primarySoft,
        },
      ]}
    >
      <Text
        style={[
          styles.letter,
          {
            color: textColor || palette.primary,
            fontSize,
            lineHeight: Math.round(fontSize * 1.2),
          },
        ]}
      >
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  letter: {
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
