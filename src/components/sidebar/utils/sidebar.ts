import type { User } from '@supabase/supabase-js';

import type { Language } from '../../../i18n/locale';

export type SidebarRoute =
  | '/'
  | '/account'
  | '/bookings'
  | '/notifications'
  | '/technician-dashboard'
  | '/admin'
  | '/login'
  | '/register'
  | `/technician/${string}`
  | { pathname: '/account'; params: { tab: string } };

export type SidebarNavigate = (target: SidebarRoute) => void;

export interface SidebarIdentityInput {
  user: User | null;
  language: Language;
  isAuthenticated: boolean;
  profileDisplayName?: string;
  profileUsername?: string;
}

export interface SidebarIdentity {
  displayName: string;
  username: string;
  handle: string;
  email: string;
  accountIdentifier: string;
}

function readMetadataString(user: User | null, key: string): string {
  const value = user?.user_metadata?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

export function resolveDisplayName({
  user,
  language,
  isAuthenticated,
  profileDisplayName,
}: SidebarIdentityInput): string {
  if (!isAuthenticated || !user) {
    return language === 'en' ? 'Guest Visitor' : 'Pengunjung Tamu';
  }

  const metadataName = readMetadataString(user, 'display_name');
  const emailPrefix = user.email?.split('@')[0];

  return profileDisplayName?.trim() || metadataName || emailPrefix || 'Cepat User';
}

export function resolveUsername({
  user,
  isAuthenticated,
  profileUsername,
}: SidebarIdentityInput): string {
  if (!isAuthenticated || !user) {
    return '';
  }

  const metadataUsername = readMetadataString(user, 'username');
  const emailPrefix = (user.email ?? '')
    .split('@')[0]
    ?.toLowerCase()
    .replace(/[^a-z0-9_]/g, '');

  return (profileUsername || metadataUsername || emailPrefix || 'user').replace(/^@/, '');
}

export function formatHandle(username: string): string {
  return username ? `@${username}` : '';
}

export function resolveEmail({
  user,
  isAuthenticated,
}: SidebarIdentityInput): string {
  if (!isAuthenticated || !user) {
    return '';
  }
  return user.email?.trim() || '';
}

export function resolveAccountIdentifier({
  isAuthenticated,
  handle,
  language,
}: {
  isAuthenticated: boolean;
  handle: string;
  language: Language;
}): string {
  if (!isAuthenticated) {
    return language === 'en' ? 'Not signed in' : 'Belum masuk';
  }
  return handle;
}

export function resolveRoleLabel({
  isAuthenticated,
  isVerifiedAdmin,
  isTechnician,
  language,
}: {
  isAuthenticated: boolean;
  isVerifiedAdmin: boolean;
  isTechnician: boolean;
  language: Language;
}): string | null {
  if (!isAuthenticated) {
    return null;
  }
  if (isVerifiedAdmin) {
    return 'Administrator';
  }
  if (isTechnician) {
    return language === 'en' ? 'Professional Technician' : 'Mitra Teknisi';
  }
  return language === 'en' ? 'Customer' : 'Pelanggan';
}

export function buildSidebarIdentity(input: SidebarIdentityInput): SidebarIdentity {
  const username = resolveUsername(input);
  const handle = formatHandle(username);

  return {
    displayName: resolveDisplayName(input),
    username,
    handle,
    email: resolveEmail(input),
    accountIdentifier: resolveAccountIdentifier({
      isAuthenticated: input.isAuthenticated,
      handle,
      language: input.language,
    }),
  };
}
