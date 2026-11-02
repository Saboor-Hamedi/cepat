import { router } from "expo-router";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../auth/AuthProvider";
import { useAppearance } from "../context/AppearanceContext";
import { useLanguage } from "../i18n/locale";
import { colors, radii, spacing } from "../theme/tokens";
import { Avatar } from "./Avatar";
import { useUserAvatar } from "../hooks/useUserAvatar";

export interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  avatarUri?: string;
}

export type ProfileSidebarModalProps = SidebarProps;

function LucideLogoutIcon({ color = colors.danger }: { color?: string }) {
  return (
    <View style={styles.lucideLogoutCanvas}>
      {/* Door frame left bracket */}
      <View style={[styles.lucideLogoutFrame, { borderColor: color }]} />
      {/* Arrow shaft */}
      <View style={[styles.lucideLogoutShaft, { backgroundColor: color }]} />
      {/* Arrow chevron head */}
      <View style={[styles.lucideLogoutHead, { borderColor: color }]} />
    </View>
  );
}

function SidebarItemIcon({
  kind,
  color = "#0F1419",
}: {
  kind:
    | "profile"
    | "settings"
    | "preferences"
    | "bookings"
    | "notifications"
    | "workspace"
    | "admin";
  color?: string;
}) {
  const stroke = color;
  if (kind === "profile") {
    return (
      <View style={styles.itemIconCanvas}>
        <View style={[styles.iconUserHead, { borderColor: stroke }]} />
        <View style={[styles.iconUserShoulders, { borderColor: stroke }]} />
      </View>
    );
  }
  if (kind === "settings") {
    return (
      <View style={styles.itemIconCanvas}>
        <View style={[styles.iconGearOuter, { borderColor: stroke }]}>
          <View style={[styles.iconGearInner, { backgroundColor: stroke }]} />
        </View>
      </View>
    );
  }
  if (kind === "preferences") {
    return (
      <View style={styles.itemIconCanvas}>
        <View style={[styles.iconSliderLine, { backgroundColor: stroke }]} />
        <View style={[styles.iconSliderLine, { backgroundColor: stroke }]} />
      </View>
    );
  }
  if (kind === "workspace") {
    return (
      <View style={styles.itemIconCanvas}>
        <View style={[styles.iconBriefcaseTop, { borderColor: stroke }]} />
        <View style={[styles.iconBriefcaseBox, { borderColor: stroke }]} />
      </View>
    );
  }
  if (kind === "admin") {
    return (
      <View style={styles.itemIconCanvas}>
        <View style={[styles.iconShield, { borderColor: stroke }]} />
      </View>
    );
  }
  if (kind === "notifications") {
    return (
      <View style={styles.itemIconCanvas}>
        <View style={[styles.iconNotificationBell, { borderColor: stroke }]} />
        <View style={[styles.iconNotificationBase, { backgroundColor: stroke }]} />
      </View>
    );
  }
  return (
    <View style={styles.itemIconCanvas}>
      <View style={[styles.iconCalendarBox, { borderColor: stroke }]} />
    </View>
  );
}

export function Sidebar({ visible, onClose, avatarUri }: SidebarProps) {
  const { language } = useLanguage();
  const { user, roles, effectiveRole, signOut } = useAuth();
  const { palette } = useAppearance();

  const isAuthenticated = Boolean(user);
  const isVerifiedAdmin =
    isAuthenticated && (roles.includes("admin") || effectiveRole === "admin");
  const isTechnician =
    isAuthenticated &&
    (effectiveRole === "technician" || roles.includes("technician"));

  const displayName = isAuthenticated
    ? (typeof user?.user_metadata?.display_name === "string" &&
        user.user_metadata.display_name.trim()) ||
      user?.email?.split("@")[0] ||
      "Cepat User"
    : language === "en"
      ? "Guest Visitor"
      : "Pengunjung Tamu";

  const rawEmailPart = (
    user?.email?.split("@")[0] || "cepat_member"
  ).toLowerCase();
  const strippedUsername = rawEmailPart.replace(/\d+/g, "");
  const userMetadataAvatar =
    (typeof user?.user_metadata?.avatar_url === "string" && user.user_metadata.avatar_url) ||
    (typeof user?.user_metadata?.avatar_path === "string" && user.user_metadata.avatar_path) ||
    (typeof user?.user_metadata?.avatar === "string" && user.user_metadata.avatar) ||
    undefined;
  const hookAvatar = useUserAvatar(user?.id, displayName, avatarUri || userMetadataAvatar);
  const effectiveAvatarUri = avatarUri || hookAvatar || userMetadataAvatar || undefined;

  const accountIdentifier = isAuthenticated
    ? strippedUsername || rawEmailPart
    : language === "en"
      ? "Not signed in"
      : "Belum masuk";

  const navigateAndClose = (
    target:
      | "/"
      | "/account"
      | "/bookings"
      | "/notifications"
      | "/technician-dashboard"
      | "/admin"
      | "/login"
      | "/register"
      | `/technician/${string}`
      | { pathname: "/account"; params: { tab: string } },
  ) => {
    onClose();
    try {
      router.push(target as never);
    } catch {
      // Router may not be mounted in isolated unit component tests.
    }
  };

  const handleLogout = async () => {
    await signOut();
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop} testID="profile-sidebar-modal">
        {/* Left Twitter/X-style Drawer Panel */}
        <View
          style={[
            styles.drawer,
            {
              backgroundColor: palette.surface,
              borderRightColor: palette.border,
            },
          ]}
        >
          <View style={styles.profileHeader}>
            <View style={styles.avatarTopRow}>
              <Avatar
                uri={isAuthenticated ? effectiveAvatarUri : undefined}
                name={displayName}
                size={48}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  language === "en" ? "Close menu" : "Tutup menu"
                }
                onPress={onClose}
                style={[
                  styles.closeBtn,
                  { backgroundColor: palette.surfaceElevated },
                ]}
                testID="sidebar-close-button"
              >
                <Text style={[styles.closeBtnText, { color: palette.text }]}>
                  ×
                </Text>
              </Pressable>
            </View>

            <Text
              numberOfLines={1}
              style={[styles.displayName, { color: palette.text }]}
              testID="sidebar-display-name"
            >
              {displayName}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.handleText, { color: palette.textMuted }]}
              testID="sidebar-handle"
            >
              {accountIdentifier}
            </Text>

            {isAuthenticated && (
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: palette.primarySoft },
                ]}
              >
                <Text
                  style={[styles.roleBadgeText, { color: palette.primary }]}
                >
                  {isVerifiedAdmin
                    ? "Administrator"
                    : isTechnician
                      ? language === "en"
                        ? "Professional Technician"
                        : "Mitra Teknisi"
                      : language === "en"
                        ? "Customer"
                        : "Pelanggan"}
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <ScrollView style={styles.menuList}>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                navigateAndClose(
                  !isAuthenticated
                    ? "/login"
                    : `/technician/${user?.id || (isTechnician ? "demo-rizky" : "demo-customer")}`,
                )
              }
              style={styles.menuItem}
              testID="sidebar-view-profile"
            >
              <SidebarItemIcon kind="profile" color={palette.text} />
              <Text style={[styles.menuItemText, { color: palette.text }]}>
                {language === "en" ? "View Profile" : "Lihat Profil"}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => navigateAndClose("/account")}
              style={styles.menuItem}
              testID="sidebar-settings"
            >
              <SidebarItemIcon kind="settings" color={palette.text} />
              <Text style={[styles.menuItemText, { color: palette.text }]}>
                {language === "en" ? "Settings" : "Pengaturan"}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() =>
                navigateAndClose({
                  pathname: "/account",
                  params: { tab: "appearance" },
                })
              }
              style={styles.menuItem}
              testID="sidebar-preferences"
            >
              <SidebarItemIcon kind="preferences" color={palette.text} />
              <Text style={[styles.menuItemText, { color: palette.text }]}>
                {language === "en" ? "Account preferences" : "Preferensi akun"}
              </Text>
            </Pressable>

            {isTechnician ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => navigateAndClose("/technician-dashboard")}
                style={styles.menuItem}
                testID="sidebar-workspace"
              >
                <SidebarItemIcon kind="workspace" color={palette.text} />
                <Text style={[styles.menuItemText, { color: palette.text }]}>
                  {language === "en"
                    ? "Professional Profile & Requests"
                    : "Profil & Permintaan"}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => navigateAndClose("/bookings")}
                style={styles.menuItem}
                testID="sidebar-bookings"
              >
                <SidebarItemIcon kind="bookings" color={palette.text} />
                <Text style={[styles.menuItemText, { color: palette.text }]}>
                  {language === "en"
                    ? "Bookings & Messages"
                    : "Pesanan & Pesan"}
                </Text>
              </Pressable>
            )}

            {isVerifiedAdmin && (
              <Pressable
                accessibilityRole="button"
                onPress={() => navigateAndClose("/admin")}
                style={styles.menuItem}
                testID="sidebar-admin"
              >
                <SidebarItemIcon kind="admin" color={palette.text} />
                <Text style={[styles.menuItemText, { color: palette.text }]}>
                  {language === "en"
                    ? "Admin Control Center"
                    : "Pusat Kontrol Admin"}
                </Text>
              </Pressable>
            )}
          </ScrollView>

          <View
            style={[styles.bottomFooter, { borderTopColor: palette.border }]}
          >
            {isAuthenticated ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void handleLogout();
                }}
                style={styles.logoutBtn}
                testID="sidebar-logout"
              >
                <LucideLogoutIcon color={colors.danger} />
                <Text style={styles.logoutBtnText}>Log out</Text>
              </Pressable>
            ) : (
              <View style={styles.guestAuthActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigateAndClose("/login")}
                  style={styles.loginBtn}
                  testID="sidebar-login"
                >
                  <Text style={styles.loginBtnText}>
                    {language === "en" ? "Sign in" : "Masuk"}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigateAndClose("/register")}
                  style={[styles.registerBtn, { borderColor: palette.border }]}
                  testID="sidebar-register"
                >
                  <Text
                    style={[styles.registerBtnText, { color: palette.text }]}
                  >
                    {language === "en" ? "Create account" : "Buat akun"}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss sidebar"
          onPress={onClose}
          style={styles.scrimTapArea}
        />
      </View>
    </Modal>
  );
}

export const ProfileSidebarModal = Sidebar;

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(15, 20, 25, 0.45)",
    flex: 1,
    flexDirection: "row",
  },
  drawer: {
    borderRightWidth: 1,
    flexDirection: "column",
    height: "100%",
    justifyContent: "space-between",
    maxWidth: 310,
    paddingTop: spacing.xl,
    width: "82%",
  },
  scrimTapArea: {
    flex: 1,
  },
  profileHeader: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  avatarTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  closeBtn: {
    alignItems: "center",
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  closeBtnText: {
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 22,
  },
  displayName: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  handleText: {
    fontSize: 14,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    marginTop: spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    width: "100%",
  },
  menuList: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
  menuItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
  },
  menuItemText: {
    fontSize: 17,
    fontWeight: "700",
  },
  itemIconCanvas: {
    alignItems: "center",
    height: 22,
    justifyContent: "center",
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
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    height: 6,
    width: 15,
  },
  iconGearOuter: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 2,
    height: 16,
    justifyContent: "center",
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
  bottomFooter: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  logoutBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: 8,
  },
  logoutBtnText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: "800",
  },
  lucideLogoutCanvas: {
    alignItems: "center",
    flexDirection: "row",
    height: 20,
    width: 20,
  },
  lucideLogoutFrame: {
    borderBottomLeftRadius: 3,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 3,
    borderTopWidth: 2,
    height: 16,
    width: 8,
  },
  lucideLogoutShaft: {
    height: 2,
    marginLeft: -2,
    width: 9,
  },
  lucideLogoutHead: {
    borderRightWidth: 2,
    borderTopWidth: 2,
    height: 6,
    marginLeft: -5,
    transform: [{ rotate: "45deg" }],
    width: 6,
  },
  guestAuthActions: {
    gap: spacing.xs,
  },
  loginBtn: {
    alignItems: "center",
    backgroundColor: colors.greenDark,
    borderRadius: radii.pill,
    justifyContent: "center",
    minHeight: 42,
  },
  loginBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  registerBtn: {
    alignItems: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 42,
  },
  registerBtnText: {
    fontSize: 14,
    fontWeight: "800",
  },
});
