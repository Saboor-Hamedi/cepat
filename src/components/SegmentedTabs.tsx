import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAppearance } from '../context/AppearanceContext';
import { radii, spacing } from '../theme/tokens';

export interface SegmentedTab<T extends string> {
  key: T;
  label: string;
  count?: number;
  testID?: string;
}

export interface SegmentedTabsProps<T extends string> {
  activeTab: T;
  tabs: SegmentedTab<T>[];
  onSelectTab: (tab: T) => void;
  testIDPrefix: string;
}

export function SegmentedTabs<T extends string>({
  activeTab,
  tabs,
  onSelectTab,
  testIDPrefix,
}: SegmentedTabsProps<T>) {
  const { palette } = useAppearance();

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
      >
        {tabs.map((tab) => {
          const selected = activeTab === tab.key;
          const label =
            typeof tab.count === 'number' && tab.count > 0
              ? `${tab.label} (${tab.count})`
              : tab.label;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected }}
              onPress={() => onSelectTab(tab.key)}
              style={[
                styles.tab,
                {
                  backgroundColor: selected
                    ? palette.primary
                    : palette.surfaceElevated,
                  borderColor: selected ? palette.primary : palette.border,
                },
              ]}
              testID={tab.testID ?? `${testIDPrefix}-${tab.key}`}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: selected ? '#FFFFFF' : palette.text },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  tabRow: {
    gap: 8,
    paddingVertical: 4,
  },
  tab: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
