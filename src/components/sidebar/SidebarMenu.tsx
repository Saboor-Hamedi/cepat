import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import type { Language } from '../../i18n/locale';
import { createSidebarMenuStyles } from './css/sidebarStyles';
import type { SidebarNavigate } from './utils/sidebar';

type SidebarItemKind =
  | 'profile'
  | 'settings'
  | 'preferences'
  | 'bookings'
  | 'notifications'
  | 'workspace'
  | 'admin';

export interface SidebarMenuProps {
  language: Language;
  isAuthenticated: boolean;
  isTechnician: boolean;
  isVerifiedAdmin: boolean;
  profileId?: string;
  navigate: SidebarNavigate;
}

type SidebarMenuStyles = ReturnType<typeof createSidebarMenuStyles>;

function SidebarItemIcon({
  kind,
  color,
  styles,
}: {
  kind: SidebarItemKind;
  color: string;
  styles: SidebarMenuStyles;
}) {
  if (kind === 'profile') {
    return (
      <View style={styles.itemIconCanvas}>
        <View style={[styles.iconUserHead, { borderColor: color }]} />
        <View style={[styles.iconUserShoulders, { borderColor: color }]} />
      </View>
    );
  }
  if (kind === 'settings') {
    return (
      <View style={styles.itemIconCanvas}>
        <View style={[styles.iconGearOuter, { borderColor: color }]}>
          <View style={[styles.iconGearInner, { backgroundColor: color }]} />
        </View>
      </View>
    );
  }
  if (kind === 'preferences') {
    return (
      <View style={styles.itemIconCanvas}>
        <View style={[styles.iconSliderLine, { backgroundColor: color }]} />
        <View style={[styles.iconSliderLine, { backgroundColor: color }]} />
      </View>
    );
  }
  if (kind === 'workspace') {
    return (
      <View style={styles.itemIconCanvas}>
        <View style={[styles.iconBriefcaseTop, { borderColor: color }]} />
        <View style={[styles.iconBriefcaseBox, { borderColor: color }]} />
      </View>
    );
  }
  if (kind === 'admin') {
    return (
      <View style={styles.itemIconCanvas}>
        <View style={[styles.iconShield, { borderColor: color }]} />
      </View>
    );
  }
  if (kind === 'notifications') {
    return (
      <View style={styles.itemIconCanvas}>
        <View style={[styles.iconNotificationBell, { borderColor: color }]} />
        <View style={[styles.iconNotificationBase, { backgroundColor: color }]} />
      </View>
    );
  }
  return (
    <View style={styles.itemIconCanvas}>
      <View style={[styles.iconCalendarBox, { borderColor: color }]} />
    </View>
  );
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

  return (
    <ScrollView style={styles.list}>
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          navigate(
            !isAuthenticated
              ? '/login'
              : `/technician/${profileId || (isTechnician ? 'demo-rizky' : 'demo-customer')}`,
          )
        }
        style={styles.item}
        testID="sidebar-view-profile"
      >
        <SidebarItemIcon kind="profile" color={palette.text} styles={styles} />
        <Text style={styles.itemText}>
          {language === 'en' ? 'View Profile' : 'Lihat Profil'}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => navigate('/account')}
        style={styles.item}
        testID="sidebar-settings"
      >
        <SidebarItemIcon kind="settings" color={palette.text} styles={styles} />
        <Text style={styles.itemText}>
          {language === 'en' ? 'Settings' : 'Pengaturan'}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() =>
          navigate({ pathname: '/account', params: { tab: 'appearance' } })
        }
        style={styles.item}
        testID="sidebar-preferences"
      >
        <SidebarItemIcon kind="preferences" color={palette.text} styles={styles} />
        <Text style={styles.itemText}>
          {language === 'en' ? 'Account preferences' : 'Preferensi akun'}
        </Text>
      </Pressable>

      {isTechnician ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => navigate('/technician-dashboard')}
          style={styles.item}
          testID="sidebar-workspace"
        >
          <SidebarItemIcon kind="workspace" color={palette.text} styles={styles} />
          <Text style={styles.itemText}>
            {language === 'en'
              ? 'Professional Profile & Requests'
              : 'Profil & Permintaan'}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => navigate('/bookings')}
          style={styles.item}
          testID="sidebar-bookings"
        >
          <SidebarItemIcon kind="bookings" color={palette.text} styles={styles} />
          <Text style={styles.itemText}>
            {language === 'en' ? 'Bookings & Messages' : 'Pesanan & Pesan'}
          </Text>
        </Pressable>
      )}

      {isVerifiedAdmin ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => navigate('/admin')}
          style={styles.item}
          testID="sidebar-admin"
        >
          <SidebarItemIcon kind="admin" color={palette.text} styles={styles} />
          <Text style={styles.itemText}>
            {language === 'en' ? 'Admin Control Center' : 'Pusat Kontrol Admin'}
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
