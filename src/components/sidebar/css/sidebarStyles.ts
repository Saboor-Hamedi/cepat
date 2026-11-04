import { StyleSheet } from 'react-native';

import type { ThemePalette } from '../../../context/AppearanceContext';
import { spacing } from '../../../theme/tokens';
import { font } from '../../../theme/typography';

export function createSidebarStyles(palette: ThemePalette) {
  return StyleSheet.create({
    backdrop: {
      backgroundColor: 'rgba(8, 12, 18, 0.6)',
      flex: 1,
      flexDirection: 'row',
    },
    drawer: {
      backgroundColor: palette.surface,
      borderRightColor: palette.border,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderBottomRightRadius: 20,
      borderTopRightRadius: 20,
      flexDirection: 'column',
      height: '100%',
      maxWidth: 340,
      paddingTop: spacing.lg,
      width: '78%',
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
      paddingTop: spacing.sm,
    },
    profileRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.md,
    },
    avatarWrap: {
      position: 'relative',
    },
    verifiedBadge: {
      alignItems: 'center',
      backgroundColor: '#10B981',
      borderColor: palette.surface,
      borderRadius: 999,
      borderWidth: 2,
      bottom: 0,
      height: 16,
      justifyContent: 'center',
      position: 'absolute',
      right: 0,
      width: 16,
    },
    profileCopy: {
      flex: 1,
      justifyContent: 'center',
    },
    closeBtn: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: 'transparent',
      borderRadius: 999,
      height: 32,
      justifyContent: 'center',
      marginLeft: spacing.xs,
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
      fontSize: font.label,
      marginTop: 3,
    },
    divider: {
      backgroundColor: palette.border,
      height: StyleSheet.hairlineWidth,
      marginTop: spacing.md,
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
    group: {
      gap: 2,
    },
    groupDivider: {
      backgroundColor: palette.border,
      height: StyleSheet.hairlineWidth,
      marginHorizontal: spacing.xl,
      marginVertical: spacing.sm,
    },
    item: {
      alignItems: 'center',
      borderRadius: 10,
      flexDirection: 'row',
      gap: spacing.md,
      marginHorizontal: spacing.sm,
      minHeight: 48,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    itemPressed: {
      backgroundColor: `${palette.primary}14`,
    },
    itemIconCanvas: {
      alignItems: 'center',
      height: 22,
      justifyContent: 'center',
      width: 22,
    },
    itemText: {
      color: palette.text,
      flex: 1,
      fontSize: font.subtitle,
      fontWeight: '600',
    },
    itemTextMuted: {
      color: palette.textMuted,
    },
    chevron: {
      color: palette.textMuted,
      fontWeight: '700',
    },
  });
}

export function createSidebarFooterStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: {
      borderTopColor: palette.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      padding: spacing.md,
      paddingHorizontal: spacing.xl,
    },
    logoutBtn: {
      alignItems: 'center',
      backgroundColor: 'rgba(248, 113, 113, 0.12)',
      borderRadius: 14,
      flexDirection: 'row',
      gap: spacing.md,
      justifyContent: 'center',
      minHeight: 48,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      width: '100%',
    },
    logoutBtnText: {
      color: '#F87171',
      fontSize: font.label,
      fontWeight: '800',
    },
    guestAuthActions: {
      gap: spacing.sm,
    },
    loginBtn: {
      alignItems: 'center',
      backgroundColor: palette.primary,
      borderRadius: 12,
      justifyContent: 'center',
      minHeight: 48,
    },
    loginBtnText: {
      color: '#FFFFFF',
      fontSize: font.subtitle,
      fontWeight: '800',
    },
    registerBtn: {
      alignItems: 'center',
      borderColor: palette.border,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      justifyContent: 'center',
      minHeight: 48,
    },
    registerBtnText: {
      color: palette.text,
      fontSize: font.subtitle,
      fontWeight: '800',
    },
  });
}
