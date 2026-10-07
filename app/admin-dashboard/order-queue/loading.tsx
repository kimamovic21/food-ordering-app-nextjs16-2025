import { Skeleton } from '@/components/ui/skeleton';

const OrderQueueLoading = () => (
  <section className='space-y-6'>
    <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
      <div className='space-y-3'>
        <Skeleton className='h-10 w-64' />
        <Skeleton className='h-4 w-80 max-w-full' />
      </div>
      <Skeleton className='h-10 w-32' />
    </div>
    <div className='grid gap-4 xl:grid-cols-5'>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className='rounded-lg border p-4'>
          <div className='mb-5 flex items-center justify-between'>
            <Skeleton className='h-5 w-24' />
            <Skeleton className='h-6 w-8 rounded-full' />
          </div>
          <div className='space-y-3'>
            <Skeleton className='h-20 rounded-lg' />
            <Skeleton className='h-24 rounded-lg' />
            <Skeleton className='h-9 rounded-md' />
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default OrderQueueLoading;
