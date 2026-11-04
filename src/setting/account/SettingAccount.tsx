import { router } from "expo-router";
import { LogOut, ShieldCheck } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../../auth/AuthProvider";
import { Avatar } from "../../components/Avatar";
import { Toggle } from "../../components/toggle";
import { useAppearance } from "../../context/AppearanceContext";
import { useLanguage } from "../../i18n/locale";
import { ICON_SIZE, ICON_STROKE } from "../../theme/icons";
import { radii, spacing } from "../../theme/tokens";
import { font } from "../../theme/typography";
import type { SavedAddress, UserPreferences } from "../../types/marketplace";
import { SettingSection } from "../components/SettingSection";

export interface SettingAccountProps {
  isCustomerRole?: boolean;
  email?: string;
  phoneNumber?: string;
  onChangePhoneNumber?: (value: string) => void;
  onSavePrivateContact?: () => Promise<void>;
  savedAddresses?: SavedAddress[];
  onAddAddress?: (input: {
    label: string;
    streetAddress: string;
    area: string;
  }) => Promise<void>;
  onDeleteAddress?: (id: string) => Promise<void>;
  onSetDefaultAddress?: (id: string) => Promise<void>;
  addressFeedback?: string | null;
  preferences?: UserPreferences;
  onUpdateBookingPrefs?: (next: UserPreferences["bookingPreferences"]) => void;
  isTechnicianAvailable?: boolean;
  onToggleTechnicianAvailability?: () => void;
  onUpdateNotifications?: (next: UserPreferences["notifications"]) => void;
}

export function SettingAccount({
  isTechnicianAvailable = true,
  onToggleTechnicianAvailability,
}: SettingAccountProps) {
  const { language } = useLanguage();
  const { palette, scaleFont } = useAppearance();
  const { user, effectiveRole, signOut } = useAuth();

  const [localAvailable, setLocalAvailable] = useState(true);
  const isAvail = onToggleTechnicianAvailability
    ? isTechnicianAvailable
    : localAvailable;
  const handleToggleAvail =
    onToggleTechnicianAvailability ??
    (() => setLocalAvailable((prev) => !prev));

  // Logged-out view
  if (!user) {
    return (
      <SettingSection testID="setting-section-account">
        <View
          style={[
            styles.guestBox,
            {
              backgroundColor: "transparent",
            },
          ]}
          testID="account-session-card"
        >
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/login" as any)}
              style={[styles.primaryActionBtn, { backgroundColor: palette.primary }]}
              testID="account-login"
            >
              <Text style={styles.primaryActionBtnText}>
                {language === "en" ? "Sign In" : "Masuk"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/register" as any)}
              style={[
                styles.secondaryBtn,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
              testID="account-register"
            >
              <Text style={[styles.secondaryBtnText, { color: palette.text }]}>
                {language === "en" ? "Create Account" : "Daftar Akun"}
              </Text>
            </Pressable>
          </View>
        </View>
      </SettingSection>
    );
  }

  const userName =
    (typeof user.user_metadata?.display_name === "string" &&
      user.user_metadata.display_name.trim()) ||
    (typeof user.user_metadata?.full_name === "string" &&
      user.user_metadata.full_name.trim()) ||
    (user.email ? user.email.split("@")[0] : "User");

  const avatarUrl =
    typeof user.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : undefined;

  return (
    <SettingSection testID="setting-section-account">
      <View testID="account-session-card" style={styles.container}>
        <View style={styles.cleanProfileRow}>
          <Avatar uri={avatarUrl} name={userName} size={56} />
          <View style={styles.profileInfo}>
            <Text
              style={[
                styles.profileName,
                { color: palette.text, fontSize: scaleFont(font.subtitle) },
              ]}
            >
              {userName}
            </Text>
            <Text
              style={[
                styles.profileEmail,
                { color: palette.textMuted, fontSize: scaleFont(font.caption) },
              ]}
            >
              {user.email ?? ""}
            </Text>
            <View style={styles.roleBadgeRow}>
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: `${palette.primary}15` },
                ]}
              >
                <ShieldCheck
                  size={13}
                  strokeWidth={ICON_STROKE}
                  color={palette.primary}
                />
                <Text
                  style={[
                    styles.roleBadgeText,
                    { color: palette.primary, fontSize: scaleFont(font.caption) },
                  ]}
                >
                  {effectiveRole === "technician"
                    ? language === "en"
                      ? "Verified Technician"
                      : "Teknisi Terverifikasi"
                    : effectiveRole === "admin"
                      ? "Admin"
                      : language === "en"
                        ? "Customer"
                        : "Pelanggan"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.cleanDivider, { backgroundColor: palette.border }]} />

        <View
          style={styles.cleanToggleRow}
          testID="technician-availability-setting"
        >
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text
              style={[
                styles.toggleTitle,
                { color: palette.text, fontSize: scaleFont(font.label) },
              ]}
            >
              {language === "en"
                ? "Service Availability"
                : "Ketersediaan Menerima Pesanan"}
            </Text>
            <Text
              style={[
                styles.toggleSub,
                { color: palette.textMuted, fontSize: scaleFont(font.caption) },
              ]}
            >
              {isAvail
                ? language === "en"
                  ? "Available to accept customer bookings"
                  : "Aktif menerima permintaan pesanan pelanggan"
                : language === "en"
                  ? "Currently offline"
                  : "Sedang tidak menerima pesanan (offline)"}
            </Text>
          </View>
          <Toggle
            checked={isAvail}
            onChange={handleToggleAvail}
            testID="settings-availability-toggle"
          />
        </View>

        <View style={[styles.cleanDivider, { backgroundColor: palette.border }]} />

        <Pressable
          accessibilityRole="button"
          onPress={() => void signOut()}
          style={({ pressed }) => [
            styles.cleanSignOutBtn,
            {
              backgroundColor: `${palette.danger}10`,
              borderColor: `${palette.danger}25`,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
          testID="account-signout-btn"
        >
          <LogOut size={ICON_SIZE} strokeWidth={ICON_STROKE} color={palette.danger} />
          <Text
            style={[
              styles.signOutText,
              { color: palette.danger, fontSize: scaleFont(font.label) },
            ]}
          >
            {language === "en" ? "Sign Out" : "Keluar dari Akun"}
          </Text>
        </Pressable>
      </View>
    </SettingSection>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
  },
  guestBox: {
    paddingVertical: spacing.sm,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  primaryActionBtn: {
    alignItems: "center",
    borderRadius: radii.sm,
    flex: 1,
    justifyContent: "center",
    paddingVertical: 12,
  },
  primaryActionBtnText: {
    color: "#FFFFFF",
    fontSize: font.label,
    fontWeight: "700",
  },
  secondaryBtn: {
    alignItems: "center",
    borderRadius: radii.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    paddingVertical: 12,
  },
  secondaryBtnText: {
    fontSize: font.label,
    fontWeight: "700",
  },
  cleanProfileRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontWeight: "700",
  },
  profileEmail: {
    marginTop: 2,
  },
  roleBadgeRow: {
    flexDirection: "row",
    marginTop: 4,
  },
  roleBadge: {
    alignItems: "center",
    borderRadius: radii.sm,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleBadgeText: {
    fontWeight: "600",
  },
  cleanToggleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
  },
  toggleTitle: {
    fontWeight: "600",
  },
  toggleSub: {
    marginTop: 2,
  },
  cleanDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
  },
  cleanSignOutBtn: {
    alignItems: "center",
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    marginTop: spacing.md,
    paddingVertical: 12,
  },
  signOutText: {
    fontWeight: "700",
  },
});
