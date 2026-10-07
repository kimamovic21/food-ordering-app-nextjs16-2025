'use client';

import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { AlertTriangle, ChefHat, ExternalLink, Loader2, RefreshCw, StickyNote } from 'lucide-react';
import Title from '@/components/shared/Title';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { sonnerToast } from '@/components/shared/SonnerToastComponent';
import { getOrderListErrorStatus, useOrderQueueQuery } from '@/hooks/useOrderListQueries';
import useProfile from '@/hooks/useProfile';
import { queryKeys } from '@/libs/queryKeys';
import {
  APP_NOTIFICATION_REALTIME_EVENT,
  getNotificationRealtimePayload,
  isOrderRelatedRealtimePayload,
} from '@/libs/realtimeClient';
import type { QueueOrder } from '@/types/order';

const columns: Array<{ status: QueueOrder['orderStatus']; title: string }> = [
  { status: 'placed', title: 'Placed' },
  { status: 'processing', title: 'Processing' },
  { status: 'ready', title: 'Ready' },
  { status: 'transportation', title: 'Out for delivery' },
  { status: 'delivered', title: 'Awaiting confirmation' },
];

const QUEUE_ITEM_PREVIEW_LIMIT = 3;

const getQueueOrderProducts = (order: QueueOrder) =>
  Array.isArray(order.cartProducts) ? order.cartProducts : [];

const getQueueOrderItemCount = (order: QueueOrder) =>
  order.itemCount ??
  getQueueOrderProducts(order).reduce((total, item) => total + Number(item.quantity || 0), 0);

const getQueueItemSizeLabel = (size: string) => {
  const normalizedSize = size.trim();

  if (!normalizedSize || normalizedSize.toLowerCase() === 'single') {
    return 'Regular';
  }

  return normalizedSize.replace(/-/g, ' ');
};

const OrderQueuePage = () => {
  const { data: profileData, loading: profileLoading } = useProfile();
  const queryClient = useQueryClient();
  const isAdmin = profileData?.role === 'admin';
  const queueQuery = useOrderQueueQuery(!profileLoading && isAdmin);
  const orders = useMemo(() => queueQuery.data?.orders || [], [queueQuery.data?.orders]);
  const queueErrorStatus = getOrderListErrorStatus(queueQuery.error);

  useEffect(() => {
    if (!queueQuery.isError || !queueQuery.error) {
      return;
    }

    sonnerToast.error(
      queueQuery.error instanceof Error ? queueQuery.error.message : 'Failed to load order queue'
    );
  }, [queueQuery.error, queueQuery.isError]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const handleRealtimeOrderUpdate = (event: Event) => {
      const payload = getNotificationRealtimePayload(event);

      if (isOrderRelatedRealtimePayload(payload)) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.orders.queue() });
      }
    };

    window.addEventListener(APP_NOTIFICATION_REALTIME_EVENT, handleRealtimeOrderUpdate);

    return () => {
      window.removeEventListener(APP_NOTIFICATION_REALTIME_EVENT, handleRealtimeOrderUpdate);
    };
  }, [isAdmin, queryClient]);

  const groupedOrders = useMemo(
    () =>
      Object.fromEntries(
        columns.map((column) => [
          column.status,
          orders.filter((order) => order.orderStatus === column.status),
        ])
      ) as Record<QueueOrder['orderStatus'], QueueOrder[]>,
    [orders]
  );

  if (profileLoading || queueQuery.isLoading) {
    return (
      <section className='space-y-6'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div className='space-y-3'>
            <Skeleton className='h-10 w-64' />
            <Skeleton className='h-4 w-80 max-w-full' />
          </div>
          <Skeleton className='h-10 w-32' />
        </div>
        <div className='grid gap-4 xl:grid-cols-5'>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className='rounded-lg border p-4'>
              <div className='mb-5 flex items-center justify-between'>
                <Skeleton className='h-5 w-24' />
                <Skeleton className='h-6 w-8 rounded-full' />
              </div>
              <div className='space-y-3'>
                <Skeleton className='h-20 rounded-lg' />
                <Skeleton className='h-24 rounded-lg' />
                <Skeleton className='h-9 rounded-md' />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!isAdmin) {
    return <p className='text-sm text-muted-foreground'>Only admins can view the order queue.</p>;
  }

  if (queueQuery.isError) {
    const message =
      queueQuery.error instanceof Error ? queueQuery.error.message : 'Failed to load order queue';

    return (
      <section className='space-y-6'>
        <Title>Order Queue</Title>
        <Card className='border-destructive/30 bg-destructive/10'>
          <CardContent className='p-6'>
            <p className='font-semibold text-destructive'>
              {queueErrorStatus === 403 ? 'Restaurant queue unavailable' : 'Could not load queue'}
            </p>
            <p className='mt-2 text-sm text-muted-foreground'>{message}</p>
            <Button
              type='button'
              variant='outline'
              className='mt-4 gap-2'
              onClick={() => void queueQuery.refetch()}
            >
              <RefreshCw className='size-4' />
              Try again
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className='space-y-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <Title>Order Queue</Title>
          <p className='mt-2 text-sm text-muted-foreground'>
            Track active orders from kitchen intake through courier handoff.
          </p>
        </div>
        <Button
          type='button'
          variant='outline'
          onClick={() => void queueQuery.refetch()}
          disabled={queueQuery.isFetching}
          className='gap-2'
        >
          {queueQuery.isFetching ? (
            <Loader2 className='size-4 animate-spin' />
          ) : (
            <RefreshCw className='size-4' />
          )}
          {queueQuery.isFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      <div className='grid gap-4 xl:grid-cols-5'>
        {columns.map((column) => (
          <Card key={column.status} className='min-h-72'>
            <CardHeader className='pb-3'>
              <CardTitle className='flex items-center justify-between text-base'>
                {column.title}
                <Badge variant='secondary'>{groupedOrders[column.status].length}</Badge>
              </CardTitle>
              <CardDescription>Current stage</CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              {groupedOrders[column.status].length === 0 ? (
                <p className='rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground'>
                  No orders
                </p>
              ) : (
                groupedOrders[column.status].map((order) => {
                  const queueItems = getQueueOrderProducts(order);
                  const itemCount = getQueueOrderItemCount(order);
                  const previewItems = queueItems.slice(0, QUEUE_ITEM_PREVIEW_LIMIT);
                  const hiddenItemCount = Math.max(queueItems.length - QUEUE_ITEM_PREVIEW_LIMIT, 0);

                  return (
                    <div key={order._id} className='rounded-lg border p-3 text-sm'>
                      <div className='mb-2 flex items-start justify-between gap-2'>
                        <div>
                          <p className='font-semibold'>#{order._id.slice(-8).toUpperCase()}</p>
                          <p className='break-all text-muted-foreground'>{order.email}</p>
                        </div>
                        <div className='flex flex-wrap justify-end gap-1'>
                          {order.hasItemNotes && (
                            <Badge className='border-primary/30 bg-primary/10 text-primary hover:bg-primary/10'>
                              <StickyNote className='mr-1 size-3' />
                              Notes
                            </Badge>
                          )}
                          {order.isCourierAssignmentExpired && (
                            <Badge className='bg-amber-100 text-amber-800 hover:bg-amber-100'>
                              <AlertTriangle className='mr-1 size-3' />
                              Courier missed
                            </Badge>
                          )}
                          {order.isLateBeforeTransport && (
                            <Badge className='bg-red-100 text-red-800 hover:bg-red-100'>
                              <AlertTriangle className='mr-1 size-3' />
                              {order.isReadyWithoutCourierLate ? 'No courier' : 'Late'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className='text-muted-foreground'>{order.minutesSincePlaced} min active</p>
                      {order.courierAssignmentStatus && (
                        <p className='mt-1 capitalize'>
                          Courier: {order.courierAssignmentStatus.replace('_', ' ')}
                        </p>
                      )}
                      {order.isCourierAssignmentExpired && (
                        <p className='mt-1 text-xs text-amber-700 dark:text-amber-300'>
                          Previous courier did not respond. Assign another courier from order
                          details.
                        </p>
                      )}

                      <div className='mt-3 rounded-md border border-border/70 bg-muted/20 p-2.5'>
                        <div className='mb-2 flex items-center justify-between gap-2'>
                          <span className='inline-flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground'>
                            <ChefHat className='size-3.5' />
                            Kitchen items
                          </span>
                          <Badge variant='outline' className='text-[10px]'>
                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                          </Badge>
                        </div>

                        {previewItems.length === 0 ? (
                          <p className='rounded-md border border-dashed p-2 text-xs text-muted-foreground'>
                            No item details saved for this order.
                          </p>
                        ) : (
                          <div className='space-y-1.5'>
                            {previewItems.map((item, index) => {
                              const note = item.note?.trim();

                              return (
                                <div
                                  key={`${item.name}-${item.size}-${index}`}
                                  className='rounded-md bg-background/70 p-2'
                                >
                                  <div className='flex items-start justify-between gap-2'>
                                    <p className='min-w-0 font-medium text-foreground'>
                                      <span className='text-primary'>{item.quantity}x</span>{' '}
                                      {item.name}
                                    </p>
                                    <span className='shrink-0 rounded-full border px-2 py-0.5 text-[10px] capitalize text-muted-foreground'>
                                      {getQueueItemSizeLabel(item.size)}
                                    </span>
                                  </div>
                                  {note && (
                                    <p className='mt-1 flex items-start gap-1 text-xs text-amber-700 dark:text-amber-300'>
                                      <StickyNote className='mt-0.5 size-3 shrink-0' />
                                      <span className='break-words'>Note: {note}</span>
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                            {hiddenItemCount > 0 && (
                              <p className='text-xs text-muted-foreground'>
                                +{hiddenItemCount} more {hiddenItemCount === 1 ? 'item' : 'items'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <p className='mt-3 font-medium'>${Number(order.total || 0).toFixed(2)}</p>
                      <Button asChild variant='outline' size='sm' className='mt-3 w-full gap-2'>
                        <Link href={`/admin-dashboard/orders/${order._id}`}>
                          <ExternalLink className='size-4' />
                          Open
                        </Link>
                      </Button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default OrderQueuePage;
