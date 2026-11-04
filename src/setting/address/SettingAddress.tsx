import { router } from "expo-router";
import { font } from "../../theme/typography";
import { ArrowLeft, Check, CheckCircle2, MapPin, Trash2 } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAppearance } from "../../context/AppearanceContext";
import { localizeArea, useLanguage } from "../../i18n/locale";
import { radii, spacing } from "../../theme/tokens";
import type { SavedAddress } from "../../types/marketplace";
import { SettingSection } from "../components/SettingSection";
import { ICON_SIZE, ICON_STROKE } from "../../theme/icons";

const DEFAULT_AREAS = [
  "Jakarta Selatan",
  "Jakarta Pusat",
  "Jakarta Barat",
  "Jakarta Timur",
  "Jakarta Utara",
  "Tangerang",
  "Depok",
  "Bekasi",
  "Bogor",
];

const PRESET_LABELS = [
  { en: "Home", id: "Rumah" },
  { en: "Office", id: "Kantor" },
  { en: "Apartment", id: "Apartemen" },
  { en: "Other", id: "Lainnya" },
];

export interface SettingAddressProps {
  savedAddresses: SavedAddress[];
  onAddAddress: (input: {
    label: string;
    streetAddress: string;
    area: string;
    notes?: string;
  }) => Promise<void>;
  onDeleteAddress: (id: string) => Promise<void>;
  onSetDefaultAddress: (id: string) => Promise<void>;
  addressFeedback?: string | null;
  returnTo?: string;
}

export function SettingAddress({
  savedAddresses,
  onAddAddress,
  onDeleteAddress,
  onSetDefaultAddress,
  addressFeedback,
  returnTo,
}: SettingAddressProps) {
  const { language } = useLanguage();
  const { palette, scaleFont } = useAppearance();

  const [label, setLabel] = useState(language === "en" ? "Home" : "Rumah");
  const [streetAddress, setStreetAddress] = useState("");
  const [selectedArea, setSelectedArea] = useState(DEFAULT_AREAS[0]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!streetAddress.trim()) {
      setLocalError(
        language === "en"
          ? "Please enter your complete street address."
          : "Silakan masukkan alamat lengkap Anda.",
      );
      return;
    }

    setLocalError(null);
    setSaving(true);
    try {
      await onAddAddress({
        label: label.trim() || (language === "en" ? "Address" : "Alamat"),
        streetAddress: streetAddress.trim(),
        area: selectedArea,
        notes: notes.trim() || undefined,
      });
      setStreetAddress("");
      setNotes("");

      if (returnTo) {
        setTimeout(() => {
          router.replace(returnTo as any);
        }, 500);
      }
    } catch (err: unknown) {
      setLocalError(
        err instanceof Error
          ? err.message
          : language === "en"
            ? "Failed to save address."
            : "Gagal menyimpan alamat.",
      );
    } finally {
      setSaving(false);
    }
  };

  const canSave = Boolean(streetAddress.trim()) && !saving;

  return (
    <SettingSection testID="setting-section-address">
      {returnTo ? (
        <View
          style={[styles.returnToBanner, { backgroundColor: palette.primarySoft }]}
          testID="address-return-to-banner"
        >
          <View
            style={[
              styles.returnToIcon,
              { backgroundColor: `${palette.primary}1F` },
            ]}
          >
            <MapPin size={18} color={palette.primary} strokeWidth={ICON_STROKE} />
          </View>
          <View style={styles.returnToCopy}>
            <Text
              style={[
                styles.returnToTitle,
                { color: palette.text, fontSize: scaleFont(font.label) },
              ]}
            >
              {language === "en"
                ? "Scheduling a Service"
                : "Menjadwalkan Layanan"}
            </Text>
            <Text
              numberOfLines={2}
              style={[
                styles.returnToSub,
                { color: palette.textMuted, fontSize: scaleFont(font.caption) },
              ]}
            >
              {language === "en"
                ? "Pick an address below to use for this booking."
                : "Pilih alamat di bawah untuk pesanan ini."}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace(returnTo as any)}
            style={styles.returnBtn}
            testID="address-return-to-btn"
          >
            <ArrowLeft
              size={ICON_SIZE}
              color={palette.primary}
              strokeWidth={ICON_STROKE}
            />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <Text
            style={[
              styles.subSectionTitle,
              { color: palette.text, fontSize: scaleFont(font.subtitle) },
            ]}
          >
            {language === "en" ? "Saved Addresses" : "Alamat Tersimpan"}
          </Text>
          <View
            style={[styles.countPill, { backgroundColor: palette.surfaceElevated }]}
          >
            <Text
              style={[
                styles.countPillText,
                { color: palette.textSecondary ?? palette.textMuted },
              ]}
            >
              {savedAddresses.length}
            </Text>
          </View>
        </View>

        {savedAddresses.length === 0 ? (
          <View
            style={[
              styles.emptyAddressCard,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <View
              style={[
                styles.emptyIconTile,
                { backgroundColor: palette.surfaceElevated },
              ]}
            >
              <MapPin
                size={ICON_SIZE + 4}
                strokeWidth={ICON_STROKE}
                color={palette.textMuted}
              />
            </View>
            <Text
              style={[
                styles.emptyAddressText,
                { color: palette.textMuted, fontSize: scaleFont(font.body) },
              ]}
            >
              {language === "en"
                ? "No saved addresses yet. Add your first one below."
                : "Belum ada alamat tersimpan. Tambahkan yang pertama di bawah."}
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.addressList,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            {savedAddresses.map((addr, index) => {
              const isLast = index === savedAddresses.length - 1;
              return (
                <View
                  key={addr.id}
                  style={[
                    styles.savedAddressRow,
                    !isLast && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: palette.border,
                    },
                    addr.isDefault && { backgroundColor: palette.primarySoft },
                  ]}
                  testID={`saved-address-${addr.id}`}
                >
                  <View style={styles.savedAddressMain}>
                    <View
                      style={[
                        styles.addressIconTile,
                        { backgroundColor: `${palette.primary}14` },
                      ]}
                    >
                      <MapPin
                        size={16}
                        strokeWidth={ICON_STROKE}
                        color={palette.primary}
                      />
                    </View>

                    <View style={styles.addressCopy}>
                      <View style={styles.labelRow}>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.addressLabel,
                            { color: palette.text, fontSize: scaleFont(font.label) },
                          ]}
                        >
                          {addr.label}
                        </Text>
                        {addr.isDefault && (
                          <View
                            style={[
                              styles.defaultBadge,
                              { backgroundColor: `${palette.primary}1F` },
                            ]}
                          >
                            <Text
                              style={[
                                styles.defaultBadgeText,
                                { color: palette.primary },
                              ]}
                            >
                              {language === "en" ? "Default" : "Utama"}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        numberOfLines={2}
                        style={[
                          styles.streetText,
                          { color: palette.text, fontSize: scaleFont(font.body) },
                        ]}
                      >
                        {addr.streetAddress}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.areaText,
                          { color: palette.textMuted, fontSize: scaleFont(font.caption) },
                        ]}
                      >
                        {localizeArea(addr.area, language)}
                        {addr.notes ? ` · ${addr.notes}` : ""}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.savedAddressActions}>
                    {returnTo ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          void onSetDefaultAddress(addr.id);
                          router.replace(returnTo as any);
                        }}
                        style={[styles.useForBookingBtn, { backgroundColor: palette.primary }]}
                      >
                        <Check size={14} color="#FFFFFF" strokeWidth={ICON_STROKE} />
                        <Text style={styles.useForBookingBtnText}>
                          {language === "en" ? "Use for booking" : "Pakai untuk pesanan"}
                        </Text>
                      </Pressable>
                    ) : (
                      <View style={styles.cardActionsRow}>
                        {!addr.isDefault && (
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => void onSetDefaultAddress(addr.id)}
                            style={styles.smallBtn}
                            testID={`set-default-address-${addr.id}`}
                          >
                            <Text
                              style={[
                                styles.smallBtnText,
                                { color: palette.primary, fontSize: scaleFont(font.caption) },
                              ]}
                            >
                              {language === "en" ? "Set as default" : "Jadikan utama"}
                            </Text>
                          </Pressable>
                        )}
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => void onDeleteAddress(addr.id)}
                          accessibilityLabel={
                            language === "en" ? "Delete address" : "Hapus alamat"
                          }
                          style={styles.iconDangerBtn}
                          testID={`delete-address-${addr.id}`}
                        >
                          <Trash2
                            size={17}
                            strokeWidth={ICON_STROKE}
                            color={palette.danger}
                          />
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.addAddressBox}>
        <Text
          style={[
            styles.inputLabel,
            { color: palette.textMuted, fontSize: scaleFont(font.caption) },
          ]}
        >
          {language === "en" ? "LABEL" : "LABEL"}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillScrollRow}
        >
          {PRESET_LABELS.map((p) => {
            const pLabel = language === "en" ? p.en : p.id;
            const isSelected = label === pLabel;
            return (
              <Pressable
                key={p.en}
                accessibilityRole="button"
                onPress={() => setLabel(pLabel)}
                style={[
                  styles.presetPill,
                  {
                    backgroundColor: isSelected
                      ? palette.primary
                      : palette.surfaceElevated,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.presetPillText,
                    {
                      color: isSelected ? "#FFFFFF" : palette.text,
                      fontSize: scaleFont(font.caption),
                      fontWeight: isSelected ? "700" : "500",
                    },
                  ]}
                >
                  {pLabel}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text
          style={[
            styles.inputLabel,
            { color: palette.textMuted, fontSize: scaleFont(font.caption) },
          ]}
        >
          {language === "en" ? "STREET ADDRESS" : "ALAMAT LENGKAP"} *
        </Text>
        <TextInput
          multiline
          numberOfLines={2}
          onChangeText={setStreetAddress}
          placeholder={
            language === "en"
              ? "Street name, house/building number, floor/unit..."
              : "Nama jalan, nomor rumah/gedung, lantai/unit..."
          }
          placeholderTextColor={palette.textMuted}
          style={[
            styles.textarea,
            {
              backgroundColor: palette.inputBg,
              color: palette.text,
              fontSize: scaleFont(font.label),
            },
          ]}
          testID="new-address-street"
          value={streetAddress}
        />

        <Text
          style={[
            styles.inputLabel,
            { color: palette.textMuted, fontSize: scaleFont(font.caption) },
          ]}
        >
          {language === "en" ? "SERVICE AREA" : "AREA LAYANAN"} *
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillScrollRow}
        >
          {DEFAULT_AREAS.map((areaName) => {
            const isSelected = selectedArea === areaName;
            return (
              <Pressable
                key={areaName}
                accessibilityRole="button"
                onPress={() => setSelectedArea(areaName)}
                style={[
                  styles.presetPill,
                  {
                    backgroundColor: isSelected
                      ? palette.primarySoft
                      : palette.surfaceElevated,
                    borderColor: isSelected ? palette.primary : "transparent",
                    borderWidth: isSelected ? 1 : 0,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.presetPillText,
                    {
                      color: isSelected ? palette.primary : palette.text,
                      fontSize: scaleFont(font.caption),
                      fontWeight: isSelected ? "700" : "500",
                    },
                  ]}
                >
                  {areaName}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text
          style={[
            styles.inputLabel,
            { color: palette.textMuted, fontSize: scaleFont(font.caption) },
          ]}
        >
          {language === "en"
            ? "LANDMARK / NOTES (OPTIONAL)"
            : "PATOKAN / CATATAN (OPSIONAL)"}
        </Text>
        <TextInput
          onChangeText={setNotes}
          placeholder={
            language === "en"
              ? "e.g. Near main gate, opposite Indomaret..."
              : "contoh: Dekat pos satpam, seberang Indomaret..."
          }
          placeholderTextColor={palette.textMuted}
          style={[
            styles.singleInput,
            {
              backgroundColor: palette.inputBg,
              color: palette.text,
              fontSize: scaleFont(font.body),
            },
          ]}
          value={notes}
        />

        {localError ? (
          <Text
            style={[
              styles.errorText,
              { color: palette.danger, fontSize: scaleFont(font.body) },
            ]}
          >
            {localError}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={!canSave}
          onPress={() => void handleSave()}
          style={({ pressed }) => [
            styles.saveBtn,
            {
              backgroundColor: palette.primary,
              opacity: pressed ? 0.9 : 1,
            },
            !canSave && styles.saveBtnDisabled,
          ]}
          testID="add-saved-address-button"
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveBtnText}>
              {language === "en" ? "Save" : "Simpan"}
            </Text>
          )}
        </Pressable>

        {addressFeedback ? (
          <View style={styles.feedbackRow}>
            <CheckCircle2
              size={18}
              strokeWidth={ICON_STROKE}
              color="#16A34A"
            />
            <Text style={[styles.feedbackText, { fontSize: scaleFont(font.body) }]}>
              {addressFeedback}
            </Text>
          </View>
        ) : null}
      </View>
    </SettingSection>
  );
}

const styles = StyleSheet.create({
  returnToBanner: {
    alignItems: "center",
    borderRadius: radii.sm,
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  returnToIcon: {
    alignItems: "center",
    borderRadius: radii.sm,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  returnToCopy: {
    flex: 1,
    minWidth: 0,
  },
  returnToTitle: {
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  returnToSub: {
    lineHeight: 16,
    marginTop: 2,
  },
  returnBtn: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  sectionBlock: {
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  subSectionTitle: {
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  countPill: {
    alignItems: "center",
    borderRadius: radii.sm,
    height: 24,
    justifyContent: "center",
    minWidth: 28,
    paddingHorizontal: 8,
  },
  countPillText: {
    fontSize: font.caption,
    fontWeight: "700",
  },
  emptyAddressCard: {
    alignItems: "center",
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing.sm,
    justifyContent: "center",
    padding: spacing.lg,
  },
  emptyIconTile: {
    alignItems: "center",
    borderRadius: radii.sm,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  emptyAddressText: {
    textAlign: "center",
  },
  addressList: {
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  savedAddressRow: {
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  savedAddressMain: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  savedAddressActions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 2,
  },
  addressIconTile: {
    alignItems: "center",
    borderRadius: radii.sm,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  addressCopy: {
    flex: 1,
    minWidth: 0,
  },
  labelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  addressLabel: {
    fontWeight: "600",
    letterSpacing: -0.2,
    maxWidth: 160,
  },
  defaultBadge: {
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    fontSize: font.caption,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  streetText: {
    lineHeight: 17,
    marginTop: 2,
  },
  areaText: {
    marginTop: 2,
  },
  useForBookingBtn: {
    alignItems: "center",
    borderRadius: radii.sm,
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  useForBookingBtnText: {
    color: "#FFFFFF",
    fontSize: font.body,
    fontWeight: "700",
  },
  cardActionsRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 4,
  },
  smallBtn: {
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  smallBtnText: {
    fontWeight: "700",
  },
  iconDangerBtn: {
    alignItems: "center",
    borderRadius: radii.sm,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  addAddressBox: {
    marginTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  inputLabel: {
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: spacing.xs,
  },
  pillScrollRow: {
    gap: 8,
    paddingBottom: 4,
    paddingRight: spacing.sm,
  },
  presetPill: {
    borderRadius: radii.sm,
    borderWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  presetPillText: {
    letterSpacing: 0.2,
  },
  textarea: {
    borderRadius: radii.sm,
    borderWidth: 0,
    minHeight: 60,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    textAlignVertical: "top",
  },
  singleInput: {
    borderRadius: radii.sm,
    borderWidth: 0,
    height: 40,
    paddingHorizontal: spacing.sm,
  },
  errorText: {
    marginTop: spacing.xs,
  },
  saveBtn: {
    alignItems: "center",
    borderRadius: radii.sm,
    height: 44,
    justifyContent: "center",
    marginTop: spacing.md,
    width: "100%",
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: font.label,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  feedbackRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: spacing.xs,
  },
  feedbackText: {
    color: "#16A34A",
    fontWeight: "600",
  },
});
