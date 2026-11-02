import { View } from "react-native";

import { useLanguage } from "../../i18n/locale";
import { SettingSection } from "../components/SettingSection";
import { AccountDeletionPanel } from "./components/AccountDeletionPanel";
import { PrivateContactEditor } from "./components/PrivateContactEditor";
import { ProfileNameEditor } from "./components/ProfileNameEditor";

export interface SettingSecurityProps {
  deletionRequest: { requestedAt: string; reason: string } | null;
  onSubmitDeletionRequest: (reason: string) => Promise<void>;
  email?: string;
  phoneNumber?: string;
  onChangePhoneNumber?: (value: string) => void;
  onSavePrivateContact?: () => Promise<void>;
  displayName?: string;
  username?: string;
  onSaveDisplayName?: (newName: string) => Promise<void>;
  onSaveProfileIdentity?: (newDisplayName: string, newUsername: string) => Promise<void>;
}

export function SettingSecurity({
  deletionRequest,
  onSubmitDeletionRequest,
  email,
  phoneNumber,
  onChangePhoneNumber,
  onSavePrivateContact,
  displayName,
  username,
  onSaveDisplayName,
  onSaveProfileIdentity,
}: SettingSecurityProps) {
  const { language, t } = useLanguage();

  return (
    <SettingSection
      eyebrow={language === "en" ? "SECURITY & PRIVACY" : "KEAMANAN & PRIVASI"}
      title={t("settings.securityPrivacyTitle")}
      description={
        language === "en"
          ? "Manage your public profile identity, private contact credentials, and account deletion."
          : "Kelola identitas profil publik, kontak privat terlindungi, dan penghapusan akun."
      }
      testID="setting-section-security"
    >
      <View style={{ gap: 12 }}>
        {/* 1. Public Display Name & Username Editor */}
        <ProfileNameEditor
          initialDisplayName={displayName}
          initialUsername={username}
          onSaveDisplayName={onSaveDisplayName}
          onSaveProfileIdentity={onSaveProfileIdentity}
        />

        {/* 2. Private Contact Credentials (Email & Phone) */}
        <PrivateContactEditor
          email={email}
          phoneNumber={phoneNumber}
          onChangePhoneNumber={onChangePhoneNumber}
          onSavePrivateContact={onSavePrivateContact}
        />

        {/* 3. Account Deletion Panel */}
        <AccountDeletionPanel
          deletionRequest={deletionRequest}
          onSubmitDeletionRequest={onSubmitDeletionRequest}
        />
      </View>
    </SettingSection>
  );
}
