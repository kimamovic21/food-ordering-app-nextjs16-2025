'use client';

import { Suspense, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Clock3,
  ExternalLink,
  Globe,
  ImageIcon,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  Store,
  TicketPercent,
  Timer,
  Users,
  Utensils,
} from 'lucide-react';

import Title from '@/components/shared/Title';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import useProfile from '@/hooks/useProfile';
import { formatAppDate } from '@/libs/dateFormat';
import { queryKeys } from '@/libs/queryKeys';
import type {
  AdminRestaurantDetailsResponse,
  RestaurantBlockedDate,
  RestaurantWorkingHour,
} from '@/types/restaurant';

const RestaurantLocation = dynamic(() => import('@/components/shared/RestaurantLocation'), {
  ssr: false,
  loading: () => <Skeleton className='h-[360px] w-full rounded-xl' />,
});

const formatDay = (day: string) => day.charAt(0).toUpperCase() + day.slice(1);

const formatMoney = (value: number) => `$${Number(value || 0).toFixed(2)}`;

const fetchAdminRestaurantDetails = async (
  restaurantId: string
): Promise<AdminRestaurantDetailsResponse> => {
  const response = await fetch(`/api/admin/restaurants/${restaurantId}`, {
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to load restaurant.');
  }

  return payload;
};

const statusBadgeClassName = (data: AdminRestaurantDetailsResponse) => {
  if (data.restaurant.isAcceptingOrders) {
    return 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100';
  }

  if (data.restaurant.isPaused) {
    return 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-100';
  }

  if (data.restaurant.isOpen) {
    return 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900 dark:text-amber-100';
  }

  return '';
};

const AdminRestaurantDetailsLoading = () => (
  <section className='mt-8 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10'>
    <Skeleton className='h-10 w-40 rounded-full' />
    <div className='mt-6 grid gap-4 xl:grid-cols-[1.4fr_0.9fr]'>
      <Skeleton className='h-80 w-full rounded-2xl' />
      <Skeleton className='h-80 w-full rounded-2xl' />
    </div>
    <div className='mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
      {Array.from({ length: 8 }).map((_, index) => (
        <Skeleton key={index} className='h-32 w-full rounded-xl' />
      ))}
    </div>
    <Skeleton className='mt-6 h-96 w-full rounded-xl' />
  </section>
);

function MetricCard({
  icon: Icon,
  label,
  tone = 'default',
  value,
}: {
  icon: typeof Store;
  label: string;
  tone?: 'default' | 'green' | 'red' | 'amber';
  value: string | number;
}) {
  const toneClassName =
    tone === 'green'
      ? 'text-green-400'
      : tone === 'red'
        ? 'text-red-300'
        : tone === 'amber'
          ? 'text-amber-300'
          : 'text-foreground';

  return (
    <Card className='border-white/10 bg-card/70'>
      <CardContent className='flex items-start justify-between gap-4 p-4'>
        <div>
          <p className='text-xs uppercase tracking-wide text-muted-foreground'>{label}</p>
          <p className={`mt-2 text-2xl font-semibold ${toneClassName}`}>{value}</p>
        </div>
        <div className='rounded-lg border border-white/10 bg-background/70 p-2 text-muted-foreground'>
          <Icon className='size-4' aria-hidden='true' />
        </div>
      </CardContent>
    </Card>
  );
}

const AdminRestaurantDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const restaurantId = String(params?.id || '');
  const { data: profileData, loading: profileLoading } = useProfile();
  const isSuperAdmin =
    profileData?.role === 'admin' &&
    profileData?.email === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (!profileLoading && !isSuperAdmin) {
      router.push(profileData?.role === 'admin' ? '/admin-dashboard' : '/');
    }
  }, [isSuperAdmin, profileData?.role, profileLoading, router]);

  const restaurantQuery = useQuery({
    queryKey: queryKeys.restaurants.adminDetail(restaurantId),
    queryFn: () => fetchAdminRestaurantDetails(restaurantId),
    enabled: !profileLoading && isSuperAdmin && Boolean(restaurantId),
    refetchOnWindowFocus: true,
  });

  if (profileLoading || (isSuperAdmin && restaurantQuery.isLoading)) {
    return <AdminRestaurantDetailsLoading />;
  }

  if (restaurantQuery.isError || !restaurantQuery.data) {
    return (
      <section className='mt-8 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10'>
        <Card className='border-destructive/30 bg-destructive/10'>
          <CardContent className='py-10 text-center text-sm text-destructive'>
            <p>
              {restaurantQuery.error instanceof Error
                ? restaurantQuery.error.message
                : 'Failed to load restaurant.'}
            </p>
            <div className='mt-5 flex justify-center gap-3'>
              <Button variant='outline' onClick={() => router.push('/admin-dashboard/restaurants')}>
                Back to restaurants
              </Button>
              <Button onClick={() => void restaurantQuery.refetch()}>Try again</Button>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  const data = restaurantQuery.data;
  const { couponSummary, menuSummary, operationalSummary, orderSummary, restaurant } = data;
  const images: string[] = Array.isArray(restaurant.images) ? restaurant.images : [];
  const selectedImage = images[Math.min(activeImageIndex, Math.max(0, images.length - 1))] || null;
  const blockedDates: RestaurantBlockedDate[] = Array.isArray(restaurant.blockedDates)
    ? restaurant.blockedDates
    : [];
  const workingHours: RestaurantWorkingHour[] = Array.isArray(restaurant.workingHours)
    ? restaurant.workingHours
    : [];

  return (
    <section className='mt-8 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10'>
      <div className='mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
        <div>
          <Button
            type='button'
            variant='outline'
            className='mb-4 gap-2 rounded-full'
            onClick={() => router.push('/admin-dashboard/restaurants')}
          >
            <ArrowLeft className='size-4' aria-hidden='true' />
            Back to restaurants
          </Button>
          <div className='flex flex-wrap items-center gap-3'>
            <Title>{restaurant.name}</Title>
            <Badge variant='secondary' className={statusBadgeClassName(data)}>
              {restaurant.isAcceptingOrders
                ? 'Accepting orders'
                : restaurant.isPaused
                  ? 'Paused'
                  : restaurant.isOpen
                    ? 'Open'
                    : 'Closed'}
            </Badge>
          </div>
          <p className='mt-2 flex items-center gap-2 text-sm text-muted-foreground'>
            <MapPin className='size-4' aria-hidden='true' />
            {restaurant.street}, {restaurant.city}, {restaurant.postalCode}, {restaurant.country}
          </p>
          <p className='mt-2 max-w-3xl text-sm text-muted-foreground'>
            Superadmin view with owner, capacity, menu, order, coupon, location, and public listing
            details.
          </p>
        </div>

        <div className='flex flex-wrap gap-2'>
          <Button asChild variant='outline' className='gap-2 rounded-full'>
            <Link href={`/restaurants/${restaurant._id}`}>
              <ExternalLink className='size-4' aria-hidden='true' />
              Public page
            </Link>
          </Button>
          {restaurant.owner?._id && (
            <Button asChild variant='outline' className='gap-2 rounded-full'>
              <Link href={`/admin-dashboard/users/${restaurant.owner._id}`}>
                <Users className='size-4' aria-hidden='true' />
                Owner profile
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <MetricCard
          icon={ReceiptText}
          label='Total revenue'
          value={formatMoney(orderSummary.totalRevenue)}
          tone='green'
        />
        <MetricCard
          icon={Timer}
          label='Active kitchen orders'
          value={`${operationalSummary.activeKitchenOrders}/${operationalSummary.activeOrderLimit}`}
          tone={operationalSummary.isAtCapacity ? 'red' : operationalSummary.isNearCapacity ? 'amber' : 'default'}
        />
        <MetricCard icon={Utensils} label='Menu items' value={menuSummary.total} />
        <MetricCard icon={TicketPercent} label='Active coupons' value={couponSummary.active} />
      </div>

      <div className='mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.85fr]'>
        <Card className='overflow-hidden border-white/10 bg-card/70'>
          <CardContent className='p-0'>
            <div className='relative h-80 bg-muted'>
              {selectedImage ? (
                <Image
                  src={selectedImage}
                  alt={restaurant.name}
                  fill
                  className='object-cover'
                  sizes='(max-width: 1280px) 100vw, 60vw'
                  priority
                />
              ) : (
                <div className='flex h-full items-center justify-center text-muted-foreground'>
                  <ImageIcon className='mr-2 size-5' aria-hidden='true' />
                  No restaurant image
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className='grid grid-cols-4 gap-2 p-3 md:grid-cols-6'>
                {images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type='button'
                    onClick={() => setActiveImageIndex(index)}
                    className={`relative h-20 overflow-hidden rounded-lg border ${
                      index === activeImageIndex ? 'border-primary' : 'border-white/10'
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${restaurant.name} ${index + 1}`}
                      fill
                      className='object-cover'
                      sizes='120px'
                    />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className='grid gap-6'>
          <Card className='border-white/10 bg-card/70'>
            <CardHeader>
              <CardTitle>Owner</CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 text-sm'>
              <p className='font-semibold'>{restaurant.owner?.name || 'Unknown owner'}</p>
              <p className='flex items-center gap-2 text-muted-foreground'>
                <Mail className='size-4' aria-hidden='true' />
                {restaurant.owner?.email || '-'}
              </p>
              <p className='flex items-center gap-2 text-muted-foreground'>
                <Phone className='size-4' aria-hidden='true' />
                {restaurant.owner?.phone || 'No owner phone'}
              </p>
              <p className='text-muted-foreground'>
                Role: {restaurant.owner?.role || 'unknown'}
                {restaurant.owner?.createdAt
                  ? ` • Joined ${formatAppDate(restaurant.owner.createdAt)}`
                  : ''}
              </p>
            </CardContent>
          </Card>

          <Card className='border-white/10 bg-card/70'>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 text-sm'>
              <p className='flex items-center gap-2'>
                <Phone className='size-4 text-muted-foreground' aria-hidden='true' />
                {restaurant.contact}
              </p>
              <p className='flex items-center gap-2'>
                <Mail className='size-4 text-muted-foreground' aria-hidden='true' />
                {restaurant.email}
              </p>
              {restaurant.webAddress && (
                <p className='flex items-center gap-2'>
                  <Globe className='size-4 text-muted-foreground' aria-hidden='true' />
                  <a
                    href={restaurant.webAddress}
                    target='_blank'
                    rel='noreferrer noopener'
                    className='text-primary underline underline-offset-4'
                  >
                    Visit website
                  </a>
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className='mt-6 grid gap-6 lg:grid-cols-3'>
        <Card className='border-white/10 bg-card/70 lg:col-span-2'>
          <CardHeader>
            <CardTitle>Restaurant Details</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4 text-sm'>
            <p className='leading-6 text-foreground/90'>{restaurant.description}</p>
            <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
              <div className='rounded-xl border border-white/10 p-3'>
                <p className='text-muted-foreground'>Rating</p>
                <p className='mt-1 font-semibold'>
                  {restaurant.averageRating.toFixed(1)} / 5 ({restaurant.ratingCount})
                </p>
              </div>
              <div className='rounded-xl border border-white/10 p-3'>
                <p className='text-muted-foreground'>Minimum order</p>
                <p className='mt-1 font-semibold'>{formatMoney(restaurant.minimumOrderAmount)}</p>
              </div>
              <div className='rounded-xl border border-white/10 p-3'>
                <p className='text-muted-foreground'>Courier fee</p>
                <p className='mt-1 font-semibold'>{formatMoney(restaurant.courierFee)}</p>
              </div>
              <div className='rounded-xl border border-white/10 p-3'>
                <p className='text-muted-foreground'>Tax</p>
                <p className='mt-1 font-semibold'>{restaurant.tax}%</p>
              </div>
              <div className='rounded-xl border border-white/10 p-3'>
                <p className='text-muted-foreground'>Delivery radius</p>
                <p className='mt-1 font-semibold'>{restaurant.deliveryRadiusKm} km</p>
              </div>
              <div className='rounded-xl border border-white/10 p-3'>
                <p className='text-muted-foreground'>Team size</p>
                <p className='mt-1 font-semibold'>{restaurant.totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='border-white/10 bg-card/70'>
          <CardHeader>
            <CardTitle>Operational Status</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3 text-sm'>
            <p className='font-semibold'>{operationalSummary.orderingMessage}</p>
            {operationalSummary.orderingUnavailableReason && (
              <p className='rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-100'>
                {operationalSummary.orderingUnavailableReason}
              </p>
            )}
            <p className='text-muted-foreground'>{operationalSummary.capacityMessage}</p>
            <div className='grid grid-cols-2 gap-3'>
              <div className='rounded-xl border border-white/10 p-3'>
                <p className='text-muted-foreground'>Prep</p>
                <p className='mt-1 font-semibold'>
                  {operationalSummary.estimatedPreparationMinutes} min
                </p>
              </div>
              <div className='rounded-xl border border-white/10 p-3'>
                <p className='text-muted-foreground'>Delivery</p>
                <p className='mt-1 font-semibold'>
                  {operationalSummary.estimatedDeliveryMinutes} min
                </p>
              </div>
              <div className='rounded-xl border border-white/10 p-3'>
                <p className='text-muted-foreground'>Total ETA</p>
                <p className='mt-1 font-semibold'>{operationalSummary.estimatedTotalMinutes} min</p>
              </div>
              <div className='rounded-xl border border-white/10 p-3'>
                <p className='text-muted-foreground'>Slots left</p>
                <p className='mt-1 font-semibold'>{operationalSummary.capacitySlotsRemaining}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className='mt-6 grid gap-6 lg:grid-cols-3'>
        <Card className='border-white/10 bg-card/70'>
          <CardHeader>
            <CardTitle>Menu Summary</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3 text-sm'>
            <p>Total items: {menuSummary.total}</p>
            <p>Available: {menuSummary.available}</p>
            <p>Unavailable: {menuSummary.unavailable}</p>
            <p>Images attached: {restaurant.imageCount}</p>
          </CardContent>
        </Card>

        <Card className='border-white/10 bg-card/70'>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3 text-sm'>
            <p>Total orders: {orderSummary.total}</p>
            <p>Active orders: {orderSummary.active}</p>
            <p>Completed: {orderSummary.completed}</p>
            <p>Canceled: {orderSummary.canceled}</p>
            <p>Unpaid: {orderSummary.unpaid}</p>
            <p>Today: {orderSummary.todayOrders}</p>
            <p>Today revenue: {formatMoney(orderSummary.todayRevenue)}</p>
            <p>
              Last order:{' '}
              {orderSummary.lastOrderAt ? formatAppDate(orderSummary.lastOrderAt) : 'No orders yet'}
            </p>
          </CardContent>
        </Card>

        <Card className='border-white/10 bg-card/70'>
          <CardHeader>
            <CardTitle>Coupons</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3 text-sm'>
            <p>Total coupons: {couponSummary.total}</p>
            <p>Active coupons: {couponSummary.active}</p>
            <p>Public coupons: {couponSummary.public}</p>
          </CardContent>
        </Card>
      </div>

      <div className='mt-6 grid gap-6 lg:grid-cols-2'>
        <Card className='border-white/10 bg-card/70'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Clock3 className='size-4' aria-hidden='true' />
              Working Hours
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-2 text-sm'>
            {workingHours.map((item: RestaurantWorkingHour) => (
              <div key={item.day} className='flex items-center justify-between gap-4'>
                <span className='text-muted-foreground'>{formatDay(item.day)}</span>
                <span>{item.isClosed ? 'Closed' : `${item.openTime} - ${item.closeTime}`}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className='border-white/10 bg-card/70'>
          <CardHeader>
            <CardTitle>Blocked Dates</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2 text-sm'>
            {blockedDates.length === 0 ? (
              <p className='text-muted-foreground'>No blocked dates configured.</p>
            ) : (
              blockedDates.map((blockedDate: RestaurantBlockedDate, index) => (
                <div key={`${blockedDate.date}-${index}`} className='rounded-lg border p-3'>
                  <p className='font-medium'>{formatAppDate(blockedDate.date)}</p>
                  <p className='text-muted-foreground'>{blockedDate.reason || 'No reason saved'}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className='mt-6 overflow-hidden border-white/10 bg-card/70'>
        <CardHeader>
          <CardTitle>Location</CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          <div className='h-[360px]'>
            <RestaurantLocation
              latitude={restaurant.latitude}
              longitude={restaurant.longitude}
              name={restaurant.name}
              address={`${restaurant.street}, ${restaurant.city}, ${restaurant.postalCode}, ${restaurant.country}`}
            />
          </div>
        </CardContent>
      </Card>

      <div className='mt-6 flex flex-wrap gap-3 pb-8 text-sm text-muted-foreground'>
        <span>Created: {restaurant.createdAt ? formatAppDate(restaurant.createdAt) : '-'}</span>
        <span>Updated: {restaurant.updatedAt ? formatAppDate(restaurant.updatedAt) : '-'}</span>
        <span>ID: {restaurant._id}</span>
      </div>
    </section>
  );
};

const AdminRestaurantDetailsPageWithSuspense = () => (
  <Suspense fallback={<AdminRestaurantDetailsLoading />}>
    <AdminRestaurantDetailsPage />
  </Suspense>
);

export default AdminRestaurantDetailsPageWithSuspense;
