'use client';

import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { AlertTriangle, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
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
        <Skeleton className='h-10 w-64' />
        <div className='grid gap-4 xl:grid-cols-5'>
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className='h-72 rounded-lg' />
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
                groupedOrders[column.status].map((order) => (
                  <div key={order._id} className='rounded-lg border p-3 text-sm'>
                    <div className='mb-2 flex items-start justify-between gap-2'>
                      <div>
                        <p className='font-semibold'>#{order._id.slice(-8).toUpperCase()}</p>
                        <p className='text-muted-foreground'>{order.email}</p>
                      </div>
                      <div className='flex flex-wrap justify-end gap-1'>
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
                        Previous courier did not respond. Assign another courier from order details.
                      </p>
                    )}
                    <p className='mt-2 font-medium'>${Number(order.total || 0).toFixed(2)}</p>
                    <Button asChild variant='outline' size='sm' className='mt-3 w-full gap-2'>
                      <Link href={`/admin-dashboard/orders/${order._id}`}>
                        <ExternalLink className='size-4' />
                        Open
                      </Link>
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default OrderQueuePage;
