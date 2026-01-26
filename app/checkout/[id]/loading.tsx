import { Skeleton } from '@/components/ui/skeleton';

const CheckoutLoading = () => {
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
};

export default CheckoutLoading;
