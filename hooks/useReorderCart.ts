'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { sonnerToast } from '@/components/shared/SonnerToastComponent';
import { getReorderRecoveryToastCopy } from '@/libs/reorderRecoveryToast';
import type { ReorderCartRequest, ReorderResponse } from '@/types/order';

export const useReorderCart = () => {
  const { replaceCart } = useCart();
  const router = useRouter();
  const inFlight = useRef<AbortController | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  useEffect(
    () => () => {
      inFlight.current?.abort();
      inFlight.current = null;
    },
    []
  );

  const reorder = useCallback(
    async (request: ReorderCartRequest) => {
      if (inFlight.current) return;

      const controller = new AbortController();
      inFlight.current = controller;
      setIsReordering(true);

      try {
        const response = await fetch(
          request.orderId
            ? '/api/my-orders/reorder'
            : `/api/restaurants/${request.restaurantId}/quick-reorder`,
          {
            method: 'POST',
            signal: controller.signal,
            ...(request.orderId
              ? {
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ orderId: request.orderId }),
                }
              : {}),
          }
        );
        const data = (await response.json()) as ReorderResponse & { error?: string };
        if (controller.signal.aborted) return;
        if (!response.ok) throw new Error(data.error || 'Unable to reorder right now.');

        const replaced = await replaceCart(data.cartItems, { signal: controller.signal });
        if (!replaced || controller.signal.aborted) return;

        const toastCopy = getReorderRecoveryToastCopy(
          data.recoverySummary,
          request.successMessage ||
            (request.restaurantId
              ? `Previous ${request.restaurantName || 'restaurant'} order added to your cart.`
              : undefined)
        );
        if (toastCopy.tone === 'info') {
          sonnerToast.info(toastCopy.title, { description: toastCopy.description });
        } else {
          sonnerToast.success(toastCopy.title);
        }
        router.push('/cart');
      } catch (error) {
        if (!controller.signal.aborted) {
          sonnerToast.error(
            error instanceof Error ? error.message : 'Unable to reorder right now.'
          );
        }
      } finally {
        if (inFlight.current === controller) {
          inFlight.current = null;
          setIsReordering(false);
        }
      }
    },
    [replaceCart, router]
  );

  return { reorder, isReordering };
};
