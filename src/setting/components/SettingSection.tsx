import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { radii, spacing } from '../../theme/tokens';

export interface SettingSectionProps extends PropsWithChildren {
  eyebrow: string;
  title: string;
  description?: string;
  badge?: ReactNode;
  testID?: string;
}

export function SettingSection({
  title,
  description,
  badge,
  testID,
  children,
}: SettingSectionProps) {
  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
        {badge}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E6EB',
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: '#050505',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  description: {
    color: '#65676B',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  body: {
    marginTop: spacing.xs,
  },
});
