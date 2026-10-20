/** @vitest-environment jsdom */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MyOrdersPage from '@/app/my-orders/page';
import { CartProvider } from '@/contexts/CartContext';
import { sonnerToast } from '@/components/shared/SonnerToastComponent';

const { push, cachedItem } = vi.hoisted(() => ({
  push: vi.fn(),
  cachedItem: {
    _id: 'pizza',
    name: 'Pizza',
    description: '',
    size: 'small',
    price: 8,
    quantity: 4,
    restaurantId: 'restaurant',
    note: 'No onion',
  },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('nuqs', () => ({
  parseAsInteger: { withDefault: () => ({}) },
  useQueryState: () => [1, vi.fn()],
}));
vi.mock('@/hooks/useProfile', () => ({
  default: () => ({ data: { email: 'customer@example.com' }, loading: false }),
}));
vi.mock('@/hooks/useOrderListQueries', () => ({
  useCustomerOrdersListQuery: () => ({ data: { orders: [], totalPages: 1 }, isLoading: false }),
  useUsualOrderQuery: () => ({
    isLoading: false,
    data: {
      usualOrder: {
        orderId: 'previous-order',
        cartItems: [cachedItem],
        items: [cachedItem],
        itemCount: 4,
        subtotal: 32,
        repeatCount: 3,
        lastOrderedAt: '2026-10-19T12:00:00Z',
      },
    },
  }),
}));
vi.mock('@/app/my-orders/MyOrdersTable', () => ({ default: () => null }));
vi.mock('@/components/shared/SonnerToastComponent', () => ({
  sonnerToast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

describe('usual-order fresh rebuild', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  const renderPage = () =>
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <CartProvider>
          <MyOrdersPage />
        </CartProvider>
      </QueryClientProvider>
    );

  it('uses current API prices and quantities instead of the cached preview', async () => {
    const freshItem = { ...cachedItem, quantity: 1, price: 10 };
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ cartItems: [freshItem] })));
    renderPage();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Order usual' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/cart'));
    expect(fetch).toHaveBeenCalledWith(
      '/api/my-orders/reorder',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ orderId: 'previous-order' }),
      })
    );
    expect(JSON.parse(localStorage.getItem('cart') || '[]')).toEqual([freshItem]);
    expect(sonnerToast.success).toHaveBeenCalledWith('Your usual order was added to cart');
  });

  it('does not fall back to cached cart items when the fresh rebuild fails', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: 'Pizza is sold out.' }), { status: 400 })
    );
    renderPage();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Order usual' }));
    await waitFor(() => expect(sonnerToast.error).toHaveBeenCalledWith('Pizza is sold out.'));
    expect(JSON.parse(localStorage.getItem('cart') || '[]')).toEqual([]);
    expect(push).not.toHaveBeenCalled();
  });
});
