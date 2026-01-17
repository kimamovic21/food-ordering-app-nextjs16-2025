'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import Link from 'next/link';
import useProfile from '@/contexts/UseProfile';
import OrderInfoCard from './OrderInfoCard';
import CustomerInfoCard from './CustomerInfoCard';
import OrderItemsCard from './OrderItemsCard';

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
  orderStatus: 'pending' | 'processing' | 'completed';
  createdAt: string;
  deliveryFee?: number;
  deliveryFeeBreakdown?: {
    baseFee: number;
    altitudeAdjustment: number;
    weatherAdjustment: number;
    totalAdjustment: number;
    altitude?: number;
    weather?: {
      condition: 'clear' | 'rain' | 'snow' | 'storm';
      temperature: number;
      windSpeed: number;
    };
  };
  loyaltyDiscount?: number;
  loyaltyDiscountPercentage?: number;
  loyaltyTier?: string;
};

const MyOrderDetailPage = () => {
  const [order, setOrder] = useState<OrderDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { data: profileData, loading: profileLoading } = useProfile();
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  useEffect(() => {
    if (profileLoading || !profileData?.email) return;

    const fetchOrder = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/my-orders?id=${orderId}`);

        if (res.status === 403) {
          // Order doesn't belong to user, redirect
          router.push('/my-orders');
          return;
        }

        if (!res.ok) {
          throw new Error('Failed to fetch order');
        }

        const json = await res.json();
        setOrder(json.order);
      } catch (err) {
        console.error('Failed to load order', err);
        setError('Failed to load order details');
      } finally {
        await new Promise((resolve) => setTimeout(resolve, 500));
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId, profileData?.email, profileLoading, router]);

  if (profileLoading) {
    return (
      <section className='mt-8'>
        <div className='mt-8 max-w-4xl mx-auto'>
          <div className='flex items-center gap-2 mb-6'>
            <Skeleton className='h-5 w-16' />
            <Skeleton className='h-4 w-4' />
            <Skeleton className='h-5 w-32' />
          </div>
          <Skeleton className='h-10 w-56 mb-6' />

          <div className='space-y-6'>
            {[...Array(3)].map((_, idx) => (
              <Card
                key={idx}
                className='p-6 bg-card text-card-foreground border border-border shadow-sm'
              >
                <div className='space-y-5'>
                  <Skeleton className='h-6 w-64' />
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <Skeleton className='h-4 w-56' />
                    <Skeleton className='h-6 w-16 rounded-full' />
                    <Skeleton className='h-4 w-40' />
                    <Skeleton className='h-5 w-72' />
                    <Skeleton className='h-4 w-32' />
                    <Skeleton className='h-5 w-60' />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }
  if (!profileData?.email) return 'Please sign in to view your order';

  if (loading) {
    return (
      <section className='mt-8'>
        <div className='mt-8 max-w-4xl mx-auto'>
          <div className='flex items-center gap-2 mb-6'>
            <Skeleton className='h-5 w-16' />
            <Skeleton className='h-4 w-4' />
            <Skeleton className='h-5 w-32' />
          </div>
          <Skeleton className='h-10 w-56 mb-6' />

          <div className='space-y-6'>
            {[...Array(3)].map((_, idx) => (
              <Card key={idx} className='p-6 bg-card border border-border shadow-sm'>
                <div className='space-y-5'>
                  <Skeleton className='h-6 w-64' />
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <Skeleton className='h-4 w-56' />
                    <Skeleton className='h-6 w-16 rounded-full' />
                    <Skeleton className='h-4 w-40' />
                    <Skeleton className='h-5 w-72' />
                    <Skeleton className='h-4 w-32' />
                    <Skeleton className='h-5 w-60' />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) return <div className='mt-8 text-red-600'>{error}</div>;

  if (!order) return <div className='mt-8'>Order not found</div>;

  return (
    <section className='mt-8'>
      <div className='mt-8 max-w-4xl mx-auto'>
        <Breadcrumb className='mb-6'>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href='/my-orders'>My Orders</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Order Details</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className='text-3xl font-bold mb-6'>Order Details</h1>

        <div className='space-y-6'>
          <OrderInfoCard
            orderId={order._id}
            paymentStatus={order.paymentStatus}
            orderStatus={order.orderStatus}
            createdAt={order.createdAt}
            deliveryFee={order.deliveryFee}
            deliveryFeeBreakdown={order.deliveryFeeBreakdown}
          />

          <CustomerInfoCard
            email={order.email}
            phone={order.phone}
            streetAddress={order.streetAddress}
            postalCode={order.postalCode}
            city={order.city}
            country={order.country}
          />

          <OrderItemsCard 
            cartProducts={order.cartProducts} 
            total={order.total}
            deliveryFee={order.deliveryFee}
            deliveryFeeBreakdown={order.deliveryFeeBreakdown}
            loyaltyDiscount={order.loyaltyDiscount}
            loyaltyDiscountPercentage={order.loyaltyDiscountPercentage}
            loyaltyTier={order.loyaltyTier}
          />
        </div>
      </div>
    </section>
  );
};

export default MyOrderDetailPage;
