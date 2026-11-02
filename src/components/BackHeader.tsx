import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
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
import { spacing } from '../theme/tokens';
import { ICON_SIZE, ICON_STROKE } from '../theme/icons';
import { font } from '../theme/typography';

export interface BackHeaderProps {
  title?: string;
  titleComponent?: React.ReactNode;
  titleTestID?: string;
  onPressBack?: () => void;
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
    } else {
      router.replace('/');
    }
  };

  return (
    <View style={[styles.headerBar, style]} testID={testID}>
      {/* Round Back Button */}
      <Pressable
        accessibilityLabel={language === 'en' ? 'Back' : 'Kembali'}
        accessibilityRole="button"
        onPress={handleBack}
        style={[
          styles.roundBackBtn,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
        testID={backBtnTestID}
      >
        <ArrowLeft size={ICON_SIZE} color={palette.text} strokeWidth={ICON_STROKE} />
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

      {/* Right Element or symmetrical 36px spacer for centering */}
      {rightElement ? (
        <View style={styles.rightWrap}>{rightElement}</View>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: 4,
    paddingHorizontal: 4,
    width: '100%',
  },
  roundBackBtn: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
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
    minWidth: 36,
  },
  spacer: {
    width: 36,
  },
});
