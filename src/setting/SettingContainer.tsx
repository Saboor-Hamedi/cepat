import { router, useLocalSearchParams } from "expo-router";
import {
  Bell,
  FileText,
  Globe,
  Info,
  Lock,
  MapPin,
  Palette,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../auth/AuthProvider";
import { BackHeader } from "../components/BackHeader";
import { AppNavigationBar } from "../components/marketplace-ui";
import { useAppearance } from "../context/AppearanceContext";
import {
  DEFAULT_PREFERENCES,
  deleteCustomerAddress,
  loadAccountDeletionRequest,
  loadAccountProfileDetails,
  loadSavedAddresses,
  loadTechnicianWorkspaceProfile,
  loadUserPreferences,
  saveAccountProfileDetails,
  saveCustomerAddress,
  saveTechnicianWorkspaceProfile,
  saveUserPreferences,
  setDefaultCustomerAddress,
} from "../data/marketplaceStore";
import { setInAppPushEnabled } from "../data/notifications";
import { useLanguage } from "../i18n/locale";
import { colors, spacing } from "../theme/tokens";
import type {
  SavedAddress,
  Technician,
  UserPreferences,
} from "../types/marketplace";
import { SettingAccount } from "./account/SettingAccount";
import { SettingPassword } from "./account/SettingPassword";
import { SettingAddress } from "./address/SettingAddress";
import { SettingAppearance } from "./appearance/SettingAppearance";
import { type SettingSectionKey } from "./components/SettingHeader";
import { SettingNavLink } from "./components/SettingNavLink";
import { SettingDeleteAccount } from "./delete-account/SettingDeleteAccount";
import { SettingLanguage } from "./language/SettingLanguage";
import { SettingNotifications } from "./notifications/SettingNotifications";
import { SettingPolicy } from "./policy/SettingPolicy";
import { SettingSecurity } from "./security/SettingSecurity";
import { APP_VERSION, SettingVersion } from "./version";

export function SettingContainer() {
  const { language } = useLanguage();
  const { palette, setThemeMode, setLargeText, setReduceMotion } =
    useAppearance();
  const { user, effectiveRole, updateUserProfile } = useAuth();
  const params = useLocalSearchParams<{ tab?: string; returnTo?: string }>();

  // If a tab param was explicitly passed in the URL, open that panel directly
  const explicitTab: SettingSectionKey | null =
    params.tab === "address" ||
    params.tab === "security" ||
    params.tab === "password" ||
    params.tab === "notifications" ||
    params.tab === "language" ||
    params.tab === "appearance" ||
    params.tab === "policy" ||
    params.tab === "version" ||
    params.tab === "delete-account" ||
    params.tab === "account"
      ? (params.tab as SettingSectionKey)
      : null;

  const [selectedSection, setSelectedSection] =
    useState<SettingSectionKey | null>(explicitTab);

  const activeSection = selectedSection;

  const isAuthenticated = Boolean(user);
  const isCustomerRole = effectiveRole === "customer";
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarUri, setAvatarUri] = useState("");
  const [addressNotes, setAddressNotes] = useState("");
  const [preferences, setPreferences] =
    useState<UserPreferences>(DEFAULT_PREFERENCES);

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [addressFeedback, setAddressFeedback] = useState<string | null>(null);

  const [techProfile, setTechProfile] = useState<Technician | null>(null);
  const [, setDeletionRequest] = useState<{
    requestedAt: string;
    reason: string;
  } | null>(null);

  // If not authenticated and a protected section is active, redirect to null
  const visibleSection: SettingSectionKey | null =
    !isAuthenticated &&
    activeSection &&
    activeSection !== "account" &&
    activeSection !== "language" &&
    activeSection !== "appearance" &&
    activeSection !== "policy" &&
    activeSection !== "version"
      ? null
      : activeSection;

  useEffect(() => {
    if (!user) return;

    let active = true;
    const fallbackName =
      (typeof user.user_metadata?.display_name === "string" &&
        user.user_metadata.display_name.trim()) ||
      (typeof user.user_metadata?.full_name === "string" &&
        user.user_metadata.full_name.trim()) ||
      (user.email ? user.email.split("@")[0] : "");
    const fallbackUsername =
      (typeof user.user_metadata?.username === "string" &&
        user.user_metadata.username.trim()) ||
      (user.email ? user.email.split("@")[0] : "");

    void Promise.all([
      loadAccountProfileDetails(
        user.id,
        user.email ?? "",
        fallbackName,
        fallbackUsername,
      ),
      loadUserPreferences(user.id),
      loadSavedAddresses(user.id),
      loadTechnicianWorkspaceProfile(user.id),
      loadAccountDeletionRequest(user.id),
    ])
      .then(([acct, prefs, addresses, tech, delReq]) => {
        if (!active) return;
        setDisplayName(acct.displayName || fallbackName);
        setUsername(acct.username || fallbackUsername);
        setEmail(user.email ?? acct.email);
        setPhoneNumber(acct.phoneNumber);
        setAvatarUri(
          acct.avatarUri ||
            (typeof user.user_metadata?.avatar_url === "string"
              ? user.user_metadata.avatar_url
              : ""),
        );
        setAddressNotes(acct.addressNotes);
        setPreferences(prefs);
        if (
          prefs.appearance === "light" ||
          prefs.appearance === "dark" ||
          prefs.appearance === "system"
        ) {
          void setThemeMode(prefs.appearance);
        }
        void setLargeText(prefs.accessibility.largeText);
        void setReduceMotion(prefs.accessibility.reduceMotion);
        setSavedAddresses(addresses);
        setTechProfile(tech);
        setDeletionRequest(delReq);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [setLargeText, setReduceMotion, setThemeMode, user]);

  const handleSavePrivateContact = async () => {
    const targetUserId =
      user?.id || (isAuthenticated ? "demo-customer" : undefined);
    if (!targetUserId) return;
    const updated = await saveAccountProfileDetails(targetUserId, {
      displayName,
      username,
      email,
      phoneNumber,
      avatarUri,
      addressNotes,
    });
    setPhoneNumber(updated.phoneNumber);
  };

  const handleSaveProfileIdentity = async (
    newName: string,
    newUsername?: string,
  ) => {
    const targetUserId =
      user?.id || (isAuthenticated ? "demo-customer" : undefined);
    if (!targetUserId) return;
    const updated = await saveAccountProfileDetails(targetUserId, {
      displayName: newName,
      username: newUsername !== undefined ? newUsername : username,
      email,
      phoneNumber,
      avatarUri,
      addressNotes,
    });
    setDisplayName(updated.displayName);
    if (updated.username) setUsername(updated.username);
    await updateUserProfile({
      displayName: updated.displayName,
      username: updated.username,
    });
  };

  const handleSaveDisplayName = async (newName: string) => {
    await handleSaveProfileIdentity(newName, username);
  };

  const handleUpdatePrefs = async (next: UserPreferences) => {
    setPreferences(next);
    await saveUserPreferences(user?.id, next);
  };

  const handleAddAddress = async (input: {
    label: string;
    streetAddress: string;
    area: string;
  }) => {
    if (!user) return;
    setAddressFeedback(null);
    try {
      const updated = await saveCustomerAddress(user.id, {
        label: input.label,
        streetAddress: input.streetAddress,
        area: input.area,
        isDefault: savedAddresses.length === 0,
      });
      setSavedAddresses(updated);
      setAddressFeedback(
        language === "en" ? "Address saved." : "Alamat berhasil disimpan.",
      );
    } catch {
      setAddressFeedback(
        language === "en"
          ? "Complete address fields."
          : "Lengkapi kolom alamat.",
      );
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!user) return;
    const updated = await deleteCustomerAddress(user.id, id);
    setSavedAddresses(updated);
  };

  const handleSetDefaultAddress = async (id: string) => {
    if (!user) return;
    const updated = await setDefaultCustomerAddress(user.id, id);
    setSavedAddresses(updated);
  };

  const handleSaveTechProfile = async (next: Technician) => {
    if (!user) return;
    const saved = await saveTechnicianWorkspaceProfile(user.id, next);
    setTechProfile(saved);
  };

  const handleToggleTechAvailability = async () => {
    if (!user || !techProfile) return;
    const next = { ...techProfile, available: !techProfile.available };
    await handleSaveTechProfile(next);
  };

  const activeBg =
    preferences.appearance === "dark" || palette.background === "#18191A"
      ? palette.background
      : preferences.appearance === "warm"
        ? "#F4EFE6"
        : preferences.appearance === "highContrast"
          ? "#FFFFFF"
          : palette.background;

  const getSectionTitle = (section: SettingSectionKey): string => {
    switch (section) {
      case "account":
        return language === "en" ? "Account" : "Akun";
      case "address":
        return language === "en" ? "Address" : "Alamat";
      case "security":
        return language === "en" ? "Security" : "Keamanan";
      case "password":
        return language === "en" ? "Password" : "Kata Sandi";
      case "language":
        return language === "en" ? "Language" : "Bahasa";
      case "notifications":
        return language === "en" ? "Notifications" : "Notifikasi";
      case "appearance":
        return language === "en" ? "Appearance" : "Tampilan";
      case "policy":
        return language === "en" ? "Term Policy" : "Kebijakan & Syarat";
      case "version":
        return language === "en" ? "Current Version" : "Versi Saat Ini";
      case "delete-account":
        return language === "en" ? "Delete Account" : "Hapus Akun";
    }
  };

  const handleBackPress = () => {
    if (visibleSection !== null) {
      // Return to main settings list
      if (params.returnTo && explicitTab === visibleSection) {
        router.replace(params.returnTo as any);
      } else {
        setSelectedSection(null);
      }
    } else if (params.returnTo) {
      router.replace(params.returnTo as any);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/" as any);
    }
  };

  const currentThemeLabel =
    preferences.appearance === "dark"
      ? language === "en"
        ? "Dark"
        : "Gelap"
      : preferences.appearance === "light"
        ? language === "en"
          ? "Light"
          : "Terang"
        : language === "en"
          ? "System"
          : "Sistem";

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: activeBg }]}
      edges={["top", "bottom"]}
    >
      <ScrollView
        style={styles.screenContent}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {/* Header with dynamic title and back navigation */}
          <BackHeader
            title={
              visibleSection
                ? getSectionTitle(visibleSection)
                : language === "en"
                  ? "Settings"
                  : "Pengaturan"
            }
            backBtnTestID="settings-back-btn"
            testID="settings-screen-header"
            onPressBack={handleBackPress}
          />

          {/* FIRST PAGE: Clean, improved Navlinks list with 5px gap */}
          {visibleSection === null && (
            <View style={styles.navLinksWrapper}>
              <View style={styles.navLinksList} testID="settings-navlinks-list">
                {/* 1. Account */}
                <SettingNavLink
                  icon={User}
                  title={language === "en" ? "Account" : "Akun"}
                  subtitle={
                    user
                      ? displayName || user.email || ""
                      : language === "en"
                        ? "Sign in or create account"
                        : "Masuk atau buat akun baru"
                  }
                  onPress={() => setSelectedSection("account")}
                  testID="setting-tab-account"
                />

                {/* 2. Address (Auth Only) */}
                {isAuthenticated && (
                  <SettingNavLink
                    icon={MapPin}
                    title={language === "en" ? "Address" : "Alamat"}
                    subtitle={
                      savedAddresses.length > 0
                        ? language === "en"
                          ? `${savedAddresses.length} saved addresses`
                          : `${savedAddresses.length} alamat tersimpan`
                        : language === "en"
                          ? "Manage service and delivery addresses"
                          : "Kelola alamat pengantaran layanan"
                    }
                    onPress={() => setSelectedSection("address")}
                    testID="setting-tab-address"
                  />
                )}

                {/* 3. Security (Auth Only) */}
                {isAuthenticated && (
                  <SettingNavLink
                    icon={ShieldCheck}
                    title={language === "en" ? "Security" : "Keamanan"}
                    subtitle={
                      language === "en"
                        ? "Profile name, phone & private credentials"
                        : "Nama profil, nomor HP & kontak privat"
                    }
                    onPress={() => setSelectedSection("security")}
                    testID="setting-tab-security"
                  />
                )}

                {/* 4. Password (Auth Only) */}
                {isAuthenticated && (
                  <SettingNavLink
                    icon={Lock}
                    title={language === "en" ? "Password" : "Kata Sandi"}
                    subtitle={
                      language === "en"
                        ? "Update your account password"
                        : "Perbarui kata sandi akun"
                    }
                    onPress={() => setSelectedSection("password")}
                    testID="setting-tab-password"
                  />
                )}

                {/* 5. Language */}
                <SettingNavLink
                  icon={Globe}
                  title={language === "en" ? "Language" : "Bahasa"}
                  subtitle={
                    language === "en"
                      ? "Choose interface language"
                      : "Pilih bahasa tampilan"
                  }
                  valueText={
                    language === "en" ? "English" : "Bahasa Indonesia"
                  }
                  onPress={() => setSelectedSection("language")}
                  testID="setting-tab-language"
                />

                {/* 6. Notifications (Auth Only) */}
                {isAuthenticated && (
                  <SettingNavLink
                    icon={Bell}
                    title={language === "en" ? "Notifications" : "Notifikasi"}
                    subtitle={
                      language === "en"
                        ? "Push alerts, booking updates & chat"
                        : "Notifikasi push, pembaruan pesanan & chat"
                    }
                    onPress={() => setSelectedSection("notifications")}
                    testID="setting-tab-notifications"
                  />
                )}

                {/* 7. Appearance */}
                <SettingNavLink
                  icon={Palette}
                  title={language === "en" ? "Appearance" : "Tampilan"}
                  subtitle={
                    language === "en"
                      ? "Color theme & accessibility"
                      : "Tema warna & aksesibilitas"
                  }
                  valueText={currentThemeLabel}
                  onPress={() => setSelectedSection("appearance")}
                  testID="setting-tab-appearance"
                />

                {/* 8. Term Policy */}
                <SettingNavLink
                  icon={FileText}
                  title={language === "en" ? "Term Policy" : "Kebijakan & Syarat"}
                  subtitle={
                    language === "en"
                      ? "Terms of service, privacy & community safety"
                      : "Ketentuan layanan, privasi & keamanan"
                  }
                  onPress={() => setSelectedSection("policy")}
                  testID="setting-tab-policy"
                />

                {/* 9. Current Version - displays version directly on the nav link */}
                <SettingNavLink
                  icon={Info}
                  title={language === "en" ? "Current Version" : "Versi Saat Ini"}
                  subtitle={
                    language === "en"
                      ? "App release & build status"
                      : "Rilis aplikasi & status build"
                  }
                  valueText={`v${APP_VERSION}`}
                  onPress={() => setSelectedSection("version")}
                  testID="setting-tab-version"
                />

                {/* 10. Delete Account (Auth Only) */}
                {isAuthenticated && (
                  <SettingNavLink
                    icon={Trash2}
                    title={language === "en" ? "Delete Account" : "Hapus Akun"}
                    subtitle={
                      language === "en"
                        ? "Permanently erase account & all data"
                        : "Hapus akun & seluruh data secara permanen"
                    }
                    isDanger
                    onPress={() => setSelectedSection("delete-account")}
                    testID="setting-tab-delete-account"
                  />
                )}
              </View>
            </View>
          )}

          {/* SINGLE SUB-PANEL: Rendered cleanly without redundant top tabs */}
          {visibleSection !== null && (
            <View style={styles.panelContainer}>
              {visibleSection === "account" && (
                <SettingAccount
                  isCustomerRole={isCustomerRole}
                  isTechnicianAvailable={techProfile?.available ?? true}
                  onToggleTechnicianAvailability={handleToggleTechAvailability}
                  email={isAuthenticated ? email : ""}
                  phoneNumber={phoneNumber}
                  onChangePhoneNumber={setPhoneNumber}
                  onSavePrivateContact={handleSavePrivateContact}
                  preferences={preferences}
                  onUpdateBookingPrefs={(bookingPreferences) => {
                    void handleUpdatePrefs({
                      ...preferences,
                      bookingPreferences,
                    });
                  }}
                />
              )}

              {isAuthenticated && visibleSection === "address" && (
                <SettingAddress
                  savedAddresses={isAuthenticated ? savedAddresses : []}
                  onAddAddress={handleAddAddress}
                  onDeleteAddress={handleDeleteAddress}
                  onSetDefaultAddress={handleSetDefaultAddress}
                  addressFeedback={addressFeedback}
                  returnTo={params.returnTo}
                />
              )}

              {visibleSection === "language" && <SettingLanguage />}

              {isAuthenticated && visibleSection === "notifications" && (
                <SettingNotifications
                  preferences={preferences}
                  onUpdateNotifications={(notifications) => {
                    void setInAppPushEnabled(notifications.push);
                    void handleUpdatePrefs({ ...preferences, notifications });
                  }}
                />
              )}

              {visibleSection === "appearance" && (
                <SettingAppearance
                  preferences={preferences}
                  onUpdateAppearance={(appearance) => {
                    void handleUpdatePrefs({ ...preferences, appearance });
                  }}
                  onUpdateAccessibility={(accessibility) => {
                    void handleUpdatePrefs({ ...preferences, accessibility });
                  }}
                />
              )}

              {isAuthenticated && visibleSection === "password" && (
                <SettingPassword />
              )}

              {isAuthenticated && visibleSection === "security" && (
                <SettingSecurity
                  email={email}
                  phoneNumber={phoneNumber}
                  onChangePhoneNumber={setPhoneNumber}
                  onSavePrivateContact={handleSavePrivateContact}
                  displayName={displayName}
                  username={username}
                  onSaveDisplayName={handleSaveDisplayName}
                  onSaveProfileIdentity={handleSaveProfileIdentity}
                  onNavigateToDeleteAccount={() =>
                    setSelectedSection("delete-account")
                  }
                />
              )}

              {visibleSection === "version" && <SettingVersion />}

              {isAuthenticated && visibleSection === "delete-account" && (
                <SettingDeleteAccount
                  onCancel={() => setSelectedSection(null)}
                />
              )}

              {visibleSection === "policy" && <SettingPolicy />}
            </View>
          )}
        </View>
      </ScrollView>
      <AppNavigationBar activeTab="settings" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
  },
  safeArea: {
    backgroundColor: colors.paper,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  content: {
    alignSelf: "center",
    maxWidth: 580,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    width: "100%",
  },
  navLinksWrapper: {
    alignItems: "center",
    width: "100%",
  },
  navLinksList: {
    gap: 5,
    maxWidth: 480,
    marginTop: spacing.xs,
    paddingBottom: spacing.lg,
    width: "100%",
  },
  panelContainer: {
    alignSelf: "center",
    maxWidth: 500,
    paddingTop: spacing.sm,
    width: "100%",
  },
});
