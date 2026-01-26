import { Skeleton } from '@/components/ui/skeleton';

const MyDeliveryLoading = () => (
  <div className='max-w-7xl mx-auto px-4 py-6'>
    <div className='space-y-6'>
      <div>
        <Skeleton className='h-10 w-96' />
        <Skeleton className='h-5 w-80 mt-2' />
      </div>
      <Skeleton className='h-24 w-full' />
      <div className='space-y-4'>
        {[...Array(2)].map((_, idx) => (
          <Skeleton key={idx} className='h-64 w-full' />
        ))}
      </div>
    </div>
  </div>
);

export default MyDeliveryLoading;
export const loading = MyDeliveryLoading;
