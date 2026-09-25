'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { MapPin, Navigation, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { RestaurantMapPin, RestaurantMapResponse } from '@/types/restaurant';

const RestaurantLocationsMap = dynamic(() => import('./RestaurantLocationsMap'), {
  ssr: false,
  loading: () => <RestaurantMapSkeleton />,
});

const RestaurantMapSkeleton = () => (
  <div className='flex h-full min-h-[360px] w-full flex-col justify-between rounded-lg border bg-muted/30 p-5 sm:min-h-[420px] lg:min-h-[520px]'>
    <div className='flex justify-between gap-4'>
      <Skeleton className='h-10 w-36 rounded-full' />
      <Skeleton className='h-10 w-24 rounded-full' />
    </div>
    <div className='grid gap-4 sm:grid-cols-3'>
      <Skeleton className='h-24 rounded-lg' />
      <Skeleton className='h-24 rounded-lg' />
      <Skeleton className='h-24 rounded-lg' />
    </div>
    <div className='flex justify-center'>
      <Skeleton className='h-14 w-14 rounded-full' />
    </div>
  </div>
);

const RestaurantLocationsSection = () => {
  const [restaurants, setRestaurants] = useState<RestaurantMapPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchRestaurants = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await fetch('/api/restaurants/map', { cache: 'no-store' });
        const data = (await response.json()) as RestaurantMapResponse & { error?: string };

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load restaurant locations');
        }

        if (isMounted) {
          setRestaurants(data.restaurants || []);
        }
      } catch (fetchError) {
        console.error(fetchError);
        if (isMounted) {
          setError('Restaurant locations could not be loaded right now.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchRestaurants();

    return () => {
      isMounted = false;
    };
  }, []);

  const acceptingOrdersCount = restaurants.filter((restaurant) => restaurant.isAcceptingOrders)
    .length;

  return (
    <section className='mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-10'>
      <div className='grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] lg:items-stretch'>
        <div className='flex flex-col justify-between gap-6 rounded-lg border bg-card p-6 text-card-foreground shadow-sm'>
          <div className='space-y-4'>
            <div className='inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm font-medium text-muted-foreground'>
              <MapPin className='size-4 text-primary' />
              Restaurant map
            </div>
            <div className='space-y-3'>
              <h2 className='text-3xl font-bold tracking-tight sm:text-4xl'>
                Find restaurants near your route
              </h2>
              <p className='text-base leading-relaxed text-muted-foreground'>
                Browse the current restaurant locations on one map before choosing where to order.
              </p>
            </div>
          </div>

          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2'>
            <div className='rounded-lg border bg-background/80 p-4'>
              <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <Store className='size-4 text-primary' />
                Listed restaurants
              </div>
              <p className='mt-2 text-3xl font-bold'>{restaurants.length}</p>
            </div>
            <div className='rounded-lg border bg-background/80 p-4'>
              <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <Navigation className='size-4 text-primary' />
                Accepting now
              </div>
              <p className='mt-2 text-3xl font-bold'>{acceptingOrdersCount}</p>
            </div>
          </div>

          <Button asChild className='w-full sm:w-fit'>
            <Link href='/restaurants'>Browse restaurants</Link>
          </Button>
        </div>

        <div className='overflow-hidden rounded-lg border bg-card shadow-sm'>
          <div className='h-[360px] sm:h-[420px] lg:h-[520px]'>
            {loading ? (
              <RestaurantMapSkeleton />
            ) : error ? (
              <div className='flex h-full items-center justify-center p-6 text-center'>
                <p className='max-w-sm text-sm text-muted-foreground'>{error}</p>
              </div>
            ) : restaurants.length === 0 ? (
              <div className='flex h-full items-center justify-center p-6 text-center'>
                <p className='max-w-sm text-sm text-muted-foreground'>
                  No restaurant locations are available yet.
                </p>
              </div>
            ) : (
              <RestaurantLocationsMap restaurants={restaurants} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default RestaurantLocationsSection;
