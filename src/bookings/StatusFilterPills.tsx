import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '../i18n/locale';
import { font } from '../theme/typography';
import { useScreenTheme } from '../theme/screenTheme';

export interface StatusFilterPill<T extends string> {
  key: T;
  label: string;
  count?: number;
  testID?: string;
}

export interface StatusFilterPillsProps<T extends string> {
  activeTab: T;
  tabs: StatusFilterPill<T>[];
  onSelectTab: (tab: T) => void;
  testIDPrefix: string;
}

export function StatusFilterPills<T extends string>({
  activeTab,
  tabs,
  onSelectTab,
  testIDPrefix,
}: StatusFilterPillsProps<T>) {
  const { language } = useLanguage();
  const theme = useScreenTheme();

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        accessibilityRole="tablist"
        accessibilityLabel={language === 'en' ? 'Status filter' : 'Filter status'}
      >
        {tabs.map((tab) => {
          const selected = activeTab === tab.key;
          const label =
            typeof tab.count === 'number' ? `${tab.label} (${tab.count})` : tab.label;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={label}
              onPress={() => onSelectTab(tab.key)}
              style={({ pressed }) => [
                styles.pill,
                {
                  backgroundColor: selected ? theme.primary : theme.segmentedBg,
                },
                pressed && !selected && { opacity: 0.7 },
              ]}
              testID={tab.testID ?? `${testIDPrefix}-${tab.key}`}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.pillText,
                  { color: selected ? theme.onPrimary : theme.muted },
                  selected && styles.pillTextActive,
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
  wrapper: {
    marginBottom: 12,
    width: '100%',
  },
  row: {
    gap: 8,
    paddingVertical: 2,
  },
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  pillText: {
    fontSize: font.label,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  pillTextActive: {
    fontWeight: '800',
  },
});
