export const MAX_PRICE_DIGITS = 13; // Up to 1.000.000.000.000 (1 Trillion IDR)
export const MAX_PRICE_VALUE = 1_000_000_000_000;

const idNumberFormatter =
  typeof Intl !== 'undefined' && typeof Intl.NumberFormat === 'function'
    ? new Intl.NumberFormat('id-ID', {
        maximumFractionDigits: 0,
        useGrouping: true,
      })
    : null;

/**
 * Normalizes any raw input or pasted string into canonical whole-Rupiah digits.
 * Handles:
 * - "1.000.000" -> "1000000"
 * - "1,000,000" -> "1000000"
 * - "Rp 1.000.000" -> "1000000"
 * - "Rp1,000,000" -> "1000000"
 * - "Rp 1.000.000,00" -> "1000000"
 * - "0" -> "0"
 */
export function sanitizePriceDigits(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  let cleaned = raw.trim();
  if (!cleaned) return '';

  // Strip trailing currency decimal cents if pasted like "Rp 1.000.000,00" or "1,000,000.00"
  if (/^\D*[\d.]+,\d{2}\D*$/.test(cleaned) && cleaned.includes('.')) {
    cleaned = cleaned.replace(/,\d{2}\D*$/, '');
  } else if (/^\D*[\d,]+\.\d{2}\D*$/.test(cleaned) && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\.\d{2}\D*$/, '');
  }

  const digitsOnly = cleaned.replace(/[^0-9]/g, '');
  if (!digitsOnly) return '';

  // Preserve single "0", strip leading zeros from multi-digit inputs (e.g. "01000" -> "1000")
  const withoutLeadingZeros = digitsOnly.replace(/^0+(?=\d)/, '');
  if (withoutLeadingZeros === '0') {
    return '0';
  }

  return withoutLeadingZeros.slice(0, MAX_PRICE_DIGITS);
}

/**
 * Formats a canonical number or raw input string into Indonesian thousands format using `.`
 * Examples:
 * - 0 -> "0"
 * - 1000 -> "1.000"
 * - 1000000 -> "1.000.000"
 * - 1000000000000 -> "1.000.000.000.000"
 */
export function formatRupiahInput(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined || value === '') return '';

  const digits =
    typeof value === 'number'
      ? Number.isFinite(value) && value >= 0
        ? String(Math.floor(value)).slice(0, MAX_PRICE_DIGITS)
        : ''
      : sanitizePriceDigits(String(value));

  if (!digits) return '';
  if (digits === '0') return '0';

  const numeric = Number(digits);
  if (idNumberFormatter && Number.isSafeInteger(numeric)) {
    // Format via Intl.NumberFormat('id-ID') and guarantee '.' grouping separator across all JS engines
    return idNumberFormatter.format(numeric).replace(/[^0-9]/g, '.');
  }

  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Parses a display string or raw input into the canonical numeric value (`number | undefined`).
 */
export function parseRupiahInput(
  value: string | number | null | undefined,
): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : undefined;
  }

  const digits = sanitizePriceDigits(value);
  if (!digits) return undefined;

  const parsed = Number(digits);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed;
}

/**
 * Computes the character position in a formatted price string corresponding to
 * `digitsBeforeCaret` digits from the start.
 */
export function findCaretIndexForDigitCount(
  formatted: string,
  digitsBeforeCaret: number,
): number {
  if (!formatted || digitsBeforeCaret <= 0) return 0;

  let seenDigits = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    const ch = formatted[i];
    if (ch >= '0' && ch <= '9') {
      seenDigits += 1;
      if (seenDigits === digitsBeforeCaret) {
        return i + 1;
      }
    }
  }
  return formatted.length;
}

export interface PriceInputChangeResult {
  displayValue: string;
  canonicalValue: number | undefined;
  cursorOffset: number;
}

/**
 * Handles keystroke/paste updates while preserving accurate cursor position and
 * supporting backspace over `.` thousands separators.
 */
export function applyPriceInputChange(
  prevFormatted: string,
  nextRawText: string,
  nextSelectionEnd?: number,
): PriceInputChangeResult {
  if (!nextRawText) {
    return {
      displayValue: '',
      canonicalValue: undefined,
      cursorOffset: 0,
    };
  }

  const prevDigits = sanitizePriceDigits(prevFormatted);
  const rawCaret =
    typeof nextSelectionEnd === 'number'
      ? Math.max(0, Math.min(nextSelectionEnd, nextRawText.length))
      : nextRawText.length;

  // Detect if user pressed Backspace directly on a '.' thousands separator
  if (
    prevFormatted.length - nextRawText.length === 1 &&
    prevDigits.length > 0 &&
    sanitizePriceDigits(nextRawText) === prevDigits
  ) {
    let removedIndex = -1;
    for (let i = 0; i < prevFormatted.length; i += 1) {
      if (prevFormatted[i] !== nextRawText[i]) {
        removedIndex = i;
        break;
      }
    }
    if (removedIndex > 0 && prevFormatted[removedIndex] === '.') {
      // Delete the digit immediately before the removed '.' separator
      const mutatedPrev =
        prevFormatted.slice(0, removedIndex - 1) +
        prevFormatted.slice(removedIndex + 1);
      const digitsBeforeCaret = mutatedPrev
        .slice(0, Math.max(0, removedIndex - 1))
        .replace(/[^0-9]/g, '').length;
      const displayValue = formatRupiahInput(mutatedPrev);
      const canonicalValue = parseRupiahInput(displayValue);
      const cursorOffset = findCaretIndexForDigitCount(
        displayValue,
        digitsBeforeCaret,
      );
      return {
        displayValue,
        canonicalValue,
        cursorOffset,
      };
    }
  }

  const digitsBeforeCaret = nextRawText
    .slice(0, rawCaret)
    .replace(/[^0-9]/g, '').length;
  const displayValue = formatRupiahInput(nextRawText);
  const canonicalValue = parseRupiahInput(displayValue);
  const cursorOffset = findCaretIndexForDigitCount(
    displayValue,
    digitsBeforeCaret,
  );

  return {
    displayValue,
    canonicalValue,
    cursorOffset,
  };
}

export type PriceMode = 'fixed' | 'quotation';

export interface PriceValidationResult {
  isValid: boolean;
  errorMessage: string | null;
}

export function validateServicePriceInput(params: {
  isServicePost: boolean;
  priceMode: PriceMode;
  canonicalPrice: number | undefined;
  displayValue: string;
  language: 'en' | 'id';
}): PriceValidationResult {
  const { isServicePost, priceMode, canonicalPrice, displayValue, language } =
    params;

  if (!isServicePost || priceMode === 'quotation') {
    return { isValid: true, errorMessage: null };
  }

  const trimmed = displayValue.trim();
  if (!trimmed) {
    return {
      isValid: false,
      errorMessage:
        language === 'en'
          ? 'Enter a starting price or select "Contact for quotation".'
          : 'Masukkan harga mulai atau pilih "Hubungi untuk penawaran".',
    };
  }

  if (canonicalPrice === undefined || Number.isNaN(canonicalPrice)) {
    return {
      isValid: false,
      errorMessage:
        language === 'en'
          ? 'Enter a valid numeric price in Rupiah.'
          : 'Masukkan angka harga Rupiah yang valid.',
    };
  }

  if (canonicalPrice <= 0) {
    return {
      isValid: false,
      errorMessage:
        language === 'en'
          ? 'Starting price must be greater than Rp 0.'
          : 'Harga mulai harus lebih dari Rp 0.',
    };
  }

  if (canonicalPrice > MAX_PRICE_VALUE) {
    return {
      isValid: false,
      errorMessage:
        language === 'en'
          ? 'Maximum price is Rp 1.000.000.000.000.'
          : 'Harga maksimal adalah Rp 1.000.000.000.000.',
    };
  }

  return { isValid: true, errorMessage: null };
}
