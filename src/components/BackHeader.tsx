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
import { radii, spacing } from '../theme/tokens';
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
  const tintColor = color ?? palette.primary;

  return (
    <View
      style={[
        styles.headerBar,
        {
          backgroundColor: `${palette.surface}88`,
          borderColor: `${palette.border}60`,
        },
        style,
      ]}
      testID={testID}
    >
      {/* Universal Go Back Button (NO background on the button itself) */}
      <Pressable
        accessibilityLabel={resolvedBackLabel}
        accessibilityRole="button"
        onPress={handleBack}
        style={({ pressed }) => [
          styles.backBtn,
          {
            opacity: pressed ? 0.6 : 1,
            backgroundColor: 'transparent',
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

      {/* Dynamic Title (Centered) */}
      <View style={styles.titleWrap}>
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

      {/* Right Element or Symmetrical Spacer to keep title centered */}
      <View style={styles.rightWrap}>
        {rightElement || null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginTop: 2,
    minHeight: 46,
    paddingHorizontal: 8,
    paddingVertical: 3,
    width: '100%',
  },
  backBtn: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: 4,
    minHeight: 38,
    minWidth: 70,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  backLabel: {
    fontSize: font.subtitle,
    fontWeight: '700',
  },
  titleWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  titleText: {
    fontSize: font.heading,
    fontWeight: '700',
    textAlign: 'center',
  },
  rightWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    minHeight: 38,
    minWidth: 70,
  },
});
