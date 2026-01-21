'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { FaPlus, FaMinus, FaTrash } from 'react-icons/fa';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { useCart } from '@/contexts/CartContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { calculateLoyaltyDiscount } from '@/libs/loyaltyCalculator';
import type { FeeBreakdown } from '@/libs/deliveryFeeCalculator';
import Image from 'next/image';
import Link from 'next/link';
import Pizza from '@/public/pizza.png';
import useProfile from '@/contexts/UseProfile';

const CartSkeleton = () => (
  <div className='max-w-7xl mx-auto py-4 sm:py-8 px-2 sm:px-4 min-h-[60vh]'>
    <div className='flex justify-between items-center mb-6 sm:mb-8'>
      <Skeleton className='h-8 sm:h-10 w-56' />
    </div>
    <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
      <div className='lg:col-span-2'>
        <div className='space-y-4 mb-6 sm:mb-8'>
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className='bg-card border rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4'
            >
              <div className='flex items-start gap-3 w-full sm:w-auto'>
                <Skeleton className='size-16 sm:size-20 rounded-md' />
                <div className='grow min-w-0 space-y-2'>
                  <Skeleton className='h-4 w-40' />
                  <Skeleton className='h-3 w-28' />
                  <Skeleton className='h-3 w-24' />
                </div>
              </div>
              <div className='flex items-center w-full gap-3 sm:gap-4'>
                <div className='flex items-center gap-2 sm:gap-3'>
                  <Skeleton className='size-8 sm:size-8 lg:size-6 rounded-full' />
                  <Skeleton className='h-5 w-6' />
                  <Skeleton className='size-8 sm:size-8 lg:size-6 rounded-full' />
                </div>
                <div className='flex items-center gap-3 ml-auto'>
                  <Skeleton className='h-5 w-14' />
                  <Skeleton className='size-4 rounded-sm' />
                </div>
              </div>
            </div>
          ))}
        </div>
        <Skeleton className='h-9 w-full sm:w-48 rounded-md' />
      </div>
      <div className='lg:col-span-1 space-y-4'>
        <div className='bg-card border rounded-xl p-4 sm:p-6 space-y-3'>
          <Skeleton className='h-5 w-40' />
          <div className='space-y-2'>
            <div className='flex justify-between'>
              <Skeleton className='h-4 w-20' />
              <Skeleton className='h-4 w-14' />
            </div>
            <div className='flex justify-between'>
              <Skeleton className='h-4 w-24' />
              <Skeleton className='h-4 w-14' />
            </div>
            <div className='flex justify-between'>
              <Skeleton className='h-4 w-24' />
              <Skeleton className='h-4 w-12' />
            </div>
          </div>
          <div className='border-t border pt-3'>
            <div className='flex justify-between'>
              <Skeleton className='h-5 w-16' />
              <Skeleton className='h-5 w-20' />
            </div>
          </div>
        </div>
        <div className='bg-card border rounded-xl p-4 sm:p-6 space-y-4 lg:max-h-[70vh] lg:overflow-y-auto'>
          <Skeleton className='h-5 w-48' />
          {[...Array(6)].map((_, i) => (
            <div key={i} className='space-y-2'>
              <Skeleton className='h-4 w-24' />
              <Skeleton className='h-9 w-full' />
            </div>
          ))}
        </div>
        <Skeleton className='h-10 w-full rounded-full' />
      </div>
    </div>
  </div>
);

const CartPage = () => {
  const { cartItems, removeFromCart, updateQuantity, getTotalPrice, clearCart } = useCart();

  const { data: profileData } = useProfile();
  const { status: sessionStatus } = useSession();
  const isLoggedIn = sessionStatus === 'authenticated';

  const [formData, setFormData] = useState({
    phone: '',
    streetAddress: '',
    postalCode: '',
    city: '',
    country: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState<FeeBreakdown | null>(null);
  const [calculatingFee, setCalculatingFee] = useState(false);
  const [loyaltyDiscountPercentage, setLoyaltyDiscountPercentage] = useState(0);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Fetch user's loyalty discount
  useEffect(() => {
    const fetchLoyaltyDiscount = async () => {
      if (!isLoggedIn) {
        setLoyaltyDiscountPercentage(0);
        return;
      }

      try {
        const response = await fetch('/api/loyalty');
        if (response.ok) {
          const data = await response.json();
          setLoyaltyDiscountPercentage(data.discountPercentage || 0);
        }
      } catch (error) {
        console.error('Failed to fetch loyalty discount:', error);
        setLoyaltyDiscountPercentage(0);
      }
    };

    fetchLoyaltyDiscount();
  }, [isLoggedIn]);

  useEffect(() => {
    if (profileData) {
      setFormData({
        phone: profileData.phone || '',
        streetAddress: profileData.streetAddress || '',
        postalCode: profileData.postalCode || '',
        city: profileData.city || '',
        country: profileData.country || '',
      });
    }
  }, [profileData]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Calculate delivery fee when address changes
  useEffect(() => {
    const calculateFee = async () => {
      if (!formData.city || !formData.country) {
        setDeliveryFee(null);
        return;
      }

      setCalculatingFee(true);
      try {
        const defaultCoords = getApproximateCoordinates(formData.city);

        if (!defaultCoords) {
          setDeliveryFee(null);
          return;
        }

        const response = await fetch('/api/delivery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: defaultCoords.latitude,
            longitude: defaultCoords.longitude,
            baseDeliveryFee: 5,
          }),
        });

        if (response.ok) {
          const feeData = await response.json();
          setDeliveryFee(feeData);
        }
      } catch (error) {
        console.error('Failed to calculate delivery fee:', error);
        // Fallback to base fee if calculation fails
        setDeliveryFee({
          baseFee: 5,
          weatherAdjustment: 0,
          totalAdjustment: 0,
          totalFee: 5,
        });
      } finally {
        setCalculatingFee(false);
      }
    };

    const debounce = setTimeout(calculateFee, 800);
    return () => clearTimeout(debounce);
  }, [formData.city, formData.country]);

  // Approximate coordinates for common cities (for demo purposes)
  const getApproximateCoordinates = (
    city: string
  ): { latitude: number; longitude: number } | null => {
    const coordinates: Record<string, { latitude: number; longitude: number }> = {
      sarajevo: { latitude: 43.8564, longitude: 18.4131 },
      beirut: { latitude: 33.3128, longitude: 35.5454 },
      paris: { latitude: 48.8566, longitude: 2.3522 },
      london: { latitude: 51.5074, longitude: -0.1278 },
      'new york': { latitude: 40.7128, longitude: -74.006 },
      tokyo: { latitude: 35.6762, longitude: 139.6503 },
    };

    const key = city.toLowerCase();
    return coordinates[key] || null;
  };

  const handleCheckout = async () => {
    if (!isLoggedIn) {
      toast.error('Please sign in to proceed to checkout.');
      return;
    }

    if (cartItems.length === 0) {
      toast.error('Your cart is empty.');
      return;
    }

    const missingField = Object.entries(formData).find(([, value]) => !value);
    if (missingField) {
      toast.error('Please complete your delivery details.');
      return;
    }

    if (!profileData?.email) {
      toast.error('We could not find your email. Please re-login.');
      return;
    }

    setIsSubmitting(true);

    try {
      const actualDeliveryFee = deliveryFee?.totalFee || 5;
      const loyaltyDiscount = calculateLoyaltyDiscount(
        actualDeliveryFee,
        loyaltyDiscountPercentage
      );

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          cartItems,
          deliveryFee: deliveryFee?.totalFee || 5,
          deliveryFeeBreakdown: deliveryFee
            ? {
                baseFee: deliveryFee.baseFee,
                weatherAdjustment: deliveryFee.weatherAdjustment,
                totalAdjustment: deliveryFee.totalAdjustment,
              }
            : null,
          loyaltyDiscount,
          loyaltyDiscountPercentage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to start checkout.');
      }

      const data = await response.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Checkout URL missing.');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Unable to proceed to checkout.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hydrated) {
    return <CartSkeleton />;
  }

  if (cartItems.length === 0) {
    return (
      <div className='text-center py-16 min-h-screen flex flex-col items-center justify-center'>
        <h2 className='text-4xl font-bold text-foreground mb-4'>Your Cart is Empty</h2>

        <p className='text-muted-foreground mb-8'>Add some delicious items to your cart!</p>

        <Link href='/menu' className='inline-block'>
          <Button size='lg' className='rounded-full'>
            Browse Menu
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className='max-w-7xl mx-auto py-4 sm:py-8 px-2 sm:px-4 min-h-[60vh]'>
      <div className='flex justify-between items-center mb-6 sm:mb-8'>
        <h2 className='text-2xl sm:text-3xl md:text-4xl font-bold text-foreground'>
          Shopping Cart
        </h2>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2'>
          <div className='space-y-4 mb-6 sm:mb-8'>
            {cartItems.map((item) => {
              const imageUrl = item.image || Pizza.src;
              const isRemoteImage =
                typeof imageUrl === 'string' &&
                (imageUrl.startsWith('http') || imageUrl.includes('cloudinary'));

              return (
                <div
                  key={`${item._id}-${item.size}`}
                  className='bg-card border rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4'
                >
                  <div className='flex items-start gap-3 w-full sm:w-auto'>
                    <div className='w-16 h-16 sm:w-20 sm:h-20 shrink-0'>
                      {isRemoteImage ? (
                        <Image
                          width={80}
                          height={80}
                          src={imageUrl}
                          alt={item.name}
                          className='w-full h-full object-contain rounded'
                        />
                      ) : (
                        <Image
                          src={imageUrl}
                          alt={item.name}
                          width={80}
                          height={80}
                          className='w-full h-full object-contain rounded'
                        />
                      )}
                    </div>

                    <div className='grow min-w-0'>
                      <h3 className='text-base sm:text-lg font-semibold text-foreground truncate'>
                        {item.name}
                      </h3>
                      <p className='text-xs sm:text-sm text-muted-foreground capitalize'>
                        Size: {item.size}
                      </p>
                      <p className='text-xs sm:text-sm font-semibold text-primary mt-1'>
                        ${item.price.toFixed(2)} each
                      </p>
                    </div>
                  </div>

                  <div className='flex items-center w-full gap-3 sm:gap-4'>
                    <div className='flex items-center gap-2 sm:gap-3'>
                      <FaMinus
                        size={20}
                        onClick={() => updateQuantity(item._id, item.size, item.quantity - 1)}
                        className='bg-accent hover:bg-accent/80 rounded-full p-1.5 sm:p-2 lg:p-1.5 transition cursor-pointer text-foreground w-8 h-8 sm:w-8 sm:h-8 lg:w-6 lg:h-6 inline-flex items-center justify-center'
                        role='button'
                        tabIndex={0}
                        aria-label='Decrease quantity'
                      />

                      <span className='font-semibold text-base sm:text-lg w-6 sm:w-8 text-center'>
                        {item.quantity}
                      </span>

                      <FaPlus
                        size={20}
                        onClick={() => updateQuantity(item._id, item.size, item.quantity + 1)}
                        className='bg-accent hover:bg-accent/80 rounded-full p-1.5 sm:p-2 lg:p-1.5 transition cursor-pointer text-foreground w-8 h-8 sm:w-8 sm:h-8 lg:w-6 lg:h-6 inline-flex items-center justify-center'
                        role='button'
                        tabIndex={0}
                        aria-label='Increase quantity'
                      />
                    </div>

                    <div className='flex items-center gap-3 ml-auto'>
                      <div className='text-right'>
                        <p className='font-bold text-base sm:text-lg text-foreground whitespace-nowrap'>
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>

                      <FaTrash
                        size={16}
                        onClick={() => removeFromCart(item._id, item.size)}
                        className='text-destructive hover:opacity-90 transition cursor-pointer'
                        role='button'
                        tabIndex={0}
                        aria-label='Remove item'
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            onClick={clearCart}
            variant='destructive'
            size='sm'
            aria-label='Clear cart'
            className='w-full'
          >
            <FaTrash className='size-4' /> Clear Cart
          </Button>
        </div>

        <div className='lg:col-span-1 space-y-4'>
          <div className='bg-card border rounded-xl p-4 sm:p-6 space-y-3 sm:space-y-4'>
            <h3 className='text-lg font-bold text-foreground'>Order Summary</h3>

            <div className='space-y-2 border-b pb-3'>
              <div className='flex justify-between text-muted-foreground text-sm sm:text-base'>
                <span className='font-semibold'>Subtotal:</span>
                <span>${getTotalPrice().toFixed(2)}</span>
              </div>
              <div className='flex justify-between text-muted-foreground text-sm sm:text-base'>
                <span className='font-semibold'>Tax (10%):</span>
                <span>${(getTotalPrice() * 0.1).toFixed(2)}</span>
              </div>
            </div>

            {calculatingFee && (
              <div className='text-sm text-muted-foreground text-center py-2'>
                Calculating delivery fee...
              </div>
            )}

            <div className='space-y-2 border-b pb-3'>
              {/* Base Delivery Fee - Always Show */}
              <div className='flex justify-between text-muted-foreground text-sm sm:text-base'>
                <span className='font-semibold'>Base Delivery Fee:</span>
                <span>${(deliveryFee?.totalFee || 5).toFixed(2)}</span>
              </div>

              {/* Loyalty Discount on Delivery Fee */}
              {loyaltyDiscountPercentage > 0 && (
                <div className='flex justify-between text-green-600 text-sm sm:text-base pl-2'>
                  <span>- Loyalty Discount ({loyaltyDiscountPercentage}%):</span>
                  <span>
                    -$
                    {calculateLoyaltyDiscount(
                      deliveryFee?.totalFee || 5,
                      loyaltyDiscountPercentage
                    ).toFixed(2)}
                  </span>
                </div>
              )}

              {deliveryFee && deliveryFee.weatherAdjustment > 0 && (
                <div className='text-xs text-muted-foreground italic pl-2'>
                  Includes weather surcharge (+$
                  {deliveryFee.weatherAdjustment?.toFixed(2) || '0.00'})
                </div>
              )}

              {loyaltyDiscountPercentage > 0 && (
                <div className='flex justify-between text-muted-foreground text-sm sm:text-base font-semibold border-t border-dashed pt-1'>
                  <span>Final Delivery Fee:</span>
                  <span>
                    $
                    {(
                      (deliveryFee?.totalFee || 5) -
                      calculateLoyaltyDiscount(
                        deliveryFee?.totalFee || 5,
                        loyaltyDiscountPercentage
                      )
                    ).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div className='border-t pt-3'>
              <div className='flex justify-between text-lg sm:text-xl font-bold text-foreground'>
                <span>Total:</span>
                <span>
                  $
                  {(
                    getTotalPrice() +
                    getTotalPrice() * 0.1 +
                    (deliveryFee?.totalFee || 5) -
                    calculateLoyaltyDiscount(deliveryFee?.totalFee || 5, loyaltyDiscountPercentage)
                  ).toFixed(2)}
                </span>
              </div>

              {loyaltyDiscountPercentage > 0 && (
                <div className='mt-2 text-xs text-center text-green-600'>
                  🎉 You saved $
                  {calculateLoyaltyDiscount(
                    deliveryFee?.totalFee || 5,
                    loyaltyDiscountPercentage
                  ).toFixed(2)}{' '}
                  on delivery with loyalty rewards!
                </div>
              )}

              {isLoggedIn && loyaltyDiscountPercentage === 0 && (
                <div className='mt-2 text-xs text-center text-muted-foreground'>
                  Complete your first order to unlock loyalty rewards!{' '}
                  <Link href='/loyalty' className='text-primary underline'>
                    Learn more
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className='bg-card border rounded-xl p-4 sm:p-6 lg:max-h-[70vh] lg:overflow-y-auto'>
            <h3 className='text-lg font-bold text-foreground mb-4'>Delivery Information</h3>

            <div className='mb-4'>
              <Label className='mb-2'>Email</Label>
              <Input type='email' value={profileData?.email || ''} disabled />
            </div>

            <div className='mb-4'>
              <Label htmlFor='phone' className='mb-2'>
                Phone
              </Label>
              <Input
                type='tel'
                id='phone'
                name='phone'
                value={formData.phone}
                onChange={handleInputChange}
                placeholder='Your phone number'
              />
            </div>

            <div className='mb-4'>
              <Label htmlFor='streetAddress' className='mb-2'>
                Street Address
              </Label>
              <Input
                type='text'
                id='streetAddress'
                name='streetAddress'
                value={formData.streetAddress}
                onChange={handleInputChange}
                placeholder='Your street address'
              />
            </div>

            <div className='mb-4'>
              <Label htmlFor='postalCode' className='mb-2'>
                Postal Code
              </Label>
              <Input
                type='text'
                id='postalCode'
                name='postalCode'
                value={formData.postalCode}
                onChange={handleInputChange}
                placeholder='Your postal code'
              />
            </div>

            <div className='mb-4'>
              <Label htmlFor='city' className='mb-2'>
                City
              </Label>
              <Input
                type='text'
                id='city'
                name='city'
                value={formData.city}
                onChange={handleInputChange}
                placeholder='Your city'
              />
            </div>

            <div className='mb-6'>
              <Label htmlFor='country' className='mb-2'>
                Country
              </Label>
              <Input
                type='text'
                id='country'
                name='country'
                value={formData.country}
                onChange={handleInputChange}
                placeholder='Your country'
              />
            </div>
          </div>

          {isLoggedIn ? (
            <Button
              onClick={handleCheckout}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              size='lg'
              className='w-full rounded-full'
            >
              {isSubmitting ? 'Redirecting...' : 'Proceed to Checkout'}
            </Button>
          ) : (
            <Button disabled variant='outline' size='lg' className='w-full rounded-full'>
              Sign in to continue with payment
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartPage;
