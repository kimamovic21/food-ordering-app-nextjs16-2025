'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import Title from '@/components/shared/Title';
import useProfile from '@/contexts/UseProfile';
import OrdersTable from './OrdersTable';

type OrderType = {
  _id: string;
  email: string;
  total: number;
  paymentStatus: boolean;
  orderStatus: 'pending' | 'processing' | 'completed';
  createdAt: string;
};

const OrdersPage = () => {
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { data, loading } = useProfile();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (loading || !data?.admin) return;

    const currentPage = Math.max(1, parseInt(searchParams?.get('page') || '1', 10));
    setPage(currentPage);

    const fetchOrders = async () => {
      try {
        setLoadingOrders(true);
        const res = await fetch(`/api/orders?page=${currentPage}`);
        const json = await res.json();
        setOrders(json.orders || []);
        setTotalPages(json.totalPages || 1);
      } catch (error) {
        console.error('Failed to load orders', error);
      } finally {
        await new Promise((resolve) => setTimeout(resolve, 500));
        setLoadingOrders(false);
      }
    };

    fetchOrders();
  }, [loading, data?.admin, searchParams]);

  if (loading) {
    return (
      <section className='mt-8 flex flex-col min-h-[calc(100vh-8rem)] max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10'>
        <Skeleton className='h-9 w-32' />

        <div className='mt-8 flex-1 w-full'>
          <Card className='border border-border bg-card text-card-foreground shadow-sm'>
            <div className='overflow-x-auto'>
              <Table className='w-full min-w-[900px] table-fixed'>
                <TableHeader>
                  <TableRow>
                    {[...Array(7)].map((_, idx) => (
                      <TableHead key={idx} className='p-3'>
                        <Skeleton className='h-4 w-24' />
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, rowIdx) => (
                    <TableRow key={rowIdx}>
                      {[...Array(6)].map((_, cellIdx) => (
                        <TableCell key={cellIdx} className='p-3'>
                          <Skeleton className='h-4 w-full' />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        <div className='mt-6 flex items-center justify-center gap-4 pb-4'>
          <Skeleton className='h-9 w-24' />
          <Skeleton className='h-5 w-28' />
          <Skeleton className='h-9 w-24' />
        </div>
      </section>
    );
  }

  if (!data?.admin) return 'Not an admin';

  return (
    <section className='mt-8 flex flex-col min-h-[calc(100vh-8rem)] max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10'>
      <Title>Orders</Title>

      <div className='mt-8 flex-1 flex flex-col'>
        <div className='flex-1'>
          {loadingOrders && (
            <Card className='border border-border bg-card text-card-foreground shadow-sm'>
              <div className='overflow-x-auto'>
                <Table className='w-full min-w-[900px] table-fixed'>
                  <TableHeader>
                    <TableRow>
                      {[...Array(7)].map((_, idx) => (
                        <TableHead key={idx} className='p-3'>
                          <Skeleton className='h-4 w-24' />
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(5)].map((_, rowIdx) => (
                      <TableRow key={rowIdx}>
                        {[...Array(6)].map((_, cellIdx) => (
                          <TableCell key={cellIdx} className='p-3'>
                            <Skeleton className='h-4 w-full' />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          {!loadingOrders && orders.length === 0 && <p>No orders found.</p>}

          {!loadingOrders && orders.length > 0 && (
            <OrdersTable orders={orders} loading={loadingOrders} />
          )}
        </div>

        <div className='mt-auto pt-4 pb-4'>
          {loadingOrders ? (
            <div className='flex items-center justify-center gap-4'>
              <Skeleton className='h-9 w-24' />
              <Skeleton className='h-5 w-28' />
              <Skeleton className='h-9 w-24' />
            </div>
          ) : (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={`/orders?page=${Math.max(1, page - 1)}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const prev = Math.max(1, page - 1);
                      router.push(`/orders?page=${prev}`);
                    }}
                    aria-disabled={page <= 1}
                    className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>

                <div className='flex items-center justify-center px-4 text-sm font-medium text-gray-700'>
                  Page {page} of {totalPages}
                </div>

                <PaginationItem>
                  <PaginationNext
                    href={`/orders?page=${Math.min(totalPages, page + 1)}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const next = Math.min(totalPages, page + 1);
                      router.push(`/orders?page=${next}`);
                    }}
                    aria-disabled={page >= totalPages}
                    className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>
    </section>
  );
};

const OrdersPageWithSuspense = () => (
  <Suspense fallback={<p className='mt-8'>Loading page...</p>}>
    <OrdersPage />
  </Suspense>
);

export default OrdersPageWithSuspense;
