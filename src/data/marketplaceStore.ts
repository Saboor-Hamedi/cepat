import {
  fixtureBookings,
  fixtureMessages,
  fixtureSavedAddresses,
  fixtureTechnicians,
} from './fixtures';
import { shouldUseFixtures, supabase } from './marketplaceRepository';
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
    completed: ['technician'],
    cancelled: ['customer', 'technician'],
  },
  in_progress: {
    completed: ['technician'],
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
): Promise<AccountProfileDetails> {
  const defaultProfile: AccountProfileDetails = shouldUseFixtures()
    ? {
        displayName: fallbackName || (userId ? 'Pengguna Cepat' : 'Andi Wijaya'),
        email: fallbackEmail || (userId ? '' : 'andi.wijaya@cepat.id'),
        phoneNumber: '+62 812-8890-1120',
        avatarUri: '',
        addressNotes: 'Kebayoran Baru, Jakarta Selatan',
      }
    : {
        displayName: fallbackName || '',
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
        supabase.from('profiles').select('display_name, avatar_path').eq('id', userId).maybeSingle(),
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
          (stored.displayName === 'Andi Wijaya' ? fallbackName : stored.displayName),
        email: fallbackEmail || (stored.email === 'andi.wijaya@cepat.id' ? '' : stored.email),
        phoneNumber: cleanPhone,
        avatarUri: pub?.avatar_path ?? stored.avatarUri,
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
  const normalized: AccountProfileDetails = {
    displayName: trimmedName,
    email: details.email.trim(),
    phoneNumber: details.phoneNumber.trim().slice(0, 32),
    avatarUri: details.avatarUri.trim(),
    addressNotes: details.addressNotes.trim().slice(0, 240),
  };
  await setStoredJson(scopeKey(ACCOUNT_PROFILE_KEY, userId), normalized);

  if (supabase && userId) {
    try {
      await Promise.all([
        supabase.from('profiles').update({
          display_name: normalized.displayName,
          avatar_path: normalized.avatarUri || null,
        }).eq('id', userId),
        supabase.from('private_profiles').upsert({
          user_id: userId,
          phone_number: normalized.phoneNumber || null,
          address_notes: normalized.addressNotes || null,
        }),
      ]);
    } catch {
      // Local copy is preserved.
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
          .select('display_name, avatar_path')
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
          avatarUri: profileData?.avatar_path || undefined,
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
  const localBookings = await getStoredJson<BookingRecord[]>(
    BOOKINGS_STORAGE_KEY,
    shouldUseFixtures() ? fixtureBookings : [],
  );

  if (!shouldUseFixtures() && supabase) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData.session?.user?.id;
      if (currentUserId) {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          const userIds = Array.from(
            new Set([
              ...data.map((r) => String(r.customer_user_id ?? '')),
              ...data.map((r) => String(r.technician_user_id ?? '')),
            ]),
          ).filter(Boolean);

          let nameById = new Map<string, string>();
          if (userIds.length > 0) {
            try {
              const { data: pData } = await supabase
                .from('profiles')
                .select('id, display_name')
                .in('id', userIds);
              if (Array.isArray(pData)) {
                nameById = new Map(pData.map((p) => [String(p.id), String(p.display_name)]));
              }
            } catch {}
          }

          return data.map((row: Record<string, unknown>) => ({
            id: String(row.id ?? ''),
            customerUserId: String(row.customer_user_id ?? ''),
            customerName:
              nameById.get(String(row.customer_user_id)) || 'Pelanggan Cepat',
            technicianUserId: String(row.technician_user_id ?? ''),
            technicianName:
              nameById.get(String(row.technician_user_id)) || 'Teknisi Cepat',
            technicianServiceId: row.technician_service_id ? String(row.technician_service_id) : undefined,
            serviceId: row.service_id ? String(row.service_id) : undefined,
            serviceNameSnapshot: String(row.service_name_snapshot ?? 'Layanan Rumah'),
            serviceDescription: row.service_description ? String(row.service_description) : undefined,
            customerAddress: String(row.customer_address ?? ''),
            addressNotes: row.address_notes ? String(row.address_notes) : undefined,
            serviceArea: 'Jakarta Selatan',
            requestedStartAt: String(row.requested_start_at ?? row.created_at ?? new Date().toISOString()),
            agreedStartAt: row.agreed_start_at ? String(row.agreed_start_at) : undefined,
            proposedStartAt: row.proposed_start_at ? String(row.proposed_start_at) : undefined,
            status: (row.status as BookingStatus) ?? 'requested',
            customerNotes: row.customer_notes ? String(row.customer_notes) : undefined,
            agreedPrice: typeof row.agreed_price === 'number' ? row.agreed_price : Number(row.agreed_price) || undefined,
            currency: 'IDR',
            cancellationReason: row.cancellation_reason ? String(row.cancellation_reason) : undefined,
            createdAt: String(row.created_at ?? new Date().toISOString()),
            updatedAt: String(row.updated_at ?? new Date().toISOString()),
            source: 'supabase',
          }));
        }
      }
    } catch {
      // Fall back to local bookings store.
    }
  }

  return shouldUseFixtures()
    ? localBookings
    : localBookings.filter(
        (b) =>
          !b.id.startsWith('mock-') &&
          !b.id.startsWith('booking-seed') &&
          b.customerName !== 'Saboor',
      );
}

export async function loadBookingById(bookingId: string): Promise<BookingRecord | null> {
  const bookings = await loadBookings();
  return bookings.find((b) => b.id === bookingId) ?? null;
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

  if (!shouldUseFixtures() && supabase && input.customerUserId) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          customer_user_id: input.customerUserId,
          technician_user_id: input.technician.id,
          service_name_snapshot: newBooking.serviceNameSnapshot,
          service_description: newBooking.serviceDescription ?? null,
          customer_address: newBooking.customerAddress,
          address_notes: newBooking.addressNotes ?? null,
          requested_start_at: newBooking.requestedStartAt,
          status: 'requested',
          customer_notes: newBooking.customerNotes ?? null,
          agreed_price: newBooking.agreedPrice ?? null,
          currency: 'IDR',
        })
        .select('id')
        .maybeSingle();
      if (!error && data?.id) {
        newBooking.id = String(data.id);
      }
    } catch {
      // Keep local booking record available.
    }
  }

  const current = await getStoredJson<BookingRecord[]>(BOOKINGS_STORAGE_KEY, fixtureBookings);
  const updated = [newBooking, ...current];
  await setStoredJson(BOOKINGS_STORAGE_KEY, updated);

  // Seed chat with booking order details card so both parties immediately see the requested job
  try {
    const initialOrderMessage: BookingMessage = {
      id: `msg-order-${newBooking.id}`,
      bookingId: newBooking.id,
      senderUserId: newBooking.customerUserId,
      senderRole: 'customer',
      senderName: newBooking.customerName,
      body: `📋 [Pesanan #${newBooking.id.slice(-6)}] ${newBooking.serviceNameSnapshot} · ${newBooking.customerAddress} (${newBooking.serviceArea}) · Jadwal: ${newBooking.requestedStartAt.slice(0, 16).replace('T', ' ')} WIB`,
      createdAt: now,
    };
    const allMsgs = await getStoredJson<Record<string, BookingMessage[]>>(
      MESSAGES_STORAGE_KEY,
      fixtureMessages,
    );
    allMsgs[newBooking.id] = [initialOrderMessage, ...(allMsgs[newBooking.id] ?? [])];
    await setStoredJson(MESSAGES_STORAGE_KEY, allMsgs);
  } catch {
    // Non-critical seeding failure fallback
  }

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
  const current = await getStoredJson<BookingRecord[]>(BOOKINGS_STORAGE_KEY, fixtureBookings);
  const target = current.find((item) => item.id === bookingId);
  if (!target) {
    throw new Error('booking_not_found');
  }

  if (!isAllowedBookingTransition(target.status, nextStatus, actor)) {
    throw new Error('invalid_status_transition');
  }

  if (nextStatus === 'alternative_proposed' && !options?.proposedStartAt?.trim()) {
    throw new Error('missing_proposed_time');
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

  const nextList = current.map((item) => (item.id === bookingId ? updatedRecord : item));
  await setStoredJson(BOOKINGS_STORAGE_KEY, nextList);

  if (!shouldUseFixtures() && supabase) {
    try {
      await supabase
        .from('bookings')
        .update({
          status: nextStatus,
          proposed_start_at: updatedRecord.proposedStartAt ?? null,
          agreed_start_at: updatedRecord.agreedStartAt ?? null,
          cancellation_reason: updatedRecord.cancellationReason ?? null,
        })
        .eq('id', bookingId);
    } catch {
      // Local state already updated.
    }
  }

  return updatedRecord;
}

export async function customerAcceptWorkDone(bookingId: string): Promise<BookingRecord> {
  const current = await getStoredJson<BookingRecord[]>(BOOKINGS_STORAGE_KEY, fixtureBookings);
  const target = current.find((item) => item.id === bookingId);
  if (!target) {
    throw new Error('booking_not_found');
  }
  const now = new Date().toISOString();
  const updatedRecord: BookingRecord = {
    ...target,
    customerAcceptedWorkDone: true,
    updatedAt: now,
  };
  const nextList = current.map((item) => (item.id === bookingId ? updatedRecord : item));
  await setStoredJson(BOOKINGS_STORAGE_KEY, nextList);
  return updatedRecord;
}

export async function loadBookingMessages(bookingId: string): Promise<BookingMessage[]> {
  const allMessages = await getStoredJson<Record<string, BookingMessage[]>>(
    MESSAGES_STORAGE_KEY,
    fixtureMessages,
  );
  return allMessages[bookingId] ?? [];
}

export async function sendBookingMessage(input: {
  bookingId: string;
  senderUserId: string;
  senderRole: 'customer' | 'technician';
  senderName: string;
  body: string;
}): Promise<BookingMessage> {
  const trimmed = input.body.trim();
  if (!trimmed) {
    throw new Error('empty_message');
  }
  if (trimmed.length > 1000) {
    throw new Error('message_too_long');
  }
  if (containsBlockedUrl(trimmed)) {
    throw new Error('url_blocked');
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
    body: trimmed,
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
  const normalizedRating = Math.round(input.rating);
  if (normalizedRating < 1 || normalizedRating > 5) {
    throw new Error('invalid_rating');
  }

  const review: TechnicianReview = {
    id: `review-${Date.now()}`,
    bookingId: input.bookingId,
    customerName: input.customerName.trim() || 'Pelanggan Cepat',
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
