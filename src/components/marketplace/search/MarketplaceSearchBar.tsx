import { router } from 'expo-router';
import { ChevronDown, MapPin, Search } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppearance } from '../../../context/AppearanceContext';
import { localizeArea, useLanguage } from '../../../i18n/locale';
import { ICON_STROKE } from '../../../theme/icons';
import { radii, spacing } from '../../../theme/tokens';
import { font } from '../../../theme/typography';

interface MarketplaceSearchBarProps {
  selectedArea?: string;
  selectedCategory?: string;
  onPressLocation?: () => void;
  onPressSearch?: () => void;
  testID?: string;
}

export const MarketplaceSearchBar = memo(function MarketplaceSearchBar({
  selectedArea = 'Semua area',
  selectedCategory = 'all',
  onPressLocation,
  onPressSearch,
  testID,
}: MarketplaceSearchBarProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();

  const handleSearchPress = () => {
    if (onPressSearch) {
      onPressSearch();
    } else {
      router.push({
        pathname: '/search',
        params: {
          area: selectedArea,
          category: selectedCategory,
        },
      } as never);
    }
  };

  const placeholderText =
    language === 'en'
      ? 'Search services, technicians, or posts...'
      : 'Cari layanan, teknisi, atau postingan...';

  const localizedAreaName =
    selectedArea === 'Semua area'
      ? language === 'en'
        ? 'All areas'
        : 'Semua area'
      : localizeArea(selectedArea, language);

  return (
    <View
      style={[
        styles.searchContainer,
        {
          backgroundColor: palette.inputBg,
          borderColor: palette.border,
        },
      ]}
      testID={testID ?? 'marketplace-search-bar'}
    >
      {/* Left Search Trigger */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cari layanan atau teknisi"
        onPress={handleSearchPress}
        style={styles.searchFieldTrigger}
        testID="marketplace-search-trigger"
      >
        <Search size={16} color={palette.textMuted} strokeWidth={ICON_STROKE} />
        <Text
          numberOfLines={1}
          style={[styles.placeholderText, { color: palette.textMuted }]}
        >
          {placeholderText}
        </Text>
      </Pressable>

      {/* Integrated Location Selector Pill */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Pilih area: saat ini ${localizedAreaName}`}
        hitSlop={6}
        onPress={onPressLocation}
        style={({ pressed }) => [
          styles.locationPill,
          {
            backgroundColor: palette.surfaceElevated,
            borderColor: palette.border,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
        testID="marketplace-location-selector"
      >
        <MapPin size={12} color={palette.primary} strokeWidth={ICON_STROKE} />
        <Text
          numberOfLines={1}
          style={[styles.locationPillText, { color: palette.text }]}
        >
          {localizedAreaName}
        </Text>
        <ChevronDown size={11} color={palette.textMuted} strokeWidth={ICON_STROKE} />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  searchContainer: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    height: 44,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs + 2,
    width: '100%',
  },
  searchFieldTrigger: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    height: '100%',
    paddingRight: spacing.sm,
  },
  placeholderText: {
    flex: 1,
    fontSize: font.caption,
    marginLeft: spacing.sm,
  },
  locationPill: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    height: 32,
    maxWidth: 130,
    paddingHorizontal: spacing.sm + 2,
  },
  locationPillText: {
    flexShrink: 1,
    fontSize: font.caption - 1,
    fontWeight: '600',
  },
});
