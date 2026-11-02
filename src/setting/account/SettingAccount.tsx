import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuth } from "../../auth/AuthProvider";
import { Toggle } from "../../components/toggle";
import { useAppearance } from "../../context/AppearanceContext";
import { DEFAULT_PREFERENCES } from "../../data/marketplaceStore";
import { localizeArea, useLanguage, type Language } from "../../i18n/locale";
import { colors, radii, spacing } from "../../theme/tokens";
import type { SavedAddress, UserPreferences } from "../../types/marketplace";
import { SettingItem } from "../components/SettingItem";
import { SettingSection } from "../components/SettingSection";

export interface SettingAccountProps {
  isCustomerRole: boolean;
  email?: string;
  phoneNumber?: string;
  onChangePhoneNumber?: (value: string) => void;
  onSavePrivateContact?: () => Promise<void>;
  savedAddresses: SavedAddress[];
  onAddAddress: (input: {
    label: string;
    streetAddress: string;
    area: string;
  }) => Promise<void>;
  onDeleteAddress: (id: string) => Promise<void>;
  onSetDefaultAddress: (id: string) => Promise<void>;
  addressFeedback?: string | null;
  preferences?: UserPreferences;
  onUpdateBookingPrefs?: (next: UserPreferences["bookingPreferences"]) => void;
  isTechnicianAvailable?: boolean;
  onToggleTechnicianAvailability?: () => void;
  onUpdateNotifications?: (next: UserPreferences["notifications"]) => void;
}

export function SettingAccount({
  isCustomerRole,
  savedAddresses,
  onAddAddress,
  onDeleteAddress,
  onSetDefaultAddress,
  addressFeedback,
  preferences,
  isTechnicianAvailable = true,
  onToggleTechnicianAvailability,
  onUpdateNotifications,
}: SettingAccountProps) {
  const { language, setLanguage, t } = useLanguage();
  const { palette } = useAppearance();
  const { user, effectiveRole } = useAuth();

  const [localAvailable, setLocalAvailable] = useState(true);
  const isAvail = onToggleTechnicianAvailability
    ? isTechnicianAvailable
    : localAvailable;
  const handleToggleAvail =
    onToggleTechnicianAvailability ??
    (() => setLocalAvailable((prev) => !prev));

  const activePrefs = preferences ?? DEFAULT_PREFERENCES;

  const languageOptions: {
    code: Language;
    label: string;
    nativeLabel: string;
    region: string;
    flag: string;
    testID: string;
  }[] = [
    {
      code: "id",
      label: t("settings.indonesian"),
      nativeLabel: "Bahasa Indonesia",
      region: "Indonesia (ID)",
      flag: "🇮🇩",
      testID: "language-id",
    },
    {
      code: "en",
      label: t("settings.english"),
      nativeLabel: "English",
      region: "International (US/UK)",
      flag: "🌐",
      testID: "language-en",
    },
  ];

  const renderLanguageSection = () => (
    <View
      style={[
        styles.cardSectionBox,
        {
          backgroundColor: palette.surfaceElevated,
          borderColor: palette.border,
        },
      ]}
      testID="account-language-section"
    >
      <Text
        style={[
          styles.availabilityToggleTitle,
          { color: palette.text },
        ]}
      >
        {t("settings.languageTitle")}
      </Text>
      <Text
        style={[
          styles.availabilityToggleSub,
          { color: palette.textMuted, marginBottom: spacing.md },
        ]}
      >
        {language === "en"
          ? "Choose interface language for the app."
          : "Pilih bahasa tampilan untuk aplikasi."}
      </Text>

      <View style={styles.languageOptionsWrap}>
        {languageOptions.map((opt) => {
          const selected = language === opt.code;
          return (
            <Pressable
              key={opt.code}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => {
                void setLanguage(opt.code);
              }}
              style={[
                styles.languageOption,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
                selected && {
                  backgroundColor: palette.primarySoft,
                  borderColor: palette.primary,
                },
              ]}
              testID={opt.testID}
            >
              <Text style={styles.flagIcon}>{opt.flag}</Text>
              <View style={styles.textWrap}>
                <Text
                  style={[
                    styles.languageName,
                    { color: selected ? palette.primary : palette.text },
                    selected && styles.languageNameSelected,
                  ]}
                >
                  {opt.label}
                </Text>
                <Text
                  style={[styles.languageSub, { color: palette.textMuted }]}
                >
                  {opt.nativeLabel} · {opt.region}
                </Text>
              </View>
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: selected
                      ? palette.primary
                      : palette.border,
                  },
                ]}
              >
                {selected && (
                  <View
                    style={[
                      styles.radioDot,
                      { backgroundColor: palette.primary },
                    ]}
                  />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const notificationItems: {
    key: keyof UserPreferences["notifications"];
    label: string;
    description: string;
  }[] = [
    {
      key: "push",
      label:
        language === "en"
          ? "Push notifications"
          : "Notifikasi perangkat (Push)",
      description:
        language === "en"
          ? "Receive instant alerts for service activity."
          : "Terima peringatan instan di perangkat.",
    },
    {
      key: "booking",
      label:
        language === "en"
          ? "Booking status updates"
          : "Pembaruan status pesanan",
      description:
        language === "en"
          ? "Get notified when a job status changes."
          : "Beritahu saat status pesanan berubah.",
    },
    {
      key: "messages",
      label:
        language === "en" ? "Chat message alerts" : "Pesan koordinasi kerja",
      description:
        language === "en"
          ? "Alerts for new messages in active booking chats."
          : "Peringatan untuk pesan baru pada percakapan pesanan.",
    },
  ];

  const [completeAddress, setCompleteAddress] = useState("");

  const handleAddAddr = async () => {
    if (!completeAddress.trim()) return;
    await onAddAddress({
      label: language === "en" ? "Address" : "Alamat",
      streetAddress: completeAddress.trim(),
      area: "Jakarta Selatan",
    });
    setCompleteAddress("");
  };

  // Logged-out view
  if (!user) {
    return (
      <SettingSection
        eyebrow={language === "en" ? "ACCOUNT" : "AKUN"}
        title={
          language === "en" ? "Sign In or Register" : "Masuk atau Buat Akun"
        }
        description={
          language === "en"
            ? "Sign in to access your bookings, saved addresses, and profile settings."
            : "Masuk untuk mengakses pesanan, alamat tersimpan, dan pengaturan akun Anda."
        }
        testID="setting-section-account"
      >
        <View
          style={[
            styles.guestCard,
            {
              backgroundColor: palette.surfaceElevated,
              borderColor: palette.border,
            },
          ]}
          testID="account-session-card"
        >
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/login" as any)}
              style={styles.primaryActionBtn}
              testID="account-login"
            >
              <Text style={styles.primaryActionBtnText}>
                {language === "en" ? "Sign In" : "Masuk"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/register" as any)}
              style={styles.secondaryBtn}
              testID="account-register"
            >
              <Text style={styles.secondaryBtnText}>
                {language === "en" ? "Create Account" : "Daftar Akun"}
              </Text>
            </Pressable>
          </View>
        </View>

        {renderLanguageSection()}
      </SettingSection>
    );
  }

  return (
    <SettingSection
      eyebrow={language === "en" ? "ACCOUNT SETTINGS" : "PENGATURAN AKUN"}
      title={language === "en" ? "Account Preferences" : "Preferensi Akun"}
      description={
        language === "en"
          ? "Manage your address details, service availability, and account preferences."
          : "Kelola detail alamat, ketersediaan layanan, dan preferensi akun Anda."
      }
      testID="setting-section-account"
    >
      <View testID="account-session-card">
        {/* 1. STATUS: Service Availability */}
        <View
          style={[
            styles.availabilityToggleBox,
            {
              backgroundColor: palette.surfaceElevated,
              borderColor: palette.border,
            },
          ]}
          testID="technician-availability-setting"
        >
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text
              style={[
                styles.availabilityToggleTitle,
                { color: palette.text },
              ]}
            >
              {language === "en"
                ? "Service Availability"
                : "Ketersediaan Menerima Pesanan"}
            </Text>
            <Text
              style={[
                styles.availabilityToggleSub,
                { color: palette.textMuted },
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

        {/* 2. LANGUAGE */}
        {renderLanguageSection()}

        {/* 3. NOTIFICATION */}
        <View
          style={[
            styles.cardSectionBox,
            {
              backgroundColor: palette.surfaceElevated,
              borderColor: palette.border,
            },
          ]}
          testID="account-notification-section"
        >
          <Text
            style={[
              styles.availabilityToggleTitle,
              { color: palette.text },
            ]}
          >
            {language === "en" ? "Notifications" : "Notifikasi"}
          </Text>
          <Text
            style={[
              styles.availabilityToggleSub,
              { color: palette.textMuted, marginBottom: spacing.md },
            ]}
          >
            {language === "en"
              ? "Manage booking status alerts and coordination message notifications."
              : "Atur notifikasi pembaruan pesanan dan pesan koordinasi."}
          </Text>

          {notificationItems.map((item) => (
            <SettingItem
              key={item.key}
              accessibilityRole="switch"
              active={activePrefs.notifications[item.key]}
              description={item.description}
              label={item.label}
              onPress={() => {
                if (onUpdateNotifications) {
                  onUpdateNotifications({
                    ...activePrefs.notifications,
                    [item.key]: !activePrefs.notifications[item.key],
                  });
                }
              }}
              testID={`pref-notif-${item.key}`}
            />
          ))}
        </View>

        {/* Customer Address Management */}
        {isCustomerRole && effectiveRole === "customer" && (
          <View style={styles.customerBlock}>
            <Text style={styles.subSectionTitle}>
              {language === "en" ? "Saved Addresses" : "Alamat Tersimpan"}
            </Text>

            {savedAddresses.map((addr) => (
              <View
                key={addr.id}
                style={[
                  styles.savedAddressRow,
                  {
                    backgroundColor: palette.surfaceElevated,
                    borderColor: palette.border,
                  },
                ]}
                testID={`saved-address-${addr.id}`}
              >
                <View style={styles.savedAddressCopy}>
                  <View style={styles.savedAddressTop}>
                    <Text
                      style={[
                        styles.savedAddressLabel,
                        { color: palette.text },
                      ]}
                    >
                      {addr.label}
                    </Text>
                    {addr.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>
                          {language === "en" ? "DEFAULT" : "UTAMA"}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={[styles.savedAddressStreet, { color: palette.text }]}
                  >
                    {addr.streetAddress}
                  </Text>
                  <Text
                    style={[
                      styles.savedAddressArea,
                      { color: palette.textMuted },
                    ]}
                  >
                    {localizeArea(addr.area, language)}
                  </Text>
                </View>
                <View style={styles.savedAddressActions}>
                  {!addr.isDefault && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        void onSetDefaultAddress(addr.id);
                      }}
                      style={styles.smallTextBtn}
                      testID={`set-default-address-${addr.id}`}
                    >
                      <Text style={styles.smallTextBtnLabel}>
                        {language === "en" ? "Set default" : "Jadikan utama"}
                      </Text>
                    </Pressable>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      void onDeleteAddress(addr.id);
                    }}
                    style={styles.smallDangerBtn}
                    testID={`delete-address-${addr.id}`}
                  >
                    <Text style={styles.smallDangerBtnLabel}>
                      {language === "en" ? "Remove" : "Hapus"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}

            {/* Single Address Multiline Textarea (quick.md Section 2) */}
            <View
              style={[
                styles.addAddressBox,
                {
                  backgroundColor: palette.surfaceElevated,
                  borderColor: palette.border,
                },
              ]}
            >
              <Text style={[styles.fieldLabel, { color: palette.text }]}>
                {language === "en"
                  ? "Add Complete Address"
                  : "Tambah Alamat Lengkap"}
              </Text>
              <TextInput
                multiline
                numberOfLines={3}
                onChangeText={setCompleteAddress}
                placeholder={
                  language === "en"
                    ? "Enter your complete address (street name, house/unit number, neighborhood, city)..."
                    : "Masukkan alamat lengkap Anda (nama jalan, nomor rumah/unit, kelurahan/kecamatan, kota)..."
                }
                placeholderTextColor={palette.textMuted}
                style={[
                  styles.addressTextarea,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
                testID="new-address-street"
                value={completeAddress}
              />
              <Pressable
                accessibilityRole="button"
                disabled={!completeAddress.trim()}
                onPress={() => {
                  void handleAddAddr();
                }}
                style={[
                  styles.primaryActionBtn,
                  !completeAddress.trim() && styles.btnDisabled,
                ]}
                testID="add-saved-address-button"
              >
                <Text style={styles.primaryActionBtnText}>
                  {language === "en" ? "Save Address" : "Simpan Alamat"}
                </Text>
              </Pressable>
              {addressFeedback ? (
                <Text style={styles.feedbackText}>{addressFeedback}</Text>
              ) : null}
            </View>
          </View>
        )}
      </View>
    </SettingSection>
  );
}

const styles = StyleSheet.create({
  guestCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.xl,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  primaryActionBtn: {
    alignItems: "center",
    backgroundColor: colors.greenDark,
    borderRadius: radii.sm,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  primaryActionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  secondaryBtn: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  secondaryBtnText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  availabilityToggleBox: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  availabilityToggleTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  availabilityToggleSub: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  cardSectionBox: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  languageOptionsWrap: {
    gap: spacing.sm,
  },
  languageOption: {
    alignItems: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  flagIcon: {
    fontSize: 22,
  },
  textWrap: {
    flex: 1,
  },
  languageName: {
    fontSize: 13,
    fontWeight: "700",
  },
  languageNameSelected: {
    fontWeight: "800",
  },
  languageSub: {
    fontSize: 11,
    marginTop: 2,
  },
  radio: {
    alignItems: "center",
    borderRadius: radii.pill,
    borderWidth: 2,
    height: 18,
    justifyContent: "center",
    width: 18,
  },
  radioDot: {
    borderRadius: radii.pill,
    height: 9,
    width: 9,
  },
  availToggleBtn: {
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  availToggleBtnActive: {
    backgroundColor: colors.greenSoft,
  },
  availToggleBtnInactive: {
    backgroundColor: colors.line,
  },
  availToggleBtnText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  availToggleBtnTextActive: {
    color: colors.greenDark,
  },
  customerBlock: {
    marginTop: spacing.xs,
  },
  subSectionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  savedAddressRow: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
    padding: spacing.md,
  },
  savedAddressCopy: {
    flex: 1,
  },
  savedAddressTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  savedAddressLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  defaultBadge: {
    backgroundColor: colors.greenSoft,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    color: colors.greenDark,
    fontSize: 9,
    fontWeight: "800",
  },
  savedAddressStreet: {
    color: colors.ink,
    fontSize: 12,
    marginTop: 2,
  },
  savedAddressArea: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  savedAddressActions: {
    alignItems: "flex-end",
    gap: 4,
    justifyContent: "center",
  },
  smallTextBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  smallTextBtnLabel: {
    color: colors.greenDark,
    fontSize: 11,
    fontWeight: "700",
  },
  smallDangerBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  smallDangerBtnLabel: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: "700",
  },
  addAddressBox: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  fieldLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  addressTextarea: {
    backgroundColor: "#FFFFFF",
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: spacing.sm,
    minHeight: 80,
    padding: spacing.md,
    textAlignVertical: "top",
  },
  feedbackText: {
    color: colors.greenDark,
    fontSize: 12,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
});
