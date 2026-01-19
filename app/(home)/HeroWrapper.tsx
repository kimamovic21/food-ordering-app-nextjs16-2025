'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import Hero from './Hero';

const HeroSkeleton = () => (
  <section className='mt-4 block md:grid md:grid-cols-[0.4fr_0.6fr]'>
    <div className='py-12'>
      <div className='space-y-3'>
        <Skeleton className='h-10 w-48' />
        <Skeleton className='h-10 w-64' />
        <Skeleton className='h-10 w-32' />
      </div>

      <Skeleton className='h-6 w-3/4 my-6' />

      <div className='flex gap-4'>
        <Skeleton className='h-12 w-40 rounded-full' />
      </div>
    </div>

    <div className='relative h-80 md:h-full'>
      <Skeleton className='w-full h-full' />
    </div>
  </section>
);

const HeroWrapper = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <HeroSkeleton />;
  }

  return <Hero />;
};

export default HeroWrapper;
