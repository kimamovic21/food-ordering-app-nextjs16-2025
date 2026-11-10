'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { parseAsStringLiteral, useQueryStates } from 'nuqs';
import {
  ArrowLeft,
  Bell,
  Clock3,
  Check,
  CheckCheck,
  Settings,
  RefreshCw,
  Loader2,
  FilterX,
  Mail,
  MailOpen,
  ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useNotificationInbox } from '@/hooks/useNotificationInbox';
import {
  applyNotificationRead,
  matchesNotificationFilters,
  mergeNotificationPages,
  NOTIFICATION_CATEGORIES,
} from '@/libs/notificationInbox';
import { resolveNotificationTargetPath, type NotificationRole } from '@/libs/notificationClient';
import { formatAppDateTime } from '@/libs/dateFormat';
import type {
  AppNotification,
  NotificationCategory,
  NotificationStatusFilter,
} from '@/types/notifications';

type NotificationsCenterProps = {
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
  role: NotificationRole;
};

const statuses = ['all', 'unread', 'read'] as const;
const categories = ['all', 'orders', 'delivery', 'support', 'restaurants', 'inventory'] as const;
const statusLabels = { all: 'All', unread: 'Unread', read: 'Read' };

const NotificationsCenter = ({
  title,
  description,
  backHref,
  backLabel,
  role,
}: NotificationsCenterProps) => {
  const router = useRouter();
  const {
    viewer,
    counts,
    readBefore,
    error: summaryError,
    pendingRead,
    isUpdatingReadState,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    refreshNotifications,
  } = useNotifications();
  const [filters, setFilters] = useQueryStates({
    status: parseAsStringLiteral(statuses).withDefault('all'),
    category: parseAsStringLiteral(categories).withDefault('all'),
  });
  const inbox = useNotificationInbox(viewer, filters);
  const notifications = useMemo(() => {
    const items = mergeNotificationPages(inbox.data?.pages.map((page) => page.notifications) || []);
    return applyNotificationRead(items, pendingRead).filter((item) =>
      matchesNotificationFilters(item, filters)
    );
  }, [inbox.data, pendingRead, filters]);
  const loading = !viewer || inbox.isPending;
  const filtered = filters.status !== 'all' || filters.category !== 'all';
  const error = inbox.error instanceof Error ? inbox.error.message : summaryError;
  const boundary = inbox.data?.pages[0]?.readBefore || readBefore;
  const markAllPending = pendingRead?.action === 'mark-all-read';

  const openNotification = (notification: AppNotification) => {
    if (!notification.isRead) void markAsRead(notification._id);
    const target = resolveNotificationTargetPath(notification, role);
    if (target) router.push(target);
  };

  const loadMore = async () => {
    if (inbox.hasNextPage && !inbox.isFetching) await inbox.fetchNextPage({ cancelRefetch: false });
  };

  return (
    <section className='mx-auto mt-8 min-h-[calc(100vh-8rem)] w-full min-w-0 max-w-5xl px-4 sm:px-6 lg:px-8'>
      <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='flex min-w-0 items-start gap-3'>
          <Button asChild variant='ghost' size='icon' className='shrink-0' title={backLabel}>
            <Link href={backHref} aria-label={backLabel}>
              <ArrowLeft className='h-4 w-4' />
            </Link>
          </Button>
          <div className='min-w-0'>
            <h1 className='text-2xl font-bold'>{title}</h1>
            <p className='mt-1 text-sm text-muted-foreground'>{description}</p>
          </div>
        </div>
        <div className='flex shrink-0 flex-wrap items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            title='Mark all notifications as read, including other pages and filters'
            onClick={() => void markAllAsRead(boundary || undefined)}
            disabled={!counts?.unread || !boundary || isUpdatingReadState}
          >
            {markAllPending ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <CheckCheck className='h-4 w-4' />
            )}
            {markAllPending ? 'Updating...' : 'Mark all as read'}
          </Button>
          <Button
            variant='outline'
            size='icon'
            title='Refresh notifications'
            aria-label='Refresh notifications'
            disabled={inbox.isFetching || isUpdatingReadState}
            onClick={() => void refreshNotifications()}
          >
            <RefreshCw className={inbox.isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </Button>
          <Button variant='outline' size='icon' asChild title='Notification settings'>
            <Link href='/notifications/settings' aria-label='Notification settings'>
              <Settings className='h-4 w-4' />
            </Link>
          </Button>
        </div>
      </div>

      <div className='mb-6 grid grid-cols-3 gap-2 sm:gap-4' aria-label='Notification totals'>
        {[
          { label: 'Total', value: counts?.total, Icon: Bell, color: 'text-primary' },
          {
            label: 'Unread',
            value: counts?.unread,
            Icon: Clock3,
            color: 'text-amber-600 dark:text-amber-400',
          },
          {
            label: 'Read',
            value: counts?.read,
            Icon: Check,
            color: 'text-emerald-600 dark:text-emerald-400',
          },
        ].map(({ label, value, Icon, color }) => (
          <Card key={label} className='min-w-0 rounded-lg py-0'>
            <CardContent className='flex min-w-0 flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-5'>
              <Icon className={'h-5 w-5 shrink-0 ' + color} />
              <div className='min-w-0'>
                <p className='text-sm text-muted-foreground'>{label}</p>
                <p
                  className='break-all text-xl font-semibold tabular-nums'
                  aria-label={label + ' notifications'}
                >
                  {value ?? '-'}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className='mb-4 flex min-w-0 flex-col gap-3 border-y border-border py-3 sm:flex-row sm:items-center sm:justify-between'>
        <div
          role='group'
          aria-label='Notification status'
          className='grid grid-cols-3 gap-1 rounded-lg bg-muted p-1 sm:w-64'
        >
          {statuses.map((status) => (
            <Button
              key={status}
              type='button'
              size='sm'
              variant={filters.status === status ? 'secondary' : 'ghost'}
              className='min-w-0'
              aria-pressed={filters.status === status}
              onClick={() => void setFilters({ status: status as NotificationStatusFilter })}
            >
              {statusLabels[status]}
            </Button>
          ))}
        </div>
        <div className='flex min-w-0 items-center gap-2 sm:w-64'>
          <Select
            value={filters.category}
            onValueChange={(category) =>
              void setFilters({ category: category as NotificationCategory })
            }
          >
            <SelectTrigger
              data-slot='button'
              aria-label='Notification category'
              className='w-full min-w-0'
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {NOTIFICATION_CATEGORIES[category].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filtered && (
            <Button
              variant='ghost'
              size='icon'
              className='shrink-0'
              title='Clear filters'
              aria-label='Clear filters'
              onClick={() => void setFilters({ status: 'all', category: 'all' })}
            >
              <FilterX className='h-4 w-4' />
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div
          role='alert'
          className='mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive'
        >
          {error}
          <Button
            size='sm'
            variant='ghost'
            className='ml-2'
            onClick={() => void refreshNotifications()}
            disabled={inbox.isFetching}
          >
            Try again
          </Button>
        </div>
      )}

      <div className='space-y-3' aria-busy={loading || inbox.isFetchingNextPage}>
        {loading
          ? Array.from({ length: 5 }, (_, index) => (
              <div
                key={index}
                className='space-y-3 rounded-lg border p-5'
                aria-label='Loading notification'
              >
                <Skeleton className='h-5 w-2/3' />
                <Skeleton className='h-4 w-full' />
                <Skeleton className='h-4 w-1/3' />
              </div>
            ))
          : notifications.length === 0
            ? !error && (
                <div className='py-12 text-center'>
                  <Bell className='mx-auto mb-3 h-8 w-8 text-muted-foreground' />
                  <h2 className='text-lg font-semibold'>
                    {filtered ? 'No notifications match these filters' : 'No notifications yet'}
                  </h2>
                  {filtered && (
                    <Button
                      className='mt-3'
                      variant='ghost'
                      onClick={() => void setFilters({ status: 'all', category: 'all' })}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              )
            : notifications.map((notification) => {
                const target = resolveNotificationTargetPath(notification, role);
                const isPending =
                  pendingRead?.action === 'mark-all-read'
                    ? Date.parse(notification.createdAt) < Date.parse(pendingRead.readBefore)
                    : pendingRead?.notificationId === notification._id;
                return (
                  <Card
                    key={notification._id}
                    className={
                      'min-w-0 rounded-lg py-0 ' +
                      (notification.isRead ? 'bg-background' : 'border-primary/30 bg-primary/5')
                    }
                  >
                    <CardContent className='space-y-3 p-4 sm:p-5'>
                      <div className='flex items-start justify-between gap-3'>
                        <div className='min-w-0'>
                          <h2 className='break-words text-base font-semibold'>
                            {notification.title}
                          </h2>
                          <time
                            dateTime={notification.createdAt}
                            className='text-xs text-muted-foreground'
                          >
                            {formatAppDateTime(notification.createdAt)}
                          </time>
                        </div>
                        <Badge
                          variant={notification.isRead ? 'secondary' : 'default'}
                          className='shrink-0'
                        >
                          {notification.isRead ? 'Read' : 'Unread'}
                        </Badge>
                      </div>
                      <p className='break-words text-sm leading-relaxed text-muted-foreground'>
                        {notification.message}
                      </p>
                      <div className='flex flex-wrap items-center justify-between gap-2'>
                        {target && (
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => openNotification(notification)}
                          >
                            <ArrowUpRight className='h-4 w-4' />
                            View details
                          </Button>
                        )}
                        <Button
                          variant='ghost'
                          size='sm'
                          className='ml-auto'
                          disabled={isUpdatingReadState}
                          onClick={() =>
                            void (notification.isRead
                              ? markAsUnread(notification._id)
                              : markAsRead(notification._id))
                          }
                        >
                          {isPending ? (
                            <Loader2 className='h-4 w-4 animate-spin' />
                          ) : notification.isRead ? (
                            <Mail className='h-4 w-4' />
                          ) : (
                            <MailOpen className='h-4 w-4' />
                          )}
                          {notification.isRead ? 'Mark as unread' : 'Mark as read'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
        {!loading && inbox.hasNextPage && (
          <div className='flex justify-center py-5'>
            <Button
              onClick={() => void loadMore()}
              disabled={inbox.isFetching || isUpdatingReadState}
              variant='outline'
            >
              {inbox.isFetchingNextPage && <Loader2 className='h-4 w-4 animate-spin' />}
              {inbox.isFetchingNextPage ? 'Loading...' : 'Load more'}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default NotificationsCenter;
