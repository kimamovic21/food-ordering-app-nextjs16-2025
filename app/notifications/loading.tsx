'use client';

import { Skeleton } from '@/components/ui/skeleton';

const NotificationsLoading = () => {
  return (
    <section
      aria-label='Loading notifications'
      aria-busy='true'
      className='mx-auto mt-8 min-h-[calc(100vh-8rem)] w-full min-w-0 max-w-5xl px-4 sm:px-6 lg:px-8'
    >
      <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='flex min-w-0 flex-1 items-start gap-3'>
          <Skeleton className='h-9 w-9 shrink-0 rounded-md' />
          <div className='min-w-0 flex-1 space-y-2'>
            <Skeleton className='h-8 w-48 max-w-full' />
            <Skeleton className='h-5 w-full max-w-80' />
          </div>
        </div>
        <div className='flex shrink-0 items-center gap-2'>
          <Skeleton className='h-9 w-36 rounded-md' />
          <Skeleton className='h-9 w-9 rounded-md' />
          <Skeleton className='h-9 w-9 rounded-md' />
        </div>
      </div>

      <div className='mb-6 grid grid-cols-3 gap-2 sm:gap-4'>
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className='flex min-w-0 flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-5'
          >
            <Skeleton className='h-5 w-5 shrink-0' />
            <div className='min-w-0 flex-1 space-y-2'>
              <Skeleton className='h-4 w-16 max-w-full' />
              <Skeleton className='h-6 w-10 max-w-full' />
            </div>
          </div>
        ))}
      </div>

      <div className='mb-4 flex flex-col gap-3 border-y py-3 sm:flex-row sm:items-center sm:justify-between'>
        <Skeleton className='h-10 w-full rounded-lg sm:w-64' />
        <Skeleton className='h-9 w-full rounded-md sm:w-64' />
      </div>

      <div className='space-y-3'>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className='space-y-3 rounded-lg border p-5'>
            <Skeleton className='h-5 w-2/3' />
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-1/3' />
          </div>
        ))}
      </div>
    </section>
  );
};

export default NotificationsLoading;
