import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';

export const APP_URL_SCHEME = 'cepat';

/**
 * Generates a mobile-safe redirect URL for password recovery.
 * Never returns http://localhost:3000 on mobile devices.
 */
export function getPasswordResetRedirectUrl(): string {
  if (Platform.OS !== 'web') {
    return `${APP_URL_SCHEME}://reset-password`;
  }
  try {
    const created = Linking.createURL('reset-password', { scheme: APP_URL_SCHEME });
    if (created.includes('localhost:3000')) {
      return `${APP_URL_SCHEME}://reset-password`;
    }
    return created;
  } catch {
    return `${APP_URL_SCHEME}://reset-password`;
  }
}

/**
 * Generates a mobile-safe redirect URL for email verification after sign-up.
 */
export function getEmailVerificationRedirectUrl(): string {
  if (Platform.OS !== 'web') {
    return `${APP_URL_SCHEME}://login`;
  }
  try {
    const created = Linking.createURL('login', { scheme: APP_URL_SCHEME });
    if (created.includes('localhost:3000')) {
      return `${APP_URL_SCHEME}://login`;
    }
    return created;
  } catch {
    return `${APP_URL_SCHEME}://login`;
  }
}

export interface ParsedAuthDeepLink {
  path: string;
  code?: string;
  tokenHash?: string;
  type?: string;
  accessToken?: string;
  refreshToken?: string;
  errorDescription?: string;
}

/**
 * Parses both query parameters (?code=...) and URL hash fragments (#access_token=...)
 * from a Supabase Auth deep link without exposing raw tokens to the UI.
 */
export function parseAuthDeepLink(url: string): ParsedAuthDeepLink | null {
  if (!url || typeof url !== 'string') return null;

  try {
    const [withoutHash, hashPart = ''] = url.split('#');
    const [basePath, queryPart = ''] = withoutHash.split('?');

    const params = new URLSearchParams(queryPart);
    const hashParams = new URLSearchParams(hashPart);

    const getParam = (key: string): string | undefined => {
      const val = params.get(key) ?? hashParams.get(key);
      return val && val.trim() ? val.trim() : undefined;
    };

    const normalizedPath = basePath
      .replace(/^[a-zA-Z0-9+.-]+:\/\/(localhost(:\d+)?\/?)?/, '')
      .replace(/^\/+/, '');

    return {
      path: normalizedPath,
      code: getParam('code'),
      tokenHash: getParam('token_hash') ?? getParam('token'),
      type: getParam('type'),
      accessToken: getParam('access_token'),
      refreshToken: getParam('refresh_token'),
      errorDescription: getParam('error_description'),
    };
  } catch {
    return null;
  }
}

/**
 * Consumes a Supabase recovery/verification deep link and establishes the session.
 */
export async function handleIncomingAuthDeepLink(
  client: SupabaseClient | null,
  url: string,
): Promise<{ handled: boolean; isRecovery: boolean; error?: string }> {
  const parsed = parseAuthDeepLink(url);
  if (!parsed) return { handled: false, isRecovery: false };

  if (parsed.errorDescription) {
    return {
      handled: true,
      isRecovery: parsed.type === 'recovery' || parsed.path.includes('reset-password'),
      error: parsed.errorDescription,
    };
  }

  const isRecovery =
    parsed.type === 'recovery' || parsed.path.includes('reset-password');

  if (!client) {
    return { handled: Boolean(parsed.code || parsed.accessToken || parsed.tokenHash), isRecovery };
  }

  try {
    if (parsed.accessToken && parsed.refreshToken) {
      const { error } = await client.auth.setSession({
        access_token: parsed.accessToken,
        refresh_token: parsed.refreshToken,
      });
      return { handled: true, isRecovery, error: error?.message };
    }

    if (parsed.code && typeof client.auth.exchangeCodeForSession === 'function') {
      const { error } = await client.auth.exchangeCodeForSession(parsed.code);
      return { handled: true, isRecovery, error: error?.message };
    }

    if (parsed.tokenHash && typeof client.auth.verifyOtp === 'function') {
      const otpType =
        parsed.type === 'signup' || parsed.type === 'email' ? 'email' : 'recovery';
      const { error } = await client.auth.verifyOtp({
        token_hash: parsed.tokenHash,
        type: otpType,
      });
      return { handled: true, isRecovery, error: error?.message };
    }
  } catch (err) {
    return {
      handled: true,
      isRecovery,
      error: err instanceof Error ? err.message : 'invalid_deep_link',
    };
  }

  return { handled: false, isRecovery };
}
