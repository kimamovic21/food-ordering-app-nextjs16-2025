import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const MyOrderLoading = () => {
  return (
    <section className='mt-8'>
      <div className='mt-8 max-w-[1600px] mx-auto px-4'>
        <div className='flex items-center gap-2 mb-6'>
          <Skeleton className='h-5 w-16' />
          <Skeleton className='h-4 w-4' />
          <Skeleton className='h-5 w-32' />
        </div>
        <Skeleton className='h-10 w-56 mb-6' />

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6'>
          <div className='space-y-6'>
            {[...Array(2)].map((_, idx) => (
              <Card
                key={idx}
                className='p-6 bg-card text-card-foreground border border-border shadow-sm'
              >
                <div className='space-y-5'>
                  <Skeleton className='h-6 w-64' />
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <Skeleton className='h-4 w-56' />
                    <Skeleton className='h-6 w-16 rounded-full' />
                    <Skeleton className='h-4 w-40' />
                    <Skeleton className='h-5 w-72' />
                    <Skeleton className='h-4 w-32' />
                    <Skeleton className='h-5 w-60' />
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Card className='p-6 bg-card border border-border shadow-sm'>
            <div className='space-y-5'>
              <Skeleton className='h-6 w-64' />
              <div className='space-y-3'>
                {[...Array(4)].map((_, idx) => (
                  <Skeleton key={idx} className='h-5 w-full' />
                ))}
                <Skeleton className='h-5 w-4/5' />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default MyOrderLoading;
