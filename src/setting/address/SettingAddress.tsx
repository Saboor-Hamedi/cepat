import { router } from "expo-router";
import { font } from '../../theme/typography';
import { ArrowLeft, Check, CheckCircle2, MapPin, Plus, Trash2 } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
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
import { ICON_SIZE, ICON_STROKE } from '../../theme/icons';

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

      // If user came from booking flow, provide clean return
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

  return (
    <SettingSection
      eyebrow={language === "en" ? "Address Management" : "Manajemen Alamat"}
      title={language === "en" ? "Service Addresses" : "Alamat Layanan"}
      description={
        language === "en"
          ? "Manage your saved service locations for quick scheduling and booking."
          : "Kelola alamat layanan tersimpan untuk mempercepat pemesanan teknisi."
      }
      testID="setting-section-address"
    >
      {/* Return to Booking Notice if directed from Schedule a Service */}
      {returnTo ? (
        <View
          style={[
            styles.returnToBanner,
            { backgroundColor: palette.primarySoft, borderColor: palette.primary },
          ]}
          testID="address-return-to-banner"
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.returnToTitle, { color: palette.text, fontSize: scaleFont(font.label) }]}>
              {language === "en"
                ? "Scheduling a Service"
                : "Menjadwalkan Layanan"}
            </Text>
            <Text style={[styles.returnToSub, { color: palette.textMuted, fontSize: scaleFont(font.body) }]}>
              {language === "en"
                ? "Add or select an address below to use for your booking."
                : "Tambah atau pilih alamat di bawah untuk pesanan Anda."}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace(returnTo as any)}
            style={[styles.returnBtn, { backgroundColor: palette.primary }]}
            testID="address-return-to-btn"
          >
            <ArrowLeft size={ICON_SIZE} color="#FFFFFF" strokeWidth={ICON_STROKE} />
            <Text style={styles.returnBtnText}>
              {language === "en" ? "Back to Booking" : "Kembali ke Jadwal"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Saved Addresses List */}
      <View style={styles.sectionBlock}>
        <Text style={[styles.subSectionTitle, { color: palette.text, fontSize: scaleFont(font.subtitle) }]}>
          {language === "en" ? "Saved Addresses" : "Alamat Tersimpan"} ({savedAddresses.length})
        </Text>

        {savedAddresses.length === 0 ? (
          <View
            style={[
              styles.emptyAddressCard,
              { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
            ]}
          >
            <MapPin size={ICON_SIZE} strokeWidth={ICON_STROKE} color={palette.textMuted} />
            <Text style={[styles.emptyAddressText, { color: palette.textMuted, fontSize: scaleFont(font.body) }]}>
              {language === "en"
                ? "No saved addresses yet. Enter your address below."
                : "Belum ada alamat tersimpan. Masukkan alamat Anda di bawah."}
            </Text>
          </View>
        ) : (
          <View style={styles.addressList}>
            {savedAddresses.map((addr) => (
              <View
                key={addr.id}
                style={[
                  styles.savedAddressCard,
                  {
                    backgroundColor: palette.surfaceElevated,
                    borderColor: addr.isDefault ? palette.primary : palette.border,
                  },
                ]}
                testID={`saved-address-${addr.id}`}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={styles.labelRow}>
                    <MapPin size={ICON_SIZE} strokeWidth={ICON_STROKE} color={palette.primary} />
                    <Text style={[styles.addressLabel, { color: palette.text, fontSize: scaleFont(font.subtitle) }]}>
                      {addr.label}
                    </Text>
                    {addr.isDefault && (
                      <View
                        style={[
                          styles.defaultBadge,
                          { backgroundColor: palette.primarySoft, borderColor: palette.primary },
                        ]}
                      >
                        <Text style={[styles.defaultBadgeText, { color: palette.primary }]}>
                          {language === "en" ? "DEFAULT" : "UTAMA"}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardActionsRow}>
                    {!addr.isDefault && (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void onSetDefaultAddress(addr.id)}
                        style={[styles.smallBtn, { borderColor: palette.border }]}
                        testID={`set-default-address-${addr.id}`}
                      >
                        <Text style={[styles.smallBtnText, { color: palette.text, fontSize: scaleFont(font.caption) }]}>
                          {language === "en" ? "Set default" : "Jadikan utama"}
                        </Text>
                      </Pressable>
                    )}
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void onDeleteAddress(addr.id)}
                      style={styles.smallDangerBtn}
                      testID={`delete-address-${addr.id}`}
                    >
                      <Trash2 size={ICON_SIZE} strokeWidth={ICON_STROKE} color={palette.danger} />
                    </Pressable>
                  </View>
                </View>

                <Text style={[styles.streetText, { color: palette.text, fontSize: scaleFont(font.label) }]}>
                  {addr.streetAddress}
                </Text>

                <Text style={[styles.areaText, { color: palette.textMuted, fontSize: scaleFont(font.caption) }]}>
                  {localizeArea(addr.area, language)}
                  {addr.notes ? ` · ${addr.notes}` : ""}
                </Text>

                {returnTo && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      void onSetDefaultAddress(addr.id);
                      router.replace(returnTo as any);
                    }}
                    style={[styles.useForBookingBtn, { backgroundColor: palette.primary }]}
                  >
                    <Check size={ICON_SIZE} color="#FFFFFF" strokeWidth={ICON_STROKE} />
                    <Text style={styles.useForBookingBtnText}>
                      {language === "en" ? "Use this address for booking" : "Gunakan alamat ini"}
                    </Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Add New Address Form */}
      <View
        style={styles.addAddressBox}
      >
        <View style={styles.formHeader}>
          <Plus size={ICON_SIZE} strokeWidth={ICON_STROKE} color={palette.primary} />
          <Text style={[styles.formTitle, { color: palette.text, fontSize: scaleFont(font.subtitle) }]}>
            {language === "en" ? "Add New Service Address" : "Tambah Alamat Layanan Baru"}
          </Text>
        </View>

        {/* Preset Label Pills */}
        <Text style={[styles.inputLabel, { color: palette.text, fontSize: scaleFont(font.body) }]}>
          {language === "en" ? "Address Label" : "Label Alamat"}
        </Text>
        <View style={styles.pillRow}>
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
                    backgroundColor: isSelected ? palette.primary : palette.surfaceElevated,
                    borderColor: isSelected ? palette.primary : palette.border,
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
        </View>

        {/* Complete Street Address Textarea */}
        <Text style={[styles.inputLabel, { color: palette.text, fontSize: scaleFont(font.body) }]}>
          {language === "en" ? "Complete Street Address" : "Alamat Lengkap"} *
        </Text>
        <TextInput
          multiline
          numberOfLines={3}
          onChangeText={setStreetAddress}
          placeholder={
            language === "en"
              ? "Street name, house/building number, floor/unit, neighborhood..."
              : "Nama jalan, nomor rumah/gedung, lantai/unit, RT/RW, kelurahan..."
          }
          placeholderTextColor={palette.textMuted}
          style={[
            styles.textarea,
            {
              backgroundColor: palette.surfaceElevated,
              borderColor: palette.border,
              color: palette.text,
              fontSize: scaleFont(font.label),
            },
          ]}
          testID="new-address-street"
          value={streetAddress}
        />

        {/* Service Area Selector Chips */}
        <Text style={[styles.inputLabel, { color: palette.text, fontSize: scaleFont(font.body) }]}>
          {language === "en" ? "Service Area / City" : "Area Layanan / Kota"} *
        </Text>
        <View style={styles.pillRow}>
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
                    backgroundColor: isSelected ? palette.primarySoft : palette.surfaceElevated,
                    borderColor: isSelected ? palette.primary : palette.border,
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
        </View>

        {/* Optional Landmark or Notes */}
        <Text style={[styles.inputLabel, { color: palette.text, fontSize: scaleFont(font.body) }]}>
          {language === "en" ? "Landmark / Notes (Optional)" : "Patokan / Catatan (Opsional)"}
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
              backgroundColor: palette.surfaceElevated,
              borderColor: palette.border,
              color: palette.text,
              fontSize: scaleFont(font.body),
            },
          ]}
          value={notes}
        />

        {/* Error message */}
        {localError ? (
          <Text style={[styles.errorText, { color: palette.danger, fontSize: scaleFont(font.body) }]}>
            {localError}
          </Text>
        ) : null}

        {/* Success Feedback */}
        {addressFeedback ? (
          <View style={styles.feedbackRow}>
            <CheckCircle2 size={ICON_SIZE} strokeWidth={ICON_STROKE} color="#16A34A" />
            <Text style={[styles.feedbackText, { fontSize: scaleFont(font.body) }]}>
              {addressFeedback}
            </Text>
          </View>
        ) : null}

        {/* Save Address Button */}
        <Pressable
          accessibilityRole="button"
          disabled={saving || !streetAddress.trim()}
          onPress={() => void handleSave()}
          style={[
            styles.saveBtn,
            { backgroundColor: palette.primary },
            (!streetAddress.trim() || saving) && styles.saveBtnDisabled,
          ]}
          testID="add-saved-address-button"
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveBtnText}>
              {language === "en" ? "Save Address" : "Simpan Alamat"}
            </Text>
          )}
        </Pressable>
      </View>
    </SettingSection>
  );
}

const styles = StyleSheet.create({
  returnToBanner: {
    alignItems: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.sm,
  },
  returnToTitle: {
    fontWeight: "700",
  },
  returnToSub: {
    marginTop: 2,
  },
  returnBtn: {
    alignItems: "center",
    borderRadius: radii.sm,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  returnBtnText: {
    color: "#FFFFFF",
    fontSize: font.caption,
    fontWeight: "700",
  },
  sectionBlock: {
    marginBottom: spacing.md,
  },
  subSectionTitle: {
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  emptyAddressCard: {
    alignItems: "center",
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing.xs,
    justifyContent: "center",
    padding: spacing.md,
  },
  emptyAddressText: {
    textAlign: "center",
  },
  addressList: {
    gap: spacing.sm,
  },
  savedAddressCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.sm,
  },
  cardHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  labelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  addressLabel: {
    fontWeight: "700",
  },
  defaultBadge: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  defaultBadgeText: {
    fontSize: font.caption,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  cardActionsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  smallBtn: {
    borderRadius: radii.xs,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  smallBtnText: {
    fontWeight: "600",
  },
  smallDangerBtn: {
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  streetText: {
    lineHeight: 18,
    marginVertical: 2,
  },
  areaText: {
    marginTop: 2,
  },
  useForBookingBtn: {
    alignItems: "center",
    borderRadius: radii.sm,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    marginTop: spacing.xs,
    paddingVertical: 6,
  },
  useForBookingBtnText: {
    color: "#FFFFFF",
    fontSize: font.body,
    fontWeight: "700",
  },
  addAddressBox: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  formHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginBottom: spacing.xs,
  },
  formTitle: {
    fontWeight: "700",
  },
  inputLabel: {
    fontWeight: "600",
    marginBottom: 4,
    marginTop: spacing.xs,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: spacing.xs,
  },
  presetPill: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  presetPillText: {
    letterSpacing: 0.2,
  },
  textarea: {
    borderRadius: radii.sm,
    borderWidth: 1,
    minHeight: 68,
    padding: spacing.sm,
    textAlignVertical: "top",
  },
  singleInput: {
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 38,
    paddingHorizontal: spacing.sm,
  },
  errorText: {
    marginTop: spacing.xs,
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
  saveBtn: {
    alignItems: "center",
    borderRadius: radii.sm,
    height: 40,
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: font.label,
    fontWeight: "700",
  },
});
