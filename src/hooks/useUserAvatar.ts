import { useEffect, useState } from 'react';

import { loadAccountProfileDetails } from '../data/marketplaceStore';

interface AvatarState {
  userId: string;
  uri?: string;
}

export function useUserAvatar(userId?: string | null, fallbackName = '') {
  const [state, setState] = useState<AvatarState | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void loadAccountProfileDetails(userId, '', fallbackName)
      .then((profile) => {
        if (active) setState({ userId, uri: profile.avatarUri || undefined });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [userId, fallbackName]);

  return userId && state?.userId === userId ? state.uri : undefined;
}
