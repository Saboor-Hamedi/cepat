import { StyleSheet, Text, View } from "react-native";

import { useAppearance } from "../../context/AppearanceContext";
import { useLanguage } from "../../i18n/locale";
import { spacing } from "../../theme/tokens";
import { font } from "../../theme/typography";
import { SettingSection } from "../components/SettingSection";

export function SettingPolicy() {
  const { language } = useLanguage();
  const { palette, scaleFont } = useAppearance();

  return (
    <SettingSection testID="setting-section-policy">
      <View style={styles.singleContainer} testID="policy-container">
        {/* 1. Terms of Service */}
        <View style={styles.sectionBlock} testID="policy-terms-card">
          <Text
            style={[
              styles.sectionTitle,
              { color: palette.text, fontSize: scaleFont(font.subtitle) },
            ]}
          >
            {language === "en" ? "1. Terms of Service" : "1. Ketentuan Layanan"}
          </Text>
          <Text
            style={[
              styles.bodyText,
              { color: palette.textMuted, fontSize: scaleFont(font.body) },
            ]}
          >
            {language === "en"
              ? "Cepat is a decentralized discovery platform connecting customers with independent, verified technicians across Indonesia. Service execution, work quality, and direct payments are coordinated and agreed upon directly between the booking participants."
              : "Cepat adalah platform pencarian yang menghubungkan pelanggan dengan teknisi independen terverifikasi di seluruh Indonesia. Pelaksanaan pekerjaan, kualitas, dan pembayaran langsung dikoordinasikan dan disepakati antar peserta pesanan."}
          </Text>
          <Text
            style={[
              styles.bodyText,
              { color: palette.textMuted, fontSize: scaleFont(font.body) },
            ]}
          >
            {language === "en"
              ? "Users are responsible for ensuring accurate task descriptions and safe working environments during on-site services."
              : "Pengguna bertanggung jawab untuk memberikan deskripsi tugas yang akurat dan memastikan lingkungan kerja yang aman selama layanan di lokasi."}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: palette.border }]} />

        {/* 2. Privacy & Data Protection */}
        <View style={styles.sectionBlock} testID="policy-privacy-card">
          <Text
            style={[
              styles.sectionTitle,
              { color: palette.text, fontSize: scaleFont(font.subtitle) },
            ]}
          >
            {language === "en" ? "2. Privacy & Data Protection" : "2. Privasi & Perlindungan Data"}
          </Text>
          <Text
            style={[
              styles.bodyText,
              { color: palette.textMuted, fontSize: scaleFont(font.body) },
            ]}
          >
            {language === "en"
              ? "Your private contact information (such as phone numbers, exact residential coordinates, and personal email addresses) is strictly protected with Supabase Row Level Security (RLS) policies. Private data is never surfaced on public discovery cards."
              : "Informasi kontak pribadi Anda (seperti nomor telepon, koordinat tempat tinggal akurat, dan alamat email) dilindungi ketat oleh kebijakan Row Level Security (RLS) Supabase. Data privat tidak pernah dimunculkan di kartu pencarian publik."}
          </Text>
          <Text
            style={[
              styles.bodyText,
              { color: palette.textMuted, fontSize: scaleFont(font.body) },
            ]}
          >
            {language === "en"
              ? "Coordination chat is safely isolated per booking and only activates once a booking is confirmed by both participants. Automated security filters protect against spam and unauthorized contact interception."
              : "Chat koordinasi diisolasi secara aman per pesanan dan hanya aktif setelah pesanan dikonfirmasi oleh kedua pihak. Filter keamanan otomatis melindungi dari spam dan intersepsi kontak tanpa izin."}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: palette.border }]} />

        {/* 3. Community Safety Guidelines */}
        <View style={styles.sectionBlock} testID="policy-safety-card">
          <Text
            style={[
              styles.sectionTitle,
              { color: palette.text, fontSize: scaleFont(font.subtitle) },
            ]}
          >
            {language === "en" ? "3. Community Safety & Verification" : "3. Keamanan Komunitas & Verifikasi"}
          </Text>
          <Text
            style={[
              styles.bodyText,
              { color: palette.textMuted, fontSize: scaleFont(font.body) },
            ]}
          >
            {language === "en"
              ? "Technicians undergo credential review prior to receiving the verified badge. Violations of community guidelines or abusive interactions may result in immediate suspension or permanent platform exclusion."
              : "Teknisi melalui peninjauan kredensial sebelum mendapatkan lencana verifikasi. Pelanggaran pedoman komunitas atau interaksi kasar dapat menyebabkan penangguhan langsung atau penghentian akun permanen."}
          </Text>
        </View>
      </View>
    </SettingSection>
  );
}

const styles = StyleSheet.create({
  singleContainer: {
    backgroundColor: "transparent",
    paddingVertical: spacing.xs,
  },
  sectionBlock: {
    paddingVertical: spacing.sm,
  },
  sectionTitle: {
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  bodyText: {
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
  },
});
