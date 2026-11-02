import { router, useLocalSearchParams } from "expo-router";
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
import { SettingAddress } from "./address/SettingAddress";
import { SettingDeleteAccount } from "./delete-account/SettingDeleteAccount";

export function SettingContainer() {
  const { language } = useLanguage();
  const { palette, setThemeMode, setLargeText, setReduceMotion } =
    useAppearance();
  const { user, effectiveRole, updateUserProfile } = useAuth();
  const params = useLocalSearchParams<{ tab?: string; returnTo?: string }>();
  const initialTab: SettingSectionKey =
    params.tab === "address" ||
    params.tab === "password" ||
    params.tab === "notifications" ||
    params.tab === "language" ||
    params.tab === "appearance" ||
    params.tab === "security" ||
    params.tab === "policy" ||
    params.tab === "delete-account"
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
          {/* Global BackHeader with round 36x36 back button and dynamic centered title */}
          <BackHeader
            title={language === "en" ? "Settings" : "Pengaturan"}
            backBtnTestID="settings-back-btn"
            testID="settings-screen-header"
            onPressBack={
              params.returnTo
                ? () => {
                    router.replace(params.returnTo as any);
                  }
                : undefined
            }
          />

          <SettingHeader
            activeSection={visibleSection}
            onSelectSection={setSelectedSection}
            isAuthenticated={isAuthenticated}
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
              onNavigateToDeleteAccount={() => setSelectedSection("delete-account")}
            />
          )}

          {isAuthenticated && visibleSection === "delete-account" && (
            <SettingDeleteAccount onCancel={() => setSelectedSection("account")} />
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
