import { useEffect, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { useAppearance } from '../context/AppearanceContext';
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

const CONTAINER_PADDING = 4;
const TAB_GAP = 4;

export function HubSwitcher<T extends string>({
  activeTab,
  tabs,
  onSelectTab,
  testIDPrefix,
}: HubSwitcherProps<T>) {
  const { language } = useLanguage();
  const { reduceMotion } = useAppearance();
  const theme = useScreenTheme();
  const [innerWidth, setInnerWidth] = useState(0);
  const [translateX] = useState(() => new Animated.Value(0));
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.key === activeTab),
  );
  const tabWidth =
    innerWidth > 0 ? (innerWidth - TAB_GAP * (tabs.length - 1)) / tabs.length : 0;

  useEffect(() => {
    if (tabWidth <= 0) return;
    const toValue = activeIndex * (tabWidth + TAB_GAP);
    if (reduceMotion) {
      translateX.setValue(toValue);
      return;
    }
    Animated.spring(translateX, {
      toValue,
      useNativeDriver: true,
      damping: 20,
      stiffness: 260,
      mass: 0.6,
    }).start();
  }, [activeIndex, reduceMotion, tabWidth, translateX]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width - CONTAINER_PADDING * 2;
    if (width > 0) {
      setInnerWidth((current) => (current === width ? current : width));
    }
  };

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={language === 'en' ? 'View switcher' : 'Pemilih tampilan'}
      onLayout={handleLayout}
      style={[styles.container, { backgroundColor: theme.segmentedBg }]}
      testID={`${testIDPrefix}-switcher`}
    >
      {tabWidth > 0 && (
        <Animated.View
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={[
            styles.pill,
            {
              backgroundColor: theme.primary,
              transform: [{ translateX }],
              width: tabWidth,
            },
          ]}
          testID={`${testIDPrefix}-pill`}
        />
      )}
      {tabs.map((tab) => {
        const selected = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            onPress={() => onSelectTab(tab.key)}
            style={styles.tab}
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
    gap: TAB_GAP,
    marginBottom: 12,
    marginTop: 4,
    padding: CONTAINER_PADDING,
    position: 'relative',
    width: '100%',
  },
  pill: {
    borderRadius: 9,
    bottom: CONTAINER_PADDING,
    left: CONTAINER_PADDING,
    position: 'absolute',
    top: CONTAINER_PADDING,
    zIndex: 0,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 9,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 1,
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
