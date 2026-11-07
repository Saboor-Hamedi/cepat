import { CheckCircle2, MessageSquare, Tag, X } from 'lucide-react-native';
import React, { memo, useCallback, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import { useLanguage } from '../../i18n/locale';
import { ICON_STROKE } from '../../theme/icons';
import { spacing } from '../../theme/tokens';
import { font } from '../../theme/typography';
import {
  MINT,
  MODAL_DANGER,
  MODAL_MUTED,
  MODAL_SHEET_BORDER,
  MODAL_SURFACE,
  MODAL_TEXT,
} from './constants';
import {
  applyPriceInputChange,
  formatRupiahInput,
  parseRupiahInput,
  type PriceMode,
  validateServicePriceInput,
} from './priceFormatter';

export {
  applyPriceInputChange,
  formatRupiahInput,
  parseRupiahInput,
  type PriceMode,
  validateServicePriceInput,
};

export interface PriceInputProps {
  /** Formatted display value (e.g. "1.000.000") */
  displayValue: string;
  /** Canonical numeric value (e.g. 1000000) */
  canonicalValue: number | undefined;
  /** Pricing mode: "fixed" (Starting Price) or "quotation" (Contact for quotation) */
  priceMode: PriceMode;
  onChangePrice: (next: {
    displayValue: string;
    canonicalValue: number | undefined;
  }) => void;
  onChangeMode: (mode: PriceMode) => void;
  isModal?: boolean;
  disabled?: boolean;
  showValidationError?: boolean;
  sectionTestID?: string;
  inputTestID?: string;
}

export const PriceInput = memo(function PriceInput({
  displayValue,
  canonicalValue,
  priceMode,
  onChangePrice,
  onChangeMode,
  isModal = false,
  disabled = false,
  showValidationError = false,
  sectionTestID = 'compose-service-price-section',
  inputTestID = 'compose-service-price-input',
}: PriceInputProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();
  const [selection, setSelection] = useState<
    { start: number; end: number } | undefined
  >(undefined);
  const lastSelectionRef = useRef<number | undefined>(undefined);
  const isInternalFormattingRef = useRef(false);

  const textColor = isModal ? MODAL_TEXT : palette.text;
  const mutedColor = isModal ? MODAL_MUTED : palette.textMuted;
  const surfaceBg = isModal
    ? MODAL_SURFACE
    : palette.surfaceElevated;
  const borderColor = isModal ? MODAL_SHEET_BORDER : palette.border;
  const dangerColor = isModal ? MODAL_DANGER : palette.danger;

  const validation = validateServicePriceInput({
    isServicePost: true,
    priceMode,
    canonicalPrice: canonicalValue,
    displayValue,
    language,
  });

  const hasValidFixedPrice =
    priceMode === 'fixed' &&
    typeof canonicalValue === 'number' &&
    canonicalValue > 0 &&
    validation.isValid;

  const handleSelectionChange = useCallback(
    (e: { nativeEvent: { selection: { start: number; end: number } } }) => {
      const nextEnd = e.nativeEvent.selection.end;
      lastSelectionRef.current = nextEnd;
      if (!isInternalFormattingRef.current) {
        setSelection(undefined);
      }
    },
    [],
  );

  const handleChangeText = useCallback(
    (rawText: string) => {
      // Heuristic: if user typed or deleted near `lastSelectionRef`, estimate caret in `rawText`
      const lengthDelta = rawText.length - displayValue.length;
      const estimatedRawCaret =
        typeof lastSelectionRef.current === 'number'
          ? Math.max(
              0,
              Math.min(rawText.length, lastSelectionRef.current + lengthDelta),
            )
          : rawText.length;

      const result = applyPriceInputChange(
        displayValue,
        rawText,
        estimatedRawCaret,
      );

      onChangePrice({
        displayValue: result.displayValue,
        canonicalValue: result.canonicalValue,
      });

      // Preserve caret position when formatting inserts/removes '.' separators in the middle
      if (result.cursorOffset < result.displayValue.length) {
        isInternalFormattingRef.current = true;
        setSelection({
          start: result.cursorOffset,
          end: result.cursorOffset,
        });
        lastSelectionRef.current = result.cursorOffset;
        setTimeout(() => {
          isInternalFormattingRef.current = false;
        }, 0);
      } else {
        setSelection(undefined);
        lastSelectionRef.current = result.displayValue.length;
      }
    },
    [displayValue, onChangePrice],
  );

  const handleClear = useCallback(() => {
    onChangePrice({ displayValue: '', canonicalValue: undefined });
    setSelection(undefined);
    lastSelectionRef.current = 0;
  }, [onChangePrice]);

  return (
    <View style={styles.root} testID={sectionTestID}>
      {/* Section Header + Mode Selector ("Starting Price" vs "Contact for Quotation") */}
      <View style={styles.headerRow}>
        <Text style={[styles.fieldLabel, { color: mutedColor }]}>
          {language === 'en' ? 'SERVICE PRICE' : 'HARGA LAYANAN'}
        </Text>
        <View
          style={[
            styles.modeToggleWrap,
            { backgroundColor: surfaceBg, borderColor },
          ]}
        >
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: priceMode === 'fixed' }}
            disabled={disabled}
            onPress={() => onChangeMode('fixed')}
            style={[
              styles.modePill,
              priceMode === 'fixed' && { backgroundColor: MINT },
            ]}
            testID="compose-price-mode-fixed"
          >
            <Tag
              color={priceMode === 'fixed' ? '#0B0E14' : mutedColor}
              size={12}
              strokeWidth={ICON_STROKE}
            />
            <Text
              style={[
                styles.modePillText,
                {
                  color: priceMode === 'fixed' ? '#0B0E14' : mutedColor,
                  fontWeight: priceMode === 'fixed' ? '800' : '600',
                },
              ]}
            >
              {language === 'en' ? 'Starting price' : 'Harga mulai'}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: priceMode === 'quotation' }}
            disabled={disabled}
            onPress={() => onChangeMode('quotation')}
            style={[
              styles.modePill,
              priceMode === 'quotation' && { backgroundColor: MINT },
            ]}
            testID="compose-price-mode-quotation"
          >
            <MessageSquare
              color={priceMode === 'quotation' ? '#0B0E14' : mutedColor}
              size={12}
              strokeWidth={ICON_STROKE}
            />
            <Text
              style={[
                styles.modePillText,
                {
                  color: priceMode === 'quotation' ? '#0B0E14' : mutedColor,
                  fontWeight: priceMode === 'quotation' ? '800' : '600',
                },
              ]}
            >
              {language === 'en' ? 'Quotation' : 'Penawaran'}
            </Text>
          </Pressable>
        </View>
      </View>

      {priceMode === 'fixed' ? (
        <>
          <View
            style={[
              styles.priceInputShell,
              {
                backgroundColor: surfaceBg,
                borderColor:
                  showValidationError && !validation.isValid
                    ? dangerColor
                    : hasValidFixedPrice
                      ? MINT
                      : borderColor,
              },
            ]}
          >
            {/* Fixed "Rp" prefix outside the editable numeric field */}
            <View
              style={[
                styles.rpPrefixBadge,
                { borderRightColor: borderColor },
              ]}
            >
              <Text style={[styles.rpPrefixText, { color: MINT }]}>Rp</Text>
            </View>

            <TextInput
              editable={!disabled}
              inputMode="numeric"
              keyboardType="numeric"
              maxLength={17} // "1.000.000.000.000" is 17 chars
              onChangeText={handleChangeText}
              onSelectionChange={handleSelectionChange}
              placeholder="100.000"
              placeholderTextColor={mutedColor}
              selection={selection}
              style={[styles.priceTextInput, { color: textColor }]}
              testID={inputTestID}
              value={displayValue}
            />

            {displayValue.length > 0 ? (
              <View style={styles.trailingActions}>
                {hasValidFixedPrice && (
                  <CheckCircle2
                    color={MINT}
                    size={16}
                    strokeWidth={ICON_STROKE}
                    testID="compose-price-valid-badge"
                  />
                )}
                <Pressable
                  accessibilityLabel={
                    language === 'en' ? 'Clear price' : 'Hapus harga'
                  }
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={handleClear}
                  style={styles.clearBtn}
                  testID="compose-service-price-clear"
                >
                  <X color={mutedColor} size={15} strokeWidth={ICON_STROKE} />
                </Pressable>
              </View>
            ) : null}
          </View>

          {showValidationError && validation.errorMessage ? (
            <Text
              style={[styles.validationErrorText, { color: dangerColor }]}
              testID="compose-service-price-error"
            >
              {validation.errorMessage}
            </Text>
          ) : hasValidFixedPrice && canonicalValue ? (
            <Text
              style={[styles.formattedPreviewText, { color: mutedColor }]}
              testID="compose-service-price-canonical"
            >
              {language === 'en'
                ? `Saved as Rp ${formatRupiahInput(canonicalValue)} / visit`
                : `Disimpan Rp ${formatRupiahInput(canonicalValue)} / kunjungan`}
            </Text>
          ) : null}
        </>
      ) : (
        <View
          style={[
            styles.quotationBox,
            { backgroundColor: surfaceBg, borderColor },
          ]}
          testID="compose-price-quotation-notice"
        >
          <MessageSquare color={MINT} size={15} strokeWidth={ICON_STROKE} />
          <Text style={[styles.quotationText, { color: mutedColor }]}>
            {language === 'en'
              ? 'Customers will contact you directly to discuss the scope and quotation.'
              : 'Pelanggan akan menghubungi Anda untuk mendiskusikan detail dan penawaran harga.'}
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    marginTop: spacing.sm,
    width: '100%',
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  modeToggleWrap: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 2,
  },
  modePill: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  modePillText: {
    fontSize: 11,
  },
  priceInputShell: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    height: 44,
    overflow: 'hidden',
  },
  rpPrefixBadge: {
    alignItems: 'center',
    borderRightWidth: 1,
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  rpPrefixText: {
    fontSize: font.subtitle,
    fontWeight: '800',
  },
  priceTextInput: {
    flex: 1,
    fontSize: font.heading,
    fontWeight: '700',
    height: '100%',
    letterSpacing: 0.2,
    paddingHorizontal: 12,
    paddingVertical: 0,
  },
  trailingActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingRight: 10,
  },
  clearBtn: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  validationErrorText: {
    fontSize: font.caption,
    fontWeight: '600',
    marginTop: 4,
  },
  formattedPreviewText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  quotationBox: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  quotationText: {
    flex: 1,
    fontSize: font.caption,
    lineHeight: 16,
  },
});
