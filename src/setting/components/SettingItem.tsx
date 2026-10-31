import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '../../theme/tokens';

export interface SettingItemProps {
  label: string;
  description?: string;
  active?: boolean;
  onPress?: () => void;
  rightElement?: ReactNode;
  testID?: string;
  accessibilityRole?: 'button' | 'switch' | 'radio';
}

export function SettingItem({
  label,
  description,
  active,
  onPress,
  rightElement,
  testID,
  accessibilityRole = 'button',
}: SettingItemProps) {
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityState={
        accessibilityRole === 'switch'
          ? { checked: Boolean(active) }
          : accessibilityRole === 'radio'
            ? { selected: Boolean(active) }
            : undefined
      }
      disabled={!onPress}
      onPress={onPress}
      style={[styles.row, active && styles.rowActive]}
      testID={testID}
    >
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {rightElement ?? (
        <View style={[styles.togglePill, active && styles.togglePillActive]}>
          <View style={[styles.toggleKnob, active && styles.toggleKnobActive]} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowActive: {
    backgroundColor: colors.greenSoft,
    borderColor: colors.green,
  },
  copy: {
    flex: 1,
    marginRight: spacing.md,
  },
  label: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  description: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  togglePill: {
    backgroundColor: '#D5D9D2',
    borderRadius: radii.pill,
    height: 24,
    justifyContent: 'center',
    paddingHorizontal: 3,
    width: 44,
  },
  togglePillActive: {
    backgroundColor: colors.green,
  },
  toggleKnob: {
    backgroundColor: '#FFFFFF',
    borderRadius: 9,
    height: 18,
    width: 18,
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
});
