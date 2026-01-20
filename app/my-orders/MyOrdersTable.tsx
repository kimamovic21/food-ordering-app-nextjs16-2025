'use client';

import { useState } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

type OrderType = {
  _id: string;
  email: string;
  total: number;
  paymentStatus: boolean;
  orderStatus: 'placed' | 'processing' | 'ready' | 'completed';
  createdAt: string;
};

type MyOrdersTableProps = {
  orders: OrderType[];
  loading: boolean;
};

const MyOrdersTable = ({ orders, loading }: MyOrdersTableProps) => {
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleFinishPayment = async (orderId: string) => {
    try {
      setProcessingPayment(orderId);
      const res = await fetch(`/api/payment-link?orderId=${orderId}`);
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to get payment link');
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Payment link not available');
      }
    } catch (error) {
      console.error('Error fetching payment link:', error);
      alert('Failed to get payment link');
    } finally {
      setProcessingPayment(null);
    }
  };

  if (loading) {
    return (
      <Card className='border border-border bg-card text-card-foreground shadow-sm'>
        <div className='p-4'>
          <Skeleton className='h-8 w-48 mb-4' />
        </div>

        <div className='overflow-x-auto'>
          <Table className='w-full min-w-[900px] table-fixed'>
            <TableHeader>
              <TableRow>
                {['w-32', 'w-52', 'w-64', 'w-32', 'w-28', 'w-36', 'w-40'].map((w, idx) => (
                  <TableHead key={idx} className='p-3'>
                    <Skeleton className={`h-4 ${w}`} />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(4)].map((_, rowIdx) => (
                <TableRow key={rowIdx}>
                  {[
                    'w-24', // id
                    'w-40', // date
                    'w-64', // email
                    'w-24', // total
                    'w-20', // payment status
                    'w-28', // order status
                    'w-32', // action
                  ].map((w, cellIdx) => (
                    <TableCell key={cellIdx} className='p-3'>
                      <Skeleton className={`h-4 ${w}`} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    );
  }

  if (orders.length === 0) {
    return <p className='text-muted-foreground'>No orders found.</p>;
  }

  return (
    <Card className='border border-border bg-card text-card-foreground shadow-sm'>
      <div className='overflow-x-auto'>
        <Table className='w-full min-w-[900px] table-fixed'>
          <TableHeader className='bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground'>
            <TableRow>
              <TableHead className='p-3 w-32'>Order ID</TableHead>
              <TableHead className='p-3 w-52'>Date</TableHead>
              <TableHead className='p-3 w-64'>Email</TableHead>
              <TableHead className='p-3 w-32'>Total</TableHead>
              <TableHead className='p-3 w-32'>Payment</TableHead>
              <TableHead className='p-3 w-36'>Order Status</TableHead>
              <TableHead className='p-3 w-40'>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className='divide-y divide-border'>
            {orders.map((order) => (
              <TableRow key={order._id} className='hover:bg-muted/50'>
                <TableCell className='p-3 font-semibold text-xs'>
                  {order._id.substring(0, 8)}...
                </TableCell>
                <TableCell className='p-3 text-muted-foreground'>
                  {formatDate(order.createdAt)}
                </TableCell>
                <TableCell className='p-3 text-muted-foreground'>{order.email}</TableCell>
                <TableCell className='p-3 font-semibold'>${order.total.toFixed(2)}</TableCell>
                <TableCell className='p-3'>
                  <Badge
                    variant={order.paymentStatus ? 'secondary' : 'destructive'}
                    className={
                      order.paymentStatus
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                        : ''
                    }
                  >
                    {order.paymentStatus ? 'Paid' : 'Unpaid'}
                  </Badge>
                </TableCell>
                <TableCell className='p-3'>
                  <Badge
                    variant='secondary'
                    className={
                      order.orderStatus === 'completed'
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 capitalize'
                        : order.orderStatus === 'processing'
                        ? 'bg-blue-100 text-blue-800 hover:bg-blue-100 capitalize'
                        : 'bg-amber-100 text-amber-800 hover:bg-amber-100 capitalize'
                    }
                  >
                    {order.orderStatus}
                  </Badge>
                </TableCell>
                <TableCell className='p-3'>
                  <div className='flex gap-2'>
                    <Link href={`/my-orders/${order._id}`}>
                      <Button size='sm' variant='default'>
                        View
                      </Button>
                    </Link>
                    {!order.paymentStatus && (
                      <Button
                        size='sm'
                        variant='default'
                        onClick={() => handleFinishPayment(order._id)}
                        disabled={processingPayment === order._id}
                        className='bg-primary hover:bg-orange-700 whitespace-nowrap'
                      >
                        {processingPayment === order._id ? 'Loading...' : 'Finish Payment'}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

export default MyOrdersTable;
