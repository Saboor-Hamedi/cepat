import { router } from 'expo-router';
import { BadgeCheck, ChevronDown, MapPin, MessageSquare, Search } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../../auth/AuthProvider';
import { useAppearance } from '../../../context/AppearanceContext';
import { localizeArea, useLanguage } from '../../../i18n/locale';
import { ICON_STROKE } from '../../../theme/icons';
import { radii, spacing } from '../../../theme/tokens';
import { Avatar } from '../../Avatar';

interface MarketplaceHeaderProps {
  unreadMessagesCount?: number;
  selectedArea?: string;
  onPressProfile?: () => void;
  onPressSearch?: () => void;
  onPressChat?: () => void;
  onPressLocation?: () => void;
  testID?: string;
}

export const MarketplaceHeader = memo(function MarketplaceHeader({
  unreadMessagesCount = 0,
  selectedArea = 'Semua area',
  onPressProfile,
  onPressSearch,
  onPressChat,
  onPressLocation,
  testID,
}: MarketplaceHeaderProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();
  const { user, roles } = useAuth();

  const handleProfilePress = () => {
    if (onPressProfile) {
      onPressProfile();
    } else if (user?.id) {
      router.push(`/technician/${encodeURIComponent(user.id)}`);
    } else {
      router.push('/login');
    }
  };

  const handleSearchPress = () => {
    if (onPressSearch) {
      onPressSearch();
    } else {
      router.push('/search');
    }
  };

  const handleChatPress = () => {
    if (onPressChat) {
      onPressChat();
    } else {
      router.push('/messages');
    }
  };

  const displayName =
    (typeof user?.user_metadata?.display_name === 'string' &&
      user.user_metadata.display_name.trim()) ||
    (typeof user?.email === 'string' && user.email.split('@')[0]) ||
    (language === 'en' ? 'Guest' : 'Tamu');

  const avatarUri =
    (typeof user?.user_metadata?.avatar_url === 'string' &&
      user.user_metadata.avatar_url) ||
    undefined;

  // Show verified badge for customer/technician profile
  const isVerified = Boolean(
    user?.user_metadata?.verified ||
      roles.includes('technician') ||
      roles.includes('admin') ||
      roles.includes('customer') ||
      user?.id === 'demo-customer' ||
      user?.id === 'demo-rizky' ||
      Boolean(user?.id),
  );

  const welcomeText = language === 'en' ? 'Welcome,' : 'Selamat datang,';
  const localizedAreaName =
    selectedArea === 'Semua area'
      ? language === 'en'
        ? 'All areas'
        : 'Semua area'
      : localizeArea(selectedArea, language);

  return (
    <View
      style={[
        styles.headerContainer,
        {
          backgroundColor: palette.background,
        },
      ]}
      testID={testID ?? 'marketplace-header'}
    >
      {/* LEFT: Avatar with custom border + User Name with Verified Mark + Area/Subtitle */}
      <View style={styles.leftGroup}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Buka profil"
          hitSlop={6}
          onPress={handleProfilePress}
          style={styles.avatarButton}
          testID="marketplace-header-avatar"
        >
          <Avatar uri={avatarUri} name={displayName} size={42} />
        </Pressable>

        <View style={styles.textWrap}>
          <View style={styles.nameRow}>
            <Text
              numberOfLines={1}
              style={[styles.welcomeLabel, { color: palette.textMuted }]}
            >
              {welcomeText}{' '}
              <Text style={[styles.userName, { color: palette.text }]}>
                {displayName}
              </Text>
            </Text>
            {isVerified && (
              <BadgeCheck
                size={14}
                color={palette.primary}
                strokeWidth={ICON_STROKE}
              />
            )}
          </View>

          {onPressLocation ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Pilih area: ${localizedAreaName}`}
              hitSlop={4}
              onPress={onPressLocation}
              style={styles.locationTrigger}
              testID="area-picker-trigger"
            >
              <MapPin size={11} color={palette.primary} strokeWidth={ICON_STROKE} />
              <Text
                numberOfLines={1}
                style={[styles.locationText, { color: palette.textMuted }]}
              >
                {localizedAreaName}
              </Text>
              <ChevronDown size={11} color={palette.textMuted} strokeWidth={ICON_STROKE} />
            </Pressable>
          ) : (
            <Text
              numberOfLines={1}
              style={[styles.subtitle, { color: palette.textMuted }]}
            >
              {language === 'en'
                ? 'Find trusted technicians near you'
                : 'Temukan teknisi tepercaya'}
            </Text>
          )}
        </View>
      </View>

      {/* RIGHT: Sleek Search Icon + Chat Icon Buttons */}
      <View style={styles.rightGroup}>
        {/* Sleek Search Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={language === 'en' ? 'Search' : 'Cari'}
          hitSlop={8}
          onPress={handleSearchPress}
          style={({ pressed }) => [
            styles.sleekIconButton,
            {
              backgroundColor: pressed ? palette.surfaceElevated : 'transparent',
            },
          ]}
          testID="marketplace-search"
        >
          <Search size={19} color={palette.text} strokeWidth={ICON_STROKE} />
        </Pressable>

        {/* Sleek Chat Button with subtle unread badge */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            language === 'en' ? 'Open messages' : 'Buka pesan masuk'
          }
          hitSlop={8}
          onPress={handleChatPress}
          style={({ pressed }) => [
            styles.sleekIconButton,
            {
              backgroundColor: pressed ? palette.surfaceElevated : 'transparent',
            },
          ]}
          testID="marketplace-messages-button"
        >
          <MessageSquare
            size={19}
            color={palette.text}
            strokeWidth={ICON_STROKE}
          />
          {unreadMessagesCount > 0 && (
            <View
              style={[
                styles.unreadDot,
                {
                  backgroundColor: palette.primary,
                  borderColor: palette.background,
                },
              ]}
              testID="marketplace-header-unread-dot"
            />
          )}
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  headerContainer: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: 820,
    paddingBottom: spacing.xs,
    paddingHorizontal: 5,
    paddingTop: spacing.xs,
    width: '100%',
  },
  leftGroup: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    marginRight: spacing.sm,
  },
  avatarButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    width: 42,
  },
  textWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  welcomeLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  userName: {
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  locationTrigger: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    marginTop: 1,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '600',
  },
  rightGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  sleekIconButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 38,
    justifyContent: 'center',
    position: 'relative',
    width: 38,
  },
  unreadDot: {
    borderRadius: radii.pill,
    borderWidth: 2,
    height: 10,
    position: 'absolute',
    right: 5,
    top: 5,
    width: 10,
  },
});
