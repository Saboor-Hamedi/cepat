export type DataSource = 'fixtures' | 'supabase';

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon: string;
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
