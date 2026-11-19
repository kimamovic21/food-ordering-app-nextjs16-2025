'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import useAccountScope from '@/hooks/useAccountScope';
import { queryKeys } from '@/libs/queryKeys';
import type { DeliveryAddress, DeliveryAddressInput } from '@/types/user';

type DeliveryAddressResponse = {
  address?: DeliveryAddress;
  addresses: DeliveryAddress[];
  duplicate?: boolean;
  labelUpdated?: boolean;
};

const endpoint = '/api/profile/delivery-addresses';

async function fetchDeliveryAddresses(signal?: AbortSignal): Promise<DeliveryAddress[]> {
  const response = await fetch(endpoint, { cache: 'no-store', signal });
  if (response.status === 401) return [];
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(json?.error || 'Failed to load delivery addresses.');
  return Array.isArray(json?.addresses) ? json.addresses : [];
}

// Capture the initiating account in variables, not callbacks that can change on rerender.
function useAddressMutation<T>(
  action: string,
  request: (value: T) => { url?: string; method: string; body?: unknown }
) {
  const account = useAccountScope();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationKey: [...queryKeys.profile.deliveryAddresses(account.viewer), action],
    mutationFn: async ({ value, owner }: { value: T; owner: typeof account }) => {
      owner.assertCurrent();
      const config = request(value);
      const response = await fetch(config.url || endpoint, {
        method: config.method,
        headers: { 'Content-Type': 'application/json' },
        ...(config.body ? { body: JSON.stringify(config.body) } : {}),
      });
      const data = await response.json().catch(() => null);
      owner.assertCurrent();
      if (!response.ok) throw new Error(data?.error || 'Failed to update delivery addresses.');
      return data as DeliveryAddressResponse;
    },
    onSuccess: (data, { owner }) => {
      if (!owner.isCurrent()) return;
      client.setQueryData(queryKeys.profile.deliveryAddresses(owner.viewer), data.addresses);
      void client.invalidateQueries({ queryKey: queryKeys.profile.detail(owner.viewer) });
    },
  });
  return {
    ...mutation,
    mutate: (value: T) => mutation.mutate({ value, owner: account }),
    mutateAsync: async (value: T) => {
      const data = await mutation.mutateAsync({ value, owner: account });
      account.assertCurrent();
      return data;
    },
  };
}

const useDeliveryAddresses = (enabled: boolean) => {
  const { viewer, status } = useAccountScope();
  const authenticated = status === 'authenticated' && Boolean(viewer);
  const query = useQuery({
    queryKey: queryKeys.profile.deliveryAddresses(viewer),
    queryFn: ({ signal }) => fetchDeliveryAddresses(signal),
    enabled: enabled && authenticated,
    staleTime: 60 * 1000,
  });
  const createAddress = useAddressMutation<DeliveryAddressInput>('create', (address) => ({
    method: 'POST',
    body: address,
  }));
  const setDefaultAddress = useAddressMutation<string>('default', (addressId) => ({
    method: 'PATCH',
    body: { addressId },
  }));
  const updateAddressLabel = useAddressMutation<{ addressId: string; label: string }>(
    'label',
    (body) => ({
      method: 'PATCH',
      body,
    })
  );
  const deleteAddress = useAddressMutation<string>('delete', (addressId) => ({
    method: 'DELETE',
    url: endpoint + '?addressId=' + encodeURIComponent(addressId),
  }));
  return {
    addresses: authenticated && enabled ? (query.data ?? []) : [],
    isLoading: status === 'loading' || (enabled && authenticated && query.isLoading),
    createAddress,
    setDefaultAddress,
    updateAddressLabel,
    deleteAddress,
  };
};

export default useDeliveryAddresses;
