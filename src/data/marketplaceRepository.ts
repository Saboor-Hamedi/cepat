import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

import { fixtureCategories, fixtureTechnicians, indonesianRegions } from './fixtures';
import type {
  DataSource,
  IndonesianRegion,
  MarketplaceData,
  Page,
  PortfolioItem,
  ServiceCategory,
  Technician,
  TechnicianAvailabilitySlot,
  TechnicianReview,
  TechnicianService,
} from '../types/marketplace';
import { normalizeProfileTheme } from '../theme/tokens';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
const hasSupabaseConfiguration = Boolean(supabaseUrl || supabasePublishableKey);
const hasValidSupabaseConfiguration = Boolean(
  supabaseUrl && supabasePublishableKey && isValidSupabaseUrl(supabaseUrl),
);

export function isValidSupabaseUrl(value: string | undefined): boolean {
  if (!value || !/^https?:\/\//i.test(value)) return false;
  try {
    const parsed = new URL(value);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

const supabaseConfigurationError =
  'Supabase configuration is incomplete. Set a valid HTTP(S) EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or remove both to use development fixtures.';

export const supabase =
  supabaseUrl && supabasePublishableKey && isValidSupabaseUrl(supabaseUrl)
    ? createClient(supabaseUrl, supabasePublishableKey, {
        auth: {
          storage: Platform.OS === 'web' ? undefined : AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}

export const PAGE_SIZE = 20;
const FIXTURE_SOURCE: DataSource = 'fixtures';
const SUPABASE_SOURCE: DataSource = 'supabase';

const CATEGORY_ICONS: Record<string, string> = {
  plumbing: 'plumbing',
  water: 'plumbing',
  ac: 'ac-repair',
  'ac-repair': 'ac-repair',
  electrical: 'electrical',
  appliance: 'appliance-repair',
  'appliance-repair': 'appliance-repair',
  maintenance: 'home-maintenance',
  'home-maintenance': 'home-maintenance',
};

const TECHNICIAN_PROFILE_SELECT = `
  user_id, business_name, headline, bio, years_experience, profile_theme,
  is_verified, is_available, average_rating, review_count, completed_jobs_count,
  services:technician_services!technician_services_technician_user_id_fkey(
    id, description, starting_price, estimated_duration_minutes, is_active,
    service:services!technician_services_service_id_fkey(
      id, name, slug, description, category:service_categories!services_category_id_fkey(name, slug)
    )
  ),
  areas:technician_service_areas!technician_service_areas_technician_user_id_fkey(
    service_area:service_areas!technician_service_areas_service_area_id_fkey(name)
  )
`;

export function getMarketplacePreviewReason(): 'invalid' | 'not_configured' | null {
  if (!hasSupabaseConfiguration) return 'not_configured';
  if (!hasValidSupabaseConfiguration || !supabase) return 'invalid';
  return null;
}

export function shouldUseFixtures(): boolean {
  return getMarketplacePreviewReason() !== null;
}

function record(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.map(record).filter((item): item is Record<string, unknown> => item !== null)
    : [];
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function getServiceRecords(value: unknown): TechnicianService[] {
  return records(value).flatMap((item) => {
    const service = record(item.service);
    if (!service) return [];
    const category = record(service.category);
    return [{
      id: stringValue(item.id) ?? stringValue(service.id) ?? stringValue(service.slug) ?? 'service',
      name: stringValue(service.name) ?? 'Layanan',
      categoryName: stringValue(category?.name) ?? 'Layanan rumah',
      categorySlug: stringValue(category?.slug) ?? stringValue(service.slug) ?? '',
      description: stringValue(item.description) ?? stringValue(service.description),
      startingPrice: numberValue(item.starting_price),
      estimatedDurationMinutes: numberValue(item.estimated_duration_minutes),
      isActive: booleanValue(item.is_active) ?? true,
    }];
  });
}

function getAreaNames(value: unknown): string[] {
  return records(value)
    .map((item) => stringValue(record(item.service_area)?.name))
    .filter((name): name is string => name !== undefined);
}

function imageUrl(value: unknown): string | undefined {
  const candidate = stringValue(value);
  if (!candidate) return undefined;
  if (candidate.startsWith('file://') || candidate.startsWith('content://')) {
    return candidate;
  }
  try {
    return new URL(candidate).protocol === 'https:' ? candidate : undefined;
  } catch {
    return undefined;
  }
}

export function mapTechnician(
  row: Record<string, unknown>,
  profile?: Record<string, unknown>,
  portfolio: PortfolioItem[] = [],
  reviews: TechnicianReview[] = [],
  availabilitySchedule?: TechnicianAvailabilitySlot[],
): Technician {
  const themeValue = row.profile_theme;
  return {
    id: stringValue(row.user_id) ?? '',
    displayName: stringValue(profile?.display_name) ?? stringValue(row.business_name) ?? 'Teknisi Cepat',
    businessName: stringValue(row.business_name),
    headline: stringValue(row.headline),
    bio: stringValue(row.bio),
    avatarUri: imageUrl(profile?.avatar_path),
    yearsExperience: numberValue(row.years_experience),
    verified: booleanValue(row.is_verified) ?? false,
    available: booleanValue(row.is_available) ?? false,
    averageRating: numberValue(row.average_rating) ?? 0,
    reviewCount: numberValue(row.review_count) ?? 0,
    completedJobsCount: numberValue(row.completed_jobs_count) ?? 0,
    services: getServiceRecords(row.services),
    serviceAreas: getAreaNames(row.areas),
    portfolio,
    reviews,
    ...(availabilitySchedule ? { availabilitySchedule } : {}),
    theme: normalizeProfileTheme(themeValue),
  };
}

export function isSchemaPermissionError(
  error: { message?: string; code?: string } | null | undefined,
): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  const code = (error.code ?? '').toUpperCase();
  return (
    code === '42501' ||
    code === '42P01' ||
    msg.includes('permission denied for schema') ||
    msg.includes('permission denied for table') ||
    msg.includes('permission denied for relation') ||
    msg.includes('does not exist') ||
    msg.includes('schema cache')
  );
}

function throwIfError(error: { message: string; code?: string } | null): void {
  if (error && !isSchemaPermissionError(error)) throw new Error(error.message);
}

export function isUuid(value: string | undefined): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

export async function loadCategories(): Promise<MarketplaceData<ServiceCategory>> {
  if (shouldUseFixtures()) return { items: fixtureCategories, source: FIXTURE_SOURCE };
  if (!supabase) throw new Error(supabaseConfigurationError);

  const { data, error } = await supabase
    .from('service_categories')
    .select('id, name, slug, description, icon_name')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (isSchemaPermissionError(error)) {
    return { items: fixtureCategories, source: FIXTURE_SOURCE };
  }
  throwIfError(error);

  const items = records(data).flatMap((item) => {
    const id = stringValue(item.id);
    const name = stringValue(item.name);
    const slug = stringValue(item.slug);
    if (!id || !name || !slug) return [];
    const iconKey = (stringValue(item.icon_name) ?? slug).toLocaleLowerCase('id-ID');
    return [{
      id,
      name,
      slug,
      description: stringValue(item.description),
      icon: CATEGORY_ICONS[iconKey] ?? CATEGORY_ICONS[slug] ?? 'home-maintenance',
    }];
  });

  if (items.length === 0) {
    return { items: fixtureCategories, source: FIXTURE_SOURCE };
  }

  return {
    items,
    source: SUPABASE_SOURCE,
  };
}

export async function loadServiceAreas(): Promise<MarketplaceData<string>> {
  const fixtureAreas = Array.from(
    new Set([
      ...fixtureTechnicians.flatMap((technician) => technician.serviceAreas),
      ...indonesianRegions.map((region) => region.areaName ?? region.name),
    ]),
  ).sort();

  if (shouldUseFixtures()) {
    return { items: fixtureAreas, source: FIXTURE_SOURCE };
  }
  if (!supabase) throw new Error(supabaseConfigurationError);

  const { data, error } = await supabase
    .from('service_areas')
    .select('name')
    .eq('is_active', true)
    .order('name', { ascending: true });
  if (isSchemaPermissionError(error)) {
    return { items: fixtureAreas, source: FIXTURE_SOURCE };
  }
  throwIfError(error);

  const liveAreas = Array.from(
    new Set(
      records(data)
        .map((item) => stringValue(item.name))
        .filter((name): name is string => Boolean(name)),
    ),
  );

  if (liveAreas.length === 0) {
    return { items: fixtureAreas, source: FIXTURE_SOURCE };
  }

  return {
    items: Array.from(new Set([...liveAreas, ...fixtureAreas])).sort(),
    source: SUPABASE_SOURCE,
  };
}

export function getIndonesianRegions(): IndonesianRegion[] {
  return indonesianRegions;
}

export async function loadTechnicians(
  offset = 0,
  pageSize = PAGE_SIZE,
): Promise<Page<Technician>> {
  if (shouldUseFixtures()) {
    const items = fixtureTechnicians.slice(offset, offset + pageSize);
    return { items, hasMore: offset + pageSize < fixtureTechnicians.length, source: FIXTURE_SOURCE };
  }
  if (!supabase) throw new Error(supabaseConfigurationError);

  let data: unknown = null;
  try {
    const joinedResult = await supabase
      .from('technician_profiles')
      .select(TECHNICIAN_PROFILE_SELECT)
      .range(offset, offset + pageSize - 1)
      .order('average_rating', { ascending: false });

    if (joinedResult.error) {
      const simpleResult = await supabase
        .from('technician_profiles')
        .select('*')
        .range(offset, offset + pageSize - 1);
      data = simpleResult.data ?? [];
    } else {
      data = joinedResult.data;
    }
  } catch {
    data = [];
  }

  let profileRows = records(data);
  if (profileRows.length === 0) {
    try {
      const { data: techRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'technician');
      if (Array.isArray(techRoles) && techRoles.length > 0) {
        profileRows = techRoles.map((r) => ({ user_id: r.user_id, is_available: true }));
      }
    } catch {}
  }

  if (profileRows.length === 0) {
    return {
      items: [],
      hasMore: false,
      source: SUPABASE_SOURCE,
    };
  }

  const ids = profileRows.map((item) => stringValue(item.user_id)).filter((id): id is string => Boolean(id));
  const profileResult = ids.length
    ? await supabase.from('profiles').select('id, display_name, avatar_path').in('id', ids)
    : { data: [], error: null };
  if (profileResult.error && !isSchemaPermissionError(profileResult.error)) {
    throwIfError(profileResult.error);
  }

  const profileById = new Map(
    records(profileResult.data).flatMap((item) => {
      const id = stringValue(item.id);
      return id ? [[id, item] as const] : [];
    }),
  );

  return {
    items: profileRows.map((item) => {
      const id = stringValue(item.user_id) ?? '';
      return mapTechnician(item, profileById.get(id));
    }).filter((technician) => technician.id.length > 0),
    hasMore: profileRows.length === pageSize,
    source: SUPABASE_SOURCE,
  };
}

export async function loadTechnician(id: string): Promise<{ item: Technician | null; source: DataSource }> {
  if (shouldUseFixtures()) {
    const fixtureMatch = fixtureTechnicians.find((technician) => technician.id === id);
    return {
      item: fixtureMatch ?? null,
      source: FIXTURE_SOURCE,
    };
  }
  if (!supabase) throw new Error(supabaseConfigurationError);
  if (!isUuid(id)) {
    const fixtureMatch = fixtureTechnicians.find((t) => t.id === id);
    if (fixtureMatch) {
      return { item: fixtureMatch, source: SUPABASE_SOURCE };
    }
    return {
      item: {
        id,
        displayName: id === 'demo-customer' ? 'Pelanggan Cepat' : 'Teknisi Cepat',
        verified: false,
        available: true,
        averageRating: 5,
        reviewCount: 0,
        completedJobsCount: 0,
        services: [
          {
            id: `srv-${id}`,
            name: 'Layanan Rumah',
            categoryName: 'Perbaikan Rumah',
            categorySlug: 'plumbing',
            startingPrice: 100000,
          },
        ],
        serviceAreas: ['Jakarta Selatan'],
        portfolio: [],
        reviews: [],
        theme: 'sand',
      },
      source: SUPABASE_SOURCE,
    };
  }

  let data: unknown = null;
  try {
    const joinedResult = await supabase
      .from('technician_profiles')
      .select(TECHNICIAN_PROFILE_SELECT)
      .eq('user_id', id)
      .maybeSingle();

    if (joinedResult.error) {
      const simpleResult = await supabase
        .from('technician_profiles')
        .select('*')
        .eq('user_id', id)
        .maybeSingle();
      data = simpleResult.data;
    } else {
      data = joinedResult.data;
    }
  } catch {
    data = null;
  }

  let profileRecord: Record<string, unknown> | null = null;
  try {
    const profileResult = await supabase
      .from('profiles')
      .select('id, display_name, avatar_path')
      .eq('id', id)
      .maybeSingle();
    profileRecord = record(profileResult.data);
  } catch {
    profileRecord = null;
  }

  const row = record(data);
  if (!row) {
    return {
      item: {
        id,
        displayName: stringValue(profileRecord?.display_name) ?? 'Pengguna Cepat',
        avatarUri: imageUrl(profileRecord?.avatar_path),
        verified: false,
        available: false,
        averageRating: 0,
        reviewCount: 0,
        completedJobsCount: 0,
        services: [],
        serviceAreas: [],
        portfolio: [],
        reviews: [],
        theme: 'sand',
      },
      source: SUPABASE_SOURCE,
    };
  }

  let portfolioRows: Record<string, unknown>[] = [];
  let reviewRows: Record<string, unknown>[] = [];
  let availabilityRows: Record<string, unknown>[] = [];
  try {
    const [portfolioResult, reviewsResult, availabilityResult] = await Promise.all([
      supabase
        .from('technician_portfolio_items')
        .select('id, title, description, image_path')
        .eq('technician_user_id', id)
        .eq('is_published', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('reviews')
        .select('id, customer_user_id, rating, comment, created_at')
        .eq('technician_user_id', id)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('technician_availability')
        .select('weekday, start_time, end_time, is_available')
        .eq('technician_user_id', id)
        .order('weekday', { ascending: true }),
    ]);
    portfolioRows = records(portfolioResult.data);
    reviewRows = records(reviewsResult.data);
    availabilityRows = records(availabilityResult.data);
  } catch {}

  const customerIds = Array.from(new Set(
    reviewRows.map((item) => stringValue(item.customer_user_id)).filter((customerId): customerId is string => Boolean(customerId)),
  ));
  let customerNames = new Map<string, string>();
  if (customerIds.length > 0) {
    try {
      const customerResult = await supabase.from('profiles').select('id, display_name').in('id', customerIds);
      customerNames = new Map(
        records(customerResult.data).flatMap((item) => {
          const customerId = stringValue(item.id);
          const customerName = stringValue(item.display_name);
          return customerId && customerName ? [[customerId, customerName] as const] : [];
        }),
      );
    } catch {}
  }

  const portfolio = portfolioRows.flatMap((item) => {
    const itemId = stringValue(item.id);
    const title = stringValue(item.title);
    if (!itemId || !title) return [];
    return [{
      id: itemId,
      title,
      description: stringValue(item.description),
      imageUri: imageUrl(item.image_path),
    }];
  });
  const reviews = reviewRows.flatMap((item) => {
    const reviewId = stringValue(item.id);
    const rating = numberValue(item.rating);
    if (!reviewId || rating === undefined) return [];
    const customerId = stringValue(item.customer_user_id);
    return [{
      id: reviewId,
      rating,
      comment: stringValue(item.comment),
      customerName: (customerId && customerNames.get(customerId)) ?? 'Pelanggan Cepat',
      createdAt: stringValue(item.created_at),
    }];
  });
  const availabilitySchedule = availabilityRows.flatMap((item) => {
    const weekday = numberValue(item.weekday);
    const startTime = stringValue(item.start_time);
    const endTime = stringValue(item.end_time);
    if (weekday === undefined || !startTime || !endTime) return [];
    return [{
      weekday,
      startTime: startTime.slice(0, 5),
      endTime: endTime.slice(0, 5),
      isAvailable: booleanValue(item.is_available) ?? true,
    }];
  });

  return {
    item: mapTechnician(
      row,
      profileRecord ?? undefined,
      portfolio,
      reviews,
      availabilitySchedule.length ? availabilitySchedule : undefined,
    ),
    source: SUPABASE_SOURCE,
  };
}

export function resolveServiceAreaName(areaInput: string): string {
  const trimmed = areaInput.trim();
  if (!trimmed || trimmed === 'Semua area') return 'Semua area';
  const normalized = trimmed.toLocaleLowerCase('id-ID');
  const directRegion = indonesianRegions.find(
    (r) =>
      r.name.toLocaleLowerCase('id-ID') === normalized ||
      r.nameEn.toLocaleLowerCase('id-ID') === normalized,
  );
  if (directRegion) return directRegion.name;

  const exactParent = indonesianRegions.find(
    (r) =>
      r.districts.some((d) => d.toLocaleLowerCase('id-ID') === normalized) ||
      (r.neighborhoods ?? []).some((n) => n.toLocaleLowerCase('id-ID') === normalized),
  );
  if (exactParent) return exactParent.name;

  const partialParent = indonesianRegions.find(
    (r) =>
      r.districts.some((d) => d.toLocaleLowerCase('id-ID').includes(normalized)) ||
      (r.neighborhoods ?? []).some((n) => n.toLocaleLowerCase('id-ID').includes(normalized)),
  );
  return partialParent ? partialParent.name : trimmed;
}

export function filterTechnicians(
  technicians: Technician[],
  query: string,
  area: string,
  categorySlug?: string,
  options?: { prioritizeArea?: boolean },
): Technician[] {
  const normalizedQuery = query.trim().toLocaleLowerCase('id-ID');
  const resolvedArea = resolveServiceAreaName(area);

  const matches = (technician: Technician, ignoreArea = false) => {
    const matchesArea =
      ignoreArea ||
      area === 'Semua area' ||
      technician.serviceAreas.includes(area) ||
      technician.serviceAreas.includes(resolvedArea);
    const matchesCategory =
      !categorySlug ||
      technician.services.some((service) => service.categorySlug === categorySlug);
    const searchable = [
      technician.displayName,
      technician.businessName,
      technician.headline,
      technician.headlineEn,
      ...technician.serviceAreas,
      ...technician.services.map((service) => service.name),
      ...technician.services.map((service) => service.nameEn),
      ...technician.services.map((service) => service.categoryName),
      ...technician.services.map((service) => service.categoryNameEn),
    ]
      .filter((value): value is string => Boolean(value))
      .join(' ')
      .toLocaleLowerCase('id-ID');
    return matchesArea && matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
  };

  const exactMatches = technicians.filter((t) => matches(t, false));
  if (!options?.prioritizeArea || area === 'Semua area' || !area) {
    return exactMatches;
  }
  const otherMatches = technicians.filter(
    (t) => !exactMatches.some((m) => m.id === t.id) && matches(t, true),
  );
  return [...exactMatches, ...otherMatches];
}

export function formatRupiah(amount: number, language: 'id' | 'en' = 'id'): string {
  return new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}
