'use client';

import { keepPreviousData, useQuery, type QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/libs/queryKeys';
import type { MenuCategorySummary, MenuItemCategory, MenuItemListItem } from '@/types/menu';

export type RestaurantMenuSort = 'price_asc' | 'price_desc' | 'newest' | 'oldest';

export type RestaurantMenuResultsQueryParams = {
  categories?: string[];
  maxPrice?: string;
  minPrice?: string;
  page: number;
  pageSize: number;
  q?: string;
  sort: RestaurantMenuSort;
};

export type RestaurantMenuSummaryResponse = {
  categories: MenuCategorySummary[];
  perCategory: number;
};

export type RestaurantMenuResultsResponse = {
  items: MenuItemListItem[];
  page: number;
  pageSize: number;
  total: number;
};

export class RestaurantMenuQueryError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'RestaurantMenuQueryError';
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

const createRequestInit = (signal?: AbortSignal): RequestInit => {
  const requestInit: RequestInit = { cache: 'no-store' };

  if (signal) {
    requestInit.signal = signal;
  }

  return requestInit;
};

const normalizeCategorySummaries = (categories: unknown): MenuCategorySummary[] => {
  if (!Array.isArray(categories)) {
    return [];
  }

  return categories.map((category) => {
    const item = category as Partial<MenuCategorySummary>;

    return {
      _id: String(item._id || ''),
      name: String(item.name || 'Uncategorized'),
      items: Array.isArray(item.items) ? item.items : [],
      total: Number(item.total || 0),
    };
  });
};

export const buildRestaurantMenuResultsSearchParams = ({
  categories = [],
  maxPrice = '',
  minPrice = '',
  page,
  pageSize,
  q = '',
  sort,
}: RestaurantMenuResultsQueryParams) => {
  const params = new URLSearchParams();
  params.set('limit', String(pageSize));
  params.set('page', String(page));
  params.set('sort', sort);

  if (q) params.set('q', q);
  if (categories.length > 0) params.set('categories', categories.join(','));
  if (minPrice) params.set('minPrice', minPrice);
  if (maxPrice) params.set('maxPrice', maxPrice);

  return params;
};

export const fetchRestaurantMenuCategories = async (
  restaurantId: string,
  signal?: AbortSignal
): Promise<MenuItemCategory[]> => {
  if (!restaurantId) {
    throw new RestaurantMenuQueryError('Restaurant ID is required.', 400);
  }

  const response = await fetch(
    `/api/restaurants/${restaurantId}/menu?groupBy=category&perCategory=1`,
    createRequestInit(signal)
  );
  const payload = await readJson(response);

  if (!response.ok) {
    throw new RestaurantMenuQueryError(
      getErrorMessage(payload, 'Failed to load restaurant menu categories.'),
      response.status
    );
  }

  return normalizeCategorySummaries((payload as Partial<RestaurantMenuSummaryResponse>).categories)
    .map((category) => ({
      _id: category._id,
      name: category.name,
    }))
    .filter((category) => category._id && category.name);
};

export const fetchRestaurantMenuSummary = async (
  restaurantId: string,
  perCategory = 3,
  signal?: AbortSignal
): Promise<RestaurantMenuSummaryResponse> => {
  if (!restaurantId) {
    throw new RestaurantMenuQueryError('Restaurant ID is required.', 400);
  }

  const response = await fetch(
    `/api/restaurants/${restaurantId}/menu?groupBy=category&perCategory=${perCategory}`,
    createRequestInit(signal)
  );
  const payload = await readJson(response);

  if (!response.ok) {
    throw new RestaurantMenuQueryError(
      getErrorMessage(payload, 'Failed to load restaurant menu.'),
      response.status
    );
  }

  return {
    categories: normalizeCategorySummaries(
      (payload as Partial<RestaurantMenuSummaryResponse>).categories
    ),
    perCategory: Number(
      (payload as Partial<RestaurantMenuSummaryResponse>).perCategory || perCategory
    ),
  };
};

export const fetchRestaurantMenuResults = async (
  restaurantId: string,
  params: RestaurantMenuResultsQueryParams,
  signal?: AbortSignal
): Promise<RestaurantMenuResultsResponse> => {
  if (!restaurantId) {
    throw new RestaurantMenuQueryError('Restaurant ID is required.', 400);
  }

  const response = await fetch(
    `/api/restaurants/${restaurantId}/menu?${buildRestaurantMenuResultsSearchParams(params)}`,
    createRequestInit(signal)
  );
  const payload = await readJson(response);

  if (!response.ok) {
    throw new RestaurantMenuQueryError(
      getErrorMessage(payload, 'Failed to load restaurant menu results.'),
      response.status
    );
  }

  const data = payload as Partial<RestaurantMenuResultsResponse>;

  return {
    items: Array.isArray(data.items) ? data.items : [],
    page: Number(data.page || params.page),
    pageSize: Number(data.pageSize || params.pageSize),
    total: Number(data.total || 0),
  };
};

export const useRestaurantMenuCategoriesQuery = (restaurantId: string, enabled: boolean) =>
  useQuery({
    enabled: Boolean(restaurantId) && enabled,
    queryFn: ({ signal }) => fetchRestaurantMenuCategories(restaurantId, signal),
    queryKey: queryKeys.restaurants.publicMenuCategories(restaurantId),
    staleTime: 60_000,
  });

export const useRestaurantMenuSummaryQuery = (
  restaurantId: string,
  perCategory: number,
  enabled: boolean
) =>
  useQuery({
    enabled: Boolean(restaurantId) && enabled,
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => fetchRestaurantMenuSummary(restaurantId, perCategory, signal),
    queryKey: queryKeys.restaurants.publicMenuSummary(restaurantId, perCategory),
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

export const useRestaurantMenuResultsQuery = (
  restaurantId: string,
  params: RestaurantMenuResultsQueryParams,
  enabled: boolean
) =>
  useQuery({
    enabled: Boolean(restaurantId) && enabled,
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => fetchRestaurantMenuResults(restaurantId, params, signal),
    queryKey: queryKeys.restaurants.publicMenuResults(restaurantId, params),
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });

export const prefetchRestaurantMenuSummary = (
  queryClient: QueryClient,
  restaurantId: string,
  perCategory = 3
) => {
  if (!restaurantId) {
    return Promise.resolve();
  }

  return queryClient.prefetchQuery({
    queryFn: ({ signal }) => fetchRestaurantMenuSummary(restaurantId, perCategory, signal),
    queryKey: queryKeys.restaurants.publicMenuSummary(restaurantId, perCategory),
    staleTime: 30_000,
  });
};
