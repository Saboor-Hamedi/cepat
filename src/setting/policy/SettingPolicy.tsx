import { StyleSheet, Text, View } from "react-native";

import { useAppearance } from "../../context/AppearanceContext";
import { useLanguage } from "../../i18n/locale";
import { colors, radii, spacing } from "../../theme/tokens";
import { SettingSection } from "../components/SettingSection";

export function SettingPolicy() {
  const { language } = useLanguage();
  const { palette } = useAppearance();

  return (
    <SettingSection
      eyebrow={language === "en" ? "LEGAL & POLICY" : "HUKUM & KEBIJAKAN"}
      title={language === "en" ? "Terms & Privacy Policy" : "Syarat & Kebijakan Privasi"}
      description={
        language === "en"
          ? "Read our terms of service, platform rules, and how your privacy is protected."
          : "Pelajari syarat layanan kami, aturan platform, dan perlindungan privasi Anda."
      }
      testID="setting-section-policy"
    >
      {/* 1. Terms of Service */}
      <View
        style={[
          styles.policyCard,
          {
            backgroundColor: palette.surfaceElevated,
            borderColor: palette.border,
          },
        ]}
        testID="policy-terms-card"
      >
        <Text style={[styles.policyCardTitle, { color: palette.text }]}>
          {language === "en" ? "1. Terms of Service" : "1. Ketentuan Layanan"}
        </Text>
        <Text style={[styles.policyBody, { color: palette.textMuted }]}>
          {language === "en"
            ? "Cepat is a decentralized discovery platform connecting customers with independent, verified technicians across Indonesia. Service execution, work quality, and direct payments are coordinated and agreed upon directly between the booking participants."
            : "Cepat adalah platform pencarian yang menghubungkan pelanggan dengan teknisi independen terverifikasi di seluruh Indonesia. Pelaksanaan pekerjaan, kualitas, dan pembayaran langsung dikoordinasikan dan disepakati antar peserta pesanan."}
        </Text>
        <Text style={[styles.policyBody, { color: palette.textMuted }]}>
          {language === "en"
            ? "Users are responsible for ensuring accurate task descriptions and safe working environments during on-site services."
            : "Pengguna bertanggung jawab untuk memberikan deskripsi tugas yang akurat dan memastikan lingkungan kerja yang aman selama layanan di lokasi."}
        </Text>
      </View>

      {/* 2. Privacy & Data Protection */}
      <View
        style={[
          styles.policyCard,
          {
            backgroundColor: palette.surfaceElevated,
            borderColor: palette.border,
          },
        ]}
        testID="policy-privacy-card"
      >
        <Text style={[styles.policyCardTitle, { color: palette.text }]}>
          {language === "en" ? "2. Privacy & Data Protection" : "2. Privasi & Perlindungan Data"}
        </Text>
        <Text style={[styles.policyBody, { color: palette.textMuted }]}>
          {language === "en"
            ? "Your private contact information (such as phone numbers, exact residential coordinates, and personal email addresses) is strictly protected with Supabase Row Level Security (RLS) policies. Private data is never surfaced on public discovery cards."
            : "Informasi kontak pribadi Anda (seperti nomor telepon, koordinat tempat tinggal akurat, dan alamat email) dilindungi ketat oleh kebijakan Row Level Security (RLS) Supabase. Data privat tidak pernah dimunculkan di kartu pencarian publik."}
        </Text>
        <Text style={[styles.policyBody, { color: palette.textMuted }]}>
          {language === "en"
            ? "Coordination chat is safely isolated per booking and only activates once a booking is confirmed by both participants. Automated security filters protect against spam and unauthorized contact interception."
            : "Chat koordinasi diisolasi secara aman per pesanan dan hanya aktif setelah pesanan dikonfirmasi oleh kedua pihak. Filter keamanan otomatis melindungi dari spam dan intersepsi kontak tanpa izin."}
        </Text>
      </View>

      {/* 3. Community Safety Guidelines */}
      <View
        style={[
          styles.policyCard,
          {
            backgroundColor: palette.surfaceElevated,
            borderColor: palette.border,
          },
        ]}
        testID="policy-safety-card"
      >
        <Text style={[styles.policyCardTitle, { color: palette.text }]}>
          {language === "en" ? "3. Community Safety & Verification" : "3. Keamanan Komunitas & Verifikasi"}
        </Text>
        <Text style={[styles.policyBody, { color: palette.textMuted }]}>
          {language === "en"
            ? "Technicians undergo credential review prior to receiving the verified badge. Violations of community guidelines or abusive interactions may result in immediate suspension or permanent platform exclusion."
            : "Teknisi melalui peninjauan kredensial sebelum mendapatkan lencana verifikasi. Pelanggaran pedoman komunitas atau interaksi kasar dapat menyebabkan penangguhan langsung atau penghentian akun permanen."}
        </Text>
      </View>
    </SettingSection>
  );
}

const styles = StyleSheet.create({
  policyCard: {
    borderRadius: 5,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  policyCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  policyBody: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
});
