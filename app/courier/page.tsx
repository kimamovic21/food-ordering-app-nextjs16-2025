'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import useProfile from '@/contexts/UseProfile';

// Dynamic import to prevent SSR issues with Leaflet
const OrderMap = dynamic(() => import('./OrderMap'), {
  ssr: false,
  loading: () => (
    <div className='border rounded-lg p-4 h-[300px] flex items-center justify-center bg-slate-50 dark:bg-slate-900'>
      <p className='text-muted-foreground'>Loading map...</p>
    </div>
  ),
});

type CartProduct = {
  productId: string;
  name: string;
  size: string;
  quantity: number;
  price: number;
};

type OrderDetailsType = {
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
  paymentStatus: boolean;
  orderStatus: 'pending' | 'processing' | 'transportation' | 'completed';
  courierId?: { _id: string; name: string; email: string; image?: string };
  createdAt: string;
  updatedAt: string;
};

const CourierPage = () => {
  const { data: profileData, loading: profileLoading } = useProfile();
  const [orders, setOrders] = useState<OrderDetailsType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const [availability, setAvailability] = useState(false);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  useEffect(() => {
    if (profileLoading || profileData?.role !== 'courier') return;

    // Set initial availability from profile data
    if (profileData?.availability !== undefined) {
      setAvailability(profileData.availability);
    }

    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/courier/orders');
        if (!res.ok) {
          throw new Error('Failed to fetch orders');
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

    fetchOrders();
  }, [profileData?.role, profileLoading, profileData?.availability]);

  const handleCompleteOrder = async (orderId: string) => {
    try {
      setCompleting(orderId);
      const res = await fetch('/api/courier/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to complete order');
        return;
      }

      setOrders(orders.filter((o) => o._id !== orderId));
      toast.success('Order delivered successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to complete order');
    } finally {
      setCompleting(null);
    }
  };

  const handleToggleAvailability = async () => {
    try {
      setTogglingAvailability(true);
      const res = await fetch('/api/courier/availability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to toggle availability');
        return;
      }

      setAvailability(data.availability);
      toast.success(data.message);
    } catch (err) {
      console.error(err);
      toast.error('Failed to toggle availability');
    } finally {
      setTogglingAvailability(false);
    }
  };

  if (profileLoading) {
    return (
      <div className='max-w-7xl mx-auto px-4 py-6'>
        <div className='space-y-6'>
          <div>
            <Skeleton className='h-10 w-96' />
            <Skeleton className='h-5 w-80 mt-2' />
          </div>
          <Skeleton className='h-24 w-full' />
          <div className='space-y-4'>
            {[...Array(2)].map((_, idx) => (
              <Skeleton key={idx} className='h-64 w-full' />
            ))}
          </div>
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
        <div className='space-y-6'>
          <div>
            <Skeleton className='h-10 w-96' />
            <Skeleton className='h-5 w-80 mt-2' />
          </div>
          <Skeleton className='h-24 w-full' />
          <div className='space-y-4'>
            {[...Array(2)].map((_, idx) => (
              <Skeleton key={idx} className='h-64 w-full' />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='max-w-7xl mx-auto px-4 py-6'>
      <div className='mb-6'>
        <h1 className='text-3xl font-bold text-foreground'>Current Delivery</h1>
        <p className='text-muted-foreground mt-2'>
          Active orders ready for delivery: {orders.length}
        </p>
      </div>

      {/* Availability Toggle */}
      <div className='mb-6 flex items-center justify-between bg-slate-50 dark:bg-slate-900 border rounded-lg p-6 gap-8 min-w-[600px]'>
        <div className='flex items-center gap-4 flex-1'>
          <div
            className={`w-3 h-3 rounded-full shrink-0 ${
              availability ? 'bg-green-500' : 'bg-red-500'
            }`}
          ></div>
          <div>
            <p className='font-semibold text-foreground'>
              Status: {availability ? 'Online' : 'Offline'}
            </p>
            <p className='text-sm text-muted-foreground'>
              {availability ? 'You are available for orders' : 'You are not available for orders'}
            </p>
          </div>
        </div>
        <Button
          onClick={handleToggleAvailability}
          disabled={togglingAvailability}
          variant={availability ? 'destructive' : 'default'}
          className={`whitespace-nowrap w-[130px] shrink-0 ${
            availability ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {togglingAvailability ? 'Updating...' : availability ? 'Go Offline' : 'Go Online'}
        </Button>
      </div>

      {error && (
        <div className='bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6'>
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <Card>
          <CardContent className='py-12 text-center'>
            <p className='text-muted-foreground'>No active deliveries at the moment</p>
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
                      Placed on {new Date(order.createdAt).toLocaleDateString()} at{' '}
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </CardDescription>
                  </div>
                  <Badge className='bg-blue-600 hover:bg-blue-700'>In Delivery</Badge>
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
                      <div>
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

                  {/* Map */}
                  <div>
                    <h3 className='font-semibold text-foreground mb-3'>Delivery Location</h3>
                    <OrderMap
                      address={order.streetAddress}
                      city={order.city}
                      postalCode={order.postalCode}
                      country={order.country}
                      customerEmail={order.email}
                    />
                  </div>

                  {/* Delivery Status */}
                  <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm'>
                    <p className='text-blue-900 font-semibold'>
                      📍 This order is currently being transported
                    </p>
                    <p className='text-blue-800 mt-2'>
                      Please complete delivery and mark as delivered when done.
                    </p>
                  </div>

                  {/* Complete Order Button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        disabled={completing === order._id}
                        className='w-full bg-green-600 hover:bg-green-700'
                      >
                        {completing === order._id ? 'Marking as Delivered...' : 'Mark as Delivered'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Complete Delivery</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to complete your delivery for order #
                          {order._id.slice(-8).toUpperCase()}?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className='flex gap-3 justify-end'>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleCompleteOrder(order._id)}
                          className='bg-green-600 hover:bg-green-700'
                        >
                          Confirm
                        </AlertDialogAction>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CourierPage;
