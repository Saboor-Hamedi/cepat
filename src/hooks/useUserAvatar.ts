import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '../data/marketplaceRepository';
import { loadAccountProfileDetails } from '../data/marketplaceStore';

interface AvatarState {
  userId: string;
  uri?: string;
}

export function useUserAvatar(
  userId?: string | null,
  fallbackName = '',
  initialUri?: string,
) {
  const [state, setState] = useState<AvatarState | null>(() => {
    if (userId && initialUri) {
      return { userId, uri: initialUri };
    }
    return null;
  });

  useEffect(() => {
    if (!userId) {
      setState(null);
      return;
    }
    let active = true;

    if (initialUri) {
      setState({ userId, uri: initialUri });
    }

    const resolveAvatar = async () => {
      // 1. Fast cache: check AsyncStorage for user avatar
      try {
        const cached = await AsyncStorage.getItem(`@cepat_avatar_${userId}`);
        if (active && cached) {
          setState({ userId, uri: cached });
        }
      } catch {}

      // 2. Remote check: supabase profiles table
      if (supabase) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
          const remote =
            (typeof data?.avatar_path === 'string' && data.avatar_path) ||
            (typeof data?.avatar_url === 'string' && data.avatar_url) ||
            (typeof data?.avatar === 'string' && data.avatar) ||
            (typeof data?.avatar_uri === 'string' && data.avatar_uri) ||
            null;
          if (active && remote) {
            setState({ userId, uri: remote });
            return;
          }
        } catch {}
      }

      // 3. Fallback to account profile store
      try {
        const profile = await loadAccountProfileDetails(userId, '', fallbackName);
        if (active && profile.avatarUri) {
          setState({ userId, uri: profile.avatarUri });
        }
      } catch {}
    };

    void resolveAvatar();

    return () => {
      active = false;
    };
  }, [userId, fallbackName, initialUri]);

  return (userId && state?.userId === userId ? state.uri : undefined) || initialUri || undefined;
}
