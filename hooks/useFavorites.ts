'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import useAccountScope from '@/hooks/useAccountScope';
import { queryKeys } from '@/libs/queryKeys';
import type { FavoritesState } from '@/types/favorites';

export type { FavoritesState } from '@/types/favorites';

export const emptyFavorites: FavoritesState = {
  favoriteMenuItemIds: [],
  favoriteRestaurantIds: [],
};

const normalizeFavoriteIds = (value: unknown) =>
  Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];

export const fetchFavoriteIds = async (signal?: AbortSignal): Promise<FavoritesState> => {
  const response = await fetch('/api/favorites', { cache: 'no-store', signal });
  const json = await response.json().catch(() => null);

  if (response.status === 401) {
    return emptyFavorites;
  }

  if (!response.ok) {
    throw new Error(json?.error || 'Failed to load favorites');
  }

  return {
    favoriteMenuItemIds: normalizeFavoriteIds(json?.favoriteMenuItemIds),
    favoriteRestaurantIds: normalizeFavoriteIds(json?.favoriteRestaurantIds),
  };
};

const setFavoriteIds = (ids: string[], id: string, isFavorite: boolean) => {
  if (!id) {
    return ids;
  }

  return isFavorite ? Array.from(new Set([...ids, id])) : ids.filter((itemId) => itemId !== id);
};

const useFavorites = () => {
  const { status, viewer, isCurrent } = useAccountScope();
  const queryClient = useQueryClient();
  const isAuthenticated = status === 'authenticated' && Boolean(viewer);

  const favoritesQuery = useQuery({
    enabled: isAuthenticated,
    gcTime: 10 * 60 * 1000,
    queryFn: ({ signal }) => fetchFavoriteIds(signal),
    queryKey: queryKeys.favorites.ids(viewer),
    staleTime: 60 * 1000,
  });

  const setMenuItemFavorite = useCallback(
    (id: string, isFavorite: boolean) => {
      if (!isCurrent()) return;
      queryClient.setQueryData<FavoritesState>(queryKeys.favorites.ids(viewer), (current) => ({
        favoriteMenuItemIds: setFavoriteIds(current?.favoriteMenuItemIds || [], id, isFavorite),
        favoriteRestaurantIds: current?.favoriteRestaurantIds || [],
      }));
    },
    [queryClient, viewer, isCurrent]
  );

  const setRestaurantFavorite = useCallback(
    (id: string, isFavorite: boolean) => {
      if (!isCurrent()) return;
      queryClient.setQueryData<FavoritesState>(queryKeys.favorites.ids(viewer), (current) => ({
        favoriteMenuItemIds: current?.favoriteMenuItemIds || [],
        favoriteRestaurantIds: setFavoriteIds(current?.favoriteRestaurantIds || [], id, isFavorite),
      }));
    },
    [queryClient, viewer, isCurrent]
  );

  const refresh = useCallback(async () => {
    if (isCurrent())
      await queryClient.invalidateQueries({ queryKey: queryKeys.favorites.viewer(viewer) });
  }, [queryClient, viewer, isCurrent]);

  return {
    data: isAuthenticated ? (favoritesQuery.data ?? emptyFavorites) : emptyFavorites,
    error: favoritesQuery.error,
    loading: status === 'loading' || (isAuthenticated && favoritesQuery.isLoading),
    refresh,
    setMenuItemFavorite,
    setRestaurantFavorite,
  };
};

export default useFavorites;
