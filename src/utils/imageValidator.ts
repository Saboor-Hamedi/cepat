export type AllowedImageMime =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/heic'
  | 'image/heif';

export type ImageValidationErrorCode =
  | 'MISSING_FILE'
  | 'UNSAFE_URI'
  | 'DISALLOWED_EXTENSION'
  | 'DOUBLE_EXTENSION_DETECTED'
  | 'INVALID_MIME_TYPE'
  | 'MIME_EXTENSION_MISMATCH'
  | 'SPOOFED_MAGIC_BYTES'
  | 'FILE_TOO_LARGE'
  | 'FILE_EMPTY'
  | 'INVALID_DIMENSIONS';

export interface ImageCandidateInput {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
  base64?: string | null;
  headerBytes?: Uint8Array | null;
}

export interface ImageValidationResult {
  valid: boolean;
  errorCode?: ImageValidationErrorCode;
  errorMessageId?: string;
  errorMessageEn?: string;
  detectedFormat?: 'jpeg' | 'png' | 'webp' | 'heic';
  sanitizedUri?: string;
}

export const MAX_IMAGE_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MIN_IMAGE_DIMENSION = 64;
export const MAX_IMAGE_DIMENSION = 8192;

const ALLOWED_MIMES = new Set<string>([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const ALLOWED_EXTENSIONS = new Set<string>([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'heic',
  'heif',
]);

const FORBIDDEN_DANGEROUS_EXTENSIONS = new Set<string>([
  'svg',
  'svgz',
  'html',
  'htm',
  'xhtml',
  'js',
  'jsx',
  'ts',
  'tsx',
  'mjs',
  'cjs',
  'php',
  'phtml',
  'exe',
  'dll',
  'bat',
  'cmd',
  'ps1',
  'sh',
  'py',
  'rb',
  'pl',
  'jar',
  'apk',
  'ipa',
  'msi',
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'zip',
  'rar',
  '7z',
  'tar',
  'gz',
  'mp4',
  'mov',
  'avi',
  'mkv',
  'webm',
  'mp3',
  'wav',
  'ogg',
  'json',
  'xml',
  'txt',
  'csv',
]);

const EXTENSION_TO_FORMAT: Record<string, 'jpeg' | 'png' | 'webp' | 'heic'> = {
  jpg: 'jpeg',
  jpeg: 'jpeg',
  png: 'png',
  webp: 'webp',
  heic: 'heic',
  heif: 'heic',
};

const MIME_TO_FORMAT: Record<string, 'jpeg' | 'png' | 'webp' | 'heic'> = {
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heic',
};

function decodeBase64HeaderBytes(base64Input: string, maxBytes = 24): Uint8Array | null {
  const cleaned = base64Input
    .replace(/^data:[^;]+;base64,/i, '')
    .replace(/\s+/g, '')
    .slice(0, 64);
  if (!cleaned) return null;

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const out: number[] = [];
  let buffer = 0;
  let bitsCollected = 0;

  for (let i = 0; i < cleaned.length && out.length < maxBytes; i++) {
    const ch = cleaned[i];
    if (ch === '=') break;
    const val = alphabet.indexOf(ch);
    if (val === -1) return null;
    buffer = (buffer << 6) | val;
    bitsCollected += 6;
    if (bitsCollected >= 8) {
      bitsCollected -= 8;
      out.push((buffer >> bitsCollected) & 0xff);
    }
  }
  return out.length > 0 ? new Uint8Array(out) : null;
}

export function inspectImageMagicBytes(
  bytes: Uint8Array,
): 'jpeg' | 'png' | 'webp' | 'heic' | null {
  if (bytes.length < 4) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'png';
  }

  // WEBP: "RIFF" (52 49 46 46) at 0..3 and "WEBP" (57 45 42 50) at 8..11
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'webp';
  }

  // HEIC / HEIF ISO Base Media File: "ftyp" (66 74 79 70) at 4..7
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase();
    if (
      brand === 'heic' ||
      brand === 'heix' ||
      brand === 'hevc' ||
      brand === 'mif1' ||
      brand === 'msf1'
    ) {
      return 'heic';
    }
  }

  return null;
}

export function validateStrictImageAsset(input: ImageCandidateInput): ImageValidationResult {
  const rawUri = (input.uri ?? '').trim();
  if (!rawUri) {
    return {
      valid: false,
      errorCode: 'MISSING_FILE',
      errorMessageId: 'Pilih atau ambil foto terlebih dahulu.',
      errorMessageEn: 'Please select or capture a photo first.',
    };
  }

  // Block dangerous schemes, null bytes, or path traversal
  if (
    rawUri.includes('\0') ||
    rawUri.includes('%00') ||
    rawUri.includes('..') ||
    /^(javascript|vbscript|data:text|data:application|data:image\/svg)/i.test(rawUri)
  ) {
    return {
      valid: false,
      errorCode: 'UNSAFE_URI',
      errorMessageId: 'Format file tidak aman. Hanya file gambar asli (JPG, PNG, WEBP) yang diizinkan.',
      errorMessageEn: 'Unsafe file URI. Only genuine raster images (JPG, PNG, WEBP) are allowed.',
    };
  }

  const isAllowedScheme =
    rawUri.startsWith('file://') ||
    rawUri.startsWith('content://') ||
    rawUri.startsWith('ph://') ||
    rawUri.startsWith('assets-library://') ||
    rawUri.startsWith('https://') ||
    rawUri.startsWith('data:image/jpeg;base64,') ||
    rawUri.startsWith('data:image/png;base64,') ||
    rawUri.startsWith('data:image/webp;base64,');

  if (!isAllowedScheme) {
    return {
      valid: false,
      errorCode: 'UNSAFE_URI',
      errorMessageId: 'Sumber file ditolak. Gunakan foto asli dari galeri atau kamera.',
      errorMessageEn: 'File source rejected. Please use a genuine photo from gallery or camera.',
    };
  }

  // Extract filename segments and inspect for double extensions or forbidden extensions
  const cleanPath = (input.fileName || rawUri.split('?')[0].split('#')[0]).trim();
  const baseName = cleanPath.split('/').pop()?.split('\\').pop() ?? '';

  if (baseName && !rawUri.startsWith('data:image/') && !rawUri.startsWith('content://')) {
    const parts = baseName.split('.').map((p) => p.toLowerCase());
    if (parts.length > 1) {
      const ext = parts[parts.length - 1];
      // Check every intermediate extension for disguised executables/scripts (e.g., exploit.php.jpg)
      for (let i = 1; i < parts.length - 1; i++) {
        if (FORBIDDEN_DANGEROUS_EXTENSIONS.has(parts[i])) {
          return {
            valid: false,
            errorCode: 'DOUBLE_EXTENSION_DETECTED',
            errorMessageId:
              'Terdeteksi ekstensi ganda berbahaya. Hanya file foto murni yang diizinkan.',
            errorMessageEn:
              'Disguised double file extension detected. Only genuine image files are allowed.',
          };
        }
      }
      if (FORBIDDEN_DANGEROUS_EXTENSIONS.has(ext) || !ALLOWED_EXTENSIONS.has(ext)) {
        return {
          valid: false,
          errorCode: 'DISALLOWED_EXTENSION',
          errorMessageId:
            'Ekstensi file ditolak. Hanya gambar JPG, JPEG, PNG, WEBP, atau HEIC yang diizinkan.',
          errorMessageEn:
            'File extension rejected. Only JPG, JPEG, PNG, WEBP, or HEIC images are allowed.',
        };
      }
    } else if (input.fileName) {
      return {
        valid: false,
        errorCode: 'DISALLOWED_EXTENSION',
        errorMessageId: 'File harus memiliki ekstensi gambar yang valid (.jpg, .png, .webp).',
        errorMessageEn: 'File must have a valid image extension (.jpg, .png, .webp).',
      };
    }
  }

  // Validate MIME type strictly
  if (input.mimeType !== undefined && input.mimeType !== null) {
    const normalizedMime = input.mimeType.trim().toLowerCase();
    if (!ALLOWED_MIMES.has(normalizedMime)) {
      return {
        valid: false,
        errorCode: 'INVALID_MIME_TYPE',
        errorMessageId: `Tipe file "${input.mimeType}" ditolak. Hanya file gambar yang diizinkan.`,
        errorMessageEn: `File type "${input.mimeType}" rejected. Only image files are allowed.`,
      };
    }
  }

  // Check if extension and MIME type contradict each other
  const extCandidate = baseName.includes('.')
    ? baseName.split('.').pop()?.toLowerCase() ?? ''
    : '';
  const extFormat = EXTENSION_TO_FORMAT[extCandidate];
  const mimeFormat = input.mimeType
    ? MIME_TO_FORMAT[input.mimeType.trim().toLowerCase()]
    : undefined;

  if (extFormat && mimeFormat && extFormat !== mimeFormat) {
    return {
      valid: false,
      errorCode: 'MIME_EXTENSION_MISMATCH',
      errorMessageId:
        'Tipe MIME tidak cocok dengan ekstensi file. Jangan mengubah ekstensi file secara manual.',
      errorMessageEn:
        'MIME type does not match the file extension. Spoofed file extensions are not allowed.',
    };
  }

  // Validate file size
  if (typeof input.fileSize === 'number') {
    if (input.fileSize <= 0) {
      return {
        valid: false,
        errorCode: 'FILE_EMPTY',
        errorMessageId: 'File gambar kosong atau rusak.',
        errorMessageEn: 'Image file is empty or corrupted.',
      };
    }
    if (input.fileSize > MAX_IMAGE_FILE_BYTES) {
      return {
        valid: false,
        errorCode: 'FILE_TOO_LARGE',
        errorMessageId: 'Ukuran foto maksimal 5 MB.',
        errorMessageEn: 'Maximum photo size is 5 MB.',
      };
    }
  }

  // Validate dimensions when provided
  if (typeof input.width === 'number' && typeof input.height === 'number') {
    if (
      input.width < MIN_IMAGE_DIMENSION ||
      input.height < MIN_IMAGE_DIMENSION ||
      input.width > MAX_IMAGE_DIMENSION ||
      input.height > MAX_IMAGE_DIMENSION
    ) {
      return {
        valid: false,
        errorCode: 'INVALID_DIMENSIONS',
        errorMessageId: 'Resolusi gambar tidak valid (minimal 64×64 piksel, maksimal 8192×8192).',
        errorMessageEn: 'Invalid image dimensions (minimum 64×64 px, maximum 8192×8192 px).',
      };
    }
  }

  // Inspect actual binary magic bytes (from headerBytes, base64, or data URI)
  const magicSource =
    input.headerBytes ??
    (input.base64 ? decodeBase64HeaderBytes(input.base64) : null) ??
    (rawUri.startsWith('data:image/') ? decodeBase64HeaderBytes(rawUri) : null);

  if (magicSource) {
    const magicFormat = inspectImageMagicBytes(magicSource);
    if (!magicFormat) {
      return {
        valid: false,
        errorCode: 'SPOOFED_MAGIC_BYTES',
        errorMessageId:
          'Isi biner file bukan gambar asli! File yang disamarkan sebagai gambar ditolak.',
        errorMessageEn:
          'Binary file signature is not a genuine image! Spoofed files disguised as images are rejected.',
      };
    }
    if (mimeFormat && magicFormat !== mimeFormat) {
      return {
        valid: false,
        errorCode: 'SPOOFED_MAGIC_BYTES',
        errorMessageId: 'Tanda tangan biner gambar tidak cocok dengan tipe MIME yang diklaim.',
        errorMessageEn: 'Binary image signature does not match the claimed MIME type.',
      };
    }
    return {
      valid: true,
      detectedFormat: magicFormat,
      sanitizedUri: rawUri,
    };
  }

  return {
    valid: true,
    detectedFormat: mimeFormat ?? extFormat ?? 'jpeg',
    sanitizedUri: rawUri,
  };
}
