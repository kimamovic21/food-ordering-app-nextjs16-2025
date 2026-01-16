'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import useProfile from '@/contexts/UseProfile';
import Link from 'next/link';
import OrderInfoCard from './OrderInfoCard';
import CustomerInfoCard from './CustomerInfoCard';
import OrderItemsCard from './OrderItemsCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

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
  stripeSessionId?: string;
};

type CourierType = {
  _id: string;
  name: string;
  email: string;
  image?: string;
  availability: boolean;
  takenOrder?: string;
  role: string;
};

const OrderDetailPage = () => {
  const [order, setOrder] = useState<OrderDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'processing' | 'transportation'>(
    'pending'
  );
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [couriers, setCouriers] = useState<CourierType[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<string>('');
  const [assigningCourier, setAssigningCourier] = useState(false);
  const [showCourierSelect, setShowCourierSelect] = useState(false);
  const { data: profileData, loading: profileLoading } = useProfile();
  const params = useParams();
  const orderId = params?.id as string;

  useEffect(() => {
    if (profileLoading || profileData?.role !== 'admin') return;

    const fetchOrder = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/orders?id=${orderId}`);
        if (!res.ok) {
          throw new Error('Failed to fetch order');
        }
        const json = await res.json();
        setOrder(json.order);
        setSelectedStatus((json.order.orderStatus === 'completed' ? 'transportation' : json.order.orderStatus) || 'pending');
        setStatusError('');
      } catch (err) {
        console.error('Failed to load order', err);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId, profileData?.role, profileLoading]);

  // Fetch available couriers when order status is transportation
  useEffect(() => {
    if (order?.orderStatus === 'transportation') {
      const fetchCouriers = async () => {
        try {
          const res = await fetch('/api/couriers?availableOnly=true');
          if (!res.ok) throw new Error('Failed to fetch couriers');
          const data = await res.json();
          setCouriers(data.couriers);
        } catch (err) {
          console.error('Failed to fetch couriers', err);
        }
      };
      fetchCouriers();
    }
  }, [order?.orderStatus]);

  const handleStatusUpdate = async () => {
    if (!order) return;

    if (!order.paymentStatus) {
      setStatusError('Payment must be completed before updating order status.');
      return;
    }

    setStatusUpdating(true);
    setStatusError('');

    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order._id, orderStatus: selectedStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatusError(data.error || 'Failed to update order status');
        return;
      }

      setOrder(data.order);
      setSelectedStatus(data.order.orderStatus);
      toast.success('Order status updated successfully');
    } catch (err) {
      setStatusError('Failed to update order status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAssignCourier = async () => {
    if (!order || !selectedCourier) return;

    try {
      setAssigningCourier(true);
      const res = await fetch('/api/couriers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courierId: selectedCourier, orderId: order._id }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to assign courier');
        return;
      }

      // Update order with courier info
      const updatedOrder = {
        ...order,
        courierId: data.courier,
      };
      setOrder(updatedOrder);
      setShowCourierSelect(false);
      setSelectedCourier('');
      toast.success('Courier assigned successfully');
    } catch (err) {
      toast.error('Failed to assign courier');
    } finally {
      setAssigningCourier(false);
    }
  };

  if (profileLoading || (loading && !order)) {
    return (
      <section className='mt-8 max-w-6xl mx-auto px-4 sm:px-6 lg:px-10'>
        <Breadcrumb className='mb-6'>
          <BreadcrumbList>
            <BreadcrumbItem>
              <Skeleton className='h-4 w-16' />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <Skeleton className='h-4 w-24' />
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className='space-y-6'>
          <Card>
            <CardHeader>
              <Skeleton className='h-6 w-full max-w-xs' />
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {[...Array(4)].map((_, idx) => (
                  <div key={idx}>
                    <Skeleton className='h-4 w-40 mb-2' />
                    <Skeleton className='h-6 w-full' />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className='h-6 w-full max-w-xs' />
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {[...Array(6)].map((_, idx) => (
                  <div key={idx}>
                    <Skeleton className='h-4 w-40 mb-2' />
                    <Skeleton className='h-6 w-full' />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className='h-6 w-full max-w-xs' />
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                <div className='space-y-2'>
                  {[...Array(3)].map((_, idx) => (
                    <Skeleton key={idx} className='h-12 w-full' />
                  ))}
                </div>
                <div className='border-t pt-4 space-y-2'>
                  <div className='flex justify-between'>
                    <Skeleton className='h-5 w-20' />
                    <Skeleton className='h-5 w-16' />
                  </div>
                  <div className='flex justify-between border-t pt-2'>
                    <Skeleton className='h-6 w-16' />
                    <Skeleton className='h-6 w-20' />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  if (!profileData?.role || profileData.role !== 'admin') return 'Not an admin';

  if (error) return <div className='mt-8 text-red-600'>{error}</div>;

  if (!order) return <div className='mt-8'>Order not found</div>;

  return (
    <section className='mt-8 max-w-6xl mx-auto px-4 sm:px-6 lg:px-10'>
      <Breadcrumb className='mb-6'>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href='/orders'>Orders</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Order Details</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className='space-y-6'>
        <OrderInfoCard
          orderId={order._id}
          paymentStatus={order.paymentStatus}
          orderStatus={order.orderStatus}
          createdAt={order.createdAt}
          updatedAt={order.updatedAt}
          stripeSessionId={order.stripeSessionId}
        />

        <Card>
          <CardHeader>
            <CardTitle>Update Order Status</CardTitle>
            <CardDescription>
              {order.orderStatus === 'completed' 
                ? 'Order delivered successfully. You are not able to update order delivery status.'
                : order.orderStatus === 'transportation'
                ? 'Order is being delivered. Status cannot be changed.'
                : 'You can only move the order forward after payment is completed.'}
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex-1 space-y-2'>
              <p className='text-sm text-muted-foreground'>Order Status</p>
              <Select
                value={selectedStatus}
                onValueChange={(value) => setSelectedStatus(value as typeof selectedStatus)}
                disabled={!order.paymentStatus || statusUpdating || order.orderStatus === 'transportation' || order.orderStatus === 'completed'}
              >
                <SelectTrigger className='w-full sm:w-60'>
                  <SelectValue placeholder='Select status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='pending'>pending</SelectItem>
                  <SelectItem value='processing'>processing</SelectItem>
                  <SelectItem value='transportation'>transportation</SelectItem>
                </SelectContent>
              </Select>
              {!order.paymentStatus && (
                <p className='text-xs text-amber-600'>Payment required before changing status.</p>
              )}
              {statusError && <p className='text-sm text-red-600'>{statusError}</p>}
            </div>
            <Button
              onClick={handleStatusUpdate}
              disabled={statusUpdating || !order.paymentStatus || order.orderStatus === 'transportation' || order.orderStatus === 'completed'}
              className='self-start'
            >
              {statusUpdating ? 'Updating...' : 'Save status'}
            </Button>
          </CardContent>
        </Card>

        {order.orderStatus === 'completed' && order.courierId && (
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                ✅ Order Completed
              </CardTitle>
              <CardDescription>
                This order has been successfully delivered.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='border rounded-lg p-4 bg-green-50 dark:bg-green-950'>
                <p className='font-semibold text-green-900 dark:text-green-100 mb-2'>
                  Delivered By
                </p>
                <div className='flex items-center gap-3'>
                  {order.courierId.image && (
                    <img
                      src={order.courierId.image}
                      alt={order.courierId.name}
                      className='w-10 h-10 rounded-full'
                    />
                  )}
                  <div>
                    <p className='font-medium'>{order.courierId.name}</p>
                    <p className='text-sm text-gray-600 dark:text-gray-300'>
                      {order.courierId.email}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {order.orderStatus === 'transportation' && (
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                {order.courierId ? '📍 Order Being Transported' : '📦 Order Set to be Transported'}
              </CardTitle>
              <CardDescription>
                {order.courierId 
                  ? 'This order is currently being transported to the customer.'
                  : 'This order is ready for transportation. Please assign a courier to start delivery.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {order.courierId ? (
                <div className='space-y-3'>
                  <div className='border rounded-lg p-4 bg-green-50 dark:bg-green-950'>
                    <p className='font-semibold text-green-900 dark:text-green-100 mb-2'>
                      Courier Assigned
                    </p>
                    <div className='flex items-center gap-3'>
                      {order.courierId.image && (
                        <img
                          src={order.courierId.image}
                          alt={order.courierId.name}
                          className='w-10 h-10 rounded-full'
                        />
                      )}
                      <div>
                        <p className='font-medium'>{order.courierId.name}</p>
                        <p className='text-sm text-gray-600 dark:text-gray-300'>
                          {order.courierId.email}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='space-y-4'>
                  {!showCourierSelect ? (
                    <Button onClick={() => setShowCourierSelect(true)} className='w-full'>
                      Assign Courier
                    </Button>
                  ) : (
                    <div className='space-y-3'>
                      <div className='space-y-2'>
                        <label className='text-sm font-medium'>Select Available Courier</label>
                        {couriers.length === 0 ? (
                          <p className='text-sm text-amber-600'>No available couriers at the moment.</p>
                        ) : (
                          <select
                            value={selectedCourier}
                            onChange={(e) => setSelectedCourier(e.target.value)}
                            className='w-full px-3 py-2 border border-input rounded-md bg-background'
                          >
                            <option value=''>Choose a courier...</option>
                            {couriers.map((courier) => (
                              <option key={courier._id} value={courier._id}>
                                {courier.name} - {courier.email}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      {selectedCourier && (
                        <div className='flex gap-2'>
                          <Button
                            onClick={handleAssignCourier}
                            disabled={assigningCourier || !selectedCourier}
                            className='flex-1'
                          >
                            {assigningCourier ? 'Assigning...' : 'Confirm Assignment'}
                          </Button>
                          <Button
                            variant='outline'
                            onClick={() => {
                              setShowCourierSelect(false);
                              setSelectedCourier('');
                            }}
                            className='flex-1'
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <CustomerInfoCard
          email={order.email}
          phone={order.phone}
          streetAddress={order.streetAddress}
          postalCode={order.postalCode}
          city={order.city}
          country={order.country}
        />

        <OrderItemsCard cartProducts={order.cartProducts} total={order.total} />
      </div>
    </section>
  );
};

export default OrderDetailPage;
