import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';

import { useAppearance } from '../context/AppearanceContext';
import { font } from '../theme/typography';

export interface TabPillItem<K extends string> {
  key: K;
  label: string;
  testID: string;
  isDanger?: boolean;
}

export interface TabPillBarProps<K extends string> {
  tabs: readonly TabPillItem<K>[];
  activeKey: K | null;
  onSelect: (key: K) => void;
  scrollEnabled?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  containerTestID?: string;
}

export function TabPillBar<K extends string>({
  tabs,
  activeKey,
  onSelect,
  scrollEnabled = true,
  style,
  contentStyle,
  containerTestID,
}: TabPillBarProps<K>) {
  const { palette, scaleFont } = useAppearance();

  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      scrollEnabled={scrollEnabled}
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={[styles.tabRow, contentStyle]}
      testID={containerTestID}
    >
      {tabs.map((tab) => {
        const selected = activeKey === tab.key;
        const isDanger = Boolean(tab.isDanger);
        const accent = isDanger ? palette.danger : palette.primary;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onSelect(tab.key)}
            style={({ pressed }) => [
              styles.tabPill,
              {
                backgroundColor: selected ? accent : palette.pillBg,
                borderColor: selected ? accent : palette.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            testID={tab.testID}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.tabPillText,
                {
                  color: selected ? '#FFFFFF' : isDanger ? palette.danger : palette.text,
                  fontSize: scaleFont(font.label),
                },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabPill: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tabPillText: {
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 2,
    paddingBottom: 2,
  },
});

export default TabPillBar;
