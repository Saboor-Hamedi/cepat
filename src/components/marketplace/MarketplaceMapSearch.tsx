import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppearance } from '../context/AppearanceContext';
import { localizeArea, useLanguage } from '../i18n/locale';
import { colors, radii, spacing } from '../theme/tokens';
import type { IndonesianRegion, SavedAddress, Technician } from '../types/marketplace';

export { InlineMarketplaceMapCard } from './InlineMarketplaceMapCard';

export interface MarketplaceMapSearchProps {
  visible: boolean;
  onClose: () => void;
  selectedArea: string;
  onSelectArea: (area: string, notice?: string) => void;
  regions: IndonesianRegion[];
  serviceAreas: string[];
  savedAddresses: SavedAddress[];
  technicians: Technician[];
}

function findNearestRegion(
  lat: number,
  lng: number,
  regions: IndonesianRegion[],
): IndonesianRegion {
  return regions.reduce((best, candidate) => {
    const bestDist =
      Math.pow(best.latitude - lat, 2) + Math.pow(best.longitude - lng, 2);
    const candDist =
      Math.pow(candidate.latitude - lat, 2) + Math.pow(candidate.longitude - lng, 2);
    return candDist < bestDist ? candidate : best;
  }, regions[0]);
}

export function MarketplaceMapSearchModal({
  visible,
  onClose,
  selectedArea,
  onSelectArea,
  regions,
  serviceAreas,
  savedAddresses,
  technicians,
}: MarketplaceMapSearchProps) {
  const { language, t } = useLanguage();
  const { palette } = useAppearance();
  const insets = useSafeAreaInsets();
  const [areaQuery, setAreaQuery] = useState('');
  const [customAddressText, setCustomAddressText] = useState('');
  const [pinLatitude, setPinLatitude] = useState('-6.2615');
  const [pinLongitude, setPinLongitude] = useState('106.8106');
  const [zoomLevel, setZoomLevel] = useState(2);

  const filteredRegions = useMemo(() => {
    const q = areaQuery.trim().toLocaleLowerCase('id-ID');
    if (!q) return regions;
    return regions.filter((reg) => {
      const hay = [
        reg.name,
        reg.nameEn,
        reg.province,
        reg.provinceEn,
        ...reg.districts,
        ...(reg.neighborhoods ?? []),
      ]
        .join(' ')
        .toLocaleLowerCase('id-ID');
      return hay.includes(q);
    });
  }, [areaQuery, regions]);

  const matchingDistricts = useMemo(() => {
    const q = areaQuery.trim().toLocaleLowerCase('id-ID');
    if (!q) return [];
    const results: { label: string; parentRegion: IndonesianRegion; kind: string }[] = [];
    for (const reg of regions) {
      for (const dist of reg.districts) {
        if (dist.toLocaleLowerCase('id-ID').includes(q)) {
          results.push({
            label: dist,
            parentRegion: reg,
            kind: language === 'en' ? 'District' : 'Kecamatan',
          });
        }
      }
      for (const hood of reg.neighborhoods ?? []) {
        if (hood.toLocaleLowerCase('id-ID').includes(q)) {
          results.push({
            label: hood,
            parentRegion: reg,
            kind: language === 'en' ? 'Neighborhood' : 'Kawasan/Kelurahan',
          });
        }
      }
    }
    return results.slice(0, 10);
  }, [areaQuery, language, regions]);

  const extraServiceAreas = useMemo(() => {
    const regionNames = new Set(regions.map((r) => r.name));
    const q = areaQuery.trim().toLocaleLowerCase('id-ID');
    return serviceAreas.filter(
      (name) =>
        !regionNames.has(name) &&
        (!q || name.toLocaleLowerCase('id-ID').includes(q)),
    );
  }, [areaQuery, regions, serviceAreas]);

  const currentLat = Number(pinLatitude) || -6.2615;
  const currentLng = Number(pinLongitude) || 106.8106;
  const nearestRegion = useMemo(
    () => findNearestRegion(currentLat, currentLng, regions),
    [currentLat, currentLng, regions],
  );
  const themedAreaOption = {
    backgroundColor: palette.surface,
    borderColor: palette.border,
  };
  const themedSelectedAreaOption = {
    backgroundColor: palette.primarySoft,
    borderColor: palette.primary,
  };

  const moveMapPin = (dLat: number, dLng: number) => {
    const stepMultiplier = Math.max(0.25, 1 / zoomLevel);
    const nextLat = Number((currentLat + dLat * stepMultiplier).toFixed(4));
    const nextLng = Number((currentLng + dLng * stepMultiplier).toFixed(4));
    setPinLatitude(String(nextLat));
    setPinLongitude(String(nextLng));
  };

  const applyMapSelection = (targetRegion: IndonesianRegion, labelOverride?: string) => {
    const label = labelOverride
      ? `${labelOverride} (${localizeArea(targetRegion.name, language)})`
      : localizeArea(targetRegion.name, language);
    onSelectArea(
      targetRegion.name,
      t('home.customPinApplied', {
        area: label,
        lat: targetRegion.latitude.toFixed(4),
        lng: targetRegion.longitude.toFixed(4),
      }),
    );
    onClose();
  };

  const handleApplyPinCoordinates = () => {
    const lat = Number(pinLatitude);
    const lng = Number(pinLongitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const matched = findNearestRegion(lat, lng, regions);
    const addrSuffix = customAddressText.trim()
      ? `${customAddressText.trim()} · ${localizeArea(matched.name, language)}`
      : localizeArea(matched.name, language);
    onSelectArea(
      matched.name,
      t('home.customPinApplied', {
        area: addrSuffix,
        lat: lat.toFixed(4),
        lng: lng.toFixed(4),
      }),
    );
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <Pressable style={styles.modalScrim} onPress={onClose}>
        <Pressable
          style={[
            styles.areaSheet,
            { backgroundColor: palette.surface },
            { paddingBottom: Math.max(insets.bottom + spacing.md, spacing.xxl) },
          ]}
          onPress={(event) => event.stopPropagation()}
          testID="location-picker-modal"
        >
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeaderRow}>
            <View style={styles.sheetHeaderCopy}>
              <Text style={[styles.sheetEyebrow, { color: palette.primary }]}>
                {t('home.areaSheetEyebrow')}
              </Text>
              <Text style={[styles.sheetTitle, { color: palette.text }]}>
                {t('home.areaSheetTitle')}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
              ]}
              testID="close-location-modal"
            >
              <Text style={[styles.closeBtnText, { color: palette.text }]}>×</Text>
            </Pressable>
          </View>
          <Text style={[styles.sheetBody, { color: palette.textMuted }]}>
            {t('home.areaSheetBody')}
          </Text>

          <View
            style={[
              styles.areaSearchBox,
              { backgroundColor: palette.inputBg, borderColor: palette.border },
            ]}
          >
            <TextInput
              accessibilityLabel={t('home.areaSearchPlaceholder')}
              autoCapitalize="none"
              onChangeText={(text) => {
                setAreaQuery(text);
                const q = text.trim().toLocaleLowerCase('id-ID');
                if (q) {
                  const match = regions.find(
                    (r) =>
                      r.name.toLocaleLowerCase('id-ID').includes(q) ||
                      r.districts.some((d) => d.toLocaleLowerCase('id-ID').includes(q)) ||
                      (r.neighborhoods ?? []).some((n) =>
                        n.toLocaleLowerCase('id-ID').includes(q),
                      ),
                  );
                  if (match) {
                    setPinLatitude(String(match.latitude));
                    setPinLongitude(String(match.longitude));
                  }
                }
              }}
              placeholder={t('home.areaSearchPlaceholder')}
              placeholderTextColor={palette.textMuted}
              style={[styles.areaSearchInput, { color: palette.text }]}
              testID="area-search-input"
              value={areaQuery}
            />
            {areaQuery.length > 0 && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setAreaQuery('')}
                style={styles.clearAreaSearchBtn}
                testID="clear-area-search"
              >
                <Text style={styles.clearAreaSearchText}>×</Text>
              </Pressable>
            )}
          </View>

          <ScrollView
            style={styles.sheetScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Interactive Map Surface */}
            <Text style={[styles.sheetSectionLabel, { color: palette.textMuted }]}>
              {language === 'en'
                ? 'INTERACTIVE MAP & AREA SELECTION'
                : 'PETA INTERAKTIF & PEMILIHAN TITIK LOKASI'}
            </Text>
            <View
              style={[
                styles.interactiveMapBox,
                { backgroundColor: palette.primarySoft, borderColor: palette.border },
              ]}
              testID="interactive-map-surface"
            >
              <View style={styles.mapSurfaceTopRow}>
                <View>
                  <Text style={[styles.mapNearestLabel, { color: palette.primary }]}>
                    {language === 'en' ? 'ACTIVE MAP CENTER' : 'TITIK PUSAT PETA AKTIF'}
                  </Text>
                  <Text
                    style={[styles.mapNearestName, { color: palette.text }]}
                    testID="map-nearest-region-name"
                  >
                    {localizeArea(nearestRegion.name, language)} ({nearestRegion.province})
                  </Text>
                </View>
                <View
                  style={[
                    styles.zoomControlGroup,
                    { backgroundColor: palette.surface, borderColor: palette.border },
                  ]}
                >
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setZoomLevel((z) => Math.max(1, z - 1))}
                    style={styles.zoomBtn}
                    testID="map-zoom-out"
                  >
                    <Text style={[styles.zoomBtnText, { color: palette.primary }]}>−</Text>
                  </Pressable>
                  <Text style={[styles.zoomLabel, { color: palette.text }]}>
                    {zoomLevel}x
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setZoomLevel((z) => Math.min(4, z + 1))}
                    style={styles.zoomBtn}
                    testID="map-zoom-in"
                  >
                    <Text style={[styles.zoomBtnText, { color: palette.primary }]}>+</Text>
                  </Pressable>
                </View>
              </View>

              {/* 3x3 Tap-to-Move Interactive Map Grid */}
              <View style={styles.mapTouchGrid}>
                {[
                  { id: 'nw', label: '↖ NW', dLat: 0.06, dLng: -0.06 },
                  { id: 'n', label: '↑ N', dLat: 0.06, dLng: 0 },
                  { id: 'ne', label: '↗ NE', dLat: 0.06, dLng: 0.06 },
                  { id: 'w', label: '← W', dLat: 0, dLng: -0.06 },
                  {
                    id: 'center',
                    label: `⌖ ${localizeArea(nearestRegion.name, language)}`,
                    dLat: 0,
                    dLng: 0,
                  },
                  { id: 'e', label: '→ E', dLat: 0, dLng: 0.06 },
                  { id: 'sw', label: '↙ SW', dLat: -0.06, dLng: -0.06 },
                  { id: 's', label: '↓ S', dLat: -0.06, dLng: 0 },
                  { id: 'se', label: '↘ SE', dLat: -0.06, dLng: 0.06 },
                ].map((cell) => {
                  const isCenter = cell.id === 'center';
                  return (
                    <Pressable
                      key={cell.id}
                      accessibilityRole="button"
                      onPress={() => {
                        if (isCenter) {
                          handleApplyPinCoordinates();
                        } else {
                          moveMapPin(cell.dLat, cell.dLng);
                        }
                      }}
                      style={[
                        styles.mapGridCell,
                        {
                          backgroundColor: palette.surface,
                          borderColor: palette.border,
                        },
                        isCenter && {
                          backgroundColor: palette.primary,
                          borderColor: palette.primary,
                        },
                      ]}
                      testID={`map-grid-${cell.id}`}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.mapGridCellText,
                          { color: palette.text },
                          isCenter && styles.mapGridCellCenterText,
                        ]}
                      >
                        {cell.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Quick City/Island Jumpers on Map */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.mapRegionPillsRow}
              >
                {regions.map((reg) => {
                  const isCurrentNearest = nearestRegion.id === reg.id;
                  const techCount = technicians.filter((tItem) =>
                    tItem.serviceAreas.includes(reg.name),
                  ).length;
                  return (
                    <Pressable
                      key={reg.id}
                      accessibilityRole="button"
                      onPress={() => {
                        setPinLatitude(String(reg.latitude));
                        setPinLongitude(String(reg.longitude));
                      }}
                      style={[
                        styles.mapJumpChip,
                        { backgroundColor: palette.surface, borderColor: palette.border },
                        isCurrentNearest && {
                          backgroundColor: palette.primary,
                          borderColor: palette.primary,
                        },
                      ]}
                      testID={`map-jump-${reg.id}`}
                    >
                      <Text
                        style={[
                          styles.mapJumpChipText,
                          { color: palette.text },
                          isCurrentNearest && styles.mapJumpChipTextActive,
                        ]}
                      >
                        {localizeArea(reg.name, language)} ({techCount})
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <TextInput
                onChangeText={setCustomAddressText}
                placeholder={
                  language === 'en'
                    ? 'Optional street address or landmark at this map pin…'
                    : 'Alamat jalan atau patokan di titik peta ini (opsional)…'
                }
                placeholderTextColor={palette.textMuted}
                style={[
                  styles.customAddressInput,
                  {
                    backgroundColor: palette.inputBg,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
                testID="map-custom-address-input"
                value={customAddressText}
              />

              <View style={styles.coordInputRow}>
                <View style={styles.coordField}>
                  <Text style={styles.coordLabel}>LATITUDE</Text>
                  <TextInput
                    keyboardType="numeric"
                    onChangeText={setPinLatitude}
                    style={[
                      styles.coordInput,
                      {
                        backgroundColor: palette.inputBg,
                        borderColor: palette.border,
                        color: palette.text,
                      },
                    ]}
                    testID="pin-latitude-input"
                    value={pinLatitude}
                  />
                </View>
                <View style={styles.coordField}>
                  <Text style={styles.coordLabel}>LONGITUDE</Text>
                  <TextInput
                    keyboardType="numeric"
                    onChangeText={setPinLongitude}
                    style={[
                      styles.coordInput,
                      {
                        backgroundColor: palette.inputBg,
                        borderColor: palette.border,
                        color: palette.text,
                      },
                    ]}
                    testID="pin-longitude-input"
                    value={pinLongitude}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleApplyPinCoordinates}
                  style={[styles.applyPinBtn, { backgroundColor: palette.primary }]}
                  testID="apply-pin-button"
                >
                  <Text style={styles.applyPinBtnText}>
                    {language === 'en' ? 'Select Pin' : 'Pilih Titik'}
                  </Text>
                </Pressable>
              </View>

              <Text style={[styles.providerNote, { color: palette.textMuted }]}>
                {language === 'en'
                  ? 'Note: Map coordinates and administrative regions use Cepat’s Indonesian region index. External map tiles and live street geocoding API are not yet configured.'
                  : 'Catatan: Koordinat peta dan wilayah administratif menggunakan indeks wilayah Indonesia Cepat. Tile peta eksternal dan API geocoding jalan live belum dikonfigurasi.'}
              </Text>
            </View>

            {/* All Areas Option */}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: selectedArea === 'Semua area' }}
              onPress={() => {
                onSelectArea('Semua area');
                onClose();
              }}
              style={[
                styles.areaOption,
                themedAreaOption,
                selectedArea === 'Semua area' && themedSelectedAreaOption,
              ]}
              testID="area-option-all"
            >
              <View style={styles.areaPinCircle}>
                <View style={styles.areaPinDot} />
              </View>
              <View style={styles.areaOptionCopy}>
                <Text style={[styles.areaOptionText, { color: palette.text }]}>
                  {t('home.allAreasOption')}
                </Text>
                <Text style={[styles.areaOptionSub, { color: palette.textMuted }]}>
                  {language === 'en'
                    ? `Browse all ${regions.length}+ supported Indonesian regions`
                    : `Tampilkan seluruh ${regions.length}+ wilayah layanan di Indonesia`}
                </Text>
              </View>
              {selectedArea === 'Semua area' && (
                <Text style={[styles.areaCheck, { color: palette.primary }]}>✓</Text>
              )}
            </Pressable>

            {/* Matching Districts & Neighborhoods when searching */}
            {matchingDistricts.length > 0 && (
              <>
                <Text style={[styles.sheetSectionLabel, { color: palette.textMuted }]}>
                  {language === 'en'
                    ? 'MATCHING DISTRICTS & NEIGHBORHOODS'
                    : 'KECAMATAN & KAWASAN YANG COCOK'}
                </Text>
                {matchingDistricts.map((item) => (
                  <Pressable
                    key={`${item.parentRegion.id}-${item.label}`}
                    accessibilityRole="button"
                    onPress={() => applyMapSelection(item.parentRegion, item.label)}
                    style={[styles.areaOption, themedAreaOption]}
                    testID={`district-option-${item.label}`}
                  >
                    <View style={styles.areaPinCircle}>
                      <View style={styles.areaPinDot} />
                    </View>
                    <View style={styles.areaOptionCopy}>
                      <Text style={[styles.areaOptionText, { color: palette.text }]}>
                        {item.label}
                      </Text>
                      <Text style={[styles.areaOptionSub, { color: palette.textMuted }]}>
                        {item.kind} · {localizeArea(item.parentRegion.name, language)},{' '}
                        {item.parentRegion.province}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </>
            )}

            {/* Saved Customer Addresses */}
            {savedAddresses.length > 0 && (
              <>
                <Text style={[styles.sheetSectionLabel, { color: palette.textMuted }]}>
                  {t('home.savedAddressesLabel')}
                </Text>
                {savedAddresses.map((addr) => {
                  const isSelected = selectedArea === addr.area;
                  return (
                    <Pressable
                      key={addr.id}
                      accessibilityRole="button"
                      onPress={() => {
                        onSelectArea(
                          addr.area,
                          `${addr.label}: ${addr.streetAddress} (${localizeArea(addr.area, language)})`,
                        );
                        onClose();
                      }}
                      style={[
                        styles.areaOption,
                        themedAreaOption,
                        isSelected && themedSelectedAreaOption,
                      ]}
                      testID={`saved-address-option-${addr.id}`}
                    >
                      <View style={styles.savedAddrBadge}>
                        <Text style={styles.savedAddrBadgeText}>{addr.label}</Text>
                      </View>
                      <View style={styles.areaOptionCopy}>
                        <Text
                          numberOfLines={1}
                          style={[styles.areaOptionText, { color: palette.text }]}
                        >
                          {addr.streetAddress}
                        </Text>
                        <Text style={[styles.areaOptionSub, { color: palette.textMuted }]}>
                          {localizeArea(addr.area, language)}
                          {addr.district ? ` · ${addr.district}` : ''}
                        </Text>
                      </View>
                      {isSelected && (
                        <Text style={[styles.areaCheck, { color: palette.primary }]}>✓</Text>
                      )}
                    </Pressable>
                  );
                })}
              </>
            )}

            {/* Indonesian Administrative Regions */}
            <Text style={[styles.sheetSectionLabel, { color: palette.textMuted }]}>
              {t('home.regionsLabel')} ({filteredRegions.length})
            </Text>
            {filteredRegions.map((reg) => {
              const isSelected = selectedArea === reg.name;
              const techCount = technicians.filter((tItem) =>
                tItem.serviceAreas.includes(reg.name),
              ).length;
              return (
                <View key={reg.id} style={styles.regionBlock}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => applyMapSelection(reg)}
                    style={[
                      styles.areaOption,
                      themedAreaOption,
                      isSelected && themedSelectedAreaOption,
                    ]}
                    testID={`region-option-${reg.id}`}
                  >
                    <View style={styles.areaPinCircle}>
                      <View style={styles.areaPinDot} />
                    </View>
                    <View style={styles.areaOptionCopy}>
                      <Text style={[styles.areaOptionText, { color: palette.text }]}>
                        {localizeArea(reg.name, language)}
                      </Text>
                      <Text style={[styles.areaOptionSub, { color: palette.textMuted }]}>
                        {language === 'en' ? reg.provinceEn : reg.province} ·{' '}
                        {reg.districts.slice(0, 4).join(', ')}
                      </Text>
                    </View>
                    <View style={styles.regionCountPill}>
                      <Text style={[styles.regionCountText, { color: palette.primary }]}>
                        {techCount} {t('home.profiles')}
                      </Text>
                    </View>
                    {isSelected && (
                      <Text style={[styles.areaCheck, { color: palette.primary }]}>✓</Text>
                    )}
                  </Pressable>
                </View>
              );
            })}

            {/* Additional Live Service Areas from Supabase */}
            {extraServiceAreas.map((areaName) => {
              const isSelected = selectedArea === areaName;
              return (
                <Pressable
                  key={areaName}
                  accessibilityRole="button"
                  onPress={() => {
                    onSelectArea(areaName);
                    onClose();
                  }}
                  style={[
                    styles.areaOption,
                    themedAreaOption,
                    isSelected && themedSelectedAreaOption,
                  ]}
                >
                  <View style={styles.areaPinCircle}>
                    <View style={styles.areaPinDot} />
                  </View>
                  <View style={styles.areaOptionCopy}>
                    <Text style={[styles.areaOptionText, { color: palette.text }]}>
                      {localizeArea(areaName, language)}
                    </Text>
                  </View>
                  {isSelected && (
                    <Text style={[styles.areaCheck, { color: palette.primary }]}>✓</Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalScrim: {
    backgroundColor: 'rgba(22, 39, 34, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  areaSheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: '#D5D9D2',
    borderRadius: 3,
    height: 4,
    marginBottom: spacing.md,
    width: 40,
  },
  sheetHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sheetHeaderCopy: { flex: 1 },
  closeBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  closeBtnText: { color: colors.ink, fontSize: 20, fontWeight: '700', lineHeight: 22 },
  sheetEyebrow: { color: colors.green, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  sheetTitle: { color: colors.ink, fontSize: 22, fontWeight: '800', marginTop: 4 },
  sheetBody: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.md,
    marginTop: 4,
  },
  areaSearchBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    height: 48,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  areaSearchInput: { color: colors.ink, flex: 1, fontSize: 13, height: '100%' },
  clearAreaSearchBtn: { alignItems: 'center', height: 28, justifyContent: 'center', width: 28 },
  clearAreaSearchText: { color: colors.muted, fontSize: 18, fontWeight: '700' },
  sheetScroll: { maxHeight: 500 },
  sheetSectionLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  interactiveMapBox: {
    backgroundColor: '#EAF2ED',
    borderColor: '#C5DDD0',
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  mapSurfaceTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  mapNearestLabel: { color: colors.greenDark, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  mapNearestName: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: 2 },
  zoomControlGroup: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  zoomBtn: { alignItems: 'center', height: 24, justifyContent: 'center', width: 24 },
  zoomBtnText: { color: colors.greenDark, fontSize: 16, fontWeight: '800' },
  zoomLabel: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  mapTouchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  mapGridCell: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderColor: '#C5DDD0',
    borderRadius: radii.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 6,
    width: '31%',
  },
  mapGridCellCenter: { backgroundColor: colors.greenDark, borderColor: colors.greenDark },
  mapGridCellText: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  mapGridCellCenterText: { color: '#FFFFFF', fontWeight: '800' },
  mapRegionPillsRow: { gap: 6, paddingVertical: 4 },
  mapJumpChip: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  mapJumpChipActive: { backgroundColor: colors.green, borderColor: colors.green },
  mapJumpChipText: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  mapJumpChipTextActive: { color: '#FFFFFF' },
  customAddressInput: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 12,
    height: 40,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  coordInputRow: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  coordField: { flex: 1 },
  coordLabel: { color: colors.greenDark, fontSize: 9, fontWeight: '800', marginBottom: 3 },
  coordInput: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 12,
    height: 38,
    paddingHorizontal: spacing.sm,
  },
  applyPinBtn: {
    alignItems: 'center',
    backgroundColor: colors.greenDark,
    borderRadius: radii.sm,
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  applyPinBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  providerNote: {
    color: colors.muted,
    fontSize: 10,
    fontStyle: 'italic',
    lineHeight: 14,
    marginTop: spacing.sm,
  },
  regionBlock: { marginBottom: 2 },
  areaOption: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  areaOptionSelected: { backgroundColor: colors.greenSoft, borderColor: colors.green },
  areaPinCircle: {
    alignItems: 'center',
    backgroundColor: colors.greenSoft,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  areaPinDot: { backgroundColor: colors.greenDark, borderRadius: 4, height: 8, width: 8 },
  areaOptionCopy: { flex: 1 },
  areaOptionText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  areaOptionSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  regionCountPill: {
    backgroundColor: colors.paper,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  regionCountText: { color: colors.greenDark, fontSize: 10, fontWeight: '700' },
  areaCheck: { color: colors.greenDark, fontSize: 16, fontWeight: '800', marginLeft: 4 },
  savedAddrBadge: {
    backgroundColor: colors.orangeSoft,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  savedAddrBadgeText: { color: colors.orange, fontSize: 10, fontWeight: '800' },
});
