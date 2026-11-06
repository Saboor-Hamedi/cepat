import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { useAppearance } from '../context/AppearanceContext';
import { useLanguage } from '../i18n/locale';
import { ICON_SIZE, ICON_STROKE } from '../theme/icons';
import { spacing } from '../theme/tokens';
import { font } from '../theme/typography';

export interface BackHeaderProps {
  title?: string;
  titleComponent?: React.ReactNode;
  titleTestID?: string;
  onPressBack?: () => void;
  fallbackRoute?: string;
  backLabel?: string;
  showBackLabel?: boolean;
  color?: string;
  rightElement?: React.ReactNode;
  backBtnTestID?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function BackHeader({
  title,
  titleComponent,
  titleTestID,
  onPressBack,
  fallbackRoute,
  backLabel,
  showBackLabel = true,
  color,
  rightElement,
  backBtnTestID = 'back-header-btn',
  testID = 'back-header',
  style,
}: BackHeaderProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();

  const handleBack = () => {
    if (onPressBack) {
      onPressBack();
    } else if (router.canGoBack()) {
      router.back();
    } else if (fallbackRoute) {
      router.replace(fallbackRoute as any);
    } else {
      router.replace('/');
    }
  };

  const resolvedBackLabel = backLabel ?? (language === 'en' ? 'Back' : 'Kembali');
  const tintColor = color ?? palette.text;
  const softButtonBg = `${palette.text}08`;

  return (
    <View
      style={[
        styles.headerBar,
        {
          backgroundColor: 'transparent',
        },
        style,
      ]}
      testID={testID}
    >
      <Pressable
        accessibilityLabel={resolvedBackLabel}
        accessibilityRole="button"
        onPress={handleBack}
        style={({ pressed }) => [
          styles.backBtn,
          showBackLabel ? styles.backBtnPill : styles.backBtnIconOnly,
          {
            backgroundColor: softButtonBg,
            opacity: pressed ? 0.72 : 1,
          },
        ]}
        testID={backBtnTestID}
      >
        <ChevronLeft size={ICON_SIZE} color={tintColor} strokeWidth={ICON_STROKE} />
        {showBackLabel && (
          <Text style={[styles.backLabel, { color: tintColor }]}>
            {resolvedBackLabel}
          </Text>
        )}
      </Pressable>

      <View
        style={[
          styles.titleWrap,
          titleComponent ? styles.titleWrapFull : null,
        ]}
      >
        {titleComponent ? (
          titleComponent
        ) : title ? (
          <Text
            style={[styles.titleText, { color: palette.text }]}
            testID={titleTestID}
            numberOfLines={1}
          >
            {title}
          </Text>
        ) : null}
      </View>

      {rightElement || !titleComponent ? (
        <View style={styles.rightWrap}>
          {rightElement || null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    alignItems: 'center',
    borderWidth: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    minHeight: 44,
    paddingHorizontal: 2,
    paddingVertical: 0,
    width: '100%',
  },
  backBtn: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 2,
    justifyContent: 'center',
    marginLeft: -2,
    minHeight: 36,
    minWidth: 34,
    paddingVertical: 2,
  },
  backBtnPill: {
    paddingHorizontal: 9,
  },
  backBtnIconOnly: {
    paddingHorizontal: 0,
    width: 34,
  },
  backLabel: {
    fontSize: font.label,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  titleWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  titleWrapFull: {
    alignItems: 'stretch',
    paddingLeft: 4,
    paddingRight: 0,
  },
  titleText: {
    fontSize: font.heading,
    fontWeight: '600',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  rightWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    minHeight: 36,
    minWidth: 34,
  },
});
