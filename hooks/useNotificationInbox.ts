'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/libs/queryKeys';
import { NOTIFICATION_PAGE_SIZE } from '@/libs/notificationInbox';
import type { NotificationFilters, NotificationsApiResponse } from '@/types/notifications';

export async function fetchNotificationPage(
  params: { limit?: number; before?: string | null } & Partial<NotificationFilters>,
  signal?: AbortSignal
): Promise<NotificationsApiResponse> {
  const search = new URLSearchParams({ limit: String(params.limit || NOTIFICATION_PAGE_SIZE) });
  if (params.status) search.set('status', params.status);
  if (params.category) search.set('category', params.category);
  if (params.before) search.set('before', params.before);
  const response = await fetch(`/api/notifications?${search}`, { cache: 'no-store', signal });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || 'Failed to load notifications');
  if (!Array.isArray(body?.notifications) || !body?.counts || typeof body.readBefore !== 'string') {
    throw new Error('Invalid notification response. Please refresh.');
  }
  return body;
}

export function useNotificationInbox(viewer: string, filters: NotificationFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.notifications.inbox(viewer, filters),
    queryFn: ({ pageParam, signal }) =>
      fetchNotificationPage({ ...filters, before: pageParam }, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => (page.hasMore ? page.nextCursor : undefined),
    enabled: Boolean(viewer),
    refetchInterval: 10000,
    gcTime: 0,
  });
}
