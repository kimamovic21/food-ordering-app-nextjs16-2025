import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const MyOrderLoading = async () => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return (
    <section className='mt-8'>
      <div className='mt-8 max-w-4xl mx-auto'>
        <div className='flex items-center gap-2 mb-6'>
          <Skeleton className='h-5 w-16' />
          <Skeleton className='h-4 w-4' />
          <Skeleton className='h-5 w-32' />
        </div>
        <Skeleton className='h-10 w-56 mb-6' />

        <div className='space-y-6'>
          {[...Array(3)].map((_, idx) => (
            <Card
              key={idx}
              className='p-6 bg-card text-card-foreground border border-border shadow-sm'
            >
              <div className='space-y-5'>
                {/* Card title */}
                <Skeleton className='h-6 w-64' />

                {/* Mimic two-column rows like real cards */}
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
      </div>
    </section>
  );
};

export default MyOrderLoading;
