import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '../i18n/locale';
import { font } from '../theme/typography';
import { useScreenTheme } from '../theme/screenTheme';

export interface HubSwitcherTab<T extends string> {
  key: T;
  label: string;
  testID?: string;
}

export interface HubSwitcherProps<T extends string> {
  activeTab: T;
  tabs: HubSwitcherTab<T>[];
  onSelectTab: (tab: T) => void;
  testIDPrefix: string;
}

export function HubSwitcher<T extends string>({
  activeTab,
  tabs,
  onSelectTab,
  testIDPrefix,
}: HubSwitcherProps<T>) {
  const { language } = useLanguage();
  const theme = useScreenTheme();

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={language === 'en' ? 'View switcher' : 'Pemilih tampilan'}
      style={[styles.container, { backgroundColor: theme.segmentedBg }]}
      testID={`${testIDPrefix}-switcher`}
    >
      {tabs.map((tab) => {
        const selected = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            onPress={() => onSelectTab(tab.key)}
            style={({ pressed }) => [
              styles.tab,
              selected && { backgroundColor: theme.primary },
              pressed && !selected && { backgroundColor: 'rgba(148, 163, 184, 0.12)' },
            ]}
            testID={tab.testID ?? `${testIDPrefix}-${tab.key}`}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.tabText,
                { color: selected ? theme.onPrimary : theme.muted },
                selected && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
    marginTop: 4,
    padding: 4,
    width: '100%',
  },
  tab: {
    alignItems: 'center',
    borderRadius: 9,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tabText: {
    fontSize: font.label,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  tabTextActive: {
    fontWeight: '800',
  },
});
