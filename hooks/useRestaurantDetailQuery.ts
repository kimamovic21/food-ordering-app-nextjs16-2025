'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/libs/queryKeys';
import type { RestaurantDetails } from '@/types/restaurant';

export type RestaurantDetailResponse = {
  restaurant: RestaurantDetails | null;
};

export class RestaurantDetailQueryError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'RestaurantDetailQueryError';
    this.status = status;
  }
}

const readJson = async (response: Response) => response.json().catch(() => ({}));

const getErrorMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === 'string' && error.trim()) {
      return error;
    }
  }

  return fallback;
};

export const fetchRestaurantDetail = async (
  restaurantId: string,
  signal?: AbortSignal
): Promise<RestaurantDetailResponse> => {
  if (!restaurantId) {
    throw new RestaurantDetailQueryError('Restaurant ID is required.', 400);
  }

  const requestInit: RequestInit = { cache: 'no-store' };

  if (signal) {
    requestInit.signal = signal;
  }

  const response = await fetch(`/api/restaurants/${restaurantId}`, requestInit);
  const payload = await readJson(response);

  if (!response.ok) {
    throw new RestaurantDetailQueryError(
      getErrorMessage(payload, 'Failed to load restaurant details.'),
      response.status
    );
  }

  const data = payload as Partial<RestaurantDetailResponse>;

  return {
    restaurant: data.restaurant || null,
  };
};

export const useRestaurantDetailQuery = (restaurantId: string, enabled: boolean) =>
  useQuery({
    enabled: Boolean(restaurantId) && enabled,
    queryFn: ({ signal }) => fetchRestaurantDetail(restaurantId, signal),
    queryKey: queryKeys.restaurants.publicDetail(restaurantId),
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
