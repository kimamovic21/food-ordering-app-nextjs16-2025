import { Heart } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const RESTAURANT_SKELETON_COUNT = 6;

const RestaurantsPageSkeleton = () => {
  return (
    <section className='mt-8 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10'>
      <div className='mb-6 flex flex-col gap-3'>
        <Skeleton className='h-9 w-44 rounded-lg' />
        <Skeleton className='h-5 w-full max-w-2xl rounded-lg' />
        <Skeleton className='h-5 w-full max-w-xl rounded-lg' />
      </div>

      <div className='mb-8'>
        <div className='relative h-14 overflow-hidden rounded-md border border-border bg-card'>
          <div className='absolute inset-y-0 left-0 flex items-center pl-4'>
            <Skeleton className='size-5 rounded-full' />
          </div>
          <Skeleton className='absolute left-12 top-1/2 h-5 w-72 max-w-[calc(100%-6rem)] -translate-y-1/2 rounded-md' />
          <div className='absolute inset-y-0 right-0 flex items-center pr-4'>
            <Skeleton className='size-5 rounded-full' />
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
        {Array.from({ length: RESTAURANT_SKELETON_COUNT }).map((_, index) => (
          <Card
            key={index}
            className='h-full overflow-hidden border-border/80 bg-card transition-shadow'
          >
            <div className='h-48 w-full overflow-hidden bg-muted'>
              <Skeleton className='h-full w-full rounded-none' />
            </div>

            <CardHeader className='space-y-4'>
              <div className='flex items-start justify-between gap-3'>
                <div className='space-y-2'>
                  <Skeleton className='h-7 w-56 max-w-full rounded-md' />
                  <Skeleton className='h-6 w-16 rounded-full' />
                </div>
                <div className='flex size-10 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background/70 text-muted-foreground'>
                  <Heart className='size-5' />
                </div>
              </div>

              <div className='flex items-center gap-1'>
                {Array.from({ length: 5 }).map((_, starIndex) => (
                  <Skeleton key={starIndex} className='size-4 rounded-sm' />
                ))}
                <Skeleton className='ml-2 h-4 w-16 rounded-md' />
              </div>

              <div className='flex items-center gap-2 text-muted-foreground'>
                <Skeleton className='size-4 shrink-0 rounded-full' />
                <Skeleton className='h-4 w-52 max-w-full rounded-md' />
              </div>
              <Skeleton className='h-4 w-24 rounded-md' />
            </CardHeader>

            <CardContent className='space-y-3'>
              <Skeleton className='h-4 w-40 rounded-md' />
              <Skeleton className='h-4 w-full rounded-md' />
              <Skeleton className='h-4 w-5/6 rounded-md' />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default RestaurantsPageSkeleton;
