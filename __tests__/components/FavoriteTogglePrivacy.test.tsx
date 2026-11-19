/** @vitest-environment jsdom */

import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import FavoriteToggleButton from '@/components/shared/FavoriteToggleButton';
import AccountCacheBoundary from '@/components/shared/AccountCacheBoundary';
import { queryKeys } from '@/libs/queryKeys';

const mocks = vi.hoisted(() => ({
  session: { status: 'authenticated', data: { user: { email: 'a@example.com' } } },
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('next-auth/react', () => ({ useSession: () => mocks.session }));
vi.mock('@/components/shared/SonnerToastComponent', () => ({ sonnerToast: mocks.toast }));
const A = 'a@example.com';
const B = 'b@example.com';
let client: QueryClient;
let resolve: (value: Response) => void;
let fetchMock: ReturnType<typeof vi.fn>;
const onChanged = vi.fn();

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={client}>
      <AccountCacheBoundary />
      {children}
    </QueryClientProvider>
  );
}
const toggle = () => (
  <FavoriteToggleButton type='restaurant' targetId='r1' isFavorite={false} onChanged={onChanged} />
);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.status = 'authenticated';
  mocks.session.data = { user: { email: A } };
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  fetchMock = vi.fn(
    () =>
      new Promise<Response>((done) => {
        resolve = done;
      })
  );
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
});

it.each([200, 500])(
  'ignores late %s favorite responses after switching accounts',
  async (status) => {
    const { rerender } = render(toggle(), { wrapper: Wrapper });
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(onChanged).toHaveBeenLastCalledWith(true);
    mocks.session.data = { user: { email: B } };
    rerender(toggle());
    onChanged.mockClear();
    await act(async () => {
      resolve(Response.json({ isFavorite: true, success: true, error: 'Failed' }, { status }));
    });
    expect(onChanged).not.toHaveBeenCalled();
    expect(mocks.toast.success).not.toHaveBeenCalled();
    expect(mocks.toast.error).not.toHaveBeenCalled();
    expect(client.getQueryData(queryKeys.favorites.ids(A))).toBeUndefined();
    expect(client.getQueryData(queryKeys.favorites.ids(B))).toBeUndefined();
    expect(screen.getByRole('button')).toHaveAccessibleName('Add to favorites');
    expect(screen.getByRole('button')).not.toBeDisabled();
  }
);

it('rolls back only the failed item, retaining another optimistic favorite', async () => {
  render(toggle(), { wrapper: Wrapper });
  fireEvent.click(screen.getByRole('button'));
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  act(() =>
    client.setQueryData(queryKeys.favorites.ids(A), {
      favoriteMenuItemIds: ['meal'],
      favoriteRestaurantIds: ['r1', 'r2'],
    })
  );
  await act(async () => {
    resolve(Response.json({ error: 'Try again.' }, { status: 500 }));
  });
  await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith('Try again.'));
  expect(client.getQueryData(queryKeys.favorites.ids(A))).toEqual({
    favoriteMenuItemIds: ['meal'],
    favoriteRestaurantIds: ['r2'],
  });
  expect(screen.getByRole('button')).toHaveAccessibleName('Add to favorites');
});

it('keeps the favorite card mounted until removal succeeds', async () => {
  const listKey = queryKeys.favorites.restaurants(A);
  client.setQueryData(listKey, { restaurants: [{ _id: 'r1' }] });
  client.setQueryData(queryKeys.favorites.ids(A), {
    favoriteMenuItemIds: [],
    favoriteRestaurantIds: ['r1'],
  });
  function List() {
    const { data } = useQuery({
      queryKey: listKey,
      enabled: false,
      queryFn: async () => ({ restaurants: [] as { _id: string }[] }),
    });
    return data?.restaurants.map((item) => (
      <FavoriteToggleButton key={item._id} type='restaurant' targetId={item._id} isFavorite />
    ));
  }
  render(<List />, { wrapper: Wrapper });
  fireEvent.click(screen.getByRole('button'));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  expect(screen.getByRole('button')).toBeDisabled();
  expect(client.getQueryData(listKey)).toEqual({ restaurants: [{ _id: 'r1' }] });
  await act(async () => {
    resolve(Response.json({ isFavorite: false, success: true }));
  });
  await waitFor(() => expect(screen.queryByRole('button')).not.toBeInTheDocument());
  expect(mocks.toast.success).toHaveBeenCalledWith('Removed from favorite restaurants');
});

it('requires authentication without sending a mutation', () => {
  mocks.session.status = 'unauthenticated';
  render(toggle(), { wrapper: Wrapper });
  fireEvent.click(screen.getByRole('button'));
  expect(fetchMock).not.toHaveBeenCalled();
  expect(mocks.toast.error).toHaveBeenCalledWith('Please login to save favorites');
});
