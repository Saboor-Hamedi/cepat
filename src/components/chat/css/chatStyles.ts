import { Platform, StyleSheet } from 'react-native';
import { font } from '../../../theme/typography';

const SUCCESS = '#22C55E';

export interface ChatPalette {
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textMuted: string;
  primary: string;
  primarySoft: string;
  border: string;
  pillBg: string;
  danger: string;
}

export function createChatHeaderStyles(palette: {
  border: string;
  primary: string;
  primarySoft: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textMuted: string;
}) {
  return StyleSheet.create({
    activeOnlineDot: {
      backgroundColor: SUCCESS,
      borderRadius: 6,
      borderWidth: 2,
      bottom: 0,
      height: 12,
      position: 'absolute',
      right: 0,
      width: 12,
    },
    avatarWrap: {
      position: 'relative',
    },
    backBtnText: {
      fontSize: font.section,
      fontWeight: '600',
      lineHeight: 26,
    },
    container: {
      position: 'relative',
      width: '100%',
      zIndex: 1000,
    },
    headerRow: {
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      position: 'relative',
      zIndex: 1100,
    },
    iconButton: {
      alignItems: 'center',
      borderRadius: 20,
      height: 38,
      justifyContent: 'center',
      width: 38,
    },
    nameLine: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    partnerInfoRow: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      gap: 10,
    },
    partnerName: {
      flexShrink: 1,
      fontSize: font.heading,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
    partnerStatus: {
      flexShrink: 1,
      fontSize: font.caption,
      fontWeight: '500',
    },
    partnerTextGroup: {
      flex: 1,
      gap: 2,
    },
    pinnedAddress: {
      flex: 1,
      fontSize: font.caption,
      fontWeight: '500',
    },
    pinnedAddressRow: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      gap: 3,
    },
    pinnedCard: {
      alignItems: 'center',
      borderRadius: 5,
      borderWidth: 1,
      borderLeftWidth: 3,
      flexDirection: 'row',
      gap: 10,
      marginBottom: 6,
      marginHorizontal: 5,
      marginTop: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      position: 'relative',
      zIndex: 1,
    },
    pinnedDetails: {
      flex: 1,
      gap: 3,
      justifyContent: 'center',
    },
    pinnedDivider: {
      height: 12,
      opacity: 0.7,
      width: 1,
    },
    pinnedMeta: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    pinnedPrice: {
      fontSize: font.body,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
    pinnedServiceTitle: {
      fontSize: font.label,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
    pinnedThumb: {
      borderRadius: 5,
      height: 44,
      width: 44,
    },
    statusDot: {
      borderRadius: 3,
      height: 6,
      width: 6,
    },
    statusRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 5,
    },
  });
}

export function createChatContentStyles(palette: {
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textMuted: string;
  primary: string;
  primarySoft: string;
  border: string;
  danger: string;
}) {
  return StyleSheet.create({
    avatarLeft: {
      marginRight: 8,
    },
    avatarRight: {
      marginLeft: 8,
    },
    avatarSpacer: {
      width: 30,
    },
    bubble: {
      borderRadius: 5,
      maxWidth: 540,
      minWidth: 70,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    bubbleBody: {
      fontSize: font.title,
      lineHeight: 21,
    },
    bubbleSender: {
      fontSize: font.caption,
      fontWeight: '700',
      marginBottom: 2,
    },
    bubbleTimeUnder: {
      fontSize: font.caption,
      fontWeight: '500',
      marginTop: 3,
      paddingHorizontal: 2,
    },
    clearedBox: {
      alignItems: 'center',
      borderRadius: 5,
      borderWidth: 1,
      marginTop: 12,
      paddingHorizontal: 20,
      paddingVertical: 18,
    },
    clearedText: {
      fontSize: font.body,
      textAlign: 'center',
    },
    closedBanner: {
      alignItems: 'center',
      alignSelf: 'center',
      borderRadius: 999,
      borderStyle: 'dashed',
      borderWidth: 1,
      flexDirection: 'row',
      gap: 6,
      marginBottom: 12,
      marginHorizontal: 20,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    closedBannerText: {
      flexShrink: 1,
      fontSize: font.caption,
      fontWeight: '600',
      textAlign: 'center',
    },
    container: {
      flex: 1,
    },
    emptyBox: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingVertical: 48,
    },
    emptyIconWrap: {
      alignItems: 'center',
      borderRadius: 32,
      height: 64,
      justifyContent: 'center',
      marginBottom: 14,
      width: 64,
    },
    emptySubtitle: {
      fontSize: font.label,
      lineHeight: 18,
      marginTop: 5,
      maxWidth: 280,
      textAlign: 'center',
    },
    emptyTitle: {
      fontSize: font.heading,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
    errorText: {
      fontSize: font.body,
      fontWeight: '600',
      marginHorizontal: 20,
      marginTop: 8,
      textAlign: 'center',
    },
    groupSpacing: {
      marginTop: 8,
    },
    messageAvatarWrap: {
      marginBottom: 2,
    },
    messageRow: {
      alignItems: 'flex-end',
      flexDirection: 'row',
      marginBottom: 2,
    },
    messagesList: {
      gap: 4,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 20,
    },
    myBubble: {
      borderBottomRightRadius: 4,
    },
    myBubbleWrap: {
      alignItems: 'flex-end',
      maxWidth: '78%',
    },
    myRow: {
      justifyContent: 'flex-end',
    },
    securityBanner: {
      alignItems: 'center',
      borderRadius: 5,
      borderStyle: 'dashed',
      borderWidth: 1,
      flexDirection: 'row',
      gap: 6,
      justifyContent: 'center',
      marginHorizontal: 5,
      marginTop: 6,
      marginBottom: 2,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    securityText: {
      fontSize: font.caption,
      fontWeight: '500',
      textAlign: 'center',
    },
    theirBubble: {
      borderBottomLeftRadius: 4,
    },
    theirBubbleWrap: {
      alignItems: 'flex-start',
      maxWidth: '78%',
    },
    theirRow: {
      justifyContent: 'flex-start',
    },
    timeUnderMy: {
      textAlign: 'right',
    },
    timeUnderTheir: {
      textAlign: 'left',
    },
    undoBtn: {
      marginTop: 10,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    undoText: {
      fontSize: font.label,
      fontWeight: '700',
    },
  });
}

export function createChatComposerStyles(palette: {
  border: string;
  pillBg: string;
  primary: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textMuted: string;
}) {
  return StyleSheet.create({
    bookAgainBtn: {
      alignItems: 'center',
      borderRadius: 5,
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
      marginHorizontal: 5,
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    bookAgainBtnText: {
      color: '#FFFFFF',
      fontSize: font.subtitle,
      fontWeight: '700',
      letterSpacing: 0.1,
    },
    completedBadgeText: {
      fontSize: font.label,
      fontWeight: '600',
      letterSpacing: 0.1,
    },
    completedCheckCircle: {
      alignItems: 'center',
      backgroundColor: SUCCESS,
      borderRadius: 9,
      height: 18,
      justifyContent: 'center',
      width: 18,
    },
    completedFooter: {
      borderTopWidth: StyleSheet.hairlineWidth,
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    completedInfoRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 7,
      justifyContent: 'center',
    },
    inputBar: {
      alignItems: 'center',
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      width: '100%',
    },
    inputField: {
      backgroundColor: 'transparent',
      flex: 1,
      fontSize: font.title,
      maxHeight: 120,
      minHeight: 38,
      paddingHorizontal: 10,
      paddingVertical: 8,
      ...(Platform.OS === 'web'
        ? ({
            outlineStyle: 'none',
            outlineWidth: 0,
            resize: 'none',
            boxShadow: 'none',
            borderWidth: 0,
            
          } as unknown as Record<string, unknown>)
        : {}),
    },
    inputPill: {
      alignItems: 'center',
      borderRadius: 5,
      borderWidth: 1,
      flex: 1,
      flexDirection: 'row',
      minHeight: 46,
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    sendBtn: {
      alignItems: 'center',
      borderRadius: 5,
      height: 38,
      justifyContent: 'center',
      width: 38,
    },
  });
}

export function createChatDropdownStyles(palette: {
  border: string;
  pillBg: string;
  primary: string;
  primarySoft: string;
  surface: string;
  text: string;
  danger: string;
}) {
  return StyleSheet.create({
    backdrop: {
      bottom: -1000,
      left: -1000,
      position: 'absolute',
      right: -1000,
      top: -1000,
      zIndex: 1500,
    },
    container: {
      position: 'relative',
      zIndex: 2000,
    },
    dangerIconWrap: {
      backgroundColor: 'rgba(240, 40, 73, 0.12)',
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginVertical: 4,
      opacity: 0.8,
    },
    dropdownMenu: {
      borderRadius: 5,
      borderWidth: 1,
      elevation: 25,
      minWidth: 214,
      overflow: 'visible',
      position: 'absolute',
      right: 0,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
      top: 42,
      zIndex: 9999,
    },
    knob: {
      borderLeftWidth: 1,
      borderTopWidth: 1,
      height: 12,
      position: 'absolute',
      right: 14,
      top: -7,
      transform: [{ rotate: '45deg' }],
      width: 12,
      zIndex: 10000,
    },
    dropdownInner: {
      borderRadius: 5,
      overflow: 'hidden',
      paddingVertical: 6,
    },
    dropdownMenuItem: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    dropdownMenuText: {
      fontSize: font.label,
      fontWeight: '600',
    },
    itemIcon: {
      fontSize: font.label,
    },
    itemIconWrap: {
      alignItems: 'center',
      borderRadius: 9,
      height: 28,
      justifyContent: 'center',
      width: 28,
    },
    menuDotsBtn: {
      alignItems: 'center',
      borderRadius: 20,
      height: 38,
      justifyContent: 'center',
      width: 38,
    },
    menuDotsText: {
      fontSize: font.label,
      fontWeight: '700',
      letterSpacing: 1.2,
      marginTop: -3,
    },
  });
}
