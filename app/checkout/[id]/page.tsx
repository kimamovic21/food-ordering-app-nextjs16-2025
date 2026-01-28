'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { useTheme } from 'next-themes';
import { Elements } from '@stripe/react-stripe-js';
import { useCart } from '@/contexts/CartContext';
import { Skeleton } from '@/components/ui/skeleton';
import StripeCheckoutForm from './StripeCheckoutForm';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PK!);

type CartProduct = {
  productId: string;
  name: string;
  size: string;
  quantity: number;
  price: number;
};

type OrderType = {
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
  orderStatus: string;
  courierId?: string;
  createdAt: string;
  updatedAt: string;
  stripeSessionId?: string;
  deliveryFee?: number;
  deliveryFeeBreakdown?: any;
  loyaltyDiscount?: number;
  loyaltyDiscountPercentage?: number;
  loyaltyTier?: string;
};

const CheckoutPage = () => {
  const { resolvedTheme } = useTheme();
  const { clearCart } = useCart();
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params?.id;
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderType | null>(null);
  const [cartCleared, setCartCleared] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  // Clear cart if payment was successful and not already cleared
  useEffect(() => {
    if (searchParams!.get('status') === 'success' && !cartCleared) {
      clearCart();
      setCartCleared(true);
    }
  }, [searchParams, cartCleared, clearCart]);

  useEffect(() => {
    async function fetchOrderAndClientSecret() {
      if (!orderId) return;
      try {
        const res = await fetch(`/api/orders?id=${orderId}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data.order);
          // Only fetch clientSecret if order is not paid
          if (!data.order.orderPaid) {
            const intentRes = await fetch(`/api/checkout/${orderId}/intent`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}),
            });
            if (intentRes.ok) {
              const intentData = await intentRes.json();
              setClientSecret(intentData.client_secret);
            }
          }
        }
      } catch {}
      setLoading(false);
    }
    fetchOrderAndClientSecret();
  }, [orderId]);

  const appearance = useMemo(
    () => ({
      variables:
        resolvedTheme === 'dark'
          ? {
              colorPrimary: '#0085FF',
              colorText: '#C9CED8',
              colorBackground: '#14171D',
              buttonSecondaryColorBackground: '#2B3039',
              buttonSecondaryColorText: '#C9CED8',
              colorSecondaryText: '#8C99AD',
              actionSecondaryColorText: '#C9CED8',
              actionSecondaryTextDecorationColor: '#C9CED8',
              colorBorder: '#2B3039',
              colorDanger: '#F23154',
              badgeNeutralColorBackground: '#1B1E25',
              badgeNeutralColorBorder: '#2B3039',
              badgeNeutralColorText: '#8C99AD',
              badgeSuccessColorBackground: '#152207',
              badgeSuccessColorBorder: '#20360C',
              badgeSuccessColorText: '#3EAE20',
              badgeWarningColorBackground: '#400A00',
              badgeWarningColorBorder: '#5F1400',
              badgeWarningColorText: '#F27400',
              badgeDangerColorBackground: '#420320',
              badgeDangerColorBorder: '#61092D',
              badgeDangerColorText: '#F46B7D',
              offsetBackgroundColor: '#1B1E25',
              formBackgroundColor: '#14171D',
              overlayBackdropColor: 'rgba(0,0,0,0.5)',
            }
          : {
              colorPrimary: '#0085FF',
            },
    }),
    [resolvedTheme]
  );

  // Stripe Elements options: include clientSecret if available
  const options = useMemo(
    () => ({
      appearance,
      ...(clientSecret ? { clientSecret } : {}),
    }),
    [appearance, clientSecret]
  );

  // Wait for order to load before rendering anything
  if (loading) {
    return (
      <div className='w-full sm:w-full md:w-3xl lg:w-4xl max-w-4xl mx-auto py-8 px-4'>
        <Skeleton className='h-10 w-40 mb-6' />
        <div className='mb-6 bg-card border rounded-xl p-4'>
          <Skeleton className='h-6 w-2/3 mb-3' />
          <Skeleton className='h-6 w-1/3 mb-3' />
          <Skeleton className='h-6 w-2/3 mb-3' />
          <Skeleton className='h-6 w-1/3 mb-3' />
          <Skeleton className='h-6 w-2/3 mb-3' />
          <Skeleton className='h-6 w-1/3 mb-3' />
          <Skeleton className='h-6 w-1/2 mt-2' />
          <Skeleton className='h-6 w-1/2' />
          <Skeleton className='h-8 w-1/2 mt-4' />
        </div>
      </div>
    );
  }

  // Show paid message if orderPaid and stripeSessionId are set
  if (order && order.orderPaid && order.stripeSessionId) {
    // If just paid, show a special success message
    if (searchParams!.get('status') === 'success') {
      return (
        <div className='w-full max-w-2xl mx-auto py-8 px-4 text-center'>
          <h1 className='text-2xl font-bold mb-4'>Payment Status</h1>
          <div className='text-green-600 text-lg font-semibold mb-2'>
            Payment successful! Thank you for your order.
          </div>
        </div>
      );
    }
    // Otherwise, show the default paid message
    return (
      <div className='w-full max-w-2xl mx-auto py-8 px-4 text-center'>
        <h1 className='text-2xl font-bold mb-4'>Order Status</h1>
        <div className='text-green-600 text-lg font-semibold mb-2'>
          This order has already been paid.
        </div>
      </div>
    );
  }

  // Only show payment form if order is loaded and not paid
  if (order && !order.orderPaid) {
    // Calculate subtotal, tax, total from order
    const orderSubtotal =
      order.cartProducts?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;
    const orderTax = orderSubtotal * 0.1;
    const orderDeliveryFee = order.deliveryFee || 5;
    const orderTotal = orderSubtotal + orderTax + orderDeliveryFee;
    return (
      <div className='w-full sm:w-full md:w-3xl lg:w-4xl max-w-4xl mx-auto py-8 px-4'>
        <h1 className='text-2xl font-bold mb-6'>Checkout</h1>
        <div className='mb-6 bg-card border rounded-xl p-4'>
          {order.cartProducts?.map((item, idx) => (
            <div key={item.productId + item.size + idx} className='flex justify-between mb-2'>
              <span>
                {item.name} ({item.size}) x {item.quantity}
              </span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className='flex justify-between mt-2'>
            <span>Tax</span>
            <span>${orderTax.toFixed(2)}</span>
          </div>
          <div className='flex justify-between'>
            <span>Delivery Fee</span>
            <span>${orderDeliveryFee.toFixed(2)}</span>
          </div>
          <div className='flex justify-between font-bold border-t pt-2 mt-2'>
            <span>Total</span>
            <span>${orderTotal.toFixed(2)}</span>
          </div>
        </div>
        {/* Only render Elements when clientSecret is available */}
        {clientSecret ? (
          <Elements stripe={stripePromise} options={options}>
            <StripeCheckoutForm />
          </Elements>
        ) : (
          <div className='text-center py-8'>Loading payment form...</div>
        )}
      </div>
    );
  }

  // If order is not found, show error
  return (
    <div className='w-full max-w-2xl mx-auto py-8 px-4 text-center'>
      <h1 className='text-2xl font-bold mb-4'>Order Status</h1>
      <div className='text-red-600 text-lg font-semibold mb-2'>Order not found.</div>
    </div>
  );
};

export default CheckoutPage;
