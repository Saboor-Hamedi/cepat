import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import type { PropsWithChildren } from 'react';
import type { User } from '@supabase/supabase-js';

import { supabase } from '../data/marketplaceRepository';
import { updateTechnicianProfileOnPosts } from '../data/postsStore';
import { handleIncomingAuthDeepLink } from './deepLinking';
import {
  deriveMetadataRoles,
  fetchAuthenticatedAccountState,
  type AccountState,
  type AppRole,
} from './technicianApplication';

export type { AccountState, AppRole };
export type EffectiveRole = 'customer' | 'technician' | 'admin' | 'guest';

type PreviewAuthState = {
  user: User | null;
  roles: AppRole[];
  accountState: AccountState;
  applicationStatus: string | null;
  applicationError: string | null;
  recoveryMode: boolean;
};

const INITIAL_PREVIEW_AUTH_STATE: PreviewAuthState = {
  user: null,
  roles: [],
  accountState: 'active',
  applicationStatus: null,
  applicationError: null,
  recoveryMode: false,
};

let previewAuthState: PreviewAuthState = { ...INITIAL_PREVIEW_AUTH_STATE };
const previewAuthListeners = new Set<() => void>();

function emitPreviewAuthChange() {
  for (const listener of previewAuthListeners) {
    listener();
  }
}

function subscribePreviewAuth(listener: () => void) {
  previewAuthListeners.add(listener);
  return () => {
    previewAuthListeners.delete(listener);
  };
}

function getPreviewAuthSnapshot(): PreviewAuthState {
  return previewAuthState;
}

export function setTestAuthSession(session: {
  user: User | null;
  roles?: AppRole[];
  accountState?: AccountState;
  applicationStatus?: string | null;
  recoveryMode?: boolean;
}) {
  const nextUser = session.user;
  const nextRoles =
    session.roles ?? (nextUser ? deriveMetadataRoles(nextUser) : []);
  previewAuthState = {
    user: nextUser,
    roles: nextRoles,
    accountState: session.accountState ?? 'active',
    applicationStatus:
      session.applicationStatus ??
      (nextRoles.includes('technician') ? 'approved' : null),
    applicationError: null,
    recoveryMode: session.recoveryMode ?? false,
  };
  emitPreviewAuthChange();
}

export function clearTestAuthSession() {
  previewAuthState = { ...INITIAL_PREVIEW_AUTH_STATE };
  emitPreviewAuthChange();
}

export function signInPreviewAccount(
  email: string,
  requestedRole: 'customer' | 'technician' = 'customer',
): User {
  const cleanEmail = email.trim().toLowerCase() || 'customer@cepat.id';
  const localPart = cleanEmail.split('@')[0] || 'User';
  const displayName =
    localPart.charAt(0).toUpperCase() + localPart.slice(1).replace(/[._-]+/g, ' ');
  const isTech =
    requestedRole === 'technician' || cleanEmail.startsWith('tech') || cleanEmail.startsWith('rizky');
  const fakeUser = {
    id: isTech ? 'demo-rizky' : 'demo-customer',
    email: cleanEmail,
    user_metadata: {
      display_name: isTech ? 'Rizky Pratama' : displayName,
      requested_account_type: isTech ? 'technician' : 'customer',
    },
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2026-10-30T00:00:00.000Z',
  } as unknown as User;

  setTestAuthSession({
    user: fakeUser,
    roles: isTech ? ['technician'] : ['customer'],
    applicationStatus: isTech ? 'approved' : null,
  });
  return fakeUser;
}

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  roles: AppRole[];
  effectiveRole: EffectiveRole;
  accountState: AccountState;
  applicationStatus: string | null;
  applicationError: string | null;
  recoveryMode: boolean;
  configurationReady: boolean;
  signOut: () => Promise<void>;
  refreshAccount: () => Promise<void>;
  finishRecovery: () => void;
  updateUserProfile: (details: { displayName?: string; avatarUrl?: string }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function resolveEffectiveRole(user: User | null, roles: AppRole[]): EffectiveRole {
  if (!user) return 'guest';
  // Admin effectiveRole strictly requires 'admin' in verified roles (never from user_metadata)
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('technician')) return 'technician';
  const metaRoles = deriveMetadataRoles(user);
  if (metaRoles.includes('technician')) return 'technician';
  return 'customer';
}

export function AuthProvider({ children }: PropsWithChildren) {
  const previewSnapshot = useSyncExternalStore(
    subscribePreviewAuth,
    getPreviewAuthSnapshot,
    getPreviewAuthSnapshot,
  );
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [accountState, setAccountState] = useState<AccountState>('active');
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [applicationError, setApplicationError] = useState<string | null>(null);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [accountLoadVersion, setAccountLoadVersion] = useState(0);

  const activeUser = supabase ? user : previewSnapshot.user;
  const activeRoles = supabase ? roles : previewSnapshot.roles;
  const activeAccountState = supabase ? accountState : previewSnapshot.accountState;
  const activeApplicationStatus = supabase ? applicationStatus : previewSnapshot.applicationStatus;
  const activeApplicationError = supabase ? applicationError : previewSnapshot.applicationError;
  const activeRecoveryMode = supabase ? recoveryMode : previewSnapshot.recoveryMode;

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;
    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        setRoles(deriveMetadataRoles(nextUser));
      }
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
      if (event === 'SIGNED_OUT') {
        setRoles([]);
        setApplicationStatus(null);
        setApplicationError(null);
        setAccountState('active');
        setRecoveryMode(false);
      }
      setLoading(false);
    });
    void client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        const nextUser = error ? null : data.session?.user ?? null;
        setUser(nextUser);
        if (nextUser) {
          setRoles(deriveMetadataRoles(nextUser));
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setUser(null);
          setLoading(false);
        }
      });

    const handleUrl = async (url: string) => {
      try {
        const result = await handleIncomingAuthDeepLink(client, url);
        if (!result.handled || result.error) return;
        if (result.isRecovery) {
          setRecoveryMode(true);
          router.replace('/reset-password');
        } else {
          router.replace('/login');
        }
      } catch {
        // Invalid or expired auth links leave the rest of the app available.
      }
    };
    void Linking.getInitialURL()
      .then((url) => {
        if (active && url) void handleUrl(url);
      })
      .catch(() => {});
    const linkListener = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
      linkListener.remove();
    };
  }, []);

  const refreshAccount = useCallback(async () => {
    setAccountLoadVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    let active = true;
    const client = supabase;
    if (!client || !user || loading) {
      return () => {
        active = false;
      };
    }

    void fetchAuthenticatedAccountState(client, user)
      .then((snapshot) => {
        if (!active) return;
        setRoles(snapshot.roles);
        setAccountState(snapshot.accountState);
        setApplicationStatus(snapshot.applicationStatus);
        setApplicationError(snapshot.applicationError);
      })
      .catch((err: unknown) => {
        if (active) {
          setRoles(deriveMetadataRoles(user));
          setApplicationStatus(null);
          setApplicationError(
            err instanceof Error ? err.message : 'Unable to retrieve application status.',
          );
        }
      });

    return () => {
      active = false;
    };
  }, [accountLoadVersion, loading, user]);

  useEffect(() => {
    let active = true;
    if (!user) return;
    const loadAvatar = async () => {
      try {
        const local = await AsyncStorage.getItem(`@cepat_avatar_${user.id}`);
        let remote: string | null = null;
        if (supabase) {
          const { data } = await supabase
            .from('profiles')
            .select('avatar_path, display_name')
            .eq('id', user.id)
            .maybeSingle();
          if (data?.avatar_path) remote = data.avatar_path;
        }
        const avatar = remote || local;
        if (active && avatar && (!user.user_metadata?.avatar_url || user.user_metadata.avatar_url !== avatar)) {
          setUser((curr) => {
            if (!curr || curr.id !== user.id) return curr;
            return {
              ...curr,
              user_metadata: {
                ...curr.user_metadata,
                avatar_url: avatar,
              },
            } as User;
          });
        }
      } catch {
        // Ignored
      }
    };
    void loadAvatar();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const signOut = useCallback(async () => {
    clearTestAuthSession();
    setUser(null);
    setRoles([]);
    setApplicationStatus(null);
    setApplicationError(null);
    setAccountState('active');
    setRecoveryMode(false);
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const finishRecovery = useCallback(() => {
    setRecoveryMode(false);
    previewAuthState = { ...previewAuthState, recoveryMode: false };
    emitPreviewAuthChange();
  }, []);

  const effectiveRole = useMemo(
    () => resolveEffectiveRole(activeUser, activeRoles),
    [activeUser, activeRoles],
  );

  const updateUserProfile = useCallback(
    async (details: { displayName?: string; avatarUrl?: string }) => {
      if (user) {
        const nextUser = {
          ...user,
          user_metadata: {
            ...user.user_metadata,
            ...(details.displayName !== undefined ? { display_name: details.displayName } : {}),
            ...(details.avatarUrl !== undefined ? { avatar_url: details.avatarUrl } : {}),
          },
        };
        setUser(nextUser as unknown as User);
      }
      if (previewAuthState.user) {
        previewAuthState = {
          ...previewAuthState,
          user: {
            ...previewAuthState.user,
            user_metadata: {
              ...previewAuthState.user.user_metadata,
              ...(details.displayName !== undefined
                ? { display_name: details.displayName }
                : {}),
              ...(details.avatarUrl !== undefined
                ? { avatar_url: details.avatarUrl }
                : {}),
            },
          } as unknown as User,
        };
        emitPreviewAuthChange();
      }
      if (user && details.avatarUrl) {
        try {
          await AsyncStorage.setItem(`@cepat_avatar_${user.id}`, details.avatarUrl);
        } catch {}
      }
      if (supabase && user) {
        try {
          await supabase.auth.updateUser({
            data: {
              ...(details.displayName !== undefined ? { display_name: details.displayName } : {}),
              ...(details.avatarUrl !== undefined ? { avatar_url: details.avatarUrl } : {}),
            },
          });
          await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              ...(details.displayName !== undefined ? { display_name: details.displayName } : {}),
              ...(details.avatarUrl !== undefined ? { avatar_path: details.avatarUrl } : {}),
              updated_at: new Date().toISOString(),
            });
        } catch {
          // Local update applied
        }
      }
      const targetUserId = user?.id || previewAuthState.user?.id;
      if (targetUserId) {
        try {
          await updateTechnicianProfileOnPosts({
            technicianId: targetUserId,
            technicianName: details.displayName,
            technicianAvatarUri: details.avatarUrl,
          });
        } catch {}
      }
    },
    [user],
  );

  const value = useMemo(
    () => ({
      user: activeUser,
      loading,
      roles: activeRoles,
      effectiveRole,
      accountState: activeAccountState,
      applicationStatus: activeApplicationStatus,
      applicationError: activeApplicationError,
      recoveryMode: activeRecoveryMode,
      configurationReady: Boolean(supabase),
      signOut,
      refreshAccount,
      finishRecovery,
      updateUserProfile,
    }),
    [
      activeUser,
      loading,
      activeRoles,
      effectiveRole,
      activeAccountState,
      activeApplicationStatus,
      activeApplicationError,
      activeRecoveryMode,
      signOut,
      refreshAccount,
      finishRecovery,
      updateUserProfile,
    ],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const contextValue = useContext(AuthContext);
  const previewSnapshot = useSyncExternalStore(
    subscribePreviewAuth,
    getPreviewAuthSnapshot,
    getPreviewAuthSnapshot,
  );

  if (contextValue) {
    return contextValue;
  }

  const effectiveRole = resolveEffectiveRole(previewSnapshot.user, previewSnapshot.roles);

  return {
    user: previewSnapshot.user,
    loading: false,
    roles: previewSnapshot.roles,
    effectiveRole,
    accountState: previewSnapshot.accountState,
    applicationStatus: previewSnapshot.applicationStatus,
    applicationError: previewSnapshot.applicationError,
    recoveryMode: previewSnapshot.recoveryMode,
    configurationReady: Boolean(supabase),
    signOut: async () => {
      clearTestAuthSession();
    },
    refreshAccount: async () => {},
    finishRecovery: () => {
      previewAuthState = { ...previewAuthState, recoveryMode: false };
      emitPreviewAuthChange();
    },
    updateUserProfile: async (details: { displayName?: string; avatarUrl?: string }) => {
      if (previewAuthState.user) {
        previewAuthState = {
          ...previewAuthState,
          user: {
            ...previewAuthState.user,
            user_metadata: {
              ...previewAuthState.user.user_metadata,
              ...(details.displayName !== undefined
                ? { display_name: details.displayName }
                : {}),
              ...(details.avatarUrl !== undefined
                ? { avatar_url: details.avatarUrl }
                : {}),
            },
          } as unknown as User,
        };
        emitPreviewAuthChange();
      }
    },
  };
}
