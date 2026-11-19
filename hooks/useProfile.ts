'use client';

import { useQuery } from '@tanstack/react-query';
import useAccountScope from '@/hooks/useAccountScope';
import { queryKeys } from '@/libs/queryKeys';
import type { ProfileData } from '@/types/user';

export type { ProfileData } from '@/types/user';

export const fetchProfile = async (signal?: AbortSignal): Promise<ProfileData | null> => {
  const response = await fetch('/api/profile', { cache: 'no-store', signal });
  const json = await response.json().catch(() => null);

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(json?.error || 'Failed to load profile');
  }

  return json ?? null;
};

const useProfile = () => {
  const { status, viewer } = useAccountScope();
  const isAuthenticated = status === 'authenticated' && Boolean(viewer);
  const isSessionLoading = status === 'loading';

  const query = useQuery({
    queryFn: ({ signal }) => fetchProfile(signal),
    queryKey: queryKeys.profile.detail(viewer),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    data: isAuthenticated ? (query.data ?? null) : null,
    loading: isSessionLoading || (isAuthenticated && query.isLoading),
    error: query.error,
    refetch: query.refetch,
  };
};

export default useProfile;
