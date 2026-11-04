import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Plus, User } from "lucide-react-native";

import { useAuth } from "../auth/AuthProvider";
import { useAppearance } from "../context/AppearanceContext";
import {
  loadNotifications,
  subscribeToNotificationChanges,
  subscribeToNotifications,
} from "../data/notifications";
import { useLanguage } from "../i18n/locale";
import { useUserAvatar } from "../hooks/useUserAvatar";
import { colors, radii, spacing } from "../theme/tokens";
import { Sidebar } from "./sidebar";
import { ICON_STROKE } from '../theme/icons';
import { font } from '../theme/typography';

export type NavigationTabKey =
  | "marketplace"
  | "bookings"
  | "notifications"
  | "workspace"
  | "admin"
  | "settings";

function NavTabIcon({
  tabKey,
  active,
  strokeColor,
  fillColor,
}: {
  tabKey: NavigationTabKey;
  active: boolean;
  strokeColor: string;
  fillColor: string;
}) {
  if (tabKey === "marketplace") {
    return (
      <View style={styles.iconCanvas}>
        <View style={[styles.homeRoof, { borderColor: strokeColor }]} />
        <View
          style={[
            styles.homeBody,
            { borderColor: strokeColor, backgroundColor: fillColor },
          ]}
        >
          <View style={[styles.homeDoor, { backgroundColor: strokeColor }]} />
        </View>
      </View>
    );
  }

  if (tabKey === "bookings") {
    return (
      <View style={styles.iconCanvas}>
        <View style={styles.calClipsRow}>
          <View style={[styles.calClip, { backgroundColor: strokeColor }]} />
          <View style={[styles.calClip, { backgroundColor: strokeColor }]} />
        </View>
        <View
          style={[
            styles.calBody,
            { borderColor: strokeColor, backgroundColor: fillColor },
          ]}
        >
          <View
            style={[styles.calHeaderLine, { backgroundColor: strokeColor }]}
          />
          <View style={[styles.calRowLine, { backgroundColor: strokeColor }]} />
          <View
            style={[styles.calRowLineShort, { backgroundColor: strokeColor }]}
          />
        </View>
      </View>
    );
  }

  if (tabKey === "notifications") {
    return (
      <View style={styles.iconCanvas}>
        <View style={[styles.bellBody, { borderColor: strokeColor, backgroundColor: fillColor }]} />
        <View style={[styles.bellBase, { backgroundColor: strokeColor }]} />
        <View style={[styles.bellClapper, { backgroundColor: strokeColor }]} />
      </View>
    );
  }

  return (
    <View style={styles.iconCanvas}>
      <View style={styles.sliderTrackRow}>
        <View style={[styles.sliderLine, { backgroundColor: strokeColor }]} />
        <View
          style={[
            styles.sliderKnob,
            {
              left: 3,
              borderColor: strokeColor,
              backgroundColor: active ? strokeColor : "transparent",
            },
          ]}
        />
      </View>
      <View style={styles.sliderTrackRow}>
        <View style={[styles.sliderLine, { backgroundColor: strokeColor }]} />
        <View
          style={[
            styles.sliderKnob,
            {
              right: 3,
              borderColor: strokeColor,
              backgroundColor: active ? strokeColor : "transparent",
            },
          ]}
        />
      </View>
      <View style={styles.sliderTrackRow}>
        <View style={[styles.sliderLine, { backgroundColor: strokeColor }]} />
        <View
          style={[
            styles.sliderKnob,
            {
              left: 10,
              borderColor: strokeColor,
              backgroundColor: active ? strokeColor : "transparent",
            },
          ]}
        />
      </View>
    </View>
  );
}

export function Header({ activeTab }: { activeTab: NavigationTabKey }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { palette, isDark } = useAppearance();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const displayName =
    (typeof user?.user_metadata?.display_name === "string" &&
      user.user_metadata.display_name.trim()) ||
    user?.email?.split("@")[0] ||
    "Guest";

  const userMetadataAvatar =
    (typeof user?.user_metadata?.avatar_url === "string" && user.user_metadata.avatar_url) ||
    (typeof user?.user_metadata?.avatar_path === "string" && user.user_metadata.avatar_path) ||
    (typeof user?.user_metadata?.avatar === "string" && user.user_metadata.avatar) ||
    undefined;

  const hookAvatar = useUserAvatar(user?.id, displayName, userMetadataAvatar);
  const avatarUri = hookAvatar || userMetadataAvatar || undefined;

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;

    const refreshBadge = () => {
      if (!user?.id) return;
      void loadNotifications(user.id)
        .then((items) => {
          if (mounted) {
            setUnreadNotifCount(items.filter((item) => !item.readAt).length);
          }
        })
        .catch(() => {});
    };

    refreshBadge();

    const unsubscribe = subscribeToNotifications(user.id, () => {
      refreshBadge();
    });

    const unsubscribeChanges = subscribeToNotificationChanges(() => {
      refreshBadge();
    });

    return () => {
      mounted = false;
      unsubscribe();
      unsubscribeChanges();
    };
  }, [user?.id]);

  const tabs: {
    key: NavigationTabKey;
    href: "/" | "/bookings" | "/notifications";
    testID: string;
    label: string;
    badgeCount?: number;
  }[] = [
    {
      key: "marketplace",
      href: "/",
      testID: "nav-marketplace",
      label: "Marketplace",
    },
    {
      key: "bookings",
      href: "/bookings",
      testID: "nav-bookings",
      label: "Bookings",
    },
    {
      key: "notifications",
      href: "/notifications",
      testID: "nav-notifications",
      label: language === "en" ? "Notification" : "Notifikasi",
      badgeCount: unreadNotifCount,
    },
  ];

  const renderTab = (item: (typeof tabs)[number]) => {
    const active = activeTab === item.key;
    const strokeColor = active
      ? isDark
        ? "#4EBA97"
        : colors.greenDark
      : palette.textMuted;
    const fillColor = active
      ? isDark
        ? "rgba(52, 113, 94, 0.35)"
        : colors.greenSoft
      : "transparent";

    return (
      <Pressable
        key={item.key}
        accessibilityRole="tab"
        accessibilityLabel={item.label}
        accessibilityState={{ selected: active }}
        onPress={() => {
          if (!active) router.navigate(item.href);
        }}
        style={styles.navTab}
        testID={item.testID}
      >
        <View style={styles.iconWithBadgeWrap}>
          <NavTabIcon
            tabKey={item.key}
            active={active}
            strokeColor={strokeColor}
            fillColor={fillColor}
          />
          {Boolean(item.badgeCount && item.badgeCount > 0) && (
            <View style={styles.badgePill} testID={`${item.testID}-badge`}>
              <Text style={styles.badgeText}>
                {item.badgeCount! > 99 ? "99+" : item.badgeCount}
              </Text>
            </View>
          )}
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.tabLabel,
            {
              color: active
                ? isDark
                  ? "#4EBA97"
                  : colors.greenDark
                : palette.textMuted,
            },
            active && styles.tabLabelActive,
          ]}
        >
          {item.label}
        </Text>
        <View
          style={[
            styles.activeBar,
            active && [
              styles.activeBarVisible,
              {
                backgroundColor: isDark ? "#4EBA97" : colors.greenDark,
              },
            ],
          ]}
        />
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.navBarWrap,
        {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
        },
      ]}
      testID="bottom-navigation-bar"
    >
      <Text style={styles.srOnly}>cepat</Text>

      <View style={styles.singleBar}>
        <View style={[styles.slotGroup, styles.slotGroupLeft]}>
          {renderTab(tabs[0])}
          {renderTab(tabs[1])}
        </View>

        <Pressable
          accessibilityLabel={language === "en" ? "New post" : "Posting baru"}
          accessibilityRole="button"
          onPress={() => router.navigate("/compose" as never)}
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: palette.primary,
              borderColor: palette.surface,
              opacity: pressed ? 0.88 : 1,
              shadowColor: palette.primary,
            },
          ]}
          testID="nav-compose-fab"
        >
          <Plus
            color="#FFFFFF"
            size={30}
            strokeWidth={2.6}
          />
        </Pressable>

        <View style={[styles.slotGroup, styles.slotGroupRight]}>
          {renderTab(tabs[2])}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile sidebar"
            onPress={() => setSidebarOpen(true)}
            style={styles.navTab}
            testID="account-entry"
          >
            <View style={styles.iconWithBadgeWrap}>
              <User size={22} color={palette.textMuted} strokeWidth={ICON_STROKE} />
            </View>
            <Text
              numberOfLines={1}
              style={[styles.tabLabel, { color: palette.textMuted }]}
            >
              Profile
            </Text>
            <View style={styles.activeBar} />
          </Pressable>
        </View>
      </View>

      <Sidebar
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        avatarUri={avatarUri}
      />
    </View>
  );
}

export const AppNavigationBar = Header;

const styles = StyleSheet.create({
  navBarWrap: {
    borderTopWidth: 1,
    height: 56,
    justifyContent: "center",
    overflow: "visible",
    paddingHorizontal: spacing.md,
    zIndex: 30,
  },
  srOnly: {
    height: 0,
    opacity: 0,
    position: "absolute",
    width: 0,
  },
  singleBar: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    height: 56,
    maxWidth: 820,
    position: "relative",
    width: "100%",
  },
  slotGroup: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    height: 56,
    justifyContent: "space-evenly",
  },
  slotGroupLeft: {
    paddingRight: spacing.md + 6,
  },
  slotGroupRight: {
    paddingLeft: spacing.md + 6,
  },
  fab: {
    alignItems: "center",
    borderRadius: 30,
    borderWidth: 4,
    elevation: 12,
    height: 60,
    justifyContent: "center",
    left: "50%",
    marginLeft: -30,
    position: "absolute",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    top: -30,
    width: 60,
    zIndex: 40,
  },
  navTab: {
    alignItems: "center",
    flex: 1,
    height: 56,
    justifyContent: "center",
    paddingBottom: 4,
    paddingTop: 4,
    position: "relative",
  },
  iconWithBadgeWrap: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
    position: "relative",
    width: 28,
  },
  badgePill: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderRadius: radii.pill,
    height: 16,
    justifyContent: "center",
    minWidth: 16,
    paddingHorizontal: 4,
    position: "absolute",
    right: -6,
    top: -4,
    zIndex: 10,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: font.caption,
    fontWeight: "800",
    textAlign: "center",
  },
  tabLabel: {
    fontSize: font.caption,
    fontWeight: "600",
    marginTop: 2,
    textAlign: "center",
  },
  tabLabelActive: {
    fontWeight: "700",
  },
  activeBar: {
    backgroundColor: "transparent",
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    height: 3,
    left: "22%",
    position: "absolute",
    right: "22%",
    top: 0,
  },
  activeBarVisible: {
    backgroundColor: colors.greenDark,
  },
  iconCanvas: {
    alignItems: "center",
    height: 26,
    justifyContent: "center",
    position: "relative",
    width: 26,
  },
  homeRoof: {
    borderLeftWidth: 2,
    borderTopWidth: 2,
    height: 11,
    marginBottom: -5,
    transform: [{ rotate: "45deg" }],
    width: 11,
  },
  homeBody: {
    alignItems: "center",
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    borderWidth: 2,
    height: 11,
    justifyContent: "flex-end",
    width: 15,
  },
  homeDoor: {
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
    height: 5,
    width: 4,
  },
  calClipsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: -2,
    zIndex: 1,
  },
  calClip: {
    borderRadius: 1,
    height: 4,
    width: 2,
  },
  calBody: {
    borderRadius: 4,
    borderWidth: 2,
    height: 14,
    paddingHorizontal: 2,
    paddingTop: 3,
    width: 16,
  },
  calHeaderLine: {
    height: 1.5,
    marginBottom: 2,
    width: "100%",
  },
  calRowLine: {
    height: 1,
    marginBottom: 1.5,
    width: "100%",
  },
  calRowLineShort: {
    height: 1,
    width: "60%",
  },
  bellBody: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1.8,
    borderBottomWidth: 0,
    height: 12,
    width: 13,
  },
  bellBase: {
    borderRadius: 1,
    height: 2,
    marginTop: 0,
    width: 17,
  },
  bellClapper: {
    borderRadius: 1,
    height: 2,
    marginTop: 1,
    width: 4,
  },
  sliderTrackRow: {
    alignItems: "center",
    height: 6,
    justifyContent: "center",
    position: "relative",
    width: 16,
  },
  sliderLine: {
    height: 1.5,
    width: 16,
  },
  sliderKnob: {
    borderRadius: 999,
    borderWidth: 1.5,
    height: 6,
    position: "absolute",
    width: 6,
  },
});
