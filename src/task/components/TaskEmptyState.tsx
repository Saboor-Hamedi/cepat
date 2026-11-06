import { CalendarCheck2, History, Wrench } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import { useLanguage } from '../../i18n/locale';
import { font } from '../../theme/typography';

export type TaskEmptyStateVariant = 'requests' | 'active' | 'history';

export interface TaskEmptyStateProps {
  variant: TaskEmptyStateVariant;
  testID?: string;
}

const COPY: Record<
  TaskEmptyStateVariant,
  {
    en: { title: string; joke: string };
    id: { title: string; joke: string };
  }
> = {
  requests: {
    en: {
      title: 'No pending requests',
      joke: 'Your wrench is getting lonely — may the odds be ever in your favor.',
    },
    id: {
      title: 'Belum ada permintaan',
      joke: 'Kunci paspormu mulai kesepian — semoga AC-nya cepat rusak.',
    },
  },
  active: {
    en: {
      title: 'No active jobs',
      joke: 'All quiet — perfect excuse for a kopi break.',
    },
    id: {
      title: 'Belum ada tugas aktif',
      joke: 'Sepi sekali — waktu yang tepat untuk ngopi dulu.',
    },
  },
  history: {
    en: {
      title: 'No task history yet',
      joke: 'Every legend starts with a first job.',
    },
    id: {
      title: 'Belum ada riwayat',
      joke: 'Setiap legenda dimulai dari pekerjaan pertama.',
    },
  },
};

export function TaskEmptyState({ variant, testID }: TaskEmptyStateProps) {
  const { language } = useLanguage();
  const { palette, isDark } = useAppearance();
  const copy = COPY[variant][language];

  const Icon =
    variant === 'requests' ? Wrench : variant === 'active' ? CalendarCheck2 : History;

  return (
    <View style={styles.wrap} testID={testID ?? `${variant}-empty-state`}>
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
          <Icon size={44} color="#10B981" strokeWidth={1.5} />
        </View>
        <View style={styles.accentDot} />
      </View>

      <Text style={[styles.title, { color: isDark ? '#F8FAFC' : palette.text }]}>
        {copy.title}
      </Text>
      <Text style={[styles.joke, { color: isDark ? '#94A3B8' : palette.textMuted }]}>
        {copy.joke}
      </Text>
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
    borderRadius: 56,
    borderWidth: 1,
    height: 112,
    justifyContent: 'center',
    marginBottom: 6,
    width: 112,
  },
  ring: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderRadius: 999,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    height: 88,
    position: 'absolute',
    width: 88,
  },
  core: {
    alignItems: 'center',
    borderRadius: 999,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  accentDot: {
    backgroundColor: '#10B981',
    borderRadius: 999,
    height: 10,
    position: 'absolute',
    right: 16,
    top: 19,
    width: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  joke: {
    fontSize: font.label,
    lineHeight: 20,
    maxWidth: 300,
    textAlign: 'center',
  },
});
