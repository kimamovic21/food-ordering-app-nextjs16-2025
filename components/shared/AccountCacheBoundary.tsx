'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import useAccountScope from '@/hooks/useAccountScope';

export default function AccountCacheBoundary() {
  const { viewer } = useAccountScope();
  const client = useQueryClient();
  useEffect(() => {
    const filters = {
      predicate: ({ queryKey }: { queryKey: readonly unknown[] }) =>
        (queryKey[0] === 'profile' || queryKey[0] === 'favorites') &&
        (!viewer || queryKey[1] !== viewer),
    };
    void client.cancelQueries(filters);
    client.removeQueries(filters);
  }, [client, viewer]);
  return null;
}
