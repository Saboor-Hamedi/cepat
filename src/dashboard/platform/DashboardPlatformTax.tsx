import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowRight,
  CheckCircle2,
  DollarSign,
  Percent,
  Sliders,
  Sparkles,
} from 'lucide-react-native';

import { useAppearance } from '../../context/AppearanceContext';
import {
  calculatePlatformFee,
  type PlatformSettings,
} from '../../data/adminStore';
import { formatRupiah } from '../../data/marketplaceRepository';
import { useLanguage } from '../../i18n/locale';
import { ICON_STROKE } from '../../theme/icons';
import { radii, spacing } from '../../theme/tokens';
import { font } from '../../theme/typography';

interface DashboardPlatformTaxProps {
  settings: PlatformSettings;
  onUpdateSettings: (settings: Partial<PlatformSettings>) => Promise<void>;
}

export function DashboardPlatformTax({
  settings,
  onUpdateSettings,
}: DashboardPlatformTaxProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();

  const [feeType, setFeeType] = useState<'percentage' | 'fixed'>(
    settings.platformFeeType,
  );
  const [feeRate, setFeeRate] = useState<string>(
    String(settings.platformFeeRate),
  );
  const [feeFixed, setFeeFixed] = useState<string>(
    String(settings.platformFeeFixed),
  );
  const [minFee, setMinFee] = useState<string>(
    String(settings.minimumFee),
  );
  const [taxName, setTaxName] = useState<string>(settings.taxName);
  const [description, setDescription] = useState<string>(
    settings.description || '',
  );

  // Live simulation test amount (defaults to 100,000 IDR as requested)
  const [simulationPrice, setSimulationPrice] = useState<string>('100000');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Active settings preview object for real-time simulation
  const currentDraftSettings: PlatformSettings = {
    ...settings,
    platformFeeType: feeType,
    platformFeeRate: parseFloat(feeRate) || 0,
    platformFeeFixed: parseInt(feeFixed.replace(/[^0-9]/g, ''), 10) || 0,
    minimumFee: parseInt(minFee.replace(/[^0-9]/g, ''), 10) || 0,
    taxName: taxName.trim() || 'Platform Tax & Fee',
    description: description.trim(),
  };

  const simNumeric =
    parseInt(simulationPrice.replace(/[^0-9]/g, ''), 10) || 0;
  const simCalc = calculatePlatformFee(simNumeric, currentDraftSettings);

  const handleApplyPreset = (preset: 'standard10' | 'promo5' | 'fixed10k') => {
    if (preset === 'standard10') {
      setFeeType('percentage');
      setFeeRate('10');
      setMinFee('5000');
    } else if (preset === 'promo5') {
      setFeeType('percentage');
      setFeeRate('5');
      setMinFee('2500');
    } else {
      setFeeType('fixed');
      setFeeFixed('10000');
      setMinFee('5000');
    }
  };

  const handleSave = async () => {
    const rateNum = parseFloat(feeRate);
    const fixedNum = parseInt(feeFixed.replace(/[^0-9]/g, ''), 10);
    const minNum = parseInt(minFee.replace(/[^0-9]/g, ''), 10);

    if (feeType === 'percentage' && (isNaN(rateNum) || rateNum < 0 || rateNum > 100)) {
      Alert.alert(
        language === 'en' ? 'Invalid Rate' : 'Persentase Tidak Valid',
        language === 'en'
          ? 'Platform fee rate must be between 0% and 100%.'
          : 'Persentase komisi platform harus antara 0% hingga 100%.',
      );
      return;
    }

    if (feeType === 'fixed' && (isNaN(fixedNum) || fixedNum < 0)) {
      Alert.alert(
        language === 'en' ? 'Invalid Amount' : 'Nominal Tidak Valid',
        language === 'en'
          ? 'Fixed platform fee must be greater than or equal to 0.'
          : 'Nominal biaya tetap harus lebih dari atau sama dengan 0.',
      );
      return;
    }

    setSaving(true);
    setSavedSuccess(false);
    try {
      await onUpdateSettings({
        platformFeeType: feeType,
        platformFeeRate: rateNum || 0,
        platformFeeFixed: fixedNum || 0,
        minimumFee: minNum || 0,
        taxName: taxName.trim() || 'Biaya Platform & Layanan',
        description: description.trim() || undefined,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err) {
      Alert.alert(
        language === 'en' ? 'Error' : 'Kesalahan',
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      setSaving(false);
    }
  };

  const techSharePercent =
    simNumeric > 0
      ? Math.max(0, Math.min(100, Math.round((simCalc.technicianPayout / simNumeric) * 100)))
      : 90;
  const platformSharePercent = Math.max(0, 100 - techSharePercent);

  return (
    <View style={styles.container} testID="admin-platform-tax-section">
      {/* Intro Header Card */}
      <View
        style={[
          styles.card,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <Sliders color="#10B981" size={20} strokeWidth={ICON_STROKE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              {language === 'en'
                ? 'Global Platform Tax & Commission'
                : 'Pajak & Komisi Platform Global'}
            </Text>
            <Text style={[styles.sectionSub, { color: palette.textMuted }]}>
              {language === 'en'
                ? 'Adjust the marketplace commission deducted from technician bookings. Changes take effect globally.'
                : 'Atur potongan komisi dan pajak platform dari setiap pesanan teknisi. Berlaku secara global.'}
            </Text>
          </View>
        </View>

        {/* Preset Shortcuts */}
        <View style={styles.presetsRow}>
          <Text style={[styles.presetLabel, { color: palette.textMuted }]}>
            {language === 'en' ? 'Quick Presets:' : 'Preset Cepat:'}
          </Text>
          <Pressable
            onPress={() => handleApplyPreset('standard10')}
            style={[
              styles.presetChip,
              feeType === 'percentage' && feeRate === '10' && styles.presetChipActive,
              { borderColor: palette.border },
            ]}
          >
            <Text
              style={[
                styles.presetChipText,
                { color: feeType === 'percentage' && feeRate === '10' ? '#10B981' : palette.text },
              ]}
            >
              10% Standard
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleApplyPreset('promo5')}
            style={[
              styles.presetChip,
              feeType === 'percentage' && feeRate === '5' && styles.presetChipActive,
              { borderColor: palette.border },
            ]}
          >
            <Text
              style={[
                styles.presetChipText,
                { color: feeType === 'percentage' && feeRate === '5' ? '#10B981' : palette.text },
              ]}
            >
              5% Promo
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleApplyPreset('fixed10k')}
            style={[
              styles.presetChip,
              feeType === 'fixed' && feeFixed === '10000' && styles.presetChipActive,
              { borderColor: palette.border },
            ]}
          >
            <Text
              style={[
                styles.presetChipText,
                { color: feeType === 'fixed' && feeFixed === '10000' ? '#10B981' : palette.text },
              ]}
            >
              Rp 10.000 Flat
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Configuration Form Card */}
      <View
        style={[
          styles.card,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <Text style={[styles.cardHeading, { color: palette.text }]}>
          {language === 'en' ? 'Fee Calculation Model' : 'Model Perhitungan Komisi'}
        </Text>

        {/* Fee Type Toggle */}
        <View style={[styles.typeToggleRow, { backgroundColor: palette.inputBg, borderColor: palette.border }]}>
          <Pressable
            onPress={() => setFeeType('percentage')}
            style={[
              styles.typeToggleBtn,
              feeType === 'percentage' && [
                styles.typeToggleBtnActive,
                { backgroundColor: palette.surface, shadowColor: '#000' },
              ],
            ]}
          >
            <Percent
              color={feeType === 'percentage' ? '#10B981' : palette.textMuted}
              size={16}
              strokeWidth={ICON_STROKE}
            />
            <Text
              style={[
                styles.typeToggleText,
                { color: feeType === 'percentage' ? '#10B981' : palette.textMuted },
              ]}
            >
              {language === 'en' ? 'Percentage (%)' : 'Persentase (%)'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFeeType('fixed')}
            style={[
              styles.typeToggleBtn,
              feeType === 'fixed' && [
                styles.typeToggleBtnActive,
                { backgroundColor: palette.surface, shadowColor: '#000' },
              ],
            ]}
          >
            <DollarSign
              color={feeType === 'fixed' ? '#10B981' : palette.textMuted}
              size={16}
              strokeWidth={ICON_STROKE}
            />
            <Text
              style={[
                styles.typeToggleText,
                { color: feeType === 'fixed' ? '#10B981' : palette.textMuted },
              ]}
            >
              {language === 'en' ? 'Fixed Fee (IDR)' : 'Nominal Tetap (Rp)'}
            </Text>
          </Pressable>
        </View>

        {/* Input Fields */}
        <View style={styles.inputsGrid}>
          {feeType === 'percentage' ? (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: palette.text }]}>
                {language === 'en' ? 'Platform Fee Rate (%)' : 'Tarif Komisi Platform (%)'}
              </Text>
              <View style={[styles.textInputBox, { backgroundColor: palette.inputBg, borderColor: palette.border }]}>
                <TextInput
                  keyboardType="numeric"
                  maxLength={5}
                  onChangeText={setFeeRate}
                  placeholder="10.0"
                  placeholderTextColor={palette.textMuted}
                  style={[styles.textInputField, { color: palette.text }]}
                  testID="admin-tax-rate-input"
                  value={feeRate}
                />
                <Text style={[styles.inputSuffix, { color: palette.textMuted }]}>%</Text>
              </View>
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: palette.text }]}>
                {language === 'en' ? 'Fixed Fee Amount (IDR)' : 'Nominal Komisi Tetap (IDR)'}
              </Text>
              <View style={[styles.textInputBox, { backgroundColor: palette.inputBg, borderColor: palette.border }]}>
                <Text style={[styles.inputPrefix, { color: palette.textMuted }]}>Rp</Text>
                <TextInput
                  keyboardType="numeric"
                  maxLength={9}
                  onChangeText={(val) => setFeeFixed(val.replace(/[^0-9]/g, ''))}
                  placeholder="10000"
                  placeholderTextColor={palette.textMuted}
                  style={[styles.textInputField, { color: palette.text }]}
                  testID="admin-tax-fixed-input"
                  value={feeFixed}
                />
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: palette.text }]}>
              {language === 'en' ? 'Minimum Fee Floor (IDR)' : 'Batas Biaya Minimal (IDR)'}
            </Text>
            <View style={[styles.textInputBox, { backgroundColor: palette.inputBg, borderColor: palette.border }]}>
              <Text style={[styles.inputPrefix, { color: palette.textMuted }]}>Rp</Text>
              <TextInput
                keyboardType="numeric"
                maxLength={9}
                onChangeText={(val) => setMinFee(val.replace(/[^0-9]/g, ''))}
                placeholder="5000"
                placeholderTextColor={palette.textMuted}
                style={[styles.textInputField, { color: palette.text }]}
                testID="admin-tax-min-input"
                value={minFee}
              />
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: palette.text }]}>
            {language === 'en' ? 'Tax & Fee Display Name' : 'Nama Label Pajak & Komisi'}
          </Text>
          <TextInput
            onChangeText={setTaxName}
            placeholder={language === 'en' ? 'Platform Tax & Service Fee' : 'Biaya Platform & Layanan'}
            placeholderTextColor={palette.textMuted}
            style={[
              styles.singleLineInput,
              {
                backgroundColor: palette.inputBg,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            value={taxName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: palette.text }]}>
            {language === 'en' ? 'Description & Notes' : 'Deskripsi & Catatan'}
          </Text>
          <TextInput
            multiline
            numberOfLines={2}
            onChangeText={setDescription}
            placeholder={
              language === 'en'
                ? 'Official platform fee description for accounting...'
                : 'Keterangan resmi potongan untuk pembukuan...'
            }
            placeholderTextColor={palette.textMuted}
            style={[
              styles.multiLineInput,
              {
                backgroundColor: palette.inputBg,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            value={description}
          />
        </View>
      </View>

      {/* Real-time Interactive Simulator Card */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: palette.surface,
            borderColor: 'rgba(16, 185, 129, 0.35)',
            borderWidth: 1.5,
          },
        ]}
      >
        <View style={styles.simHeaderRow}>
          <Sparkles color="#10B981" size={18} strokeWidth={ICON_STROKE} />
          <Text style={[styles.cardHeading, { color: palette.text, marginBottom: 0 }]}>
            {language === 'en'
              ? 'Real-Time Transaction Simulator'
              : 'Simulasi Transaksi Real-time'}
          </Text>
        </View>
        <Text style={[styles.simSub, { color: palette.textMuted }]}>
          {language === 'en'
            ? 'Test how any customer booking amount splits between Platform Tax and Technician Payout.'
            : 'Uji pembagian dana pesanan antara Pajak Platform dan Pembayaran Teknisi.'}
        </Text>

        {/* Test Amount Input */}
        <View style={styles.simInputRow}>
          <Text style={[styles.simInputLabel, { color: palette.text }]}>
            {language === 'en' ? 'Sample Job Price:' : 'Uji Harga Pesanan:'}
          </Text>
          <View style={[styles.textInputBox, { flex: 1, backgroundColor: palette.inputBg, borderColor: palette.border }]}>
            <Text style={[styles.inputPrefix, { color: '#10B981', fontWeight: '800' }]}>Rp</Text>
            <TextInput
              keyboardType="numeric"
              maxLength={10}
              onChangeText={(val) => setSimulationPrice(val.replace(/[^0-9]/g, ''))}
              placeholder="100000"
              placeholderTextColor={palette.textMuted}
              style={[styles.textInputField, { color: palette.text, fontWeight: '700' }]}
              testID="admin-tax-sim-input"
              value={simulationPrice}
            />
          </View>
        </View>

        {/* 3 Result Metric Cards */}
        <View style={styles.simResultsGrid}>
          {/* 1. Customer Pays */}
          <View style={[styles.simResultCard, { backgroundColor: palette.inputBg, borderColor: palette.border }]}>
            <Text style={[styles.simResultTitle, { color: palette.textMuted }]}>
              {language === 'en' ? 'Customer Pays' : 'Pelanggan Bayar'}
            </Text>
            <Text style={[styles.simResultValue, { color: palette.text }]}>
              {formatRupiah(simCalc.totalAmount, language)}
            </Text>
            <Text style={[styles.simResultTag, { color: palette.textMuted }]}>
              100% Total
            </Text>
          </View>

          {/* 2. Platform Tax / Our Revenue */}
          <View
            style={[
              styles.simResultCard,
              { backgroundColor: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.3)' },
            ]}
          >
            <Text style={[styles.simResultTitle, { color: '#10B981' }]}>
              {language === 'en' ? 'Platform Tax (Our Revenue)' : 'Pajak Platform (Kita)'}
            </Text>
            <Text style={[styles.simResultValue, { color: '#10B981' }]}>
              {formatRupiah(simCalc.platformFee, language)}
            </Text>
            <Text style={[styles.simResultTag, { color: '#10B981' }]}>
              ~{platformSharePercent}% Komisi
            </Text>
          </View>

          {/* 3. Technician Payout */}
          <View
            style={[
              styles.simResultCard,
              { backgroundColor: 'rgba(59, 130, 246, 0.08)', borderColor: 'rgba(59, 130, 246, 0.3)' },
            ]}
          >
            <Text style={[styles.simResultTitle, { color: '#3B82F6' }]}>
              {language === 'en' ? 'Technician Payout' : 'Diterima Teknisi'}
            </Text>
            <Text style={[styles.simResultValue, { color: '#3B82F6' }]}>
              {formatRupiah(simCalc.technicianPayout, language)}
            </Text>
            <Text style={[styles.simResultTag, { color: '#3B82F6' }]}>
              ~{techSharePercent}% Payout
            </Text>
          </View>
        </View>

        {/* Visual Split Progress Bar */}
        <View style={styles.splitBarWrap}>
          <View
            style={[
              styles.splitBarSegment,
              { flex: Math.max(1, techSharePercent), backgroundColor: '#3B82F6' },
            ]}
          />
          <View
            style={[
              styles.splitBarSegment,
              { flex: Math.max(1, platformSharePercent), backgroundColor: '#10B981' },
            ]}
          />
        </View>
        <View style={styles.splitBarLegend}>
          <Text style={[styles.legendText, { color: '#3B82F6' }]}>
            ● {language === 'en' ? `Technician (${techSharePercent}%)` : `Teknisi (${techSharePercent}%)`}
          </Text>
          <Text style={[styles.legendText, { color: '#10B981' }]}>
            ● {language === 'en' ? `Platform Fee (${platformSharePercent}%)` : `Pajak Platform (${platformSharePercent}%)`}
          </Text>
        </View>
      </View>

      {/* Save Button & Feedback */}
      <View style={styles.actionContainer}>
        {savedSuccess && (
          <View style={styles.successBanner}>
            <CheckCircle2 color="#10B981" size={16} strokeWidth={ICON_STROKE} />
            <Text style={styles.successBannerText}>
              {language === 'en'
                ? 'Platform settings saved and applied to database!'
                : 'Pengaturan platform berhasil disimpan dan diterapkan!'}
            </Text>
          </View>
        )}

        <Pressable
          disabled={saving}
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveBtn,
            {
              backgroundColor: '#10B981',
              opacity: saving ? 0.7 : pressed ? 0.85 : 1,
            },
          ]}
          testID="admin-save-platform-tax-btn"
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={styles.saveBtnText}>
                {language === 'en' ? 'Save Platform Settings' : 'Simpan Pengaturan Platform'}
              </Text>
              <ArrowRight color="#FFFFFF" size={16} strokeWidth={ICON_STROKE} />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: font.title,
    fontWeight: '800',
  },
  sectionSub: {
    fontSize: font.caption,
    marginTop: 2,
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginTop: spacing.xs,
    paddingTop: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
  },
  presetLabel: {
    fontSize: font.caption - 1,
    fontWeight: '600',
  },
  presetChip: {
    borderWidth: 1,
    borderRadius: 9999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  presetChipActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  presetChipText: {
    fontSize: font.caption - 1,
    fontWeight: '700',
  },
  cardHeading: {
    fontSize: font.label,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  typeToggleRow: {
    flexDirection: 'row',
    borderRadius: radii.sm,
    borderWidth: 1,
    padding: 3,
    marginBottom: spacing.md,
  },
  typeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: radii.sm - 2,
  },
  typeToggleBtnActive: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  typeToggleText: {
    fontSize: font.label,
    fontWeight: '700',
  },
  inputsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  inputGroup: {
    flex: 1,
    marginBottom: spacing.sm + 2,
  },
  inputLabel: {
    fontSize: font.caption,
    fontWeight: '700',
    marginBottom: 4,
  },
  textInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
  },
  textInputField: {
    flex: 1,
    paddingVertical: 8,
    fontSize: font.body,
  },
  inputPrefix: {
    fontSize: font.body,
    fontWeight: '700',
    marginRight: 6,
  },
  inputSuffix: {
    fontSize: font.body,
    fontWeight: '700',
    marginLeft: 6,
  },
  singleLineInput: {
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: font.body,
  },
  multiLineInput: {
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: font.body,
    textAlignVertical: 'top',
    minHeight: 56,
  },
  simHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: 4,
  },
  simSub: {
    fontSize: font.caption,
    marginBottom: spacing.md,
  },
  simInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  simInputLabel: {
    fontSize: font.label,
    fontWeight: '700',
  },
  simResultsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  simResultCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: spacing.sm,
    alignItems: 'center',
  },
  simResultTitle: {
    fontSize: font.caption - 2,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  simResultValue: {
    fontSize: font.label + 1,
    fontWeight: '800',
    textAlign: 'center',
  },
  simResultTag: {
    fontSize: font.caption - 2,
    fontWeight: '600',
    marginTop: 2,
  },
  splitBarWrap: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 9999,
    overflow: 'hidden',
    marginBottom: 6,
  },
  splitBarSegment: {
    height: '100%',
  },
  splitBarLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendText: {
    fontSize: font.caption - 1,
    fontWeight: '700',
  },
  actionContainer: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    padding: spacing.sm,
    borderRadius: radii.sm,
  },
  successBannerText: {
    color: '#10B981',
    fontSize: font.caption,
    fontWeight: '700',
    flex: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: font.label,
    fontWeight: '800',
  },
});
