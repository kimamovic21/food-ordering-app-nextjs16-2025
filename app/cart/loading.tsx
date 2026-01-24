import { Skeleton } from '@/components/ui/skeleton';

const ItemCardSkeleton = () => (
  <div className='bg-card border rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4'>
    <div className='flex items-start gap-3 w-full sm:w-auto'>
      <Skeleton className='w-16 h-16 sm:w-20 sm:h-20 rounded-md' />
      <div className='grow min-w-0 space-y-2'>
        <Skeleton className='h-4 w-32 sm:w-40' />
        <Skeleton className='h-3 w-20 sm:w-28' />
        <Skeleton className='h-3 w-16 sm:w-24' />
      </div>
    </div>
    <div className='flex items-center w-full gap-3 sm:gap-4'>
      <div className='flex items-center gap-2 sm:gap-3'>
        <Skeleton className='w-8 h-8 sm:w-8 sm:h-8 lg:w-6 lg:h-6 rounded-full' />
        <Skeleton className='h-5 w-6' />
        <Skeleton className='w-8 h-8 sm:w-8 sm:h-8 lg:w-6 lg:h-6 rounded-full' />
      </div>
      <div className='flex items-center gap-3 ml-auto'>
        <Skeleton className='h-5 w-14' />
        <Skeleton className='w-4 h-4 rounded-sm' />
      </div>
    </div>
  </div>
);

export default function CartLoading() {
  return (
    <div className='max-w-7xl mx-auto py-4 sm:py-8 px-2 sm:px-4'>
      <div className='flex justify-between items-center mb-6 sm:mb-8'>
        <Skeleton className='h-8 sm:h-10 w-56' />
      </div>
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2'>
          <div className='space-y-4 mb-6 sm:mb-8'>
            <ItemCardSkeleton />
            <ItemCardSkeleton />
          </div>
          <Skeleton className='h-10 w-full bg-red-500 rounded flex items-center justify-center gap-2' />
        </div>
        <div className='lg:col-span-1 space-y-4'>
          {/* Order Summary Skeleton */}
          <div className='bg-card border rounded-xl p-4 sm:p-6 space-y-3 sm:space-y-4'>
            <Skeleton className='h-6 w-32 mb-2' />
            <div className='space-y-2 border-b pb-3'>
              <Skeleton className='h-4 w-24' />
              <Skeleton className='h-4 w-24' />
            </div>
            <div className='space-y-2 border-b pb-3'>
              <Skeleton className='h-4 w-28' />
              <Skeleton className='h-4 w-28' />
              <Skeleton className='h-4 w-32' />
            </div>
            <div className='border-t pt-3'>
              <Skeleton className='h-6 w-24' />
            </div>
            <Skeleton className='h-10 w-full rounded-full mt-4' />
          </div>
          {/* Delivery Information Skeleton */}
          <div className='bg-card border rounded-xl p-4 sm:p-6 space-y-4 lg:max-h-[70vh] lg:overflow-y-auto'>
            <Skeleton className='h-6 w-40 mb-2' />
            {[...Array(5)].map((_, i) => (
              <div key={i} className='space-y-2'>
                <Skeleton className='h-4 w-24' />
                <Skeleton className='h-9 w-full' />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
