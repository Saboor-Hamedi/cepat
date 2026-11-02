import {
  fixtureBookings,
  fixtureMessages,
  fixtureSavedAddresses,
  fixtureTechnicians,
} from './fixtures';
import { shouldUseFixtures, supabase } from './marketplaceRepository';
import { recordLocalBookingNotification, recordLocalMessageNotification } from './notifications';
import { getStoredItem, getStoredJson, setStoredItem, setStoredJson } from '../storage/kvStorage';
import { normalizeProfileTheme } from '../theme/tokens';
import type {
  BookingMessage,
  BookingRecord,
  BookingStatus,
  PortfolioItem,
  SavedAddress,
  Technician,
  TechnicianAvailabilitySlot,
  TechnicianReport,
  TechnicianReview,
  TechnicianService,
  UserPreferences,
} from '../types/marketplace';

let realtimeChannelSequence = 0;

function nextRealtimeChannelSuffix(): string {
  realtimeChannelSequence += 1;
  return `${Date.now()}-${realtimeChannelSequence}`;
}

const AREA_STORAGE_KEY = '@cepat/selected-area';
const SAVED_ADDRESSES_KEY = '@cepat/saved-addresses:';
const SAVED_TECHNICIANS_KEY = '@cepat/saved-technicians:';
const USER_PREFS_KEY = '@cepat/user-preferences:';
const ACCOUNT_PROFILE_KEY = '@cepat/account-profile:';
const TECH_WORKSPACE_KEY = '@cepat/technician-workspace:';
const BOOKINGS_STORAGE_KEY = '@cepat/bookings';
const MESSAGES_STORAGE_KEY = '@cepat/booking-messages';
const REVIEWS_STORAGE_KEY = '@cepat/submitted-reviews';
const REPORTS_STORAGE_KEY = '@cepat/submitted-reports';
const DELETION_REQUEST_KEY = '@cepat/deletion-request:';

function mapSupabaseBooking(
  row: Record<string, unknown>,
  namesById: Map<string, string>,
  areasById: Map<string, string>,
): BookingRecord {
  const customerId = String(row.customer_user_id ?? '');
  const technicianId = String(row.technician_user_id ?? '');
  return {
    id: String(row.id ?? ''),
    customerUserId: customerId,
    customerName: namesById.get(customerId) ?? 'Pelanggan Cepat',
    technicianUserId: technicianId,
    technicianName: namesById.get(technicianId) ?? 'Teknisi Cepat',
    technicianServiceId: row.technician_service_id
      ? String(row.technician_service_id)
      : undefined,
    serviceId: row.service_id ? String(row.service_id) : undefined,
    serviceNameSnapshot: String(row.service_name_snapshot ?? 'Layanan Rumah'),
    serviceDescription: row.service_description ? String(row.service_description) : undefined,
    customerAddress: String(row.customer_address ?? ''),
    addressNotes: row.address_notes ? String(row.address_notes) : undefined,
    serviceArea:
      (typeof row.service_area_name_snapshot === 'string' &&
        row.service_area_name_snapshot.trim()) ||
      areasById.get(String(row.service_area_id ?? '')) ||
      'Area layanan',
    customerLatitude:
      typeof row.customer_latitude === 'number' ? row.customer_latitude : undefined,
    customerLongitude:
      typeof row.customer_longitude === 'number' ? row.customer_longitude : undefined,
    requestedStartAt: String(row.requested_start_at ?? row.created_at ?? ''),
    agreedStartAt: row.agreed_start_at ? String(row.agreed_start_at) : undefined,
    proposedStartAt: row.proposed_start_at ? String(row.proposed_start_at) : undefined,
    workCompletedAt: row.work_completed_at
      ? String(row.work_completed_at)
      : undefined,
    status: (row.status as BookingStatus) ?? 'requested',
    customerNotes: row.customer_notes ? String(row.customer_notes) : undefined,
    agreedPrice:
      typeof row.agreed_price === 'number'
        ? row.agreed_price
        : Number(row.agreed_price) || undefined,
    currency: 'IDR',
    cancellationReason: row.cancellation_reason
      ? String(row.cancellation_reason)
      : undefined,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
    source: 'supabase',
  };
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  appearance: 'light',
  notifications: {
    push: true,
    booking: true,
    messages: true,
  },
  accessibility: {
    largeText: false,
    reduceMotion: false,
  },
  bookingPreferences: {
    preferredTimeWindow: 'morning',
    defaultNotes: '',
  },
};

export interface AccountProfileDetails {
  displayName: string;
  username?: string;
  email: string;
  phoneNumber: string;
  avatarUri: string;
  addressNotes: string;
}

const ALLOWED_TRANSITIONS: Record<
  BookingStatus,
  Partial<Record<BookingStatus, ('customer' | 'technician')[]>>
> = {
  requested: {
    confirmed: ['technician'],
    declined: ['technician'],
    alternative_proposed: ['technician'],
    cancelled: ['customer', 'technician'],
  },
  alternative_proposed: {
    confirmed: ['customer'],
    declined: ['customer', 'technician'],
    cancelled: ['customer', 'technician'],
  },
  confirmed: {
    in_progress: ['technician'],
    cancelled: ['customer', 'technician'],
  },
  in_progress: {
    completed: ['customer'],
    cancelled: ['customer', 'technician'],
  },
  completed: {},
  cancelled: {},
  declined: {},
};

export function isAllowedBookingTransition(
  currentStatus: BookingStatus | 'accepted',
  nextStatus: BookingStatus | 'accepted',
  actor?: 'customer' | 'technician',
): boolean {
  const normCurrent: BookingStatus = currentStatus === 'accepted' ? 'confirmed' : currentStatus;
  const normNext: BookingStatus = nextStatus === 'accepted' ? 'confirmed' : nextStatus;
  const allowedActors = ALLOWED_TRANSITIONS[normCurrent]?.[normNext];
  if (!allowedActors || allowedActors.length === 0) return false;
  return actor ? allowedActors.includes(actor) : true;
}

export function isChatEnabledForStatus(status: BookingStatus): boolean {
  return status !== 'cancelled' && status !== 'declined';
}

export function containsBlockedContactOrUrl(messageBody: string): boolean {
  const normalized = messageBody.trim().toLowerCase();
  if (!normalized) return false;

  // 1. External URLs, schemes, and domains
  const urlPatterns = [
    /https?:\/\//i,
    /\bwww\.[a-z0-9-]+(\.[a-z0-9-]+)+/i,
    /\b(wa\.me|t\.me|bit\.ly|tinyurl\.com|linktr\.ee)\b/i,
    /\b[a-z0-9-]+\.(com|id|co\.id|net|org|io|app|me|link|site|xyz)(\/\S*)?\b/i,
  ];
  if (urlPatterns.some((pattern) => pattern.test(normalized))) return true;

  // 2. Email addresses
  const emailPattern = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
  if (emailPattern.test(normalized)) return true;

  // 3. WhatsApp and phone numbers
  const cleanedDigits = normalized.replace(/[^0-9]/g, '');
  if (/^(08|628)\d{7,12}$/.test(cleanedDigits)) return true;
  if (/(\+?62|08)[\s.-]?\d{3,4}[\s.-]?\d{3,4}[\s.-]?\d{3,5}/.test(normalized)) return true;
  if (/\b(wa|whatsapp|telepon|hp|nomor)\b.*?\d{6,}/i.test(normalized)) return true;

  return false;
}

export function containsBlockedUrl(messageBody: string): boolean {
  return containsBlockedContactOrUrl(messageBody);
}

export function maskBlockedContactOrUrl(messageBody: string): string {
  if (!messageBody) return '';
  let masked = messageBody;

  // 1. External URLs, schemes, and domains
  masked = masked.replace(/https?:\/\/\S+/gi, '***');
  masked = masked.replace(/\bwww\.[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?/gi, '***');
  masked = masked.replace(/\b(wa\.me|t\.me|bit\.ly|tinyurl\.com|linktr\.ee)\/\S*/gi, '***');
  masked = masked.replace(/\b[a-z0-9-]+\.(com|id|co\.id|net|org|io|app|me|link|site|xyz)(\/\S*)?/gi, '***');

  // 2. Email addresses
  masked = masked.replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '***');

  // 3. WhatsApp and phone numbers (7 or more digits)
  masked = masked.replace(/(\+?62|08)[\s.-]?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,5}/gi, '***');
  masked = masked.replace(/\b\d{9,15}\b/g, '***');

  return masked;
}

function scopeKey(prefix: string, userId?: string | null): string {
  return `${prefix}${userId || 'guest'}`;
}

export async function loadSelectedArea(): Promise<string> {
  const stored = await getStoredItem(AREA_STORAGE_KEY);
  return stored && stored.trim().length > 0 ? stored : 'Semua area';
}

export async function saveSelectedArea(area: string): Promise<boolean> {
  return setStoredItem(AREA_STORAGE_KEY, area);
}

export async function loadSavedAddresses(userId?: string | null): Promise<SavedAddress[]> {
  if (!shouldUseFixtures()) {
    const items = await getStoredJson<SavedAddress[]>(scopeKey(SAVED_ADDRESSES_KEY, userId), []);
    return items.filter((addr) => addr.id !== 'addr-1' && addr.id !== 'addr-2');
  }
  return getStoredJson<SavedAddress[]>(scopeKey(SAVED_ADDRESSES_KEY, userId), fixtureSavedAddresses);
}

export async function saveCustomerAddress(
  userId: string | null | undefined,
  input: Omit<SavedAddress, 'id'> & { id?: string },
): Promise<SavedAddress[]> {
  const current = await loadSavedAddresses(userId);
  const label = input.label.trim();
  const streetAddress = input.streetAddress.trim();
  const area = input.area.trim();
  if (!label || !streetAddress || !area) {
    throw new Error('invalid_address');
  }

  const nextId = input.id || `addr-${Date.now()}`;
  const isDefault = input.isDefault ?? current.length === 0;
  const nextItem: SavedAddress = {
    id: nextId,
    label: label.slice(0, 60),
    streetAddress: streetAddress.slice(0, 240),
    area,
    district: input.district?.trim(),
    province: input.province?.trim(),
    notes: input.notes?.trim().slice(0, 200),
    latitude: input.latitude,
    longitude: input.longitude,
    isDefault,
  };

  const exists = current.some((addr) => addr.id === nextId);
  const updated = (exists
    ? current.map((addr) => (addr.id === nextId ? nextItem : addr))
    : [...current, nextItem]
  ).map((addr) => (isDefault && addr.id !== nextId ? { ...addr, isDefault: false } : addr));

  await setStoredJson(scopeKey(SAVED_ADDRESSES_KEY, userId), updated);
  return updated;
}

export async function deleteCustomerAddress(
  userId: string | null | undefined,
  addressId: string,
): Promise<SavedAddress[]> {
  const current = await loadSavedAddresses(userId);
  const filtered = current.filter((addr) => addr.id !== addressId);
  if (filtered.length > 0 && !filtered.some((addr) => addr.isDefault)) {
    filtered[0] = { ...filtered[0], isDefault: true };
  }
  await setStoredJson(scopeKey(SAVED_ADDRESSES_KEY, userId), filtered);
  return filtered;
}

export async function setDefaultCustomerAddress(
  userId: string | null | undefined,
  addressId: string,
): Promise<SavedAddress[]> {
  const current = await loadSavedAddresses(userId);
  const updated = current.map((addr) => ({
    ...addr,
    isDefault: addr.id === addressId,
  }));
  await setStoredJson(scopeKey(SAVED_ADDRESSES_KEY, userId), updated);
  return updated;
}

export async function loadSavedTechnicianIds(userId?: string | null): Promise<string[]> {
  if (!shouldUseFixtures()) {
    const ids = await getStoredJson<string[]>(scopeKey(SAVED_TECHNICIANS_KEY, userId), []);
    return ids.filter((id) => !id.startsWith('demo-'));
  }
  return getStoredJson<string[]>(scopeKey(SAVED_TECHNICIANS_KEY, userId), ['demo-rizky']);
}

export async function toggleSavedTechnicianId(
  userId: string | null | undefined,
  technicianId: string,
): Promise<string[]> {
  const current = await loadSavedTechnicianIds(userId);
  const updated = current.includes(technicianId)
    ? current.filter((id) => id !== technicianId)
    : [...current, technicianId];
  await setStoredJson(scopeKey(SAVED_TECHNICIANS_KEY, userId), updated);
  return updated;
}

export async function loadUserPreferences(userId?: string | null): Promise<UserPreferences> {
  const local = await getStoredJson<UserPreferences>(
    scopeKey(USER_PREFS_KEY, userId),
    DEFAULT_PREFERENCES,
  );
  if (supabase && userId) {
    try {
      const { data } = await supabase
        .from('private_profiles')
        .select('notification_preferences')
        .eq('user_id', userId)
        .maybeSingle();
      const remoteNotif = data?.notification_preferences as Partial<UserPreferences['notifications']> | null;
      if (remoteNotif && typeof remoteNotif === 'object') {
        return {
          ...local,
          notifications: {
            push: remoteNotif.push ?? local.notifications.push,
            booking: remoteNotif.booking ?? local.notifications.booking,
            messages: remoteNotif.messages ?? local.notifications.messages,
          },
        };
      }
    } catch {
      // Return local preferences when offline or unavailable.
    }
  }
  return local;
}

export async function saveUserPreferences(
  userId: string | null | undefined,
  preferences: UserPreferences,
): Promise<UserPreferences> {
  await setStoredJson(scopeKey(USER_PREFS_KEY, userId), preferences);
  if (supabase && userId) {
    try {
      await supabase
        .from('private_profiles')
        .upsert({
          user_id: userId,
          notification_preferences: preferences.notifications,
        });
    } catch {
      // Local preferences remain saved.
    }
  }
  return preferences;
}

export async function loadAccountProfileDetails(
  userId?: string | null,
  fallbackEmail = '',
  fallbackName = '',
  fallbackUsername = '',
): Promise<AccountProfileDetails> {
  const defaultProfile: AccountProfileDetails = shouldUseFixtures()
    ? {
        displayName: fallbackName || (userId ? 'Pengguna Cepat' : 'Andi Wijaya'),
        username: fallbackUsername || '',
        email: fallbackEmail || (userId ? '' : 'andi.wijaya@cepat.id'),
        phoneNumber: '+62 812-8890-1120',
        avatarUri: '',
        addressNotes: 'Kebayoran Baru, Jakarta Selatan',
      }
    : {
        displayName: fallbackName || '',
        username: fallbackUsername || '',
        email: fallbackEmail || '',
        phoneNumber: '',
        avatarUri: '',
        addressNotes: '',
      };
  const stored = await getStoredJson<AccountProfileDetails>(
    scopeKey(ACCOUNT_PROFILE_KEY, userId),
    defaultProfile,
  );
  if (supabase && userId) {
    try {
      const [{ data: pub }, { data: priv }] = await Promise.all([
        supabase.from('profiles').select('display_name, username, avatar_path').eq('id', userId).maybeSingle(),
        supabase.from('private_profiles').select('phone_number, address_notes').eq('user_id', userId).maybeSingle(),
      ]);
      const cleanPhone =
        priv?.phone_number ??
        (stored.phoneNumber === '+62 812-8890-1120' ? '' : stored.phoneNumber);
      const cleanAddress =
        priv?.address_notes ??
        (stored.addressNotes === 'Kebayoran Baru, Jakarta Selatan' ? '' : stored.addressNotes);
      return {
        displayName:
          pub?.display_name ||
          (stored.displayName === 'Andi Wijaya' ? fallbackName : stored.displayName) ||
          fallbackName,
        username: pub?.username || stored.username || fallbackUsername || '',
        email: fallbackEmail || (stored.email === 'andi.wijaya@cepat.id' ? '' : stored.email),
        phoneNumber: cleanPhone,
        avatarUri: pub?.avatar_path || stored.avatarUri,
        addressNotes: cleanAddress,
      };
    } catch {
      return stored;
    }
  }
  return stored;
}

export async function saveAccountProfileDetails(
  userId: string | null | undefined,
  details: AccountProfileDetails,
): Promise<AccountProfileDetails> {
  const trimmedName = details.displayName.trim();
  if (!trimmedName || trimmedName.length > 80) {
    throw new Error('invalid_display_name');
  }
  const cleanUsername = (details.username || '').trim().replace(/^@/, '').toLowerCase().slice(0, 30);
  const normalized: AccountProfileDetails = {
    displayName: trimmedName,
    username: cleanUsername,
    email: details.email.trim(),
    phoneNumber: details.phoneNumber.trim().slice(0, 32),
    avatarUri:
      details.avatarUri.trim() ||
      (
        await getStoredJson<AccountProfileDetails>(
          scopeKey(ACCOUNT_PROFILE_KEY, userId),
          {
            displayName: trimmedName,
            username: cleanUsername,
            email: details.email.trim(),
            phoneNumber: '',
            avatarUri: '',
            addressNotes: '',
          },
        )
      ).avatarUri,
    addressNotes: details.addressNotes.trim().slice(0, 240),
  };
  await setStoredJson(scopeKey(ACCOUNT_PROFILE_KEY, userId), normalized);

  if (supabase && userId) {
    try {
      await Promise.all([
        supabase.from('profiles').upsert({
          id: userId,
          display_name: normalized.displayName,
          ...(normalized.avatarUri ? { avatar_path: normalized.avatarUri } : {}),
        }),
        supabase.from('private_profiles').upsert({
          user_id: userId,
          phone_number: normalized.phoneNumber || null,
          address_notes: normalized.addressNotes || null,
        }),
      ]);
    } catch {
      // Local changes saved successfully; remote will catch up
    }
  }
  return normalized;
}

export async function loadTechnicianWorkspaceProfile(userId?: string | null): Promise<Technician> {
  const stored = await getStoredJson<Technician | null>(
    scopeKey(TECH_WORKSPACE_KEY, userId),
    null,
  );
  if (stored) {
    return {
      ...stored,
      theme: normalizeProfileTheme({ preset: stored.theme }),
    };
  }

  if (supabase && userId && !userId.startsWith('demo-')) {
    try {
      const [{ data: techData }, { data: profileData }] = await Promise.all([
        supabase
          .from('technician_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
      ]);

      if (techData || profileData) {
        return {
          id: userId,
          displayName:
            profileData?.display_name ||
            techData?.business_name ||
            'Teknisi Cepat',
          businessName: techData?.business_name || undefined,
          headline: techData?.headline || undefined,
          bio: techData?.bio || undefined,
          avatarUri:
            profileData?.avatar_path ||
            profileData?.avatar_url ||
            profileData?.avatar ||
            undefined,
          yearsExperience: techData?.years_experience ?? 0,
          verified: Boolean(techData?.is_verified),
          available: techData?.is_available ?? true,
          averageRating: techData?.average_rating ?? 0,
          reviewCount: techData?.review_count ?? 0,
          completedJobsCount: techData?.completed_jobs_count ?? 0,
          services: [],
          serviceAreas: ['Jakarta Selatan'],
          portfolio: [],
          reviews: [],
          availabilitySchedule: [],
          theme: 'sand',
        };
      }
    } catch {
      // Return clean fallback
    }
  }

  if (shouldUseFixtures() && (!userId || userId.startsWith('demo-'))) {
    const defaultTech = fixtureTechnicians[0];
    return {
      ...defaultTech,
      availabilitySchedule: defaultTech.availabilitySchedule ?? [],
    };
  }

  return {
    id: userId || 'clean-technician',
    displayName: 'Teknisi Cepat',
    verified: false,
    available: true,
    averageRating: 0,
    reviewCount: 0,
    completedJobsCount: 0,
    services: [],
    serviceAreas: ['Jakarta Selatan'],
    portfolio: [],
    reviews: [],
    availabilitySchedule: [],
    theme: 'sand',
  };
}

export async function saveTechnicianWorkspaceProfile(
  userId: string | null | undefined,
  profile: Technician,
): Promise<Technician> {
  const sanitized: Technician = {
    ...profile,
    displayName: profile.displayName.trim().slice(0, 80) || 'Teknisi Cepat',
    businessName: profile.businessName?.trim().slice(0, 80) || undefined,
    headline: profile.headline?.trim().slice(0, 120) || undefined,
    bio: profile.bio?.trim().slice(0, 3000) || undefined,
    yearsExperience:
      profile.yearsExperience !== undefined
        ? Math.max(0, Math.min(80, Math.round(profile.yearsExperience)))
        : undefined,
    theme: normalizeProfileTheme({ preset: profile.theme }),
  };

  await setStoredJson(scopeKey(TECH_WORKSPACE_KEY, userId), sanitized);

  // Sync to fixtureTechnicians in memory so marketplace and profile screens reflect changes immediately
  const index = fixtureTechnicians.findIndex((item) => item.id === sanitized.id);
  if (index >= 0) {
    fixtureTechnicians[index] = {
      ...fixtureTechnicians[index],
      ...sanitized,
      // Keep verified and aggregate ratings protected from client escalation
      verified: fixtureTechnicians[index].verified,
      averageRating: fixtureTechnicians[index].averageRating,
      reviewCount: fixtureTechnicians[index].reviewCount,
      completedJobsCount: fixtureTechnicians[index].completedJobsCount,
    };
  } else {
    fixtureTechnicians.unshift(sanitized);
  }

  if (supabase && userId) {
    try {
      await supabase
        .from('technician_profiles')
        .update({
          business_name: sanitized.businessName ?? null,
          headline: sanitized.headline ?? null,
          bio: sanitized.bio ?? null,
          years_experience: sanitized.yearsExperience ?? null,
          profile_theme: { preset: sanitized.theme },
          is_available: sanitized.available,
        })
        .eq('user_id', userId);
    } catch {
      // Local workspace state remains saved.
    }
  }

  return sanitized;
}

export async function updateTechnicianServices(
  userId: string | null | undefined,
  services: TechnicianService[],
): Promise<Technician> {
  const current = await loadTechnicianWorkspaceProfile(userId);
  return saveTechnicianWorkspaceProfile(userId, { ...current, services });
}

export async function updateTechnicianPortfolio(
  userId: string | null | undefined,
  portfolio: PortfolioItem[],
): Promise<Technician> {
  const current = await loadTechnicianWorkspaceProfile(userId);
  return saveTechnicianWorkspaceProfile(userId, { ...current, portfolio });
}

export async function updateTechnicianSchedule(
  userId: string | null | undefined,
  availabilitySchedule: TechnicianAvailabilitySlot[],
): Promise<Technician> {
  const current = await loadTechnicianWorkspaceProfile(userId);
  return saveTechnicianWorkspaceProfile(userId, { ...current, availabilitySchedule });
}

export async function submitAccountDeletionRequest(
  userId: string | null | undefined,
  reason: string,
): Promise<{ requestedAt: string; reason: string }> {
  const payload = {
    requestedAt: new Date().toISOString(),
    reason: reason.trim().slice(0, 500) || 'Permintaan penghapusan akun oleh pengguna.',
  };
  await setStoredJson(scopeKey(DELETION_REQUEST_KEY, userId), payload);
  return payload;
}

export async function loadAccountDeletionRequest(
  userId?: string | null,
): Promise<{ requestedAt: string; reason: string } | null> {
  return getStoredJson<{ requestedAt: string; reason: string } | null>(
    scopeKey(DELETION_REQUEST_KEY, userId),
    null,
  );
}

export async function loadBookings(): Promise<BookingRecord[]> {
  if (shouldUseFixtures()) {
    return getStoredJson<BookingRecord[]>(BOOKINGS_STORAGE_KEY, fixtureBookings);
  }
  if (!supabase) throw new Error('supabase_unavailable');

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error(`booking_session_failed: ${sessionError.message}`);
  if (!sessionData.session?.user) return [];

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`bookings_load_failed: ${error.message}`);

  const rows = data ?? [];
  const userIds = Array.from(
    new Set(rows.flatMap((row) => [
      String(row.customer_user_id ?? ''),
      String(row.technician_user_id ?? ''),
    ])),
  ).filter(Boolean);
  const areaIds = Array.from(
    new Set(rows.map((row) => String(row.service_area_id ?? '')).filter(Boolean)),
  );
  const namesById = new Map<string, string>();
  const areasById = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds);
    if (profilesError) {
      throw new Error(`booking_profiles_load_failed: ${profilesError.message}`);
    }
    for (const profile of profiles ?? []) {
      namesById.set(String(profile.id), String(profile.display_name));
    }
  }
  if (areaIds.length > 0) {
    const { data: areas, error: areasError } = await supabase
      .from('service_areas')
      .select('id, name')
      .in('id', areaIds);
    if (areasError) throw new Error(`booking_areas_load_failed: ${areasError.message}`);
    for (const area of areas ?? []) {
      areasById.set(String(area.id), String(area.name));
    }
  }

  return rows.map((row) => mapSupabaseBooking(row, namesById, areasById));
}

export async function loadBookingById(bookingId: string): Promise<BookingRecord | null> {
  const bookings = await loadBookings();
  return bookings.find((b) => b.id === bookingId) ?? null;
}

export function subscribeToBookings(
  userId: string,
  onChange: () => void,
  onError: (message: string) => void,
): () => void {
  if (!userId || shouldUseFixtures() || !supabase) return () => {};

  const channel = supabase
    .channel(`bookings:${userId}:${nextRealtimeChannelSuffix()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `customer_user_id=eq.${userId}`,
      },
      onChange,
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `technician_user_id=eq.${userId}`,
      },
      onChange,
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onError(`bookings_realtime_${status.toLowerCase()}`);
      }
    });

  return () => {
    void supabase?.removeChannel(channel);
  };
}

export interface CreateBookingInput {
  customerUserId?: string;
  customerName?: string;
  technician: Technician;
  service: TechnicianService;
  customerAddress: string;
  addressNotes?: string;
  serviceArea: string;
  customerLatitude?: number;
  customerLongitude?: number;
  requestedStartAt: string;
  customerNotes?: string;
}

export async function createBookingRequest(input: CreateBookingInput): Promise<BookingRecord> {
  const address = input.customerAddress.trim();
  const requestedStartAt = input.requestedStartAt.trim();
  const area = input.serviceArea.trim();

  if (!input.technician.id || !input.service.id || !address || !requestedStartAt || !area) {
    throw new Error('missing_booking_fields');
  }

  if (
    input.customerUserId &&
    (input.customerUserId === input.technician.id ||
      (input.technician as any).userId === input.customerUserId)
  ) {
    throw new Error('cannot_book_own_service');
  }

  const now = new Date().toISOString();
  const newBooking: BookingRecord = {
    id: `booking-${Date.now()}`,
    customerUserId: input.customerUserId || 'demo-customer',
    customerName: input.customerName?.trim() || 'Andi Wijaya',
    technicianUserId: input.technician.id,
    technicianName: input.technician.displayName,
    technicianBusinessName: input.technician.businessName,
    technicianServiceId: input.service.id,
    serviceNameSnapshot: input.service.name,
    serviceDescription: input.service.description,
    customerAddress: address.slice(0, 300),
    addressNotes: input.addressNotes?.trim().slice(0, 200),
    serviceArea: area,
    customerLatitude: input.customerLatitude,
    customerLongitude: input.customerLongitude,
    requestedStartAt,
    status: 'requested',
    customerNotes: input.customerNotes?.trim().slice(0, 500),
    agreedPrice: input.service.startingPrice,
    currency: 'IDR',
    createdAt: now,
    updatedAt: now,
    source: shouldUseFixtures() ? 'fixtures' : 'supabase',
  };

  if (!shouldUseFixtures()) {
    if (!supabase) throw new Error('supabase_unavailable');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error(`booking_session_failed: ${sessionError.message}`);
    const sessionUserId = sessionData.session?.user.id;
    if (!sessionUserId || sessionUserId !== input.customerUserId) {
      throw new Error('booking_customer_session_mismatch');
    }

    const { data: technicianProfile, error: technicianProfileError } =
      await supabase
        .from('technician_profiles')
        .select('user_id')
        .eq('user_id', input.technician.id)
        .maybeSingle();
    if (technicianProfileError) {
      throw new Error(
        `booking_technician_check_failed: ${technicianProfileError.message}`,
      );
    }
    if (!technicianProfile) {
      throw new Error('booking_technician_profile_missing');
    }

    const UUID_REGEX =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let serviceUuid: string | null = null;
    if (input.service?.id && UUID_REGEX.test(input.service.id)) {
      try {
        const { data: svc } = await supabase
          .from('technician_services')
          .select('id')
          .eq('id', input.service.id)
          .eq('technician_user_id', input.technician.id)
          .maybeSingle();
        if (svc?.id) {
          serviceUuid = svc.id;
        }
      } catch {
        serviceUuid = null;
      }
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        customer_user_id: sessionUserId,
        technician_user_id: input.technician.id,
        technician_service_id: serviceUuid,
        service_name_snapshot: newBooking.serviceNameSnapshot,
        service_description: newBooking.serviceDescription ?? null,
        customer_address: newBooking.customerAddress,
        address_notes: newBooking.addressNotes ?? null,
        service_area_name_snapshot: area,
        customer_latitude: input.customerLatitude ?? null,
        customer_longitude: input.customerLongitude ?? null,
        requested_start_at: newBooking.requestedStartAt,
        status: 'requested',
        customer_notes: newBooking.customerNotes ?? null,
        agreed_price: newBooking.agreedPrice ?? null,
        currency: 'IDR',
      })
      .select('*')
      .single();
    if (error) {
      if (
        error.code === '23503' &&
        error.message.toLowerCase().includes('technician')
      ) {
        throw new Error('booking_technician_profile_missing');
      }
      throw new Error(`booking_create_failed: ${error.message}`);
    }

    const namesById = new Map([
      [sessionUserId, newBooking.customerName],
      [input.technician.id, input.technician.displayName],
    ]);
    return mapSupabaseBooking(
      data,
      namesById,
      new Map(),
    );
  }

  const current = await getStoredJson<BookingRecord[]>(BOOKINGS_STORAGE_KEY, fixtureBookings);
  await setStoredJson(BOOKINGS_STORAGE_KEY, [newBooking, ...current]);
  await recordLocalBookingNotification(
    newBooking.technicianUserId,
    'booking_requested',
    newBooking.id,
    newBooking.serviceNameSnapshot,
    newBooking.customerName,
    'customer',
  );
  return newBooking;
}

export async function transitionBookingStatus(
  bookingId: string,
  nextStatus: BookingStatus,
  actor: 'customer' | 'technician',
  options?: {
    proposedStartAt?: string;
    cancellationReason?: string;
  },
): Promise<BookingRecord> {
  const target = await loadBookingById(bookingId);
  if (!target) {
    throw new Error('booking_not_found');
  }

  if (!isAllowedBookingTransition(target.status, nextStatus, actor)) {
    throw new Error('invalid_status_transition');
  }

  if (nextStatus === 'alternative_proposed' && !options?.proposedStartAt?.trim()) {
    throw new Error('missing_proposed_time');
  }
  if (
    nextStatus === 'completed' &&
    actor === 'customer' &&
    !target.workCompletedAt
  ) {
    throw new Error('invalid_status_transition: technician_work_not_submitted');
  }

  const now = new Date().toISOString();
  const updatedRecord: BookingRecord = {
    ...target,
    status: nextStatus,
    proposedStartAt:
      nextStatus === 'alternative_proposed'
        ? options?.proposedStartAt?.trim()
        : target.proposedStartAt,
    agreedStartAt:
      nextStatus === 'confirmed'
        ? target.status === 'alternative_proposed' && target.proposedStartAt
          ? target.proposedStartAt
          : target.requestedStartAt
        : target.agreedStartAt,
    cancellationReason:
      nextStatus === 'cancelled' || nextStatus === 'declined'
        ? options?.cancellationReason?.trim() || target.cancellationReason
        : target.cancellationReason,
    updatedAt: now,
  };

  if (!shouldUseFixtures()) {
    if (!supabase) throw new Error('supabase_unavailable');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error(`booking_session_failed: ${sessionError.message}`);
    const currentUserId = sessionData.session?.user.id;
    const participantId = actor === 'customer'
      ? target.customerUserId
      : target.technicianUserId;
    if (!currentUserId || currentUserId !== participantId) {
      throw new Error('booking_actor_session_mismatch');
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({
        status: nextStatus,
        proposed_start_at: updatedRecord.proposedStartAt ?? null,
        agreed_start_at: updatedRecord.agreedStartAt ?? null,
        cancellation_reason: updatedRecord.cancellationReason ?? null,
      })
      .eq('id', bookingId)
      .eq('status', target.status)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(`booking_update_failed: ${error.message}`);
    if (!data) throw new Error('booking_status_conflict');
    return {
      ...target,
      status: data.status as BookingStatus,
      proposedStartAt: data.proposed_start_at
        ? String(data.proposed_start_at)
        : undefined,
      agreedStartAt: data.agreed_start_at
        ? String(data.agreed_start_at)
        : undefined,
      cancellationReason: data.cancellation_reason
        ? String(data.cancellation_reason)
        : undefined,
      updatedAt: String(data.updated_at ?? now),
    };
  }

  const current = await getStoredJson<BookingRecord[]>(BOOKINGS_STORAGE_KEY, fixtureBookings);
  const nextList = current.map((item) => (item.id === bookingId ? updatedRecord : item));
  await setStoredJson(BOOKINGS_STORAGE_KEY, nextList);
  if (nextStatus === 'confirmed' && target.status === 'requested') {
    await recordLocalBookingNotification(
      target.customerUserId,
      'booking_accepted',
      target.id,
      target.serviceNameSnapshot,
      target.technicianName,
      'technician',
    );
  } else if (nextStatus === 'confirmed' && target.status === 'alternative_proposed') {
    await recordLocalBookingNotification(
      target.technicianUserId,
      'booking_schedule_confirmed',
      target.id,
      target.serviceNameSnapshot,
      target.customerName,
      'customer',
    );
  }
  return updatedRecord;
}

export async function customerAcceptWorkDone(bookingId: string): Promise<BookingRecord> {
  return transitionBookingStatus(bookingId, 'completed', 'customer');
}

export async function submitBookingWorkForAcceptance(
  bookingId: string,
): Promise<BookingRecord> {
  const target = await loadBookingById(bookingId);
  if (!target) throw new Error('booking_not_found');
  if (target.status !== 'in_progress') {
    throw new Error('booking_not_in_progress');
  }

  const now = new Date().toISOString();
  if (!shouldUseFixtures()) {
    if (!supabase) throw new Error('supabase_unavailable');
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError) {
      throw new Error(`booking_session_failed: ${sessionError.message}`);
    }
    if (sessionData.session?.user.id !== target.technicianUserId) {
      throw new Error('booking_actor_session_mismatch');
    }

    const { data, error } = await supabase.rpc(
      'submit_booking_work_for_acceptance',
      { p_booking_id: bookingId },
    );
    if (error) {
      throw new Error(`booking_work_submit_failed: ${error.message}`);
    }
    const workCompletedAt =
      typeof data === 'string' ? data : target.workCompletedAt ?? now;
    return { ...target, workCompletedAt, updatedAt: now };
  }

  const updatedRecord: BookingRecord = {
    ...target,
    workCompletedAt: target.workCompletedAt ?? now,
    updatedAt: now,
  };
  const current = await getStoredJson<BookingRecord[]>(
    BOOKINGS_STORAGE_KEY,
    fixtureBookings,
  );
  await setStoredJson(
    BOOKINGS_STORAGE_KEY,
    current.map((booking) =>
      booking.id === bookingId ? updatedRecord : booking,
    ),
  );
  await recordLocalBookingNotification(
    target.customerUserId,
    'booking_work_completed',
    target.id,
    target.serviceNameSnapshot,
    target.technicianName,
    'technician',
  );
  return updatedRecord;
}

export async function loadBookingMessages(bookingId: string): Promise<BookingMessage[]> {
  if (!shouldUseFixtures()) {
    if (!supabase) throw new Error('supabase_unavailable');
    const { data, error } = await supabase.rpc('load_booking_messages', {
      p_booking_id: bookingId,
    });
    if (error) throw new Error(`booking_messages_load_failed: ${error.message}`);
    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.message_id),
      bookingId: String(row.booking_id),
      senderUserId: String(row.sender_user_id),
      senderRole: row.sender_role === 'technician' ? 'technician' : 'customer',
      senderName: String(row.sender_name ?? 'Cepat'),
      body: String(row.body ?? ''),
      createdAt: String(row.created_at),
    }));
  }
  const allMessages = await getStoredJson<Record<string, BookingMessage[]>>(
    MESSAGES_STORAGE_KEY,
    fixtureMessages,
  );
  return allMessages[bookingId] ?? [];
}

export async function subscribeToBookingMessages(
  bookingId: string,
  onChange: () => void,
  onError: (message: string) => void,
): Promise<() => void> {
  if (shouldUseFixtures()) return () => {};
  if (!supabase) throw new Error('supabase_unavailable');

  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('id')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (error) throw new Error(`booking_conversation_load_failed: ${error.message}`);
  if (!conversation?.id) return () => {};

  const channel = supabase
    .channel(
      `booking-messages:${conversation.id}:${nextRealtimeChannelSuffix()}`,
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`,
      },
      onChange,
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onError(`booking_messages_realtime_${status.toLowerCase()}`);
      }
    });

  return () => {
    void supabase?.removeChannel(channel);
  };
}

export async function sendBookingMessage(input: {
  bookingId: string;
  senderUserId: string;
  senderRole: 'customer' | 'technician';
  senderName: string;
  body: string;
  clientMessageId?: string;
}): Promise<BookingMessage> {
  const trimmed = input.body.trim();
  if (!trimmed) {
    throw new Error('empty_message');
  }
  if (trimmed.length > 1000) {
    throw new Error('message_too_long');
  }
  if (containsBlockedContactOrUrl(trimmed)) {
    throw new Error('url_blocked');
  }
  const sanitizedBody = trimmed;

  if (!shouldUseFixtures()) {
    if (!supabase) throw new Error('supabase_unavailable');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error(`booking_message_session_failed: ${sessionError.message}`);
    if (sessionData.session?.user.id !== input.senderUserId) {
      throw new Error('booking_message_sender_mismatch');
    }
    const { data, error } = await supabase.rpc('send_booking_message', {
      p_booking_id: input.bookingId,
      p_body: sanitizedBody,
      p_client_message_id:
        input.clientMessageId ??
        `${input.senderUserId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    });
    if (error) throw new Error(`booking_message_send_failed: ${error.message}`);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('booking_message_send_failed: empty_response');
    return {
      id: String(row.message_id),
      bookingId: String(row.booking_id),
      senderUserId: String(row.sender_user_id),
      senderRole: row.sender_role === 'technician' ? 'technician' : 'customer',
      senderName: String(row.sender_name ?? input.senderName),
      body: String(row.body ?? sanitizedBody),
      createdAt: String(row.created_at),
    };
  }

  const booking = await loadBookingById(input.bookingId);
  if (!booking || !isChatEnabledForStatus(booking.status)) {
    throw new Error('chat_not_available');
  }

  const message: BookingMessage = {
    id: `msg-${Date.now()}`,
    bookingId: input.bookingId,
    senderUserId: input.senderUserId,
    senderRole: input.senderRole,
    senderName: input.senderName,
    body: sanitizedBody,
    createdAt: new Date().toISOString(),
  };

  const allMessages = await getStoredJson<Record<string, BookingMessage[]>>(
    MESSAGES_STORAGE_KEY,
    fixtureMessages,
  );
  const existing = allMessages[input.bookingId] ?? [];
  const nextAll = {
    ...allMessages,
    [input.bookingId]: [...existing, message],
  };
  await setStoredJson(MESSAGES_STORAGE_KEY, nextAll);
  const recipientUserId =
    input.senderRole === 'customer'
      ? booking.technicianUserId
      : booking.customerUserId;
  await recordLocalMessageNotification(
    recipientUserId,
    input.senderName,
    sanitizedBody,
    input.bookingId,
    input.senderRole,
  );
  return message;
}

export async function submitBookingReview(input: {
  bookingId: string;
  technicianId: string;
  customerName: string;
  rating: number;
  comment: string;
}): Promise<TechnicianReview> {
  const booking = await loadBookingById(input.bookingId);
  if (booking && booking.status !== 'completed') {
    throw new Error('booking_not_completed');
  }
  if (booking && booking.customerUserId === booking.technicianUserId) {
    throw new Error('cannot_review_self');
  }
  if (booking && booking.reviewRating) {
    throw new Error('review_already_submitted');
  }
  const normalizedRating = Math.round(input.rating);
  if (normalizedRating < 1 || normalizedRating > 5) {
    throw new Error('invalid_rating');
  }

  const review: TechnicianReview = {
    id: `review-${Date.now()}`,
    technicianId: input.technicianId,
    bookingId: input.bookingId,
    customerName: input.customerName.trim() || 'Pelanggan Cepat',
    rating: normalizedRating,
    comment: input.comment.trim().slice(0, 1000),
    createdAt: new Date().toISOString().slice(0, 10),
  };

  const storedReviews = await getStoredJson<TechnicianReview[]>(REVIEWS_STORAGE_KEY, []);
  await setStoredJson(REVIEWS_STORAGE_KEY, [review, ...storedReviews]);

  // Persist the review on the booking record so duplicate reviews are blocked
  if (booking) {
    const updatedBooking: BookingRecord = {
      ...booking,
      reviewRating: normalizedRating,
      reviewComment: review.comment,
      updatedAt: new Date().toISOString(),
    };
    const currentBookings = await getStoredJson<BookingRecord[]>(BOOKINGS_STORAGE_KEY, fixtureBookings);
    const updatedBookings = currentBookings.map((b) => (b.id === booking.id ? updatedBooking : b));
    await setStoredJson(BOOKINGS_STORAGE_KEY, updatedBookings);
    const fxIndex = fixtureBookings.findIndex((b) => b.id === booking.id);
    if (fxIndex >= 0) {
      fixtureBookings[fxIndex] = updatedBooking;
    }
    if (supabase) {
      try {
        await supabase
          .from('bookings')
          .update({
            review_rating: normalizedRating,
            review_comment: review.comment,
          })
          .eq('id', booking.id);
      } catch {}
    }
  }

  const techIndex = fixtureTechnicians.findIndex((item) => item.id === input.technicianId);
  if (techIndex >= 0) {
    const tech = fixtureTechnicians[techIndex];
    const nextCount = tech.reviewCount + 1;
    const nextAvg = Number(
      ((tech.averageRating * tech.reviewCount + normalizedRating) / nextCount).toFixed(1),
    );
    fixtureTechnicians[techIndex] = {
      ...tech,
      reviewCount: nextCount,
      averageRating: nextAvg,
      reviews: [review, ...tech.reviews],
    };
  }

  return review;
}

export async function submitDirectTechnicianReview(input: {
  technicianId: string;
  customerName?: string;
  rating: number;
  comment: string;
}): Promise<TechnicianReview> {
  const normalizedRating = Math.max(1, Math.min(5, Math.round(input.rating)));
  const review: TechnicianReview = {
    id: `review-${Date.now()}`,
    technicianId: input.technicianId,
    customerName: input.customerName?.trim() || 'Pelanggan Cepat',
    rating: normalizedRating,
    comment: input.comment.trim().slice(0, 1000),
    createdAt: new Date().toISOString().slice(0, 10),
  };

  const storedReviews = await getStoredJson<TechnicianReview[]>(REVIEWS_STORAGE_KEY, []);
  await setStoredJson(REVIEWS_STORAGE_KEY, [review, ...storedReviews]);

  const techIndex = fixtureTechnicians.findIndex((item) => item.id === input.technicianId);
  if (techIndex >= 0) {
    const tech = fixtureTechnicians[techIndex];
    const nextCount = tech.reviewCount + 1;
    const nextAvg = Number(
      ((tech.averageRating * tech.reviewCount + normalizedRating) / nextCount).toFixed(1),
    );
    fixtureTechnicians[techIndex] = {
      ...tech,
      reviewCount: nextCount,
      averageRating: nextAvg,
      reviews: [review, ...tech.reviews],
    };
  }

  return review;
}

export async function loadSubmittedReviews(): Promise<TechnicianReview[]> {
  return getStoredJson<TechnicianReview[]>(REVIEWS_STORAGE_KEY, []);
}

export async function submitTechnicianReport(input: {
  reporterUserId?: string;
  reportedTechnicianId: string;
  technicianName: string;
  bookingId?: string;
  category: TechnicianReport['category'];
  description: string;
  severity?: TechnicianReport['severity'];
}): Promise<TechnicianReport> {
  const trimmedDesc = input.description.trim();
  if (trimmedDesc.length < 10) {
    throw new Error('report_description_too_short');
  }

  const report: TechnicianReport = {
    id: `report-${Date.now()}`,
    reporterUserId: input.reporterUserId || 'demo-customer',
    reportedTechnicianId: input.reportedTechnicianId,
    technicianName: input.technicianName,
    bookingId: input.bookingId,
    category: input.category,
    description: trimmedDesc.slice(0, 2000),
    severity: input.severity ?? 'medium',
    status: 'submitted',
    createdAt: new Date().toISOString(),
  };

  const current = await getStoredJson<TechnicianReport[]>(REPORTS_STORAGE_KEY, []);
  await setStoredJson(REPORTS_STORAGE_KEY, [report, ...current]);
  return report;
}

export async function loadSubmittedReports(): Promise<TechnicianReport[]> {
  return getStoredJson<TechnicianReport[]>(REPORTS_STORAGE_KEY, []);
}
