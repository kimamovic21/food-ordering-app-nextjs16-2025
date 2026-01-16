'use client';

import { useEffect, useState } from 'react';
import useProfile from '@/contexts/UseProfile';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type CartProduct = {
  productId: string;
  name: string;
  size: string;
  quantity: number;
  price: number;
};

type DeliveredOrder = {
  _id: string;
  userId: string;
  email: string;
  phone: string;
  streetAddress: string;
  postalCode: string;
  city: string;
  country: string;
  cartProducts: CartProduct[];
  total: number;
  orderPaid: boolean;
  orderStatus: 'completed';
  createdAt: string;
  updatedAt: string;
};

const MyDeliveriesPage = () => {
  const { data: profileData, loading: profileLoading } = useProfile();
  const [orders, setOrders] = useState<DeliveredOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profileLoading || profileData?.role !== 'courier') return;

    const fetchDeliveredOrders = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/courier/my-deliveries');
        if (!res.ok) {
          throw new Error('Failed to fetch delivered orders');
        }
        const data = await res.json();
        setOrders(data.orders);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveredOrders();
  }, [profileData?.role, profileLoading]);

  if (profileLoading) {
    return (
      <div className='max-w-7xl mx-auto px-4 py-6'>
        <div className='space-y-4'>
          <Skeleton className='h-8 w-48' />
          <Skeleton className='h-96 w-full' />
        </div>
      </div>
    );
  }

  if (profileData?.role !== 'courier') {
    return (
      <div className='max-w-7xl mx-auto px-4 py-6'>
        <div className='text-red-500'>Unauthorized: Only couriers can access this page</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className='max-w-7xl mx-auto px-4 py-6'>
        <div className='space-y-4'>
          <Skeleton className='h-8 w-48' />
          <div className='space-y-4'>
            {[...Array(3)].map((_, idx) => (
              <Skeleton key={idx} className='h-48 w-full' />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='max-w-7xl mx-auto px-4 py-6'>
      <div className='mb-6'>
        <h1 className='text-3xl font-bold text-foreground'>My Deliveries</h1>
        <p className='text-muted-foreground mt-2'>
          Total completed deliveries: {orders.length}
        </p>
      </div>

      {error && (
        <div className='bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6'>
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <Card>
          <CardContent className='py-12 text-center'>
            <p className='text-muted-foreground'>No completed deliveries yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className='space-y-4'>
          {orders.map((order) => (
            <Card key={order._id} className='hover:shadow-lg transition-shadow'>
              <CardHeader>
                <div className='flex items-start justify-between'>
                  <div>
                    <CardTitle className='text-lg'>
                      Order #{order._id.slice(-8).toUpperCase()}
                    </CardTitle>
                    <CardDescription>
                      Delivered on {new Date(order.updatedAt).toLocaleDateString()} at{' '}
                      {new Date(order.updatedAt).toLocaleTimeString()}
                    </CardDescription>
                  </div>
                  <Badge className='bg-green-600 hover:bg-green-700'>Delivered</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  {/* Customer Info */}
                  <div className='border rounded-lg p-4'>
                    <h3 className='font-semibold text-foreground mb-3'>Customer Details</h3>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
                      <div>
                        <span className='text-muted-foreground'>Email:</span>
                        <p className='text-foreground'>{order.email}</p>
                      </div>
                      <div>
                        <span className='text-muted-foreground'>Phone:</span>
                        <p className='text-foreground'>{order.phone}</p>
                      </div>
                      <div className='md:col-span-2'>
                        <span className='text-muted-foreground'>Address:</span>
                        <p className='text-foreground'>
                          {order.streetAddress}, {order.postalCode} {order.city}, {order.country}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div className='border rounded-lg p-4'>
                    <h3 className='font-semibold text-foreground mb-3'>Items</h3>
                    <div className='space-y-2'>
                      {order.cartProducts.map((product, idx) => (
                        <div key={idx} className='flex justify-between items-center text-sm'>
                          <div>
                            <p className='font-medium text-foreground'>{product.name}</p>
                            <p className='text-muted-foreground'>
                              Size: {product.size} x {product.quantity}
                            </p>
                          </div>
                          <p className='font-medium text-foreground'>${product.price}</p>
                        </div>
                      ))}
                    </div>
                    <div className='border-t mt-4 pt-4 flex justify-between font-semibold'>
                      <span>Total:</span>
                      <span>${order.total}</span>
                    </div>
                  </div>

                  {/* Order Timeline */}
                  <div className='bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 text-sm'>
                    <p className='text-green-900 dark:text-green-100 font-semibold'>
                      ✅ Delivery Completed
                    </p>
                    <p className='text-green-800 dark:text-green-200 mt-1'>
                      Order placed: {new Date(order.createdAt).toLocaleDateString()} at{' '}
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyDeliveriesPage;