import { TabPillBar, type TabPillItem } from "../../components/TabPillBar";
import { useLanguage } from "../../i18n/locale";
import type { SettingSectionKey } from "./SettingHeader";

interface SettingTabMeta {
  authOnly?: boolean;
  isDanger?: boolean;
}

const TAB_META: Partial<Record<SettingSectionKey, SettingTabMeta>> = {
  address: { authOnly: true },
  security: { authOnly: true },
  password: { authOnly: true },
  notifications: { authOnly: true },
  "delete-account": { authOnly: true, isDanger: true },
};

const TAB_ORDERED_KEYS: readonly SettingSectionKey[] = [
  "account",
  "address",
  "security",
  "password",
  "language",
  "notifications",
  "appearance",
  "profile-accent",
  "policy",
  "version",
  "delete-account",
];

export function buildSettingTabs(
  language: "id" | "en",
  isAuthenticated: boolean,
): readonly TabPillItem<SettingSectionKey>[] {
  const labels: Record<SettingSectionKey, string> = {
    account: language === "en" ? "Account" : "Akun",
    address: language === "en" ? "Address" : "Alamat",
    security: language === "en" ? "Security" : "Keamanan",
    password: language === "en" ? "Password" : "Kata Sandi",
    language: language === "en" ? "Language" : "Bahasa",
    notifications: language === "en" ? "Notifications" : "Notifikasi",
    appearance: language === "en" ? "Appearance" : "Tampilan",
    "profile-accent": language === "en" ? "Profile Ring" : "Aksen",
    policy: language === "en" ? "Policy" : "Kebijakan",
    version: language === "en" ? "Version" : "Versi",
    "delete-account": language === "en" ? "Delete Account" : "Hapus Akun",
  };

  return TAB_ORDERED_KEYS.filter(
    (key) => !TAB_META[key]?.authOnly || isAuthenticated,
  ).map((key) => ({
    key,
    label: labels[key],
    isDanger: TAB_META[key]?.isDanger ?? false,
    testID: `setting-tab-${key}`,
  }));
}

export function SettingTabs({
  activeSection,
  onSelectSection,
  isAuthenticated,
}: {
  activeSection: SettingSectionKey;
  onSelectSection: (section: SettingSectionKey) => void;
  isAuthenticated: boolean;
}) {
  const { language } = useLanguage();
  return (
    <TabPillBar
      activeKey={activeSection}
      containerTestID="settings-category-tabs"
      onSelect={onSelectSection}
      tabs={buildSettingTabs(language, isAuthenticated)}
    />
  );
}
