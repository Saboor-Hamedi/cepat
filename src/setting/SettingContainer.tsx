import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
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
import { useLanguage } from "../i18n/locale";
import { colors, spacing } from "../theme/tokens";
import type {
  SavedAddress,
  Technician,
  UserPreferences,
} from "../types/marketplace";
import { SettingAccount } from "./account/SettingAccount";
import { SettingPassword } from "./account/SettingPassword";
import { SettingProfile } from "./account/SettingProfile";
import { SettingAppearance } from "./appearance/SettingAppearance";
import {
  SettingHeader,
  type SettingSectionKey,
} from "./components/SettingHeader";
import { SettingLanguage } from "./language/SettingLanguage";
import { SettingNotifications } from "./notifications/SettingNotifications";
import { SettingSecurity } from "./security/SettingSecurity";

export function SettingContainer() {
  const { language, t } = useLanguage();
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
    params.tab === "profile"
      ? params.tab
      : "account";
  const [selectedSection, setSelectedSection] =
    useState<SettingSectionKey | null>(null);
  const activeSection = selectedSection ?? initialTab;

  const isAuthenticated = Boolean(user);
  const isCustomerRole = effectiveRole === "customer";
  const isTechnicianRole = effectiveRole === "technician";

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarUri, setAvatarUri] = useState("");
  const [addressNotes, setAddressNotes] = useState("");
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [preferences, setPreferences] =
    useState<UserPreferences>(DEFAULT_PREFERENCES);

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [addressFeedback, setAddressFeedback] = useState<string | null>(null);

  const [techProfile, setTechProfile] = useState<Technician | null>(null);
  const [techFeedback, setTechFeedback] = useState<string | null>(null);

  const [deletionRequest, setDeletionRequest] = useState<{
    requestedAt: string;
    reason: string;
  } | null>(null);

  const visibleSection: SettingSectionKey =
    !isAuthenticated &&
    activeSection !== "account" &&
    activeSection !== "language" &&
    activeSection !== "appearance"
      ? "account"
      : activeSection;

  useEffect(() => {
    if (!user) return;

    let active = true;
    void Promise.all([
      loadAccountProfileDetails(
        user.id,
        user.email ?? "",
        user.user_metadata?.display_name,
      ),
      loadUserPreferences(user.id),
      loadSavedAddresses(user.id),
      loadTechnicianWorkspaceProfile(user.id),
      loadAccountDeletionRequest(user.id),
    ])
      .then(([acct, prefs, addresses, tech, delReq]) => {
        if (!active) return;
        setDisplayName(acct.displayName);
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

  const handleSavePublicProfile = async () => {
    if (!user) return;
    setProfileFeedback(null);
    setProfileError(null);
    setIsSavingProfile(true);
    try {
      const updated = await saveAccountProfileDetails(user.id, {
        displayName,
        email,
        phoneNumber,
        avatarUri:
          avatarUri ||
          (typeof user.user_metadata?.avatar_url === "string"
            ? user.user_metadata.avatar_url
            : ""),
        addressNotes,
      });
      setDisplayName(updated.displayName);
      setAvatarUri(updated.avatarUri);
      await updateUserProfile({
        displayName: updated.displayName,
        ...(updated.avatarUri ? { avatarUrl: updated.avatarUri } : {}),
      });
      setProfileFeedback(t("settings.profileSaved"));
    } catch {
      setProfileError(
        language === "en"
          ? "Unable to save profile. Please review the name and try again."
          : "Profil tidak dapat disimpan. Periksa nama dan coba lagi.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePrivateContact = async () => {
    if (!user) return;
    const updated = await saveAccountProfileDetails(user.id, {
      displayName,
      email,
      phoneNumber,
      avatarUri,
      addressNotes,
    });
    setPhoneNumber(updated.phoneNumber);
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
    setTechFeedback(null);
    const saved = await saveTechnicianWorkspaceProfile(user.id, next);
    setTechProfile(saved);
    setTechFeedback(
      language === "en"
        ? "Technician profile updated."
        : "Profil teknisi berhasil diperbarui.",
    );
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
      <AppNavigationBar activeTab="settings" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
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
              />
            </>
          )}

          {visibleSection === "language" && <SettingLanguage />}

          {isAuthenticated && visibleSection === "profile" && (
            <SettingProfile
              displayName={displayName}
              avatarUri={avatarUri}
              onChangeDisplayName={setDisplayName}
              onChangeAvatarUri={setAvatarUri}
              onSavePublicProfile={handleSavePublicProfile}
              profileFeedback={profileFeedback}
              profileError={profileError}
              isSaving={isSavingProfile}
              isTechnicianRole={isTechnicianRole}
              techProfile={techProfile}
              onSaveTechProfile={handleSaveTechProfile}
              techFeedback={techFeedback}
            />
          )}

          {isAuthenticated && visibleSection === "notifications" && (
            <SettingNotifications
              preferences={preferences}
              onUpdateNotifications={(notifications) => {
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
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    width: "100%",
  },
});
