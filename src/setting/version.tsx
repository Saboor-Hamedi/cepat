import Constants from "expo-constants";
import { CheckCircle2, Cpu, Info, ShieldCheck } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import appConfig from "../../app.json";
import pkgConfig from "../../package.json";
import { useAppearance } from "../context/AppearanceContext";
import { useLanguage } from "../i18n/locale";
import { ICON_SIZE, ICON_STROKE } from "../theme/icons";
import { radii, spacing } from "../theme/tokens";
import { font } from "../theme/typography";
import { SettingSection } from "./components/SettingSection";

/**
 * Dynamically resolves the current application version from Expo Constants,
 * app.json, and package.json without hardcoding.
 */
export function getAppVersion(): string {
  return (
    Constants.expoConfig?.version ??
    (appConfig as { expo?: { version?: string } })?.expo?.version ??
    (pkgConfig as { version?: string })?.version ??
    "1.0.0"
  );
}

export function getAppName(): string {
  return (
    Constants.expoConfig?.name ??
    (appConfig as { expo?: { name?: string } })?.expo?.name ??
    (pkgConfig as { name?: string })?.name ??
    "Cepat"
  );
}

export const APP_VERSION = getAppVersion();

export function SettingVersion() {
  const { language } = useLanguage();
  const { palette, scaleFont } = useAppearance();
  const version = getAppVersion();
  const appName = getAppName();

  return (
    <SettingSection
      eyebrow={language === "en" ? "ABOUT APPLICATION" : "TENTANG APLIKASI"}
      title={language === "en" ? "Current Version" : "Versi Saat Ini"}
      description={
        language === "en"
          ? "View details about your current app release and build system."
          : "Lihat rincian rilis aplikasi dan sistem build yang sedang berjalan."
      }
      testID="setting-section-version"
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: palette.surfaceElevated,
            borderColor: palette.border,
          },
        ]}
      >
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: `${palette.primary}15` },
            ]}
          >
            <Info
              size={ICON_SIZE}
              strokeWidth={ICON_STROKE}
              color={palette.primary}
            />
          </View>
          <View style={styles.appNameWrap}>
            <Text
              style={[
                styles.appName,
                { color: palette.text, fontSize: scaleFont(font.heading) },
              ]}
            >
              {appName}
            </Text>
            <Text
              style={[
                styles.appSub,
                { color: palette.textMuted, fontSize: scaleFont(font.caption) },
              ]}
            >
              {language === "en"
                ? "Fast On-Demand Technician Services"
                : "Layanan Teknisi Cepat Terpercaya"}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.versionCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <View style={styles.metaRow}>
            <View style={styles.metaLabelWrap}>
              <Cpu size={16} strokeWidth={ICON_STROKE} color={palette.textMuted} />
              <Text
                style={[
                  styles.metaLabel,
                  { color: palette.textMuted, fontSize: scaleFont(font.caption) },
                ]}
              >
                {language === "en" ? "App Version" : "Versi Aplikasi"}
              </Text>
            </View>
            <View
              style={[
                styles.versionPill,
                { backgroundColor: `${palette.primary}15` },
              ]}
            >
              <Text
                style={[
                  styles.versionPillText,
                  { color: palette.primary, fontSize: scaleFont(font.caption) },
                ]}
              >
                v{version}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.divider,
              { backgroundColor: palette.border },
            ]}
          />

          <View style={styles.metaRow}>
            <View style={styles.metaLabelWrap}>
              <ShieldCheck
                size={16}
                strokeWidth={ICON_STROKE}
                color={palette.textMuted}
              />
              <Text
                style={[
                  styles.metaLabel,
                  { color: palette.textMuted, fontSize: scaleFont(font.caption) },
                ]}
              >
                {language === "en" ? "Build Channel" : "Jalur Rilis"}
              </Text>
            </View>
            <Text
              style={[
                styles.metaValue,
                { color: palette.text, fontSize: scaleFont(font.caption) },
              ]}
            >
              Production (Stable)
            </Text>
          </View>

          <View
            style={[
              styles.divider,
              { backgroundColor: palette.border },
            ]}
          />

          <View style={styles.metaRow}>
            <View style={styles.metaLabelWrap}>
              <CheckCircle2
                size={16}
                strokeWidth={ICON_STROKE}
                color="#10B981"
              />
              <Text
                style={[
                  styles.metaLabel,
                  { color: palette.textMuted, fontSize: scaleFont(font.caption) },
                ]}
              >
                {language === "en" ? "Status" : "Status Pembaruan"}
              </Text>
            </View>
            <Text
              style={[
                styles.statusGood,
                { fontSize: scaleFont(font.caption) },
              ]}
            >
              {language === "en" ? "Up to date" : "Versi Terkini"}
            </Text>
          </View>
        </View>
      </View>
    </SettingSection>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  badgeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconWrapper: {
    alignItems: "center",
    borderRadius: radii.md,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  appNameWrap: {
    flex: 1,
  },
  appName: {
    fontWeight: "700",
  },
  appSub: {
    marginTop: 2,
  },
  versionCard: {
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  metaLabelWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  metaLabel: {
    fontWeight: "500",
  },
  metaValue: {
    fontWeight: "600",
  },
  versionPill: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  versionPillText: {
    fontWeight: "700",
  },
  statusGood: {
    color: "#10B981",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
});
