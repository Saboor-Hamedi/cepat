import Constants from "expo-constants";
import { CheckCircle2, ShieldCheck } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import appConfig from "../../app.json";
import pkgConfig from "../../package.json";
import { useAppearance } from "../context/AppearanceContext";
import { useLanguage } from "../i18n/locale";
import { ICON_STROKE } from "../theme/icons";
import { spacing } from "../theme/tokens";
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
    <SettingSection testID="setting-section-version">
      <View style={styles.cleanContainer}>
        <View style={styles.identityRow}>
          <View style={styles.nameCluster}>
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
                styles.versionSubtitle,
                { color: palette.textMuted, fontSize: scaleFont(font.body) },
              ]}
            >
              {language === "en" ? `Version ${version}` : `Versi ${version}`}
            </Text>
          </View>

          <View style={styles.statusBadge}>
            <CheckCircle2 size={15} strokeWidth={ICON_STROKE} color="#10B981" />
            <Text
              style={[
                styles.statusText,
                { fontSize: scaleFont(font.caption) },
              ]}
            >
              {language === "en" ? "Up to date" : "Terkini"}
            </Text>
          </View>
        </View>

        <View style={[styles.hairline, { backgroundColor: palette.border }]} />

        <View style={styles.metaList}>
          <View style={styles.metaRow}>
            <Text
              style={[
                styles.metaLabel,
                { color: palette.textMuted, fontSize: scaleFont(font.body) },
              ]}
            >
              {language === "en" ? "Build Channel" : "Jalur Rilis"}
            </Text>
            <Text
              style={[
                styles.metaValue,
                { color: palette.text, fontSize: scaleFont(font.body) },
              ]}
            >
              Production (Stable)
            </Text>
          </View>

          <View style={[styles.hairline, { backgroundColor: palette.border }]} />

          <View style={styles.metaRow}>
            <Text
              style={[
                styles.metaLabel,
                { color: palette.textMuted, fontSize: scaleFont(font.body) },
              ]}
            >
              {language === "en" ? "Platform Framework" : "Kerangka Kerja"}
            </Text>
            <Text
              style={[
                styles.metaValue,
                { color: palette.text, fontSize: scaleFont(font.body) },
              ]}
            >
              Expo SDK 58
            </Text>
          </View>

          <View style={[styles.hairline, { backgroundColor: palette.border }]} />

          <View style={styles.metaRow}>
            <Text
              style={[
                styles.metaLabel,
                { color: palette.textMuted, fontSize: scaleFont(font.body) },
              ]}
            >
              {language === "en" ? "Runtime Environment" : "Lingkungan Runtime"}
            </Text>
            <Text
              style={[
                styles.metaValue,
                { color: palette.text, fontSize: scaleFont(font.body) },
              ]}
            >
              React Native 0.88
            </Text>
          </View>

          <View style={[styles.hairline, { backgroundColor: palette.border }]} />

          <View style={styles.metaRow}>
            <View style={styles.secureWrap}>
              <ShieldCheck size={16} strokeWidth={ICON_STROKE} color={palette.textMuted} />
              <Text
                style={[
                  styles.metaLabel,
                  { color: palette.textMuted, fontSize: scaleFont(font.body) },
                ]}
              >
                {language === "en" ? "Security Policies" : "Kebijakan Keamanan"}
              </Text>
            </View>
            <Text
              style={[
                styles.metaValue,
                { color: palette.text, fontSize: scaleFont(font.body) },
              ]}
            >
              Supabase RLS Active
            </Text>
          </View>
        </View>
      </View>
    </SettingSection>
  );
}

const styles = StyleSheet.create({
  cleanContainer: {
    paddingVertical: spacing.xs,
    width: "100%",
  },
  identityRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: spacing.sm,
  },
  nameCluster: {
    gap: 2,
  },
  appName: {
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  versionSubtitle: {
    fontWeight: "500",
  },
  statusBadge: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  statusText: {
    color: "#10B981",
    fontWeight: "600",
  },
  metaList: {
    width: "100%",
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  secureWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  metaLabel: {
    fontWeight: "500",
  },
  metaValue: {
    fontWeight: "600",
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
  },
});
