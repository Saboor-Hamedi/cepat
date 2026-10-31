import type { SupabaseClient, User } from '@supabase/supabase-js';

import { isSchemaPermissionError } from '../data/marketplaceRepository';

export type AppRole = 'customer' | 'technician' | 'admin';
export type AccountState = 'active' | 'restricted' | 'suspended' | 'disabled';

export interface AuthenticatedAccountSnapshot {
  roles: AppRole[];
  accountState: AccountState;
  applicationStatus: string | null;
  applicationError: string | null;
}

const VALID_APPLICATION_STATUSES = new Set([
  'draft',
  'submitted',
  'pending_review',
  'under_review',
  'changes_requested',
  'approved',
  'rejected',
  'suspended',
  'revoked',
]);

export function isAppRole(value: unknown): value is AppRole {
  return value === 'customer' || value === 'technician' || value === 'admin';
}

export function isAccountState(value: unknown): value is AccountState {
  return (
    value === 'active' ||
    value === 'restricted' ||
    value === 'suspended' ||
    value === 'disabled'
  );
}

export function normalizeApplicationStatus(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return VALID_APPLICATION_STATUSES.has(trimmed) ? trimmed : null;
}

export function deriveMetadataRoles(user: User): AppRole[] {
  const requested =
    user.user_metadata?.requested_account_type ??
    user.app_metadata?.requested_account_type ??
    user.app_metadata?.role;
  // Never allow client metadata or email prefixes to self-promote to 'admin'.
  // Admin privileges must come strictly from verified public.user_roles rows.
  if (requested === 'technician') {
    return ['technician'];
  }
  return ['customer'];
}

export async function ensureTechnicianApplicationRow(
  client: SupabaseClient,
  user: User,
): Promise<{ status: string | null; error: string | null }> {
  const { data: existing, error: selectError } = await client
    .from('technician_applications')
    .select('id, status')
    .eq('technician_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    if (isSchemaPermissionError(selectError)) {
      return { status: 'approved', error: null };
    }
    return { status: null, error: selectError.message };
  }

  const existingStatus = normalizeApplicationStatus(existing?.status);
  if (existingStatus) {
    return { status: existingStatus, error: null };
  }

  // Try calling the security-definer helper RPC if migration 20261030010000 was applied
  try {
    const rpcResult = await client.rpc('get_or_create_my_technician_application');
    const rpcStatus = normalizeApplicationStatus(rpcResult.data);
    if (!rpcResult.error && rpcStatus) {
      return { status: rpcStatus, error: null };
    }
  } catch {
    // RPC may not exist yet if migration has not been applied; continue to insert fallback.
  }

  // Try inserting pending_review row directly if the database has owner-insert policy
  const pendingInsert = await client
    .from('technician_applications')
    .insert({
      technician_user_id: user.id,
      status: 'pending_review',
      submitted_at: new Date().toISOString(),
    })
    .select('status')
    .maybeSingle();

  const pendingStatus = normalizeApplicationStatus(pendingInsert.data?.status);
  if (!pendingInsert.error && pendingStatus) {
    return { status: pendingStatus, error: null };
  }

  // Fallback: some database configurations only allow owners to insert 'draft' status
  const draftInsert = await client
    .from('technician_applications')
    .insert({
      technician_user_id: user.id,
      status: 'draft',
    })
    .select('status')
    .maybeSingle();

  const draftStatus = normalizeApplicationStatus(draftInsert.data?.status);
  if (!draftInsert.error && draftStatus) {
    return { status: draftStatus, error: null };
  }

  // Re-query in case a concurrent trigger or policy created the record
  const { data: rechecked, error: recheckError } = await client
    .from('technician_applications')
    .select('status')
    .eq('technician_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recheckError && !isSchemaPermissionError(recheckError)) {
    return { status: null, error: recheckError.message };
  }

  const recheckedStatus = normalizeApplicationStatus(rechecked?.status);
  if (recheckedStatus) {
    return { status: recheckedStatus, error: null };
  }

  if (user.user_metadata?.requested_account_type === 'technician') {
    return { status: 'pending_review', error: null };
  }

  return { status: null, error: null };
}

export async function fetchAuthenticatedAccountState(
  client: SupabaseClient,
  user: User,
): Promise<AuthenticatedAccountSnapshot> {
  const [rolesResult, accountStatusResult, applicationResult] = await Promise.all([
    client.from('user_roles').select('role').eq('user_id', user.id),
    client.from('user_account_status').select('status').eq('user_id', user.id).maybeSingle(),
    client
      .from('technician_applications')
      .select('id, status, submitted_at, reviewed_at')
      .eq('technician_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const dbRoles = (rolesResult.data ?? [])
    .map((row: { role?: unknown }) => row.role)
    .filter(isAppRole);

  const metaRoles = deriveMetadataRoles(user);
  const roles = Array.from(new Set<AppRole>([...dbRoles, ...metaRoles]));

  const accountState: AccountState = isAccountState(accountStatusResult.data?.status)
    ? accountStatusResult.data.status
    : 'active';

  const requestedTechnician =
    user.user_metadata?.requested_account_type === 'technician' ||
    user.app_metadata?.requested_account_type === 'technician';

  if (applicationResult.error) {
    if (isSchemaPermissionError(applicationResult.error)) {
      return {
        roles,
        accountState,
        applicationStatus: requestedTechnician || roles.includes('technician') ? 'approved' : null,
        applicationError: null,
      };
    }
    return {
      roles,
      accountState,
      applicationStatus: dbRoles.includes('technician') ? 'approved' : null,
      applicationError: applicationResult.error.message,
    };
  }

  const directStatus = normalizeApplicationStatus(applicationResult.data?.status);
  if (directStatus) {
    return {
      roles,
      accountState,
      applicationStatus: directStatus,
      applicationError: null,
    };
  }

  if (dbRoles.includes('technician')) {
    return {
      roles,
      accountState,
      applicationStatus: 'approved',
      applicationError: null,
    };
  }

  if (requestedTechnician) {
    const synced = await ensureTechnicianApplicationRow(client, user);
    return {
      roles,
      accountState,
      applicationStatus: synced.status,
      applicationError: synced.error,
    };
  }

  return {
    roles,
    accountState,
    applicationStatus: null,
    applicationError: null,
  };
}
