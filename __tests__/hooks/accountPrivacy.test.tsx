/** @vitest-environment jsdom */

import { StrictMode, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import AccountCacheBoundary from '@/components/shared/AccountCacheBoundary';
import useAccountScope from '@/hooks/useAccountScope';
import useProfile from '@/hooks/useProfile';
import useFavorites from '@/hooks/useFavorites';
import useDeliveryAddresses from '@/hooks/useDeliveryAddresses';
import { queryKeys } from '@/libs/queryKeys';
import type { DeliveryAddressInput } from '@/types/user';

const session = vi.hoisted(() => ({
  status: 'authenticated' as 'authenticated' | 'unauthenticated' | 'loading',
  data: { user: { email: 'a@example.com' } },
}));
vi.mock('next-auth/react', () => ({ useSession: () => session }));

const A = 'a@example.com';
const B = 'b@example.com';
const addressInput: DeliveryAddressInput = {
  label: 'Home',
  phone: '+38761123456',
  streetAddress: 'Example 1',
  city: 'Sarajevo',
  postalCode: '71000',
  country: 'Bosnia and Herzegovina',
  deliveryLatitude: 43.85,
  deliveryLongitude: 18.41,
  isDefault: true,
};
const address = (owner: string) => ({ ...addressInput, _id: owner, label: owner });
const favorites = (owner: string) => ({
  favoriteMenuItemIds: [owner],
  favoriteRestaurantIds: [owner],
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const clients: QueryClient[] = [];
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  clients.push(client);
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <StrictMode>
        <QueryClientProvider client={client}>
          <AccountCacheBoundary />
          {children}
        </QueryClientProvider>
      </StrictMode>
    );
  }
  return { client, wrapper: Wrapper };
}
function seed(client: QueryClient, owner: string) {
  client.setQueryData(queryKeys.profile.detail(owner), { email: owner });
  client.setQueryData(queryKeys.profile.deliveryAddresses(owner), [address(owner)]);
  client.setQueryData(queryKeys.favorites.ids(owner), favorites(owner));
  client.setQueryData(queryKeys.favorites.menuItems(owner), { items: [{ _id: owner }] });
  client.setQueryData(queryKeys.favorites.restaurants(owner), { restaurants: [{ _id: owner }] });
}
function usePrivateData() {
  return {
    profile: useProfile(),
    favorites: useFavorites(),
    addresses: useDeliveryAddresses(true),
  };
}
beforeEach(() => {
  session.status = 'authenticated';
  session.data = { user: { email: A } };
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('account-scoped private queries', () => {
  it('hides fresh old data immediately, removes all old private caches and preserves public data', async () => {
    const { client, wrapper } = setup();
    seed(client, A);
    client.setQueryData(['restaurants', 'public-list'], ['public restaurant']);
    const waiting = deferred<Response>();
    const fetchMock = vi.fn(() => waiting.promise);
    vi.stubGlobal('fetch', fetchMock);
    const { result, rerender } = renderHook(usePrivateData, { wrapper });
    expect(result.current.profile.data?.email).toBe(A);
    expect(result.current.addresses.addresses[0]._id).toBe(A);

    session.data = { user: { email: B } };
    rerender();
    expect(result.current.profile.data).toBeNull();
    expect(result.current.favorites.data.favoriteMenuItemIds).toEqual([]);
    expect(result.current.addresses.addresses).toEqual([]);
    expect(client.getQueryCache().findAll({ predicate: (q) => q.queryKey[1] === A })).toEqual([]);
    expect(client.getQueryData(['restaurants', 'public-list'])).toEqual(['public restaurant']);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    session.status = 'unauthenticated';
    rerender();
    expect(result.current.profile.data).toBeNull();
    expect(result.current.addresses.addresses).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('cancels old GETs and ignores late responses even if a transport ignores abort', async () => {
    const { client, wrapper } = setup();
    const waiting: { pending: ReturnType<typeof deferred<Response>>; signal: AbortSignal }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((_url, options) => {
        const pending = deferred<Response>();
        waiting.push({ pending, signal: options.signal });
        return pending.promise;
      })
    );
    const { result, rerender } = renderHook(usePrivateData, { wrapper });
    await waitFor(() => expect(waiting.length).toBeGreaterThanOrEqual(3));
    const old = [...waiting];
    session.data = { user: { email: B } };
    rerender();
    expect(old.every(({ signal }) => signal.aborted)).toBe(true);
    await act(async () => {
      old.forEach(({ pending }) =>
        pending.resolve(Response.json({ email: A, addresses: [address(A)], ...favorites(A) }))
      );
    });
    expect(result.current.profile.data).toBeNull();
    expect(result.current.favorites.data.favoriteMenuItemIds).toEqual([]);
    expect(result.current.addresses.addresses).toEqual([]);
    expect(client.getQueryData(queryKeys.profile.detail(A))).toBeUndefined();
  });

  it('keeps the same-account cache and scope during session refresh, then rejects A -> B -> A callbacks', () => {
    const { client, wrapper } = setup();
    seed(client, A);
    const { result, rerender, unmount } = renderHook(useAccountScope, { wrapper });
    const old = result.current;
    expect(old.isCurrent()).toBe(true);
    session.status = 'loading';
    rerender();
    expect(old.isCurrent()).toBe(true);
    expect(client.getQueryData(queryKeys.profile.detail(A))).toEqual({ email: A });
    session.status = 'authenticated';
    session.data = { user: { email: B } };
    rerender();
    session.data = { user: { email: A } };
    rerender();
    expect(old.isCurrent()).toBe(false);
    expect(() => old.assertCurrent()).toThrow('Your account changed');
    const current = result.current;
    expect(current.isCurrent()).toBe(true);
    unmount();
    expect(current.isCurrent()).toBe(false);
  });

  it('does not let an old favorites setter recreate the previous cache', () => {
    const { client, wrapper } = setup();
    seed(client, A);
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {}))
    );
    const { result, rerender } = renderHook(useFavorites, { wrapper });
    const oldSetter = result.current.setMenuItemFavorite;
    session.data = { user: { email: B } };
    rerender();
    act(() => oldSetter('late-item', true));
    expect(client.getQueryData(queryKeys.favorites.ids(A))).toBeUndefined();
    expect(result.current.data.favoriteMenuItemIds).toEqual([]);
  });
});

describe('delivery address mutation ownership', () => {
  const operations = [
    { name: 'createAddress', value: addressInput, method: 'POST', body: addressInput },
    {
      name: 'setDefaultAddress',
      value: 'address-1',
      method: 'PATCH',
      body: { addressId: 'address-1' },
    },
    {
      name: 'updateAddressLabel',
      value: { addressId: 'address-1', label: 'Office' },
      method: 'PATCH',
      body: { addressId: 'address-1', label: 'Office' },
    },
    { name: 'deleteAddress', value: 'address-1', method: 'DELETE', body: undefined },
  ] as const;
  function invoke(
    hook: ReturnType<typeof useDeliveryAddresses>,
    operation: (typeof operations)[number]
  ) {
    switch (operation.name) {
      case 'createAddress':
        return hook.createAddress.mutateAsync(operation.value);
      case 'setDefaultAddress':
        return hook.setDefaultAddress.mutateAsync(operation.value);
      case 'updateAddressLabel':
        return hook.updateAddressLabel.mutateAsync(operation.value);
      case 'deleteAddress':
        return hook.deleteAddress.mutateAsync(operation.value);
    }
  }

  it.each(operations)(
    '$name preserves request shape and updates only its owner cache',
    async (operation) => {
      const { client, wrapper } = setup();
      seed(client, A);
      const fetchMock = vi.fn(async () =>
        Response.json({ address: address(A), addresses: [address(A)] })
      );
      vi.stubGlobal('fetch', fetchMock);
      const invalidate = vi.spyOn(client, 'invalidateQueries');
      const { result } = renderHook(() => useDeliveryAddresses(true), { wrapper });
      await act(async () => {
        await invoke(result.current, operation);
      });
      expect(fetchMock).toHaveBeenCalledWith(
        operation.method === 'DELETE'
          ? '/api/profile/delivery-addresses?addressId=address-1'
          : '/api/profile/delivery-addresses',
        expect.objectContaining({
          method: operation.method,
          ...(operation.body ? { body: JSON.stringify(operation.body) } : {}),
        })
      );
      expect(client.getQueryData(queryKeys.profile.deliveryAddresses(A))).toEqual([address(A)]);
      expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.profile.detail(A) });
      expect(client.getQueryData(queryKeys.profile.deliveryAddresses(B))).toBeUndefined();
    }
  );

  it.each(operations)('$name ignores old responses after an account switch', async (operation) => {
    const { client, wrapper } = setup();
    seed(client, A);
    const pending = deferred<Response>();
    const fetchMock = vi.fn((_url, options) =>
      options.method ? pending.promise : Promise.resolve(Response.json({ addresses: [address(B)] }))
    );
    vi.stubGlobal('fetch', fetchMock);
    const { result, rerender } = renderHook(() => useDeliveryAddresses(true), { wrapper });
    let outcome!: Promise<unknown>;
    act(() => {
      outcome = invoke(result.current, operation).catch((error) => error);
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    session.data = { user: { email: B } };
    rerender();
    await waitFor(() => expect(result.current.addresses[0]?._id).toBe(B));
    await act(async () => {
      pending.resolve(Response.json({ addresses: [address(A)] }));
    });
    expect(await outcome).toBeInstanceOf(Error);
    expect(client.getQueryData(queryKeys.profile.deliveryAddresses(A))).toBeUndefined();
    expect(result.current.addresses[0]._id).toBe(B);
  });

  it('rejects the first login mutation after A -> B -> A, even with the same email', async () => {
    const { client, wrapper } = setup();
    seed(client, A);
    const pending = deferred<Response>();
    vi.stubGlobal(
      'fetch',
      vi.fn((_url, options) =>
        options.method ? pending.promise : Promise.resolve(Response.json({ addresses: [] }))
      )
    );
    const { result, rerender } = renderHook(() => useDeliveryAddresses(true), { wrapper });
    let outcome!: Promise<unknown>;
    act(() => {
      outcome = result.current.deleteAddress.mutateAsync('old-address').catch((error) => error);
    });
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    session.data = { user: { email: B } };
    rerender();
    session.data = { user: { email: A } };
    rerender();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      pending.resolve(Response.json({ addresses: [address('stale')] }));
    });
    expect(await outcome).toBeInstanceOf(Error);
    expect(result.current.addresses).toEqual([]);
  });

  it('retains current-account backend validation messages without replacing saved addresses', async () => {
    const { client, wrapper } = setup();
    seed(client, A);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ error: 'Address limit reached.' }, { status: 409 }))
    );
    const { result } = renderHook(() => useDeliveryAddresses(true), { wrapper });
    await act(async () => {
      await expect(result.current.createAddress.mutateAsync(addressInput)).rejects.toThrow(
        'Address limit reached.'
      );
    });
    expect(result.current.addresses).toEqual([address(A)]);
  });

  it('rejects a guest mutation before making a request', async () => {
    session.status = 'unauthenticated';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { wrapper } = setup();
    const { result } = renderHook(() => useDeliveryAddresses(true), { wrapper });
    await act(async () => {
      await expect(result.current.deleteAddress.mutateAsync('address')).rejects.toThrow(
        'Your account changed'
      );
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
