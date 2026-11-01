import { fixtureBookings, fixtureCategories, fixtureTechnicians } from './fixtures';
import { shouldUseFixtures, supabase } from './marketplaceRepository';
import { loadBookings } from './marketplaceStore';
import { getStoredJson, setStoredJson } from '../storage/kvStorage';
import type {
  BookingRecord,
  BookingStatus,
  ServiceCategory,
  TechnicianReport,
} from '../types/marketplace';

const REPORTS_STORAGE_KEY = '@cepat/submitted-reports';
const ADMIN_ACCOUNTS_KEY = '@cepat/admin-accounts';
const ADMIN_APPLICATIONS_KEY = '@cepat/admin-tech-applications';
const ADMIN_CATEGORIES_KEY = '@cepat/admin-categories';

export type AccountStatus = 'active' | 'restricted' | 'suspended' | 'blocked';

export interface AdminAccountRecord {
  id: string;
  displayName: string;
  email: string;
  role: 'customer' | 'technician';
  area: string;
  status: AccountStatus;
  verified: boolean;
  moderationReason?: string;
  updatedAt: string;
}

export interface AdminUserCounts {
  customers: number;
  technicians: number;
  restrictedAccounts: number;
  source: 'fixtures' | 'supabase';
}

export interface AdminTechnicianApplication {
  id: string;
  userId: string;
  applicantName: string;
  businessName: string;
  email: string;
  serviceArea: string;
  PrimaryCategory: string;
  yearsExperience: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewNotes?: string;
  submittedAt: string;
}

export interface AdminReportRecord extends Omit<TechnicianReport, 'status'> {
  status: TechnicianReport['status'] | 'dismissed';
  adminNotes?: string;
  resolvedBy?: string;
  updatedAt?: string;
}

const DEFAULT_REPORTS: AdminReportRecord[] = [
  {
    id: 'report-seed-1',
    reporterUserId: 'cust-andi',
    reportedTechnicianId: 'demo-budi',
    technicianName: 'Budi Santoso (Kelistrikan Prima)',
    bookingId: 'booking-demo-1',
    category: 'off_platform',
    description:
      'Technician requested additional cash fee outside the agreed inspection quote without prior explanation.',
    severity: 'high',
    status: 'submitted',
    createdAt: '2026-10-28T09:15:00.000Z',
  },
  {
    id: 'report-seed-2',
    reporterUserId: 'cust-siti',
    reportedTechnicianId: 'demo-hendra',
    technicianName: 'Hendra Wijaya (Kunci Aman 24 Jam)',
    category: 'quality',
    description: 'Arrived 45 minutes after the confirmed afternoon service window.',
    severity: 'medium',
    status: 'under_review',
    adminNotes: 'Checking technician schedule logs and customer chat timestamps.',
    createdAt: '2026-10-27T14:20:00.000Z',
  },
];

const DEFAULT_ACCOUNTS: AdminAccountRecord[] = [
  {
    id: 'cust-andi',
    displayName: 'Andi Wijaya',
    email: 'andi.wijaya@example.id',
    role: 'customer',
    area: 'Jakarta Selatan',
    status: 'active',
    verified: true,
    updatedAt: '2026-10-25T10:00:00.000Z',
  },
  {
    id: 'cust-siti',
    displayName: 'Siti Rahma',
    email: 'siti.rahma@example.id',
    role: 'customer',
    area: 'Bandung',
    status: 'active',
    verified: true,
    updatedAt: '2026-10-26T11:30:00.000Z',
  },
  {
    id: 'cust-spam',
    displayName: 'Doni Pratama',
    email: 'doni.spam@example.id',
    role: 'customer',
    area: 'Jakarta Barat',
    status: 'restricted',
    verified: false,
    moderationReason: 'Repeatedly shared external promotional links in booking chat.',
    updatedAt: '2026-10-27T08:00:00.000Z',
  },
  ...fixtureTechnicians.slice(0, 6).map((tech): AdminAccountRecord => ({
    id: tech.id,
    displayName: tech.businessName
      ? `${tech.displayName} (${tech.businessName})`
      : tech.displayName,
    email: `${tech.id.replace(/[^a-z0-9]/g, '.')}@teknisi.cepat.id`,
    role: 'technician',
    area: tech.serviceAreas[0] ?? 'Jakarta Selatan',
    status: 'active',
    verified: tech.verified,
    updatedAt: '2026-10-28T08:00:00.000Z',
  })),
];

const DEFAULT_APPLICATIONS: AdminTechnicianApplication[] = [
  {
    id: 'app-tech-1',
    userId: 'user-tech-fajar',
    applicantName: 'Fajar Nugroho',
    businessName: 'Fajar Teknik AC & Listrik',
    email: 'fajar.teknik@example.id',
    serviceArea: 'Jakarta Timur',
    PrimaryCategory: 'Electrical',
    yearsExperience: 7,
    status: 'pending',
    submittedAt: '2026-10-29T07:30:00.000Z',
  },
  {
    id: 'app-tech-2',
    userId: 'user-tech-wahyu',
    applicantName: 'Wahyu Saputra',
    businessName: 'Berkah Pipa Nusantara',
    email: 'wahyu.pipa@example.id',
    serviceArea: 'Depok',
    PrimaryCategory: 'Plumbing',
    yearsExperience: 5,
    status: 'pending',
    submittedAt: '2026-10-28T16:45:00.000Z',
  },
  {
    id: 'app-tech-3',
    userId: 'demo-rizky',
    applicantName: 'Rizky Pratama',
    businessName: 'Rizky Plumbing & Sanitasi',
    email: 'rizky.pratama@teknisi.cepat.id',
    serviceArea: 'Jakarta Selatan',
    PrimaryCategory: 'Plumbing',
    yearsExperience: 8,
    status: 'approved',
    reviewNotes: 'Identity and portfolio verified by Cepat Trust & Safety.',
    submittedAt: '2026-10-15T09:00:00.000Z',
  },
];

export async function loadAdminReports(): Promise<AdminReportRecord[]> {
  const stored = await getStoredJson<AdminReportRecord[]>(REPORTS_STORAGE_KEY, []);
  if (stored.length === 0) {
    await setStoredJson(REPORTS_STORAGE_KEY, DEFAULT_REPORTS);
    return DEFAULT_REPORTS;
  }
  const existingIds = new Set(stored.map((item) => item.id));
  const merged = [
    ...stored,
    ...DEFAULT_REPORTS.filter((seed) => !existingIds.has(seed.id)),
  ];
  return merged;
}

export async function updateAdminReportStatus(
  reportId: string,
  status: AdminReportRecord['status'],
  adminNotes?: string,
): Promise<AdminReportRecord[]> {
  const current = await loadAdminReports();
  const updated = current.map((rep) =>
    rep.id === reportId
      ? {
          ...rep,
          status,
          adminNotes: adminNotes !== undefined ? adminNotes.trim() : rep.adminNotes,
          updatedAt: new Date().toISOString(),
        }
      : rep,
  );
  await setStoredJson(REPORTS_STORAGE_KEY, updated);

  if (supabase) {
    try {
      await supabase
        .from('technician_reports')
        .update({ status })
        .eq('id', reportId);
    } catch {
      // Local storage remains authoritative in offline/fixture mode.
    }
  }
  return updated;
}

export async function loadAdminAccounts(): Promise<AdminAccountRecord[]> {
  return getStoredJson<AdminAccountRecord[]>(ADMIN_ACCOUNTS_KEY, DEFAULT_ACCOUNTS);
}

export async function loadAdminUserCounts(): Promise<AdminUserCounts> {
  if (!supabase || shouldUseFixtures()) {
    const accounts = await loadAdminAccounts();
    return {
      customers: accounts.filter((account) => account.role === 'customer').length,
      technicians: accounts.filter((account) => account.role === 'technician').length,
      restrictedAccounts: accounts.filter((account) => account.status !== 'active').length,
      source: 'fixtures',
    };
  }

  const [customers, technicians, restrictedAccounts] = await Promise.all([
    supabase
      .from('user_roles')
      .select('user_id', { count: 'exact', head: true })
      .eq('role', 'customer'),
    supabase
      .from('user_roles')
      .select('user_id', { count: 'exact', head: true })
      .eq('role', 'technician'),
    supabase
      .from('user_account_status')
      .select('user_id', { count: 'exact', head: true })
      .neq('status', 'active'),
  ]);
  if (customers.error) {
    throw new Error(`Could not load customer count: ${customers.error.message}`);
  }
  if (technicians.error) {
    throw new Error(`Could not load technician count: ${technicians.error.message}`);
  }
  if (restrictedAccounts.error) {
    throw new Error(
      `Could not load restricted account count: ${restrictedAccounts.error.message}`,
    );
  }
  if (
    customers.count === null ||
    technicians.count === null ||
    restrictedAccounts.count === null
  ) {
    throw new Error('Supabase did not return exact user-role counts.');
  }

  return {
    customers: customers.count,
    technicians: technicians.count,
    restrictedAccounts: restrictedAccounts.count,
    source: 'supabase',
  };
}

export async function updateAdminAccountModeration(
  accountId: string,
  status: AccountStatus,
  moderationReason?: string,
): Promise<AdminAccountRecord[]> {
  const current = await loadAdminAccounts();
  const updated = current.map((acc) =>
    acc.id === accountId
      ? {
          ...acc,
          status,
          moderationReason:
            status === 'active'
              ? undefined
              : moderationReason?.trim() || acc.moderationReason || 'Moderated by Admin',
          updatedAt: new Date().toISOString(),
        }
      : acc,
  );
  await setStoredJson(ADMIN_ACCOUNTS_KEY, updated);

  // Sync with in-memory fixtureTechnicians so blocked/suspended technicians reflect in marketplace
  const techIndex = fixtureTechnicians.findIndex((t) => t.id === accountId);
  if (techIndex >= 0) {
    fixtureTechnicians[techIndex] = {
      ...fixtureTechnicians[techIndex],
      available: status === 'active',
    };
  }

  return updated;
}

export async function toggleAdminTechnicianVerified(
  accountId: string,
): Promise<AdminAccountRecord[]> {
  const current = await loadAdminAccounts();
  const updated = current.map((acc) =>
    acc.id === accountId
      ? {
          ...acc,
          verified: !acc.verified,
          updatedAt: new Date().toISOString(),
        }
      : acc,
  );
  await setStoredJson(ADMIN_ACCOUNTS_KEY, updated);

  const techIndex = fixtureTechnicians.findIndex((t) => t.id === accountId);
  if (techIndex >= 0) {
    fixtureTechnicians[techIndex] = {
      ...fixtureTechnicians[techIndex],
      verified: !fixtureTechnicians[techIndex].verified,
    };
  }
  return updated;
}

export async function loadAdminApplications(): Promise<AdminTechnicianApplication[]> {
  return getStoredJson<AdminTechnicianApplication[]>(
    ADMIN_APPLICATIONS_KEY,
    DEFAULT_APPLICATIONS,
  );
}

export async function updateAdminApplicationStatus(
  applicationId: string,
  status: 'approved' | 'rejected',
  reviewNotes?: string,
): Promise<AdminTechnicianApplication[]> {
  const current = await loadAdminApplications();
  const updated = current.map((app) =>
    app.id === applicationId
      ? {
          ...app,
          status,
          reviewNotes:
            reviewNotes?.trim() ||
            (status === 'approved'
              ? 'Approved by Cepat Administrator.'
              : 'Rejected by Cepat Administrator.'),
        }
      : app,
  );
  await setStoredJson(ADMIN_APPLICATIONS_KEY, updated);
  return updated;
}

export async function loadAdminBookings(): Promise<BookingRecord[]> {
  if (supabase && !shouldUseFixtures()) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      throw new Error(`Could not load platform bookings: ${error.message}`);
    }

    const rows = Array.isArray(data) ? data : [];
    const userIds = [
      ...new Set(
        rows.flatMap((row) => [
          String(row.customer_user_id ?? ''),
          String(row.technician_user_id ?? ''),
        ]),
      ),
    ].filter(Boolean);
    let nameById = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds);
      if (profileError) {
        throw new Error(`Could not load booking participant names: ${profileError.message}`);
      }
      nameById = new Map(
        (profiles ?? []).map((profile) => [
          String(profile.id),
          String(profile.display_name),
        ]),
      );
    }

    return rows.map((row) => ({
      id: String(row.id ?? ''),
      customerUserId: String(row.customer_user_id ?? ''),
      customerName:
        nameById.get(String(row.customer_user_id ?? '')) ?? 'Cepat Customer',
      technicianUserId: String(row.technician_user_id ?? ''),
      technicianName:
        nameById.get(String(row.technician_user_id ?? '')) ?? 'Cepat Technician',
      technicianServiceId: row.technician_service_id
        ? String(row.technician_service_id)
        : undefined,
      serviceId: row.service_id ? String(row.service_id) : undefined,
      serviceNameSnapshot: String(row.service_name_snapshot ?? 'Home service'),
      serviceDescription: row.service_description
        ? String(row.service_description)
        : undefined,
      customerAddress: String(row.customer_address ?? ''),
      addressNotes: row.address_notes ? String(row.address_notes) : undefined,
      serviceArea: 'Jakarta Selatan',
      requestedStartAt: String(row.requested_start_at ?? row.created_at ?? ''),
      agreedStartAt: row.agreed_start_at ? String(row.agreed_start_at) : undefined,
      proposedStartAt: row.proposed_start_at ? String(row.proposed_start_at) : undefined,
      status: (row.status as BookingStatus | null) ?? 'requested',
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
    }));
  }

  const bookings = await loadBookings();
  return bookings.length > 0 ? bookings : fixtureBookings;
}

export async function adminOverrideBookingStatus(
  bookingId: string,
  status: BookingRecord['status'],
): Promise<BookingRecord[]> {
  const bookings = await loadAdminBookings();
  if (supabase && !shouldUseFixtures()) {
    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId);
    if (error) {
      throw new Error(`Could not update booking status: ${error.message}`);
    }
  }
  const updated = bookings.map((b) =>
    b.id === bookingId
      ? {
          ...b,
          status,
          updatedAt: new Date().toISOString(),
        }
      : b,
  );
  await setStoredJson('@cepat/bookings', updated);
  return updated;
}

export async function loadAdminCategories(): Promise<ServiceCategory[]> {
  return getStoredJson<ServiceCategory[]>(ADMIN_CATEGORIES_KEY, fixtureCategories);
}

export async function addAdminServiceCategory(input: {
  name: string;
  description: string;
  icon: string;
}): Promise<ServiceCategory[]> {
  const name = input.name.trim();
  if (!name) throw new Error('invalid_category_name');
  const current = await loadAdminCategories();
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const nextCategory: ServiceCategory = {
    id: `cat-${Date.now()}`,
    slug: slug || `category-${Date.now()}`,
    name,
    description: input.description.trim() || `${name} home services`,
    icon: input.icon.trim() || 'wrench',
  };
  const updated = [...current, nextCategory];
  await setStoredJson(ADMIN_CATEGORIES_KEY, updated);
  return updated;
}
