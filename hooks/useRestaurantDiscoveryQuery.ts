'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/libs/queryKeys';
import type { RestaurantListResponse } from '@/types/restaurant';

export type RestaurantDiscoveryQueryParams = {
  city?: string;
  country?: string;
  delivery?: string;
  latitude?: number | null;
  longitude?: number | null;
  maxMinimumOrder?: string;
  minRating?: string;
  page: number;
  pageSize: number;
  q?: string;
  sort?: string;
  status?: string;
};

export class RestaurantDiscoveryQueryError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'RestaurantDiscoveryQueryError';
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

export const buildRestaurantDiscoverySearchParams = ({
  city = '',
  country = '',
  delivery = 'all',
  latitude,
  longitude,
  maxMinimumOrder = '',
  minRating = '',
  page,
  pageSize,
  q = '',
  sort = 'smart',
  status = 'all',
}: RestaurantDiscoveryQueryParams) => {
  const params = new URLSearchParams();
  params.set('limit', String(pageSize));
  params.set('page', String(page));

  if (q) params.set('q', q);
  if (city) params.set('city', city);
  if (country) params.set('country', country);
  if (status !== 'all') params.set('status', status);
  if (sort !== 'smart') params.set('sort', sort);
  if (delivery !== 'all') params.set('delivery', delivery);
  if (minRating) params.set('minRating', minRating);
  if (maxMinimumOrder) params.set('maxMinimumOrder', maxMinimumOrder);

  if (typeof latitude === 'number' && typeof longitude === 'number') {
    params.set('latitude', String(latitude));
    params.set('longitude', String(longitude));
  }

  return params;
};

export const fetchRestaurantDiscovery = async (
  params: RestaurantDiscoveryQueryParams,
  signal?: AbortSignal
): Promise<RestaurantListResponse> => {
  const requestInit: RequestInit = { cache: 'no-store' };

  if (signal) {
    requestInit.signal = signal;
  }

  const response = await fetch(
    `/api/restaurants?${buildRestaurantDiscoverySearchParams(params)}`,
    requestInit
  );
  const payload = await readJson(response);

  if (!response.ok) {
    throw new RestaurantDiscoveryQueryError(
      getErrorMessage(payload, 'Failed to fetch restaurants.'),
      response.status
    );
  }

  const data = payload as Partial<RestaurantListResponse>;

  return {
    restaurants: Array.isArray(data.restaurants) ? data.restaurants : [],
    filterOptions: {
      cities: Array.isArray(data.filterOptions?.cities) ? data.filterOptions.cities : [],
      countries: Array.isArray(data.filterOptions?.countries) ? data.filterOptions.countries : [],
    },
    pagination: {
      total: Number(data.pagination?.total || 0),
      page: Number(data.pagination?.page || params.page),
      pageSize: Number(data.pagination?.pageSize || params.pageSize),
      totalPages: Number(data.pagination?.totalPages || 1),
      hasNextPage: Boolean(data.pagination?.hasNextPage),
      hasPreviousPage: Boolean(data.pagination?.hasPreviousPage),
    },
  };
};

export const useRestaurantDiscoveryQuery = (
  params: RestaurantDiscoveryQueryParams,
  enabled: boolean
) =>
  useQuery({
    enabled,
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => fetchRestaurantDiscovery(params, signal),
    queryKey: queryKeys.restaurants.publicList(params),
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
