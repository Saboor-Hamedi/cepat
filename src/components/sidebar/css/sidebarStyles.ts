import { StyleSheet } from 'react-native';

import type { ThemePalette } from '../../../context/AppearanceContext';
import { colors, radii, spacing } from '../../../theme/tokens';
import { font } from '../../../theme/typography';

export function createSidebarStyles(palette: ThemePalette) {
  return StyleSheet.create({
    backdrop: {
      backgroundColor: 'rgba(15, 20, 25, 0.45)',
      flex: 1,
      flexDirection: 'row',
    },
    drawer: {
      backgroundColor: palette.surface,
      borderRightColor: palette.border,
      borderRightWidth: 1,
      flexDirection: 'column',
      height: '100%',
      justifyContent: 'space-between',
      maxWidth: 310,
      paddingTop: spacing.xl,
      width: '82%',
    },
    body: {
      flex: 1,
    },
    scrimTapArea: {
      flex: 1,
    },
  });
}

export function createSidebarHeaderStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: {
      paddingBottom: spacing.md,
      paddingHorizontal: spacing.xl,
    },
    profileRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    profileCopy: {
      flex: 1,
      justifyContent: 'center',
    },
    closeBtn: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: palette.surfaceElevated,
      borderRadius: radii.pill,
      height: 32,
      justifyContent: 'center',
      width: 32,
    },
    displayName: {
      color: palette.text,
      fontSize: font.heading,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    emailText: {
      color: palette.textMuted,
      fontSize: font.subtitle,
      marginTop: 2,
    },
    divider: {
      backgroundColor: palette.border,
      height: 1,
      width: '100%',
    },
  });
}

export function createSidebarMenuStyles(palette: ThemePalette) {
  return StyleSheet.create({
    list: {
      flex: 1,
      paddingVertical: spacing.sm,
    },
    item: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.lg,
      paddingHorizontal: spacing.xl,
      paddingVertical: 14,
    },
    itemText: {
      color: palette.text,
      fontSize: font.heading,
      fontWeight: '700',
    },
    itemIconCanvas: {
      alignItems: 'center',
      height: 22,
      justifyContent: 'center',
      width: 22,
    },
    iconUserHead: {
      borderRadius: 5,
      borderWidth: 2,
      height: 9,
      marginBottom: 2,
      width: 9,
    },
    iconUserShoulders: {
      borderLeftWidth: 2,
      borderRightWidth: 2,
      borderTopLeftRadius: 6,
      borderTopRightRadius: 6,
      borderTopWidth: 2,
      height: 6,
      width: 15,
    },
    iconGearOuter: {
      alignItems: 'center',
      borderRadius: 8,
      borderWidth: 2,
      height: 16,
      justifyContent: 'center',
      width: 16,
    },
    iconGearInner: {
      borderRadius: 2.5,
      height: 5,
      width: 5,
    },
    iconSliderLine: {
      borderRadius: 1,
      height: 2,
      marginVertical: 2.5,
      width: 16,
    },
    iconBriefcaseTop: {
      borderLeftWidth: 2,
      borderRightWidth: 2,
      borderTopWidth: 2,
      height: 4,
      width: 8,
    },
    iconBriefcaseBox: {
      borderRadius: 2,
      borderWidth: 2,
      height: 12,
      width: 17,
    },
    iconShield: {
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
      borderTopLeftRadius: 2,
      borderTopRightRadius: 2,
      borderWidth: 2,
      height: 17,
      width: 15,
    },
    iconCalendarBox: {
      borderRadius: 3,
      borderWidth: 2,
      height: 16,
      width: 16,
    },
    iconNotificationBell: {
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      borderWidth: 2,
      height: 14,
      width: 14,
    },
    iconNotificationBase: {
      borderRadius: 2,
      height: 2,
      marginTop: 1,
      width: 18,
    },
  });
}

export function createSidebarFooterStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: {
      borderTopColor: palette.border,
      borderTopWidth: 1,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
    },
    logoutBtn: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.md,
      paddingVertical: 8,
    },
    logoutBtnText: {
      color: colors.danger,
      fontSize: font.heading,
      fontWeight: '800',
    },
    logoutCanvas: {
      alignItems: 'center',
      flexDirection: 'row',
      height: 20,
      width: 20,
    },
    logoutFrame: {
      borderBottomLeftRadius: 3,
      borderBottomWidth: 2,
      borderLeftWidth: 2,
      borderTopLeftRadius: 3,
      borderTopWidth: 2,
      height: 16,
      width: 8,
    },
    logoutShaft: {
      height: 2,
      marginLeft: -2,
      width: 9,
    },
    logoutHead: {
      borderRightWidth: 2,
      borderTopWidth: 2,
      height: 6,
      marginLeft: -5,
      transform: [{ rotate: '45deg' }],
      width: 6,
    },
    guestAuthActions: {
      gap: spacing.xs,
    },
    loginBtn: {
      alignItems: 'center',
      backgroundColor: colors.greenDark,
      borderRadius: radii.pill,
      justifyContent: 'center',
      minHeight: 42,
    },
    loginBtnText: {
      color: '#FFFFFF',
      fontSize: font.subtitle,
      fontWeight: '800',
    },
    registerBtn: {
      alignItems: 'center',
      borderColor: palette.border,
      borderRadius: radii.pill,
      borderWidth: 1,
      justifyContent: 'center',
      minHeight: 42,
    },
    registerBtnText: {
      color: palette.text,
      fontSize: font.subtitle,
      fontWeight: '800',
    },
  });
}
