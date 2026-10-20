'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { limitCartItemNoteInput } from '@/libs/cartItemNotes';
import { canAddItemToCart } from '@/libs/orderQuantityLimits';
import type { CartItem } from '@/types/cart';

export type { CartItem } from '@/types/cart';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (
    item: Omit<CartItem, 'quantity'>,
    options?: { maxItemsPerOrder?: number }
  ) => AddToCartResult;
  removeFromCart: (id: string, size: string) => void;
  updateQuantity: (id: string, size: string, quantity: number) => void;
  updateItemNote: (id: string, size: string, note: string) => void;
  clearCart: () => void;
  replaceCart: (items: CartItem[], options?: { signal?: AbortSignal }) => Promise<boolean>;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getCartRestaurantId: () => string | null; // Get the restaurantId of items in cart
  clearAndAddToCart: (item: Omit<CartItem, 'quantity'>) => void; // Clear cart and add new item from different restaurant
}

export type AddToCartResult =
  | { added: true }
  | {
      added: false;
      reason:
        | 'different_restaurant'
        | 'item_quantity_limit'
        | 'item_stock_limit'
        | 'order_quantity_limit';
      message: string;
    };

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

type PendingCartReplacement = {
  items: CartItem[];
  resolve: (accepted: boolean) => void;
  detachAbort: () => void;
};

export const CartProvider = ({ children }: CartProviderProps) => {
  // Lazy initialization: load from localStorage only once during component mount
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    // Only run on client-side (Next.js safe)
    if (typeof window === 'undefined') return [];

    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
      try {
        const parsedItems = JSON.parse(storedCart);
        // Filter out items without restaurantId (old cart items)
        const validItems = parsedItems.filter((item: any) => item.restaurantId);

        if (validItems.length !== parsedItems.length) {
          console.warn(
            'Removed cart items without restaurantId:',
            parsedItems.length - validItems.length
          );
        }

        return validItems;
      } catch (error) {
        console.error('Error loading cart from local storage:', error);
        localStorage.removeItem('cart'); // Clear invalid cart
        return [];
      }
    }
    return [];
  });

  const latestCart = useRef(cartItems);
  const pendingReplacement = useRef<PendingCartReplacement | null>(null);
  const returnFocus = useRef<HTMLElement | SVGElement | null>(null);
  const [replacementOpen, setReplacementOpen] = useState(false);

  useLayoutEffect(() => {
    latestCart.current = cartItems;
  }, [cartItems]);

  useEffect(
    () => () => {
      const pending = pendingReplacement.current;
      pendingReplacement.current = null;
      pending?.detachAbort();
      pending?.resolve(false);
    },
    []
  );

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (
    item: Omit<CartItem, 'quantity'>,
    options: { maxItemsPerOrder?: number } = {}
  ): AddToCartResult => {
    if (cartItems.length > 0 && cartItems[0].restaurantId !== item.restaurantId) {
      return {
        added: false,
        reason: 'different_restaurant',
        message: 'Your cart contains items from another restaurant.',
      };
    }

    const quantityLimitViolation = canAddItemToCart({
      cartItems,
      item,
      maxItemsPerOrder: options.maxItemsPerOrder,
    });

    if (quantityLimitViolation) {
      return {
        added: false,
        reason: quantityLimitViolation.type,
        message: quantityLimitViolation.message,
      };
    }

    setCartItems((prevItems) => {
      const existingItem = prevItems.find((i) => i._id === item._id && i.size === item.size);

      if (existingItem) {
        return prevItems.map((i) =>
          i._id === item._id && i.size === item.size ? { ...i, quantity: i.quantity + 1 } : i
        );
      }

      return [...prevItems, { ...item, quantity: 1 }];
    });

    return { added: true };
  };

  const removeFromCart = (id: string, size: string) => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => !(item._id === id && item.size === size))
    );
  };

  const updateQuantity = (id: string, size: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id, size);
      return;
    }

    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item._id === id && item.size === size ? { ...item, quantity } : item
      )
    );
  };

  const updateItemNote = useCallback((id: string, size: string, note: string) => {
    const limitedNote = limitCartItemNoteInput(note);

    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item._id === id && item.size === size ? { ...item, note: limitedNote } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const finishReplacement = useCallback((accepted: boolean) => {
    const pending = pendingReplacement.current;
    if (!pending) return;

    pendingReplacement.current = null;
    pending.detachAbort();
    setReplacementOpen(false);
    if (accepted) {
      latestCart.current = pending.items;
      setCartItems(pending.items);
    }
    pending.resolve(accepted);
  }, []);

  const replaceCart = useCallback(
    (items: CartItem[], { signal }: { signal?: AbortSignal } = {}) => {
      if (signal?.aborted || pendingReplacement.current) return Promise.resolve(false);

      // Fail closed: malformed/empty recovery responses must never erase a valid cart.
      if (
        !Array.isArray(items) ||
        items.length === 0 ||
        items.some(
          (item) =>
            !item?._id ||
            !item.restaurantId ||
            !Number.isSafeInteger(item.quantity) ||
            item.quantity < 1 ||
            typeof item.price !== 'number' ||
            !Number.isFinite(item.price) ||
            item.price <= 0 ||
            !['single', 'small', 'medium', 'large'].includes(item.size)
        ) ||
        new Set(items.map((item) => item.restaurantId)).size !== 1
      ) {
        return Promise.reject(
          new Error('No valid items could be added. Your current cart has not changed.')
        );
      }

      const nextItems = items.map((item) => ({ ...item, note: limitCartItemNoteInput(item.note) }));
      if (latestCart.current.length === 0) {
        latestCart.current = nextItems;
        setCartItems(nextItems);
        return Promise.resolve(true);
      }

      const activeElement = document.activeElement;
      returnFocus.current =
        activeElement instanceof HTMLElement || activeElement instanceof SVGElement
          ? activeElement
          : null;
      return new Promise<boolean>((resolve) => {
        const abort = () => finishReplacement(false);
        pendingReplacement.current = {
          items: nextItems,
          resolve,
          detachAbort: () => signal?.removeEventListener('abort', abort),
        };
        signal?.addEventListener('abort', abort, { once: true });
        setReplacementOpen(true);
      });
    },
    [finishReplacement]
  );

  const getCartRestaurantId = (): string | null => {
    if (cartItems.length === 0) return null;
    return cartItems[0].restaurantId;
  };

  const clearAndAddToCart = (item: Omit<CartItem, 'quantity'>) => {
    setCartItems([{ ...item, quantity: 1 }]);
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => {
      const price = typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : 0;
      return total + price * item.quantity;
    }, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateItemNote,
        clearCart,
        replaceCart,
        getTotalItems,
        getTotalPrice,
        getCartRestaurantId,
        clearAndAddToCart,
      }}
    >
      {children}
      <AlertDialog
        open={replacementOpen}
        onOpenChange={(open) => {
          if (!open) finishReplacement(false);
        }}
      >
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (returnFocus.current?.isConnected) returnFocus.current.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Replace your cart?</AlertDialogTitle>
            <AlertDialogDescription>
              You already have items in your cart. Reordering will replace them and their item notes
              with this order.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current cart</AlertDialogCancel>
            <AlertDialogAction onClick={() => finishReplacement(true)}>
              Replace cart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CartContext.Provider>
  );
};
