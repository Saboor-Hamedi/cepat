import type {
  AccountStatus,
  AdminAccountRecord,
  AdminDeletionFeedback,
  AdminPerformanceMetrics,
  AdminReportRecord,
  AdminTechnicianApplication,
  AdminUserCounts,
  PlatformSettings,
} from '../data/adminStore';
import type { BookingRecord, ServiceCategory } from '../types/marketplace';

export type DashboardTab =
  | 'dashboard'
  | 'reports'
  | 'delete-user'
  | 'performance'
  | 'accounts'
  | 'approvals'
  | 'bookings'
  | 'categories'
  | 'tax';

export interface DashboardState {
  reports: AdminReportRecord[];
  accounts: AdminAccountRecord[];
  applications: AdminTechnicianApplication[];
  bookings: BookingRecord[];
  categories: ServiceCategory[];
  platformSettings?: PlatformSettings;
  userCounts: AdminUserCounts | null;
  deletionFeedbacks: AdminDeletionFeedback[];
  metrics: AdminPerformanceMetrics;
  loading: boolean;
  refreshing: boolean;
  loadError: string | null;
  adminNotice: string | null;
}
