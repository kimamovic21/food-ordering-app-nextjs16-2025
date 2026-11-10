'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useSoundSettings } from '@/contexts/SoundSettingsContext';
import { sonnerToast } from '@/components/shared/SonnerToastComponent';
import { fetchNotificationPage } from '@/hooks/useNotificationInbox';
import { applyNotificationRead } from '@/libs/notificationInbox';
import { queryKeys } from '@/libs/queryKeys';
import {
  dispatchNotificationRealtimeEvent,
  type AppNotificationRealtimePayload,
} from '@/libs/realtimeClient';
import type {
  AppNotification,
  NotificationsApiResponse,
  NotificationCounts,
  NotificationReadOperation,
  NotificationMutationResponse,
} from '@/types/notifications';

export type { AppNotification } from '@/types/notifications';

type NotificationsContextValue = {
  viewer: string;
  notifications: AppNotification[];
  unreadCount: number;
  counts: NotificationCounts | null;
  readBefore: string | null;
  loading: boolean;
  error: string | null;
  pendingRead: NotificationReadOperation | null;
  isUpdatingReadState: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAsUnread: (notificationId: string) => Promise<boolean>;
  markAllAsRead: (readBefore?: string) => Promise<boolean>;
};
const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);
const EMPTY_NOTIFICATIONS: AppNotification[] = [];

export const NotificationsProvider = ({ children }: { children: React.ReactNode }) => {
  const { status, data: session } = useSession();
  const viewer = status === 'authenticated' ? session?.user?.email || '' : '';
  const activeViewer = useRef(viewer);
  activeViewer.current = viewer;
  const queryClient = useQueryClient();
  const { playNotificationSound } = useSoundSettings();
  const soundBaseline = useRef<{ viewer: string; latestId: string | null; initialized: boolean }>({
    viewer: '',
    latestId: null,
    initialized: false,
  });
  const [pending, setPending] = useState<{
    viewer: string;
    operation: NotificationReadOperation;
  } | null>(null);
  const busy = useRef<{ viewer: string } | null>(null);
  const pendingRead = pending?.viewer === viewer ? pending.operation : null;

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.notifications.summary(viewer),
    queryFn: ({ signal }) => fetchNotificationPage({ limit: 12 }, signal),
    enabled: Boolean(viewer),
    refetchInterval: 10000,
    gcTime: 0,
  });

  useEffect(() => {
    if (!viewer) return;
    return () => {
      const key = queryKeys.notifications.viewer(viewer);
      void queryClient.cancelQueries({ queryKey: key });
      queryClient.removeQueries({ queryKey: key });
    };
  }, [viewer, queryClient]);

  useEffect(() => {
    const latestId = data?.notifications[0]?._id || null;
    const baseline = soundBaseline.current;
    // Read/unread toggles change counts but must not play the new-arrival sound.
    if (
      baseline.viewer === viewer &&
      baseline.initialized &&
      latestId &&
      latestId !== baseline.latestId
    ) {
      playNotificationSound();
    }
    if (data || baseline.viewer !== viewer)
      soundBaseline.current = { viewer, latestId, initialized: Boolean(data) };
  }, [data, viewer, playNotificationSound]);

  const refreshNotifications = useCallback(async () => {
    if (viewer)
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.viewer(viewer) });
  }, [viewer, queryClient]);

  useEffect(() => {
    if (!viewer) return;
    let source: EventSource | undefined;
    try {
      source = new EventSource('/api/notifications/stream');
      source.onmessage = (event) => {
        if (activeViewer.current !== viewer) return;
        try {
          const payload = JSON.parse(event.data) as AppNotificationRealtimePayload;
          if (payload?.type === 'ready') return;
          dispatchNotificationRealtimeEvent(payload);
        } catch {
          /* A malformed event still triggers a source-of-truth refresh. */
        }
        void refreshNotifications();
      };
      source.onerror = () => {
        /* Foreground polling is the fallback. */
      };
    } catch {
      /* EventSource may be unavailable; polling remains enabled. */
    }
    return () => source?.close();
  }, [viewer, refreshNotifications]);

  const updateReadState = useCallback(
    async (operation: NotificationReadOperation) => {
      if (!viewer || busy.current?.viewer === viewer) return false;
      const token = { viewer };
      busy.current = token;
      setPending({ viewer, operation });
      try {
        await queryClient.cancelQueries({ queryKey: queryKeys.notifications.viewer(viewer) });
        if (activeViewer.current !== viewer) return false;
        const response = await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(operation),
        });
        const body = (await response.json().catch(() => null)) as
          (NotificationMutationResponse & { error?: string }) | null;
        if (!response.ok || !body?.success || !body.counts) {
          throw new Error(body?.error || 'Could not confirm the update. Please try again.');
        }
        if (activeViewer.current !== viewer) return false;
        queryClient.setQueryData<NotificationsApiResponse>(
          queryKeys.notifications.summary(viewer),
          (current) =>
            current
              ? {
                  ...current,
                  notifications: applyNotificationRead(current.notifications, operation),
                  counts: body.counts,
                  unreadCount: body.unreadCount,
                }
              : current
        );
        queryClient.setQueriesData<InfiniteData<NotificationsApiResponse>>(
          { queryKey: queryKeys.notifications.inboxes(viewer) },
          (current) =>
            current
              ? {
                  ...current,
                  pages: current.pages.map((page) => ({
                    ...page,
                    notifications: applyNotificationRead(page.notifications, operation),
                  })),
                }
              : current
        );
        await refreshNotifications();
        return true;
      } catch (error) {
        if (activeViewer.current === viewer) {
          sonnerToast.error(
            error instanceof Error ? error.message : 'Could not update notifications'
          );
          void refreshNotifications();
        }
        return false;
      } finally {
        if (busy.current === token) {
          busy.current = null;
          setPending(null);
        }
      }
    },
    [viewer, queryClient, refreshNotifications]
  );

  const markAsRead = useCallback(
    (notificationId: string) => updateReadState({ action: 'mark-read', notificationId }),
    [updateReadState]
  );
  const markAsUnread = useCallback(
    (notificationId: string) => updateReadState({ action: 'mark-unread', notificationId }),
    [updateReadState]
  );
  const markAllAsRead = useCallback(
    async (boundary?: string) => {
      const readBefore = boundary || data?.readBefore;
      if (!readBefore) return false;
      return updateReadState({ action: 'mark-all-read', readBefore });
    },
    [data?.readBefore, updateReadState]
  );

  const notifications = useMemo(
    () => applyNotificationRead(data?.notifications || EMPTY_NOTIFICATIONS, pendingRead),
    [data?.notifications, pendingRead]
  );
  const value = useMemo(
    () => ({
      viewer,
      notifications,
      unreadCount: data?.unreadCount || 0,
      counts: data?.counts || null,
      readBefore: data?.readBefore || null,
      loading: Boolean(viewer) && isLoading,
      error: error instanceof Error ? error.message : null,
      pendingRead,
      isUpdatingReadState: Boolean(pendingRead),
      refreshNotifications,
      markAsRead,
      markAsUnread,
      markAllAsRead,
    }),
    [
      viewer,
      notifications,
      data,
      isLoading,
      error,
      pendingRead,
      refreshNotifications,
      markAsRead,
      markAsUnread,
      markAllAsRead,
    ]
  );
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications must be used within NotificationsProvider');
  return context;
};
