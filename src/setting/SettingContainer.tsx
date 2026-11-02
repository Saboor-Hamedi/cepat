import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../auth/AuthProvider";
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
  submitAccountDeletionRequest,
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
import { SettingAppearance } from "./appearance/SettingAppearance";
import {
  SettingHeader,
  type SettingSectionKey,
} from "./components/SettingHeader";
import { SettingLanguage } from "./language/SettingLanguage";
import { SettingNotifications } from "./notifications/SettingNotifications";
import { SettingPolicy } from "./policy/SettingPolicy";
import { SettingSecurity } from "./security/SettingSecurity";

export function SettingContainer() {
  const { language } = useLanguage();
  const { palette, setThemeMode, setLargeText, setReduceMotion } =
    useAppearance();
  const { user, effectiveRole, updateUserProfile } = useAuth();
  const params = useLocalSearchParams<{ tab?: string }>();
  const initialTab: SettingSectionKey =
    params.tab === "password" ||
    params.tab === "notifications" ||
    params.tab === "language" ||
    params.tab === "appearance" ||
    params.tab === "security" ||
    params.tab === "policy"
      ? params.tab
      : "account";
  const [selectedSection, setSelectedSection] =
    useState<SettingSectionKey | null>(null);
  const activeSection = selectedSection ?? initialTab;

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
  const [deletionRequest, setDeletionRequest] = useState<{
    requestedAt: string;
    reason: string;
  } | null>(null);

  const visibleSection: SettingSectionKey =
    !isAuthenticated &&
    activeSection !== "account" &&
    activeSection !== "language" &&
    activeSection !== "appearance" &&
    activeSection !== "policy"
      ? "account"
      : activeSection;

  useEffect(() => {
    if (!user) return;

    let active = true;
    const fallbackName =
      (typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name.trim()) ||
      (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
      (user.email ? user.email.split("@")[0] : "");
    const fallbackUsername =
      (typeof user.user_metadata?.username === "string" && user.user_metadata.username.trim()) ||
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
    const targetUserId = user?.id || (isAuthenticated ? "demo-customer" : undefined);
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

  const handleSaveProfileIdentity = async (newName: string, newUsername?: string) => {
    const targetUserId = user?.id || (isAuthenticated ? "demo-customer" : undefined);
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

  const handleDeletionRequest = async (reason: string) => {
    if (!user) return;
    const result = await submitAccountDeletionRequest(user.id, reason);
    setDeletionRequest(result);
  };

  const activeBg =
    preferences.appearance === "dark" || palette.background === "#18191A"
      ? palette.background
      : preferences.appearance === "warm"
        ? "#F4EFE6"
        : preferences.appearance === "highContrast"
          ? "#FFFFFF"
          : palette.background;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: activeBg }]}
      edges={["top", "bottom"]}
    >
      <ScrollView style={styles.screenContent} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Header with Back button, Title, and balance spacer matching Booking and Task */}
          <View style={styles.headerBar} testID="settings-screen-header">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={language === "en" ? "Back" : "Kembali"}
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/");
                }
              }}
              style={[
                styles.headerBackBtn,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
              testID="settings-back-btn"
            >
              <ArrowLeft size={18} color={palette.text} strokeWidth={2.2} />
            </Pressable>

            <View style={styles.headerTitleWrap}>
              <Text style={[styles.headerTitle, { color: palette.text }]}>
                {language === "en" ? "Settings" : "Pengaturan"}
              </Text>
            </View>

            <View style={{ width: 36 }} />
          </View>

          <SettingHeader
            activeSection={visibleSection}
            onSelectSection={setSelectedSection}
            isAuthenticated={isAuthenticated}
            userName={displayName || user?.email?.split("@")[0]}
            avatarUri={
              avatarUri ||
              (typeof user?.user_metadata?.avatar_url === "string"
                ? user.user_metadata.avatar_url
                : undefined)
            }
            userRole={
              effectiveRole === "customer"
                ? language === "en"
                  ? "Customer"
                  : "Pelanggan"
                : effectiveRole === "technician"
                  ? language === "en"
                    ? "Technician"
                    : "Teknisi"
                  : effectiveRole === "admin"
                    ? "Admin"
                    : undefined
            }
          />

          {visibleSection === "account" && (
            <>
              <SettingAccount
                isCustomerRole={isCustomerRole}
                isTechnicianAvailable={techProfile?.available ?? true}
                onToggleTechnicianAvailability={handleToggleTechAvailability}
                email={isAuthenticated ? email : ""}
                phoneNumber={isAuthenticated ? phoneNumber : ""}
                onChangePhoneNumber={setPhoneNumber}
                onSavePrivateContact={handleSavePrivateContact}
                savedAddresses={isAuthenticated ? savedAddresses : []}
                onAddAddress={handleAddAddress}
                onDeleteAddress={handleDeleteAddress}
                onSetDefaultAddress={handleSetDefaultAddress}
                addressFeedback={addressFeedback}
                preferences={preferences}
                onUpdateBookingPrefs={(bookingPreferences) => {
                  void handleUpdatePrefs({
                    ...preferences,
                    bookingPreferences,
                  });
                }}
                onUpdateNotifications={(notifications) => {
                  void setInAppPushEnabled(notifications.push);
                  void handleUpdatePrefs({ ...preferences, notifications });
                }}
              />
            </>
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
              deletionRequest={deletionRequest}
              onSubmitDeletionRequest={handleDeletionRequest}
              email={email}
              phoneNumber={phoneNumber}
              onChangePhoneNumber={setPhoneNumber}
              onSavePrivateContact={handleSavePrivateContact}
              displayName={displayName}
              username={username}
              onSaveDisplayName={handleSaveDisplayName}
              onSaveProfileIdentity={handleSaveProfileIdentity}
            />
          )}

          {visibleSection === "policy" && <SettingPolicy />}
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
    maxWidth: 820,
    paddingHorizontal: 5,
    paddingTop: spacing.sm,
    width: "100%",
  },
  headerBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    marginTop: 4,
    width: "100%",
  },
  headerBackBtn: {
    alignItems: "center",
    borderRadius: 5,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  headerTitleWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
});
