import type {
  AccountStatus,
  AdminAccountRecord,
  AdminDeletionFeedback,
  AdminPerformanceMetrics,
  AdminReportRecord,
  AdminTechnicianApplication,
  AdminUserCounts,
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
  | 'categories';

export interface DashboardState {
  reports: AdminReportRecord[];
  accounts: AdminAccountRecord[];
  applications: AdminTechnicianApplication[];
  bookings: BookingRecord[];
  categories: ServiceCategory[];
  userCounts: AdminUserCounts | null;
  deletionFeedbacks: AdminDeletionFeedback[];
  metrics: AdminPerformanceMetrics;
  loading: boolean;
  refreshing: boolean;
  loadError: string | null;
  adminNotice: string | null;
}
