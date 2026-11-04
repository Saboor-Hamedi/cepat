import {
  CalendarDays,
  ChevronRight,
  Settings,
  SlidersHorizontal,
  ShieldCheck,
  User,
  BriefcaseBusiness,
} from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import type { Language } from '../../i18n/locale';
import { ICON_STROKE } from '../../theme/icons';
import { createSidebarMenuStyles } from './css/sidebarStyles';
import type { SidebarNavigate } from './utils/sidebar';

export interface SidebarMenuProps {
  language: Language;
  isAuthenticated: boolean;
  isTechnician: boolean;
  isVerifiedAdmin: boolean;
  profileId?: string;
  navigate: SidebarNavigate;
}

export function SidebarMenu({
  language,
  isAuthenticated,
  isTechnician,
  isVerifiedAdmin,
  profileId,
  navigate,
}: SidebarMenuProps) {
  const { palette } = useAppearance();
  const styles = useMemo(() => createSidebarMenuStyles(palette), [palette]);

  const renderItem = ({
    testID,
    label,
    onPress,
    Icon,
  }: {
    testID: string;
    label: string;
    onPress: () => void;
    Icon: typeof User;
  }) => (
    <Pressable
      key={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
      testID={testID}
    >
      <View style={styles.itemIconCanvas}>
        <Icon color={palette.text} size={20} strokeWidth={ICON_STROKE} />
      </View>
      <Text numberOfLines={1} style={styles.itemText}>
        {label}
      </Text>
      <ChevronRight
        color={palette.textMuted}
        size={18}
        strokeWidth={ICON_STROKE}
      />
    </Pressable>
  );

  return (
    <ScrollView
      style={styles.list}
      contentContainerStyle={styles.group}
      showsVerticalScrollIndicator={false}
    >
      {renderItem({
        testID: 'sidebar-view-profile',
        label: language === 'en' ? 'View Profile' : 'Lihat Profil',
        Icon: User,
        onPress: () =>
          navigate(
            !isAuthenticated
              ? '/login'
              : `/technician/${profileId || (isTechnician ? 'demo-rizky' : 'demo-customer')}`,
          ),
      })}

      {renderItem({
        testID: 'sidebar-settings',
        label: language === 'en' ? 'Settings' : 'Pengaturan',
        Icon: Settings,
        onPress: () => navigate('/account'),
      })}

      {renderItem({
        testID: 'sidebar-preferences',
        label:
          language === 'en' ? 'Account Preferences' : 'Preferensi Akun',
        Icon: SlidersHorizontal,
        onPress: () =>
          navigate({ pathname: '/account', params: { tab: 'appearance' } }),
      })}

      <View style={styles.groupDivider} />

      {isTechnician ? (
        renderItem({
          testID: 'sidebar-workspace',
          label:
            language === 'en'
              ? 'Professional Profile & Requests'
              : 'Profil & Permintaan',
          Icon: BriefcaseBusiness,
          onPress: () => navigate('/technician-dashboard'),
        })
      ) : (
        renderItem({
          testID: 'sidebar-bookings',
          label:
            language === 'en' ? 'Bookings & Messages' : 'Pesanan & Pesan',
          Icon: CalendarDays,
          onPress: () => navigate('/bookings'),
        })
      )}

      {isVerifiedAdmin
        ? renderItem({
            testID: 'sidebar-admin',
            label:
              language === 'en'
                ? 'Admin Control Center'
                : 'Pusat Kontrol Admin',
            Icon: ShieldCheck,
            onPress: () => navigate('/admin'),
          })
        : null}
    </ScrollView>
  );
}
