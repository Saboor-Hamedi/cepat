export type DataSource = 'fixtures' | 'supabase';

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon: string;
  imageUrl?: string;
  itemCount?: number;
}

export interface TechnicianService {
  id: string;
  name: string;
  nameEn?: string;
  categoryName: string;
  categoryNameEn?: string;
  categorySlug: string;
  description?: string;
  descriptionEn?: string;
  startingPrice?: number;
  estimatedDurationMinutes?: number;
  isActive?: boolean;
}

export interface PortfolioItem {
  id: string;
  title: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  imageUri?: string;
}

export interface TechnicianReview {
  id: string;
  technicianId?: string;
  bookingId?: string;
  customerName: string;
  rating: number;
  comment?: string;
  commentEn?: string;
  createdAt?: string;
}

export interface TechnicianAvailabilitySlot {
  weekday: number; // 0 = Minggu/Sunday .. 6 = Sabtu/Saturday
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export type ProfileThemePreset = 'sand' | 'sage' | 'clay';

export interface Technician {
  id: string;
  displayName: string;
  username?: string;
  businessName?: string;
  headline?: string;
  headlineEn?: string;
  bio?: string;
  bioEn?: string;
  avatarUri?: string;
  yearsExperience?: number;
  verified: boolean;
  available: boolean;
  averageRating: number;
  reviewCount: number;
  completedJobsCount: number;
  services: TechnicianService[];
  serviceAreas: string[];
  portfolio: PortfolioItem[];
  reviews: TechnicianReview[];
  availabilitySchedule?: TechnicianAvailabilitySlot[];
  theme: ProfileThemePreset;
}

export interface IndonesianRegion {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  areaName?: string;
  province: string;
  provinceEn: string;
  districts: string[];
  neighborhoods?: string[];
  latitude: number;
  longitude: number;
}

export interface SavedAddress {
  id: string;
  label: string;
  streetAddress: string;
  area: string;
  district?: string;
  province?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export type BookingStatus =
  | 'requested'
  | 'alternative_proposed'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'declined';

export interface BookingRecord {
  id: string;
  customerUserId: string;
  customerName: string;
  technicianUserId: string;
  technicianName: string;
  technicianBusinessName?: string;
  technicianServiceId?: string;
  serviceId?: string;
  serviceNameSnapshot: string;
  serviceDescription?: string;
  customerAddress: string;
  addressNotes?: string;
  serviceArea: string;
  customerLatitude?: number;
  customerLongitude?: number;
  requestedStartAt: string;
  agreedStartAt?: string;
  proposedStartAt?: string;
  workCompletedAt?: string;
  status: BookingStatus;
  customerNotes?: string;
  agreedPrice?: number;
  currency: 'IDR';
  customerAcceptedWorkDone?: boolean;
  cancellationReason?: string;
  reviewRating?: number;
  reviewComment?: string;
  createdAt: string;
  updatedAt: string;
  source: DataSource;
}

export interface BookingMessage {
  id: string;
  bookingId: string;
  senderUserId: string;
  senderRole: 'customer' | 'technician';
  senderName: string;
  body: string;
  kind?: 'text' | 'image' | 'system';
  attachmentUrl?: string;
  createdAt: string;
}

export interface TechnicianReport {
  id: string;
  reporterUserId: string;
  reportedTechnicianId: string;
  technicianName: string;
  bookingId?: string;
  category: 'quality' | 'safety' | 'off_platform' | 'no_show' | 'other';
  description: string;
  severity: 'low' | 'medium' | 'high';
  status: 'submitted' | 'under_review' | 'resolved';
  createdAt: string;
}

export interface UserPreferences {
  appearance: 'light' | 'dark' | 'system' | 'warm' | 'highContrast';
  notifications: {
    push: boolean;
    booking: boolean;
    messages: boolean;
  };
  accessibility: {
    largeText: boolean;
    reduceMotion: boolean;
  };
  bookingPreferences: {
    preferredTimeWindow: 'morning' | 'afternoon' | 'flexible';
    defaultNotes: string;
  };
}

export interface TechnicianPost {
  id: string;
  technicianId: string;
  technicianName: string;
  technicianUsername?: string;
  technicianBusinessName?: string;
  technicianAvatarUri?: string;
  technicianVerified: boolean;
  categorySlug: string;
  serviceArea: string;
  caption: string;
  content?: string;
  imageUri?: string;
  mediaUrls?: string[];
  isServicePost?: boolean;
  published: boolean;
  suspended?: boolean;
  suspendedAt?: string;
  accountStatus?: 'active' | 'restricted' | 'suspended' | 'blocked';
  createdAt: string;
  updatedAt?: string;
}

export interface Page<T> {
  items: T[];
  hasMore: boolean;
  nextCursor?: string | null;
  source: DataSource;
}

export interface MarketplaceData<T> {
  items: T[];
  source: DataSource;
}

// ============================================================================
// Marketplace Redesign Types (Home / Browse, Search, Profile, & Design System)
// ============================================================================

/** Supported marketplace themes */
export type MarketplaceThemeName = 'light' | 'dark' | 'system';

/**
 * Design system color tokens matching quick.md specifications.
 */
export interface MarketplaceThemeTokens {
  background: string;
  surface: string;
  surfaceSecondary: string;
  primary: string;
  primaryLight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  searchBarBg: string;
  chipBg: string;
  badgeFeaturedBg?: string;
  badgeFeaturedText?: string;
  safetyBannerBg?: string;
  safetyBannerText?: string;
}

/** Top Header Bar location indicator */
export interface MarketplaceHeaderLocation {
  id?: string;
  cityName: string;
  stateOrProvince?: string;
  displayLabel: string;
  latitude?: number;
  longitude?: number;
}

/** Seller summary embedded in ads and featured cards */
export interface MarketplaceSeller {
  id: string;
  name: string;
  avatarUri?: string;
  rating: number;
  reviewCount?: number;
  verified?: boolean;
}

/**
 * Screen 1 (Browse / Home): Featured Ad Carousel item
 */
export interface MarketplaceFeaturedAd {
  id: string;
  title: string;
  titleEn?: string;
  imageUrl: string;
  price: number;
  originalPrice?: number;
  badgeLabel?: string; // e.g. "⚡ FEATURED"
  seller: MarketplaceSeller;
  categorySlug: string;
  location: string;
  createdAt?: string;
}

/**
 * Screen 1 (Browse / Home): 3-column square category card
 */
export interface MarketplaceCategoryCard {
  id: string;
  name: string;
  nameEn?: string;
  slug: string;
  imageUrl: string;
  icon?: string;
  itemCount?: number;
}

/**
 * Screen 1 (Browse / Home): Safety Tip banner
 */
export interface MarketplaceSafetyTip {
  id: string;
  title: string;
  subtitle: string;
  icon?: string;
  actionUrl?: string;
}

/**
 * Screen 1 (Browse / Home) & Screen 2 (Search): Fresh near you / Ad list card
 */
export interface MarketplaceFreshAd {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  thumbnailUrl: string;
  location: string;
  timeAgo: string;
  isFavorite?: boolean;
  categorySlug?: string;
  sellerId?: string;
  sellerName?: string;
  sellerAvatarUri?: string;
  sellerRating?: number;
  createdAt?: string;
}

/**
 * Screen 1 (Browse / Home): Aggregated home screen feed payload
 */
export interface MarketplaceHomeFeedData {
  location: MarketplaceHeaderLocation;
  featuredAds: MarketplaceFeaturedAd[];
  categories: MarketplaceCategoryCard[];
  safetyTip: MarketplaceSafetyTip;
  freshAds: MarketplaceFreshAd[];
  totalFreshAdsCount?: number;
}

/**
 * Screen 2: Trending searches chip
 */
export interface MarketplaceTrendingSearch {
  id: string;
  term: string;
  categorySlug?: string;
  isTrending?: boolean;
}

/**
 * Screen 2: Sort options
 */
export type MarketplaceSortOption = 'newest' | 'price_asc' | 'price_desc' | 'popular';

/**
 * Screen 2: Search criteria and active filters
 */
export interface MarketplaceSearchFilter {
  query: string;
  categorySlug?: string;
  sort: MarketplaceSortOption;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
}

/**
 * Screen 3: Profile statistics
 */
export interface MarketplaceProfileStats {
  activeAdsCount: number;
  totalViewsCount: number;
  soldCount: number;
}

/**
 * Screen 3: User profile information
 */
export interface MarketplaceProfileUser {
  id: string;
  username: string;
  displayName: string;
  avatarUri?: string;
  isVerified: boolean;
  location: string;
  rating: number;
  memberSinceYear: number;
  bio?: string;
  stats: MarketplaceProfileStats;
}

/**
 * Screen 3: Profile menu item
 */
export interface MarketplaceProfileMenuItem {
  id: string;
  icon: string;
  title: string;
  subtitle?: string;
  badge?: string | number;
  route?: string;
  action?: () => void;
}

/**
 * Screen 3: Grouped profile menu section (Selling, Shopping, Account)
 */
export interface MarketplaceProfileMenuSection {
  key: 'selling' | 'shopping' | 'account';
  title: string;
  items: MarketplaceProfileMenuItem[];
}

/**
 * Bottom Navigation Bar tabs (5 tabs)
 */
export type MarketplaceBottomTab = 'browse' | 'search' | 'sell' | 'inbox' | 'profile';

/**
 * Navigation item definition for the 5-tab bottom bar
 */
export interface MarketplaceBottomNavItem {
  key: MarketplaceBottomTab;
  label: string;
  icon: string;
  isCenterAction?: boolean; // Circular elevated "+" button for "Sell"
  badgeCount?: number;
}
