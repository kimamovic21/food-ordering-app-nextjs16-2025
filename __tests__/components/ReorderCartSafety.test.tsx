/** @vitest-environment jsdom */
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CartProvider, useCart } from '@/contexts/CartContext';
import { useReorderCart } from '@/hooks/useReorderCart';
import RestaurantQuickReorderButton from '@/components/shared/RestaurantQuickReorderButton';
import { sonnerToast } from '@/components/shared/SonnerToastComponent';
import type { CartItem } from '@/types/cart';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/components/shared/SonnerToastComponent', () => ({
  sonnerToast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

const existingItem: CartItem = {
  _id: 'existing-item',
  name: 'Existing meal',
  description: '',
  size: 'small',
  price: 8,
  quantity: 2,
  restaurantId: 'restaurant-a',
  note: 'No onion',
};
const newItem: CartItem = {
  ...existingItem,
  _id: 'new-item',
  name: 'New meal',
  restaurantId: 'restaurant-b',
  note: 'Extra crispy',
};
const persistedCart = () => JSON.parse(localStorage.getItem('cart') || '[]');
const response = (data: unknown = { cartItems: [newItem] }, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const ReorderAction = () => {
  const { reorder, isReordering } = useReorderCart();
  return (
    <button disabled={isReordering} onClick={() => void reorder({ orderId: 'previous-order' })}>
      Reorder
    </button>
  );
};

describe('cart replacement confirmation', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response()));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('adds to an empty cart without showing a confirmation', async () => {
    const user = userEvent.setup();
    render(
      <CartProvider>
        <ReorderAction />
      </CartProvider>
    );
    await user.click(screen.getByRole('button', { name: 'Reorder' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/cart'));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(persistedCart()).toEqual([newItem]);
    expect(sonnerToast.success).toHaveBeenCalledOnce();
  });

  it.each(['cancel', 'escape'])(
    'preserves all items and notes on %s without navigation or success feedback',
    async (action) => {
      localStorage.setItem('cart', JSON.stringify([existingItem]));
      const user = userEvent.setup();
      render(
        <CartProvider>
          <ReorderAction />
        </CartProvider>
      );
      await user.click(screen.getByRole('button', { name: 'Reorder' }));
      expect(
        await screen.findByRole('alertdialog', { name: 'Replace your cart?' })
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Keep current cart' })).toHaveFocus();
      expect(persistedCart()).toEqual([existingItem]);

      if (action === 'cancel')
        await user.click(screen.getByRole('button', { name: 'Keep current cart' }));
      else await user.keyboard('{Escape}');

      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      expect(persistedCart()).toEqual([existingItem]);
      expect(push).not.toHaveBeenCalled();
      expect(sonnerToast.success).not.toHaveBeenCalled();
      expect(sonnerToast.info).not.toHaveBeenCalled();
      expect(sonnerToast.error).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Reorder' })).toBeEnabled();
      await waitFor(() => expect(screen.getByRole('button', { name: 'Reorder' })).toHaveFocus());
    }
  );

  it('replaces the cart only after confirmation and keeps the recovered notes', async () => {
    localStorage.setItem('cart', JSON.stringify([existingItem]));
    const user = userEvent.setup();
    render(
      <CartProvider>
        <ReorderAction />
      </CartProvider>
    );
    await user.click(screen.getByRole('button', { name: 'Reorder' }));
    await user.click(await screen.findByRole('button', { name: 'Replace cart' }));
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(persistedCart()).toEqual([newItem]);
    expect(sonnerToast.success).toHaveBeenCalledOnce();
  });

  it('restores focus to an SVG reorder action after canceling the dialog', async () => {
    localStorage.setItem('cart', JSON.stringify([existingItem]));
    const IconAction = () => {
      const { reorder } = useReorderCart();
      return (
        <svg
          role='button'
          tabIndex={0}
          aria-label='Reorder icon'
          onClick={() => void reorder({ orderId: 'order' })}
        />
      );
    };
    render(
      <CartProvider>
        <IconAction />
      </CartProvider>
    );
    const user = userEvent.setup();
    const icon = screen.getByRole('button', { name: 'Reorder icon' });
    icon.focus();
    await user.click(icon);
    await user.click(await screen.findByRole('button', { name: 'Keep current cart' }));
    await waitFor(() => expect(icon).toHaveFocus());
  });

  it('also confirms replacement when the reordered items come from the same restaurant', async () => {
    localStorage.setItem('cart', JSON.stringify([existingItem]));
    vi.mocked(fetch).mockResolvedValue(
      response({ cartItems: [{ ...newItem, restaurantId: existingItem.restaurantId }] })
    );
    render(
      <CartProvider>
        <ReorderAction />
      </CartProvider>
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reorder' }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(persistedCart()).toEqual([existingItem]);
  });

  it.each([
    [],
    [{ ...newItem, quantity: 0 }],
    [{ ...newItem, quantity: 1.5 }],
    [{ ...newItem, price: null }],
    [{ ...newItem, restaurantId: '' }],
    [existingItem, newItem],
  ])('does not erase an existing cart on an invalid recovery response %#', async (cartItems) => {
    localStorage.setItem('cart', JSON.stringify([existingItem]));
    vi.mocked(fetch).mockResolvedValue(response({ cartItems }));
    render(
      <CartProvider>
        <ReorderAction />
      </CartProvider>
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reorder' }));
    await waitFor(() => expect(sonnerToast.error).toHaveBeenCalledOnce());
    expect(persistedCart()).toEqual([existingItem]);
    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('keeps the current cart when the API rejects the reorder', async () => {
    localStorage.setItem('cart', JSON.stringify([existingItem]));
    vi.mocked(fetch).mockResolvedValue(response({ error: 'No items remain available.' }, 400));
    render(
      <CartProvider>
        <ReorderAction />
      </CartProvider>
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reorder' }));
    await waitFor(() =>
      expect(sonnerToast.error).toHaveBeenCalledWith('No items remain available.')
    );
    expect(persistedCart()).toEqual([existingItem]);
    expect(push).not.toHaveBeenCalled();
  });

  it('blocks repeated requests while the first reorder is pending', async () => {
    const pending = deferred<Response>();
    vi.mocked(fetch).mockReturnValue(pending.promise);
    const { result } = renderHook(() => useReorderCart(), { wrapper: CartProvider });
    let first!: Promise<void>;
    act(() => {
      first = result.current.reorder({ orderId: 'first' });
      void result.current.reorder({ orderId: 'second' });
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(async () => {
      pending.resolve(response());
      await first;
    });
    expect(push).toHaveBeenCalledOnce();
  });

  it('checks the latest cart after a slow API response instead of a stale empty snapshot', async () => {
    const pending = deferred<Response>();
    vi.mocked(fetch).mockReturnValue(pending.promise);
    const { result } = renderHook(() => ({ ...useReorderCart(), cart: useCart() }), {
      wrapper: CartProvider,
    });
    let done!: Promise<void>;
    act(() => {
      done = result.current.reorder({ orderId: 'previous-order' });
    });
    act(() => {
      result.current.cart.addToCart(existingItem);
    });
    await act(async () => {
      pending.resolve(response());
    });
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(persistedCart()[0]._id).toBe(existingItem._id);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Keep current cart' }));
    await done;
    expect(push).not.toHaveBeenCalled();
  });

  it('discards a late response after the calling component unmounts', async () => {
    const pending = deferred<Response>();
    vi.mocked(fetch).mockReturnValue(pending.promise);
    const view = render(
      <CartProvider>
        <ReorderAction />
      </CartProvider>
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reorder' }));
    const signal = vi.mocked(fetch).mock.calls[0][1]?.signal;
    view.rerender(
      <CartProvider>
        <span>Other page</span>
      </CartProvider>
    );
    expect(signal?.aborted).toBe(true);
    await act(async () => {
      pending.resolve(response());
    });
    expect(persistedCart()).toEqual([]);
    expect(push).not.toHaveBeenCalled();
    expect(sonnerToast.error).not.toHaveBeenCalled();
  });

  it('closes a pending confirmation if its caller unmounts', async () => {
    localStorage.setItem('cart', JSON.stringify([existingItem]));
    const view = render(
      <CartProvider>
        <ReorderAction />
      </CartProvider>
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reorder' }));
    await screen.findByRole('alertdialog');
    view.rerender(
      <CartProvider>
        <span>Other page</span>
      </CartProvider>
    );
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(persistedCart()).toEqual([existingItem]);
    expect(push).not.toHaveBeenCalled();
  });

  it('does not overwrite an already pending confirmation with another replacement', async () => {
    localStorage.setItem('cart', JSON.stringify([existingItem]));
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
    let first!: Promise<boolean>;
    act(() => {
      first = result.current.replaceCart([newItem]);
    });
    await expect(result.current.replaceCart([{ ...newItem, _id: 'another-item' }])).resolves.toBe(
      false
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Replace cart' }));
    await expect(first).resolves.toBe(true);
    expect(persistedCart()).toEqual([newItem]);
  });

  it('uses the same confirmation for restaurant quick reorder', async () => {
    localStorage.setItem('cart', JSON.stringify([existingItem]));
    render(
      <CartProvider>
        <RestaurantQuickReorderButton restaurantId='restaurant-b' restaurantName='Test Bistro' />
      </CartProvider>
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Order again' }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      '/api/restaurants/restaurant-b/quick-reorder',
      expect.objectContaining({ method: 'POST' })
    );
    expect(push).not.toHaveBeenCalled();
  });
});
