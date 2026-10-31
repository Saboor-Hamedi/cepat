import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getIndonesianRegions } from '../data/marketplaceRepository';
import { useAppearance } from '../context/AppearanceContext';
import { localizeArea, useLanguage } from '../i18n/locale';
import { colors, radii, spacing } from '../theme/tokens';
import type { IndonesianRegion, Technician } from '../types/marketplace';

export function InlineMarketplaceMapCard({
  selectedArea,
  onSelectArea,
  onOpenFullMap,
  regions = getIndonesianRegions(),
  technicians,
}: {
  selectedArea: string;
  onSelectArea: (area: string, notice?: string) => void;
  onOpenFullMap: () => void;
  regions?: IndonesianRegion[];
  technicians: Technician[];
}) {
  const { language, t } = useLanguage();
  const { palette } = useAppearance();

  const regionChips = useMemo(() => {
    const dynamicAreas = Array.from(new Set(technicians.flatMap((tech) => tech.serviceAreas)));
    const dynamicRegions: IndonesianRegion[] = dynamicAreas.map((areaName) => {
      const match = regions.find((r) => r.name === areaName);
      return (
        match ?? {
          id: `area-${areaName.toLowerCase().replace(/\s+/g, '-')}`,
          code: areaName.slice(0, 3).toUpperCase(),
          name: areaName,
          nameEn: areaName,
          province: 'Indonesia',
          provinceEn: 'Indonesia',
          districts: [],
          latitude: -6.2,
          longitude: 106.8,
        }
      );
    });

    const seen = new Set<string>();
    const merged: IndonesianRegion[] = [];
    for (const reg of [...dynamicRegions, ...regions]) {
      if (!seen.has(reg.name)) {
        seen.add(reg.name);
        merged.push(reg);
      }
    }

    return merged.map((reg) => {
      const count = technicians.filter((tech) => tech.serviceAreas.includes(reg.name)).length;
      return { region: reg, count };
    });
  }, [regions, technicians]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
      testID="inline-marketplace-map"
    >
      <View style={styles.headerRow}>
        <View style={styles.locationSummary}>
          <View style={styles.pinIconWrap}>
            <View style={[styles.pinHead, { borderColor: palette.primary }]} />
            <View style={[styles.pinTail, { backgroundColor: palette.primary }]} />
          </View>
          <Text
            numberOfLines={1}
            style={[styles.activeAreaText, { color: palette.text }]}
          >
            {selectedArea === 'Semua area'
              ? t('home.allAreasOption')
              : localizeArea(selectedArea, language)}
          </Text>
        </View>

        <View style={styles.actionsRight}>
          {selectedArea !== 'Semua area' && (
            <Pressable
              accessibilityRole="button"
              onPress={() => onSelectArea('Semua area')}
              style={[styles.resetChip, { backgroundColor: palette.pillBg }]}
              testID="inline-map-reset-all"
            >
              <Text style={[styles.resetChipText, { color: palette.textMuted }]}>
                {t('home.allAreasOption')}
              </Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={onOpenFullMap}
            style={[
              styles.changeAreaBtn,
              { backgroundColor: palette.primarySoft },
            ]}
            testID="open-full-map-button"
          >
            <Text style={[styles.changeAreaBtnText, { color: palette.primary }]}>
              {language === 'en' ? 'Choose Location' : 'Pilih Lokasi'}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScroll}
      >
        {regionChips.map(({ region, count }) => {
          const selected = selectedArea === region.name;
          return (
            <Pressable
              key={region.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onSelectArea(region.name)}
              style={[
                styles.areaChip,
                {
                  backgroundColor: palette.surfaceElevated,
                  borderColor: palette.border,
                },
                selected && {
                  backgroundColor: palette.primary,
                  borderColor: palette.primary,
                },
              ]}
              testID={`inline-map-pin-${region.id}`}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.areaChipLabel,
                  { color: palette.text },
                  selected && styles.areaChipLabelSelected,
                ]}
              >
                {localizeArea(region.name, language)}
              </Text>
              {count > 0 && (
                <View
                  style={[
                    styles.countBadge,
                    { backgroundColor: palette.pillBg },
                    selected && styles.countBadgeSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      { color: palette.text },
                      selected && styles.countTextSelected,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E6EB',
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  locationSummary: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    marginRight: spacing.sm,
  },
  pinIconWrap: {
    alignItems: 'center',
    height: 18,
    justifyContent: 'center',
    width: 14,
  },
  pinHead: {
    borderColor: colors.greenDark,
    borderRadius: 5,
    borderWidth: 2,
    height: 10,
    width: 10,
  },
  pinTail: {
    backgroundColor: colors.greenDark,
    borderRadius: 1,
    height: 5,
    marginTop: -1,
    width: 2,
  },
  activeAreaText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  actionsRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  resetChip: {
    backgroundColor: '#F0F2F5',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  resetChipText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  changeAreaBtn: {
    backgroundColor: colors.greenSoft,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  changeAreaBtnText: {
    color: colors.greenDark,
    fontSize: 12,
    fontWeight: '700',
  },
  chipsScroll: {
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingTop: 2,
  },
  areaChip: {
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
    borderColor: '#E4E6EB',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  areaChipSelected: {
    backgroundColor: colors.greenDark,
    borderColor: colors.greenDark,
  },
  areaChipLabel: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '600',
  },
  areaChipLabelSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: '#E4E6EB',
    borderRadius: radii.sm,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  countBadgeSelected: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  countText: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '700',
  },
  countTextSelected: {
    color: '#FFFFFF',
  },
});
