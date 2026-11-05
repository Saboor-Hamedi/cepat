import { router } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { useAppearance } from '../context/AppearanceContext';
import { useLanguage } from '../i18n/locale';
import { font } from '../theme/typography';
import { AppButton } from '../ui';

export function BookingsEmptyState() {
  const { language } = useLanguage();
  const { palette, isDark } = useAppearance();

  return (
    <View style={styles.wrap} testID="bookings-empty-state">
      <View
        style={[
          styles.illustration,
          {
            backgroundColor: isDark ? '#111827' : palette.surfaceElevated,
            borderColor: isDark ? '#1E293B' : palette.border,
          },
        ]}
      >
        <View style={styles.ring} />
        <View
          style={[
            styles.core,
            { backgroundColor: isDark ? '#0B0F17' : palette.surface },
          ]}
        >
          <CalendarDays size={48} color="#10B981" strokeWidth={1.5} />
        </View>
        <View style={styles.accentDot} />
      </View>

      <Text
        style={[
          styles.title,
          { color: isDark ? '#F8FAFC' : palette.text },
        ]}
      >
        {language === 'en' ? 'No active bookings' : 'Belum ada pesanan aktif'}
      </Text>
      <Text
        style={[
          styles.subtitle,
          { color: isDark ? '#94A3B8' : palette.textMuted },
        ]}
      >
        {language === 'en'
          ? 'Explore the marketplace to book a technician.'
          : 'Jelajahi marketplace untuk memesan teknisi.'}
      </Text>

      <AppButton
        fullWidth={false}
        onPress={() => router.push('/')}
        testID="bookings-empty-explore-marketplace"
        variant="primary"
      >
        {language === 'en' ? 'Explore Marketplace' : 'Jelajahi Marketplace'}
      </AppButton>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    flexGrow: 1,
    gap: 10,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  illustration: {
    alignItems: 'center',
    borderRadius: 64,
    borderWidth: 1,
    height: 128,
    justifyContent: 'center',
    marginBottom: 6,
    width: 128,
  },
  ring: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderRadius: 999,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    height: 100,
    position: 'absolute',
    width: 100,
  },
  core: {
    alignItems: 'center',
    borderRadius: 999,
    height: 84,
    justifyContent: 'center',
    width: 84,
  },
  accentDot: {
    backgroundColor: '#10B981',
    borderRadius: 999,
    height: 12,
    position: 'absolute',
    right: 18,
    top: 22,
    width: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: font.label,
    lineHeight: 20,
    marginBottom: 6,
    maxWidth: 300,
    textAlign: 'center',
  },
});
